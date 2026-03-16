# APP-V2 — Migração em lote fase 4

## Rotas tratadas nesta fase
- `orcamento.html`
- `pagar.html`
- `pedido.html`
- `projeto.html`
- `resultado.html`

## O que mudou
- saíram da `native-bridge` genérica
- passaram a usar uma camada transacional própria no `app-v2`
- hero uniforme e contextual por fluxo
- skeleton com altura reservada para impedir salto de layout
- conteúdo legado central continua reaproveitado dentro da shell nativa

## Ganho real
- menos ruptura visual entre páginas transacionais
- melhor coerência com `pedidos`, `mensagens`, `notificacoes` e `mais`
- base mais segura para correções funcionais finas depois

## O que ainda não é final
- formulários, modais e integrações ainda podem depender de scripts legados específicos
- esta fase prioriza estrutura nativa, não portabilidade funcional completa de cada ação
