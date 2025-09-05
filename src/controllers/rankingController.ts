import { Response } from "express";
import prisma from "../config/database";
import { AuthenticatedRequest } from "../types/auth";

// Obter ranking dos jogadores do grupo
export const obterRanking = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { grupoId } = req.params;

    // Verificar se o usuário é membro do grupo
    const membro = await prisma.membro_grupo.findFirst({
      where: {
        grupo_id: parseInt(grupoId),
        jogador_id: req.user.id,
        status: "ativo",
      },
    });

    if (!membro) {
      return res
        .status(403)
        .json({ error: "Você não tem acesso a este grupo." });
    }

    // Buscar todos os membros ativos do grupo com suas estatísticas
    const membros = await prisma.membro_grupo.findMany({
      where: {
        grupo_id: parseInt(grupoId),
        status: "ativo",
      },
      include: {
        jogador: {
          include: {
            usuario: {
              select: { id: true, nome: true },
            },
          },
        },
      },
    });

    // Calcular estatísticas detalhadas para cada jogador no grupo
    const rankingPromises = membros.map(async (membro) => {
      const jogadorId = membro.jogador_id;

      // Contar confirmações de presença nas partidas do grupo
      const presencasGrupo = await prisma.confirmacao_presenca.count({
        where: {
          jogador_id: jogadorId,
          status_presenca: "confirmado",
          partida: {
            grupo_id: parseInt(grupoId),
            status: "finalizada",
          },
        },
      });

      // Contar total de partidas do grupo (finalizadas)
      const totalPartidasGrupo = await prisma.partida.count({
        where: {
          grupo_id: parseInt(grupoId),
          status: "finalizada",
        },
      });

      // Calcular assiduidade no grupo
      const assiduidadeGrupo =
        totalPartidasGrupo > 0
          ? (presencasGrupo / totalPartidasGrupo) * 100
          : 0;

      // Buscar média de avaliações no grupo
      const avaliacoes = await prisma.avaliacao_jogador.findMany({
        where: {
          avaliado_id: jogadorId,
          partida: {
            grupo_id: parseInt(grupoId),
          },
        },
      });

      const mediaAvaliacoes =
        avaliacoes.length > 0
          ? avaliacoes.reduce((acc, av) => acc + Number(av.nota), 0) /
            avaliacoes.length
          : 0;

      // Buscar destaques nas partidas do grupo
      const destaques = await prisma.destaque_partida.findMany({
        where: {
          jogador_id: jogadorId,
          partida: {
            grupo_id: parseInt(grupoId),
          },
        },
        include: {
          partida: {
            select: { data_hora: true },
          },
        },
      });

      // Contar tipos de destaques
      const tiposDestaques = destaques.reduce((acc, destaque) => {
        acc[destaque.tipo_destaque] = (acc[destaque.tipo_destaque] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        jogador: {
          id: membro.jogador.id,
          nome: membro.jogador.usuario.nome,
          posicao_preferida: membro.jogador.posicao_preferida,
          overall: Number(membro.jogador.overall) || 0,
          avatar_url: membro.jogador.avatar_url,
        },
        estatisticas_grupo: {
          presencas: presencasGrupo,
          total_partidas_grupo: totalPartidasGrupo,
          assiduidade: Math.round(assiduidadeGrupo * 100) / 100,
          media_avaliacoes: Math.round(mediaAvaliacoes * 100) / 100,
          total_destaques: destaques.length,
          tipos_destaques: tiposDestaques,
        },
        estatisticas_globais: {
          vitorias: membro.jogador.vitorias || 0,
          derrotas: membro.jogador.derrotas || 0,
          empates: membro.jogador.empates || 0,
          presencas_totais: membro.jogador.presencas || 0,
          ausencias: membro.jogador.ausencias || 0,
          assiduidade_global: Number(membro.jogador.assiduidade) || 0,
          media_nota_global: Number(membro.jogador.media_nota) || 0,
        },
        data_entrada: membro.data_entrada,
      };
    });

    const ranking = await Promise.all(rankingPromises);

    // Ordenar por critérios: overall, média de avaliações, assiduidade, total de destaques
    ranking.sort((a, b) => {
      // Primeiro critério: overall
      if (b.jogador.overall !== a.jogador.overall) {
        return b.jogador.overall - a.jogador.overall;
      }

      // Segundo critério: média de avaliações no grupo
      if (
        b.estatisticas_grupo.media_avaliacoes !==
        a.estatisticas_grupo.media_avaliacoes
      ) {
        return (
          b.estatisticas_grupo.media_avaliacoes -
          a.estatisticas_grupo.media_avaliacoes
        );
      }

      // Terceiro critério: assiduidade no grupo
      if (
        b.estatisticas_grupo.assiduidade !== a.estatisticas_grupo.assiduidade
      ) {
        return (
          b.estatisticas_grupo.assiduidade - a.estatisticas_grupo.assiduidade
        );
      }

      // Quarto critério: total de destaques
      return (
        b.estatisticas_grupo.total_destaques -
        a.estatisticas_grupo.total_destaques
      );
    });

    // Adicionar posição no ranking
    const rankingComPosicao = ranking.map((item, index) => ({
      ...item,
      posicao: index + 1,
    }));

    return res.status(200).json({
      grupo_id: parseInt(grupoId),
      total_jogadores: ranking.length,
      ranking: rankingComPosicao,
    });
  } catch (error) {
    console.error("Erro ao obter ranking:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Obter histórico de partidas do grupo
export const obterHistorico = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { grupoId } = req.params;
    const { limit = "10", offset = "0" } = req.query;

    // Verificar se o usuário é membro do grupo
    const membro = await prisma.membro_grupo.findFirst({
      where: {
        grupo_id: parseInt(grupoId),
        jogador_id: req.user.id,
        status: "ativo",
      },
    });

    if (!membro) {
      return res
        .status(403)
        .json({ error: "Você não tem acesso a este grupo." });
    }

    // Buscar partidas finalizadas do grupo
    const partidas = await prisma.partida.findMany({
      where: {
        grupo_id: parseInt(grupoId),
        status: "finalizada",
      },
      include: {
        confirmacao_presenca: {
          where: {
            status_presenca: "confirmado",
          },
          include: {
            jogador: {
              include: {
                usuario: {
                  select: { id: true, nome: true },
                },
              },
            },
          },
        },
        time: {
          include: {
            jogador_time: {
              include: {
                jogador: {
                  include: {
                    usuario: {
                      select: { id: true, nome: true },
                    },
                  },
                },
              },
            },
          },
        },
        destaque_partida: {
          include: {
            jogador: {
              include: {
                usuario: {
                  select: { id: true, nome: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        data_hora: "desc",
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    // Buscar total de partidas para paginação
    const totalPartidas = await prisma.partida.count({
      where: {
        grupo_id: parseInt(grupoId),
        status: "finalizada",
      },
    });

    const historicoFormatado = partidas.map((partida) => ({
      id: partida.id,
      data_hora: partida.data_hora,
      local: partida.local,
      duracao_estimada_minutos: partida.duracao_estimada_minutos,
      valor_pelada: partida.valor_pelada,
      jogadores_presentes: partida.confirmacao_presenca.map((conf) => ({
        id: conf.jogador.id,
        nome: conf.jogador.usuario.nome,
        posicao_preferida: conf.jogador.posicao_preferida,
        overall: conf.jogador.overall,
        avatar_url: conf.jogador.avatar_url,
      })),
      times: partida.time.map((time) => ({
        id: time.id,
        nome_time: time.nome_time,
        pontuacao_final: time.pontuacao_final,
        jogadores: time.jogador_time.map((jt) => ({
          id: jt.jogador.id,
          nome: jt.jogador.usuario.nome,
          posicao_jogada: jt.posicao_jogada,
        })),
      })),
      destaques: partida.destaque_partida.map((destaque) => ({
        tipo: destaque.tipo_destaque,
        jogador: {
          id: destaque.jogador.id,
          nome: destaque.jogador.usuario.nome,
        },
      })),
      total_jogadores: partida.confirmacao_presenca.length,
    }));

    return res.status(200).json({
      grupo_id: parseInt(grupoId),
      total_partidas: totalPartidas,
      partidas: historicoFormatado,
      paginacao: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        has_more:
          parseInt(offset as string) + parseInt(limit as string) <
          totalPartidas,
      },
    });
  } catch (error) {
    console.error("Erro ao obter histórico:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Obter estatísticas do jogador no grupo
export const obterEstatisticasJogador = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { grupoId, jogadorId } = req.params;

    // Verificar se o usuário é membro do grupo
    const membro = await prisma.membro_grupo.findFirst({
      where: {
        grupo_id: parseInt(grupoId),
        jogador_id: req.user.id,
        status: "ativo",
      },
    });

    if (!membro) {
      return res
        .status(403)
        .json({ error: "Você não tem acesso a este grupo." });
    }

    // Verificar se o jogador alvo é membro do grupo
    const jogadorMembro = await prisma.membro_grupo.findFirst({
      where: {
        grupo_id: parseInt(grupoId),
        jogador_id: parseInt(jogadorId),
        status: "ativo",
      },
      include: {
        jogador: {
          include: {
            usuario: {
              select: { id: true, nome: true },
            },
          },
        },
      },
    });

    if (!jogadorMembro) {
      return res
        .status(404)
        .json({ error: "Jogador não encontrado no grupo." });
    }

    // Buscar partidas que o jogador participou no grupo
    const participacoes = await prisma.confirmacao_presenca.findMany({
      where: {
        jogador_id: parseInt(jogadorId),
        status_presenca: "confirmado",
        partida: {
          grupo_id: parseInt(grupoId),
          status: "finalizada",
        },
      },
      include: {
        partida: {
          include: {
            time: {
              include: {
                jogador_time: {
                  where: {
                    jogador_id: parseInt(jogadorId),
                  },
                },
              },
            },
          },
        },
      },
    });

    // Buscar avaliações recebidas no grupo
    const avaliacoes = await prisma.avaliacao_jogador.findMany({
      where: {
        avaliado_id: parseInt(jogadorId),
        partida: {
          grupo_id: parseInt(grupoId),
        },
      },
      include: {
        jogador_avaliacao_jogador_avaliador_idTojogador: {
          include: {
            usuario: {
              select: { id: true, nome: true },
            },
          },
        },
        partida: {
          select: { id: true, data_hora: true },
        },
      },
      orderBy: {
        data_avaliacao: "desc",
      },
    });

    // Buscar destaques no grupo
    const destaques = await prisma.destaque_partida.findMany({
      where: {
        jogador_id: parseInt(jogadorId),
        partida: {
          grupo_id: parseInt(grupoId),
        },
      },
      include: {
        partida: {
          select: { id: true, data_hora: true },
        },
      },
      orderBy: {
        partida: {
          data_hora: "desc",
        },
      },
    });

    // Calcular estatísticas
    const totalParticipacoesGrupo = participacoes.length;
    const totalPartidasGrupo = await prisma.partida.count({
      where: {
        grupo_id: parseInt(grupoId),
        status: "finalizada",
      },
    });

    const assiduidadeGrupo =
      totalPartidasGrupo > 0
        ? (totalParticipacoesGrupo / totalPartidasGrupo) * 100
        : 0;

    const mediaAvaliacoes =
      avaliacoes.length > 0
        ? avaliacoes.reduce((acc, av) => acc + Number(av.nota), 0) /
          avaliacoes.length
        : 0;

    // Contar tipos de destaques
    const tiposDestaques = destaques.reduce((acc, destaque) => {
      acc[destaque.tipo_destaque] = (acc[destaque.tipo_destaque] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return res.status(200).json({
      jogador: {
        id: jogadorMembro.jogador.id,
        nome: jogadorMembro.jogador.usuario.nome,
        posicao_preferida: jogadorMembro.jogador.posicao_preferida,
        overall: jogadorMembro.jogador.overall,
        avatar_url: jogadorMembro.jogador.avatar_url,
        data_entrada: jogadorMembro.data_entrada,
      },
      estatisticas_grupo: {
        total_participacoes: totalParticipacoesGrupo,
        total_partidas_grupo: totalPartidasGrupo,
        assiduidade: Math.round(assiduidadeGrupo * 100) / 100,
        media_avaliacoes: Math.round(mediaAvaliacoes * 100) / 100,
        total_avaliacoes: avaliacoes.length,
        total_destaques: destaques.length,
        tipos_destaques: tiposDestaques,
      },
      ultimas_avaliacoes: avaliacoes.slice(0, 5).map((av) => ({
        nota: Number(av.nota),
        comentario: av.comentario,
        avaliador:
          av.jogador_avaliacao_jogador_avaliador_idTojogador.usuario.nome,
        partida_id: av.partida.id,
        data_partida: av.partida.data_hora,
        data_avaliacao: av.data_avaliacao,
      })),
      ultimos_destaques: destaques.slice(0, 10).map((destaque) => ({
        tipo: destaque.tipo_destaque,
        partida_id: destaque.partida.id,
        data_partida: destaque.partida.data_hora,
      })),
    });
  } catch (error) {
    console.error("Erro ao obter estatísticas do jogador:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};
