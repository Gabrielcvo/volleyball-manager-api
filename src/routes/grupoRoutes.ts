import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  criarGrupo,
  listarGrupos,
  adicionarJogador,
  listarMembros,
  removerJogador,
  obterGrupo,
} from "../controllers/grupoController";

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas para grupos
router.post("/", criarGrupo); // POST /grupos - Criar grupo
router.get("/", listarGrupos); // GET /grupos - Listar grupos do usuário
router.get("/:grupoId", obterGrupo); // GET /grupos/:grupoId - Obter detalhes do grupo
router.post("/:grupoId/membros", adicionarJogador); // POST /grupos/:grupoId/membros - Adicionar jogador
router.get("/:grupoId/membros", listarMembros); // GET /grupos/:grupoId/membros - Listar membros
router.delete("/:grupoId/membros/:jogadorId", removerJogador); // DELETE /grupos/:grupoId/membros/:jogadorId - Remover jogador

export default router;
