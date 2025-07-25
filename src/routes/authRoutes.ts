import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  registerUser,
  loginUser,
  getProfile,
} from "../controllers/authController";

const router = Router();

// Rotas públicas (não requerem autenticação)

// Cadastro de usuário
router.post("/register", registerUser);

// Login de usuário
router.post("/login", loginUser);

// Rotas protegidas (requerem autenticação)

// Perfil do usuário autenticado
router.get("/profile", authenticateToken, getProfile);

export default router;
