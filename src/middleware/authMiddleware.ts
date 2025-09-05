import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/database";
import { AuthenticatedRequest } from "../types/auth";

// Middleware para autenticar token JWT
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: "Token de acesso não fornecido",
      message: "É necessário fornecer um token de autenticação válido",
    });
  }

  try {
    const secret =
      process.env.JWT_SECRET || "sua_chave_secreta_muito_segura_aqui_2024";
    const decoded = jwt.verify(token, secret) as { id: number };
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
    });
    if (!usuario) {
      return res.status(401).json({
        error: "Usuário não encontrado",
        message: "Token válido mas usuário não existe",
      });
    }

    req.user = { id: usuario.id, nome: usuario.nome, email: usuario.email };
    next();
  } catch {
    return res.status(403).json({
      error: "Token inválido",
      message: "O token fornecido não é válido ou expirou",
    });
  }
};
