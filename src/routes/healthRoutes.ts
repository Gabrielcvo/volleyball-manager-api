import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Rota para testar se a API está funcionando
router.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "API funcionando",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Rota para testar conexão com o banco de dados
router.get("/db", async (req: Request, res: Response) => {
  try {
    // Teste simples de conexão
    await prisma.$queryRaw`SELECT 1 as test`;

    res.status(200).json({
      status: "Conexão com banco OK",
      timestamp: new Date().toISOString(),
      database: "Conectado com sucesso",
    });
  } catch (error) {
    console.error("Erro na conexão com banco:", error);

    res.status(500).json({
      status: "Erro na conexão com banco",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Erro desconhecido",
      details: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
});

// Rota para testar operação básica no banco
router.get("/db-test", async (req: Request, res: Response) => {
  try {
    // Teste de operação real (contar usuários)
    const userCount = await prisma.usuario.count();

    res.status(200).json({
      status: "Operação no banco OK",
      timestamp: new Date().toISOString(),
      userCount: userCount,
      message: "Banco de dados funcionando perfeitamente",
    });
  } catch (error) {
    console.error("Erro na operação do banco:", error);

    res.status(500).json({
      status: "Erro na operação do banco",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Erro desconhecido",
      details: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
});

// Rota para mostrar variáveis de ambiente (sem senhas)
router.get("/env", (req: Request, res: Response) => {
  res.status(200).json({
    status: "Variáveis de ambiente",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    dbHost: process.env.DB_HOST || "não definido",
    dbPort: process.env.DB_PORT || "não definido",
    dbUser: process.env.DB_USER || "não definido",
    dbName: process.env.DB_NAME || "não definido",
    hasDbPassword: !!process.env.DB_PASSWORD,
    nodeEnv: process.env.NODE_ENV || "não definido",
  });
});

export default router;
