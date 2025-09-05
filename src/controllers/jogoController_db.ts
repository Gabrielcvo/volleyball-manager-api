import { Response } from "express";
import prisma from "../config/database";
import { AuthenticatedRequest } from "../types/auth";

interface TimeBasic {
  id: number;
  nome_time?: string | null;
}

// Função auxiliar para gerar combinações de times
function gerarCombinacoes(times: TimeBasic[]): [number, number][] {
  const combinacoes: [number, number][] = [];
  for (let i = 0; i < times.length; i++) {
    for (let j = i + 1; j < times.length; j++) {
      combinacoes.push([times[i].id, times[j].id]);
    }
  }
  return combinacoes;
}

// Inicializar sistema de jogos para uma partida
export const inicializarJogos = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { partidaId } = req.params;
    const { tipo_torneio = "jogo_unico", meta_pontos } = req.body;

    // Verificar se usuário é admin da partida
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
      },
    });

    if (!partida || partida.grupo.membro_grupo.length === 0) {
      return res.status(403).json({
        error: "Apenas administradores podem inicializar jogos.",
      });
    }

    // Verificar se já existem jogos para esta partida
    const jogosExistentes = await (prisma as any).jogo.count({
      where: { partida_id: parseInt(partidaId) },
    });

    if (jogosExistentes > 0) {
      return res.status(409).json({
        error: "Sistema de jogos já foi inicializado para esta partida.",
      });
    }

    const numTimes = partida.time.length;
    if (numTimes < 2) {
      return res.status(400).json({
        error: "É necessário pelo menos 2 times para inicializar os jogos.",
      });
    }

    // Definir jogos a serem criados
    let jogosParaCriar: any[] = [];

    if (numTimes === 2) {
      // Lógica para 2 times
      switch (tipo_torneio) {
        case "jogo_unico":
          jogosParaCriar = [
            {
              partida_id: parseInt(partidaId),
              numero_jogo: 1,
              time_a_id: partida.time[0].id,
              time_b_id: partida.time[1].id,
            },
          ];
          break;
        case "melhor_de_3":
          jogosParaCriar = [
            {
              partida_id: parseInt(partidaId),
              numero_jogo: 1,
              time_a_id: partida.time[0].id,
              time_b_id: partida.time[1].id,
            },
          ];
          break;
        case "melhor_de_5":
          jogosParaCriar = [
            {
              partida_id: parseInt(partidaId),
              numero_jogo: 1,
              time_a_id: partida.time[0].id,
              time_b_id: partida.time[1].id,
            },
          ];
          break;
        default:
          jogosParaCriar = [
            {
              partida_id: parseInt(partidaId),
              numero_jogo: 1,
              time_a_id: partida.time[0].id,
              time_b_id: partida.time[1].id,
            },
          ];
          break;
      }
    } else if (numTimes === 3) {
      // Lógica para 3 times
      if (tipo_torneio === "round_robin") {
        const combinacoes = gerarCombinacoes(partida.time);
        jogosParaCriar = combinacoes.map((combinacao, index) => ({
          partida_id: parseInt(partidaId),
          numero_jogo: index + 1,
          time_a_id: combinacao[0],
          time_b_id: combinacao[1],
        }));
      } else {
        // Eliminação rotativa - cria primeiro jogo
        jogosParaCriar = [
          {
            partida_id: parseInt(partidaId),
            numero_jogo: 1,
            time_a_id: partida.time[0].id,
            time_b_id: partida.time[1].id,
          },
        ];
      }
    } else {
      // 4+ times - Round Robin
      const combinacoes = gerarCombinacoes(partida.time);
      jogosParaCriar = combinacoes.map((combinacao, index) => ({
        partida_id: parseInt(partidaId),
        numero_jogo: index + 1,
        time_a_id: combinacao[0],
        time_b_id: combinacao[1],
      }));
    }

    // Criar jogos no banco de dados
    const jogosCreated = [];
    for (const jogo of jogosParaCriar) {
      const novoJogo = await (prisma as any).jogo.create({
        data: {
          partida_id: jogo.partida_id,
          numero_jogo: jogo.numero_jogo,
          time_a_id: jogo.time_a_id,
          time_b_id: jogo.time_b_id,
          placar_time_a: 0,
          placar_time_b: 0,
          status_jogo: "agendado",
        },
      });
      jogosCreated.push(novoJogo);
    }

    return res.status(201).json({
      message: "Sistema de jogos inicializado com sucesso!",
      partida: {
        id: partida.id,
        tipo_torneio,
        total_times: numTimes,
        meta_pontos: meta_pontos || null,
      },
      configuracao: {
        tipo_torneio,
        total_jogos_criados: jogosCreated.length,
        modo:
          numTimes === 2
            ? "serie"
            : numTimes === 3
            ? "rotativo"
            : "round_robin",
      },
      jogos_criados: jogosCreated.map((jogo: any) => ({
        id: jogo.id,
        numero_jogo: jogo.numero_jogo,
        time_a: partida.time.find((t) => t.id === jogo.time_a_id)?.nome_time,
        time_b: partida.time.find((t) => t.id === jogo.time_b_id)?.nome_time,
        status: jogo.status_jogo,
      })),
      proximo_passo: "Use PUT /jogos/:id/iniciar para começar o primeiro jogo",
    });
  } catch (error) {
    console.error("Erro ao inicializar jogos:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Listar jogos de uma partida
export const listarJogos = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { partidaId } = req.params;

    // Verificar acesso à partida
    const partida = await prisma.partida.findUnique({
      where: { id: parseInt(partidaId) },
      include: {
        grupo: {
          include: {
            membro_grupo: {
              where: {
                jogador_id: req.user.id,
                status: "ativo",
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

    if (!partida || partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Você não tem acesso a esta partida." });
    }

    // Buscar jogos reais da partida no banco de dados
    const jogos = await (prisma as any).jogo.findMany({
      where: { partida_id: parseInt(partidaId) },
      orderBy: { numero_jogo: "asc" },
    });

    // Calcular estatísticas da série (para 2 times)
    const serieInfo =
      partida.time.length === 2
        ? {
            tipo: "melhor_de_3",
            jogos_para_vencer: 2,
            placar_serie: {
              time_a: jogos.filter(
                (j: any) => j.time_vencedor_id === partida.time[0]?.id
              ).length,
              time_b: jogos.filter(
                (j: any) => j.time_vencedor_id === partida.time[1]?.id
              ).length,
            },
          }
        : null;

    // Calcular estatísticas por time
    const estatisticasTimes = partida.time.map((time) => {
      const jogosDoTime = jogos.filter(
        (j: any) => j.time_a_id === time.id || j.time_b_id === time.id
      );

      return {
        time_id: time.id,
        nome_time: time.nome_time,
        jogos_jogados: jogosDoTime.filter(
          (j: any) => j.status_jogo === "finalizado"
        ).length,
        vitorias: jogosDoTime.filter((j: any) => j.time_vencedor_id === time.id)
          .length,
        derrotas: jogosDoTime.filter(
          (j: any) =>
            j.status_jogo === "finalizado" &&
            j.time_vencedor_id !== time.id &&
            j.time_vencedor_id !== null
        ).length,
        pontos_marcados: jogosDoTime.reduce((total: number, jogo: any) => {
          return (
            total +
            (jogo.time_a_id === time.id
              ? jogo.placar_time_a || 0
              : jogo.placar_time_b || 0)
          );
        }, 0),
        pontos_sofridos: jogosDoTime.reduce((total: number, jogo: any) => {
          return (
            total +
            (jogo.time_a_id === time.id
              ? jogo.placar_time_b || 0
              : jogo.placar_time_a || 0)
          );
        }, 0),
        jogadores: time.jogador_time.map((jt) => ({
          id: jt.jogador.id,
          nome: jt.jogador.usuario.nome,
        })),
      };
    });

    return res.status(200).json({
      partida: {
        id: partida.id,
        total_times: partida.time.length,
        status: jogos.length > 0 ? "inicializado" : "aguardando_inicializacao",
      },
      times: estatisticasTimes,
      jogos: jogos.map((jogo: any) => ({
        id: jogo.id,
        numero_jogo: jogo.numero_jogo,
        time_a: {
          id: jogo.time_a_id,
          nome: partida.time.find((t) => t.id === jogo.time_a_id)?.nome_time,
        },
        time_b: {
          id: jogo.time_b_id,
          nome: partida.time.find((t) => t.id === jogo.time_b_id)?.nome_time,
        },
        placar: {
          time_a: jogo.placar_time_a,
          time_b: jogo.placar_time_b,
        },
        time_vencedor: jogo.time_vencedor_id
          ? {
              id: jogo.time_vencedor_id,
              nome: partida.time.find((t) => t.id === jogo.time_vencedor_id)
                ?.nome_time,
            }
          : null,
        status: jogo.status_jogo,
        timing: {
          data_inicio: jogo.data_inicio,
          data_fim: jogo.data_fim,
          duracao_minutos: jogo.duracao_minutos,
        },
        observacoes: jogo.observacoes,
      })),
      serie_info: serieInfo,
      status_geral: {
        jogos_total: jogos.length,
        jogos_finalizados: jogos.filter(
          (j: any) => j.status_jogo === "finalizado"
        ).length,
        jogos_pendentes: jogos.filter((j: any) => j.status_jogo === "agendado")
          .length,
        jogo_em_andamento: jogos.find(
          (j: any) => j.status_jogo === "em_andamento"
        )
          ? true
          : false,
        serie_finalizada:
          serieInfo &&
          (serieInfo.placar_serie.time_a >= 2 ||
            serieInfo.placar_serie.time_b >= 2),
      },
      proximo_jogo: jogos.find((j: any) => j.status_jogo === "agendado")
        ? {
            id: jogos.find((j: any) => j.status_jogo === "agendado")?.id,
            numero: jogos.find((j: any) => j.status_jogo === "agendado")
              ?.numero_jogo,
          }
        : null,
    });
  } catch (error) {
    console.error("Erro ao listar jogos:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Iniciar um jogo específico
export const iniciarJogo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { jogoId } = req.params;

    // Buscar jogo no banco de dados
    const jogo = await (prisma as any).jogo.findUnique({
      where: { id: parseInt(jogoId) },
    });

    if (!jogo) {
      return res.status(404).json({
        error: "Jogo não encontrado.",
      });
    }

    // Verificar se o usuário tem permissão
    const partida = await prisma.partida.findUnique({
      where: { id: jogo.partida_id },
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
      },
    });

    if (!partida || partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem iniciar jogos." });
    }

    if (jogo.status_jogo !== "agendado") {
      return res.status(400).json({
        error: "Jogo já foi iniciado ou finalizado.",
      });
    }

    // Atualizar o status do jogo no banco
    const jogoAtualizado = await (prisma as any).jogo.update({
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
        times: {
          time_a: {
            id: jogoAtualizado.time_a_id,
            nome: partida.time.find((t) => t.id === jogoAtualizado.time_a_id)
              ?.nome_time,
          },
          time_b: {
            id: jogoAtualizado.time_b_id,
            nome: partida.time.find((t) => t.id === jogoAtualizado.time_b_id)
              ?.nome_time,
          },
        },
      },
      proximo_passo: "Use PUT /jogos/:id/finalizar para registrar o resultado",
    });
  } catch (error) {
    console.error("Erro ao iniciar jogo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Atualizar pontos de um jogo em andamento
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

    if (
      typeof placar_time_a !== "number" ||
      typeof placar_time_b !== "number" ||
      placar_time_a < 0 ||
      placar_time_b < 0
    ) {
      return res.status(400).json({
        error: "Placares devem ser números válidos e não negativos.",
      });
    }

    // Buscar jogo no banco de dados
    const jogo = await (prisma as any).jogo.findUnique({
      where: { id: parseInt(jogoId) },
    });

    if (!jogo) {
      return res.status(404).json({
        error: "Jogo não encontrado.",
      });
    }

    // Verificar permissões
    const partida = await prisma.partida.findUnique({
      where: { id: jogo.partida_id },
      include: {
        grupo: {
          include: {
            membro_grupo: {
              where: {
                jogador_id: req.user.id,
                status: "ativo",
              },
            },
          },
        },
        time: true,
      },
    });

    if (!partida || partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Você não tem acesso a este jogo." });
    }

    if (jogo.status_jogo !== "em_andamento") {
      return res.status(400).json({
        error: "Só é possível atualizar pontos de jogos em andamento.",
      });
    }

    // Atualizar pontos no banco
    const jogoAtualizado = await (prisma as any).jogo.update({
      where: { id: parseInt(jogoId) },
      data: {
        placar_time_a,
        placar_time_b,
      },
    });

    return res.status(200).json({
      message: "Pontos atualizados com sucesso!",
      jogo: {
        id: jogoAtualizado.id,
        numero_jogo: jogoAtualizado.numero_jogo,
        status: jogoAtualizado.status_jogo,
        placar: {
          time_a: jogoAtualizado.placar_time_a,
          time_b: jogoAtualizado.placar_time_b,
        },
        times: {
          time_a: {
            id: jogoAtualizado.time_a_id,
            nome: partida.time.find((t) => t.id === jogoAtualizado.time_a_id)
              ?.nome_time,
          },
          time_b: {
            id: jogoAtualizado.time_b_id,
            nome: partida.time.find((t) => t.id === jogoAtualizado.time_b_id)
              ?.nome_time,
          },
        },
        ultima_atualizacao: new Date(),
      },
      proximos_passos: [
        "Continue atualizando pontos com PUT /jogos/:id/atualizar-pontos",
        "Finalize o jogo com PUT /jogos/:id/finalizar quando terminar",
      ],
    });
  } catch (error) {
    console.error("Erro ao atualizar pontos:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Finalizar jogo e registrar resultado
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

    if (
      typeof placar_time_a !== "number" ||
      typeof placar_time_b !== "number"
    ) {
      return res.status(400).json({
        error: "Placares devem ser números válidos.",
      });
    }

    // Buscar jogo no banco de dados
    const jogo = await (prisma as any).jogo.findUnique({
      where: { id: parseInt(jogoId) },
    });

    if (!jogo) {
      return res.status(404).json({
        error: "Jogo não encontrado.",
      });
    }

    // Verificar permissões
    const partida = await prisma.partida.findUnique({
      where: { id: jogo.partida_id },
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
      },
    });

    if (!partida || partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem finalizar jogos." });
    }

    if (jogo.status_jogo === "finalizado") {
      return res.status(400).json({
        error: "Jogo já foi finalizado.",
      });
    }

    // Determinar vencedor
    let time_vencedor_id = null;
    if (placar_time_a > placar_time_b) {
      time_vencedor_id = jogo.time_a_id;
    } else if (placar_time_b > placar_time_a) {
      time_vencedor_id = jogo.time_b_id;
    }

    // Atualizar jogo no banco
    const jogoFinalizado = await (prisma as any).jogo.update({
      where: { id: parseInt(jogoId) },
      data: {
        placar_time_a,
        placar_time_b,
        time_vencedor_id,
        status_jogo: "finalizado",
        data_fim: new Date(),
        observacoes: observacoes || null,
        duracao_minutos: jogo.data_inicio
          ? Math.round(
              (new Date().getTime() - jogo.data_inicio.getTime()) / (1000 * 60)
            )
          : null,
      },
    });

    // Lógica para próximo jogo (simplificada)
    let proximoJogo = null;

    // Para séries, verificar se precisa criar próximo jogo
    if (partida.time.length === 2) {
      const jogosFinalizados = await (prisma as any).jogo.findMany({
        where: {
          partida_id: jogo.partida_id,
          status_jogo: "finalizado",
        },
      });

      const vitorias_a = jogosFinalizados.filter(
        (j: any) => j.time_vencedor_id === jogo.time_a_id
      ).length;
      const vitorias_b = jogosFinalizados.filter(
        (j: any) => j.time_vencedor_id === jogo.time_b_id
      ).length;

      // Se nenhum time tem 2 vitórias, criar próximo jogo
      if (vitorias_a < 2 && vitorias_b < 2) {
        const proximoNumero =
          Math.max(...jogosFinalizados.map((j: any) => j.numero_jogo)) + 1;

        proximoJogo = await (prisma as any).jogo.create({
          data: {
            partida_id: jogo.partida_id,
            numero_jogo: proximoNumero,
            time_a_id: jogo.time_a_id,
            time_b_id: jogo.time_b_id,
            placar_time_a: 0,
            placar_time_b: 0,
            status_jogo: "agendado",
          },
        });
      }
    }

    return res.status(200).json({
      message: "Jogo finalizado com sucesso!",
      jogo: {
        id: jogoFinalizado.id,
        numero_jogo: jogoFinalizado.numero_jogo,
        status: jogoFinalizado.status_jogo,
        placar: {
          time_a: jogoFinalizado.placar_time_a,
          time_b: jogoFinalizado.placar_time_b,
        },
        time_vencedor: time_vencedor_id
          ? {
              id: time_vencedor_id,
              nome: partida.time.find((t) => t.id === time_vencedor_id)
                ?.nome_time,
            }
          : null,
        timing: {
          data_inicio: jogoFinalizado.data_inicio,
          data_fim: jogoFinalizado.data_fim,
          duracao_minutos: jogoFinalizado.duracao_minutos,
        },
        observacoes: jogoFinalizado.observacoes,
      },
      proximo_jogo: proximoJogo
        ? {
            id: proximoJogo.id,
            numero_jogo: proximoJogo.numero_jogo,
            criado_automaticamente: true,
          }
        : null,
    });
  } catch (error) {
    console.error("Erro ao finalizar jogo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Criar próximo jogo manualmente
export const criarProximoJogo = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { partidaId } = req.params;
    const { time_a_id, time_b_id, observacoes } = req.body;

    if (!time_a_id || !time_b_id) {
      return res.status(400).json({
        error: "IDs dos times são obrigatórios.",
      });
    }

    if (time_a_id === time_b_id) {
      return res.status(400).json({
        error: "Um time não pode jogar contra ele mesmo.",
      });
    }

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
        time: true,
      },
    });

    if (!partida || partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem criar jogos." });
    }

    // Verificar se os times existem na partida
    const timeA = partida.time.find((t) => t.id === time_a_id);
    const timeB = partida.time.find((t) => t.id === time_b_id);

    if (!timeA || !timeB) {
      return res.status(400).json({
        error: "Times inválidos para esta partida.",
      });
    }

    // Buscar último número de jogo
    const jogosExistentes = await (prisma as any).jogo.findMany({
      where: { partida_id: parseInt(partidaId) },
      orderBy: { numero_jogo: "desc" },
      take: 1,
    });

    const proximoNumero =
      jogosExistentes.length > 0 ? jogosExistentes[0].numero_jogo + 1 : 1;

    // Criar jogo no banco
    const novoJogo = await (prisma as any).jogo.create({
      data: {
        partida_id: parseInt(partidaId),
        numero_jogo: proximoNumero,
        time_a_id,
        time_b_id,
        placar_time_a: 0,
        placar_time_b: 0,
        status_jogo: "agendado",
        observacoes: observacoes || null,
      },
    });

    return res.status(201).json({
      message: "Próximo jogo criado com sucesso!",
      jogo: {
        id: novoJogo.id,
        numero_jogo: novoJogo.numero_jogo,
        time_a: {
          id: timeA.id,
          nome: timeA.nome_time,
        },
        time_b: {
          id: timeB.id,
          nome: timeB.nome_time,
        },
        status: novoJogo.status_jogo,
        observacoes: novoJogo.observacoes,
        created_at: novoJogo.created_at,
      },
    });
  } catch (error) {
    console.error("Erro ao criar próximo jogo:", error);
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

    // Buscar jogo no banco de dados
    const jogo = await (prisma as any).jogo.findUnique({
      where: { id: parseInt(jogoId) },
    });

    if (!jogo) {
      return res.status(404).json({
        error: "Jogo não encontrado.",
      });
    }

    // Verificar permissões
    const partida = await prisma.partida.findUnique({
      where: { id: jogo.partida_id },
      include: {
        grupo: {
          include: {
            membro_grupo: {
              where: {
                jogador_id: req.user.id,
                status: "ativo",
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

    if (!partida || partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Você não tem acesso a este jogo." });
    }

    const timeA = partida.time.find((t) => t.id === jogo.time_a_id);
    const timeB = partida.time.find((t) => t.id === jogo.time_b_id);
    const timeVencedor = partida.time.find(
      (t) => t.id === jogo.time_vencedor_id
    );

    // Em produção, eventos seriam buscados do banco:
    // const eventos = await prisma.evento_jogo.findMany({ where: { jogo_id: parseInt(jogoId) } })

    return res.status(200).json({
      jogo: {
        id: jogo.id,
        numero_jogo: jogo.numero_jogo,
        partida_id: jogo.partida_id,
        times: {
          time_a: {
            id: timeA?.id,
            nome: timeA?.nome_time,
            jogadores: timeA?.jogador_time.map((jt) => ({
              id: jt.jogador.id,
              nome: jt.jogador.usuario.nome,
            })),
          },
          time_b: {
            id: timeB?.id,
            nome: timeB?.nome_time,
            jogadores: timeB?.jogador_time.map((jt) => ({
              id: jt.jogador.id,
              nome: jt.jogador.usuario.nome,
            })),
          },
        },
        placar: {
          time_a: jogo.placar_time_a,
          time_b: jogo.placar_time_b,
        },
        time_vencedor: timeVencedor
          ? {
              id: timeVencedor.id,
              nome: timeVencedor.nome_time,
            }
          : null,
        timing: {
          data_inicio: jogo.data_inicio,
          data_fim: jogo.data_fim,
          duracao_minutos: jogo.duracao_minutos,
        },
        observacoes: jogo.observacoes,
        eventos: [], // Sistema de eventos será implementado futuramente
      },
      estatisticas_contexto: {
        partida: {
          id: partida.id,
          total_times: partida.time.length,
        },
        serie:
          partida.time.length === 2
            ? {
                numero_na_serie: jogo.numero_jogo,
                placar_serie: { time_a: 1, time_b: 0 }, // Simplificado
              }
            : null,
        game: {
          status: jogo.status_jogo,
          timing: {
            data_inicio: jogo.data_inicio,
            data_fim: jogo.data_fim,
            duracao_minutos: jogo.duracao_minutos,
          },
          observacoes: jogo.observacoes,
        },
      },
    });
  } catch (error) {
    console.error("Erro ao obter jogo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};
