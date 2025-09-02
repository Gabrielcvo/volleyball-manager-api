import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  criarPartida,
  listarPartidas,
  confirmarPresenca,
  listarConfirmacoes,
  atualizarPartida,
  obterPartida,
} from "../controllers/partidaController";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas para partidas
router.post("/grupos/:grupoId/partidas", criarPartida); // POST /partidas/grupos/:grupoId/partidas - Criar partida
router.get("/grupos/:grupoId/partidas", listarPartidas); // GET /partidas/grupos/:grupoId/partidas - Listar partidas do grupo
router.get("/:partidaId", obterPartida); // GET /partidas/:partidaId - Obter detalhes da partida
router.put("/:partidaId", atualizarPartida); // PUT /partidas/:partidaId - Atualizar partida
router.post("/:partidaId/confirmar", confirmarPresenca); // POST /partidas/:partidaId/confirmar - Confirmar presença
router.get("/:partidaId/confirmacoes", listarConfirmacoes); // GET /partidas/:partidaId/confirmacoes - Listar confirmações

export default router;
