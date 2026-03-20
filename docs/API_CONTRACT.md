# Novel Hub - API Contract

Base URL versionada: `/api/v1`  
Swagger UI: `/api/docs`  
OpenAPI JSON: `/api/docs/json`

## Fonte de Verdade

O contrato operacional da API agora fica descrito no Swagger/OpenAPI exposto pela propria aplicacao.
Este arquivo permanece como referencia curta para integracao e descoberta.

## Autenticacao

- Formato: `Authorization: Bearer <jwt>`
- Excecoes: `POST /api/v1/auth/register`, `POST /api/v1/auth/login` e `GET /api/v1/assets/cover`
- Rotas de admin exigem JWT valido com papel `admin`

## Endpoints Cobertos

### Sistema

- `GET /health`

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

### Novels

- `POST /api/v1/novels`
- `GET /api/v1/novels`
- `GET /api/v1/novels/:novelId`
- `PATCH /api/v1/novels/:novelId/progress`
- `GET /api/v1/novels/:novelId/events`
- `GET /api/v1/novels/:novelId/chapters`

### Sources

- `PATCH /api/v1/sources/:sourceId`
- `POST /api/v1/sources/:sourceId/collect`

### Notifications

- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:id/read`

### Admin

- `GET /api/v1/admin/collector-runs`
- `GET /api/v1/admin/source-failures`

### Assets

- `GET /api/v1/assets/cover`

## Observacoes

- O `nginx` de producao ja encaminha `/api/*` para o servico da API, entao o Swagger continua acessivel sem ajuste extra de proxy.
- A documentacao descreve os contratos atuais da API; ela nao altera o comportamento das rotas.
