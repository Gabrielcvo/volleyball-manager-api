-- CreateEnum
CREATE TYPE "papel_grupo" AS ENUM ('admin', 'membro');

-- CreateEnum
CREATE TYPE "status_assinatura" AS ENUM ('ativo', 'inativo', 'cancelado');

-- CreateEnum
CREATE TYPE "status_membro" AS ENUM ('ativo', 'pendente', 'removido');

-- CreateEnum
CREATE TYPE "status_partida" AS ENUM ('agendada', 'em_andamento', 'finalizada', 'cancelada');

-- CreateEnum
CREATE TYPE "status_presenca" AS ENUM ('confirmado', 'nao_confirmado', 'fila_espera');

-- CreateEnum
CREATE TYPE "tipo_destaque" AS ENUM ('melhor_atacante', 'melhor_defensor', 'melhor_levantador', 'melhor_bloqueador', 'melhor_saque', 'bola_murcha');

-- CreateEnum
CREATE TYPE "tipo_evento" AS ENUM ('ponto_ataque', 'ponto_bloqueio', 'ponto_saque', 'erro_ataque', 'erro_saque', 'erro_recepcao', 'defesa', 'substituicao', 'cartao_amarelo', 'cartao_vermelho');

-- CreateEnum
CREATE TYPE "tipo_transacao" AS ENUM ('receita', 'despesa');

-- CreateEnum
CREATE TYPE "tipo_vantagem" AS ENUM ('estatisticas_avancadas', 'comparacao_jogadores', 'vetar_nota', 'clube_descontos', 'experiencias_exclusivas');

-- CreateEnum
CREATE TYPE "status_jogo" AS ENUM ('agendado', 'em_andamento', 'finalizado', 'cancelado');

-- CreateTable
CREATE TABLE "assinatura_socio" (
    "id" SERIAL NOT NULL,
    "jogador_id" INTEGER NOT NULL,
    "data_inicio" TIMESTAMPTZ(6) NOT NULL,
    "data_fim" TIMESTAMPTZ(6),
    "status" "status_assinatura" NOT NULL,
    "plano" VARCHAR(50),

    CONSTRAINT "assinatura_socio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "acao" VARCHAR(100) NOT NULL,
    "entidade" VARCHAR(50),
    "entidade_id" INTEGER,
    "detalhes" TEXT,
    "data_acao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacao_jogador" (
    "id" SERIAL NOT NULL,
    "partida_id" INTEGER NOT NULL,
    "avaliador_id" INTEGER NOT NULL,
    "avaliado_id" INTEGER NOT NULL,
    "nota" DECIMAL(3,1) NOT NULL,
    "comentario" TEXT,
    "data_avaliacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacao_jogador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caixa_grupo" (
    "id" SERIAL NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "saldo_atual" DECIMAL(10,2) DEFAULT 0.0,

    CONSTRAINT "caixa_grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carteira_jogador" (
    "id" SERIAL NOT NULL,
    "jogador_id" INTEGER NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "saldo_devedor" DECIMAL(10,2) DEFAULT 0.0,

    CONSTRAINT "carteira_jogador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confirmacao_presenca" (
    "partida_id" INTEGER NOT NULL,
    "jogador_id" INTEGER NOT NULL,
    "status_presenca" "status_presenca" DEFAULT 'nao_confirmado',
    "data_confirmacao" TIMESTAMPTZ(6),

    CONSTRAINT "confirmacao_presenca_pkey" PRIMARY KEY ("partida_id","jogador_id")
);

-- CreateTable
CREATE TABLE "destaque_partida" (
    "id" SERIAL NOT NULL,
    "partida_id" INTEGER NOT NULL,
    "jogador_id" INTEGER NOT NULL,
    "tipo_destaque" "tipo_destaque" NOT NULL,

    CONSTRAINT "destaque_partida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento_partida" (
    "id" SERIAL NOT NULL,
    "partida_id" INTEGER NOT NULL,
    "jogador_id" INTEGER NOT NULL,
    "tipo_evento" "tipo_evento" NOT NULL,
    "time_evento" INTEGER,
    "minuto_partida" INTEGER,
    "descricao" TEXT,

    CONSTRAINT "evento_partida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupo" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "administrador_id" INTEGER NOT NULL,
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "localizacao" VARCHAR(255),
    "regras" TEXT,
    "ativo" BOOLEAN DEFAULT true,

    CONSTRAINT "grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jogador" (
    "id" INTEGER NOT NULL,
    "posicao_preferida" VARCHAR(50),
    "overall" DECIMAL(3,1) DEFAULT 0.0,
    "vitorias" INTEGER DEFAULT 0,
    "derrotas" INTEGER DEFAULT 0,
    "empates" INTEGER DEFAULT 0,
    "presencas" INTEGER DEFAULT 0,
    "ausencias" INTEGER DEFAULT 0,
    "assiduidade" DECIMAL(5,2) DEFAULT 0.0,
    "media_nota" DECIMAL(3,1) DEFAULT 0.0,
    "bio" TEXT,
    "avatar_url" VARCHAR(255),

    CONSTRAINT "jogador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jogador_time" (
    "time_id" INTEGER NOT NULL,
    "jogador_id" INTEGER NOT NULL,
    "posicao_jogada" VARCHAR(50),

    CONSTRAINT "jogador_time_pkey" PRIMARY KEY ("time_id","jogador_id")
);

-- CreateTable
CREATE TABLE "membro_grupo" (
    "grupo_id" INTEGER NOT NULL,
    "jogador_id" INTEGER NOT NULL,
    "data_entrada" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "status_membro" DEFAULT 'pendente',
    "papel" "papel_grupo" DEFAULT 'membro',

    CONSTRAINT "membro_grupo_pkey" PRIMARY KEY ("grupo_id","jogador_id")
);

-- CreateTable
CREATE TABLE "notificacao" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "grupo_id" INTEGER,
    "partida_id" INTEGER,
    "titulo" VARCHAR(255) NOT NULL,
    "mensagem" TEXT NOT NULL,
    "tipo" VARCHAR(50),
    "lida" BOOLEAN DEFAULT false,
    "data_envio" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamento" (
    "id" SERIAL NOT NULL,
    "carteira_jogador_id" INTEGER NOT NULL,
    "valor_pago" DECIMAL(10,2) NOT NULL,
    "data_pagamento" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo_pagamento" VARCHAR(50),
    "transacao_financeira_id" INTEGER,

    CONSTRAINT "pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partida" (
    "id" SERIAL NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "data_hora" TIMESTAMPTZ(6) NOT NULL,
    "local" VARCHAR(255),
    "duracao_estimada_minutos" INTEGER,
    "status" "status_partida" DEFAULT 'agendada',
    "limite_jogadores" INTEGER,
    "valor_pelada" DECIMAL(10,2) DEFAULT 0.0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "partida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jogo" (
    "id" SERIAL NOT NULL,
    "partida_id" INTEGER NOT NULL,
    "numero_jogo" INTEGER NOT NULL,
    "time_a_id" INTEGER NOT NULL,
    "time_b_id" INTEGER NOT NULL,
    "placar_time_a" INTEGER DEFAULT 0,
    "placar_time_b" INTEGER DEFAULT 0,
    "time_vencedor_id" INTEGER,
    "status_jogo" "status_jogo" DEFAULT 'agendado',
    "duracao_minutos" INTEGER,
    "data_inicio" TIMESTAMPTZ(6),
    "data_fim" TIMESTAMPTZ(6),
    "observacoes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento_jogo" (
    "id" SERIAL NOT NULL,
    "jogo_id" INTEGER NOT NULL,
    "jogador_id" INTEGER NOT NULL,
    "time_id" INTEGER NOT NULL,
    "tipo_evento" "tipo_evento" NOT NULL,
    "minuto_jogo" INTEGER,
    "descricao" TEXT,
    "data_evento" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_jogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time" (
    "id" SERIAL NOT NULL,
    "partida_id" INTEGER NOT NULL,
    "nome_time" VARCHAR(255),
    "pontuacao_final" INTEGER DEFAULT 0,

    CONSTRAINT "time_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacao_financeira" (
    "id" SERIAL NOT NULL,
    "caixa_grupo_id" INTEGER NOT NULL,
    "tipo_transacao" "tipo_transacao" NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "data_transacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsavel_id" INTEGER NOT NULL,

    CONSTRAINT "transacao_financeira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "data_cadastro" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ativo" BOOLEAN DEFAULT true,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vantagem_socio" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "tipo_vantagem" "tipo_vantagem" NOT NULL,

    CONSTRAINT "vantagem_socio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_auditoria_usuario" ON "auditoria"("usuario_id");

-- CreateIndex
CREATE INDEX "idx_confirmacao_jogador" ON "confirmacao_presenca"("jogador_id");

-- CreateIndex
CREATE INDEX "idx_confirmacao_partida" ON "confirmacao_presenca"("partida_id");

-- CreateIndex
CREATE INDEX "idx_notificacao_usuario" ON "notificacao"("usuario_id");

-- CreateIndex
CREATE INDEX "idx_partida_grupo" ON "partida"("grupo_id");

-- CreateIndex
CREATE INDEX "idx_jogo_partida" ON "jogo"("partida_id");

-- CreateIndex
CREATE UNIQUE INDEX "jogo_partida_id_numero_jogo_key" ON "jogo"("partida_id", "numero_jogo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "idx_usuario_email" ON "usuario"("email");

-- AddForeignKey
ALTER TABLE "assinatura_socio" ADD CONSTRAINT "assinatura_socio_jogador_id_fkey" FOREIGN KEY ("jogador_id") REFERENCES "jogador"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "avaliacao_jogador" ADD CONSTRAINT "avaliacao_jogador_avaliado_id_fkey" FOREIGN KEY ("avaliado_id") REFERENCES "jogador"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "avaliacao_jogador" ADD CONSTRAINT "avaliacao_jogador_avaliador_id_fkey" FOREIGN KEY ("avaliador_id") REFERENCES "jogador"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "avaliacao_jogador" ADD CONSTRAINT "avaliacao_jogador_partida_id_fkey" FOREIGN KEY ("partida_id") REFERENCES "partida"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "caixa_grupo" ADD CONSTRAINT "caixa_grupo_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupo"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "carteira_jogador" ADD CONSTRAINT "carteira_jogador_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupo"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "carteira_jogador" ADD CONSTRAINT "carteira_jogador_jogador_id_fkey" FOREIGN KEY ("jogador_id") REFERENCES "jogador"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "confirmacao_presenca" ADD CONSTRAINT "confirmacao_presenca_jogador_id_fkey" FOREIGN KEY ("jogador_id") REFERENCES "jogador"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "confirmacao_presenca" ADD CONSTRAINT "confirmacao_presenca_partida_id_fkey" FOREIGN KEY ("partida_id") REFERENCES "partida"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "destaque_partida" ADD CONSTRAINT "destaque_partida_jogador_id_fkey" FOREIGN KEY ("jogador_id") REFERENCES "jogador"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "destaque_partida" ADD CONSTRAINT "destaque_partida_partida_id_fkey" FOREIGN KEY ("partida_id") REFERENCES "partida"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evento_partida" ADD CONSTRAINT "evento_partida_jogador_id_fkey" FOREIGN KEY ("jogador_id") REFERENCES "jogador"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evento_partida" ADD CONSTRAINT "evento_partida_partida_id_fkey" FOREIGN KEY ("partida_id") REFERENCES "partida"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evento_partida" ADD CONSTRAINT "evento_partida_time_evento_fkey" FOREIGN KEY ("time_evento") REFERENCES "time"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "grupo" ADD CONSTRAINT "grupo_administrador_id_fkey" FOREIGN KEY ("administrador_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jogador" ADD CONSTRAINT "jogador_id_fkey" FOREIGN KEY ("id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jogador_time" ADD CONSTRAINT "jogador_time_jogador_id_fkey" FOREIGN KEY ("jogador_id") REFERENCES "jogador"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jogador_time" ADD CONSTRAINT "jogador_time_time_id_fkey" FOREIGN KEY ("time_id") REFERENCES "time"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "membro_grupo" ADD CONSTRAINT "membro_grupo_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupo"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "membro_grupo" ADD CONSTRAINT "membro_grupo_jogador_id_fkey" FOREIGN KEY ("jogador_id") REFERENCES "jogador"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_partida_id_fkey" FOREIGN KEY ("partida_id") REFERENCES "partida"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_carteira_jogador_id_fkey" FOREIGN KEY ("carteira_jogador_id") REFERENCES "carteira_jogador"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_transacao_financeira_id_fkey" FOREIGN KEY ("transacao_financeira_id") REFERENCES "transacao_financeira"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partida" ADD CONSTRAINT "partida_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupo"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jogo" ADD CONSTRAINT "jogo_partida_id_fkey" FOREIGN KEY ("partida_id") REFERENCES "partida"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jogo" ADD CONSTRAINT "jogo_time_a_id_fkey" FOREIGN KEY ("time_a_id") REFERENCES "time"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jogo" ADD CONSTRAINT "jogo_time_b_id_fkey" FOREIGN KEY ("time_b_id") REFERENCES "time"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "jogo" ADD CONSTRAINT "jogo_time_vencedor_id_fkey" FOREIGN KEY ("time_vencedor_id") REFERENCES "time"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evento_jogo" ADD CONSTRAINT "evento_jogo_jogo_id_fkey" FOREIGN KEY ("jogo_id") REFERENCES "jogo"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evento_jogo" ADD CONSTRAINT "evento_jogo_jogador_id_fkey" FOREIGN KEY ("jogador_id") REFERENCES "jogador"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evento_jogo" ADD CONSTRAINT "evento_jogo_time_id_fkey" FOREIGN KEY ("time_id") REFERENCES "time"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "time" ADD CONSTRAINT "time_partida_id_fkey" FOREIGN KEY ("partida_id") REFERENCES "partida"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transacao_financeira" ADD CONSTRAINT "transacao_financeira_caixa_grupo_id_fkey" FOREIGN KEY ("caixa_grupo_id") REFERENCES "caixa_grupo"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transacao_financeira" ADD CONSTRAINT "transacao_financeira_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
