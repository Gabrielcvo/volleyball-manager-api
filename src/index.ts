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
app.use(express.json());

// Middleware CORS global - DEVE vir ANTES de todas as rotas
app.use((req, res, next) => {
  // Log para debug
  console.log(
    `[CORS] ${req.method} ${req.path} - Origin: ${req.headers.origin}`
  );

  // Permitir qualquer origem
  res.header("Access-Control-Allow-Origin", "*");

  // Permitir todos os métodos
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );

  // Permitir todos os headers
  res.header("Access-Control-Allow-Headers", "*");

  // Headers adicionais para iOS
  res.header("Access-Control-Allow-Credentials", "false");
  res.header("Access-Control-Max-Age", "86400");

  // Headers de segurança permissivos para desenvolvimento
  res.header("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.header("Cross-Origin-Opener-Policy", "unsafe-none");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");

  // Tratar preflight OPTIONS
  if (req.method === "OPTIONS") {
    console.log(`[CORS] Preflight OPTIONS para ${req.path} - Respondendo 200`);
    res.status(200).end();
    return;
  }

  next();
});

// Middleware CORS como backup usando a biblioteca cors
app.use(
  cors({
    origin: "*",
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: "*",
    preflightContinue: false,
    optionsSuccessStatus: 200,
  })
);

// Middleware adicional para garantir CORS em todas as respostas
app.use((req, res, next) => {
  // Garantir que os headers CORS sejam sempre aplicados
  res.on("finish", () => {
    if (!res.getHeader("Access-Control-Allow-Origin")) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH"
      );
      res.header("Access-Control-Allow-Headers", "*");
    }
  });
  next();
});

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "API rodando com sucesso!",
    message: "Volleyball Manager API",
    version: "1.0.0",
  });
});

// Middleware CORS específico para rotas de autenticação
app.use("/auth", (req, res, next) => {
  console.log(`[AUTH CORS] ${req.method} ${req.path}`);

  // Headers CORS específicos para autenticação
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Credentials", "false");

  if (req.method === "OPTIONS") {
    console.log(`[AUTH CORS] Preflight OPTIONS - Respondendo 200`);
    res.status(200).end();
    return;
  }

  next();
});

// Rotas da aplicação
app.use("/auth", authRoutes); // Autenticação
app.use("/grupos", grupoRoutes); // Grupos
app.use("/", partidaRoutes); // Partidas (inclui rotas com grupos e partidas)
app.use("/", rankingRoutes); // Ranking e histórico
app.use("/", timeRoutes); // Times
app.use("/", jogoRoutes); // Jogos sequenciais (sistema antigo)
app.use("/", jogoPeladaRoutes); // Jogos de pelada (sistema novo simplificado)

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
