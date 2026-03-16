# Home app-v2 — auditoria de binds quebráveis

## Eventos/binds frágeis encontrados

1. `script.js` — bloco principal em `document.addEventListener("DOMContentLoaded", ...)`.
   - Risco: em navegação SPA do app-v2, esse bloco roda só no primeiro load real do documento.
   - Impacto na home: CEP sync, histórico de busca, deep-link de modal (`post/comment/reply`), timeouts de fallback de skeleton e alguns carregamentos condicionais podem não reexecutar ao remontar a home.
   - Correção aplicada: a home nativa passou a inicializar no `mount` os binds de CEP, resiliência de skeleton e deep-link de modal.

2. `index.html` — portalização do dropdown de busca por script inline no final da página.
   - Risco: o bind é feito uma vez sobre nós do DOM antigo; ao remontar a home no shell, os nós mudam.
   - Correção aplicada: bind refeito em `app-v2/pages/home.js` via `bindHomeSearch(page, on)` com teardown.

3. `index.html` — manipulação do estado visual de busca/filtros fora do ciclo do módulo.
   - Risco: listeners sobrevivem ao DOM antigo e podem referenciar elementos desconectados.
   - Correção aplicada: home.js centraliza os listeners em escopo da página e remove tudo no `unmount`.

4. `script.js` — deep-link de publicação/modais dentro do `DOMContentLoaded`.
   - Risco: `?post=...&comment=...` deixa de abrir o modal ao voltar para a home via router.
   - Correção aplicada: mount da home agora reexecuta a abertura pendente de modal.

5. `script.js` — fallback de seções em skeleton via `setTimeout` criado no load inicial.
   - Risco: na remontagem da home, o timeout antigo não cobre o novo DOM.
   - Correção aplicada: timeout agora é reinstalado no mount da home e limpo no `unmount`.

6. `script.js` — sincronização dos inputs de CEP no `DOMContentLoaded`.
   - Risco: inputs novos renderizados pela shell v2 ficam sem máscara/sync/prefill.
   - Correção aplicada: mount da home rebinda `inputCep`, `cepOrcamento`, `cepEndereco` e `cepBusca`.

## Eventos ainda sensíveis, mas mitigados

1. Carregadores globais (`carregarCategorias`, `carregarReelsHome`, `carregarFeedGlobal`, `carregarStoriesGlobal`, `carregarProfissionaisIndex`, `carregarFiltrosLocalizacao`, `carregarAnunciosDoFirebase`).
   - Situação: já eram chamados por `hydrateHome(page)`.
   - Observação: continuam dependendo de funções globais legadas, mas agora sua execução está acoplada ao mount do módulo.

2. Re-hidratação PJAX do fim de `script.js` em `window.addEventListener("doke:page-ready", ...)`.
   - Situação: continua funcionando como rede de segurança.
   - Observação: deixei a home emitir também `doke:page-mount` para futuras migrações mais granulares.

## Próxima correção recomendada

Extrair do bloco de `DOMContentLoaded` de `script.js` uma função pública e idempotente, por exemplo `window.__dokeBootHomeDom(pageRoot)`, para remover duplicidade entre legado e `app-v2/pages/home.js`.
