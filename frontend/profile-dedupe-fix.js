(function(){
  function dedupe(){
    try{
      var cards=Array.from(document.querySelectorAll('.dp-actions .dp-progressCard, .dp-progressCard'));
      var seen=false;
      cards.forEach(function(card, idx){
        if(!card) return;
        if(!seen){ seen=card; return; }
        card.classList.add('is-duplicate');
        card.setAttribute('hidden','hidden');
        card.style.display='none';
      });
      var actionCards=Array.from(document.querySelectorAll('.dp-actions .dp-progressCard'));
      actionCards.forEach(function(card, idx){ if(idx>0){card.classList.add('is-duplicate'); card.hidden=true; card.style.display='none';} });
    }catch(_e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', dedupe); else dedupe();
  new MutationObserver(dedupe).observe(document.documentElement,{childList:true,subtree:true});
})();
