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

  const baseFile = String(file || 'index.html').split('?')[0].trim().toLowerCase();
  const normHref = (h) => String(h || '').trim().replace(/\s+$/,'').split('?')[0].toLowerCase();
  function isActive(target){
    return normHref(target) === baseFile;
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
  ${item('index.html','bx-home-alt','azul','Inicio')}
  <div class="item" id="pvSearchSidebarItem"><a href="#" class="pv-search-toggle" aria-label="Pesquisar"><i class="bx bx-search-alt-2 icon azul"></i><span>Pesquisar</span></a></div>
  ${item('negocios.html','bx-store','verde','Negocios')}
  ${item('notificacoes.html','bx-bell','azul','Notificacoes')}
  ${item('mensagens.html?aba=conversas','bx-message-rounded-dots','azul','Mensagens')}
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

  function getAuthProfile(){
    const keys = ['doke_usuario_perfil','usuarioLogado','perfil_usuario','doke_usuario_logado'];
    for (const k of keys){
      try{
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') return obj;
      }catch(_e){}
    }
    return null;
  }

  function applyAuthButtons(){
    const profile = getAuthProfile();
    const uid = String(profile?.uid || profile?.id || localStorage.getItem('doke_uid') || '').trim();
    const nome = String(profile?.nome || profile?.user || 'Perfil').trim() || 'Perfil';
    const foto = String(profile?.foto || profile?.avatar || profile?.foto_url || 'assets/Imagens/avatar.png').trim() || 'assets/Imagens/avatar.png';
    const isLogged = !!uid || !!profile;

    document.querySelectorAll('.navbar-desktop .botoes-direita, .navbar-mobile .botoes-direita').forEach((container) => {
      if (!(container instanceof HTMLElement)) return;
      if (!isLogged){
        container.innerHTML = '<a class="entrar" href="login.html">Entrar</a>';
        return;
      }
      container.innerHTML = `
        <div class="profile-container">
          <img class="profile-img-btn" src="${foto}" alt="${nome}" onerror="this.onerror=null;this.src='assets/Imagens/avatar.png';">
          <div class="dropdown-profile">
            <a class="dropdown-item" href="meuperfil.html"><i class='bx bx-user-circle'></i> Ver Perfil</a>
            <a class="dropdown-item" href="login.html"><i class='bx bx-exit'></i> Sair</a>
          </div>
        </div>
      `;
    });
  }

  function bindAuthDropdown(){
    if (window.__dokeDesktopShellDropBound) return;
    window.__dokeDesktopShellDropBound = true;
    document.addEventListener('click', (ev) => {
      const t = ev.target;
      if (!(t instanceof Element)) return;
      const btn = t.closest('.profile-img-btn');
      if (btn) {
        ev.preventDefault();
        const wrap = btn.closest('.profile-container');
        const drop = wrap?.querySelector('.dropdown-profile');
        if (!drop) return;
        document.querySelectorAll('.dropdown-profile.show').forEach((d) => { if (d !== drop) d.classList.remove('show'); });
        drop.classList.toggle('show');
        return;
      }
      if (!t.closest('.profile-container')) {
        document.querySelectorAll('.dropdown-profile.show').forEach((d) => d.classList.remove('show'));
      }
    }, true);
  }

  function normalizeTopMenuActive(){
    try{
      const groups = {
        anunciar: new Set(['escolheranuncio.html','selecionaranuncio.html','anunciar.html','anunciar-negocio.html','editar-anuncio.html']),
        comunidades: new Set(['comunidade.html','grupo.html']),
        novidades: new Set(['novidades.html'])
      };
      let target = baseFile;
      if (groups.anunciar.has(baseFile)) target = 'escolheranuncio.html';
      else if (groups.comunidades.has(baseFile)) target = 'comunidade.html';
      else if (groups.novidades.has(baseFile)) target = 'novidades.html';

      let activated = false;
      document.querySelectorAll('.navbar-desktop .menu a[href]').forEach((a) => {
        const raw = String(a.getAttribute('href') || '').trim();
        const href = normHref(raw);
        a.classList.remove('active','ativo');
        a.removeAttribute('aria-current');
        if (!activated && href && target && href === target) {
          a.classList.add('active');
          a.setAttribute('aria-current','page');
          activated = true;
        }
      });
    }catch(_e){}
  }

  function ensureSidebarSearchLite(){
    try{
      if (window.openDokeSidebarSearch) return;
      if (document.querySelector('script[src*="script.js"]')) return;
      if (document.querySelector('script[src*="doke-sidebar-search-lite.js"]')) return;
      const sidebar = document.querySelector('.sidebar-icones');
      if(!sidebar) return;
      const s = document.createElement('script');
      s.src = 'doke-sidebar-search-lite.js?v=20260305v1';
      s.async = true;
      document.head.appendChild(s);
    }catch(_e){}
  }

  function ensureCompactSidebarMode(){
    try{
      const desktop = window.matchMedia("(min-width:1025px)").matches;
      const body = document.body;
      if(!body) return;
      const sidebars = Array.from(document.querySelectorAll("aside.sidebar-icones, .sidebar-icones"));
      if (sidebars.length > 1){
        sidebars.slice(1).forEach((el) => { try { el.remove(); } catch(_e){} });
      }
      const sidebar = sidebars[0] || null;
      const cssId = "dokeSidebarCompactCss";
      if (desktop && sidebar){
        body.classList.add("has-doke-sidebar");
        if (!document.getElementById(cssId)){
          const link = document.createElement("link");
          link.id = cssId;
          link.rel = "stylesheet";
          link.href = "doke-sidebar-compact.css?v=20260306v1";
          document.head.appendChild(link);
        }
        return;
      }
      body.classList.remove("has-doke-sidebar");
    }catch(_e){}
  }

  function run(){
    ensureStyles();
    ensureShell();
    applyAuthButtons();
    bindAuthDropdown();
    normalizeTopMenuActive();
    ensureSidebarSearchLite();
    ensureCompactSidebarMode();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('pageshow', applyAuthButtons);
  window.addEventListener('resize', ensureCompactSidebarMode);
  window.addEventListener('doke:page-ready', applyAuthButtons);
  window.addEventListener('storage', (ev) => {
    if (!ev || !ev.key) return;
    if (String(ev.key).startsWith('doke_') || ev.key === 'usuarioLogado' || ev.key === 'perfil_usuario') {
      applyAuthButtons();
    }
  });
})();


