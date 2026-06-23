-- Migracao inicial: grupos (clientes), usuarios e pecas.
-- gen_random_uuid() e nativo do Postgres 13+ (nao precisa de extensao).

-- GRUPOS = clientes. Cada grupo compra N cadeiras de acesso (max_seats).
create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  max_seats   integer not null default 1 check (max_seats >= 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- USUARIOS. Contas criadas apenas por admin. role: superadmin | admin | editor.
-- Desativar (active=false) libera cadeira sem apagar nada.
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references groups(id) on delete cascade,
  email         text unique not null,
  password_hash text not null,
  name          text not null,
  role          text not null default 'editor' check (role in ('superadmin','admin','editor')),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists idx_users_group on users(group_id);

-- PECAS. Galeria isolada por grupo.
-- IMPORTANTE: ao deletar um usuario, as pecas NAO somem.
--   author_id -> ON DELETE SET NULL  (referencia some, peca fica)
--   author_name -> snapshot do nome, preserva a atribuicao mesmo sem usuario.
create table if not exists pieces (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references groups(id) on delete cascade,
  author_id      uuid references users(id) on delete set null,
  author_name    text not null,
  title          text not null default 'Sem titulo',
  state_json     jsonb not null,
  thumbnail_path text,
  forked_from_id uuid references pieces(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_pieces_group on pieces(group_id);
create index if not exists idx_pieces_author on pieces(author_id);
