DOKE — Dev server (sem CORS)
==============================

Se mesmo com CORS configurado no Supabase o navegador continua bloqueando,
use este servidor local com proxy. Ele elimina CORS porque o browser passa a
falar com a MESMA origem (localhost) e o Node encaminha para o Supabase.

Como usar (Windows / Mac / Linux)
---------------------------------
1) Feche o Live Server (porta 5500) no VS Code
2) Abra um terminal dentro da pasta do projeto
3) Rode:

   node doke-devserver.js

4) Abra no navegador:
   http://localhost:5500/index.html

Obs
---
- Não precisa instalar nada (sem npm install).
- O proxy encaminha:
  /rest/v1/*, /auth/v1/*, /storage/v1/*, /functions/v1/*
- Para trocar a porta:
  PORT=5501 node doke-devserver.js
