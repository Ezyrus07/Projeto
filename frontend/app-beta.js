(function(){
  const frameA = document.getElementById('betaFrameA');
  const frameB = document.getElementById('betaFrameB');
  const loader = document.getElementById('betaLoader');
  const avatar = document.getElementById('betaProfileBtn');
  const profileMenu = document.getElementById('betaProfileMenu');

  const searchToggle = document.querySelector('.pv-search-toggle');
  const searchPanel = document.getElementById('betaSidebarSearch');
  const searchBack = document.getElementById('betaSidebarSearchBack');
  const searchInput = document.getElementById('betaSidebarSearchInput');
  const searchGo = document.getElementById('betaSidebarSearchGo');

  const ROUTES = {
    '#/home': 'index.html',
    '#/search': 'negocios.html',
    '#/negocios': 'negocios.html',
    '#/notificacoes': 'notificacoes.html',
    '#/mensagens': 'mensagens.html?aba=conversas',
    '#/comunidades': 'comunidade.html',
    '#/pedidos': 'pedidos.html',
    '#/perfil': 'meuperfil.html',
    '#/mais': 'mais.html',
    '#/novidades': 'novidades.html',
    '#/anunciar': 'escolheranuncio.html'
  };

  function buildEmbedUrl(file){
    const u = new URL(file, location.href);
    if (!u.searchParams.has('embed')) u.searchParams.set('embed', '1');
    return u.toString();
  }

  function getFrames(){
    const active = frameA.classList.contains('is-active') ? frameA : frameB;
    const inactive = active === frameA ? frameB : frameA;
    return { active, inactive };
  }

  function normalizeHash(){
    const h = String(location.hash || '').trim();
    if (!h || h === '#') return '#/home';
    return h;
  }

  function routeKey(hash){
    return String(hash || '').split('?')[0] || '#/home';
  }

  function setActive(hash){
    const key = routeKey(hash);
    document.querySelectorAll('.sidebar-icones .item').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.menu a').forEach((a) => {
      a.classList.remove('active', 'ativo');
      a.removeAttribute('aria-current');
    });

    const link = document.querySelector(`.sidebar-icones a[data-route="${key}"]`);
    if (link) link.closest('.item')?.classList.add('active');

    const topMap = {
      '#/anunciar': 'Anunciar',
      '#/comunidades': 'Comunidades',
      '#/novidades': 'Novidades'
    };
    const label = topMap[key];
    if (label) {
      document.querySelectorAll('.menu a').forEach((a) => {
        if ((a.textContent || '').trim().startsWith(label)) {
          a.classList.add('active');
          a.setAttribute('aria-current', 'page');
        }
      });
    }

    document.querySelectorAll('.navbar-mobile a[href]').forEach((a) => {
      const href = String(a.getAttribute('href') || '');
      if (href.startsWith('#/')) a.classList.toggle('active', href === key);
    });
  }

  function openSidebarSearch(){
    if (!searchPanel) return;
    document.body.classList.add('beta-search-open');
    searchPanel.hidden = false;
    setTimeout(() => searchInput?.focus(), 40);
  }

  function closeSidebarSearch(){
    document.body.classList.remove('beta-search-open');
    if (searchPanel) searchPanel.hidden = true;
  }

  function goSidebarSearch(){
    const term = String(searchInput?.value || '').trim();
    closeSidebarSearch();
    if (!term) {
      location.hash = '#/negocios';
      return;
    }
    location.hash = '#/negocios';
    const targetFile = `busca.html?q=${encodeURIComponent(term)}`;
    const nextSrc = buildEmbedUrl(targetFile);
    const { active, inactive } = getFrames();
    loader.classList.add('is-on');
    inactive.onload = () => {
      injectEmbedStyleInFrame(inactive, targetFile);
      inactive.classList.add('is-active');
      active.classList.remove('is-active');
      loader.classList.remove('is-on');
    };
    inactive.src = nextSrc;
  }

  function route(){
    const hash = normalizeHash();
    const key = routeKey(hash);
    const target = ROUTES[key];
    setActive(hash);
    closeSidebarSearch();

    if (!target) {
      if (hash !== '#/home') location.hash = '#/home';
      return;
    }

    const nextSrc = buildEmbedUrl(target);
    const { active, inactive } = getFrames();
    if (active.src && active.src === nextSrc) return;

    loader.classList.add('is-on');
    inactive.onload = () => {
      injectEmbedStyleInFrame(inactive, target);
      inactive.classList.add('is-active');
      active.classList.remove('is-active');
      loader.classList.remove('is-on');
    };
    inactive.src = nextSrc;
    document.body.classList.remove('beta-drawer-open');
  }

  function injectEmbedStyleInFrame(targetFrame, targetFile){
    try{
      const doc = targetFrame.contentDocument;
      if(!doc) return;

      const removeSelectors = [
        'body > .sidebar-icones',
        'body > header.navbar-desktop',
        'body > header.navbar-mobile',
        'body > #overlay-menu',
        '.doke-mobile-header',
        '.doke-bottom-nav',
        '.doke-drawer',
        '.doke-drawer-backdrop',
        '.doke-bottom-spacer'
      ];
      removeSelectors.forEach((sel) => doc.querySelectorAll(sel).forEach((el) => el.remove()));

      let style = doc.getElementById('doke-beta-embed-style');
      if (!style) {
        style = doc.createElement('style');
        style.id = 'doke-beta-embed-style';
        doc.head.appendChild(style);
      }

      const isMensagens = String(targetFile || '').toLowerCase().includes('mensagens.html');
      style.textContent = `
        :root{
          --sidebar-width: 0px !important;
          --navbar-height-desktop: 0px !important;
          --navbar-height-mobile: 0px !important;
          --bottom-nav-height: 0px !important;
        }
        .sidebar-icones,
        .navbar-desktop,
        .navbar-mobile,
        .main-header,
        .header-container,
        .top-header,
        .topbar,
        header.main-header,
        header.navbar,
        header.navbar-desktop,
        body > header.navbar-desktop,
        body > header.navbar-mobile,
        body > aside.sidebar-icones,
        body > #overlay-menu,
        .bottom-nav,
        .doke-bottom-nav,
        .doke-mobile-header,
        #overlay-menu,
        .doke-bottom-spacer{
          display:none !important;
        }
        html, body{
          width:100% !important;
          max-width:100% !important;
          overflow-x:hidden !important;
        }
        body{
          margin:0 !important;
          padding-top:0 !important;
          padding-bottom:0 !important;
          min-height:100vh !important;
        }
        main,.main-content,.dp-wrap,.doke-page-shell{
          margin-left:0 !important;
          width:100% !important;
          max-width:none !important;
        }
        ${isMensagens ? `
        body.embed-chat .messenger-layout{
          position: relative !important;
          inset: auto !important;
          width: 100% !important;
          height: 100% !important;
          display: grid !important;
          grid-template-columns: 360px 1fr !important;
        }
        body.embed-chat .coluna-lista{
          display: block !important;
          width: 360px !important;
        }
        body.embed-chat #chat-placeholder{
          display: flex;
        }
        body.embed-chat #box-conversa-real{
          display: none;
        }
        ` : ''}
      `;

      if (isMensagens && typeof targetFrame.contentWindow?.trocarAba === 'function') {
        targetFrame.contentWindow.trocarAba('conversas');
      }
    }catch(_e){}
  }

  function hydrateAvatar(){
    if(!avatar) return;
    const keys = ['doke_usuario_perfil', 'usuarioLogado', 'perfil_usuario', 'doke_usuario_logado'];
    for(const k of keys){
      try{
        const raw = localStorage.getItem(k);
        if(!raw) continue;
        const obj = JSON.parse(raw);
        const src = String(obj?.foto || obj?.avatar || obj?.foto_url || '').trim();
        if(!src) continue;
        avatar.src = src;
        return;
      }catch(_e){}
    }
  }

  document.addEventListener('click', (ev) => {
    const anchor = ev.target instanceof Element ? ev.target.closest('a[href]') : null;
    if (!(anchor instanceof HTMLAnchorElement)) return;

    if (anchor.classList.contains('pv-search-toggle')) {
      ev.preventDefault();
      openSidebarSearch();
      return;
    }

    const href = String(anchor.getAttribute('href') || '').trim();
    if (!href.startsWith('#/')) return;
    ev.preventDefault();
    if (location.hash !== href) location.hash = href;
    else route();
  }, true);

  searchToggle?.addEventListener('click', (ev) => {
    ev.preventDefault();
    openSidebarSearch();
  });
  searchBack?.addEventListener('click', closeSidebarSearch);
  searchGo?.addEventListener('click', goSidebarSearch);
  searchInput?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      goSidebarSearch();
    }
    if (ev.key === 'Escape') closeSidebarSearch();
  });

  avatar?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    profileMenu?.classList.toggle('show');
  });

  document.addEventListener('click', (ev) => {
    if (!profileMenu || !avatar) return;
    const t = ev.target;
    if (!(t instanceof Element)) return;
    if (t === avatar || avatar.contains(t) || profileMenu.contains(t)) return;
    profileMenu.classList.remove('show');
  });

  window.addEventListener('hashchange', route);

  if (!location.hash || location.hash === '#') location.hash = '#/home';
  else route();

  hydrateAvatar();
})();
