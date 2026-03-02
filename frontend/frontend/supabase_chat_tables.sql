-- DOKE - Tabelas necessárias para o chat de pedidos ("pedidos" -> subcoleção "mensagens")
-- Rode no Supabase (SQL Editor). Ajuste o tipo do pedidoId caso sua tabela "pedidos" use text em vez de uuid.

-- 1) Mensagens de cada pedido (equivalente a: collection(db, "pedidos", pedidoId, "mensagens"))
create extension if not exists pgcrypto;
create table if not exists public.pedidos_mensagens (
  id uuid primary key default gen_random_uuid(),
  pedidoid uuid not null,
  senderuid text,
  texto text,
  tipo text,
  url text,
  timestamp timestamptz not null default now(),
  lido boolean default false,
  "lidoEm" jsonb not null default '{}'
);

-- Garante a coluna case-sensitive usada pelo app
alter table if exists public.pedidos_mensagens
  add column if not exists "lidoEm" jsonb default '{}';

-- 2) Índices para performance
do $$
declare col_pedido text;
begin
  select column_name into col_pedido
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'pedidos_mensagens'
    and column_name in ('pedidoId','pedidoid','pedido_id')
  order by case column_name when 'pedidoId' then 1 when 'pedidoid' then 2 else 3 end
  limit 1;
  if col_pedido is not null then
    execute format('create index if not exists pedidos_mensagens_pedidoid_idx on public.pedidos_mensagens (%I);', col_pedido);
  end if;
end $$;
create index if not exists pedidos_mensagens_timestamp_idx on public.pedidos_mensagens (timestamp);

-- Se o seu id em "pedidos" for TEXT e não UUID, troque a coluna acima:
-- alter table public.pedidos_mensagens alter column pedidoid type text using pedidoid::text;

-- 3) Garante colunas de triagem no pedido (usa jsonb)
alter table public.pedidos add column if not exists respostas_triagem jsonb;
alter table public.pedidos add column if not exists formulario_respostas jsonb;

-- (Opcional) RLS - ajuste conforme suas regras. Mantive aberto para evitar travar o fluxo no desenvolvimento.
-- alter table public.pedidos_mensagens enable row level security;
-- create policy "read_all_dev" on public.pedidos_mensagens for select using (true);
-- create policy "write_all_dev" on public.pedidos_mensagens for insert with check (true);
