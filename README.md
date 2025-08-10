## Ask Me Anything (AMA)

Aplicação full‑stack para criar salas públicas de perguntas e respostas (AMA), permitindo que participantes enviem perguntas e reajam (curtir) para priorização. Inclui backend em Go (API REST + WebSocket) e frontend em React + Vite.

### Stack
- **Backend**: Go 1.24, `chi`, `gorilla/websocket`, `pgx`, `sqlc`, `godotenv`, migrações com [`jackc/tern`](https://github.com/jackc/tern)
- **Banco**: PostgreSQL
- **Frontend**: React 19, Vite 7, Tailwind CSS 4, React Router 7, TanStack Query 5, Sonner, Lucide Icons

---

## Arquitetura rápida
- `backend/` expõe a API em `http://localhost:8080/api` e um endpoint WS em `ws://localhost:8080/subscribe/{room_id}`.
- `frontend/` (Vite) consome a API REST e atualiza a UI em tempo real via WebSocket.

Principais rotas do backend:
- `POST /api/rooms` – cria sala
- `GET /api/rooms` – lista salas
- `POST /api/rooms/{roomId}/messages` – cria mensagem
- `GET /api/rooms/{roomId}/messages` – lista mensagens da sala
- `GET /api/rooms/{roomId}/messages/{messageId}` – busca uma mensagem
- `PATCH /api/rooms/{roomId}/messages/{messageId}/react` – incrementa reações
- `DELETE /api/rooms/{roomId}/messages/{messageId}/react` – decrementa reações
- `PATCH /api/rooms/{roomId}/messages/{messageId}/answer` – marca como respondida
- `GET /subscribe/{room_id}` (WS) – canal de eventos da sala

Eventos WS enviados pelo backend:
- `message_created` (com `{ id, message }`)
- `message_reaction_increased | message_reaction_decreased` (com `{ id, count }`)

---

## Requisitos
- Docker + Docker Compose
- Go 1.24+
- Node.js 20+ e npm 10+
- Ferramenta de migração [`jackc/tern`](https://github.com/jackc/tern) instalada no PATH (apenas para rodar migrações)
- `sqlc` é opcional (necessário só se for regenerar código a partir de SQL)

---

## Backend

### 1) Variáveis de ambiente
Crie o arquivo `backend/.env` com, por exemplo:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=ama
```

### 2) Subir PostgreSQL com Docker
O Compose já está em `backend/compose.yml` e usa as variáveis acima.

```sh
cd backend
docker compose -f compose.yml --env-file .env up -d
```

### 3) Rodar migrações
Certifique-se de ter o `tern` instalado. As migrações usam `backend/internal/store/pgstore/migrations` e config `tern.conf`.

```sh
cd backend
go run ./cmd/tools/terndotenv
```

Alternativas:
- `go generate ./...` (também executa `sqlc generate`; requer `sqlc` instalado)

### 4) Executar o servidor

```sh
cd backend
go run ./cmd/main.go
```
Servidor em `http://localhost:8080`.

### Endpoints (resumo)
- `POST /api/rooms` body: `{ "theme": string }` → `{ "id": string }`
- `GET /api/rooms` → `[ { id, theme } ]`
- `POST /api/rooms/{roomId}/messages` body: `{ "message": string }` → `{ "id": string }`
- `GET /api/rooms/{roomId}/messages` → `[ { id, room_id, message, reaction_count, answered } ]`
- `GET /api/rooms/{roomId}/messages/{messageId}` → `{ id, room_id, message, reaction_count, answered }`
- `PATCH /api/rooms/{roomId}/messages/{messageId}/react` → `{ reaction_count }`
- `DELETE /api/rooms/{roomId}/messages/{messageId}/react` → `{ reaction_count }`
- `PATCH /api/rooms/{roomId}/messages/{messageId}/answer` → `204 No Content`
- WS `GET /subscribe/{room_id}` → eventos JSON conforme seção acima

---

## Frontend

### 1) Variáveis de ambiente
Crie `frontend/.env`:

```env
VITE_API_URL=http://localhost:8080/api
```

Observação: o WebSocket está configurado em código para `ws://localhost:8080/subscribe`. Se alterar host/porta do backend, ajuste `frontend/src/hooks/use-messages-websockets.ts`.

### 2) Instalar e rodar

```sh
cd frontend
npm ci
npm run dev
```

Aplicação em `http://localhost:5173`.

### Scripts úteis
- `npm run dev` – desenvolvimento com HMR
- `npm run build` – build de produção
- `npm run preview` – serve o build localmente
- `npm run lint` – lint

---

## Modelo de dados (PostgreSQL)
- Tabela `rooms(id uuid pk, theme text)`
- Tabela `messages(id uuid pk, room_id uuid fk, message text, reaction_count bigint, answered boolean)`

Migrações em `backend/internal/store/pgstore/migrations`.

---

## Fluxo de uso
1) Crie uma sala na home do frontend informando um tema.
2) Compartilhe o link da sala.
3) Envie perguntas; participantes reagem para priorizar.
4) A lista é ordenada por número de reações; atualizações chegam via WebSocket em tempo real.

---

## Dicas e solução de problemas
- **Conexão ao banco**: garanta que `backend/.env` corresponda ao `compose.yml` e que o container do Postgres esteja “healthy”.
- **CORS**: o backend libera `http://*` e `https://*` por padrão; ajuste se necessário em `internal/api/api.go`.
- **WebSocket**: verifique firewall/porta 8080 aberta. Em produção, prefira `wss://` atrás de um proxy.
- **Geração de código SQLC**: só necessária se mudar SQL em `queries/`. Instale `sqlc` e rode `go generate ./...` na pasta `backend`.

---

## Licença
MIT.


