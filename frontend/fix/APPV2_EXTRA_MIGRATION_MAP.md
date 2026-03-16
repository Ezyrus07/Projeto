# APP-V2 extra migration map

Páginas iniciadas nesta rodada além do menu lateral principal:
- novidades.html -> módulo nativo inicial (`app-v2/pages/news.js`)
- escolheranuncio.html -> módulo nativo inicial (`app-v2/pages/ad-choice.js`)
- ajuda.html -> módulo nativo inicial (`app-v2/pages/help.js`)
- carteira.html -> módulo nativo inicial (`app-v2/pages/wallet.js`)

Páginas ainda em `legacy-html` mapeadas no app-v2:
- negocios.html
- comunidade.html
- meuperfil.html
- dadospessoais.html
- enderecos.html
- pagamentos.html
- senha.html
- preferencia-notif.html
- idioma.html
- privacidade.html

Leitura estratégica:
- `dadospessoais`, `enderecos` e `preferencia-notif` são as próximas candidatas de menor risco.
- `meuperfil` continua sendo a página mais sensível e merece migração em fases.
- `negocios` tem alto reaproveitamento visual, mas você pediu para postergar.

- iniciadas versões nativas: dadospessoais, enderecos, preferencia-notif, idioma, privacidade, senha, pagamentos
- risco baixo/médio: estrutura já independente da shell, mas lógica profunda do legado ainda não foi portada
