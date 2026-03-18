# Consolidation step v46

Pages consolidated in this step:
- comunidade.html
- pedidos.html
- notificacoes.html

Changes:
- removed legacy script.js from pedidos.html
- normalized site-core/page CSS+JS references to cons2 versions
- removed duplicate notificacoes-page include in notificacoes.html
- strengthened isolated page styles for communities, orders and notifications
- kept shell/auth includes intact to avoid reopening global regressions
