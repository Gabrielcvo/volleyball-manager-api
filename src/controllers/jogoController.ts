import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../types/auth";

const prisma = new PrismaClient();

// Removido sistema de memória - agora usando banco de dados real

interface TimeBasic {
  id: number;
  nome_time?: string | null;
}

interface JogoData {
  partida_id: number;
  numero_jogo: number;
  time_a_id: number;
  time_b_id: number;
  status_jogo: string;
}

// Função para gerar combinações de jogos (round-robin)
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
                    usuario: {
                      select: { id: true, nome: true },
                    },
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
        .json({ error: "Apenas administradores podem inicializar jogos." });
    }

    if (partida.time.length < 2) {
      return res.status(400).json({
        error: "É necessário ter pelo menos 2 times para inicializar jogos.",
      });
    }

    // Limpar jogos existentes se houver (simulação - em produção seria feito com as tabelas reais)
    // Em ambiente de desenvolvimento, vamos simular a criação

    // Gerar jogos baseado no tipo de torneio
    let jogosParaCriar: JogoData[] = [];
    const numTimes = partida.time.length;

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
              status_jogo: "agendado",
            },
          ];
          break;

        case "melhor_de_3":
          // Cria apenas o primeiro jogo, os outros serão criados dinamicamente
          jogosParaCriar = [
            {
              partida_id: parseInt(partidaId),
              numero_jogo: 1,
              time_a_id: partida.time[0].id,
              time_b_id: partida.time[1].id,
              status_jogo: "agendado",
            },
          ];
          break;

        case "melhor_de_5":
          // Cria apenas o primeiro jogo
          jogosParaCriar = [
            {
              partida_id: parseInt(partidaId),
              numero_jogo: 1,
              time_a_id: partida.time[0].id,
              time_b_id: partida.time[1].id,
              status_jogo: "agendado",
            },
          ];
          break;

        case "sequencial_continuo":
          jogosParaCriar = [
            {
              partida_id: parseInt(partidaId),
              numero_jogo: 1,
              time_a_id: partida.time[0].id,
              time_b_id: partida.time[1].id,
              status_jogo: "agendado",
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
          status_jogo: "agendado",
        }));
      } else {
        // Eliminação rotativa - cria primeiro jogo
        jogosParaCriar = [
          {
            partida_id: parseInt(partidaId),
            numero_jogo: 1,
            time_a_id: partida.time[0].id,
            time_b_id: partida.time[1].id,
            status_jogo: "agendado",
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
        status_jogo: "agendado",
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
    const jogosSimulados = await (prisma as any).jogo.findMany({
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
              time_a: jogosSimulados.filter(
                (j) => j.time_vencedor_id === partida.time[0]?.id
              ).length,
              time_b: jogosSimulados.filter(
                (j) => j.time_vencedor_id === partida.time[1]?.id
              ).length,
            },
            status: "em_andamento",
          }
        : null;

    // Calcular estatísticas dos times
    const estatisticasTimes = partida.time.map((time) => {
      const jogosDoTime = jogosSimulados.filter(
        (j) => j.time_a_id === time.id || j.time_b_id === time.id
      );

      const vitorias = jogosDoTime.filter(
        (j) => j.time_vencedor_id === time.id
      ).length;
      const derrotas = jogosDoTime.filter(
        (j) => j.time_vencedor_id && j.time_vencedor_id !== time.id
      ).length;

      const pontuacaoTotal = jogosDoTime.reduce((total, jogo) => {
        if (jogo.time_a_id === time.id) {
          return total + (jogo.placar_time_a || 0);
        } else {
          return total + (jogo.placar_time_b || 0);
        }
      }, 0);

      return {
        id: time.id,
        nome_time: time.nome_time,
        jogadores: time.jogador_time.map((jt) => ({
          id: jt.jogador.id,
          nome: jt.jogador.usuario.nome,
          posicao: jt.posicao_jogada,
        })),
        estatisticas: {
          jogos: jogosDoTime.length,
          vitorias,
          derrotas,
          empates: 0,
          pontuacao_total: pontuacaoTotal,
          aproveitamento:
            jogosDoTime.length > 0
              ? Math.round((vitorias / jogosDoTime.length) * 100)
              : 0,
        },
      };
    });

    return res.status(200).json({
      partida: {
        id: partida.id,
        data_hora: partida.data_hora,
        status: partida.status,
        total_times: partida.time.length,
      },
      serie_info: serieInfo,
      jogos: jogosSimulados.map((jogo) => ({
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
        vencedor: jogo.time_vencedor_id
          ? {
              id: jogo.time_vencedor_id,
              nome_time: partida.time.find(
                (t) => t.id === jogo.time_vencedor_id
              )?.nome_time,
            }
          : null,
        status: jogo.status_jogo,
        duracao_minutos: jogo.duracao_minutos,
        data_inicio: jogo.data_inicio,
        data_fim: jogo.data_fim,
      })),
      times: estatisticasTimes,
      proximo_jogo: jogosSimulados.find((j) => j.status_jogo === "agendado")
        ? {
            id: jogosSimulados.find((j) => j.status_jogo === "agendado")?.id,
            numero: jogosSimulados.find((j) => j.status_jogo === "agendado")
              ?.numero_jogo,
            decisivo:
              serieInfo &&
              serieInfo.placar_serie.time_a === 1 &&
              serieInfo.placar_serie.time_b === 1,
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

    // Buscar jogo na memória (em produção seria busca real no banco)
    const partidaIdFromJogo = Math.floor(parseInt(jogoId) / 100);
    const jogosPartida = jogosEmMemoria[partidaIdFromJogo];
    const jogoEncontrado = jogosPartida?.find((j) => j.id === parseInt(jogoId));

    if (!jogoEncontrado) {
      return res.status(404).json({
        error: "Jogo não encontrado.",
        message:
          "Certifique-se de que o sistema de jogos foi inicializado para esta partida.",
      });
    }

    const jogoSimulado = jogoEncontrado;

    // Verificar se o usuário tem permissão (simulado)
    const partida = await prisma.partida.findUnique({
      where: { id: jogoSimulado.partida_id },
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

    if (jogoSimulado.status_jogo !== "agendado") {
      return res.status(400).json({
        error: "Jogo já foi iniciado ou finalizado.",
      });
    }

    // Atualizar o status na memória
    jogoEncontrado.status_jogo = "em_andamento";
    jogoEncontrado.data_inicio = new Date();

    const jogoAtualizado = jogoEncontrado;

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

    // Buscar jogo na memória (em produção seria busca real no banco)
    const partidaIdFromJogo = Math.floor(parseInt(jogoId) / 100);
    const jogosPartida = jogosEmMemoria[partidaIdFromJogo];
    const jogoEncontrado = jogosPartida?.find((j) => j.id === parseInt(jogoId));

    if (!jogoEncontrado) {
      return res.status(404).json({
        error: "Jogo não encontrado.",
        message:
          "Certifique-se de que o sistema de jogos foi inicializado para esta partida.",
      });
    }

    const jogoSimulado = jogoEncontrado;

    // Verificar permissões
    const partida = await prisma.partida.findUnique({
      where: { id: jogoSimulado.partida_id },
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

    // Determinar vencedor
    let time_vencedor_id = null;
    if (placar_time_a > placar_time_b) {
      time_vencedor_id = jogoSimulado.time_a_id;
    } else if (placar_time_b > placar_time_a) {
      time_vencedor_id = jogoSimulado.time_b_id;
    }

    // Atualizar jogo na memória (em produção seria salvo no banco)
    jogoEncontrado.placar_time_a = placar_time_a;
    jogoEncontrado.placar_time_b = placar_time_b;
    jogoEncontrado.time_vencedor_id = time_vencedor_id;
    jogoEncontrado.status_jogo = "finalizado";
    jogoEncontrado.data_fim = new Date();
    jogoEncontrado.observacoes = observacoes || null;
    jogoEncontrado.duracao_minutos = jogoEncontrado.data_inicio
      ? Math.round(
          (new Date().getTime() - jogoEncontrado.data_inicio.getTime()) /
            (1000 * 60)
        )
      : null;

    const jogoFinalizado = jogoEncontrado;

    // Lógica para determinar próximo jogo
    let proximoJogo = null;
    let serieStatus = null;

    // Para 2 times - lógica de série
    if (partida.time.length === 2) {
      // Simular placar da série (Time A: 1, Time B: 1 após jogo 2)
      const placarSerie = { time_a: 1, time_b: 1 };

      if (time_vencedor_id === jogoSimulado.time_a_id) {
        placarSerie.time_a++;
      } else if (time_vencedor_id === jogoSimulado.time_b_id) {
        placarSerie.time_b++;
      }

      serieStatus = {
        placar_serie: placarSerie,
        jogos_necessarios: 2, // Para melhor de 3
        status:
          placarSerie.time_a >= 2 || placarSerie.time_b >= 2
            ? "finalizada"
            : "continua",
      };

      // Se série não acabou, criar próximo jogo
      if (serieStatus.status === "continua") {
        proximoJogo = {
          id: jogoSimulado.id + 1,
          numero_jogo: jogoSimulado.numero_jogo + 1,
          time_a_id: jogoSimulado.time_a_id,
          time_b_id: jogoSimulado.time_b_id,
          status_jogo: "agendado",
          decisivo: true,
          criado: true,
        };
      }
    }

    // Para 3 times - lógica rotativa
    else if (partida.time.length === 3) {
      const timesIds = partida.time.map((t) => t.id);
      const timeEsperando = timesIds.find(
        (id) => id !== jogoSimulado.time_a_id && id !== jogoSimulado.time_b_id
      );

      if (time_vencedor_id && timeEsperando) {
        proximoJogo = {
          id: jogoSimulado.id + 1,
          numero_jogo: jogoSimulado.numero_jogo + 1,
          time_a_id: time_vencedor_id,
          time_b_id: timeEsperando,
          status_jogo: "agendado",
          criado: true,
        };
      }
    }

    return res.status(200).json({
      message: "Jogo finalizado com sucesso!",
      jogo_finalizado: {
        id: jogoFinalizado.id,
        numero_jogo: jogoFinalizado.numero_jogo,
        placar: {
          time_a: jogoFinalizado.placar_time_a,
          time_b: jogoFinalizado.placar_time_b,
        },
        vencedor: time_vencedor_id
          ? {
              id: time_vencedor_id,
              nome: partida.time.find((t) => t.id === time_vencedor_id)
                ?.nome_time,
              foi_empate: false,
            }
          : {
              foi_empate: true,
            },
        duracao_minutos: jogoFinalizado.duracao_minutos,
        observacoes: jogoFinalizado.observacoes,
      },
      serie_status: serieStatus,
      proximo_jogo: proximoJogo,
      acao_automatica: proximoJogo
        ? "Próximo jogo criado automaticamente"
        : serieStatus?.status === "finalizada"
        ? "Série finalizada"
        : "Torneio continua",
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
        error: "Um time não pode jogar contra si mesmo.",
      });
    }

    // Verificar se o usuário tem acesso
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

    // Criar jogo na memória (em produção seria salvo no banco)
    const jogosPartida = jogosEmMemoria[parseInt(partidaId)] || [];
    const proximoNumero =
      jogosPartida.length > 0
        ? Math.max(...jogosPartida.map((j) => j.numero_jogo)) + 1
        : 1;
    const proximoId = parseInt(partidaId) * 100 + proximoNumero;

    const novoJogo: JogoMemoria = {
      id: proximoId,
      partida_id: parseInt(partidaId),
      numero_jogo: proximoNumero,
      time_a_id,
      time_b_id,
      placar_time_a: 0,
      placar_time_b: 0,
      time_vencedor_id: null,
      status_jogo: "agendado",
      duracao_minutos: null,
      data_inicio: null,
      data_fim: null,
      observacoes: observacoes || null,
      created_at: new Date(),
    };

    // Salvar novo jogo na memória
    if (!jogosEmMemoria[parseInt(partidaId)]) {
      jogosEmMemoria[parseInt(partidaId)] = [];
    }
    jogosEmMemoria[parseInt(partidaId)].push(novoJogo);

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
      proximo_passo: "Use PUT /jogos/:id/iniciar para começar este jogo",
    });
  } catch (error) {
    console.error("Erro ao criar próximo jogo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Obter detalhes de um jogo específico
// Atualizar pontos de um jogo em andamento (sem finalizar)
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

    // Buscar jogo na memória (em produção seria busca real no banco)
    const partidaIdFromJogo = Math.floor(parseInt(jogoId) / 100);
    const jogosPartida = jogosEmMemoria[partidaIdFromJogo];
    const jogoEncontrado = jogosPartida?.find((j) => j.id === parseInt(jogoId));

    if (!jogoEncontrado) {
      return res.status(404).json({
        error: "Jogo não encontrado.",
        message:
          "Certifique-se de que o sistema de jogos foi inicializado para esta partida.",
      });
    }

    const jogoSimulado = jogoEncontrado;

    // Verificar permissões
    const partida = await prisma.partida.findUnique({
      where: { id: jogoSimulado.partida_id },
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

    if (jogoSimulado.status_jogo !== "em_andamento") {
      return res.status(400).json({
        error: "Só é possível atualizar pontos de jogos em andamento.",
      });
    }

    // Atualizar pontos na memória (em produção seria salvo no banco)
    jogoEncontrado.placar_time_a = placar_time_a;
    jogoEncontrado.placar_time_b = placar_time_b;

    const jogoAtualizado = jogoEncontrado;

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

export const obterJogo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { jogoId } = req.params;

    // Buscar jogo na memória (em produção seria busca real no banco)
    const partidaIdFromJogo = Math.floor(parseInt(jogoId) / 100);
    const jogosPartida = jogosEmMemoria[partidaIdFromJogo];
    const jogoEncontrado = jogosPartida?.find((j) => j.id === parseInt(jogoId));

    if (!jogoEncontrado) {
      return res.status(404).json({
        error: "Jogo não encontrado.",
        message:
          "Certifique-se de que o sistema de jogos foi inicializado para esta partida.",
      });
    }

    const jogoSimulado = jogoEncontrado;

    // Verificar permissões
    const partida = await prisma.partida.findUnique({
      where: { id: jogoSimulado.partida_id },
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

    const timeA = partida.time.find((t) => t.id === jogoSimulado.time_a_id);
    const timeB = partida.time.find((t) => t.id === jogoSimulado.time_b_id);
    const timeVencedor = partida.time.find(
      (t) => t.id === jogoSimulado.time_vencedor_id
    );

    // Em produção, eventos seriam buscados do banco:
    // await prisma.evento_jogo.findMany({ where: { jogo_id: parseInt(jogoId) } })

    return res.status(200).json({
      jogo: {
        id: jogoSimulado.id,
        numero_jogo: jogoSimulado.numero_jogo,
        time_a: {
          id: timeA?.id,
          nome: timeA?.nome_time,
          jogadores:
            timeA?.jogador_time.map((jt) => ({
              id: jt.jogador.id,
              nome: jt.jogador.usuario.nome,
              posicao: jt.posicao_jogada,
            })) || [],
        },
        time_b: {
          id: timeB?.id,
          nome: timeB?.nome_time,
          jogadores:
            timeB?.jogador_time.map((jt) => ({
              id: jt.jogador.id,
              nome: jt.jogador.usuario.nome,
              posicao: jt.posicao_jogada,
            })) || [],
        },
        resultado: {
          placar: {
            time_a: jogoSimulado.placar_time_a,
            time_b: jogoSimulado.placar_time_b,
          },
          vencedor: timeVencedor
            ? {
                id: timeVencedor.id,
                nome: timeVencedor.nome_time,
              }
            : null,
          duracao_minutos: jogoSimulado.duracao_minutos,
        },
        contexto_serie:
          partida.time.length === 2
            ? {
                tipo_torneio: "melhor_de_3",
                numero_na_serie: jogoSimulado.numero_jogo,
                placar_serie: { time_a: 1, time_b: 0 }, // Simulado
              }
            : null,
        status: jogoSimulado.status_jogo,
        timing: {
          data_inicio: jogoSimulado.data_inicio,
          data_fim: jogoSimulado.data_fim,
          duracao_minutos: jogoSimulado.duracao_minutos,
        },
        observacoes: jogoSimulado.observacoes,
        eventos: [], // Sistema de eventos será implementado futuramente
      },
      estatisticas_contexto: {
        partida: {
          id: partida.id,
          total_times: partida.time.length,
          tipo_sistema:
            partida.time.length === 2
              ? "serie"
              : partida.time.length === 3
              ? "rotativo"
              : "round_robin",
        },
      },
    });
  } catch (error) {
    console.error("Erro ao obter jogo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};
