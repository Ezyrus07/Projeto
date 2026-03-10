# Auditoria — filtros da home e da busca no app-v2

## O que estava quebrado

### Home
- Selects de localização (`estado`, `cidade`, `bairro`) dependiam do legado e não tinham sincronização estável no mount SPA.
- O botão **Aplicar Filtros** disparava o apply, mas o estado de localização não era normalizado antes da execução.
- Chips rápidos aplicavam classe visual, mas o estado de localização e persistência não eram consolidados junto com o restante dos filtros.
- Em navegação SPA, o estado dos selects podia voltar inconsistente quando a home remontava.
- A área de filtros no `index` ficava visualmente inconsistente com o shell v2 e não permanecia branca de forma garantida.

### Busca
- O drawer/sidebar de filtros abria, mas o módulo nativo não fazia um bind completo dos controles no ciclo de mount.
- O layout tinha `onchange` inline no HTML legado, mas isso não garantia consistência na remontagem SPA do `app-v2`.
- Os chips rápidos da sidebar e os chips da toolbar não eram sincronizados entre si.
- O select de ordenação espelhado na toolbar (`#dokeSortMirror`) não estava amarrado de forma robusta ao select principal.
- Checkboxes de filtros rápidos na toolbar não espelhavam corretamente o estado real dos checkboxes do painel.
- Localização (`estado`, `cidade`, `bairro`) podia ficar habilitada/desabilitada em estado incorreto após remontagem.
- Faltava um **botão Aplicar** real dentro do painel nativo da busca.

### Transição entre páginas
- O router removia a rota anterior cedo demais.
- Durante a navegação, o `main` mostrava um overlay/skeleton grande e claro, causando o “container branco enorme” antes do novo HTML entrar.

## Como foi corrigido

### Home
- Binds movidos para o mount da página em `app-v2/pages/home.js`.
- Normalização de estado dos selects de localização antes de qualquer apply.
- Persistência de localização dos filtros em `localStorage` para remontagem SPA estável.
- `Aplicar Filtros` agora normaliza + persiste + aplica em sequência.
- A área de filtros da home foi forçada para fundo branco no `app-v2/styles.css`.

### Busca
- Criei bind nativo completo em `app-v2/pages/search.js` para:
  - selects
  - campo de preço
  - radios
  - checkboxes
  - chips da sidebar
  - chips rápidos da toolbar
  - localização
  - ordenação espelhada
  - botão Aplicar
- Adicionei persistência de estado de filtros da busca em `localStorage`.
- Sincronização bidirecional entre `#filtroOrdenacao` e `#dokeSortMirror`.
- Sincronização visual dos quick chips com os checkboxes reais.
- Inclusão de botão **Aplicar filtros** sticky no fim da sidebar.
- Reidratação tardia do estado para cobrir carregamento assíncrono de opções de localização.

### Transição SPA
- O router agora monta a nova rota antes de remover a anterior.
- A rota anterior passa a sair com fade/translate curto, em vez de deixar o container vazio.
- O overlay grande branco do `main` durante `is-routing` foi neutralizado.
- A área principal do shell mantém fundo consistente durante a troca de páginas.

## Arquivos alterados
- `frontend/app-v2/pages/home.js`
- `frontend/app-v2/pages/search.js`
- `frontend/app-v2/core/router.js`
- `frontend/app-v2/styles.css`
- `frontend/app-v2/app-main.js`
