# pedidos.html -> app-v2/pages/orders.js

## HTML legado reaproveitado conceitualmente

- Hero com resumo de métricas (`Hoje`, `Em andamento`, `Urgentes`)
- Barra de busca principal
- Filtros por status em chips
- Lista de cards de pedidos
- Estado vazio quando não houver resultados

## O que mudou na versão nativa

- Removido acoplamento com `legacy-html.js`
- Estrutura refeita mobile first dentro da shell do `app-v2`
- Skeletons com `height: 280px` fixa para evitar layout shift
- Toolbar e cards renderizados por módulo JS nativo
- Ações de `Abrir chat` e `Detalhes` navegam pela rota v2, preservando shell fixa
- Fonte de dados local/Firestore portada do fluxo legado, sem carregar header/footer antigos
