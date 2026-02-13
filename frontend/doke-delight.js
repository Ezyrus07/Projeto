/* Doke Delight (safe add-on)
   - Toast
   - Confetti (CSS-only)
   - Autosave rascunho do anúncio (sem fotos)
*/
(function(){
  const rootId = 'dokeDelightRoot';

  function ensureRoot(){
    let el = document.getElementById(rootId);
    if(el) return el;
    el = document.createElement('div');
    el.id = rootId;
    document.body.appendChild(el);
    return el;
  }

  function injectCss(){
    if(document.getElementById('dokeDelightCss')) return;
    const s = document.createElement('style');
    s.id = 'dokeDelightCss';
    s.textContent = `
      .doke-toast{ position:fixed; left:50%; bottom:22px; transform:translateX(-50%);
        background:rgba(17,24,39,.92); color:#fff; padding:12px 16px; border-radius:14px;
        font-family:Poppins,system-ui,sans-serif; font-weight:700; z-index:999999;
        box-shadow:0 16px 40px rgba(0,0,0,.25); display:flex; gap:10px; align-items:center;
        max-width:min(92vw,720px);
        animation:dokeToastIn .18s ease-out; }
      @keyframes dokeToastIn{ from{opacity:0; transform:translateX(-50%) translateY(10px);} to{opacity:1; transform:translateX(-50%) translateY(0);} }
      .doke-toast .mini{ font-weight:600; opacity:.85; }
      .doke-toast button{ margin-left:auto; border:none; background:rgba(255,255,255,.12);
        color:#fff; padding:8px 10px; border-radius:12px; cursor:pointer; font-weight:900; }
      .doke-toast button:hover{ background:rgba(255,255,255,.18); }

      .doke-confetti{ position:fixed; inset:0; pointer-events:none; z-index:999998; overflow:hidden; }
      .doke-confetti i{ position:absolute; top:-10vh; width:10px; height:16px; opacity:.95;
        border-radius:4px; transform:rotate(0deg);
        animation: dokeFall linear forwards; }
      @keyframes dokeFall{ to{ transform: translateY(115vh) rotate(720deg); } }

      /* paleta leve (sem travar seu tema) */
      .doke-c1{ background:var(--cor0, #0b7768); }
      .doke-c2{ background:var(--cor2, #2a5f90); }
      .doke-c3{ background:#f59e0b; }
      .doke-c4{ background:#ef4444; }
      .doke-c5{ background:#a855f7; }
    `;
    document.head.appendChild(s);
  }

  function toast(msg, sub){
    try{
      injectCss();
      ensureRoot();
      const t = document.createElement('div');
      t.className = 'doke-toast';
      t.innerHTML = `<span>âœ¨ ${escapeHtml(msg||'Feito!')}</span>${sub?`<span class="mini">${escapeHtml(sub)}</span>`:''}<button type="button" aria-label="Fechar">×</button>`;
      t.querySelector('button').onclick = ()=>t.remove();
      document.body.appendChild(t);
      setTimeout(()=>{ if(t && t.parentNode) t.remove(); }, 5200);
    }catch(e){}
  }

  function confetti(){
    try{
      injectCss();
      const layer = document.createElement('div');
      layer.className = 'doke-confetti';
      const colors = ['doke-c1','doke-c2','doke-c3','doke-c4','doke-c5'];
      const n = 70;
      for(let i=0;i<n;i++){
        const p = document.createElement('i');
        p.className = colors[i % colors.length];
        p.style.left = Math.random()*100 + 'vw';
        p.style.animationDuration = (2.2 + Math.random()*1.6).toFixed(2) + 's';
        p.style.animationDelay = (Math.random()*0.18).toFixed(2) + 's';
        p.style.transform = `rotate(${Math.random()*180}deg)`;
        p.style.width = (8 + Math.random()*8).toFixed(0) + 'px';
        p.style.height = (10 + Math.random()*14).toFixed(0) + 'px';
        layer.appendChild(p);
      }
      document.body.appendChild(layer);
      setTimeout(()=>layer.remove(), 3200);
    }catch(e){}
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (c)=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'
    }[c]));
  }

  // API global
  window.dokeDelight = {
    toast,
    confetti,
    celebrate: function(msg, sub){ confetti(); toast(msg||'Mandou bem!', sub||''); }
  };

  // =============================
  // Autosave (anunciar/editar)
  // =============================
  function autosaveInit(){
    const form = document.getElementById('formAnuncio');
    if(!form) return;

    const params = new URLSearchParams(window.location.search);
    const isEdit = params.get('mode') === 'edit';
    const key = isEdit ? 'doke_anuncio_edit_draft' : 'doke_anuncio_draft';

    const fields = [
      'titulo','descricao','tags','valor','experiencia','prazo','garantia','politica','cep','bairro','telefone'
    ];

    function snapshot(){
      const data = {};
      fields.forEach(id=>{ const el=document.getElementById(id); if(el) data[id]=el.value; });
      // radios
      const modo = document.querySelector('input[name="modo_atend"]:checked');
      const preco = document.querySelector('input[name="tipo_preco"]:checked');
      data.modo_atend = modo ? modo.value : '';
      data.tipo_preco = preco ? preco.value : '';
      // categorias/tags
      const cats = document.getElementById('categorias-validacao');
      data.categorias = cats ? cats.value : '';
      // pagamentos
      data.pagamentos = Array.from(document.querySelectorAll('input[id^="pg-"]:checked')).map(cb=>cb.value);
      // emergencia
      const em = document.getElementById('emergencia');
      if(em) data.emergencia = !!em.checked;
      // agenda
      const dias = ['seg','ter','qua','qui','sex','sab','dom'];
      data.agenda = {};
      dias.forEach(d=>{
        const chk = document.getElementById(`chk-${d}`);
        const ini = document.getElementById(`${d}-inicio`);
        const fim = document.getElementById(`${d}-fim`);
        if(chk || ini || fim){
          data.agenda[d] = { ativo: chk ? !!chk.checked : false, inicio: ini ? ini.value : '', fim: fim ? fim.value : '' };
        }
      });
      // quiz
      const q = document.getElementById('perguntas-formulario-json');
      if(q) data.perguntas = q.value;
      return data;
    }

    function restore(raw){
      let data;
      try{ data = JSON.parse(raw||''); }catch(e){ return; }
      if(!data || typeof data !== 'object') return;

      fields.forEach(id=>{
        if(data[id] == null) return;
        const el = document.getElementById(id);
        if(el) el.value = data[id];
      });

      if(data.modo_atend){
        const r = document.querySelector(`input[name="modo_atend"][value="${CSS.escape(data.modo_atend)}"]`);
        if(r) r.checked = true;
      }
      if(data.tipo_preco){
        const r = document.querySelector(`input[name="tipo_preco"][value="${CSS.escape(data.tipo_preco)}"]`);
        if(r) r.checked = true;
        if(typeof window.togglePriceInput === 'function') window.togglePriceInput();
      }

      if(typeof window.categoriasSelecionadas !== 'undefined' && data.categorias){
        window.categoriasSelecionadas = data.categorias.split(',').map(s=>s.trim()).filter(Boolean);
        if(typeof window.atualizarTags === 'function') window.atualizarTags();
      } else {
        const cats = document.getElementById('categorias-validacao');
        if(cats && data.categorias) cats.value = data.categorias;
      }

      if(Array.isArray(data.pagamentos)){
        data.pagamentos.forEach(pg=>{
          const chk = document.querySelector(`input[id^="pg-"][value="${CSS.escape(pg)}"]`);
          if(chk) chk.checked = true;
        });
      }

      if(typeof data.emergencia === 'boolean'){
        const em = document.getElementById('emergencia');
        if(em) em.checked = data.emergencia;
      }

      if(data.agenda && typeof data.agenda === 'object'){
        Object.keys(data.agenda).forEach(d=>{
          const info = data.agenda[d] || {};
          const chk = document.getElementById(`chk-${d}`);
          const ini = document.getElementById(`${d}-inicio`);
          const fim = document.getElementById(`${d}-fim`);
          if(chk) chk.checked = !!info.ativo;
          if(ini) ini.value = info.inicio || '';
          if(fim) fim.value = info.fim || '';
          const box = document.getElementById(`time-${d}`);
          if(box) box.classList.toggle('show', !!info.ativo);
        });
      }

      if(typeof data.perguntas === 'string'){
        const q = document.getElementById('perguntas-formulario-json');
        if(q) q.value = data.perguntas;
        // se existir render
        if(typeof window.renderizarListaPerguntas === 'function'){
          try{
            const arr = JSON.parse(data.perguntas||'[]');
            if(Array.isArray(window.perguntasArray)){
              window.perguntasArray.length = 0;
              arr.forEach(x=>window.perguntasArray.push(x));
            }
            window.renderizarListaPerguntas();
          }catch(e){}
        }
      }

      window.dokeDelight.toast('Rascunho restaurado', 'Você não perdeu seu trabalho âœ…');
    }

    // restaura (apenas se NÃƒO for edit, pra não sobrescrever dados do banco)
    if(!isEdit){
      const raw = localStorage.getItem(key);
      if(raw) restore(raw);
    }

    let t;
    function scheduleSave(){
      clearTimeout(t);
      t = setTimeout(()=>{
        try{ localStorage.setItem(key, JSON.stringify(snapshot())); }catch(e){}
      }, 400);
    }

    form.addEventListener('input', scheduleSave);
    form.addEventListener('change', scheduleSave);

    // limpa rascunho quando publicar/salvar com sucesso (a página chama isso manualmente)
    window.__dokeClearDraft = function(){
      try{ localStorage.removeItem(key); }catch(e){}
    };
  }

  document.addEventListener('DOMContentLoaded', autosaveInit);
})();


