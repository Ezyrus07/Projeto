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
  let dragHandle = null;
  let dragStartY = 0;
  let dragDeltaY = 0;
  let dragging = false;

  function open(){
    body.classList.add('filters-open');
    if(aside) aside.style.transform = '';
    // Mantém foco no drawer por acessibilidade simples
    if(aside) aside.setAttribute('tabindex','-1');
    requestAnimationFrame(()=> aside && aside.focus && aside.focus());
  }
  function close(){
    if(aside) aside.style.transform = '';
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

  function ensureDragHandle(){
    if(!aside) return;
    dragHandle = aside.querySelector('.filters-drag-handle');
    if(!dragHandle){
      dragHandle = document.createElement('button');
      dragHandle.type = 'button';
      dragHandle.className = 'filters-drag-handle';
      dragHandle.setAttribute('aria-label', 'Arrastar para fechar filtros');
      const header = aside.querySelector('.filters-header');
      if(header) aside.insertBefore(dragHandle, header);
      else aside.prepend(dragHandle);
    }
  }

  function onDragStart(ev){
    if(!body.classList.contains('filters-open') || !aside) return;
    dragging = true;
    dragDeltaY = 0;
    dragStartY = ev.clientY || 0;
    aside.style.transition = 'none';
    if(dragHandle && dragHandle.setPointerCapture){
      try{ dragHandle.setPointerCapture(ev.pointerId); }catch(_){}
    }
  }

  function onDragMove(ev){
    if(!dragging || !aside) return;
    const y = ev.clientY || 0;
    dragDeltaY = Math.max(0, y - dragStartY);
    aside.style.transform = `translateY(${dragDeltaY}px)`;
  }

  function onDragEnd(){
    if(!dragging || !aside) return;
    dragging = false;
    aside.style.transition = '';
    if(dragDeltaY > 90){
      close();
    }else{
      aside.style.transform = '';
    }
    dragDeltaY = 0;
  }

  ensureDragHandle();
  if(dragHandle){
    dragHandle.addEventListener('pointerdown', onDragStart);
    dragHandle.addEventListener('pointermove', onDragMove);
    dragHandle.addEventListener('pointerup', onDragEnd);
    dragHandle.addEventListener('pointercancel', onDragEnd);
    dragHandle.addEventListener('lostpointercapture', onDragEnd);
  }
})();


