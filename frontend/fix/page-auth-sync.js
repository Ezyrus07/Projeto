(function(){
  async function sync(){
    try{
      if(!window.dokeAuthBridge || typeof window.dokeAuthBridge.resolveSession !== 'function') return null;
      const out = await window.dokeAuthBridge.resolveSession();
      const uid = String(out && out.uid || '').trim();
      if(!uid) return null;
      return uid;
    }catch(_e){ return null; }
  }
  window.dokeResolvedUidPromise = sync();
})();
