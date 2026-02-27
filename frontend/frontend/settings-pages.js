(function () {
  const shell = document.getElementById('settingsShell');
  if (!shell) return;

  const overlay = document.getElementById('settingsDrawerOverlay');
  const burger = document.getElementById('settingsBurger');


  const isMobile = window.matchMedia('(max-width: 768px)').matches;

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
})();
