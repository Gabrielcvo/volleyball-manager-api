import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  inicializarJogos,
  listarJogos,
  iniciarJogo,
  finalizarJogo,
  criarProximoJogo,
  obterJogo,
  atualizarPontos,
} from "../controllers/jogoController_db";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas para jogos
router.post("/partidas/:partidaId/jogos/inicializar", inicializarJogos); // POST /partidas/:partidaId/jogos/inicializar - Inicializar sistema de jogos
router.get("/partidas/:partidaId/jogos", listarJogos); // GET /partidas/:partidaId/jogos - Listar jogos da partida
router.post("/partidas/:partidaId/jogos", criarProximoJogo); // POST /partidas/:partidaId/jogos - Criar próximo jogo manualmente
router.get("/jogos/:jogoId", obterJogo); // GET /jogos/:jogoId - Obter detalhes do jogo
router.put("/jogos/:jogoId/iniciar", iniciarJogo); // PUT /jogos/:jogoId/iniciar - Iniciar jogo
router.put("/jogos/:jogoId/atualizar-pontos", atualizarPontos); // PUT /jogos/:jogoId/atualizar-pontos - Atualizar pontos em tempo real
router.put("/jogos/:jogoId/finalizar", finalizarJogo); // PUT /jogos/:jogoId/finalizar - Finalizar jogo e registrar resultado

export default router;
