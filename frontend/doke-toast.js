(()=>{
  const make = (tag, cls, html) => { const el=document.createElement(tag); if(cls) el.className=cls; if(html!=null) el.innerHTML=html; return el; };
  let stack;
  let overlay;
  let modalBody;
  let modalTitle;

  function ensureUI(){
    if(stack) return;
    stack = make('div','doke-toast-stack');
    document.body.appendChild(stack);

    overlay = make('div','doke-detailsOverlay');
    overlay.innerHTML = `
      <div class="doke-detailsModal" role="dialog" aria-modal="true">
        <div class="doke-detailsHeader">
          <div class="doke-detailsTitle" id="dokeDetailsTitle">Detalhes do erro</div>
          <button class="doke-detailsClose" type="button" aria-label="Fechar">×</button>
        </div>
        <div class="doke-detailsBody">
          <pre class="doke-detailsPre" id="dokeDetailsPre"></pre>
        </div>
        <div class="doke-detailsFooter">
          <button class="doke-detailsBtn" type="button" data-copy>Copiar</button>
          <button class="doke-detailsBtn" type="button" data-close>Fechar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    modalTitle = overlay.querySelector('#dokeDetailsTitle');
    modalBody = overlay.querySelector('#dokeDetailsPre');

    const close = ()=> overlay.classList.remove('open');
    overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelector('.doke-detailsClose').addEventListener('click', close);
    overlay.querySelector('[data-copy]').addEventListener('click', async ()=>{
      try{
        await navigator.clipboard.writeText(modalBody.textContent||'');
        toast({type:'success', title:'Copiado', message:'Detalhes copiados para a área de transferência.'});
      }catch{ toast({type:'warn', title:'Não foi possível copiar', message:'Seu navegador bloqueou a cópia automática.'}); }
    });
  }

  function openDetails(title, details){
    ensureUI();
    modalTitle.textContent = title || 'Detalhes do erro';
    if(typeof details === 'string') modalBody.textContent = details;
    else {
      try{ modalBody.textContent = JSON.stringify(details, null, 2); }
      catch{ modalBody.textContent = String(details); }
    }
    overlay.classList.add('open');
  }

  function iconFor(type){
    switch(type){
      case 'success': return '✓';
      case 'info': return 'i';
      case 'warn': return '!';
      default: return '×';
    }
  }

  function toast({type='error', title='Algo deu errado', message='Tente novamente.', details=null, ttl=4500}){
    ensureUI();
    const t = make('div','doke-toast');
    t.dataset.type = type;
    t.innerHTML = `
      <div class="doke-toast__icon">${iconFor(type)}</div>
      <div class="doke-toast__body">
        <div class="doke-toast__title"></div>
        <p class="doke-toast__msg"></p>
        <div class="doke-toast__actions"></div>
      </div>
      <button class="doke-toast__close" type="button" aria-label="Fechar">×</button>
    `;
    t.querySelector('.doke-toast__title').textContent = title;
    t.querySelector('.doke-toast__msg').textContent = message;

    const actions = t.querySelector('.doke-toast__actions');
    if(details!=null){
      const btn = make('button','doke-toast__btn');
      btn.type='button';
      btn.textContent = 'Ver detalhes';
      btn.addEventListener('click', ()=> openDetails(title, details));
      actions.appendChild(btn);
    }

    const closer = t.querySelector('.doke-toast__close');
    const remove = ()=>{ t.style.opacity='0'; t.style.transform='translateY(6px)'; setTimeout(()=>t.remove(), 160); };
    closer.addEventListener('click', remove);
    stack.appendChild(t);

    // auto dismiss
    if(ttl>0) setTimeout(remove, ttl);
    return { remove, openDetails: ()=>openDetails(title, details) };
  }

  // Logger helper
  const logs = [];
  function log(level, msg, details){
    logs.push({ts: Date.now(), level, msg, details});
    if(logs.length>120) logs.shift();
    if(level==='error') console.error('[DOKE]', msg, details||'');
    else if(level==='warn') console.warn('[DOKE]', msg, details||'');
    else console.log('[DOKE]', msg, details||'');
  }

  // Global handlers
  window.addEventListener('error', (e)=>{
    try{
      const details = { message: e.message, file: e.filename, line: e.lineno, col: e.colno, stack: e.error?.stack };
      log('error', e.message || 'Erro inesperado', details);
      toast({type:'error', title:'Erro', message:e.message || 'Erro inesperado.', details});
    }catch{}
  });

  window.addEventListener('unhandledrejection', (e)=>{
    try{
      const reason = e.reason;
      const details = typeof reason==='object' ? (reason?.stack ? { message: reason.message, stack: reason.stack } : reason) : String(reason);
      log('error', 'Promise rejeitada', details);
      toast({type:'error', title:'Erro', message:'Algo falhou em segundo plano.', details});
    }catch{}
  });

  window.dokeToast = toast;
  window.dokeLog = log;
  window.dokeGetLogs = ()=> logs.slice();
})();
