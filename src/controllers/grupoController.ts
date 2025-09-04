import { Response } from "express";
import prisma from "../config/database";
import { AuthenticatedRequest } from "../types/auth";

// Criar novo grupo
export const criarGrupo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { nome, descricao, localizacao, regras } = req.body;

    if (!nome) {
      return res.status(400).json({ error: "Nome do grupo é obrigatório." });
    }

    const grupo = await prisma.grupo.create({
      data: {
        nome,
        descricao: descricao || null,
        localizacao: localizacao || null,
        regras: regras || null,
        administrador_id: req.user.id,
      },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true },
        },
      },
    });

    // Adicionar o criador como membro ativo do grupo
    await prisma.membro_grupo.create({
      data: {
        grupo_id: grupo.id,
        jogador_id: req.user.id,
        status: "ativo",
        papel: "admin",
      },
    });

    // Criar caixa do grupo
    await prisma.caixa_grupo.create({
      data: {
        grupo_id: grupo.id,
        saldo_atual: 0,
      },
    });

    return res.status(201).json({
      message: "Grupo criado com sucesso!",
      grupo,
    });
  } catch (error) {
    console.error("Erro ao criar grupo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Listar grupos do usuário
export const listarGrupos = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const grupos = await prisma.membro_grupo.findMany({
      where: {
        jogador_id: req.user.id,
        status: "ativo",
      },
      include: {
        grupo: {
          include: {
            usuario: {
              select: { id: true, nome: true, email: true },
            },
            _count: {
              select: { membro_grupo: true, partida: true },
            },
          },
        },
      },
    });

    const gruposFormatados = grupos.map((membro) => ({
      id: membro.grupo.id,
      nome: membro.grupo.nome,
      descricao: membro.grupo.descricao,
      localizacao: membro.grupo.localizacao,
      administrador: membro.grupo.usuario,
      data_criacao: membro.grupo.data_criacao,
      papel: membro.papel,
      total_membros: membro.grupo._count.membro_grupo,
      total_partidas: membro.grupo._count.partida,
    }));

    return res.status(200).json({
      grupos: gruposFormatados,
    });
  } catch (error) {
    console.error("Erro ao listar grupos:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Adicionar jogador ao grupo
export const adicionarJogador = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { grupoId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email do jogador é obrigatório." });
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
        .json({ error: "Apenas administradores podem adicionar jogadores." });
    }

    // Buscar o jogador pelo email
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { jogador: true },
    });

    if (!usuario || !usuario.jogador) {
      return res.status(404).json({ error: "Jogador não encontrado." });
    }

    // Verificar se o jogador já está no grupo
    const membroExistente = await prisma.membro_grupo.findFirst({
      where: {
        grupo_id: parseInt(grupoId),
        jogador_id: usuario.id,
      },
    });

    if (membroExistente) {
      return res.status(409).json({ error: "Jogador já está no grupo." });
    }

    // Adicionar jogador ao grupo
    const novoMembro = await prisma.membro_grupo.create({
      data: {
        grupo_id: parseInt(grupoId),
        jogador_id: usuario.id,
        status: "ativo",
        papel: "membro",
      },
      include: {
        jogador: {
          include: {
            usuario: {
              select: { id: true, nome: true, email: true },
            },
          },
        },
      },
    });

    // Criar carteira do jogador no grupo
    await prisma.carteira_jogador.create({
      data: {
        jogador_id: usuario.id,
        grupo_id: parseInt(grupoId),
        saldo_devedor: 0,
      },
    });

    return res.status(201).json({
      message: "Jogador adicionado ao grupo com sucesso!",
      membro: {
        id: novoMembro.jogador.id,
        nome: novoMembro.jogador.usuario.nome,
        email: novoMembro.jogador.usuario.email,
        papel: novoMembro.papel,
        data_entrada: novoMembro.data_entrada,
      },
    });
  } catch (error) {
    console.error("Erro ao adicionar jogador:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Listar membros do grupo
export const listarMembros = async (
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

    const membros = await prisma.membro_grupo.findMany({
      where: {
        grupo_id: parseInt(grupoId),
        status: "ativo",
      },
      include: {
        jogador: {
          include: {
            usuario: {
              select: { id: true, nome: true, email: true },
            },
          },
        },
      },
      orderBy: {
        data_entrada: "asc",
      },
    });

    const membrosFormatados = membros.map((membro) => ({
      id: membro.jogador.id,
      nome: membro.jogador.usuario.nome,
      email: membro.jogador.usuario.email,
      posicao_preferida: membro.jogador.posicao_preferida,
      overall: membro.jogador.overall,
      papel: membro.papel,
      data_entrada: membro.data_entrada,
      vitorias: membro.jogador.vitorias,
      derrotas: membro.jogador.derrotas,
      presencas: membro.jogador.presencas,
      ausencias: membro.jogador.ausencias,
      assiduidade: membro.jogador.assiduidade,
      media_nota: membro.jogador.media_nota,
      avatar_url: membro.jogador.avatar_url,
    }));

    return res.status(200).json({
      membros: membrosFormatados,
    });
  } catch (error) {
    console.error("Erro ao listar membros:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Remover jogador do grupo
export const removerJogador = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const { grupoId, jogadorId } = req.params;

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
        .json({ error: "Apenas administradores podem remover jogadores." });
    }

    // Não permitir que o admin se remova
    if (req.user.id === parseInt(jogadorId)) {
      return res
        .status(400)
        .json({ error: "Administrador não pode se remover do grupo." });
    }

    // Atualizar status do membro para removido
    const membroAtualizado = await prisma.membro_grupo.updateMany({
      where: {
        grupo_id: parseInt(grupoId),
        jogador_id: parseInt(jogadorId),
        status: "ativo",
      },
      data: {
        status: "removido",
      },
    });

    if (membroAtualizado.count === 0) {
      return res
        .status(404)
        .json({ error: "Jogador não encontrado no grupo." });
    }

    return res.status(200).json({
      message: "Jogador removido do grupo com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao remover jogador:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Obter detalhes do grupo
export const obterGrupo = async (req: AuthenticatedRequest, res: Response) => {
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

    const grupo = await prisma.grupo.findUnique({
      where: { id: parseInt(grupoId) },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true },
        },
        _count: {
          select: {
            membro_grupo: { where: { status: "ativo" } },
            partida: true,
          },
        },
      },
    });

    if (!grupo) {
      return res.status(404).json({ error: "Grupo não encontrado." });
    }

    return res.status(200).json({
      grupo: {
        id: grupo.id,
        nome: grupo.nome,
        descricao: grupo.descricao,
        localizacao: grupo.localizacao,
        regras: grupo.regras,
        administrador: grupo.usuario,
        data_criacao: grupo.data_criacao,
        total_membros: grupo._count.membro_grupo,
        total_partidas: grupo._count.partida,
        meu_papel: membro.papel,
      },
    });
  } catch (error) {
    console.error("Erro ao obter grupo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};
