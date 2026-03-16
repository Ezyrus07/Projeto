-- DOKE | Painel Admin de Validacoes
-- Execute no Supabase SQL Editor.
-- Objetivo: permitir que contas admin analisem/aprovem/rejeitem validacoes.

-- 1) Marca de admin no perfil
alter table if exists public.usuarios
  add column if not exists "isAdmin" boolean not null default false;

-- 2) Campos de auditoria na validacao
alter table if exists public.profissional_validacao
  add column if not exists reviewed_by uuid;
alter table if exists public.profissional_validacao
  add column if not exists reviewed_at timestamptz;
alter table if exists public.profissional_validacao
  add column if not exists motivo_rejeicao text;

create index if not exists idx_prof_validacao_status on public.profissional_validacao(status);
create index if not exists idx_prof_validacao_updated_at on public.profissional_validacao(updated_at desc);

-- 3) Log (opcional) de decisoes de moderacao
create table if not exists public.profissional_validacao_logs (
  id bigserial primary key,
  reviewer_uid text,
  target_uid text,
  cpf text,
  status_to text,
  reason text,
  outcome text,
  created_at timestamptz not null default now()
);

alter table public.profissional_validacao_logs enable row level security;

-- 4) Funcao helper de admin (security definer para evitar recursao de policy)
create or replace function public.doke_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.usuarios u
    where (u.uid::text = auth.uid()::text or u.id::text = auth.uid()::text)
      and coalesce(u."isAdmin", false) = true
  );
$$;

revoke all on function public.doke_is_admin() from public;
grant execute on function public.doke_is_admin() to authenticated;

-- 5.1) Endurecimento: impedir autoescalacao de privilegios em usuarios
create or replace function public.usuarios_guard_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new."isAdmin", false) = true and not public.doke_is_admin() then
      raise exception 'Somente admin pode atribuir isAdmin=true';
    end if;
    return new;
  end if;

  if (
    coalesce(new."isProfissional", false) is distinct from coalesce(old."isProfissional", false)
    or coalesce(new."isAdmin", false) is distinct from coalesce(old."isAdmin", false)
  ) and not public.doke_is_admin() then
    raise exception 'Somente admin pode alterar campos sensiveis (isProfissional/isAdmin)';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_usuarios_guard_sensitive_fields on public.usuarios;
create trigger trg_usuarios_guard_sensitive_fields
before insert or update on public.usuarios
for each row execute function public.usuarios_guard_sensitive_fields();

-- 5.2) Endurecimento: status/revisao de validacao apenas admin
create or replace function public.prof_validacao_guard_status_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.doke_is_admin() then
    if coalesce(new.status, '') is distinct from coalesce(old.status, '') then
      raise exception 'Somente admin pode alterar status da validacao';
    end if;
    if coalesce(new.reviewed_by::text, '') is distinct from coalesce(old.reviewed_by::text, '')
       or coalesce(new.reviewed_at::text, '') is distinct from coalesce(old.reviewed_at::text, '')
       or coalesce(new.motivo_rejeicao, '') is distinct from coalesce(old.motivo_rejeicao, '') then
      raise exception 'Campos de revisao sao exclusivos de admin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prof_validacao_guard_status_fields on public.profissional_validacao;
create trigger trg_prof_validacao_guard_status_fields
before update on public.profissional_validacao
for each row execute function public.prof_validacao_guard_status_fields();

-- 6) Policies admin para profissional_validacao
drop policy if exists pv_select_admin on public.profissional_validacao;
create policy pv_select_admin
on public.profissional_validacao
for select
to authenticated
using (public.doke_is_admin());

drop policy if exists pv_update_admin on public.profissional_validacao;
create policy pv_update_admin
on public.profissional_validacao
for update
to authenticated
using (public.doke_is_admin())
with check (public.doke_is_admin());

-- 7) Policy admin para atualizar usuarios (liberar isProfissional)
drop policy if exists usuarios_admin_update on public.usuarios;
create policy usuarios_admin_update
on public.usuarios
for update
to authenticated
using (public.doke_is_admin())
with check (public.doke_is_admin());

-- 8) Policy admin para inserir logs
drop policy if exists pv_logs_admin_insert on public.profissional_validacao_logs;
create policy pv_logs_admin_insert
on public.profissional_validacao_logs
for insert
to authenticated
with check (public.doke_is_admin());

drop policy if exists pv_logs_admin_select on public.profissional_validacao_logs;
create policy pv_logs_admin_select
on public.profissional_validacao_logs
for select
to authenticated
using (public.doke_is_admin());

-- 9) Opcional (mais rigido): forcar RLS
alter table if exists public.profissional_validacao force row level security;
alter table if exists public.profissional_validacao_logs force row level security;
alter table if exists public.usuarios force row level security;

-- 10) (Manual) marcar usuario como admin:
-- update public.usuarios
-- set "isAdmin" = true
-- where uid::text = 'SEU_AUTH_UID_AQUI';
