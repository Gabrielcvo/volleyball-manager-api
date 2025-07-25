import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AppError } from "./utils/AppError";

// Carregar variáveis de ambiente
dotenv.config();

// Importar rotas
import authRoutes from "./routes/authRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rota de saúde (pública)
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "API rodando com sucesso!",
    message: "Volleyball Manager API",
    version: "1.0.0",
    endpoints: {
      auth: "/auth",
    },
  });
});

// Rotas de autenticação (públicas e protegidas)
app.use("/auth", authRoutes);

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
  console.log("- POST /auth/register - Cadastro de usuário (público)");
  console.log("- POST /auth/login - Login de usuário (público)");
  console.log("- GET /auth/profile - Perfil do usuário (protegido)");
});
