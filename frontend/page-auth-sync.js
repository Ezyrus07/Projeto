(function(){
  async function boot(){
    try{
      if(window.dokeAuthBridge && typeof window.dokeAuthBridge.sync === 'function'){
        await window.dokeAuthBridge.sync();
      }
    }catch(_){ }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
