# Plano — Gerador de Mapas multiusuário (self-hosted para redações)

## O quê
Transformar o gerador (hoje site estático + 1 função serverless) num serviço hospedado em servidor próprio, com:

- **Login/senha por usuário** — contas criadas só pelo admin.
- **Galeria por grupo** — cada cliente é um grupo; todos do grupo veem todas as peças do grupo.
- **Editar / duplicar / reexportar** — qualquer usuário do grupo abre, edita ou clona uma peça e reexporta o JPG.

## Modelo comercial: grupos e cadeiras
Cada **cliente = um grupo**. O grupo compra **N cadeiras de acesso** (`max_seats`) e o admin cria usuários dentro do grupo até esse limite. Peças e galeria são isoladas por grupo (um grupo nunca vê o acervo de outro). A cobrança em si fica fora de escopo neste momento — o que entra agora é o **controle de cadeiras**: bloquear criação de usuário quando o grupo atinge o limite de ativos.

---

## Stack
Mantém o frontend atual (HTML/CSS/JS puro + Mapbox GL) e adiciona um backend Node:

- **App**: Node.js + Fastify (ou Express). Serve o frontend estático e a API.
- **Banco**: PostgreSQL.
- **Storage de thumbnails/exports**: volume em disco no início (servido pelo backend); migrável para MinIO/S3 depois.
- **Auth**: cookie de sessão `httpOnly`+`secure`, senha com hash `argon2`/`bcrypt`, proteção CSRF e rate limit no login.
- **Infra**: Docker Compose (app + postgres) atrás de Nginx com TLS (Let's Encrypt). Backups do Postgres + do volume de thumbnails.

Por que Node: o frontend já é JS e a função `api/mapbox-token.js` já é Node — reaproveita conhecimento e ferramentas.

---

## Modelo de dados
- **groups** (clientes): `id`, `name`, `slug`, `max_seats` (cadeiras contratadas), `active`, `created_at`
- **users**: `id`, `group_id`, `email` (único), `password_hash`, `name`, `role` (`admin`|`editor`), `active`, `created_at`
- **pieces** (peças): `id`, `group_id`, `author_id`, `title`, `state_json` (config das cenas), `thumbnail_path`, `forked_from_id` (nullable — linhagem de duplicação), `created_at`, `updated_at`

Galeria por grupo = filtro `WHERE group_id = :group` em todas as queries de peças.
Controle de cadeiras = ao criar usuário, validar `COUNT(users ativos do grupo) < groups.max_seats`.

Há dois níveis de admin: **super-admin** (você — cria grupos, define `max_seats`) e **admin do grupo** (gerencia usuários dentro das cadeiras do próprio grupo).

---

## Mudança-chave no frontend: serializar o estado
Hoje a "peça" vive só na memória (array `scenes` + campos do formulário) e o app só exporta JPG. É o ponto mais delicado do trabalho. Precisa de duas funções em `app.js`:

- `serializeState()` → JSON com: cenas (centro/zoom/bearing/pitch/estilo do mapa, marcadores, desenhos, formas, estilo de marcador), título, deck e número de cenas.
- `applyState(json)` → reconstrói formulário + cenas + mapa a partir do JSON.

No salvar, reaproveita o canvas de export existente para gerar um thumbnail (JPG reduzido) e subir junto.

---

## API
**Auth**: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
**Super-admin**: `POST /api/admin/groups`, `PATCH /api/admin/groups/:id` (ajustar `max_seats`/desativar)
**Admin do grupo**: `POST /api/admin/users` (valida cadeiras disponíveis), `PATCH /api/admin/users/:id` (desativar libera cadeira)
**Peças**:
`GET /api/pieces` (galeria da redação, com thumbnails) ·
`GET /api/pieces/:id` (carrega `state_json`) ·
`POST /api/pieces` (salvar nova) ·
`PUT /api/pieces/:id` (atualizar) ·
`POST /api/pieces/:id/duplicate` (fork) ·
`DELETE /api/pieces/:id` (opcional)

`GET /api/mapbox-token` continua, mas agora só responde a usuário autenticado.

**Edição concorrente**: como "todos editam", começar com *last-write-wins* usando `updated_at` (avisa se alguém salvou por cima) ou incentivar "duplicar para editar". Colaboração em tempo real fica fora de escopo.

---

## UI nova
- Tela de **login**.
- **Galeria**: grade de thumbnails com título, autor e data; botões Abrir, Duplicar, Excluir.
- Editor atual ganha botões **Salvar** e **Salvar como nova** (duplicar) ao lado do Exportar JPG.
- **Painel de admin** simples (ou CLI) para criar/desativar usuários e redações.

---

## Fases de entrega
1. **Backend base**: Docker Compose, Postgres, migrações, Fastify servindo o estático; `mapbox-token` protegido.
2. **Auth + admin**: login/logout/me, hash de senha, grupos com `max_seats`, criação de usuários com validação de cadeiras (CLI de seed para o primeiro super-admin + página admin mínima).
3. **Serialização**: `serializeState`/`applyState` + geração de thumbnail no salvar.
4. **Peças + galeria**: API de peças e a UI de galeria (abrir/editar/duplicar/reexportar).
5. **Deploy**: VPS, Nginx, TLS, backups e variáveis de ambiente.

---

## Riscos / pontos de atenção
- **Serialização** é o maior esforço: o estado hoje está acoplado ao DOM; vai precisar de refatoração cuidadosa e testes (salvar → recarregar → exportar idêntico).
- **Segurança**: token do Mapbox nunca exposto a anônimo; HTTPS obrigatório; rate limit no login; segredos em env.
- **Custo Mapbox**: mais usuários = mais carregamentos de mapa; vale monitorar a cota da conta.
- **Concorrência**: definir cedo entre last-write-wins x duplicar-para-editar evita retrabalho.

## Próximo passo
Escopo e stack confirmados (galeria por grupo, cadeiras, Node/Postgres/Docker). Posso partir para a **Fase 1** (backend base + Docker Compose + Postgres + mapbox-token protegido).
