-- DOKE
-- 1) Adiciona data de nascimento ao perfil base.
-- 2) Cria RPC para exclusao total de conta (perfil + auth user).
--
-- Execute no Supabase SQL Editor (uma vez por projeto).

alter table if exists public.usuarios
  add column if not exists data_nascimento date;

alter table if exists public.usuarios
  add column if not exists conta_status text;

alter table if exists public.usuarios
  add column if not exists conta_ativa boolean;

alter table if exists public.usuarios
  add column if not exists conta_excluida_em timestamptz;

alter table if exists public.usuarios
  add column if not exists conta_desativada_em timestamptz;

update public.usuarios
set
  conta_status = coalesce(conta_status, 'ativa'),
  conta_ativa = coalesce(conta_ativa, true)
where conta_status is null or conta_ativa is null;

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_deleted_profile boolean := false;
  v_deleted_auth boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Remove perfil (cascata para tabelas que referenciam public.usuários).
  delete from public.usuarios
  where uid = v_uid or id = v_uid;
  v_deleted_profile := found;

  -- Remove conta no auth.
  delete from auth.users
  where id = v_uid;
  v_deleted_auth := found;

  return jsonb_build_object(
    'ok', true,
    'uid', v_uid,
    'perfil_removido', v_deleted_profile,
    'auth_removido', v_deleted_auth
  );
exception
  when others then
    return jsonb_build_object(
      'ok', false,
      'error', sqlerrm
    );
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
