# APP-V2 Bulk Migration — Fase 3

## Rotas retiradas da bridge genérica nesta fase
- perfil.html
- perfil-cliente.html
- perfil-usuario.html
- feed.html
- publicacoes.html
- interacoes.html

## O que mudou
- Essas rotas passaram a usar a camada `social-pages.js` em vez da `native-bridge.js`.
- O miolo ganhou hero social uniforme, pills de contexto e skeleton de entrada mais estável.
- O conteúdo legado segue reaproveitado no centro, mas agora dentro de uma superfície social própria do app-v2.

## O que foi intencionalmente deixado de fora
- perfil-empresa.html
- negocios.html

## Ganho real desta fase
- Menos rotas críticas presas no wrapper genérico.
- Melhor coerência visual para páginas de perfil, feed e engajamento.
- Base melhor para correções finas posteriores em tabs, modais, filtros e integrações.
