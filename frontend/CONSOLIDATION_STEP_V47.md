# Consolidation Step V47

- Limpeza de `login.html`: remove redirects inline agressivos e move o comportamento para `login-clean.js`.
- Novo `login-clean.css` com shell de autenticação isolado do shell principal.
- Limpeza de `meuperfil.html`: remove camadas antigas `profile-reset` e `meuperfil-v36`.
- Novo `meuperfil-page.js` para deduplicar o card de progresso mantendo o primeiro.
- Novo `meuperfil-page.css` para esconder apenas duplicatas.
