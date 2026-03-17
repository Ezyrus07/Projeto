(function(){
  function skeletonCards(){
    return `
      <div class="comm-skeleton-grid">
        ${Array.from({length:4}).map(()=>`
          <div class="comm-skel-card">
            <div class="comm-skel-cover"></div>
            <div class="comm-skel-body">
              <div class="comm-skel-avatar"></div>
              <div class="comm-skel-lines">
                <div class="comm-skel-line lg"></div>
                <div class="comm-skel-line md"></div>
                <div class="comm-skel-line sm"></div>
              </div>
            </div>
          </div>`).join('')}
      </div>`;
  }
  function skeletonGroups(){
    return Array.from({length:3}).map(()=>`<div class="my-group-item"><div class="group-img-ring"><img alt="" src="assets/Imagens/avatar.png"></div><span>&nbsp;</span></div>`).join('');
  }
  function patch(){
    document.body.setAttribute('data-page','comunidade');
    const main=document.querySelector('main'); if(main) main.classList.add('comunidade-page');
    const list=document.getElementById('listaComunidades');
    const groups=document.getElementById('listaMeusGrupos');
    if(list && /Carregando comunidades/i.test(list.textContent||'')) list.innerHTML=skeletonCards();
    if(groups && /Carregando seus grupos/i.test(groups.textContent||'')) groups.innerHTML=skeletonGroups();
    const stats=document.querySelector('.comm-hero-stats'); if(stats) stats.remove();
    const label=document.querySelector('.my-groups-section .section-label'); if(label) label.textContent='Meus grupos';
  }
  const obs=new MutationObserver(()=>patch());
  window.addEventListener('DOMContentLoaded',()=>{patch(); obs.observe(document.body,{childList:true,subtree:true}); setTimeout(patch,400); setTimeout(patch,1200);});
})();
