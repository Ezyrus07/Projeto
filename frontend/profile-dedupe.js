(function(){
  function apply(){
    try{
      var hasHeaderCard = !!document.querySelector('.profile-status-card');
      var shellHeader = !!document.querySelector('header, .topbar, .doke-shell-topbar');
      var card = document.getElementById('dpProgressCard');
      var actions = card && card.closest('.dp-actions');
      if(hasHeaderCard && card){
        document.body.classList.add('profile-hide-progress-card');
        if(actions) actions.classList.add('single-status');
      }
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  window.addEventListener('load', apply);
  setTimeout(apply, 300);
  setTimeout(apply, 1200);
})();
