import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  sortearTimes,
  listarTimes,
  editarTime,
  atualizarPontuacao,
} from "../controllers/timeController";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas para times
router.post("/partidas/:partidaId/sortear-times", sortearTimes); // POST /partidas/:partidaId/sortear-times - Sortear times
router.get("/partidas/:partidaId/times", listarTimes); // GET /partidas/:partidaId/times - Listar times da partida
router.put("/times/:timeId", editarTime); // PUT /times/:timeId - Editar time
router.put("/times/:timeId/pontuacao", atualizarPontuacao); // PUT /times/:timeId/pontuacao - Atualizar pontuação

export default router;
