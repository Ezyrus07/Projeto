
(function(){
  const gridIds = new Set(['listaComunidades']);
  const groupIds = new Set(['listaMeusGrupos']);

  function gridSkeleton(){
    return '<div class="comm-skeleton-grid" aria-hidden="true">'
      + '<div class="comm-skeleton-card"></div>'.repeat(3)
      + '</div>';
  }
  function groupsSkeleton(){
    return '<div class="groups-skeleton" aria-hidden="true">'
      + '<div class="group-skeleton"></div>'.repeat(4)
      + '</div>';
  }

  const originalLoader = window.dokeSetInlineLoader;
  window.dokeSetInlineLoader = function(container, text){
    try{
      if (container && gridIds.has(container.id)) {
        container.innerHTML = gridSkeleton();
        return;
      }
      if (container && groupIds.has(container.id)) {
        container.innerHTML = groupsSkeleton();
        return;
      }
    }catch(_){ }
    if (typeof originalLoader === 'function') return originalLoader(container, text);
    if (container) container.innerHTML = '<div style="padding:14px;color:#64748b;">'+ String(text || 'Carregando...') +'</div>';
  };

  function replaceLegacyLoader(root){
    if (!root) return;
    if (gridIds.has(root.id) && root.querySelector('.doke-inline-loader')) {
      root.innerHTML = gridSkeleton();
      return;
    }
    if (groupIds.has(root.id) && root.querySelector('.doke-inline-loader')) {
      root.innerHTML = groupsSkeleton();
      return;
    }
  }

  function stabilize(){
    replaceLegacyLoader(document.getElementById('listaComunidades'));
    replaceLegacyLoader(document.getElementById('listaMeusGrupos'));
  }

  function watch(id){
    const el = document.getElementById(id);
    if (!el) return;
    const obs = new MutationObserver(() => {
      if (el.querySelector('.doke-inline-loader')) replaceLegacyLoader(el);
    });
    obs.observe(el, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { stabilize(); watch('listaComunidades'); watch('listaMeusGrupos'); }, { once:true });
  } else {
    stabilize(); watch('listaComunidades'); watch('listaMeusGrupos');
  }
})();
