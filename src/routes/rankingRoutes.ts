import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  obterRanking,
  obterHistorico,
  obterEstatisticasJogador,
} from "../controllers/rankingController";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas para ranking e estatísticas
router.get("/grupos/:grupoId/ranking", obterRanking); // GET /grupos/:grupoId/ranking - Ranking do grupo
router.get("/grupos/:grupoId/historico", obterHistorico); // GET /grupos/:grupoId/historico - Histórico de partidas
router.get(
  "/grupos/:grupoId/jogadores/:jogadorId/estatisticas",
  obterEstatisticasJogador
); // GET /grupos/:grupoId/jogadores/:jogadorId/estatisticas - Estatísticas do jogador

export default router;
