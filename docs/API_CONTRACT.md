# Novel Hub - API Contract (v0)

Base URL: `/api/v1`
Formato: JSON
Auth: Bearer JWT (exceto login/register)

## 1. Auth

### POST `/auth/register`
Request:
```json
{
  "name": "Joao",
  "email": "joao@example.com",
  "password": "strong-password"
}
```
Response `201`:
```json
{
  "user": { "id": "usr_123", "name": "Joao", "email": "joao@example.com" },
  "token": "jwt"
}
```

### POST `/auth/login`
Request:
```json
{
  "email": "joao@example.com",
  "password": "strong-password"
}
```
Response `200`:
```json
{
  "user": { "id": "usr_123", "name": "Joao", "email": "joao@example.com" },
  "token": "jwt"
}
```

## 2. Novels e Sources

### POST `/novels`
Cadastra/assina uma novel a partir da URL.
Request:
```json
{
  "sourceUrl": "https://example.com/novel/abc",
  "displayName": "My Favorite Novel"
}
```
Response `201`:
```json
{
  "novelId": "nov_123",
  "sourceId": "src_123",
  "status": "MONITORING"
}
```

### GET `/novels`
Lista novels do usuario.
Response `200`:
```json
{
  "items": [
    {
      "novelId": "nov_123",
      "title": "My Favorite Novel",
      "coverUrl": "https://...",
      "status": "ONGOING",
      "lastChapterNumber": 120,
      "lastReadChapterNumber": 110
    }
  ]
}
```

### GET `/novels/{novelId}`
Detalhe da novel + fontes.

### PATCH `/novels/{novelId}/progress`
Request:
```json
{
  "lastReadChapterNumber": 111
}
```
Response `200`:
```json
{
  "novelId": "nov_123",
  "lastReadChapterNumber": 111
}
```

### PATCH `/sources/{sourceId}`
Pausar/retomar monitoramento.
Request:
```json
{
  "monitoringEnabled": false
}
```

## 3. Capitulos e Eventos

### GET `/novels/{novelId}/chapters`
Query params: `page`, `pageSize`.

### GET `/novels/{novelId}/events`
Retorna eventos de mudanca para timeline da novel.

## 4. Notificacoes

### GET `/notifications`
Response `200`:
```json
{
  "items": [
    {
      "id": "ntf_123",
      "type": "NEW_CHAPTER",
      "novelId": "nov_123",
      "title": "Novo capitulo disponivel",
      "read": false,
      "createdAt": "2026-03-20T10:00:00Z"
    }
  ]
}
```

### PATCH `/notifications/{id}/read`
Marca notificacao como lida.

## 5. Admin (MVP interno)

### GET `/admin/collector-runs`
Lista execucoes recentes com status/tempo.

### GET `/admin/source-failures`
Lista fontes com alta taxa de erro.
