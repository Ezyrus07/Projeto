# Consolidation sweep v44

Pages touched: meuperfil, comunidade, pedidos, notificacoes, mensagens.

What changed:
- Added shared `site-core.css` and `site-core.js` for common UI/loader/sidebar/profile cleanup.
- Removed direct `script.js` dependency from: meuperfil, comunidade, pedidos.
- Replaced ad-hoc page patch includes with page-specific files: perfil-page, comunidade-page, pedidos-page, notificacoes-page.
- Kept shell/auth scripts in place.

Goal:
- Reduce page-level chaos on the most problematic screens before deeper file deletion.
