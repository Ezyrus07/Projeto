(function(){
  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once:true});
    else fn();
  }

  function textMatches(el, phrases){
    const t = (el.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
    return phrases.some(p => t.includes(p));
  }

  ready(function(){
    document.documentElement.classList.toggle('is-mobile', window.innerWidth <= 768);
    document.documentElement.classList.toggle('is-tablet', window.innerWidth > 768 && window.innerWidth < 1100);

    document.addEventListener('click', function(e){
      const btn = e.target.closest('button, a, [role="button"]');
      if(!btn) return;

      if(textMatches(btn, ['agora não', 'fechar', 'dispensar', 'entendi depois'])){
        const modal = btn.closest('.modal, .popup, .dialog, .overlay, .doke-modal, .doke-popup, [data-modal], [data-overlay]');
        if(modal){
          modal.remove();
          document.documentElement.classList.remove('modal-open');
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          localStorage.setItem('doke_popup_dismissed', String(Date.now()));
          e.preventDefault();
        }
      }
    }, true);

    const orphanPopups = Array.from(document.querySelectorAll('.modal, .popup, .dialog, .overlay-card, .doke-modal-card'));
    orphanPopups.forEach(function(node){
      const txt = (node.textContent || '').toLowerCase();
      if(txt.includes('faça login') || txt.includes('ative seu perfil profissional')){
        node.setAttribute('data-dismissible-polish', '1');
      }
    });

    const applyMinHeights = function(){
      document.querySelectorAll('.pedido-card, .order-card, [class*="pedido-card"]').forEach(function(card){
        card.style.height = 'auto';
        card.style.minHeight = '0';
        card.style.overflow = 'visible';
      });
    };

    applyMinHeights();
    window.addEventListener('resize', applyMinHeights, {passive:true});
  });
})();
