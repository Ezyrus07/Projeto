
(function(){
  function fixLegacyText(containerId){
    var el = document.getElementById(containerId);
    if(!el) return;
    var txt = (el.textContent || '').trim();
    if(/Carregando comunidades/i.test(txt) && !el.querySelector('.comm-skeleton-grid')){
      window.dokeSetInlineLoader(el);
      return;
    }
    if(/Nenhuma comunidade encontrada/i.test(txt) && !el.querySelector('.comm-empty-state')){
      window.dokeSetInlineState(el, 'Não achei grupos antigos no Supabase nem no cache deste navegador. Se eles estiverem em outra conta, outro navegador ou outro dispositivo, não tenho como recuperar daqui.');
    }
  }
  function watch(){
    ['listaComunidades','listaMeusGrupos'].forEach(function(id){
      var el = document.getElementById(id);
      if(!el || el.__commObserver) return;
      el.__commObserver = new MutationObserver(function(){ fixLegacyText(id); });
      el.__commObserver.observe(el,{childList:true,subtree:true,characterData:true});
      fixLegacyText(id);
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch, {once:true});
  else watch();
})();
