# Revisão de UX do app-v2

## O que estava inconsistente

- A transição do miolo entre rotas ainda parecia técnica demais: saía uma tela e entrava outra sem sensação de continuidade.
- Cards de pedidos, mensagens, notificações e resultados tinham microinterações diferentes ou inexistentes.
- Estados vazios não seguiam a mesma linguagem visual entre páginas.
- O carregamento era funcional, mas sem um feedback global claro durante navegação SPA.
- Alguns painéis carregavam conteúdo novo sem um estado visual comum de “atualizando”.

## O que foi corrigido

- Adicionado feedback global de navegação SPA com indicador discreto no header e estado `aria-busy` no miolo.
- Suavizada a troca de rotas com lift/fade consistente e saída menos abrupta da página anterior.
- Reduzido o aspecto de “bloco branco gigante” no loading do miolo, substituindo por placeholder mais curto e mais leve.
- Padronizados hover, focus-visible e elevação visual dos cards principais.
- Padronizados estados vazios com a mesma estrutura visual, borda, sombra e barra lateral de destaque.
- Adicionado feedback de “Atualizando” nos painéis nativos quando a página está em loading.
- Adicionado feedback de envio na composição de mensagens.

## Arquivos alterados

- `app-v2/app-main.js`
- `app-v2/core/router.js`
- `app-v2/styles.css`
- `app-v2/pages/orders.js`
- `app-v2/pages/orders.css`
- `app-v2/pages/messages.js`
- `app-v2/pages/messages.css`
- `app-v2/pages/notifications.js`
- `app-v2/pages/notifications.css`

## Observações

- Esta rodada melhora a sensação de produto no `app-v2` sem reescrever o legado que ainda é injetado na home e na busca.
- O próximo passo com maior impacto seria extrair componentes de card e estado vazio para um kit único reutilizado por todas as páginas nativas.
