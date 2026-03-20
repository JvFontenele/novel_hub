# 📚 Novel Hub — Sistema de Monitoramento de Novels

## 📌 Visão Geral

O **Novel Hub** é uma plataforma para gerenciamento e monitoramento de novels favoritas, com um sistema inteligente de coleta (hub) que acessa sites externos, extrai dados automaticamente e notifica o usuário sobre atualizações.

O sistema é composto por três pilares principais:

- 🖥️ Painel do usuário  
- 🧠 Hub coletor (scraper)  
- 🔔 Sistema de notificações 

# 🎯 Objetivo

- Centralizar acompanhamento de novels  
- Detectar novos capítulos automaticamente  
- Notificar usuários conforme preferência  
- Permitir controle de leitura  
- Unificar dados de múltiplas fontes  

# 🏗️ Arquitetura

## Componentes

### Frontend (Painel)
- Dashboard  
- Lista de favoritos  
- Progresso de leitura  
- Histórico de atualizações  
- Configuração de notificações  

### API Principal
- Autenticação  
- CRUD de usuários  
- CRUD de novels  
- Notificações  
- Integração com hub  

### Hub Coletor
- Scraping  
- Parsing  
- Normalização  
- Comparação de dados  
- Geração de eventos  

### Scheduler / Queue
- Execução periódica  
- Controle de carga  
- Retry de falhas  

### Banco de Dados
- Persistência geral 

# 🔄 Fluxo do Sistema

1. Usuário adiciona URL da novel  
2. Sistema identifica fonte  
3. Hub coleta dados  
4. Dados são salvos  
5. Scheduler agenda verificações  
6. Hub coleta novamente  
7. Comparador detecta mudanças  
8. Eventos são gerados  
9. Notificações são enviadas  
10. Dashboard é atualizado  

# 🧠 Hub Coletor

## Responsabilidades

- Buscar HTML  
- Interpretar estrutura  
- Extrair dados  
- Normalizar  
- Comparar  
- Gerar eventos  


## 📥 Fetcher

- HTTP requests  
- Timeout  
- Retry  
- Headers  
- Rate limit  

---

## 🔍 Parser

Extrai:

- título  
- capa  
- sinopse  
- autor  
- status  
- capítulos  

## 🔄 Normalizador

Padroniza valores:

- "Ongoing" → ONGOING  
- "Completed" → COMPLETED  

---

## ⚖️ Comparador

Detecta:

- novos capítulos  
- mudanças de status  
- alterações de metadados  

---

## 📣 Eventos

- NEW_CHAPTER  
- NOVEL_UPDATED  
- STATUS_CHANGED  
- SOURCE_FAILED  

---

## 📜 Logger

- sucesso/falha  
- tempo de resposta  
- mudanças  
- erros  

---

# 📏 Regras de Negócio

1. Toda novel deve ter fonte  
2. Cada fonte possui conector próprio  
3. Dados devem ser normalizados  
4. Atualizações só com mudanças reais  
5. Novo capítulo gera evento obrigatório  
6. Falha não altera estado  
7. Respeitar rate limit  
8. Evitar duplicação  
9. Detectar quebra de scraping  
10. Frequência baseada na atividade  