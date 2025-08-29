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

app.use(
  cors({
    origin: "*",
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["*"],
    exposedHeaders: ["*"],
    optionsSuccessStatus: 200,
  })
);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Expose-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});
app.use(express.json());

// Rota de saúde (pública)
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "API rodando com sucesso!",
    message: "Volleyball Manager API",
    version: "1.0.0",
    endpoints: {
      auth: "/auth",
      grupos: "/grupos",
      partidas: "/partidas (ou /grupos/:id/partidas)",
      ranking: "/grupos/:id/ranking",
      historico: "/grupos/:id/historico",
      times: "/partidas/:id/times",
      jogos: "/partidas/:id/jogos",
    },
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
  console.log(`API disponível em http://localhost:${PORT}/`);
  console.log("Endpoints disponíveis:");
  console.log("🔐 Autenticação:");
  console.log("  - POST /auth/register - Cadastro de usuário");
  console.log("  - POST /auth/login - Login de usuário");
  console.log("  - GET /auth/profile - Perfil do usuário");
  console.log("");
  console.log("👥 Grupos:");
  console.log("  - POST /grupos - Criar grupo");
  console.log("  - GET /grupos - Listar grupos do usuário");
  console.log("  - GET /grupos/:id - Obter detalhes do grupo");
  console.log("  - POST /grupos/:id/membros - Adicionar jogador ao grupo");
  console.log("  - GET /grupos/:id/membros - Listar membros do grupo");
  console.log("  - DELETE /grupos/:id/membros/:jogadorId - Remover jogador");
  console.log("");
  console.log("🏐 Partidas:");
  console.log("  - POST /grupos/:id/partidas - Criar partida");
  console.log("  - GET /grupos/:id/partidas - Listar partidas do grupo");
  console.log("  - GET /partidas/:id - Obter detalhes da partida");
  console.log("  - PUT /partidas/:id - Atualizar partida");
  console.log("  - POST /partidas/:id/confirmar - Confirmar presença");
  console.log("  - GET /partidas/:id/confirmacoes - Listar confirmações");
  console.log("");
  console.log("🏆 Ranking e Estatísticas:");
  console.log("  - GET /grupos/:id/ranking - Ranking do grupo");
  console.log("  - GET /grupos/:id/historico - Histórico de partidas");
  console.log(
    "  - GET /grupos/:id/jogadores/:jogadorId/estatisticas - Estatísticas do jogador"
  );
  console.log("");
  console.log("⚽ Times:");
  console.log("  - POST /partidas/:id/sortear-times - Sortear times");
  console.log("  - GET /partidas/:id/times - Listar times da partida");
  console.log("  - PUT /times/:id - Editar time");
  console.log("  - PUT /times/:id/pontuacao - Atualizar pontuação");
  console.log("");
  console.log("🎮 Jogos Sequenciais (Sistema Antigo):");
  console.log(
    "  - POST /partidas/:id/jogos/inicializar - Inicializar sistema de jogos"
  );
  console.log("  - GET /partidas/:id/jogos - Listar jogos da partida");
  console.log("  - POST /partidas/:id/jogos - Criar próximo jogo");
  console.log("  - GET /jogos/:id - Obter detalhes do jogo");
  console.log("  - PUT /jogos/:id/iniciar - Iniciar jogo");
  console.log(
    "  - PUT /jogos/:id/atualizar-pontos - Atualizar pontos em tempo real"
  );
  console.log("  - PUT /jogos/:id/finalizar - Finalizar jogo");
  console.log("");
  console.log("🏐 Peladas Sequenciais (Sistema Novo):");
  console.log("  - POST /partidas/:id/pelada/iniciar - Iniciar pelada");
  console.log("  - PUT /partidas/:id/pelada/finalizar - Finalizar pelada");
  console.log("  - POST /partidas/:id/jogos - Criar novo jogo");
  console.log("  - GET /partidas/:id/jogos - Histórico e estatísticas");
  console.log("  - GET /jogos/:id - Detalhes do jogo");
  console.log("  - PUT /jogos/:id/iniciar - Iniciar jogo");
  console.log("  - PUT /jogos/:id/pontos - Atualizar pontos");
  console.log("  - PUT /jogos/:id/finalizar - Finalizar jogo");
});
