(function () {
  const shell = document.getElementById('settingsShell');
  if (!shell) return;

  const overlay = document.getElementById('settingsDrawerOverlay');
  const burger = document.getElementById('settingsBurger');


  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  function getLocalProfile() {
    try {
      const raw = localStorage.getItem('doke_usuario_perfil');
      const obj = raw ? JSON.parse(raw) : null;
      return (obj && typeof obj === 'object') ? obj : {};
    } catch (_) {
      return {};
    }
  }

  function setSettingsProfileView(profile) {
    const fotoEl = document.getElementById('mais-foto');
    const nomeEl = document.getElementById('mais-nome');
    const userEl = document.getElementById('mais-user');
    if (!fotoEl && !nomeEl && !userEl) return;

    const nome = String(profile?.nome || profile?.name || profile?.user || 'Minha conta').trim();
    let user = String(profile?.user || '').trim();
    if (!user) user = nome ? nome.split(' ')[0] : 'usuario';
    user = user.replace(/^@+/, '');
    const foto = String(profile?.foto || profile?.avatar_url || profile?.avatar || '').trim();

    if (nomeEl) nomeEl.textContent = nome || 'Minha conta';
    if (userEl) userEl.textContent = `@${user || 'usuario'}`;
    if (fotoEl && foto) fotoEl.src = foto;
  }

  async function hydrateSettingsProfile() {
    const local = getLocalProfile();
    setSettingsProfileView(local);

    try {
      const sb = window.sb || window.supabaseClient || window.supabase;
      if (!sb?.auth?.getUser) return;
      const { data } = await sb.auth.getUser();
      const authUser = data?.user || null;
      if (!authUser) return;
      const meta = authUser.user_metadata || {};
      const merged = {
        ...local,
        uid: local.uid || authUser.id || '',
        email: local.email || authUser.email || '',
        nome: local.nome || meta.nome || meta.full_name || meta.name || (authUser.email ? authUser.email.split('@')[0] : 'Minha conta'),
        user: local.user || meta.user || meta.username || local.nome || '',
        foto: local.foto || meta.foto || meta.avatar_url || ''
      };
      try { localStorage.setItem('doke_usuario_perfil', JSON.stringify(merged)); } catch (_) {}
      setSettingsProfileView(merged);
    } catch (_) {}
  }

  window.irParaPerfilCorreto = function () {
    const p = getLocalProfile();
    const isPro = p?.isProfissional === true || p?.tipo === 'profissional' || p?.role === 'profissional';
    window.location.href = isPro ? 'meuperfil.html' : 'perfil-usuario.html';
  };

  // Mobile UX: no drawer menu; show a back link to the settings list (mais.html)
  if (isMobile) {
    if (burger) burger.remove();
    if (overlay) overlay.remove();

    const main = shell.querySelector('.settings-main');
    if (main && !main.querySelector('.settings-mobile-back')) {
      const back = document.createElement('a');
      back.href = 'mais.html';
      back.className = 'settings-mobile-back';
      back.innerHTML = '<i class="bx bx-chevron-left"></i> Configurações';
      const hero = main.querySelector('.settings-hero');
      if (hero) main.insertBefore(back, hero);
      else main.prepend(back);
    }
  }

  function closeDrawer() {
    shell.classList.remove('drawer-open');
  }
  function openDrawer() {
    shell.classList.add('drawer-open');
  }

  if (!isMobile) {
    if (burger) burger.addEventListener('click', openDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);
  }

  // active nav item based on current file
  const currentFile = (location.pathname.split('/').pop() || '').toLowerCase();
  const items = shell.querySelectorAll('a.settings-nav-item[href]');
  items.forEach((a) => {
    const href = (a.getAttribute('href') || '').split('?')[0].split('#')[0].toLowerCase();
    const isActive = href && href === currentFile;
    a.classList.toggle('is-active', isActive);
  });

  // close drawer on navigation (when drawer is enabled)
  if (!isMobile) {
    shell.addEventListener('click', (e) => {
      const link = e.target.closest('a.settings-nav-item[href]');
      if (!link) return;
      closeDrawer();
    });
  }

  hydrateSettingsProfile();
})();
