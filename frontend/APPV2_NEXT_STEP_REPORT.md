# App-v2 — próxima rodada

## O que entrou
- `historico.html` agora abre um módulo nativo do `app-v2`
- `dadospessoais.html` agora permite salvar dados básicos no `localStorage`
- `enderecos.html` agora permite adicionar e remover endereços no módulo nativo
- `pagamentos.html` agora permite cadastrar cartão básico no módulo nativo
- `senha.html` agora tem validação local simples com feedback visual

## Correção estrutural importante
As seguintes rotas já tinham módulo nativo, mas ainda eram sobrescritas pelo fallback de `legacy-html` em `app-v2/app-main.js`:
- `dadospessoais.html`
- `enderecos.html`
- `pagamentos.html`
- `senha.html`
- `preferencia-notif.html`
- `idioma.html`
- `privacidade.html`

Isso foi corrigido nesta rodada.

## Próximas melhores candidatas
1. `historico.html` aprofundar filtros e origem real dos dados
2. `ajuda.html` ligar contatos/canais reais
3. `comunidade.html` iniciar migração por listagem e filtros
4. `meuperfil.html` iniciar migração por hero, resumo e tabs
