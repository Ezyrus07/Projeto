/* ============================================================
   Page — Busca (drawer de filtros)
   Data: 2026-02-07
   ============================================================ */
(function(){
  const body = document.body;
  if(!body || body.getAttribute('data-page') !== 'busca') return;

  const btn = document.getElementById('btnOpenFilters');
  const backdrop = document.getElementById('filtersBackdrop');
  const aside = document.querySelector('.filters-sidebar');

  function open(){
    body.classList.add('filters-open');
    // Mantém foco no drawer por acessibilidade simples
    if(aside) aside.setAttribute('tabindex','-1');
    requestAnimationFrame(()=> aside && aside.focus && aside.focus());
  }
  function close(){
    body.classList.remove('filters-open');
  }

  btn && btn.addEventListener('click', ()=> {
    body.classList.contains('filters-open') ? close() : open();
  });

  backdrop && backdrop.addEventListener('click', close);

  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && body.classList.contains('filters-open')) close();
  });

  // Fecha ao clicar fora do drawer
  document.addEventListener('click', (e)=>{
    if(!body.classList.contains('filters-open')) return;
    const t = e.target;
    if(btn && btn.contains(t)) return;
    if(aside && aside.contains(t)) return;
    if(backdrop && backdrop.contains(t)) { close(); return; }
  }, true);
})();
