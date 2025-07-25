🏐 Planejamento do App – Gerenciador de Peladas de Vôlei
🎯 Objetivo
Facilitar a organização de jogos de vôlei amador (peladas), permitindo:

Criação e agendamento de partidas

Confirmação de presença

Sorteio de times

Histórico de participação e estatísticas

🧱 Funcionalidades Principais

1. Autenticação e Perfil
   Login com e-mail, telefone ou redes sociais

Perfil com nome, posição preferida (ex: levantador, atacante), nível (iniciante, intermediário, avançado)

Foto de perfil

2. Agenda de Jogos
   Visualizar partidas disponíveis

Criar nova pelada (data, horário, local, número de jogadores)

Lista de confirmados

Limite de vagas

Lista de espera

3. Confirmação e Presença
   Botão para “Confirmar Presença” ou “Cancelar”

Indicação de quem confirmou ou desistiu

Check-in no dia da pelada

4. Sorteio de Times
   Divisão automática de times (balanceado por nível)

Ou divisão manual

Visualização dos times montados (como em algumas das imagens enviadas)

5. Estatísticas e Histórico
   Número de jogos participados

Participações consecutivas

Aproveitamento de vitórias (se houver controle de resultado)

Ranking interno (opcional)

6. Chat e Notificações
   Grupo de conversa por pelada
   Notificações sobre mudança de horário, local ou número de confirmados

7. Pontuação por fair play ou MVP da pelada
   Validar algum sistema de pontuação para jogos casuais de volei

💡 Extras Futuramente
Integração com mapas (mostrar local do jogo)

Pagamento integrado (rater jogos pagos)

Modo torneio (rodízio, mata-mata, ranking)

Tabelas e Campos

1. Usuario

Representa os usuários do aplicativo, que podem ser jogadores ou administradores de grupos.

•
id (INT, PK, Auto-incremento)

•
nome (VARCHAR(255))

•
email (VARCHAR(255), Único)

•
senha_hash (VARCHAR(255))

•
data_cadastro (DATETIME)

•
tipo_usuario (ENUM('jogador', 'administrador'))

2. Jogador

Detalhes específicos do perfil do jogador de vôlei.

•
id (INT, PK, FK para Usuario.id)

•
posicao_preferida (VARCHAR(50)) - Ex: 'Ponteiro', 'Oposto', 'Levantador', 'Central', 'Líbero'

•
overall (DECIMAL(3,1)) - Pontuação geral do jogador

•
vitorias (INT)

•
derrotas (INT)

•
empates (INT) - Pode ser 0 para vôlei, mas mantido para consistência com o modelo original

•
presencas (INT)

•
ausencias (INT)

•
assiduidade (DECIMAL(5,2))

•
media_nota (DECIMAL(3,1))

•
bio (TEXT) - Pequena descrição do jogador

•
avatar_url (VARCHAR(255))

3. Grupo

Representa um grupo de vôlei organizado no aplicativo.

•
id (INT, PK, Auto-incremento)

•
nome (VARCHAR(255))

•
descricao (TEXT)

•
administrador_id (INT, FK para Usuario.id)

•
data_criacao (DATETIME)

•
localizacao (VARCHAR(255))

•
regras (TEXT)

4. MembroGrupo

Associa jogadores a grupos.

•
grupo_id (INT, PK, FK para Grupo.id)

•
jogador_id (INT, PK, FK para Jogador.id)

•
data_entrada (DATETIME)

•
status (ENUM('ativo', 'pendente', 'removido'))

5. Partida

Informações sobre as partidas de vôlei agendadas.

•
id (INT, PK, Auto-incremento)

•
grupo_id (INT, FK para Grupo.id)

•
data_hora (DATETIME)

•
local (VARCHAR(255))

•
duracao_estimada_minutos (INT)

•
status (ENUM('agendada', 'em_andamento', 'finalizada', 'cancelada'))

•
limite_jogadores (INT)

•
valor_pelada (DECIMAL(10,2)) - Custo por jogador, se houver

6. ConfirmacaoPresenca

Registro da confirmação de presença dos jogadores em uma partida.

•
partida_id (INT, PK, FK para Partida.id)

•
jogador_id (INT, PK, FK para Jogador.id)

•
status_presenca (ENUM('confirmado', 'nao_confirmado', 'fila_espera'))

•
data_confirmacao (DATETIME)

7. Time

Representa os times formados para uma partida.

•
id (INT, PK, Auto-incremento)

•
partida_id (INT, FK para Partida.id)

•
nome_time (VARCHAR(255)) - Ex: 'Time A', 'Time B'

•
pontuacao_final (INT)

8. JogadorTime

Associa jogadores a times em uma partida específica.

•
time_id (INT, PK, FK para Time.id)

•
jogador_id (INT, PK, FK para Jogador.id)

•
posicao_jogada (VARCHAR(50)) - Posição que o jogador atuou na partida

9. EventoPartida

Registra os eventos que ocorrem durante uma partida (pontos, bloqueios, etc.).

•
id (INT, PK, Auto-incremento)

•
partida_id (INT, FK para Partida.id)

•
jogador_id (INT, FK para Jogador.id) - Jogador que realizou o evento

•
tipo_evento (ENUM('ponto_ataque', 'ponto_bloqueio', 'ponto_saque', 'erro_ataque', 'erro_saque', 'erro_recepcao', 'defesa', 'substituicao', 'cartao_amarelo', 'cartao_vermelho'))

•
time_evento (INT, FK para Time.id) - Time que o jogador pertencia no momento do evento

•
minuto_partida (INT) - Minuto aproximado do evento

•
descricao (TEXT) - Detalhes adicionais do evento

10. AvaliacaoJogador

Avaliações de jogadores após as partidas.

•
id (INT, PK, Auto-incremento)

•
partida_id (INT, FK para Partida.id)

•
avaliador_id (INT, FK para Jogador.id)

•
avaliado_id (INT, FK para Jogador.id)

•
nota (DECIMAL(3,1)) - Nota de 0 a 10

•
comentario (TEXT)

•
data_avaliacao (DATETIME)

11. DestaquePartida

Registra os destaques da partida (melhor atacante, melhor defensor, etc.).

•
id (INT, PK, Auto-incremento)

•
partida_id (INT, FK para Partida.id)

•
jogador_id (INT, FK para Jogador.id)

•
tipo_destaque (ENUM('melhor_atacante', 'melhor_defensor', 'melhor_levantador', 'melhor_bloqueador', 'melhor_saque', 'bola_murcha'))

12. CaixaGrupo

Controle financeiro do grupo.

•
id (INT, PK, Auto-incremento)

•
grupo_id (INT, FK para Grupo.id)

•
saldo_atual (DECIMAL(10,2))

13. TransacaoFinanceira

Registro de todas as transações financeiras do grupo.

•
id (INT, PK, Auto-incremento)

•
caixa_grupo_id (INT, FK para CaixaGrupo.id)

•
tipo_transacao (ENUM('receita', 'despesa'))

•
descricao (TEXT)

•
valor (DECIMAL(10,2))

•
data_transacao (DATETIME)

•
responsavel_id (INT, FK para Usuario.id) - Quem registrou a transação

14. CarteiraJogador

Carteira virtual de cada jogador dentro do grupo.

•
id (INT, PK, Auto-incremento)

•
jogador_id (INT, FK para Jogador.id)

•
grupo_id (INT, FK para Grupo.id)

•
saldo_devedor (DECIMAL(10,2))

15. Pagamento

Registro dos pagamentos realizados pelos jogadores.

•
id (INT, PK, Auto-incremento)

•
carteira_jogador_id (INT, FK para CarteiraJogador.id)

•
valor_pago (DECIMAL(10,2))

•
data_pagamento (DATETIME)

•
metodo_pagamento (VARCHAR(50)) - Ex: 'Cartão de Crédito', 'Dinheiro', 'Pix'

•
transacao_financeira_id (INT, FK para TransacaoFinanceira.id) - Opcional, se o pagamento estiver ligado a uma transação específica do caixa do grupo

16. VantagemSocio

Informações sobre as vantagens e benefícios para sócios.

•
id (INT, PK, Auto-incremento)

•
nome (VARCHAR(255))

•
descricao (TEXT)

•
tipo_vantagem (ENUM('estatisticas_avancadas', 'comparacao_jogadores', 'vetar_nota', 'clube_descontos', 'experiencias_exclusivas'))

17. AssinaturaSocio

Registro das assinaturas de sócio dos jogadores.

•
id (INT, PK, Auto-incremento)

•
jogador_id (INT, FK para Jogador.id)

•
data_inicio (DATETIME)

•
data_fim (DATETIME)

•
status (ENUM('ativo', 'inativo', 'cancelado'))

•
plano (VARCHAR(50)) - Ex: 'Mensal', 'Anual'

Relacionamentos (Chaves Estrangeiras - FK)

•
Jogador.id -> Usuario.id (Um para um)

•
Grupo.administrador_id -> Usuario.id (Um para muitos)

•
MembroGrupo.grupo_id -> Grupo.id (Muitos para muitos)

•
MembroGrupo.jogador_id -> Jogador.id (Muitos para muitos)

•
Partida.grupo_id -> Grupo.id (Um para muitos)

•
ConfirmacaoPresenca.partida_id -> Partida.id (Muitos para muitos)

•
ConfirmacaoPresenca.jogador_id -> Jogador.id (Muitos para muitos)

•
Time.partida_id -> Partida.id (Um para muitos)

•
JogadorTime.time_id -> Time.id (Muitos para muitos)

•
JogadorTime.jogador_id -> Jogador.id (Muitos para muitos)

•
EventoPartida.partida_id -> Partida.id (Um para muitos)

•
EventoPartida.jogador_id -> Jogador.id (Um para muitos)

•
EventoPartida.time_evento -> Time.id (Um para muitos)

•
AvaliacaoJogador.partida_id -> Partida.id (Um para muitos)

•
AvaliacaoJogador.avaliador_id -> Jogador.id (Um para muitos)

•
AvaliacaoJogador.avaliado_id -> Jogador.id (Um para muitos)

•
DestaquePartida.partida_id -> Partida.id (Um para muitos)

•
DestaquePartida.jogador_id -> Jogador.id (Um para muitos)

•
CaixaGrupo.grupo_id -> Grupo.id (Um para um)

•
TransacaoFinanceira.caixa_grupo_id -> CaixaGrupo.id (Um para muitos)

•
TransacaoFinanceira.responsavel_id -> Usuario.id (Um para muitos)

•
CarteiraJogador.jogador_id -> Jogador.id (Um para muitos)

•
CarteiraJogador.grupo_id -> Grupo.id (Um para muitos)

•
Pagamento.carteira_jogador_id -> CarteiraJogador.id (Um para muitos)

•
Pagamento.transacao_financeira_id -> TransacaoFinanceira.id (Um para muitos, opcional)

•
AssinaturaSocio.jogador_id -> Jogador.id (Um para muitos)

Este modelo fornece uma base sólida para o desenvolvimento do MVP do seu aplicativo de vôlei, cobrindo as principais funcionalidades de gerenciamento de usuários, grupos, partidas, estatísticas e finanças.
