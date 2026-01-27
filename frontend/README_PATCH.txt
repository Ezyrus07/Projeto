DOKE - Patch Chat/Grupo (user only)

O que mudou:
- Header das mensagens mostra SOMENTE @user + hora (sem nome completo).
- Padronização via arquivos dedicados:
  - doke-chat-grupo-ui.css
  - doke-chat-grupo-ui.js
- SQL corrigido (usa coluna case-sensitive "comunidadeId" com aspas) em supabase_features.sql

Como aplicar:
1) Copie/coloque na mesma pasta:
   - doke-chat-grupo-ui.css
   - doke-chat-grupo-ui.js
2) Substitua chat.html e grupo.html por estes.
3) No Supabase SQL Editor: rode supabase_features.sql
4) No Supabase Realtime: habilite as tabelas que você for escutar (comunidade_posts, comunidade_post_reacoes).

Obs:
- senderUser deve ser salvo SEM '@'. Na UI ele aparece como @user.
