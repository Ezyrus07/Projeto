(()=> {
  const MODAL_SELECTORS = [
    '#modalGaleria',
    '#modalPlayerVideo',
    '#modalPostDetalhe',
    '#modalSolicitacao',
    '#modalStoryViewer',
    '#modalStoryViewerPerfil',
    '#modalOrcamento',
    '#modalDetalhesPedido',
    '#dokeModalOverlay',
    '#dokeGlobalModal',
    '#dpModalOverlay'
  ];

  const isVisible = (el) => {
    if (!el) return false;
    const st = window.getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden' && st.opacity !== '0';
  };

  function ensureSkipLinkAndMain() {
    if (!document.querySelector('.skip-link')) {
      const a = document.createElement('a');
      a.className = 'skip-link';
      a.href = '#main';
      a.textContent = 'Pular para o conteúdo';
      document.body.insertBefore(a, document.body.firstChild);
    }
    const main = document.querySelector('main');
    if (main && !main.id) main.id = 'main';
  }

  function ensureNavLabels() {
    const navs = Array.from(document.querySelectorAll('nav:not([aria-label]):not([aria-labelledby])'));
    navs.forEach((nav, i) => {
      let label = 'Navegação';
      const cls = (nav.className || '').toLowerCase();
      if (cls.includes('bottom') || nav.querySelector('.bottom-nav, .nav-bottom, .bottomNav, .nav-item')) {
        label = 'Navegação inferior';
      } else if (cls.includes('header') || nav.closest('header')) {
        label = 'Navegação principal';
      }
      nav.setAttribute('aria-label', navs.length > 1 ? `${label} ${i + 1}` : label);
    });
  }

  function ensureFieldAriaLabels() {
    const fields = Array.from(document.querySelectorAll('input, select, textarea'));
    fields.forEach((el) => {
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return;

      const id = el.id || '';
      let hasLabel = false;
      if (id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (lbl && (lbl.textContent || '').trim()) hasLabel = true;
      }
      if (el.closest('label')) hasLabel = true;
      if (hasLabel) return;

      const placeholder = (el.getAttribute('placeholder') || '').trim();
      const name = (el.getAttribute('name') || '').trim();
      const derived = (placeholder || name || id || 'Campo de formulário')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (derived) el.setAttribute('aria-label', derived);
    });
  }

  function patchExternalLinks() {
    document.querySelectorAll('a[target="_blank"]').forEach((a) => {
      const rel = new Set((a.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('noopener');
      rel.add('noreferrer');
      a.setAttribute('rel', Array.from(rel).join(' '));
    });
  }

  function patchImages() {
    const imgs = Array.from(document.querySelectorAll('img'));
    imgs.forEach((img) => {
      if (!img.hasAttribute('alt')) {
        const src = (img.getAttribute('src') || '').toLowerCase();
        const cls = (img.className || '').toLowerCase();
        const id = (img.id || '').toLowerCase();
        let alt = '';
        if (src.includes('logo') || cls.includes('logo') || id.includes('logo')) alt = 'Logo Doke';
        else if (cls.includes('avatar') || id.includes('avatar')) alt = 'Foto do usuário';
        else if (src.includes('icone') || cls.includes('icon')) alt = 'Ícone';
        img.setAttribute('alt', alt);
      }

      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');

      // lazy apenas fora do header/nav e fora de logos
      if (!img.hasAttribute('loading')) {
        const inHeaderOrNav = !!img.closest('header, nav');
        const src = (img.getAttribute('src') || '').toLowerCase();
        if (!inHeaderOrNav && !src.includes('logo')) img.setAttribute('loading', 'lazy');
      }
    });
  }

  function patchModals() {
    const modals = [];
    MODAL_SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => modals.push(el));
    });

    modals.forEach((el) => {
      if (!el.getAttribute('role')) el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');

      const update = () => {
        if (isVisible(el)) {
          el.setAttribute('aria-hidden', 'false');
          requestAnimationFrame(() => {
            try { el.focus({ preventScroll: true }); } catch (_) {}
          });
        } else {
          el.setAttribute('aria-hidden', 'true');
        }
      };

      update();
      const mo = new MutationObserver(update);
      mo.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
    });

    let lastActive = null;
    document.addEventListener('focusin', () => {
      lastActive = document.activeElement;
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const visible = modals
        .filter((el) => isVisible(el))
        .map((el) => ({ el, z: parseInt(getComputedStyle(el).zIndex || '0', 10) || 0 }))
        .sort((a, b) => b.z - a.z)[0];

      if (visible) {
        e.preventDefault();
        visible.el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        if (lastActive && typeof lastActive.focus === 'function') {
          setTimeout(() => {
            try { lastActive.focus({ preventScroll: true }); } catch (_) {}
          }, 0);
        }
      }
    });
  }

  function init() {
    ensureSkipLinkAndMain();
    ensureNavLabels();
    ensureFieldAriaLabels();
    patchExternalLinks();
    patchImages();
    patchModals();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();