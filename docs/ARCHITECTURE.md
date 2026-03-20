# Novel Hub - Arquitetura Inicial (MVP)

## 1. Objetivo da arquitetura

Definir um desenho simples e implementavel para entregar valor rapido:
- cadastrar novels e fontes;
- coletar metadados e capitulos periodicamente;
- detectar mudancas reais;
- notificar usuario.

## 2. Componentes

### 2.1 API Principal
Responsabilidades:
- autenticacao e autorizacao;
- CRUD de novels, fontes e progresso de leitura;
- consulta de eventos e notificacoes;
- orquestracao de jobs para o hub coletor.

Tecnologia sugerida (MVP):
- Node.js + TypeScript + Fastify;
- PostgreSQL;
- Redis (fila e cache de curto prazo).

### 2.2 Hub Coletor
Responsabilidades:
- buscar HTML;
- parsear dados por conector;
- normalizar campos;
- comparar com estado persistido;
- emitir eventos de dominio.

Tecnologia sugerida (MVP):
- worker Node.js + TypeScript;
- conectores por estrategia (`Connector` interface);
- queue consumer dedicado.

### 2.3 Scheduler/Queue
Responsabilidades:
- agendar verificacoes por fonte;
- controlar concorrencia;
- retry com backoff;
- dead-letter em falhas repetidas.

Tecnologia sugerida (MVP):
- BullMQ + Redis.

### 2.4 Banco de Dados
Responsabilidades:
- persistencia de usuarios, novels, capitulos, assinaturas e eventos;
- trilha de execucao do coletor;
- idempotencia em capitulos.

Tecnologia sugerida (MVP):
- PostgreSQL 16.

### 2.5 Notificacao
Responsabilidades:
- consolidar eventos relevantes por usuario;
- enviar canais configurados;
- registrar status de entrega.

Canal MVP:
- in-app (caixa de notificacoes no painel).

## 3. Fluxo de atualizacao

1. Usuario cadastra `novel_source` com URL.
2. API resolve conector e enfileira `collect_source`.
3. Hub coleta e parseia dados.
4. Normalizador padroniza valores.
5. Comparador detecta deltas.
6. Persistencia salva snapshot e novos capitulos.
7. Eventos (`NEW_CHAPTER`, `STATUS_CHANGED`, etc.) sao registrados.
8. Notificacao in-app e criada para usuarios assinantes.
9. Scheduler programa proxima coleta com base em atividade/falha.

## 4. Decisoes arquiteturais (MVP)

- Monolito modular para API + worker separado:
  reduz complexidade operacional inicial.
- Conectores plugaveis por fonte:
  acelera suporte incremental de novos sites.
- Event log no banco:
  facilita auditoria e replay de notificacoes.
- Idempotencia por hash de capitulo + URL canonica:
  evita duplicacao em coletas repetidas.

## 5. Riscos e mitigacoes

- Mudancas de HTML quebram parser:
  mitigacao: testes de contrato por conector + alarmes de taxa de falha.
- Bloqueio por rate limit externo:
  mitigacao: throttling por dominio, user-agent rotativo e retries controlados.
- Dados inconsistentes entre fontes:
  mitigacao: politicas de precedencia por fonte e normalizacao forte.

## 6. Fronteiras para fase 1

Incluido:
- ate 2 conectores;
- notificacao in-app;
- agenda fixa + ajuste simples por atividade.

Excluido:
- push/email;
- recomendacao;
- ranking/public pages;
- multi-idioma.
