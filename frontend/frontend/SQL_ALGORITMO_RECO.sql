-- Doke - Algoritmo (MVP) de recomendações para videos-curtos e publicações
-- Executar no Supabase SQL Editor.

-- 1) Eventos de engajamento (tracking)
create table if not exists public.doke_engagement_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  content_type text not null check (content_type in ('videos_curtos','publicacoes')),
  content_id text not null,
  event_type text not null,
  watch_time_ms bigint null,
  duration_ms bigint null,
  meta jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists doke_eng_events_user_idx on public.doke_engagement_events (user_id, created_at desc);
create index if not exists doke_eng_events_content_idx on public.doke_engagement_events (content_type, content_id, created_at desc);
create index if not exists doke_eng_events_type_idx on public.doke_engagement_events (event_type, created_at desc);

-- 2) Métricas agregadas por conteúdo (para ranking)
create table if not exists public.doke_content_metrics (
  content_type text not null check (content_type in ('videos_curtos','publicacoes')),
  content_id text not null,
  impressions bigint not null default 0,
  views bigint not null default 0,
  completes bigint not null default 0,
  watch_time_ms bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (content_type, content_id)
);

create index if not exists doke_metrics_updated_idx on public.doke_content_metrics (updated_at desc);

-- 3) Interesses do usuário (tags/categorias) - simples e barato
create table if not exists public.doke_user_interest (
  user_id text not null,
  tag text not null,
  weight numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, tag)
);

create index if not exists doke_interest_user_idx on public.doke_user_interest (user_id, weight desc);

-- 4) Função para upsert + incrementar métricas
create or replace function public.doke_increment_metrics(
  p_content_type text,
  p_content_id text,
  p_impressions bigint,
  p_views bigint,
  p_completes bigint,
  p_watch_time_ms bigint,
  p_likes bigint,
  p_comments bigint,
  p_shares bigint
) returns void
language plpgsql
as $$
begin
  insert into public.doke_content_metrics as m(
    content_type, content_id, impressions, views, completes, watch_time_ms, likes, comments, shares, updated_at
  ) values (
    p_content_type, p_content_id,
    greatest(0, p_impressions), greatest(0, p_views), greatest(0, p_completes),
    greatest(0, p_watch_time_ms), greatest(0, p_likes), greatest(0, p_comments), greatest(0, p_shares), now()
  )
  on conflict (content_type, content_id)
  do update set
    impressions = m.impressions + greatest(0, p_impressions),
    views = m.views + greatest(0, p_views),
    completes = m.completes + greatest(0, p_completes),
    watch_time_ms = m.watch_time_ms + greatest(0, p_watch_time_ms),
    likes = m.likes + greatest(0, p_likes),
    comments = m.comments + greatest(0, p_comments),
    shares = m.shares + greatest(0, p_shares),
    updated_at = now();
end;
$$;

-- 5) Função para atualizar interesses do usuário (tags vindo em meta.tags = ['pintura','encanador',...])
create or replace function public.doke_increment_interest(
  p_user_id text,
  p_tags jsonb,
  p_delta numeric
) returns void
language plpgsql
as $$
declare
  t text;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    return;
  end if;
  if p_tags is null then
    return;
  end if;

  for t in select jsonb_array_elements_text(p_tags)
  loop
    t := lower(trim(t));
    if length(t) = 0 then continue; end if;

    insert into public.doke_user_interest as ui(user_id, tag, weight, updated_at)
    values (p_user_id, t, greatest(0, p_delta), now())
    on conflict (user_id, tag)
    do update set
      weight = greatest(0, ui.weight + p_delta),
      updated_at = now();
  end loop;
end;
$$;

-- 6) Trigger: ao inserir evento, atualiza métricas e (se aplicável) interesses
create or replace function public.doke_on_engagement_event()
returns trigger
language plpgsql
as $$
declare
  ct text;
  cid text;
  ev text;
  wt bigint;
  dur bigint;
  tags jsonb;
  interest_delta numeric;
begin
  ct := new.content_type;
  cid := new.content_id;
  ev := new.event_type;
  wt := coalesce(new.watch_time_ms, 0);
  dur := coalesce(new.duration_ms, 0);
  tags := null;
  if new.meta ? 'tags' then
    tags := new.meta->'tags';
  end if;

  -- Métricas
  if ev = 'impression' then
    perform public.doke_increment_metrics(ct, cid, 1, 0, 0, 0, 0, 0, 0);
  elsif ev = 'view_start' then
    perform public.doke_increment_metrics(ct, cid, 0, 1, 0, 0, 0, 0, 0);
  elsif ev = 'watch_time' then
    perform public.doke_increment_metrics(ct, cid, 0, 0, 0, wt, 0, 0, 0);
  elsif ev = 'view_complete' then
    perform public.doke_increment_metrics(ct, cid, 0, 0, 1, 0, 0, 0, 0);
  elsif ev = 'like' then
    perform public.doke_increment_metrics(ct, cid, 0, 0, 0, 0, 1, 0, 0);
  elsif ev = 'comment' then
    perform public.doke_increment_metrics(ct, cid, 0, 0, 0, 0, 0, 1, 0);
  elsif ev = 'share' then
    perform public.doke_increment_metrics(ct, cid, 0, 0, 0, 0, 0, 0, 1);
  end if;

  -- Interesses do usuário (tags)
  interest_delta := 0;
  if ev in ('view_complete') then
    interest_delta := 1.0;
  elsif ev in ('like','share') then
    interest_delta := 0.6;
  elsif ev in ('comment') then
    interest_delta := 0.8;
  end if;

  if interest_delta > 0 and tags is not null then
    perform public.doke_increment_interest(new.user_id, tags, interest_delta);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_doke_engagement_event on public.doke_engagement_events;
create trigger trg_doke_engagement_event
after insert on public.doke_engagement_events
for each row execute function public.doke_on_engagement_event();

-- 7) RLS (mínimo seguro)
alter table public.doke_engagement_events enable row level security;
alter table public.doke_content_metrics enable row level security;
alter table public.doke_user_interest enable row level security;

-- Eventos: usuário só insere/consulta os próprios eventos
create policy if not exists "doke_engagement_insert_own" on public.doke_engagement_events
for insert
to authenticated
with check (user_id = auth.uid()::text);

create policy if not exists "doke_engagement_select_own" on public.doke_engagement_events
for select
to authenticated
using (user_id = auth.uid()::text);

-- Métricas: leitura pública (para ranking). Escrita só via trigger (service role) ou postgres.
create policy if not exists "doke_metrics_select_all" on public.doke_content_metrics
for select
to anon, authenticated
using (true);

-- Interesses: usuário lê só os próprios
create policy if not exists "doke_interest_select_own" on public.doke_user_interest
for select
to authenticated
using (user_id = auth.uid()::text);

-- Interesses: atualização via trigger (a trigger roda como table owner). Bloqueia update direto do cliente.
revoke insert, update, delete on public.doke_user_interest from anon, authenticated;

