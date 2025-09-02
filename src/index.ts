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

const allowedOrigins = [
  "https://volleyball-manager-api-git-feat-cors-gabrielcvos-projects.vercel.app/",
];
// Middlewares
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
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
