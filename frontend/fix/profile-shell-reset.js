(function(){
  function syncProfileSession(){
    if(!window.dokeAuthBridge || typeof window.dokeAuthBridge.resolveSession !== 'function') return;
    window.dokeAuthBridge.resolveSession().then((out) => {
      if(!out || !out.uid) return;
      try{
        const raw = localStorage.getItem('doke_usuario_perfil') || '{}';
        const perfil = JSON.parse(raw) || {};
        const next = Object.assign({}, perfil, { uid: out.uid, id: out.uid, email: (out.user && out.user.email) || perfil.email || '' });
        localStorage.setItem('doke_usuario_perfil', JSON.stringify(next));
      }catch(_e){}
    }).catch(()=>{});
  }
  function dedupeProgress(){
    const cards = Array.from(document.querySelectorAll('#dpProgressCard, .dp-progressCard, .profile-progress-card'));
    if(cards.length <= 1) return;
    cards.forEach((node, idx) => {
      if(idx === 0) return;
      node.style.display = 'none';
      node.setAttribute('hidden','hidden');
    });
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ syncProfileSession(); dedupeProgress(); });
  } else {
    syncProfileSession();
    dedupeProgress();
  }
  window.addEventListener('load', dedupeProgress, { once:true });
})();
