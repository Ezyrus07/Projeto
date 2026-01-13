DOKE — PERFIL (V6) — INSTRUÇÕES RÁPIDAS

1) CONFIGURAR SUPABASE
- Abra supabase-init.js e cole:
  - Project URL
  - ANON PUBLIC KEY (JWT grande)
  (Settings > API)

2) CRIAR TABELAS (Opção 2)
- Rode o arquivo supabase_schema.sql no SQL Editor do Supabase.

3) STORAGE
- Crie um bucket chamado: perfil
- Deixe como "public" (ou ajuste policies do storage) para servir imagens e vídeos.

4) PÁGINAS
- meuperfil.html (perfil editável do profissional)
- perfil-usuario.html (perfil editável do cliente)
- perfil-profissional.html?id=... (perfil público do profissional)
- perfil-cliente.html?id=... (perfil público do cliente)

5) OBS
- As abas e botões PRO (Serviços/Portfólio/Vídeos curtos/Avaliações) só aparecem quando usuarios.isProfissional = true.
- A capa e a foto salvam no Storage e gravam a URL em usuarios.stats.media (e foto em usuarios.foto).

Se algo não salvar: verifique as políticas RLS da tabela usuarios (update pelo dono).
