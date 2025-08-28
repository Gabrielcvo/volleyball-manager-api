import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  iniciarPelada,
  criarJogo,
  iniciarJogo,
  atualizarPontos,
  finalizarJogo,
  listarJogos,
  finalizarPelada,
  obterJogo,
} from "../controllers/jogoPeladaController";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// === SISTEMA DE PELADAS SEQUENCIAIS ===

// Iniciar sessão de pelada (ativar sistema de jogos sequenciais)
router.post("/partidas/:partidaId/pelada/iniciar", iniciarPelada);

// Finalizar sessão de pelada (encerrar jogos sequenciais)
router.put("/partidas/:partidaId/pelada/finalizar", finalizarPelada);

// Criar novo jogo individual (escolher times)
router.post("/partidas/:partidaId/jogos", criarJogo);

// Listar todos os jogos da pelada (histórico + estatísticas)
router.get("/partidas/:partidaId/jogos", listarJogos);

// === CONTROLE DE JOGOS INDIVIDUAIS ===

// Obter detalhes de um jogo específico
router.get("/jogos/:jogoId", obterJogo);

// Iniciar jogo específico
router.put("/jogos/:jogoId/iniciar", iniciarJogo);

// Atualizar pontuação em tempo real
router.put("/jogos/:jogoId/pontos", atualizarPontos);

// Finalizar jogo e registrar resultado
router.put("/jogos/:jogoId/finalizar", finalizarJogo);

export default router;

