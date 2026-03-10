# App-v2 bulk migration — fase 2

## O que entrou

- `comunidade.html` saiu da bridge genérica e passou a usar uma superfície social nativa do app-v2.
- `grupo.html` saiu da bridge genérica e passou a usar uma superfície social nativa do app-v2.
- `meuperfil.html` saiu da bridge genérica e passou a usar uma superfície social nativa do app-v2.
- `perfil-profissional.html` saiu da bridge genérica e passou a usar uma superfície social nativa do app-v2.
- a `native-bridge` agora expõe helpers reutilizáveis para futuras migrações em lote.

## Ganho real desta fase

- páginas sociais mais críticas deixaram de cair no mesmo wrapper genérico do lote inicial;
- header/sidebar/miolo agora entram com uma linguagem mais nativa e com skeleton melhor para essas rotas;
- conteúdo legado continua sendo reaproveitado, mas dentro de uma camada social dedicada;
- isso prepara a próxima etapa de correção fina por página.

## Ainda pendente

- portar comportamento profundo dessas páginas, principalmente tabs, filtros, modais e integrações mais frágeis;
- tirar `negocios.html` e perfis restantes da bridge genérica.
