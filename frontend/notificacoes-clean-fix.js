(function(){
  function apply(){
    var c=document.getElementById('lista-notificacoes'); if(!c) return;
    var text=String(c.textContent||'');
    if(/Carregando|Buscando atualiza/i.test(text) && !c.querySelector('.notif-skeleton')){
      c.innerHTML='<div class="notif-skeleton"><div class="notif-skel-card"></div><div class="notif-skel-card"></div><div class="notif-skel-card"></div></div>';
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', apply, {once:true}); else apply();
  window.addEventListener('load', function(){ setTimeout(apply, 300); });
})();
