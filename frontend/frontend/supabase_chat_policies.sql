-- DOKE — Chat (DEV) Policies
-- Rode no Supabase (SQL Editor) APENAS se você habilitou RLS.
-- Se suas tabelas estão como UNRESTRICTED, NÃO precisa rodar.
--
-- Objetivo (DEV):
-- - Leitura liberada para usuários autenticados
-- - Insert/Update permitido só se senderuid for do próprio usuário
--
-- Observação: usamos ::text para evitar erro "text = uuid" caso sua coluna seja TEXT em alguma tabela.

-- ============================================================
-- pedidos_mensagens
-- ============================================================
alter table public.pedidos_mensagens enable row level security;

drop policy if exists read_pedidos_mensagens_dev on public.pedidos_mensagens;
create policy read_pedidos_mensagens_dev
on public.pedidos_mensagens
for select
to authenticated
using (true);

drop policy if exists insert_pedidos_mensagens_own on public.pedidos_mensagens;
drop policy if exists update_pedidos_mensagens_own on public.pedidos_mensagens;

do $$
declare col_sender text;
begin
  select column_name into col_sender
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'pedidos_mensagens'
    and column_name in ('senderUid','senderuid','sender_uid')
  order by case column_name when 'senderUid' then 1 when 'senderuid' then 2 else 3 end
  limit 1;

  if col_sender is null then
    raise notice 'Coluna sender nao encontrada em pedidos_mensagens.';
  else
    execute format('create policy insert_pedidos_mensagens_own on public.pedidos_mensagens for insert to authenticated with check (%I::text = auth.uid()::text);', col_sender);
    execute format('create policy update_pedidos_mensagens_own on public.pedidos_mensagens for update to authenticated using (%I::text = auth.uid()::text) with check (%I::text = auth.uid()::text);', col_sender, col_sender);
  end if;
end $$;

-- ============================================================
-- conversas_mensagens
-- ============================================================
alter table public.conversas_mensagens enable row level security;

drop policy if exists read_conversas_mensagens_dev on public.conversas_mensagens;
create policy read_conversas_mensagens_dev
on public.conversas_mensagens
for select
to authenticated
using (true);

drop policy if exists insert_conversas_mensagens_own on public.conversas_mensagens;
drop policy if exists update_conversas_mensagens_own on public.conversas_mensagens;

do $$
declare col_sender text;
begin
  select column_name into col_sender
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'conversas_mensagens'
    and column_name in ('senderUid','senderuid','sender_uid')
  order by case column_name when 'senderUid' then 1 when 'senderuid' then 2 else 3 end
  limit 1;

  if col_sender is null then
    raise notice 'Coluna sender nao encontrada em conversas_mensagens.';
  else
    execute format('create policy insert_conversas_mensagens_own on public.conversas_mensagens for insert to authenticated with check (%I::text = auth.uid()::text);', col_sender);
    execute format('create policy update_conversas_mensagens_own on public.conversas_mensagens for update to authenticated using (%I::text = auth.uid()::text) with check (%I::text = auth.uid()::text);', col_sender, col_sender);
  end if;
end $$;
