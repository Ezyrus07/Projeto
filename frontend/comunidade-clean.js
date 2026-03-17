(function(){
  function normalizeCommunityState(){
    var list = document.getElementById('listaComunidades');
    if(!list) return;
    var txt = (list.textContent || '').replace(/\s+/g,' ').trim();
    if(/Nenhuma comunidade encontrada/i.test(txt) && !list.querySelector('.empty-community-state')){
      list.innerHTML = '<div class="empty-community-state"><strong>Nenhuma comunidade encontrada</strong><p>Não achei grupos antigos no Supabase nem no cache deste navegador. Se eles estiverem em outra conta, outro navegador ou outro dispositivo, não tenho como recuperar daqui.</p></div>';
    }
  }
  function removeDuplicatePoints(){
    var card = document.getElementById('dpProgressCard');
    if(card && document.querySelector('.profile-status-card')){
      document.body.classList.add('profile-hide-progress-card');
    }
  }
  function run(){ normalizeCommunityState(); removeDuplicatePoints(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run); else run();
  window.addEventListener('load', run);
  setTimeout(run, 400);
  setTimeout(run, 1200);
})();
