(function(){
  try{ localStorage.setItem('doke_sidebar_mode_v1','compact'); }catch(_){ }
  function onReady(fn){ if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',fn,{once:true}); } else { fn(); } }
  onReady(function(){
    try{
      var page=document.body&&document.body.dataset&&document.body.dataset.page||'';
      if(page==='perfil'){
        var cards=document.querySelectorAll('#dpProgressCard, .profile-progress-card, .dp-progress-card');
        if(cards.length>1){ cards.forEach(function(el,i){ if(i>0) el.style.display='none'; }); }
      }
      if(page==='comunidade'){
        var hero=document.querySelector('.comm-hero-container');
        if(hero) hero.style.display='block';
        var grid=document.getElementById('listaComunidades');
        if(grid && /Carregando/i.test(grid.textContent||'')){
          grid.innerHTML='<div class="doke-inline-loader"><span class="doke-inline-loader__spinner"><i class="bx bx-loader-alt bx-spin"></i></span><span>Carregando comunidades...</span></div>';
        }
      }
      if(page==='notificacoes'){
        var list=document.getElementById('lista-notificacoes');
        if(list && /Buscando atualizações|Carregando/i.test(list.textContent||'')){
          list.innerHTML='<div class="notif-simple-loading" role="status" aria-live="polite"><i class="bx bx-loader-alt bx-spin"></i><span>Carregando notificações...</span></div>';
        }
      }
      if(page==='pedidos'){
        document.body.classList.add('pedidos-consolidated');
      }
    }catch(_){ }
  });
})();
