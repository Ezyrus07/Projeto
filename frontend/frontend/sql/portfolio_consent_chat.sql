-- DOKE - Portfolio consent flow (chat/pedidos)
-- Run in Supabase SQL Editor.

begin;

-- ==============================
-- pedidos
-- ==============================
alter table if exists public.pedidos
  add column if not exists "finalizacaoModo" text,
  add column if not exists "finalizacaoMediaUrl" text,
  add column if not exists "finalizacaoMediaTipo" text,
  add column if not exists "finalizacaoMediaNome" text,
  add column if not exists "finalizacaoAntesUrl" text,
  add column if not exists "finalizacaoAntesTipo" text,
  add column if not exists "finalizacaoAntesNome" text,
  add column if not exists "finalizacaoDepoisUrl" text,
  add column if not exists "finalizacaoDepoisTipo" text,
  add column if not exists "finalizacaoDepoisNome" text,
  add column if not exists "portfolioConsentStatus" text,
  add column if not exists "portfolioConsentRequestedAt" timestamptz,
  add column if not exists "portfolioConsentRequestedBy" text,
  add column if not exists "portfolioConsentDecisionAt" timestamptz,
  add column if not exists "portfolioConsentDecisionBy" text,
  add column if not exists "portfolioConsentMsgId" text,
  add column if not exists "portfolioAddedAt" timestamptz,
  add column if not exists "portfolioAddedBy" text,
  add column if not exists "portfolioItemId" text;

-- Optional compatibility alias for legacy payload normalization
alter table if exists public.pedidos
  add column if not exists dataatualizacao timestamptz;

-- ==============================
-- pedidos_mensagens
-- ==============================
alter table if exists public.pedidos_mensagens
  add column if not exists "status" text,
  add column if not exists "targetUid" text,
  add column if not exists "mediaUrl" text,
  add column if not exists "mediaType" text,
  add column if not exists "mediaName" text,
  add column if not exists "beforeUrl" text,
  add column if not exists "beforeType" text,
  add column if not exists "beforeName" text,
  add column if not exists "afterUrl" text,
  add column if not exists "afterType" text,
  add column if not exists "afterName" text,
  add column if not exists "decidedAt" timestamptz,
  add column if not exists "decidedBy" text;

commit;
