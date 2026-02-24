
(function () {
  const shell = document.getElementById('settingsShell');
  if (!shell) return;

  const frame = document.getElementById('settingsFrame');
  const titleEl = document.getElementById('settingsTitle');
  const subEl = document.getElementById('settingsSubtitle');
  const overlay = document.getElementById('settingsDrawerOverlay');
  const burger = document.getElementById('settingsBurger');

  const SECTIONS = {
    dadospessoais: {
      page: 'dadospessoais.html',
      title: 'Dados pessoais',
      subtitle: 'Atualize suas informações básicas e de contato.'
    },
    enderecos: {
      page: 'endereços.html',
      title: 'Endereços',
      subtitle: 'Salve mais de um local e use no orçamento com 1 toque.'
    },
    senha: {
      page: 'senha.html',
      title: 'Segurança e senha',
      subtitle: 'Proteja sua conta e altere sua senha quando quiser.'
    },
    pagamentos: {
      page: 'pagamentos.html',
      title: 'Pagamentos',
      subtitle: 'Gerencie métodos de pagamento e suas preferências.'
    },
    'preferencia-notif': {
      page: 'preferencia-notif.html',
      title: 'Notificações',
      subtitle: 'Escolha o que você quer receber e quando.'
    },
    idioma: {
      page: 'idioma.html',
      title: 'Idioma',
      subtitle: 'Defina o idioma do app para melhorar sua experiência.'
    },
    privacidade: {
      page: 'privacidade.html',
      title: 'Privacidade',
      subtitle: 'Ajuste sua privacidade e preferências de mensagens.'
    },
    ajuda: {
      page: 'ajuda.html',
      title: 'Central de ajuda',
      subtitle: 'Encontre respostas rápidas e suporte.'
    },
    'sobre-doke': {
      page: 'sobre-doke.html',
      title: 'Sobre a Doke',
      subtitle: 'Informações do app, versão e links úteis.'
    }
  };

  function getSectionFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('section') || 'dadospessoais';
  }

  function setUrlSection(section, replace) {
    const url = new URL(window.location.href);
    url.searchParams.set('section', section);
    if (replace) history.replaceState({ section }, '', url.toString());
    else history.pushState({ section }, '', url.toString());
  }

  function setActiveNav(section) {
    const items = shell.querySelectorAll('[data-section]');
    items.forEach((a) => {
      a.classList.toggle('is-active', a.getAttribute('data-section') === section);
    });
  }

  function closeDrawer() {
    shell.classList.remove('drawer-open');
  }

  function openDrawer() {
    shell.classList.add('drawer-open');
  }

  function applySection(section, { push = false } = {}) {
    if (!SECTIONS[section]) section = 'dadospessoais';

    const meta = SECTIONS[section];
    if (titleEl) titleEl.textContent = meta.title;
    if (subEl) subEl.textContent = meta.subtitle;

    setActiveNav(section);

    if (frame) {
      const nextSrc = `${meta.page}?embed=1`;
      if (frame.getAttribute('src') !== nextSrc) frame.setAttribute('src', nextSrc);
    }

    if (push) setUrlSection(section, false);
    else setUrlSection(section, true);

    closeDrawer();
  }

  shell.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-section]');
    if (!a) return;
    e.preventDefault();
    const section = a.getAttribute('data-section');
    applySection(section, { push: true });
  });

  if (burger) burger.addEventListener('click', () => openDrawer());
  if (overlay) overlay.addEventListener('click', () => closeDrawer());

  window.addEventListener('popstate', () => {
    applySection(getSectionFromUrl(), { push: false });
  });

  // iframe auto-height
  window.addEventListener('message', (event) => {
    try {
      if (event.origin !== window.location.origin) return;
      if (!frame || event.source !== frame.contentWindow) return;
      const data = event.data || {};
      if (data.type !== 'doke:embedHeight') return;
      const h = Number(data.height);
      if (!Number.isFinite(h) || h <= 0) return;
      frame.style.height = Math.max(420, Math.min(h, 4000)) + 'px';
    } catch (_) {}
  });

  // initialize
  applySection(getSectionFromUrl(), { push: false });
})();
