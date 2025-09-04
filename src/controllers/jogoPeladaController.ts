import { Response } from "express";
import prisma from "../config/database";
import { AuthenticatedRequest } from "../types/auth";

/**
 * MODELO SIMPLIFICADO PARA PELADAS DE VÔLEI
 *
 * Este controller implementa um sistema simplificado onde:
 * 1. Você pode iniciar uma sessão de pelada (ativar jogos sequenciais)
 * 2. Criar jogos individuais escolhendo os times
 * 3. Finalizar jogos e imediatamente criar outro
 * 4. Não há tipos complexos de torneio - apenas jogos sequenciais simples
 */

// Iniciar sessão de pelada (ativar sistema de jogos sequenciais)
export const iniciarPelada = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { partidaId } = req.params;

    // Verificar se o usuário é admin e se a partida existe
    const partida = await prisma.partida.findUnique({
      where: { id: parseInt(partidaId) },
      include: {
        grupo: {
          include: {
            membro_grupo: {
              where: {
                jogador_id: req.user.id,
                status: "ativo",
                papel: "admin",
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
                    usuario: { select: { id: true, nome: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!partida) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    if (partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem iniciar peladas." });
    }

    if (partida.time.length < 2) {
      return res.status(400).json({
        error: "É necessário ter pelo menos 2 times para iniciar a pelada.",
      });
    }

    if (partida.jogo_ativo) {
      return res.status(409).json({
        error: "Já existe uma sessão de pelada ativa para esta partida.",
      });
    }

    // Ativar sistema de jogos sequenciais
    await prisma.partida.update({
      where: { id: parseInt(partidaId) },
      data: {
        jogo_ativo: true,
        status: "em_andamento",
        updated_at: new Date(),
      },
    });

    return res.status(200).json({
      message: "Pelada iniciada com sucesso!",
      partida: {
        id: partida.id,
        jogo_ativo: true,
        status: "em_andamento",
        times_disponiveis: partida.time.map((time) => ({
          id: time.id,
          nome_time: time.nome_time,
          jogadores: time.jogador_time.map((jt) => ({
            id: jt.jogador.id,
            nome: jt.jogador.usuario.nome,
            posicao: jt.posicao_jogada,
          })),
        })),
      },
      proximo_passo: "Crie o primeiro jogo usando POST /partidas/:id/jogos",
    });
  } catch (error) {
    console.error("Erro ao iniciar pelada:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Criar novo jogo (escolher times)
export const criarJogo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { partidaId } = req.params;
    const { time_a_id, time_b_id, observacoes } = req.body;

    // Validação de entrada
    if (!time_a_id || !time_b_id) {
      return res.status(400).json({
        error:
          "É necessário especificar os dois times (time_a_id e time_b_id).",
      });
    }

    if (time_a_id === time_b_id) {
      return res.status(400).json({
        error: "Os times devem ser diferentes.",
      });
    }

    // Verificar permissões e validar partida
    const partida = await prisma.partida.findUnique({
      where: { id: parseInt(partidaId) },
      include: {
        grupo: {
          include: {
            membro_grupo: {
              where: {
                jogador_id: req.user.id,
                status: "ativo",
                papel: "admin",
              },
            },
          },
        },
        time: true,
        jogo: { orderBy: { numero_jogo: "desc" }, take: 1 },
      },
    });

    if (!partida) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    if (partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem criar jogos." });
    }

    if (!partida.jogo_ativo) {
      return res.status(400).json({
        error:
          "A pelada não está ativa. Use POST /partidas/:id/pelada/iniciar primeiro.",
      });
    }

    // Verificar se os times existem na partida
    const timeA = partida.time.find((t) => t.id === parseInt(time_a_id));
    const timeB = partida.time.find((t) => t.id === parseInt(time_b_id));

    if (!timeA || !timeB) {
      return res.status(400).json({
        error: "Um ou ambos os times não existem nesta partida.",
      });
    }

    // Verificar se há jogo em andamento
    const jogoEmAndamento = await prisma.jogo.findFirst({
      where: {
        partida_id: parseInt(partidaId),
        status_jogo: "em_andamento",
      },
    });

    if (jogoEmAndamento) {
      return res.status(409).json({
        error: "Há um jogo em andamento. Finalize-o antes de criar outro.",
        jogo_atual: jogoEmAndamento.id,
      });
    }

    // Determinar número do próximo jogo
    const ultimoJogo = partida.jogo[0];
    const proximoNumero = ultimoJogo ? ultimoJogo.numero_jogo + 1 : 1;

    // Criar novo jogo
    const novoJogo = await prisma.jogo.create({
      data: {
        partida_id: parseInt(partidaId),
        numero_jogo: proximoNumero,
        time_a_id: parseInt(time_a_id),
        time_b_id: parseInt(time_b_id),
        status_jogo: "agendado",
        observacoes: observacoes || null,
      },
      include: {
        time_a: {
          include: {
            jogador_time: {
              include: {
                jogador: {
                  include: { usuario: { select: { nome: true } } },
                },
              },
            },
          },
        },
        time_b: {
          include: {
            jogador_time: {
              include: {
                jogador: {
                  include: { usuario: { select: { nome: true } } },
                },
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      message: "Jogo criado com sucesso!",
      jogo: {
        id: novoJogo.id,
        numero_jogo: novoJogo.numero_jogo,
        status: novoJogo.status_jogo,
        observacoes: novoJogo.observacoes,
        time_a: {
          id: novoJogo.time_a.id,
          nome: novoJogo.time_a.nome_time,
          jogadores: novoJogo.time_a.jogador_time.map(
            (jt) => jt.jogador.usuario.nome
          ),
        },
        time_b: {
          id: novoJogo.time_b.id,
          nome: novoJogo.time_b.nome_time,
          jogadores: novoJogo.time_b.jogador_time.map(
            (jt) => jt.jogador.usuario.nome
          ),
        },
      },
      proximo_passo: `Inicie o jogo usando PUT /jogos/${novoJogo.id}/iniciar`,
    });
  } catch (error) {
    console.error("Erro ao criar jogo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Iniciar jogo específico
export const iniciarJogo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { jogoId } = req.params;

    // Buscar jogo e verificar permissões
    const jogo = await prisma.jogo.findUnique({
      where: { id: parseInt(jogoId) },
      include: {
        partida: {
          include: {
            grupo: {
              include: {
                membro_grupo: {
                  where: {
                    jogador_id: req.user.id,
                    status: "ativo",
                    papel: "admin",
                  },
                },
              },
            },
          },
        },
        time_a: { select: { id: true, nome_time: true } },
        time_b: { select: { id: true, nome_time: true } },
      },
    });

    if (!jogo) {
      return res.status(404).json({ error: "Jogo não encontrado." });
    }

    if (jogo.partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem iniciar jogos." });
    }

    if (jogo.status_jogo !== "agendado") {
      return res.status(400).json({
        error: `Não é possível iniciar um jogo com status '${jogo.status_jogo}'.`,
      });
    }

    // Atualizar status do jogo
    const jogoAtualizado = await prisma.jogo.update({
      where: { id: parseInt(jogoId) },
      data: {
        status_jogo: "em_andamento",
        data_inicio: new Date(),
      },
    });

    return res.status(200).json({
      message: "Jogo iniciado com sucesso!",
      jogo: {
        id: jogoAtualizado.id,
        numero_jogo: jogoAtualizado.numero_jogo,
        status: jogoAtualizado.status_jogo,
        data_inicio: jogoAtualizado.data_inicio,
        time_a: jogo.time_a,
        time_b: jogo.time_b,
        placar: {
          time_a: jogoAtualizado.placar_time_a,
          time_b: jogoAtualizado.placar_time_b,
        },
      },
      proximo_passo: `Atualize pontos usando PUT /jogos/${jogoId}/pontos ou finalize com PUT /jogos/${jogoId}/finalizar`,
    });
  } catch (error) {
    console.error("Erro ao iniciar jogo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Atualizar pontuação em tempo real
export const atualizarPontos = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { jogoId } = req.params;
    const { placar_time_a, placar_time_b } = req.body;

    // Validação de entrada
    if (placar_time_a < 0 || placar_time_b < 0) {
      return res.status(400).json({
        error: "Os placares não podem ser negativos.",
      });
    }

    // Buscar jogo e verificar permissões
    const jogo = await prisma.jogo.findUnique({
      where: { id: parseInt(jogoId) },
      include: {
        partida: {
          include: {
            grupo: {
              include: {
                membro_grupo: {
                  where: {
                    jogador_id: req.user.id,
                    status: "ativo",
                    papel: "admin",
                  },
                },
              },
            },
          },
        },
        time_a: { select: { id: true, nome_time: true } },
        time_b: { select: { id: true, nome_time: true } },
      },
    });

    if (!jogo) {
      return res.status(404).json({ error: "Jogo não encontrado." });
    }

    if (jogo.partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem atualizar pontos." });
    }

    if (jogo.status_jogo !== "em_andamento") {
      return res.status(400).json({
        error: "Só é possível atualizar pontos de jogos em andamento.",
      });
    }

    // Atualizar pontuação
    const jogoAtualizado = await prisma.jogo.update({
      where: { id: parseInt(jogoId) },
      data: {
        placar_time_a: parseInt(placar_time_a),
        placar_time_b: parseInt(placar_time_b),
      },
    });

    return res.status(200).json({
      message: "Pontuação atualizada com sucesso!",
      jogo: {
        id: jogoAtualizado.id,
        numero_jogo: jogoAtualizado.numero_jogo,
        time_a: jogo.time_a,
        time_b: jogo.time_b,
        placar: {
          time_a: jogoAtualizado.placar_time_a,
          time_b: jogoAtualizado.placar_time_b,
        },
        status: jogoAtualizado.status_jogo,
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar pontos:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Finalizar jogo e preparar para próximo
export const finalizarJogo = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { jogoId } = req.params;
    const { placar_time_a, placar_time_b, observacoes } = req.body;

    // Validação de entrada
    if (placar_time_a < 0 || placar_time_b < 0) {
      return res.status(400).json({
        error: "Os placares não podem ser negativos.",
      });
    }

    if (placar_time_a === placar_time_b) {
      return res.status(400).json({
        error: "Não é permitido empate no vôlei. Um time deve vencer.",
      });
    }

    // Buscar jogo e verificar permissões
    const jogo = await prisma.jogo.findUnique({
      where: { id: parseInt(jogoId) },
      include: {
        partida: {
          include: {
            grupo: {
              include: {
                membro_grupo: {
                  where: {
                    jogador_id: req.user.id,
                    status: "ativo",
                    papel: "admin",
                  },
                },
              },
            },
          },
        },
        time_a: {
          select: {
            id: true,
            nome_time: true,
            jogador_time: {
              include: {
                jogador: {
                  include: { usuario: { select: { nome: true } } },
                },
              },
            },
          },
        },
        time_b: {
          select: {
            id: true,
            nome_time: true,
            jogador_time: {
              include: {
                jogador: {
                  include: { usuario: { select: { nome: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!jogo) {
      return res.status(404).json({ error: "Jogo não encontrado." });
    }

    if (jogo.partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem finalizar jogos." });
    }

    if (jogo.status_jogo !== "em_andamento") {
      return res.status(400).json({
        error: "Só é possível finalizar jogos em andamento.",
      });
    }

    // Determinar vencedor
    const time_vencedor_id =
      placar_time_a > placar_time_b ? jogo.time_a_id : jogo.time_b_id;
    const timeVencedor =
      placar_time_a > placar_time_b ? jogo.time_a : jogo.time_b;
    const timePerdedor =
      placar_time_a > placar_time_b ? jogo.time_b : jogo.time_a;

    // Finalizar jogo
    const jogoFinalizado = await prisma.jogo.update({
      where: { id: parseInt(jogoId) },
      data: {
        placar_time_a: parseInt(placar_time_a),
        placar_time_b: parseInt(placar_time_b),
        time_vencedor_id,
        status_jogo: "finalizado",
        data_fim: new Date(),
        duracao_minutos: jogo.data_inicio
          ? Math.round(
              (new Date().getTime() - jogo.data_inicio.getTime()) / (1000 * 60)
            )
          : null,
        observacoes: observacoes || jogo.observacoes,
      },
    });

    return res.status(200).json({
      message: "Jogo finalizado com sucesso!",
      resultado: {
        jogo_id: jogoFinalizado.id,
        numero_jogo: jogoFinalizado.numero_jogo,
        placar_final: {
          [timeVencedor.nome_time || "Time A"]:
            placar_time_a > placar_time_b ? placar_time_a : placar_time_b,
          [timePerdedor.nome_time || "Time B"]:
            placar_time_a > placar_time_b ? placar_time_b : placar_time_a,
        },
        vencedor: {
          id: timeVencedor.id,
          nome: timeVencedor.nome_time,
          jogadores: timeVencedor.jogador_time.map(
            (jt) => jt.jogador.usuario.nome
          ),
        },
        duracao_minutos: jogoFinalizado.duracao_minutos,
        observacoes: jogoFinalizado.observacoes,
      },
      proxima_acao: {
        message: "Jogo finalizado! Você pode:",
        opcoes: [
          `Criar próximo jogo: POST /partidas/${jogo.partida_id}/jogos`,
          `Finalizar pelada: PUT /partidas/${jogo.partida_id}/pelada/finalizar`,
          `Ver histórico: GET /partidas/${jogo.partida_id}/jogos`,
        ],
      },
    });
  } catch (error) {
    console.error("Erro ao finalizar jogo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Listar todos os jogos da pelada (histórico)
export const listarJogos = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { partidaId } = req.params;

    // Verificar se a partida existe
    const partida = await prisma.partida.findUnique({
      where: { id: parseInt(partidaId) },
      include: {
        jogo: {
          include: {
            time_a: { select: { id: true, nome_time: true } },
            time_b: { select: { id: true, nome_time: true } },
            time_vencedor: { select: { id: true, nome_time: true } },
          },
          orderBy: { numero_jogo: "asc" },
        },
        time: { select: { id: true, nome_time: true } },
      },
    });

    if (!partida) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    // Estatísticas gerais
    const jogosFinalizada = partida.jogo.filter(
      (j) => j.status_jogo === "finalizado"
    );
    const jogoEmAndamento = partida.jogo.find(
      (j) => j.status_jogo === "em_andamento"
    );

    // Calcular estatísticas por time
    const estatisticasTimes = partida.time.map((time) => {
      const vitorias = jogosFinalizada.filter(
        (j) => j.time_vencedor_id === time.id
      ).length;
      const jogos = jogosFinalizada.filter(
        (j) => j.time_a_id === time.id || j.time_b_id === time.id
      ).length;
      const derrotas = jogos - vitorias;

      return {
        time: time,
        vitorias,
        derrotas,
        jogos_total: jogos,
        aproveitamento:
          jogos > 0 ? ((vitorias / jogos) * 100).toFixed(1) : "0.0",
      };
    });

    return res.status(200).json({
      partida: {
        id: partida.id,
        jogo_ativo: partida.jogo_ativo,
        status: partida.status,
        total_jogos: partida.jogo.length,
        jogos_finalizados: jogosFinalizada.length,
      },
      jogo_atual: jogoEmAndamento
        ? {
            id: jogoEmAndamento.id,
            numero_jogo: jogoEmAndamento.numero_jogo,
            time_a: jogoEmAndamento.time_a,
            time_b: jogoEmAndamento.time_b,
            placar: {
              time_a: jogoEmAndamento.placar_time_a,
              time_b: jogoEmAndamento.placar_time_b,
            },
            status: jogoEmAndamento.status_jogo,
          }
        : null,
      estatisticas_times: estatisticasTimes.sort(
        (a, b) => b.vitorias - a.vitorias
      ),
      historico_jogos: partida.jogo.map((jogo) => ({
        id: jogo.id,
        numero_jogo: jogo.numero_jogo,
        time_a: jogo.time_a,
        time_b: jogo.time_b,
        placar: {
          time_a: jogo.placar_time_a,
          time_b: jogo.placar_time_b,
        },
        vencedor: jogo.time_vencedor,
        status: jogo.status_jogo,
        duracao_minutos: jogo.duracao_minutos,
        data_inicio: jogo.data_inicio,
        data_fim: jogo.data_fim,
        observacoes: jogo.observacoes,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar jogos:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Finalizar pelada (encerrar sessão de jogos)
export const finalizarPelada = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { partidaId } = req.params;

    // Verificar permissões
    const partida = await prisma.partida.findUnique({
      where: { id: parseInt(partidaId) },
      include: {
        grupo: {
          include: {
            membro_grupo: {
              where: {
                jogador_id: req.user.id,
                status: "ativo",
                papel: "admin",
              },
            },
          },
        },
        jogo: {
          include: {
            time_vencedor: { select: { id: true, nome_time: true } },
          },
          where: { status_jogo: "finalizado" },
        },
      },
    });

    if (!partida) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    if (partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem finalizar peladas." });
    }

    if (!partida.jogo_ativo) {
      return res.status(400).json({
        error: "Não há pelada ativa para finalizar.",
      });
    }

    // Verificar se há jogo em andamento
    const jogoEmAndamento = await prisma.jogo.findFirst({
      where: {
        partida_id: parseInt(partidaId),
        status_jogo: "em_andamento",
      },
    });

    if (jogoEmAndamento) {
      return res.status(400).json({
        error: "Finalize o jogo em andamento antes de encerrar a pelada.",
        jogo_ativo: jogoEmAndamento.id,
      });
    }

    // Finalizar partida
    await prisma.partida.update({
      where: { id: parseInt(partidaId) },
      data: {
        jogo_ativo: false,
        status: "finalizada",
        updated_at: new Date(),
      },
    });

    // Calcular estatísticas finais
    const timeVitorias = new Map();
    partida.jogo.forEach((jogo) => {
      if (jogo.time_vencedor) {
        const timeId = jogo.time_vencedor.id;
        timeVitorias.set(timeId, (timeVitorias.get(timeId) || 0) + 1);
      }
    });

    const timeCampeao = Array.from(timeVitorias.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    return res.status(200).json({
      message: "Pelada finalizada com sucesso!",
      resumo: {
        partida_id: partida.id,
        total_jogos: partida.jogo.length,
        time_campeao: timeCampeao
          ? {
              id: timeCampeao[0],
              nome: partida.jogo.find(
                (j) => j.time_vencedor?.id === timeCampeao[0]
              )?.time_vencedor?.nome_time,
              vitorias: timeCampeao[1],
            }
          : null,
        data_finalizacao: new Date(),
      },
      historico_completo: `Acesse GET /partidas/${partidaId}/jogos para ver o histórico completo`,
    });
  } catch (error) {
    console.error("Erro ao finalizar pelada:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Obter detalhes de um jogo específico
export const obterJogo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { jogoId } = req.params;

    const jogo = await prisma.jogo.findUnique({
      where: { id: parseInt(jogoId) },
      include: {
        partida: { select: { id: true, status: true, jogo_ativo: true } },
        time_a: {
          include: {
            jogador_time: {
              include: {
                jogador: {
                  include: { usuario: { select: { nome: true } } },
                },
              },
            },
          },
        },
        time_b: {
          include: {
            jogador_time: {
              include: {
                jogador: {
                  include: { usuario: { select: { nome: true } } },
                },
              },
            },
          },
        },
        time_vencedor: { select: { id: true, nome_time: true } },
        evento_jogo: {
          include: {
            jogador: {
              include: { usuario: { select: { nome: true } } },
            },
          },
          orderBy: { data_evento: "asc" },
        },
      },
    });

    if (!jogo) {
      return res.status(404).json({ error: "Jogo não encontrado." });
    }

    return res.status(200).json({
      jogo: {
        id: jogo.id,
        numero_jogo: jogo.numero_jogo,
        status: jogo.status_jogo,
        time_a: {
          id: jogo.time_a.id,
          nome: jogo.time_a.nome_time,
          jogadores: jogo.time_a.jogador_time.map((jt) => ({
            id: jt.jogador.id,
            nome: jt.jogador.usuario.nome,
            posicao: jt.posicao_jogada,
          })),
        },
        time_b: {
          id: jogo.time_b.id,
          nome: jogo.time_b.nome_time,
          jogadores: jogo.time_b.jogador_time.map((jt) => ({
            id: jt.jogador.id,
            nome: jt.jogador.usuario.nome,
            posicao: jt.posicao_jogada,
          })),
        },
        placar: {
          time_a: jogo.placar_time_a,
          time_b: jogo.placar_time_b,
        },
        vencedor: jogo.time_vencedor,
        duracao_minutos: jogo.duracao_minutos,
        data_inicio: jogo.data_inicio,
        data_fim: jogo.data_fim,
        observacoes: jogo.observacoes,
      },
      eventos: jogo.evento_jogo.map((evento) => ({
        id: evento.id,
        tipo: evento.tipo_evento,
        jogador: evento.jogador.usuario.nome,
        minuto: evento.minuto_jogo,
        descricao: evento.descricao,
        data: evento.data_evento,
      })),
      partida: jogo.partida,
    });
  } catch (error) {
    console.error("Erro ao obter jogo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};
