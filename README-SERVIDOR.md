# Gerador de Mapas — servidor (Fase 1)

App agora é **buildado** (Vite empacota e minifica o front) e servido por um backend **Fastify**, com **Postgres** e **Docker**. O token do Mapbox sai por API só para usuário autenticado — nunca vai no bundle.

## Rodar local (desenvolvimento)
```bash
cp .env.example .env      # preencha MAPBOX_TOKEN e POSTGRES_PASSWORD
npm install
npm run dev               # Vite (5173) + API Fastify (3000) com proxy de /api
```
Abra http://localhost:5173.

## Build de produção
```bash
npm run build             # gera dist/ minificado
npm start                 # Fastify serve dist/ + API na porta 3000
```

## Subir tudo com Docker (recomendado no servidor)
```bash
cp .env.example .env      # defina MAPBOX_TOKEN, POSTGRES_PASSWORD, SESSION_SECRET
docker compose up -d --build
docker compose exec app npm run migrate   # cria as tabelas
```
App em http://localhost:3000 (coloque Nginx + TLS na frente em produção).

## Estrutura
- `app.js`, `index.html`, `styles.css` — front (entram no build do Vite)
- `server/` — Fastify (`index.js`), pool pg (`db.js`), auth placeholder (`auth.js`), runner de migração (`migrate.js`)
- `migrations/001_init.sql` — tabelas `groups`, `users`, `pieces`
- `Dockerfile`, `docker-compose.yml` — app + Postgres

## Primeiro acesso (criar o superadmin)
Depois de migrar, crie a conta inicial (única que não precisa de outro admin):
```bash
SEED_EMAIL=admin@jota.info SEED_PASSWORD='SuaSenhaForte' SEED_NAME='Admin' npm run seed:admin
# no Docker: docker compose exec app sh -c "SEED_EMAIL=... SEED_PASSWORD=... npm run seed:admin"
```
Depois entre em `/login.html`, vá em `/admin.html`, crie um **grupo** (cliente) com N cadeiras e adicione usuários.

## Endpoints da API
- `GET /api/health` · `GET /api/health/db` — saúde
- `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` — sessão
- `GET /api/mapbox-token` — token (exige login)
- `GET/POST/PATCH /api/admin/groups` — grupos e cadeiras (superadmin)
- `GET/POST/PATCH /api/admin/users` · `GET /api/admin/seats` — usuários (admin do grupo)
- `GET/POST /api/pieces` · `GET/PUT/DELETE /api/pieces/:id` · `POST /api/pieces/:id/duplicate` · `GET /api/pieces/:id/thumbnail` — peças (galeria por grupo)

## Páginas
- `/` editor (botões Salvar / Salvar como nova; abre peça via `/?piece=ID`)
- `/galeria.html` galeria do grupo (abrir, duplicar, excluir)
- `/login.html` login · `/admin.html` administração

## Notas
- Vulnerabilidades de `npm audit` restantes são de `vite`/`esbuild` (**só dev/build**); o runtime tem **0** (`npm audit --omit=dev`). O Docker roda `npm ci --omit=dev`.
- `api/mapbox-token.js` (função Vercel antiga) ficou obsoleto — pode ser removido; a rota agora vive no Fastify.
- Senhas com **scrypt** (sem dependência nativa). Sessão em **cookie httpOnly JWT** (defina `SESSION_SECRET`).
- Modelo de dados preserva peças ao remover usuário: `pieces.author_id` é `ON DELETE SET NULL` e há `author_name` (snapshot). Desativar usuário libera cadeira.

## Fase 3 (feita)
Estado da peça serializável (`window.serializeState`/`applyState`), thumbnail no salvar (`generatePieceThumbnail`) e API de peças por grupo (criar/abrir/editar/duplicar/excluir + thumbnail). Helpers de cliente `window.savePiece`/`loadPiece` prontos. Thumbnails em disco no volume `uploads` (env opcional `UPLOADS_DIR`, padrão `./uploads`).

## Fase 4 (feita)
Galeria (`/galeria.html`) com grade de thumbnails: abrir, duplicar e excluir (excluir só autor/admin). Editor ganhou Salvar / Salvar como nova e link para a galeria; abre peça por `/?piece=ID`. Fluxo testado fim a fim.

## Sistema completo
Login por usuário, grupos com cadeiras, galeria compartilhada por grupo, editar/duplicar/reexportar, peças preservadas ao remover usuário — tudo buildado (Vite) e servido pelo backend, pronto pra Docker. Próximos passos opcionais: deploy (Nginx+TLS), edição concorrente mais fina, paginação da galeria.
