(function(){
  const BLOCKED = new Set(['login.html','cadastro.html','senha.html','app-beta.html']);
  const file = String((location.pathname || '').split('/').pop() || 'index.html').toLowerCase();
  if (BLOCKED.has(file)) return;

  function ensureStyles(){
    const needs = [
      { rel:'stylesheet', href:'style.css?v=20260211v45' },
      { rel:'stylesheet', href:'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' }
    ];
    for (const n of needs){
      const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((el) => String(el.href || '').includes(n.href.replace(/^https?:\/\//,'')) || String(el.getAttribute('href')||'') === n.href);
      if (exists) continue;
      const l = document.createElement('link');
      l.rel = n.rel;
      l.href = n.href;
      document.head.appendChild(l);
    }
  }

  function isActive(target){
    return file === target;
  }

  function headerHtml(){
    return `
<header class="navbar-mobile" data-shell="desktop-injected">
  <div id="logo-mobile">
    <a href="index.html"><img src="assets/Imagens/doke-logo.png" alt="Doke"></a>
  </div>
  <div class="botoes-direita"><a class="entrar" href="login.html">Entrar</a></div>
</header>
<div id="overlay-menu" data-shell="desktop-injected" onclick="fecharMenuMobile && fecharMenuMobile()"></div>
<header class="navbar-desktop" data-shell="desktop-injected">
  <div id="logo-desktop"><a href="projeto.html"><img src="assets/Imagens/doke-logo.png" alt="Doke"></a></div>
  <nav class="menu">
    <div class="cep-wrapper">
      <a class="cep" href="#" id="linkCep" onclick="toggleCep && toggleCep(event)">
        <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"></path></svg>
        <span id="textoCepSpan">Informe seu CEP</span>
      </a>
      <div class="cep-popup" id="boxCep">
        <p>Digite seu CEP:</p>
        <div class="cep-input-group"><label class="sr-only" for="inputCep">CEP</label><input id="inputCep" maxlength="9" name="inputCep" placeholder="00000-000" type="text"><button onclick="salvarCep && salvarCep()">OK</button></div>
      </div>
    </div>
    <a href="escolheranuncio.html">Anunciar</a>
    <a href="comunidade.html">Comunidades <span class="badge-novo1">NOVO</span></a>
    <a href="novidades.html">Novidades</a>
  </nav>
  <div class="botoes-direita"><a class="entrar" href="login.html">Entrar</a></div>
</header>`;
  }

  function sidebarHtml(){
    const item = (href, icon, cls, label, extra='') => `<div class="item ${isActive(href) ? 'active' : ''}"><a href="${href}" ${extra}><i class="bx ${icon} icon ${cls}"></i><span>${label}</span></a></div>`;
    return `
<aside class="sidebar-icones" data-shell="desktop-injected">
  <div id="logo"><a href="index.html"><img src="assets/Imagens/doke-logo.png" alt="Logotipo da plataforma Doke" loading="lazy" decoding="async"></a></div>
  ${item('index.html','bx-home-alt','azul','Início')}
  <div class="item" id="pvSearchSidebarItem"><a href="#" class="pv-search-toggle" aria-label="Pesquisar"><i class="bx bx-search-alt-2 icon azul"></i><span>Pesquisar</span></a></div>
  ${item('negocios.html','bx-store','verde','Negócios')}
  ${item('notificacoes.html','bx-bell','azul','Notificações')}
  ${item('mensagens.html','bx-message-rounded-dots','azul','Mensagens')}
  ${item('pedidos.html','bx-package','verde','Pedidos')}
  ${item('comunidade.html','bx-group','verde','Comunidades')}
  <div class="item"><a href="#" onclick="if(window.irParaMeuPerfil){irParaMeuPerfil(event);}else{location.href='meuperfil.html';} return false;"><i class="bx bx-user icon verde"></i><span>Perfil</span></a></div>
  ${item('mais.html','bx-menu','azul','Mais')}
</aside>`;
  }

  function ensureShell(){
    const body = document.body;
    if (!body) return;

    if (!document.querySelector('.navbar-mobile')) {
      body.insertAdjacentHTML('afterbegin', headerHtml());
    }
    if (!document.querySelector('.sidebar-icones')) {
      const firstMain = body.querySelector('main, .container, .dp-wrap, .messenger-layout');
      if (firstMain) firstMain.insertAdjacentHTML('beforebegin', sidebarHtml());
      else body.insertAdjacentHTML('beforeend', sidebarHtml());
    }
  }

  function normalizeTopMenuActive(){
    const map = {
      'escolheranuncio.html': 'Anunciar',
      'anunciar.html': 'Anunciar',
      'comunidade.html': 'Comunidades',
      'novidades.html': 'Novidades'
    };
    const label = map[file];
    document.querySelectorAll('.navbar-desktop .menu a').forEach((a) => {
      a.classList.remove('active','ativo');
      a.removeAttribute('aria-current');
      if (!label) return;
      if ((a.textContent || '').trim().startsWith(label)) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  function run(){
    ensureStyles();
    ensureShell();
    normalizeTopMenuActive();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
