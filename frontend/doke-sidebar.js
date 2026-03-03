(function(){
  function normalizePath(href){
    try{
      const u = new URL(href, window.location.href);
      const p = u.pathname.split('/').pop() || '';
      return p.toLowerCase();
    }catch(e){
      return (href||'').split('?')[0].split('#')[0].split('/').pop().toLowerCase();
    }
  }

  function markActive(sidebar){
    const current = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const links = sidebar.querySelectorAll('.item a[href]');
    links.forEach(a=>{
      const item = a.closest('.item');
      if(!item) return;
      item.classList.remove('active');
      const target = normalizePath(a.getAttribute('href'));
      if(!target) return;
      if(target === current) item.classList.add('active');
      // Special cases
      if(current === '' && target === 'index.html') item.classList.add('active');
    });
  }

  function ensureSidebar(){
    const sidebar = document.querySelector('.sidebar-icones');
    if(!sidebar) return;

    document.body.classList.add('has-doke-sidebar');

    // Compact mode always on desktop; keep existing markup but ensure spans visible.
    // Ensure each item has .item wrapper
    sidebar.querySelectorAll(':scope > a').forEach(a=>{
      const wrap = document.createElement('div');
      wrap.className = 'item';
      a.parentNode.insertBefore(wrap, a);
      wrap.appendChild(a);
    });

    // Accessibility: aria-current on active
    markActive(sidebar);
    const active = sidebar.querySelector('.item.active a');
    if(active){ active.setAttribute('aria-current','page'); }

    // Close mobile menu if project uses menu-aberto
    sidebar.addEventListener('click', (e)=>{
      const a = e.target.closest('a');
      if(!a) return;
      if(sidebar.classList.contains('menu-aberto')) sidebar.classList.remove('menu-aberto');
      const overlay = document.getElementById('overlay-menu');
      if(overlay) overlay.style.display = 'none';
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ensureSidebar);
  }else{
    ensureSidebar();
  }
})();
