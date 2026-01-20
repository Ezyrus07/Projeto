-- DOKE - Tabelas necessárias para o chat de pedidos ("pedidos" -> subcoleção "mensagens")
-- Rode no Supabase (SQL Editor). Ajuste o tipo do pedidoId caso sua tabela "pedidos" use text em vez de uuid.

-- 1) Mensagens de cada pedido (equivalente a: collection(db, "pedidos", pedidoId, "mensagens"))
create extension if not exists pgcrypto;
create table if not exists public.pedidos_mensagens (
  id uuid primary key default gen_random_uuid(),
  "pedidoId" uuid not null,
  "senderUid" text,
  texto text,
  tipo text,
  url text,
  timestamp timestamptz not null default now(),
  lido boolean default false
);

-- 2) Índices para performance
create index if not exists pedidos_mensagens_pedidoId_idx on public.pedidos_mensagens ("pedidoId");
create index if not exists pedidos_mensagens_timestamp_idx on public.pedidos_mensagens (timestamp);

-- Se o seu id em "pedidos" for TEXT e não UUID, troque a coluna acima:
-- alter table public.pedidos_mensagens alter column "pedidoId" type text using "pedidoId"::text;

-- (Opcional) RLS - ajuste conforme suas regras. Mantive aberto para evitar travar o fluxo no desenvolvimento.
-- alter table public.pedidos_mensagens enable row level security;
-- create policy "read_all_dev" on public.pedidos_mensagens for select using (true);
-- create policy "write_all_dev" on public.pedidos_mensagens for insert with check (true);
