import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AppError } from "./utils/AppError";

// Carregar variáveis de ambiente
dotenv.config();

// Importar rotas
import authRoutes from "./routes/authRoutes";
import grupoRoutes from "./routes/grupoRoutes";
import partidaRoutes from "./routes/partidaRoutes";
import rankingRoutes from "./routes/rankingRoutes";
import timeRoutes from "./routes/timeRoutes";
import jogoRoutes from "./routes/jogoRoutes";
import jogoPeladaRoutes from "./routes/jogoPeladaRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(
  cors({
    origin: "*", // Permite qualquer origem (mais permissivo para Vercel)
    credentials: false, // Desabilita credentials para compatibilidade móvel
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Access-Control-Allow-Credentials",
    ],
    preflightContinue: false,
    optionsSuccessStatus: 200,
    maxAge: 86400, // Cache preflight por 24 horas
  })
);

// Middleware CORS específico para Vercel
app.use((req, res, next) => {
  // Log para debug
  console.log(
    `[VERCEL CORS] ${req.method} ${req.path} - Origin: ${req.headers.origin}`
  );

  // Headers CORS essenciais
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Credentials", "false");
  res.header("Access-Control-Max-Age", "86400");

  // Headers específicos para iOS e Vercel
  res.header("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.header("Cross-Origin-Opener-Policy", "unsafe-none");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");

  // Tratar preflight OPTIONS
  if (req.method === "OPTIONS") {
    console.log(
      `[VERCEL CORS] Preflight OPTIONS para ${req.path} - Respondendo 200`
    );
    res.status(200).end();
    return;
  }

  next();
});

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "API rodando com sucesso!",
    message: "Volleyball Manager API",
    version: "1.0.0",
  });
});

// Rotas da aplicação
app.use("/auth", authRoutes); // Autenticação
app.use("/grupos", grupoRoutes); // Grupos
app.use("/partidas", partidaRoutes); // Partidas (inclui rotas com grupos e partidas)
app.use("/ranking", rankingRoutes); // Ranking e histórico
app.use("/times", timeRoutes); // Times
app.use("/jogos", jogoRoutes); // Jogos sequenciais (sistema antigo)
app.use("/jogos-pelada", jogoPeladaRoutes); // Jogos de pelada (sistema novo simplificado)

// Middleware para rotas não encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Rota não encontrada",
    message: "A rota solicitada não existe",
  });
});

// Middleware de tratamento de erros
app.use((error: unknown, req: Request, res: Response) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      details: error.details ?? undefined,
    });
  } else {
    // Log detalhado apenas no servidor
    console.error("Erro inesperado:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: "Ocorreu um erro inesperado",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
