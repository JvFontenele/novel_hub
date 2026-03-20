# Paperclip Log

## 2026-03-20

### Concluido
- Revisao do estado do repositorio (apenas visao de ideia inicial).
- Definicao arquitetural MVP em [ARCHITECTURE.md](./ARCHITECTURE.md).
- Especificacao de escopo e criterios de aceite em [MVP_SPEC.md](./MVP_SPEC.md).
- Contrato inicial de API em [API_CONTRACT.md](./API_CONTRACT.md).
- Schema inicial PostgreSQL em [DB_SCHEMA.sql](./DB_SCHEMA.sql).

### Proximo bloco recomendado
1. Bootstrap tecnico:
   - `apps/api` (Fastify + TypeScript);
   - `apps/worker` (BullMQ consumer);
   - `packages/shared` (tipos e eventos).
2. Migracoes SQL versionadas (ex.: Drizzle/Prisma/Knex).
3. Primeira feature ponta a ponta:
   - POST `/novels` cria source;
   - enfileira coleta;
   - grava `collector_run` e dados iniciais.
