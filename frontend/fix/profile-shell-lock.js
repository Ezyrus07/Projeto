(function(){
  const PROFILE_PAGES = new Set(['meuperfil.html','perfil-usuario.html','perfil-profissional.html','perfil-cliente.html']);
  function currentFile(){
    try{
      const p = String(location.pathname || '').split('/').pop().toLowerCase();
      return p || 'index.html';
    }catch(_){ return ''; }
  }
  if(!PROFILE_PAGES.has(currentFile())) return;

  function enforce(){
    try{ localStorage.setItem('doke_sidebar_mode_v1','compact'); }catch(_){ }
    const body = document.body;
    const sidebar = document.querySelector('.sidebar-icones[data-shell="unified-desktop"], .sidebar-icones');
    if (body){
      body.classList.remove('doke-sidebar-expanded','doke-sidebar-search-open','menu-ativo');
    }
    if (sidebar){
      sidebar.classList.remove('ig-search-open','menu-aberto');
      sidebar.style.removeProperty('width');
      sidebar.style.removeProperty('min-width');
      sidebar.style.removeProperty('max-width');
      const searchScreen = sidebar.querySelector('.ig-search-screen');
      if (searchScreen) searchScreen.setAttribute('hidden','hidden');
      sidebar.querySelectorAll('.doke-sidebar-toggle').forEach((el)=>{ try{ el.remove(); }catch(_){} });
      sidebar.querySelectorAll('.item .lbl, .item span.lbl').forEach((el)=>{ el.textContent = ''; });
    }
    document.querySelectorAll('.ig-search-screen').forEach((el)=> el.setAttribute('hidden','hidden'));
    const root = document.documentElement;
    if (root){ root.classList.remove('doke-search-open'); }
  }

  function bindSearchButtons(){
    document.querySelectorAll('.pv-search-toggle').forEach((btn)=>{
      if (btn.dataset.profileShellLockBound === '1') return;
      btn.dataset.profileShellLockBound = '1';
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        enforce();
        try{ location.href = 'busca.html'; }catch(_){ }
      }, true);
    });
  }

  function run(){ enforce(); bindSearchButtons(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once:true });
  } else {
    run();
  }

  window.addEventListener('pageshow', run);
  window.addEventListener('load', run);
  setInterval(enforce, 500);

  const mo = new MutationObserver(()=>{ enforce(); bindSearchButtons(); });
  const startObserver = ()=>{
    if(document.body) mo.observe(document.body, { attributes:true, childList:true, subtree:true, attributeFilter:['class','style'] });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObserver, { once:true });
  else startObserver();
})();
