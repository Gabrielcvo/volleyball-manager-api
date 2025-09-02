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

// Configuração CORS mais permissiva para dispositivos móveis
app.use((req, res, next) => {
  // Headers CORS essenciais
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Expose-Headers", "*");
  res.header("Access-Control-Max-Age", "86400");

  // Headers específicos para iOS
  res.header("Access-Control-Allow-Credentials", "false");
  res.header("Referrer-Policy", "no-referrer-when-downgrade");

  // Tratar preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  next();
});

// Middleware CORS adicional como backup
app.use(
  cors({
    origin: true,
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: "*",
    preflightContinue: false,
    optionsSuccessStatus: 200,
  })
);

// Middleware para forçar headers de segurança mais permissivos
app.use((req, res, next) => {
  // Forçar headers de segurança mais permissivos para desenvolvimento
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "SAMEORIGIN");
  res.header("X-XSS-Protection", "1; mode=block");

  // Headers específicos para resolver problemas de CORS em iOS
  res.header("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.header("Cross-Origin-Opener-Policy", "unsafe-none");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");

  next();
});

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
