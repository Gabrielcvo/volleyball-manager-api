import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../types/auth";

const prisma = new PrismaClient();

// Criar nova partida
export const criarPartida = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { grupoId } = req.params;
    const {
      data_hora,
      local,
      duracao_estimada_minutos,
      limite_jogadores,
      valor_pelada,
    } = req.body;

    if (!data_hora) {
      return res.status(400).json({ error: "Data e hora são obrigatórias." });
    }

    // Verificar se o usuário é admin do grupo
    const membroAdmin = await prisma.membro_grupo.findFirst({
      where: {
        grupo_id: parseInt(grupoId),
        jogador_id: req.user.id,
        status: "ativo",
        papel: "admin",
      },
    });

    if (!membroAdmin) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem criar partidas." });
    }

    const partida = await prisma.partida.create({
      data: {
        grupo_id: parseInt(grupoId),
        data_hora: new Date(data_hora),
        local: local || null,
        duracao_estimada_minutos: duracao_estimada_minutos || 120,
        limite_jogadores: limite_jogadores || 12,
        valor_pelada: valor_pelada || 0,
        status: "agendada",
      },
    });

    return res.status(201).json({
      message: "Partida criada com sucesso!",
      partida,
    });
  } catch (error) {
    console.error("Erro ao criar partida:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Listar partidas do grupo
export const listarPartidas = async (
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

    const partidas = await prisma.partida.findMany({
      where: {
        grupo_id: parseInt(grupoId),
      },
      orderBy: {
        data_hora: "desc",
      },
    });

    // Buscar confirmações para cada partida
    const partidasComConfirmacoes = await Promise.all(
      partidas.map(async (partida) => {
        const confirmados = await prisma.confirmacao_presenca.count({
          where: {
            partida_id: partida.id,
            status_presenca: "confirmado",
          },
        });

        const minhaConfirmacao = await prisma.confirmacao_presenca.findUnique({
          where: {
            partida_id_jogador_id: {
              partida_id: partida.id,
              jogador_id: req.user!.id,
            },
          },
        });

        return {
          ...partida,
          confirmados,
          minha_confirmacao:
            minhaConfirmacao?.status_presenca || "nao_confirmado",
        };
      })
    );

    return res.status(200).json({
      partidas: partidasComConfirmacoes,
    });
  } catch (error) {
    console.error("Erro ao listar partidas:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Confirmar presença na partida
export const confirmarPresenca = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { partidaId } = req.params;
    const { status_presenca } = req.body;

    if (!["confirmado", "nao_confirmado"].includes(status_presenca)) {
      return res.status(400).json({ error: "Status de presença inválido." });
    }

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

    // Verificar se a partida ainda não aconteceu
    if (partida.data_hora < new Date()) {
      return res.status(400).json({
        error: "Não é possível confirmar presença em partida já realizada.",
      });
    }

    // Verificar limite de jogadores se confirmando
    if (status_presenca === "confirmado" && partida.limite_jogadores) {
      const confirmados = await prisma.confirmacao_presenca.count({
        where: {
          partida_id: parseInt(partidaId),
          status_presenca: "confirmado",
        },
      });

      if (confirmados >= partida.limite_jogadores) {
        // Adicionar à fila de espera
        await prisma.confirmacao_presenca.upsert({
          where: {
            partida_id_jogador_id: {
              partida_id: parseInt(partidaId),
              jogador_id: req.user.id,
            },
          },
          update: {
            status_presenca: "fila_espera",
            data_confirmacao: new Date(),
          },
          create: {
            partida_id: parseInt(partidaId),
            jogador_id: req.user.id,
            status_presenca: "fila_espera",
            data_confirmacao: new Date(),
          },
        });

        return res.status(200).json({
          message: "Partida lotada. Você foi adicionado à fila de espera!",
          status_presenca: "fila_espera",
        });
      }
    }

    const confirmacao = await prisma.confirmacao_presenca.upsert({
      where: {
        partida_id_jogador_id: {
          partida_id: parseInt(partidaId),
          jogador_id: req.user.id,
        },
      },
      update: {
        status_presenca: status_presenca as "confirmado" | "nao_confirmado",
        data_confirmacao: new Date(),
      },
      create: {
        partida_id: parseInt(partidaId),
        jogador_id: req.user.id,
        status_presenca: status_presenca as "confirmado" | "nao_confirmado",
        data_confirmacao: new Date(),
      },
    });

    // Se alguém cancelou, mover da fila de espera
    if (status_presenca === "nao_confirmado") {
      const filaEspera = await prisma.confirmacao_presenca.findFirst({
        where: {
          partida_id: parseInt(partidaId),
          status_presenca: "fila_espera",
        },
        orderBy: {
          data_confirmacao: "asc",
        },
      });

      if (filaEspera) {
        await prisma.confirmacao_presenca.update({
          where: {
            partida_id_jogador_id: {
              partida_id: filaEspera.partida_id,
              jogador_id: filaEspera.jogador_id,
            },
          },
          data: {
            status_presenca: "confirmado",
          },
        });
      }
    }

    return res.status(200).json({
      message: "Presença atualizada com sucesso!",
      confirmacao: {
        status_presenca: confirmacao.status_presenca,
        data_confirmacao: confirmacao.data_confirmacao,
      },
    });
  } catch (error) {
    console.error("Erro ao confirmar presença:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Listar confirmações de presença da partida
export const listarConfirmacoes = async (
  req: AuthenticatedRequest,
  res: Response
) => {
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

    const confirmacoes = await prisma.confirmacao_presenca.findMany({
      where: {
        partida_id: parseInt(partidaId),
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
      orderBy: {
        data_confirmacao: "asc",
      },
    });

    const naoComparecer = confirmacoes.filter(
      (c) => c.status_presenca === "nao_confirmado"
    );

    const confirmados = confirmacoes.filter(
      (c) => c.status_presenca === "confirmado"
    );
    const filaEspera = confirmacoes.filter(
      (c) => c.status_presenca === "fila_espera"
    );

    return res.status(200).json({
      partida: {
        id: partida.id,
        data_hora: partida.data_hora,
        local: partida.local,
        limite_jogadores: partida.limite_jogadores,
        status: partida.status,
      },

      naoComparecer: naoComparecer.map((c) => ({
        jogador: {
          id: c.jogador.id,
          nome: c.jogador.usuario.nome,
        },
      })),

      confirmados: confirmados.map((c) => ({
        jogador: {
          id: c.jogador.id,
          nome: c.jogador.usuario.nome,
          posicao_preferida: c.jogador.posicao_preferida,
          overall: c.jogador.overall,
          avatar_url: c.jogador.avatar_url,
        },
        data_confirmacao: c.data_confirmacao,
      })),
      fila_espera: filaEspera.map((c) => ({
        jogador: {
          id: c.jogador.id,
          nome: c.jogador.usuario.nome,
          posicao_preferida: c.jogador.posicao_preferida,
          overall: c.jogador.overall,
          avatar_url: c.jogador.avatar_url,
        },
        data_confirmacao: c.data_confirmacao,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar confirmações:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Atualizar partida
export const atualizarPartida = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { partidaId } = req.params;
    const {
      data_hora,
      local,
      duracao_estimada_minutos,
      limite_jogadores,
      valor_pelada,
      status,
    } = req.body;

    // Verificar se a partida existe e se o usuário é admin
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
      },
    });

    if (!partida) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    if (partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem atualizar partidas." });
    }

    const dadosAtualizacao: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (data_hora) dadosAtualizacao.data_hora = new Date(data_hora);
    if (local !== undefined) dadosAtualizacao.local = local;
    if (duracao_estimada_minutos)
      dadosAtualizacao.duracao_estimada_minutos = duracao_estimada_minutos;
    if (limite_jogadores) dadosAtualizacao.limite_jogadores = limite_jogadores;
    if (valor_pelada !== undefined)
      dadosAtualizacao.valor_pelada = valor_pelada;
    if (status) dadosAtualizacao.status = status;

    const partidaAtualizada = await prisma.partida.update({
      where: { id: parseInt(partidaId) },
      data: dadosAtualizacao,
    });

    return res.status(200).json({
      message: "Partida atualizada com sucesso!",
      partida: partidaAtualizada,
    });
  } catch (error) {
    console.error("Erro ao atualizar partida:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Cancelar partida
export const cancelarPartida = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { partidaId } = req.params;

    // Verificar se a partida existe e se o usuário é admin
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
      },
    });

    if (!partida) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    if (partida.grupo.membro_grupo.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas administradores podem cancelar partidas." });
    }

    await prisma.partida.update({
      where: { id: parseInt(partidaId) },
      data: {
        status: "cancelada",
        updated_at: new Date(),
      },
    });

    return res.status(200).json({
      message: "Partida cancelada com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao cancelar partida:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Obter detalhes da partida
export const obterPartida = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { partidaId } = req.params;

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
        confirmacao_presenca: {
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

    return res.status(200).json({
      partida: {
        id: partida.id,
        data_hora: partida.data_hora,
        local: partida.local,
        duracao_estimada_minutos: partida.duracao_estimada_minutos,
        limite_jogadores: partida.limite_jogadores,
        valor_pelada: partida.valor_pelada,
        status: partida.status,
        grupo: {
          id: partida.grupo.id,
          nome: partida.grupo.nome,
          meu_papel: partida.grupo.membro_grupo[0].papel,
        },
        confirmacoes: partida.confirmacao_presenca,
        times: partida.time,
        created_at: partida.created_at,
        updated_at: partida.updated_at,
      },
    });
  } catch (error) {
    console.error("Erro ao obter partida:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};
