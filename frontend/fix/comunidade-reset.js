
(function(){
  function enhance(root){
    try{
      var list=root.querySelector('#listaComunidades');
      if(list){
        var html=(list.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
        if(html.includes('carregando comunidades')){
          list.innerHTML='<div class="comm-skeleton-grid"><div class="comm-skel-card"></div><div class="comm-skel-card"></div><div class="comm-skel-card"></div></div>';
        }
        if(html.includes('nenhuma comunidade encontrada') && !list.querySelector('.comm-empty')){
          var msg=list.textContent.trim();
          list.innerHTML='<div class="comm-empty">'+msg+'</div>';
        }
      }
      var mg=root.querySelector('#listaMeusGrupos');
      if(mg && /carregando seus grupos/i.test(mg.textContent||'')){
        mg.innerHTML='<div class="comm-skeleton-row"><div class="comm-skel-thumb"></div><div class="comm-skel-thumb"></div><div class="comm-skel-thumb"></div></div>';
      }
      root.querySelectorAll('#listaComunidades > div, #listaComunidades > article').forEach(function(card){
        if(card.classList.contains('card-comm')||card.classList.contains('com-card')||card.classList.contains('fallback-card')||card.classList.contains('comm-empty')) return;
        // legacy fallback markup
        if(card.children.length){ card.classList.add('fallback-card'); }
      });
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){enhance(document);}); else enhance(document);
  new MutationObserver(function(){enhance(document);}).observe(document.documentElement,{childList:true,subtree:true});
})();
