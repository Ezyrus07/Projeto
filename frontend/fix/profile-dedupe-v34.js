
(function(){
  function run(){
    try{
      const cards=[...document.querySelectorAll('#dpProgressCard, .dp-progressCard')];
      cards.forEach((el,idx)=>{ if(idx>0 || el.id==='dpProgressCard') el.style.display='none'; });
    }catch(_){ }
  }
  document.addEventListener('DOMContentLoaded', run);
  setTimeout(run, 800);
})();
