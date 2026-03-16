
(function(){
  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once:true});
    else fn();
  }

  ready(function(){
    if(document.body?.dataset?.page !== 'comunidade') return;
    const overlay = document.getElementById('modalCriarComm');
    if(!overlay) return;
    const card = overlay.querySelector('.modal-card') || overlay.firstElementChild;
    const form = overlay.querySelector('form');
    if(!card || !form) return;

    if(!overlay.parentElement || overlay.parentElement !== document.body){
      document.body.appendChild(overlay);
    }

    overlay.classList.add('comm-create-overlay');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.display = '';
    card.classList.add('comm-create-card');

    const existingClose = card.querySelector('[onclick*="fecharModalCriarComm"]') || card.querySelector('button');
    const existingTitle = card.querySelector('h1,h2');
    const titleText = (existingTitle?.textContent || 'Criar grupo').trim();
    const subtitleText = 'Monte sua comunidade com nome, descrição, tipo, privacidade e foto sem sair da página.';

    const head = document.createElement('div');
    head.className = 'comm-create-head';
    head.innerHTML = `
      <span class="comm-create-kicker">Novo grupo</span>
      <h2 class="comm-create-title">${titleText}</h2>
      <p class="comm-create-subtitle">${subtitleText}</p>
      <button type="button" class="comm-create-close" aria-label="Fechar">×</button>
    `;

    const scroll = document.createElement('div');
    scroll.className = 'comm-create-scroll';

    const info = document.createElement('div');
    info.className = 'comm-create-info';
    info.innerHTML = `
      <div>
        <strong>Informações principais</strong>
        <span>Preencha os dados abaixo para publicar seu grupo do jeito certo já na primeira versão.</span>
      </div>
      <span class="comm-create-badge"><i class="bx bx-group"></i> Doke</span>
    `;

    const submitBtn = form.querySelector('button[type="submit"], .btn-submit-modal') || document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'comm-btn-primary';
    submitBtn.textContent = 'Criar grupo';

    // Rebuild form fields from labels + following controls
    const children = Array.from(form.children);
    const groups = [];
    for(let i=0;i<children.length;i++){
      const el = children[i];
      const tag = (el.tagName || '').toLowerCase();
      if(tag === 'label'){
        const group = document.createElement('div');
        group.className = 'comm-create-field';
        group.appendChild(el);
        while(children[i+1]){
          const next = children[i+1];
          const nextTag = (next.tagName || '').toLowerCase();
          if(nextTag === 'label' || (nextTag === 'button' && (next.type === 'submit' || next.classList.contains('btn-submit-modal')))) break;
          group.appendChild(next);
          i += 1;
        }
        groups.push(group);
      }
    }

    const row = document.createElement('div');
    row.className = 'comm-create-row';
    const rest = [];
    groups.forEach(group => {
      const labelText = (group.querySelector('label')?.textContent || '').toLowerCase();
      if(labelText.includes('tipo') || labelText.includes('privacidade')) row.appendChild(group);
      else rest.push(group);
    });

    form.innerHTML = '';
    form.className = 'comm-create-form';
    form.appendChild(info);
    rest.forEach(group => form.appendChild(group));
    if(row.children.length) form.appendChild(row);

    function enhanceFileField(group){
      const input = group.querySelector('input[type="file"]');
      if(!input) return;
      input.classList.add('comm-file-input');
      const labelText = (group.querySelector('label')?.textContent || '').toLowerCase();
      const buttonText = labelText.includes('capa') ? 'Escolher capa' : 'Escolher foto';
      const helpText = labelText.includes('capa') ? 'Use uma imagem horizontal para a capa do card.' : 'Selecione uma imagem quadrada ou retrato para o grupo.';
      const picker = document.createElement('div');
      picker.className = 'comm-file-picker';
      picker.innerHTML = `
        <button type="button" class="comm-file-trigger">${buttonText}</button>
        <div class="comm-file-meta">
          <div class="comm-file-name">Nenhum arquivo escolhido</div>
          <div class="comm-file-help">${helpText}</div>
        </div>
      `;
      const label = group.querySelector('label');
      if(label && label.nextSibling){
        group.insertBefore(picker, label.nextSibling);
      }else{
        group.appendChild(picker);
      }
      const trigger = picker.querySelector('.comm-file-trigger');
      const nameEl = picker.querySelector('.comm-file-name');
      let restoreCardScroll = 0;
      let restorePageScroll = 0;
      let awaitingFileDialog = false;
      const restorePosition = function(){
        if(scroll) scroll.scrollTop = restoreCardScroll;
        window.scrollTo({ top: restorePageScroll, behavior: 'instant' in window ? 'instant' : 'auto' });
        awaitingFileDialog = false;
      };
      const onWindowFocus = function(){
        if(!awaitingFileDialog) return;
        setTimeout(restorePosition, 30);
      };
      trigger.addEventListener('click', function(ev){
        ev.preventDefault();
        restoreCardScroll = scroll ? scroll.scrollTop : 0;
        restorePageScroll = window.scrollY || window.pageYOffset || 0;
        awaitingFileDialog = true;
        window.addEventListener('focus', onWindowFocus, { once: true });
        requestAnimationFrame(function(){
          try{ input.showPicker ? input.showPicker() : input.click(); }
          catch(_){ input.click(); }
        });
      });
      input.addEventListener('change', function(){
        const file = input.files && input.files[0];
        nameEl.textContent = file ? file.name : 'Nenhum arquivo escolhido';
        setTimeout(function(){
          try{ document.activeElement && document.activeElement.blur && document.activeElement.blur(); }catch(_){}
          restorePosition();
        }, 0);
      });
      input.addEventListener('click', function(){
        restoreCardScroll = scroll ? scroll.scrollTop : 0;
        restorePageScroll = window.scrollY || window.pageYOffset || 0;
      });
    }

    form.querySelectorAll('.comm-create-field').forEach(enhanceFileField);

    const actions = document.createElement('div');
    actions.className = 'comm-create-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'comm-btn-secondary';
    cancel.textContent = 'Cancelar';
    cancel.addEventListener('click', closeModal);
    actions.appendChild(cancel);
    actions.appendChild(submitBtn);
    form.appendChild(actions);

    scroll.appendChild(form);
    card.innerHTML = '';
    card.appendChild(head);
    card.appendChild(scroll);

    function openModal(){
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('comm-create-open');
      if(scroll) scroll.scrollTop = 0;
      const first = form.querySelector('input:not([type="file"]), textarea, select');
      setTimeout(function(){ try{ first && first.focus && first.focus(); }catch(_){} }, 40);
    }
    function closeModal(){
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('comm-create-open');
    }

    overlay.addEventListener('click', function(ev){ if(ev.target === overlay) closeModal(); });
    head.querySelector('.comm-create-close').addEventListener('click', closeModal);
    document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape' && overlay.classList.contains('open')) closeModal(); });
    window.addEventListener('pagehide', closeModal);
    window.addEventListener('beforeunload', closeModal);
    document.addEventListener('click', function(ev){
      const link = ev.target.closest && ev.target.closest('a[href]');
      if(link && overlay.classList.contains('open') && !card.contains(link)) closeModal();
    }, true);

    window.abrirModalCriarComm = openModal;
    window.fecharModalCriarComm = closeModal;
    closeModal();
  });
})();
