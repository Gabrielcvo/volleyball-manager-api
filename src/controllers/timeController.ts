import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../types/auth";

const prisma = new PrismaClient();

interface JogadorSorteio {
  id: number;
  nome: string;
  posicao_preferida: string | null;
  overall: number;
  avatar_url: string | null;
}

// Algoritmo para balancear times por overall
function balancearTimes(
  jogadores: JogadorSorteio[],
  numTimes: number = 2
): JogadorSorteio[][] {
  // Ordenar jogadores por overall (do maior para o menor)
  const jogadoresOrdenados = [...jogadores].sort(
    (a, b) => (b.overall || 0) - (a.overall || 0)
  );

  // Inicializar times vazios
  const times: JogadorSorteio[][] = Array.from({ length: numTimes }, () => []);
  const somaOverallTimes: number[] = Array(numTimes).fill(0);

  // Distribuir jogadores de forma balanceada
  for (const jogador of jogadoresOrdenados) {
    // Encontrar o time com menor soma de overall
    const timeComMenorSoma = somaOverallTimes.indexOf(
      Math.min(...somaOverallTimes)
    );

    // Adicionar jogador ao time
    times[timeComMenorSoma].push(jogador);
    somaOverallTimes[timeComMenorSoma] += jogador.overall || 0;
  }

  return times;
}

// Algoritmo para balancear por posição
function balancearPorPosicao(
  jogadores: JogadorSorteio[],
  numTimes: number = 2
): JogadorSorteio[][] {
  // Agrupar jogadores por posição
  const jogadoresPorPosicao: { [posicao: string]: JogadorSorteio[] } = {};

  jogadores.forEach((jogador) => {
    const posicao = jogador.posicao_preferida || "universal";
    if (!jogadoresPorPosicao[posicao]) {
      jogadoresPorPosicao[posicao] = [];
    }
    jogadoresPorPosicao[posicao].push(jogador);
  });

  // Ordenar cada posição por overall
  Object.keys(jogadoresPorPosicao).forEach((posicao) => {
    jogadoresPorPosicao[posicao].sort(
      (a, b) => (b.overall || 0) - (a.overall || 0)
    );
  });

  // Inicializar times
  const times: JogadorSorteio[][] = Array.from({ length: numTimes }, () => []);

  // Distribuir jogadores por posição de forma alternada
  Object.values(jogadoresPorPosicao).forEach((jogadoresPosicao) => {
    jogadoresPosicao.forEach((jogador, index) => {
      const timeIndex = index % numTimes;
      times[timeIndex].push(jogador);
    });
  });

  return times;
}

// Sortear times para uma partida
export const sortearTimes = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { partidaId } = req.params;
    const {
      metodo = "overall",
      num_times = 2,
      jogadores_selecionados,
    } = req.body;

    // Verificar se a partida existe e se o usuário tem acesso
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

    if (!partida) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    if (partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem sortear times." });
    }

    // Se já existem times, limpar antes de sortear novos
    if (partida.time.length > 0) {
      await prisma.jogador_time.deleteMany({
        where: {
          time_id: { in: partida.time.map((t) => t.id) },
        },
      });

      await prisma.time.deleteMany({
        where: {
          partida_id: parseInt(partidaId),
        },
      });
    }

    // Buscar jogadores confirmados para a partida
    let jogadoresQuery;

    if (jogadores_selecionados && Array.isArray(jogadores_selecionados)) {
      // Usar jogadores específicos selecionados pelo admin
      jogadoresQuery = await prisma.jogador.findMany({
        where: {
          id: { in: jogadores_selecionados },
        },
        include: {
          usuario: {
            select: { id: true, nome: true },
          },
        },
      });
    } else {
      // Usar todos os jogadores confirmados
      const confirmacoes = await prisma.confirmacao_presenca.findMany({
        where: {
          partida_id: parseInt(partidaId),
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
      });

      jogadoresQuery = confirmacoes.map((conf) => conf.jogador);
    }

    if (jogadoresQuery.length < num_times) {
      return res.status(400).json({
        error: `Número insuficiente de jogadores. Mínimo: ${num_times}, atual: ${jogadoresQuery.length}`,
      });
    }

    // Preparar dados dos jogadores para o sorteio
    const jogadores: JogadorSorteio[] = jogadoresQuery.map((jogador) => ({
      id: jogador.id,
      nome: jogador.usuario.nome,
      posicao_preferida: jogador.posicao_preferida,
      overall: Number(jogador.overall) || 0,
      avatar_url: jogador.avatar_url,
    }));

    // Realizar sorteio baseado no método escolhido
    let timesBalanceados: JogadorSorteio[][];

    switch (metodo) {
      case "posicao":
        timesBalanceados = balancearPorPosicao(jogadores, num_times);
        break;
      case "aleatorio": {
        // Embaralhar jogadores aleatoriamente e distribuir
        const jogadoresEmbaralhados = [...jogadores].sort(
          () => Math.random() - 0.5
        );
        timesBalanceados = Array.from({ length: num_times }, (_, index) =>
          jogadoresEmbaralhados.filter((_, i) => i % num_times === index)
        );
        break;
      }
      case "overall":
      default:
        timesBalanceados = balancearTimes(jogadores, num_times);
        break;
    }

    // Salvar times no banco de dados
    const timesCriados = [];

    for (let i = 0; i < timesBalanceados.length; i++) {
      const jogadoresTime = timesBalanceados[i];

      if (jogadoresTime.length === 0) continue;

      // Criar time
      const time = await prisma.time.create({
        data: {
          partida_id: parseInt(partidaId),
          nome_time: `Time ${String.fromCharCode(65 + i)}`, // Time A, B, C...
          pontuacao_final: 0,
        },
      });

      // Adicionar jogadores ao time
      const jogadorTimePromises = jogadoresTime.map((jogador) =>
        prisma.jogador_time.create({
          data: {
            time_id: time.id,
            jogador_id: jogador.id,
            posicao_jogada: jogador.posicao_preferida,
          },
        })
      );

      await Promise.all(jogadorTimePromises);

      // Calcular estatísticas do time
      const overallMedio =
        jogadoresTime.reduce((acc, j) => acc + j.overall, 0) /
        jogadoresTime.length;

      timesCriados.push({
        id: time.id,
        nome_time: time.nome_time,
        overall_medio: Math.round(overallMedio * 100) / 100,
        total_jogadores: jogadoresTime.length,
        jogadores: jogadoresTime,
      });
    }

    return res.status(201).json({
      message: "Times sorteados com sucesso!",
      metodo_sorteio: metodo,
      total_jogadores: jogadores.length,
      times: timesCriados,
    });
  } catch (error) {
    console.error("Erro ao sortear times:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Listar times da partida
export const listarTimes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { partidaId } = req.params;

    // Verificar se o usuário tem acesso à partida
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
      },
    });

    if (!partida) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    if (partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Você não tem acesso a esta partida." });
    }

    // Buscar times da partida
    const times = await prisma.time.findMany({
      where: {
        partida_id: parseInt(partidaId),
      },
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
      orderBy: {
        nome_time: "asc",
      },
    });

    const timesFormatados = times.map((time) => {
      const jogadores = time.jogador_time.map((jt) => ({
        id: jt.jogador.id,
        nome: jt.jogador.usuario.nome,
        posicao_preferida: jt.jogador.posicao_preferida,
        posicao_jogada: jt.posicao_jogada,
        overall: Number(jt.jogador.overall) || 0,
        avatar_url: jt.jogador.avatar_url,
      }));

      const overallMedio =
        jogadores.length > 0
          ? jogadores.reduce((acc, j) => acc + j.overall, 0) / jogadores.length
          : 0;

      return {
        id: time.id,
        nome_time: time.nome_time,
        pontuacao_final: time.pontuacao_final,
        overall_medio: Math.round(overallMedio * 100) / 100,
        total_jogadores: jogadores.length,
        jogadores,
      };
    });

    return res.status(200).json({
      partida: {
        id: partida.id,
        data_hora: partida.data_hora,
        status: partida.status,
      },
      times: timesFormatados,
    });
  } catch (error) {
    console.error("Erro ao listar times:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Editar time manualmente
export const editarTime = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { timeId } = req.params;
    const { nome_time, jogadores } = req.body;

    // Verificar se o time existe e se o usuário tem acesso
    const time = await prisma.time.findUnique({
      where: { id: parseInt(timeId) },
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
      },
    });

    if (!time) {
      return res.status(404).json({ error: "Time não encontrado." });
    }

    if (time.partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem editar times." });
    }

    // Atualizar nome do time se fornecido
    if (nome_time) {
      await prisma.time.update({
        where: { id: parseInt(timeId) },
        data: { nome_time },
      });
    }

    // Atualizar jogadores se fornecido
    if (jogadores && Array.isArray(jogadores)) {
      // Remover jogadores atuais
      await prisma.jogador_time.deleteMany({
        where: { time_id: parseInt(timeId) },
      });

      // Adicionar novos jogadores
      const jogadorTimePromises = jogadores.map(
        (jogadorData: { jogador_id: number; posicao_jogada?: string }) =>
          prisma.jogador_time.create({
            data: {
              time_id: parseInt(timeId),
              jogador_id: jogadorData.jogador_id,
              posicao_jogada: jogadorData.posicao_jogada || null,
            },
          })
      );

      await Promise.all(jogadorTimePromises);
    }

    // Buscar time atualizado
    const timeAtualizado = await prisma.time.findUnique({
      where: { id: parseInt(timeId) },
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
    });

    return res.status(200).json({
      message: "Time atualizado com sucesso!",
      time: timeAtualizado,
    });
  } catch (error) {
    console.error("Erro ao editar time:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Atualizar pontuação do time
export const atualizarPontuacao = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { timeId } = req.params;
    const { pontuacao } = req.body;

    if (typeof pontuacao !== "number" || pontuacao < 0) {
      return res
        .status(400)
        .json({ error: "Pontuação deve ser um número não negativo." });
    }

    // Verificar se o time existe e se o usuário tem acesso
    const time = await prisma.time.findUnique({
      where: { id: parseInt(timeId) },
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
      },
    });

    if (!time) {
      return res.status(404).json({ error: "Time não encontrado." });
    }

    if (time.partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem atualizar pontuações." });
    }

    // Atualizar pontuação
    const timeAtualizado = await prisma.time.update({
      where: { id: parseInt(timeId) },
      data: { pontuacao_final: pontuacao },
    });

    return res.status(200).json({
      message: "Pontuação atualizada com sucesso!",
      time: timeAtualizado,
    });
  } catch (error) {
    console.error("Erro ao atualizar pontuação:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};
