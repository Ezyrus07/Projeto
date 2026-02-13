// DOKE Card Patch
// Conserta o bug: dokeBuildCardPremium retorna HTMLElement, mas o feed usa insertAdjacentHTML (string).
// Isso gerava: [object HTMLDivElement]
(() => {
  'use strict';

  const safe = (v) => String(v ?? '').replace(/'/g, "\\'");

  function patchBuilder(){
    const orig = window.dokeBuildCardPremium;
    if (typeof orig !== 'function' || orig.__dokePatched) return;

    function wrapped(anuncio){
      const res = orig(anuncio);
      if (typeof res === 'string') return res;

      // Se for HTMLElement, serializa com outerHTML e re-adiciona a visualização via atributo inline
      if (res && res.nodeType === 1) {
        try{
          const id = safe(anuncio && anuncio.id);
          const uid = safe(anuncio && anuncio.uid);
          res.setAttribute(
            'onmousedown',
            `if (typeof window.registrarVisualizacao === 'function'){window.registrarVisualizacao('${id}','${uid}');}`
          );
        }catch(_){}
        return res.outerHTML;
      }

      return '';
    }

    wrapped.__dokePatched = true;
    wrapped.__orig = orig;
    try{ orig.__dokePatched = true; }catch(_){}
    window.dokeBuildCardPremium = wrapped;
  }

  // Tenta patchar cedo e também depois (caso script.js carregue depois)
  patchBuilder();
  window.addEventListener('load', patchBuilder);
  document.addEventListener('DOMContentLoaded', patchBuilder);

  // fallback: observa por alguns instantes
  let tries = 0;
  const t = setInterval(() => {
    patchBuilder();
    tries++;
    if (tries > 40) clearInterval(t); // ~10s
  }, 250);
})();
