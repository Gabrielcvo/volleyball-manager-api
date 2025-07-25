import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../types/auth";

const prisma = new PrismaClient();

// Cadastro de usuário
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { nome, email, senha, avatar_url } = req.body;
    if (!nome || !email || !senha) {
      return res
        .status(400)
        .json({ error: "Nome, email e senha são obrigatórios." });
    }
    const existing = await prisma.usuario.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "E-mail já cadastrado." });
    }
    const senha_hash = await bcrypt.hash(senha, 10);
    const usuario = await prisma.usuario.create({
      data: { nome, email, senha_hash },
    });
    await prisma.jogador.create({
      data: { id: usuario.id, avatar_url: avatar_url || null },
    });
    return res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Login de usuário
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(401).json({ error: "Email ou senha incorretos." });
    }
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: "Email ou senha incorretos." });
    }
    const secret =
      process.env.JWT_SECRET || "sua_chave_secreta_muito_segura_aqui_2024";
    const token = jwt.sign({ id: usuario.id }, secret, { expiresIn: "24h" });
    return res.status(200).json({
      message: "Login realizado com sucesso!",
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Perfil do usuário autenticado
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(req.user.id) },
    });
    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }
    return res.status(200).json({
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
};
