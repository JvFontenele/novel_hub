# Novel Hub - MVP Spec

## 1. Escopo do MVP

Entregar uma versao funcional para acompanhamento de novels com coleta automatica e notificacoes in-app.

## 2. Perfis

- Usuario final: acompanha novels e recebe atualizacoes.
- Operador/admin (interno): monitora saude do hub e falhas de coleta.

## 3. Funcionalidades prioritarias

### P0 (obrigatorio)
- cadastro/login de usuario;
- cadastrar novel por URL da fonte;
- listar favoritos do usuario;
- registrar progresso de leitura (ultimo capitulo lido);
- coletar metadados e capitulos por scheduler;
- detectar novos capitulos sem duplicacao;
- gerar notificacao in-app quando houver novo capitulo;
- pagina de historico de eventos por novel.

### P1 (importante)
- pausar/retomar monitoramento de uma fonte;
- configuracao de frequencia por novel;
- tela de falhas de coleta (admin).

### P2 (posterior)
- notificacao por email/push;
- merge de varias fontes para a mesma novel;
- regras avancadas de prioridade de fonte.

## 4. Criterios de aceite (P0)

1. Ao cadastrar URL valida, sistema cria `novel_source` e executa primeira coleta em ate 1 minuto.
2. Coleta que encontra capitulos novos gera evento `NEW_CHAPTER` e notificacao in-app para assinantes.
3. Coleta sem mudanca nao gera notificacao.
4. Falha de coleta nao sobrescreve dados anteriores.
5. Um mesmo capitulo nao pode ser duplicado para a mesma source.
6. Usuario consegue marcar ultimo capitulo lido e visualizar percentual simples de progresso.

## 5. NFRs (MVP)

- Disponibilidade alvo: 99.0% (ambiente unico).
- Tempo de resposta API (p95): < 500ms em endpoints de leitura.
- Tempo maximo da primeira coleta apos cadastro: 60s.
- Observabilidade minima:
  - logs estruturados;
  - metricas de sucesso/falha por conector;
  - tempo medio de coleta por dominio.

## 6. Roadmap de entrega

### Fase 1 - Fundacao (1 semana)
- schema banco;
- autenticacao;
- CRUD base de novels/sources;
- fila e job basico de coleta.

### Fase 2 - Inteligencia de coleta (1 semana)
- normalizacao + comparador;
- eventos;
- notificacao in-app;
- retry e dead-letter.

### Fase 3 - Painel e operacao (1 semana)
- dashboard usuario;
- historico de eventos;
- painel admin de falhas.
