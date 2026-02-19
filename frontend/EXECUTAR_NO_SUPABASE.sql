-- ============================================================
-- DOKE - CORREÇÃO COMPLETA DE POLÍTICAS RLS
-- ============================================================
-- Execute este SQL no Supabase > SQL Editor
-- Tempo estimado: 5 segundos
-- ============================================================

-- 1. HABILITAR ROW LEVEL SECURITY NA TABELA USUÁRIOS
-- ============================================================
ALTER TABLE IF EXISTS public.usuarios ENABLE ROW LEVEL SECURITY;


-- 2. REMOVER POLÍTICAS ANTIGAS (EVITA CONFLITOS)
-- ============================================================
DROP POLICY IF EXISTS "usuarios_upsert_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_authenticated" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_public" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_own" ON public.usuarios;


-- 3. CRIAR POLÍTICA DE LEITURA (SELECT)
-- ============================================================
-- Permite que usuários autenticados leiam qualquer perfil
-- (necessário para ver perfis de outros usuários, mensagens, etc)
CREATE POLICY "usuarios_select_authenticated"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (true);


-- 4. CRIAR POLÍTICA DE INSERÇÃO (INSERT)
-- ============================================================
-- Permite que usuário crie apenas o próprio perfil
CREATE POLICY "usuarios_insert_own"
  ON public.usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (uid::text = auth.uid()::text);


-- 5. CRIAR POLÍTICA DE ATUALIZAÇÃO (UPDATE)
-- ============================================================
-- Permite que usuário atualize apenas o próprio perfil
CREATE POLICY "usuarios_update_own"
  ON public.usuarios
  FOR UPDATE
  TO authenticated
  USING (uid::text = auth.uid()::text)
  WITH CHECK (uid::text = auth.uid()::text);


-- ============================================================
-- VERIFICAÇÃO (OPCIONAL - RODE DEPOIS PARA CONFIRMAR)
-- ============================================================
-- Descomente as linhas abaixo e execute para ver as políticas:
-- SELECT * FROM pg_policies WHERE tablename = 'usuários';


-- ============================================================
-- POLÍTICA ADICIONAL PARA LEITURA PÚBLICA (OPCIONAL)
-- ============================================================
-- ⚠️ DESCOMENTE APENAS SE QUISER QUE USUÁRIOS NÃO LOGADOS 
-- POSSAM VER PERFIS PÚBLICOS (ex: página de busca de profissionais)
-- 
-- CREATE POLICY "usuarios_select_public"
--   ON public.usuários
--   FOR SELECT
--   TO anon
--   USING (true);


-- ============================================================
-- MENSAGEM DE SUCESSO
-- ============================================================
-- Se você chegou até aqui sem erros, parabéns! ✅
-- As políticas RLS foram configuradas corretamente.
-- 
-- O que foi corrigido:
-- ✅ Usuários autenticados podem ler perfis
-- ✅ Usuários podem criar o próprio perfil no cadastro
-- ✅ Usuários podem editar apenas o próprio perfil
-- ✅ Bloqueado acesso não autorizado
--
-- Próximo passo: Limpar cache do navegador e testar o login!
