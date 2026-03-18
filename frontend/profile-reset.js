(function(){
  function hideExtras(){
    try{
      const cards = Array.from(document.querySelectorAll('#dpProgressCard, .dp-progressCard'));
      cards.forEach((el, idx)=>{ if(idx >= 0) el.style.display='none'; });
    }catch(_){ }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hideExtras, { once:true });
  else hideExtras();
})();
