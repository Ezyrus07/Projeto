# APPV2 bulk migration — phase 6

## Rotas tiradas da bridge genérica nesta fase
- `login.html`
- `cadastro.html`
- `explorar.html`
- `estatistica.html`
- `admin-validacoes.html`

## O que mudou
- nova camada `utility-pages.js` para autenticação, descoberta, estatísticas e operação administrativa
- `app-v2/app-main.js` atualizado para registrar essas rotas fora da `native-bridge`
- `styles.css` ampliado com uma superfície visual própria para esse bloco

## Ganho real
- essas páginas agora entram em uma camada nativa dedicada do app-v2
- hero, pills, skeleton e superfície ficaram consistentes com as fases anteriores
- o conteúdo legado central continua reaproveitado, mas não fica mais preso à bridge genérica

## O que continua pendente
- portabilidade funcional fina de formulários, filtros, ações administrativas e integrações profundas
- ainda restam na `native-bridge` as rotas:
  - `negocios.html`
  - `acompanhamento-profissional.html`
  - `empresas.html`
  - `meuempreendimento.html`
  - `negocio.html`
  - `perfil-empresa.html`
  - `sobre-doke.html`
