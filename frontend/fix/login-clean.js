(function(){
  function init(){
    try{ window.__DOKE_LEGACY_SHELL_DISABLED__ = true; }catch(_){}
    try{ document.documentElement.classList.add('doke-no-shell'); }catch(_){}
    try{ document.body.classList.add('auth-page'); }catch(_){}
    try{
      var u=new URL(location.href);
      if(!u.searchParams.has('noshell')){
        u.searchParams.set('noshell','1');
        history.replaceState({},'',u.pathname+u.search+u.hash);
      }
    }catch(_){ }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
