(function(){
  const CHAT_WIDTH_KEY = 'doke_pedidos_chat_width_v1';
  const CHAT_WIDTH_STEP = 72;
  const state = {
    pedidos: [],
    filter: 'all',
    query: '',
    sort: 'recent',
    detailsById: new Map(),
    userByUid: new Map(),
    invalidUserTables: new Set(),
    activeChatUrl: '',
    activePedidoId: '',
    selectMode: false,
    selected: new Set(),
    chatWidth: 0,
    chatMaximized: false,
    chatResizing: false,
    chatResizeStartX: 0,
    chatResizeStartWidth: 0,
    activeChatOutroUid: '',
    activeChatStatusRaw: ''
  };
  const el = {
    grid: document.getElementById('ordersGrid'),
    empty: document.getElementById('emptyState'),
    subtitle: document.getElementById('ordersSubtitle'),
    count: document.getElementById('heroCount'),
    statToday: document.getElementById('statToday'),
    statProgress: document.getElementById('statProgress'),
    statUrgent: document.getElementById('statUrgent'),
    chipAllLabel: document.getElementById('chipAllLabel'),
    chipTodayLabel: document.getElementById('chipTodayLabel'),
    chipProgressLabel: document.getElementById('chipProgressLabel'),
    chipUrgentLabel: document.getElementById('chipUrgentLabel'),
    search: document.getElementById('searchInput'),
    sortBtn: document.getElementById('sortBtn'),
    sortLabel: document.getElementById('sortLabel'),
    selectBtn: document.getElementById('selectBtn'),
    selectLabel: document.getElementById('selectLabel'),
    refreshBtn: document.getElementById('refreshBtn'),
    filtersBtn: document.getElementById('filtersBtn'),
    filtersBar: document.getElementById('filtersBar'),
    toolbar: document.querySelector('section.toolbar'),
    toolbarActions: document.querySelector('section.toolbar .toolbar-actions'),
    chips: Array.from(document.querySelectorAll('.chip[data-filter]')),
    toast: document.getElementById('toast'),
    bulkBar: document.getElementById('bulkBar'),
    bulkInfo: document.getElementById('bulkInfo'),
    bulkFinalizeBtn: document.getElementById('bulkFinalizeBtn'),
    bulkClearBtn: document.getElementById('bulkClearBtn'),
    contentSplit: document.getElementById('contentSplit'),
    chatDrawer: document.getElementById('chatDrawer'),
    chatPanel: document.querySelector('#chatDrawer .chat-panel-embed'),
    chatSide: document.getElementById('chatSide'),
    chatPanelTitle: document.getElementById('chatPanelTitle'),
    chatNarrowBtn: document.getElementById('chatNarrowBtn'),
    chatWidenBtn: document.getElementById('chatWidenBtn'),
    chatWidthLabel: document.getElementById('chatWidthLabel'),
    chatExpandBtn: document.getElementById('chatExpandBtn'),
    chatResizeHandle: document.getElementById('chatResizeHandle'),
    chatFrame: document.getElementById('pedidoChatFrame'),
    detailsModal: document.getElementById('detailsModal'),
    detailsCloseBtn: document.getElementById('detailsCloseBtn'),
    detailsSubtitle: document.getElementById('detailsSubtitle'),
    detailsGrid: document.getElementById('detailsGrid'),
    detailsDescription: document.getElementById('detailsDescription'),
    detailsTriagem: document.getElementById('detailsTriagem'),
    detailsAnexos: document.getElementById('detailsAnexos'),
    rejectPromptModal: document.getElementById('rejectPromptModal'),
    rejectPromptInput: document.getElementById('rejectPromptInput'),
    rejectPromptError: document.getElementById('rejectPromptError'),
    rejectPromptCancelBtn: document.getElementById('rejectPromptCancelBtn'),
    rejectPromptConfirmBtn: document.getElementById('rejectPromptConfirmBtn')
  };
  const runtime = window.dokePageRuntime || null;
  const runtimeOn = (target, type, handler, options) => {
    if (!target || typeof target.addEventListener !== 'function' || !type || typeof handler !== 'function') return;
    if (runtime && typeof runtime.on === 'function') {
      runtime.on(target, type, handler, options);
      return;
    }
    target.addEventListener(type, handler, options);
  };
  const runtimeLater = (handler, ms) => {
    if (typeof handler !== 'function') return;
    if (runtime && typeof runtime.timeout === 'function') {
      runtime.timeout(handler, ms);
      return;
    }
    setTimeout(handler, ms);
  };

  // Abrir perfil ao clicar no avatar ou @usuario
  if(el.grid){
    runtimeOn(el.grid, 'click', (ev) => {
      const target = ev.target && ev.target.closest ? ev.target.closest('.card-pedido .user[data-profile]') : null;
      if(!target) return;
      const uid = String(target.getAttribute('data-profile-uid') || '').trim();
      const user = String(target.getAttribute('data-profile-user') || '').trim();
      if(uid){
        try{ if(typeof window.abrirPerfil === 'function') return window.abrirPerfil(uid); }catch(_){ }
        location.href = `perfil-profissional.html?uid=${encodeURIComponent(uid)}`;
        return;
      }
      if(user){
        // fallback por username
        location.href = `perfil-profissional.html?user=${encodeURIComponent(user)}`;
      }
    });
  }

  // garante que a página continue rolando (principalmente em mobile)
  lockScrollIfNeeded();

  function showToast(msg){
    if(!el.toast) return;
    el.toast.textContent = String(msg || 'OK');
    el.toast.classList.add('show');
    clearTimeout(window.__ordersToastTimer);
    window.__ordersToastTimer = runtime && typeof runtime.timeout === 'function'
      ? runtime.timeout(() => el.toast.classList.remove('show'), 1800)
      : setTimeout(() => el.toast.classList.remove('show'), 1800);
  }

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }

  // Para usar texto em atributos (data-*, title, etc.) sem quebrar HTML.
  function escAttr(v){
    return esc(String(v ?? '').replace(/\s+/g,' ').trim());
  }

  function cssEsc(v){
    try{ return (window.CSS && typeof window.CSS.escape === 'function') ? window.CSS.escape(String(v)) : String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&'); }
    catch(_){ return String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&'); }
  }

  function displayHandle(p){
    const u = String((p && p.usuario) || '').trim();
    if(u) return u.startsWith('@') ? u : `@${u}`;
    // fallback curto (não usa nome completo com vários sobrenomes)
    const nome = String((p && p.nome) || '').trim();
    if(nome){
      const first = nome.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9_\.]/gi,'');
      return first ? `@${first}` : '@usuario';
    }
    return '@usuario';
  }

  function parseJSON(raw){
    if(!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
  }

  function asArray(input){
    if(Array.isArray(input)) return input;
    if(input && typeof input === 'object'){
      if(Array.isArray(input.items)) return input.items;
      if(Array.isArray(input.data)) return input.data;
      if(Array.isArray(input.rows)) return input.rows;
      if(Array.isArray(input.pedidos)) return input.pedidos;
      if(Array.isArray(input.orcamentos)) return input.orcamentos;
    }
    return [];
  }

  function pick(obj, keys, fallback){
    for(const k of keys){
      const v = obj ? obj[k] : null;
      if(v == null) continue;
      const s = String(v).trim();
      if(s) return s;
    }
    return fallback;
  }

  function toDate(v){
    if(!v) return null;
    if(v instanceof Date && Number.isFinite(v.getTime())) return v;
    if(typeof v === 'number'){
      const d = new Date(v > 1e12 ? v : v * 1000);
      return Number.isFinite(d.getTime()) ? d : null;
    }
    if(typeof v === 'string'){
      const n = Number(v.trim());
      if(Number.isFinite(n)){
        const dn = new Date(v.trim().length >= 13 ? n : n * 1000);
        if(Number.isFinite(dn.getTime())) return dn;
      }
      const d = new Date(v);
      return Number.isFinite(d.getTime()) ? d : null;
    }
    if(typeof v === 'object'){
      if(typeof v.toDate === 'function'){
        const d = v.toDate();
        if(d instanceof Date && Number.isFinite(d.getTime())) return d;
      }
      if(typeof v.seconds === 'number') return new Date(v.seconds * 1000);
      if(typeof v._seconds === 'number') return new Date(v._seconds * 1000);
    }
    return null;
  }

  function formatUpdated(v){
    const d = toDate(v);
    if(!d) return String(v || 'recentemente');
    const diff = Date.now() - d.getTime();
    if(diff < 60000) return 'agora';
    if(diff < 3600000) return `ha ${Math.max(1, Math.round(diff/60000))} min`;
    if(diff < 86400000) return `ha ${Math.max(1, Math.round(diff/3600000))} h`;
    return d.toLocaleDateString('pt-BR');
  }

  function statusCode(raw){
    const s = String(raw || 'pendente').toLowerCase();
    if(s.includes('cancel')) return 'cancelado';
    if(s.includes('and') || s.includes('aceit') || s.includes('pago')) return 'andamento';
    if(s.includes('recus') || s.includes('negad') || s.includes('reprov')) return 'recusado';
    if(s.includes('fin') || s.includes('conc')) return 'finalizado';
    return 'pendente';
  }

  function statusLabel(s){
    if(s === 'andamento') return 'Em andamento';
    if(s === 'cancelado') return 'Cancelado';
    if(s === 'recusado') return 'Recusado';
    if(s === 'finalizado') return 'Finalizado';
    return 'Pendente';
  }

  function statusClass(s){
    if(s === 'andamento') return 'progress';
    if(s === 'cancelado') return 'done';
    if(s === 'recusado') return 'done';
    if(s === 'finalizado') return 'done';
    return 'pending';
  }

  function isPendenteStatus(status){
    const s = String(status || '').toLowerCase();
    return s === 'pendente' || s.includes('pend') || s.includes('aguard') || s.includes('novo') || s.includes('analise');
  }

  function isEmAndamentoStatus(status){
    const s = String(status || '').toLowerCase();
    return s.includes('andamento') || s.includes('em andamento');
  }

  function canOpenChat(p){
    const raw = String(p?.statusOriginal || p?.status || '').toLowerCase();
    if(raw.includes('aceit') || raw.includes('pago')) return true;
    if(raw === 'andamento') return true;
    return false;
  }

  function isStatusFinalizadoOuRecusado(p){
    const sNorm = String(p?.status || '').toLowerCase();
    const sRaw = String(p?.statusOriginal || '').toLowerCase();
    return sNorm === 'finalizado' || sNorm === 'recusado' || sNorm === 'cancelado' || sRaw.includes('finaliz') || sRaw.includes('recus') || sRaw.includes('cancel');
  }

  function getSidebarWidth(){
    const rawCss = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width') || '');
    if(Number.isFinite(rawCss) && rawCss > 0) return rawCss;
    const sidebar = document.querySelector('.sidebar-icones');
    const w = sidebar?.getBoundingClientRect?.().width || 0;
    return Number.isFinite(w) && w > 0 ? w : 250;
  }

  function isDesktopChatMode(){
    return window.innerWidth >= 1024;
  }

  function getChatPanelBounds(){
    const sidebar = getSidebarWidth();
    const available = Math.max(420, Math.round(window.innerWidth - sidebar));
    const keepOrdersVisible = Math.max(240, Math.min(520, Math.round(window.innerWidth * 0.24)));
    const minWidth = Math.min(860, Math.max(620, Math.round(available * 0.54)));
    const maxByViewport = Math.min(1280, available);
    const maxBySplit = available - keepOrdersVisible;
    const maxWidth = Math.max(minWidth, Math.min(maxByViewport, maxBySplit));
    return { minWidth, maxWidth, available };
  }

  function getDefaultChatWidth(){
    const { minWidth, maxWidth, available } = getChatPanelBounds();
    const preferred = Math.round(available * 0.6);
    return Math.max(minWidth, Math.min(maxWidth, preferred));
  }

  function clampChatWidth(v){
    const { minWidth, maxWidth } = getChatPanelBounds();
    const n = Number(v || 0);
    if(!Number.isFinite(n) || n <= 0){
      return getDefaultChatWidth();
    }
    return Math.max(minWidth, Math.min(maxWidth, Math.round(n)));
  }

  function persistChatWidth(){
    if(!state.chatWidth) return;
    try{ localStorage.setItem(CHAT_WIDTH_KEY, String(state.chatWidth)); }catch(_){}
  }

  function setChatPanelTitle(p){
    if(!el.chatPanelTitle) return;
    const nome = String(p?.nome || p?.usuario || '').trim();
    const titulo = String(p?.titulo || '').trim();
    const text = [nome, titulo].filter(Boolean).join(' - ');
    el.chatPanelTitle.innerHTML = `<i class='bx bx-message-square-detail'></i><span>${esc(text || 'Chat do pedido')}</span>`;
  }

  function isAllowedChatIframeLocation(href){
    const src = String(href || '').toLowerCase();
    if(!src || src === 'about:blank') return true;
    const isChatPage = src.includes('/mensagens.html') || /chat\.html(\?|#|$)/i.test(src);
    if(!isChatPage) return false;
    // Garante que permaneça no modo embed (sem shell/sidebar) dentro do painel de pedidos.
    const hasEmbedFlag = src.includes('embed=1') || src.includes('noshell=1') || src.includes('from=pedidos') || src.includes('origin=pedido');
    return hasEmbedFlag;
  }

  function ensureIframeLockedInChat(){
    if(!el.chatFrame || !state.activeChatUrl) return;
    let href = '';
    try{
      href = String(el.chatFrame.contentWindow?.location?.href || '');
    }catch(_){
      href = String(el.chatFrame.getAttribute('src') || '');
    }
    if(isAllowedChatIframeLocation(href)) return;
    el.chatFrame.setAttribute('src', state.activeChatUrl);
    showToast('Navegação bloqueada neste painel. Use Fechar para sair do chat.');
  }

  function setChatFrameLoading(isLoading){
    if(!el.chatFrame) return;
    el.chatFrame.classList.toggle('is-loading', !!isLoading);
  }

  function tuneChatIframeLayout(){
    if(!el.chatFrame) return;
    try{
      const doc = el.chatFrame.contentDocument || el.chatFrame.contentWindow?.document;
      if(!doc || !doc.head) return;
      try { doc.getElementById('pedidosChatCompactPatch')?.remove(); } catch (_) {}
      try { doc.getElementById('pedidosChatCompactPatchV2')?.remove(); } catch (_) {}
      if(doc.getElementById('pedidosChatCompactPatchV3')) return;
      const style = doc.createElement('style');
      style.id = 'pedidosChatCompactPatchV3';
      style.textContent = `
        html, body{
          height:100% !important;
          margin:0 !important;
          padding:0 !important;
          overflow:hidden !important;
        }
        body[data-page="chat"]{
          --chat-top-offset: 0px !important;
          --doke-h: 0px !important;
          --navbar-height-mobile: 0px !important;
          --doke-btm-real: 0px !important;
          --bottom-nav-height: 0px !important;
        }
        /* Nunca mostrar shell/layout externo dentro do iframe do pedidos */
        .sidebar-icones,
        .navbar-desktop,
        .navbar-mobile,
        .bottom-nav,
        .doke-mobile-header,
        #overlay-menu{
          display:none !important;
          visibility:hidden !important;
          pointer-events:none !important;
        }
        body[data-page="chat"] .messenger-layout{
          position:fixed !important;
          inset:0 !important;
          top:0 !important;
          right:0 !important;
          bottom:0 !important;
          left:0 !important;
          margin:0 !important;
          margin-top:0 !important;
          margin-left:0 !important;
          width:100% !important;
          height:100% !important;
          max-height:none !important;
          grid-template-columns:1fr !important;
          border-left:0 !important;
        }
        body[data-page="chat"] .coluna-lista{
          display:none !important;
        }
        body[data-page="chat"] .coluna-chat{
          position:relative !important;
          top:0 !important;
          left:0 !important;
          margin-top:0 !important;
          padding-top:0 !important;
          width:100% !important;
          height:100% !important;
          transform:none !important;
        }
        body[data-page="chat"] .coluna-chat,
        body[data-page="chat"] #box-conversa-real{
          display:flex !important;
          flex-direction:column !important;
          height:100% !important;
          min-height:0 !important;
        }
        body[data-page="chat"] #chat-placeholder{
          display:none !important;
        }
        body[data-page="chat"] .chat-header{
          margin-top:0 !important;
          top:0 !important;
          min-height:58px !important;
        }
        body[data-page="chat"] .mensagens-body,
        body[data-page="chat"] .mensagem-lista{
          padding-top: 8px !important;
          padding-bottom: 8px !important;
          gap: 8px !important;
        }
        body[data-page="chat"] .msg-row{
          margin: 4px 0 !important;
        }
        body[data-page="chat"] .msg-bubble{
          margin: 0 !important;
        }
        body[data-page="chat"] .chat-footer,
        body[data-page="chat"] .composer,
        body[data-page="chat"] .chat-input-area{
          position:sticky !important;
          bottom:0 !important;
          margin-top: 0 !important;
          padding-top: 8px !important;
          padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px)) !important;
        }
      `;
      doc.head.appendChild(style);
    }catch(_){}
  }

  function isPedidoChatVisibleInIframe(){
    if(!el.chatFrame) return false;
    try{
      const doc = el.chatFrame.contentDocument || el.chatFrame.contentWindow?.document;
      if(!doc || !doc.body) return false;
      if(String(doc.body.getAttribute('data-page') || '').toLowerCase() !== 'chat') return false;
      const box = doc.getElementById('box-conversa-real');
      if(!box) return false;
      const view = doc.defaultView;
      const css = view && typeof view.getComputedStyle === 'function' ? view.getComputedStyle(box) : null;
      if(css && css.display === 'none') return false;
      return String(box.style?.display || '').toLowerCase() !== 'none';
    }catch(_){
      return false;
    }
  }

  function waitForPedidoChatReady(maxWaitMs = 2800){
    const startedAt = Date.now();
    const tick = () => {
      ensureIframeLockedInChat();
      tuneChatIframeLayout();
      forceOpenPedidoChatInIframe();
      if(isPedidoChatVisibleInIframe() || (Date.now() - startedAt) >= maxWaitMs){
        setChatFrameLoading(false);
        return;
      }
      setTimeout(tick, 120);
    };
    tick();
  }

  function forceOpenPedidoChatInIframe(){
    if(!el.chatFrame || !state.activePedidoId) return;
    try{
      const cw = el.chatFrame.contentWindow;
      if(!cw) return;
      const abrirChatFn = cw.abrirChat;
      if(typeof abrirChatFn !== 'function') return;
      const pedidoId = String(state.activePedidoId || '').trim();
      const outroUid = String(state.activeChatOutroUid || '').trim();
      const statusRaw = String(state.activeChatStatusRaw || 'pendente').trim();
      if(!pedidoId) return;
      abrirChatFn(pedidoId, outroUid, '', '', 'pedidos', statusRaw);
    }catch(_){}
  }

  function setChatExpandButtonState(){
    if(!el.chatExpandBtn) return;
    const expanded = !!state.chatMaximized;
    el.chatExpandBtn.setAttribute('aria-pressed', expanded ? 'true' : 'false');
    el.chatExpandBtn.setAttribute('title', expanded ? 'Restaurar tamanho' : 'Expandir chat');
    el.chatExpandBtn.setAttribute('aria-label', expanded ? 'Restaurar tamanho do chat' : 'Expandir chat');
    el.chatExpandBtn.innerHTML = `<i class='bx ${expanded ? 'bx-collapse-alt' : 'bx-expand-alt'}'></i>`;
  }

  function updateChatWidthUi(){
    const hasDesktop = isDesktopChatMode();
    const { minWidth, maxWidth } = getChatPanelBounds();
    const width = clampChatWidth(state.chatWidth || localStorage.getItem(CHAT_WIDTH_KEY));
    if(el.chatNarrowBtn){
      el.chatNarrowBtn.disabled = !hasDesktop || state.chatMaximized || width <= minWidth;
    }
    if(el.chatWidenBtn){
      el.chatWidenBtn.disabled = !hasDesktop || state.chatMaximized || width >= maxWidth;
    }
    if(el.chatWidthLabel){
      if(!hasDesktop){
        el.chatWidthLabel.textContent = '--';
        el.chatWidthLabel.title = '';
      }else if(state.chatMaximized){
        el.chatWidthLabel.textContent = 'MAX';
        el.chatWidthLabel.title = 'Tela inteira';
      }else{
        const pct = Math.round((width / Math.max(1, window.innerWidth)) * 100);
        el.chatWidthLabel.textContent = `${pct}%`;
        el.chatWidthLabel.title = `${width}px`;
      }
    }
  }

  function applyChatPanelLayout(){
    if(!el.chatPanel) return;
    if(!isDesktopChatMode()){
      state.chatResizing = false;
      state.chatMaximized = false;
      el.chatPanel.classList.remove('maximized');
      el.chatPanel.style.width = '';
      document.body.classList.remove('chat-resizing');
      document.body.classList.remove('chat-split-full');
      setChatExpandButtonState();
      updateChatWidthUi();
      return;
    }

    // Em split view (desktop), permitimos expandir para ocupar tambem a area dos pedidos
    if(document.body.classList.contains('chat-split-open')){
      state.chatResizing = false;
      el.chatPanel.classList.remove('maximized');
      el.chatPanel.style.width = '';
      document.body.classList.remove('chat-resizing');
      document.body.classList.toggle('chat-split-full', !!state.chatMaximized);
      setChatExpandButtonState();
      updateChatWidthUi();
      return;
    }

    if(state.chatMaximized){
      el.chatPanel.classList.add('maximized');
      el.chatPanel.style.width = '';
    }else{
      el.chatPanel.classList.remove('maximized');
      state.chatWidth = clampChatWidth(state.chatWidth || localStorage.getItem(CHAT_WIDTH_KEY));
      el.chatPanel.style.width = `${state.chatWidth}px`;
    }
    setChatExpandButtonState();
    updateChatWidthUi();
  }

  function toggleChatMaximize(){
    if(!isDesktopChatMode()) return;
    state.chatMaximized = !state.chatMaximized;
    applyChatPanelLayout();
  }

  function startChatResize(ev){
    if(!isDesktopChatMode() || state.chatMaximized || !el.chatPanel) return;
    if(ev.button !== 0) return;
    ev.preventDefault();
    state.chatResizing = true;
    state.chatResizeStartX = ev.clientX;
    state.chatResizeStartWidth = el.chatPanel.getBoundingClientRect().width;
    document.body.classList.add('chat-resizing');
  }

  function handleChatResizeMove(ev){
    if(!state.chatResizing || !el.chatPanel) return;
    const delta = state.chatResizeStartX - ev.clientX;
    const width = clampChatWidth(state.chatResizeStartWidth + delta);
    state.chatWidth = width;
    el.chatPanel.style.width = `${width}px`;
    updateChatWidthUi();
  }

  function stopChatResize(){
    if(!state.chatResizing) return;
    state.chatResizing = false;
    document.body.classList.remove('chat-resizing');
    persistChatWidth();
  }

  function nudgeChatWidth(delta){
    if(!isDesktopChatMode() || state.chatMaximized) return;
    const base = clampChatWidth(state.chatWidth || localStorage.getItem(CHAT_WIDTH_KEY));
    state.chatWidth = clampChatWidth(base + Number(delta || 0));
    if(el.chatPanel) el.chatPanel.style.width = `${state.chatWidth}px`;
    updateChatWidthUi();
    persistChatWidth();
  }

  function resetChatWidth(){
    if(!isDesktopChatMode() || state.chatMaximized) return;
    state.chatWidth = getDefaultChatWidth();
    if(el.chatPanel) el.chatPanel.style.width = `${state.chatWidth}px`;
    updateChatWidthUi();
    persistChatWidth();
  }

  function looksLikeImage(url){
    const s = String(url || '').toLowerCase();
    return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/.test(s) || s.includes('/storage/v1/object/public/');
  }

  function normalizeMediaUrl(v){
    if(!v) return '';
    if(typeof v === 'string') return v.trim();
    if(typeof v === 'object'){
      return String(v.url || v.src || v.link || '').trim();
    }
    return '';
  }

  function normalizeId(v){
    const id = String(v == null ? '' : v).trim();
    if(!id) return '';
    if(/^PD-\d+$/i.test(id)) return '';
    if(/^TEMP-/i.test(id)) return '';
    if(/^NEW-/i.test(id)) return '';
    return id;
  }

  function resolveUid(){
    return String(window.auth?.currentUser?.uid || window.firebaseAuth?.currentUser?.uid || localStorage.getItem('doke_uid') || '').trim();
  }

  async function resolveSessionUid(){
    try{
      if(window.sb?.auth?.getSession){
        const { data } = await window.sb.auth.getSession();
        const user = data?.session?.user || null;
        const uid = String(user?.id || user?.uid || '').trim();
        if(uid){
          try{ localStorage.setItem('doke_uid', uid); }catch(_){}
          try{
            const perfilSalvo = parseJSON(localStorage.getItem('doke_usuario_perfil')) || {};
            const merged = Object.assign({}, perfilSalvo, { uid, id: uid, email: user?.email || perfilSalvo.email || null });
            localStorage.setItem('doke_usuario_perfil', JSON.stringify(merged));
          }catch(_){}
        }
        return uid;
      }
    }catch(_){}
    return '';
  }

  async function ensurePedidosAuth(){
    const directUid = resolveUid();
    const sessionUid = directUid || await resolveSessionUid();
    if(sessionUid) return true;
    state.pedidos = [];
    try{ render(); }catch(_){}
    const next = encodeURIComponent((location.pathname || '').split('/').pop() || 'pedidos.html');
    try{ showToast('Faça login para acessar seus pedidos.'); }catch(_){}
    setTimeout(() => { location.href = `login.html?next=${next}`; }, 120);
    return false;
  }

  function normalizePedido(row, idx, forcedId){
    if(!row || typeof row !== 'object') return null;
    const id = normalizeId(forcedId || pick(row, ['id','codigo','pedidoId','idPedido','orderId','orcamentoId','chatId','threadId','postid','docId'], ''));
    if(!id) return null;

    const uidAtual = resolveUid();
    const deUid = pick(row, ['deUid','deuid','de_uid','clienteUid','clienteuid','cliente_uid'], '');
    const paraUid = pick(row, ['paraUid','parauid','para_uid','prestadorUid','prestadoruid','prestador_uid'], '');
    const isSouCliente = !!uidAtual && !!deUid && String(uidAtual) === String(deUid);
    const isSouProfissional = !!uidAtual && !!paraUid && String(uidAtual) === String(paraUid);

    const nome = isSouCliente
      ? pick(row, ['paraNome','nomePrestador','profissionalNome','nomeProfissional','prestadorNome','profissional_nome','prestador_nome','nome','nomeCliente','clienteNome','cliente','usuarioNome','userName','deNome'], 'Profissional')
      : isSouProfissional
        ? pick(row, ['deNome','nomeCliente','clienteNome','nome','cliente','usuarioNome','userName','paraNome'], 'Cliente')
        : pick(row, ['nome','nomeCliente','clienteNome','cliente','usuarioNome','userName','deNome','paraNome'], 'Cliente');

    const usuarioBase = isSouCliente
      ? pick(row, ['paraUser','usuarioPrestador','usernamePrestador','profissionalUser','profissional_user','prestadorUser','prestador_user','usuario','username','user','handle'], '')
      : isSouProfissional
        ? pick(row, ['deUser','usuarioCliente','usernameCliente','usuario','username','user','handle'], '')
        : pick(row, ['usuario','username','user','handle','deUser','paraUser'], '');
    const usuario = usuarioBase
      ? (String(usuarioBase).startsWith('@') ? String(usuarioBase) : `@${String(usuarioBase).trim()}`)
      : '';
    const titulo = pick(row, ['titulo','servicoReferencia','nomeServico','servico','assunto','pedidoTitulo','orcamentoTitulo','title'], 'Pedido');
    const descricao = pick(row, ['descricao','descricaoBase','mensagem','mensagemInicial','detalhes','observacoes','preview','ultimaMensagem'], 'Sem detalhes adicionais.');
    const tipoRaw = pick(row, ['tipo','tipoPedido','categoriaTipo'], '');
    const tipo = tipoRaw || (String(titulo).toLowerCase().includes('orc') ? 'Orcamento' : 'Servico');
    const status = statusCode(pick(row, ['status','statusPedido','situacao','estado'], 'pendente'));

    const updatedRaw = pick(row, ['dataAtualizacao','updatedAt','updatedat','ultimaAtualizacao','timestamp','lastMessageAt','createdAt'], '');
    const createdRaw = pick(row, ['criadoEm','createdAt','createdat','dataCriacao','dataPedido'], updatedRaw || new Date().toISOString());
    const recusaObj = (row.recusa && typeof row.recusa === 'object') ? row.recusa : {};
    const meuPapel = isSouCliente ? 'cliente' : (isSouProfissional ? 'profissional' : pick(row, ['meuPapel','papelMeu','papel_usuario'], ''));
    const papelContato = isSouCliente ? 'profissional' : (isSouProfissional ? 'cliente' : pick(row, ['papelContato','papel_outro','papelDestino'], ''));
    const papelContatoLabel = papelContato === 'profissional' ? 'Profissional' : (papelContato === 'cliente' ? 'Cliente' : '');
    const meuPapelLabel = '';

    return {
      id,
      usuario,
      nome,
      avatar: pick(row, isSouCliente
        ? ['paraFoto','fotoPrestador','fotoProfissional','profissionalFoto','profissional_foto','prestadorFoto','prestador_foto','fotoContato','contatoFoto','profilePicture','avatar','foto','fotoPerfil','deFoto','fotoCliente']
        : isSouProfissional
          ? ['deFoto','fotoCliente','fotoContato','contatoFoto','profilePicture','avatar','foto','fotoPerfil','paraFoto','profissionalFoto']
          : ['avatar','foto','fotoContato','contatoFoto','fotoCliente','fotoPerfil','profilePicture','deFoto','paraFoto','clienteFoto','profissionalFoto']
      , 'assets/Imagens/user_placeholder.png'),
      titulo,
      descricao,
      tipo,
      status,
      urgente: !!(row.urgente || String(row.prioridade || '').toLowerCase() === 'alta' || String(row.priority || '').toLowerCase() === 'high'),
      prazo: pick(row, ['prazo','paraQuando','dataEspecifica','deadline','turno'], 'A combinar'),
      atualizado: formatUpdated(updatedRaw || createdRaw),
      valor: pick(row, ['valor','preco','orcamento','faixa','precoFormatado','valorOrcamento','valor_orcamento'], 'Sob Orcamento'),
      naoLidas: Number(row.naoLidas || row.naolidas || row.unread || row.unreadCount || row.mensagensNaoLidas || row.qtdNaoLidas || 0) || 0,
      criadoEm: (toDate(createdRaw) || new Date()).toISOString(),
      categoria: pick(row, ['categoria','area','segmento','tipoServico'], 'Geral'),
      meuPapel,
      meuPapelLabel,
      papelContato,
      papelContatoLabel,
      deUid,
      paraUid,
      anuncioId: pick(row, ['anuncioId','anuncio_id','aid','anuncioid'], ''),
      servicoReferencia: pick(row, ['servicoReferencia','titulo','nomeServico','servico'], ''),
      mensagemInicial: pick(row, ['mensagemInicial','descricao','descricaoBase','detalhes'], ''),
      descricaoBase: pick(row, ['descricaoBase','descricao','mensagemInicial'], ''),
      paraQuando: pick(row, ['paraQuando','prazo','dataEspecifica'], ''),
      dataEspecifica: pick(row, ['dataEspecifica'], ''),
      turno: pick(row, ['turno'], ''),
      respostasTriagem: Array.isArray(row.respostasTriagem) ? row.respostasTriagem : [],
      localizacao: row.localizacao || row['localizacao'] || row['localização'] || row['localiza??o'] || null,
      modoAtend: pick(row, ['modoAtend','modo_atend'], ''),
      statusOriginal: pick(row, ['status','statusPedido','situacao','estado'], ''),
      motivoRecusa: pick(row, ['motivoRecusa','justificativaRecusa','recusaMotivo','motivoRejeicao','motivo_recusa','motivoCancelamento','motivo_cancelamento'], pick(recusaObj, ['motivo','justificativa','descricao'], '')),
      anexos: Array.isArray(row.anexos) ? row.anexos : []
    };
  }

  function otherUidFromPedido(p){
    if(!p) return '';
    if(String(p.meuPapel || '') === 'cliente') return String(p.paraUid || '').trim();
    if(String(p.meuPapel || '') === 'profissional') return String(p.deUid || '').trim();
    const uid = resolveUid();
    const a = String(p.deUid || '').trim();
    const b = String(p.paraUid || '').trim();
    if(uid && a && uid === a) return b;
    if(uid && b && uid === b) return a;
    return b || a;
  }

  function otherUserFromPedido(p){
    const u = String((p && (p.usuario || p.user || p.username)) || '').trim();
    return u.replace(/^@/,'').trim();
  }

  function isUuidLike(value){
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
  }

  function isPlaceholderAvatar(url){
    const s = String(url || '').trim();
    if(!s) return true;
    if(/user_placeholder\.png$/i.test(s)) return true;
    if(s.includes('assets/Imagens/user_placeholder.png')) return true;
    return false;
  }

  async function fetchUsuarioPerfil(key, mode){
    const raw = String(key || '').trim();
    if(!raw) return null;
    const kind = mode || (raw.startsWith('user:') ? 'user' : 'uid');
    const cacheKey = (raw.startsWith('uid:') || raw.startsWith('user:')) ? raw : `${kind}:${raw}`;
    if(state.userByUid.has(cacheKey)) return state.userByUid.get(cacheKey);

    const sb = window.sb;
    if(!sb || typeof sb.from !== 'function'){
      state.userByUid.set(cacheKey, null);
      return null;
    }

    const cols = 'id,uid,user,nome,foto,categoria,area,isProfissional,is_profissional';
    try{
      async function tryTable(table){
        if(state.invalidUserTables.has(table)) return { data: null, error: null };
        let q = sb.from(table).select(cols).limit(1);
        const uidField = table === 'usuarios_legacy' ? 'uid_text' : 'uid';
        const userFieldCandidates = ['user','usuario','username'];

        if(kind === 'user'){
          const u = raw.replace(/^user:/,'').replace(/^@/,'').trim();
          if(!u) return { data: null, error: null };
          q = q.or(userFieldCandidates.map((f)=> `${f}.eq.${u}`).join(','));
        }else{
          const u = raw.replace(/^uid:/,'').trim();
          const orFilters = [`${uidField}.eq.${u}`];
          if(uidField !== 'uid') orFilters.push(`uid.eq.${u}`);
          if(!isUuidLike(u)) orFilters.push(`id.eq.${u}`);
          q = q.or(orFilters.join(','));
        }

        const res = (q.maybeSingle ? await q.maybeSingle() : await q);
        if(res?.error && (res.error.status === 404 || /not found|could not find/i.test(String(res.error.message || '')))){
          state.invalidUserTables.add(table);
          return { data: null, error: null };
        }
        return res;
      }

      let { data, error } = await tryTable('usuarios_legacy');
      if((error || !data)){
        const r2 = await tryTable('usuarios');
        data = r2?.data || null;
        error = r2?.error || null;
      }
      if(error){
        console.warn('[pedidos] usuarios fetch error:', error);
        state.userByUid.set(cacheKey, null);
        return null;
      }

      if(data && data.foto){
        const f = String(data.foto).trim();
        if(f && !/^https?:\/\//i.test(f) && !f.includes('/storage/v1/object/public/')){
          try{
            const pub = sb.storage?.from?.('perfil')?.getPublicUrl?.(f);
            const url = pub?.data?.publicUrl;
            if(url) data.foto = url;
          }catch(_){}
        }
      }

      state.userByUid.set(cacheKey, data || null);
      return data || null;
    }catch(err){
      console.warn('[pedidos] usuarios fetch exception:', err);
      state.userByUid.set(cacheKey, null);
      return null;
    }
  }

  async function enrichPedidosComUsuarios(pedidos){
    const arr = Array.isArray(pedidos) ? pedidos : [];
    if(!arr.length) return arr;

    const keysSet = new Set();
    arr.forEach((p) => {
      const ouid = otherUidFromPedido(p);
      if(ouid) keysSet.add(`uid:${String(ouid).trim()}`);
      else{
        const u = otherUserFromPedido(p);
        if(u) keysSet.add(`user:${u}`);
      }
    });

    const keys = Array.from(keysSet).filter(Boolean);
    if(!keys.length) return arr;

    const CONC = 8;
    let i = 0;
    const results = new Map();
    async function worker(){
      while(i < keys.length){
        const idx = i++;
        const k = keys[idx];
        const mode = k.startsWith('user:') ? 'user' : 'uid';
        const data = await fetchUsuarioPerfil(k, mode);
        results.set(k, data);
      }
    }
    await Promise.all(Array.from({length: Math.min(CONC, keys.length)}, worker));

    arr.forEach((p) => {
      const ouid = otherUidFromPedido(p);
      const uhandle = otherUserFromPedido(p);
      const k = ouid ? `uid:${String(ouid).trim()}` : (uhandle ? `user:${uhandle}` : '');
      const u = k ? results.get(k) : null;
      if(!u) return;

      const nome = String(u.nome || '').trim();
      const user = String(u.user || u.usuario || u.username || '').trim();
      const foto = normalizeMediaUrl(u.foto);
      const cat = String(u.categoria || u.area || '').trim();

      if(nome) p.nome = nome;
      if(user){
        const handle = user.startsWith('@') ? user : `@${user}`;
        p.usuario = handle;
      }
      if(foto && (isPlaceholderAvatar(p.avatar) || !p.avatar)) p.avatar = foto;
      if(cat && (!p.categoria || p.categoria === 'Geral')) p.categoria = cat;
    });

    return arr;
  }

  function mergePedidos(list){
    const statusRank = (val) => {
      const s = String(val || '').toLowerCase();
      if(!s) return -1;
      if(s.includes('finaliz') || s.includes('conc')) return 4;
      if(s.includes('recus') || s.includes('cancel') || s.includes('negad') || s.includes('reprov')) return 3;
      if(s.includes('and') || s.includes('aceit') || s.includes('pago')) return 2;
      if(s.includes('pend') || s.includes('aguard') || s.includes('novo') || s.includes('analise')) return 1;
      return 0;
    };
    const map = new Map();
    (list || []).forEach((p) => {
      if(!p || !p.id) return;
      const key = String(p.id);
      const cur = map.get(key);
      if(!cur){ map.set(key, {...p}); return; }
      const next = {...cur};
      Object.keys(p).forEach((k) => {
        const v = p[k];
        if(k === 'status' || k === 'statusOriginal'){
          const curRank = statusRank(next[k]);
          const newRank = statusRank(v);
          if(newRank > curRank && String(v || '').trim() !== '') next[k] = v;
          return;
        }
        if(k === 'motivoRecusa'){
          const curTxt = String(next[k] || '').trim();
          const newTxt = String(v || '').trim();
          if(newTxt && (!curTxt || newTxt.length > curTxt.length)) next[k] = newTxt;
          return;
        }
        if(k === 'naoLidas'){ next[k] = Math.max(Number(next[k] || 0), Number(v || 0)); return; }
        if(k === 'descricao' && String(v || '').length > String(next[k] || '').length){ next[k] = v; return; }
        if(Array.isArray(v) && v.length && (!Array.isArray(next[k]) || !next[k].length)){ next[k] = v; return; }
        if(v && typeof v === 'object' && !Array.isArray(v) && (!next[k] || typeof next[k] !== 'object' || Array.isArray(next[k]))){ next[k] = v; return; }
        if((next[k] == null || String(next[k]).trim() === '' || String(next[k]) === '�') && String(v ?? '').trim() !== '') next[k] = v;
      });
      map.set(key, next);
    });
    return Array.from(map.values());
  }

  function looksPedidoRow(row){
    if(!row || typeof row !== 'object') return false;
    const id = normalizeId(pick(row, ['id','codigo','pedidoId','idPedido','orderId','orcamentoId','chatId','threadId','postid','docId'], ''));
    if(!id) return false;
    const directSignals = [
      row.pedidoId, row.idPedido, row.orcamentoId, row.statusPedido, row.paraQuando,
      row.dataEspecifica, row.prazo, row.descricaoBase, row.respostasTriagem,
      row.formularioRespostas, row.modoAtend, row.localizacao, row['localização'], row['localiza??o'], row.servicoReferencia
    ];
    if(directSignals.some(Boolean)) return true;
    const keys = Object.keys(row).map((k) => String(k || '').toLowerCase());
    return keys.some((k) =>
      k.includes('pedido') ||
      k.includes('orcamento') ||
      k.includes('prazo') ||
      k.includes('triagem')
    );
  }

  function hiddenPedidosKey(){
    const uid = resolveUid();
    return uid ? `doke_hidden_pedidos_${uid}` : `doke_hidden_pedidos`;
  }

  function hiddenPedidosGlobalKey(){
    return `doke_hidden_pedidos`;
  }

  function getHiddenPedidosSet(){
    const out = new Set();
    const readKey = (k) => {
      try{
        const arr = parseJSON(localStorage.getItem(k));
        if(Array.isArray(arr)){
          arr.forEach((v) => {
            const s = String(v || '').trim();
            if(s) out.add(s);
          });
        }
      }catch(_){ }
    };
    readKey(hiddenPedidosGlobalKey());
    const uid = resolveUid();
    if(uid) readKey(`doke_hidden_pedidos_${uid}`);
    return out;
  }

  function persistHiddenPedidosSet(set){
    const arr = JSON.stringify(Array.from(set));
    try{ localStorage.setItem(hiddenPedidosKey(), arr); }catch(_){}
    try{ localStorage.setItem(hiddenPedidosGlobalKey(), arr); }catch(_){}
  }

  function addHiddenPedidos(ids){
    const set = getHiddenPedidosSet();
    (ids || []).forEach((id) => {
      const key = String(id || '').trim();
      if(key) set.add(key);
    });
    persistHiddenPedidosSet(set);
  }

  function purgePedidosFromLocalCaches(ids){
    const idset = new Set((ids || []).map((v) => String(v || '').trim()).filter(Boolean));
    if(!idset.size) return;
    try{
      if(Array.isArray(window.pedidosCache)){
        window.pedidosCache = window.pedidosCache.filter((row) => {
          const rid = normalizeId(pick(row, ['id','codigo','pedidoId','idPedido','orderId','orcamentoId','chatId','threadId','postid','docId'], ''));
          return !idset.has(String(rid));
        });
      }
    }catch(_){ }

    const keys = [
      'doke_pedidos','pedidos','DOKE_PEDIDOS','meus_pedidos','cachePedidos','doke_cache_pedidos',
      'orcamentos','doke_orcamentos','orcamentosCache','doke_orcamentos_cache','doke_cache_orcamentos','orcamentos_pedidos'
    ];
    keys.forEach((key) => {
      try{
        const arr = asArray(parseJSON(localStorage.getItem(key)));
        if(!arr.length) return;
        const next = arr.filter((row) => {
          const rid = normalizeId(pick(row, ['id','codigo','pedidoId','idPedido','orderId','orcamentoId','chatId','threadId','postid','docId'], ''));
          return !idset.has(String(rid));
        });
        if(next.length !== arr.length) localStorage.setItem(key, JSON.stringify(next));
      }catch(_){ }
    });
  }

  function patchPedidoRowLike(row, id, status, motivoRecusa){
    if(!row || typeof row !== 'object') return row;
    const rid = normalizeId(pick(row, ['id','codigo','pedidoId','idPedido','orderId','orcamentoId','chatId','threadId','postid','docId'], ''));
    if(String(rid) !== String(id)) return row;
    const out = { ...row };
    const nowIso = new Date().toISOString();
    out.status = status;
    out.statusPedido = status;
    out.situacao = status;
    out.estado = status;
    out.dataAtualizacao = nowIso;
    out.updatedAt = nowIso;
    if(status === 'aceito') out.dataAceite = nowIso;
    if(status === 'recusado'){
      const motivo = String(motivoRecusa || '').trim();
      out.dataRecusa = nowIso;
      out.motivoRecusa = motivo;
      out.justificativaRecusa = motivo;
      out.recusaMotivo = motivo;
      out.motivoRejeicao = motivo;
      out.motivo = motivo;
      out.recusa = { motivo, data: nowIso };
    }
    return out;
  }

  function patchLocalPedidoCaches(id, status, motivoRecusa){
    const arrKeys = [
      'doke_pedidos','pedidos','DOKE_PEDIDOS','meus_pedidos','cachePedidos','doke_cache_pedidos',
      'orcamentos','doke_orcamentos','orcamentosCache','doke_orcamentos_cache','doke_cache_orcamentos','orcamentos_pedidos'
    ];
    arrKeys.forEach((key) => {
      const raw = parseJSON(localStorage.getItem(key));
      const arr = asArray(raw);
      if(!arr.length) return;
      const next = arr.map((row) => patchPedidoRowLike(row, id, status, motivoRecusa));
      try{ localStorage.setItem(key, JSON.stringify(next)); }catch(_){}
    });

    const singleKeys = ['doke_pedido_contexto','doke_pedido_detalhes','pedidoAtual','pedidoSelecionado'];
    singleKeys.forEach((key) => {
      const row = parseJSON(localStorage.getItem(key));
      if(!row || typeof row !== 'object') return;
      const next = patchPedidoRowLike(row, id, status, motivoRecusa);
      try{ localStorage.setItem(key, JSON.stringify(next)); }catch(_){}
    });
  }

  function mine(row, uid){
    if(!uid) return false;
    const fields = [
      row.deUid,row.deuid,row.de_uid,row.clienteUid,row.clienteuid,row.cliente_uid,row.uidCliente,row.uid_cliente,row.solicitanteUid,row.solicitante_uid,
      row.paraUid,row.parauid,row.para_uid,row.prestadorUid,row.prestadoruid,row.prestador_uid,row.profissionalUid,row.profissionaluid,row.profissional_uid,row.uidPrestador,row.uid_prestador,
      row.participante1,row.participante2,row.uid1,row.uid2,row.clienteId,row.profissionalId
    ].map(v => String(v || '').trim()).filter(Boolean);
    if(Array.isArray(row.participantes)) fields.push(...row.participantes.map(v => String(v || '').trim()).filter(Boolean));
    return fields.includes(String(uid));
  }

  async function loadFirestore(){
    const { getFirestore, collection, query, limit, getDocs } = window || {};
    if(typeof getFirestore !== 'function' || typeof collection !== 'function' || typeof query !== 'function' || typeof limit !== 'function' || typeof getDocs !== 'function') return [];
    const uid = resolveUid();
    const hidden = getHiddenPedidosSet();
    const db = window.db || getFirestore();

    try{
      const snap = await getDocs(query(collection(db, 'pedidos'), limit(300)));
      const out = [];
      let idx = 0;
      snap.forEach((d) => {
        const row = d.data() || {};
        if(!mine(row, uid)) return;
        const n = normalizePedido(row, idx++, d.id);
        if(n && !hidden.has(String(n.id))) out.push(n);
      });
      const merged = mergePedidos(out);
      try{ await enrichPedidosComUsuarios(merged); }catch(_e){}
      return mergePedidos(merged);
    }catch(err){
      console.warn('Firestore pedidos erro:', err);
      return [];
    }
  }

  function loadLocal(){
    const uid = resolveUid();
    if(!uid) return [];
    const hidden = getHiddenPedidosSet();
    let list = [];

    if(Array.isArray(window.pedidosCache)){
      list = list.concat(window.pedidosCache.map((r,i)=>normalizePedido(r,i)).filter((p) => p && !hidden.has(String(p.id))));
    }

    const primaryKeys = [
      'doke_pedidos','pedidos','DOKE_PEDIDOS','meus_pedidos','cachePedidos','doke_cache_pedidos',
      'orcamentos','doke_orcamentos','orcamentosCache','doke_orcamentos_cache','doke_cache_orcamentos','orcamentos_pedidos'
    ];

    primaryKeys.forEach((key) => {
      const arr = asArray(parseJSON(localStorage.getItem(key)));
      arr.forEach((row, idx) => {
        const n = normalizePedido(row, idx);
        if(n && !hidden.has(String(n.id))) list.push(n);
      });
    });

    const singleRows = [
      parseJSON(localStorage.getItem('doke_pedido_contexto')),
      parseJSON(localStorage.getItem('doke_pedido_detalhes')),
      parseJSON(localStorage.getItem('pedidoAtual')),
      parseJSON(localStorage.getItem('doke_chat_prefill')),
      parseJSON(localStorage.getItem('pedidoSelecionado'))
    ].filter(Boolean);
    singleRows.forEach((row, idx) => {
      const n = normalizePedido(row, idx);
      if(n && !hidden.has(String(n.id))) list.push(n);
    });

    return mergePedidos(list);
  }

  function sortList(list){
    const arr = [...list];
    if(state.sort === 'updated') return arr.sort((a,b)=>String(a.atualizado).localeCompare(String(b.atualizado), 'pt-BR'));
    if(state.sort === 'unread') return arr.sort((a,b)=>Number(b.naoLidas||0)-Number(a.naoLidas||0) || (new Date(b.criadoEm)-new Date(a.criadoEm)));
    if(state.sort === 'urgent') return arr.sort((a,b)=>Number(b.urgente)-Number(a.urgente) || (new Date(b.criadoEm)-new Date(a.criadoEm)));
    return arr.sort((a,b)=>{
      const pa = isEmAndamentoStatus(a.status)?0:(isPendenteStatus(a.status)?1:2);
      const pb = isEmAndamentoStatus(b.status)?0:(isPendenteStatus(b.status)?1:2);
      return pa-pb || (new Date(b.criadoEm)-new Date(a.criadoEm));
    });
  }

  function filtered(){
    let arr = [...state.pedidos];
    if(state.filter === 'pending') arr = arr.filter(p=>p.status === 'pendente');
    if(state.filter === 'today') arr = arr.filter(p=>String(p.atualizado).includes('agora') || String(p.atualizado).includes('ha'));
    if(state.filter === 'progress') arr = arr.filter(p=>p.status === 'andamento');
    if(state.filter === 'done') arr = arr.filter(p=>p.status === 'finalizado' || p.status === 'recusado' || p.status === 'cancelado');
    if(state.filter === 'urgent') arr = arr.filter(p=>p.urgente);
    if(state.filter === 'to_approve') arr = arr.filter(p=>p.status === 'pendente' && String(p.meuPapel||'') === 'profissional');
    if(state.filter === 'respond_quote') arr = arr.filter(p=>p.status === 'pendente' && String(p.meuPapel||'') === 'profissional' && /orc/i.test(String(p.tipo||'') + ' ' + String(p.titulo||'')));
    if(state.filter === 'waiting_client') arr = arr.filter(p=>p.status === 'andamento' && String(p.meuPapel||'') === 'profissional');
    if(state.filter === 'waiting_response') arr = arr.filter(p=>p.status === 'pendente' && String(p.meuPapel||'') === 'cliente');

    const q = state.query.trim().toLowerCase();
    if(q){
      arr = arr.filter(p => [p.id,p.nome,p.usuario,p.titulo,p.descricao,p.categoria,p.tipo,p.prazo,p.valor].filter(Boolean).join(' ').toLowerCase().includes(q));
    }

    return sortList(arr);
  }

  function card(p){
    const selected = state.selected.has(String(p.id));
    const isActive = document.body.classList.contains('chat-open') && state.activePedidoId && String(state.activePedidoId) === String(p.id);
    const pendente = isPendenteStatus(p.status);
    const isProfViewer = String(p.meuPapel || '') === 'profissional';
    const isClientViewer = String(p.meuPapel || '') === 'cliente';
    const canDecide = pendente && isProfViewer;
    const canCancel = pendente && isClientViewer;
    const chatLiberado = canOpenChat(p);
    const motivoRecusa = String(p.motivoRecusa || '').trim();
    const isRecusado = String(p.status || '').toLowerCase() === 'recusado';
    return `
      <article class="card card-pedido ${selected ? 'selected' : ''} ${isActive ? 'chat-active' : ''}" data-id="${esc(p.id)}" data-status="${esc(String(p.status||''))}">
        <div class="card-top">
          <div class="tags">
            <span class="tag type"><i class='bx bx-receipt'></i>${esc(p.tipo)}</span>
            <span class="tag ${statusClass(p.status)}">${esc(statusLabel(p.status))}</span>
            ${p.urgente ? `<span class="tag urgent"><i class='bx bx-error'></i>Urgente</span>` : ''}
          </div>
          <button class="card-select" type="button" data-action="select" data-id="${esc(p.id)}" aria-label="Selecionar pedido">
            <i class='bx bx-check'></i>
          </button>
        </div>

        ${canDecide ? `
          <div class="card-decision-top">
            <button class="btn-order accept" type="button" data-action="accept" data-id="${esc(p.id)}"><i class='bx bx-check'></i>Aceitar</button>
            <button class="btn-order reject" type="button" data-action="reject" data-id="${esc(p.id)}"><i class='bx bx-x'></i>Recusar</button>
          </div>
        ` : ``}
        ${canCancel ? `
          <div class="card-decision-top">
            <button class="btn-order reject" type="button" data-action="cancel" data-id="${esc(p.id)}"><i class='bx bx-x-circle'></i>Cancelar pedido</button>
          </div>
        ` : ``}

        <div class="user" data-profile="1" data-profile-uid="${esc(otherUidFromPedido(p))}" data-profile-user="${esc(otherUserFromPedido(p))}">
          <img src="${esc(normalizeMediaUrl(p.avatar) || 'assets/Imagens/user_placeholder.png')}" alt="Avatar" onerror="this.onerror=null;this.src='assets/Imagens/user_placeholder.png'"/>
          <div class="user-meta">
            <strong>${esc(displayHandle(p))}</strong>
            <span>${esc(p.categoria || 'Geral')}</span>
          </div>
        </div>

        <div class="title-row">
          <h3 class="title">${esc(p.titulo)}</h3>
        </div>
        ${p.descricao ? `<p class="desc">${esc(p.descricao)}</p>` : ``}
        ${isRecusado && motivoRecusa ? `<p class="recusa-note"><i class='bx bx-error-circle'></i><span>${esc(motivoRecusa)}</span></p>` : ``}

        <div class="meta">
          <div class="meta-item"><i class='bx bx-time-five'></i><div><small>Prazo</small><strong>${esc(p.prazo || 'A combinar')}</strong></div></div>
          <div class="meta-item"><i class='bx bx-refresh'></i><div><small>Atualizado</small><strong>${esc(p.atualizado || 'recentemente')}</strong></div></div>
          <div class="meta-item"><i class='bx bx-wallet'></i><div><small>Valor</small><strong>${esc(String(p.valor ?? 'Sob Orcamento'))}</strong></div></div>
          <div class="meta-item"><i class='bx bx-message-dots'></i><div><small>Chat</small><strong>${p.naoLidas ? `${p.naoLidas} nao lida${p.naoLidas > 1 ? 's' : ''}` : 'Sem novas'}</strong></div></div>
        </div>

        <div class="footer">
          <div class="actions ${chatLiberado ? '' : 'single-action'}">
            ${chatLiberado ? `<button class="btn-order primary ${isActive ? 'danger' : ''}" type="button" data-action="chat" data-id="${esc(p.id)}"><i class='bx bx-message-square-detail'></i><span class="btn-text">${isActive ? 'Fechar chat' : 'Abrir chat'}</span></button>` : ``}
            <button class="btn-order secondary" type="button" data-action="details" data-id="${esc(p.id)}"><i class='bx bx-file'></i><span class="btn-text">Detalhes</span></button>
          </div>
        </div>
      </article>
    `;
  }

  function counters(list){
    return {
      all: list.length,
      pending: list.filter(p => isPendenteStatus(p.status)).length,
      today: list.filter(p => String(p.atualizado).includes('agora') || String(p.atualizado).includes('ha')).length,
      progress: list.filter(p => p.status === 'andamento').length,
      urgent: list.filter(p => p.urgente).length
    };
  }

  function render(){
    const list = filtered();
    const c = counters(state.pedidos);
    const existing = new Set((state.pedidos || []).map((p) => String(p.id)));
    Array.from(state.selected).forEach((id) => { if(!existing.has(String(id))) state.selected.delete(String(id)); });
    document.body.classList.toggle('select-mode', !!state.selectMode);
    if(el.bulkBar) el.bulkBar.classList.toggle('show', !!state.selectMode);
    if(el.count) el.count.textContent = String(c.pending);
    if(el.statToday) el.statToday.textContent = String(c.today);
    if(el.statProgress) el.statProgress.textContent = String(c.progress);
    if(el.statUrgent) el.statUrgent.textContent = String(c.urgent);
    if(el.chipAllLabel) el.chipAllLabel.textContent = `Todos (${c.all})`;
    if(el.chipTodayLabel) el.chipTodayLabel.textContent = `Hoje (${c.today})`;
    if(el.chipProgressLabel) el.chipProgressLabel.textContent = `Em andamento (${c.progress})`;
    if(el.chipUrgentLabel) el.chipUrgentLabel.textContent = `Urgentes (${c.urgent})`;
    if(el.subtitle) el.subtitle.textContent = list.length ? `Mostrando ${list.length} pedido${list.length > 1 ? 's' : ''}` : 'Nenhum pedido encontrado';
    if(el.grid) el.grid.innerHTML = list.map(card).join('');
    if(el.empty) el.empty.classList.toggle('show', list.length === 0);
    if(el.grid) el.grid.style.display = list.length ? 'grid' : 'none';
    (el.chips || []).forEach(ch => ch.classList.toggle('active', ch.dataset.filter === state.filter));
    if(el.selectBtn) el.selectBtn.classList.toggle('active', !!state.selectMode);
    updateBulkInfo();
    if(el.selectLabel){
      const total = state.selected.size;
      el.selectLabel.textContent = state.selectMode ? (total ? `${total} selecionado${total > 1 ? 's' : ''}` : 'Cancelar') : 'Selecionar';
    }
  }

  function syncRoleChipsVisibility(){
    const hasProf = (state.pedidos || []).some((p) => String(p?.meuPapel || '') === 'profissional');
    const hasClient = (state.pedidos || []).some((p) => String(p?.meuPapel || '') === 'cliente');
    (el.chips || []).forEach((chip) => {
      const role = String(chip.getAttribute('data-role') || '').trim();
      if(!role) return;
      if(role === 'prof') chip.style.display = hasProf ? '' : 'none';
      else if(role === 'client') chip.style.display = hasClient ? '' : 'none';
    });
  }

  function sortLabel(){
    if(state.sort === 'updated') return 'Atualizacao';
    if(state.sort === 'unread') return 'Nao lidas';
    if(state.sort === 'urgent') return 'Urgentes';
    return 'Mais recentes';
  }

  function nextSort(){
    if(state.sort === 'recent') state.sort = 'unread';
    else if(state.sort === 'unread') state.sort = 'urgent';
    else if(state.sort === 'urgent') state.sort = 'updated';
    else state.sort = 'recent';
    if(el.sortLabel) el.sortLabel.textContent = sortLabel();
  }

  function byId(id){
    return state.pedidos.find(p => String(p.id) === String(id)) || null;
  }

  function detailsValue(v, fallback){
    const s = String(v == null ? '' : v).trim();
    return s || (fallback || '-');
  }

  async function fetchPedidoCompleto(p){
    if(!p || !p.id) return null;
    const pid = String(p.id);
    const cached = state.detailsById.get(pid);
    if(cached) return mergePedidos([p, cached])[0] || p;

    const { getFirestore, getDoc, doc } = window || {};
    if(typeof getFirestore !== 'function' || typeof getDoc !== 'function' || typeof doc !== 'function'){
      return p;
    }

    try{
      const db = window.db || getFirestore();
      const snap = await getDoc(doc(db, 'pedidos', pid));
      if(!snap.exists()) return p;
      const row = snap.data() || {};
      const normalized = normalizePedido(row, 0, pid);
      if(!normalized) return p;
      const merged = mergePedidos([p, normalized, {
        id: pid,
        respostasTriagem: Array.isArray(row.respostasTriagem) ? row.respostasTriagem : [],
        localizacao: row.localizacao || row['localizacao'] || row['localização'] || row['localiza??o'] || null,
        mensagemInicial: pick(row, ['mensagemInicial','descricaoBase','descricao'], normalized.mensagemInicial || ''),
        descricaoBase: pick(row, ['descricaoBase','mensagemInicial','descricao'], normalized.descricaoBase || ''),
        paraQuando: pick(row, ['paraQuando','prazo','dataEspecifica'], normalized.paraQuando || ''),
        turno: pick(row, ['turno'], normalized.turno || ''),
        modoAtend: pick(row, ['modoAtend','modo_atend'], normalized.modoAtend || ''),
        servicoReferencia: pick(row, ['servicoReferencia','titulo','nomeServico','servico'], normalized.servicoReferencia || '')
      }])[0];

      if(merged){
        state.detailsById.set(pid, merged);
        state.pedidos = mergePedidos([...(state.pedidos || []), merged]);
        render();
        return merged;
      }
      return p;
    }catch(err){
      console.warn('Falha ao carregar detalhes do pedido:', err);
      return p;
    }
  }

  function collectAnexos(p){
    const out = [];
    const pushUrl = (url, name) => {
      const u = normalizeMediaUrl(url);
      if(!u) return;
      if(out.some((item) => item.url === u)) return;
      out.push({ url: u, name: name || '' });
    };

    if(Array.isArray(p.anexos)){
      p.anexos.forEach((a, idx) => {
        if(typeof a === 'string') pushUrl(a, `Anexo ${idx + 1}`);
        else if(a && typeof a === 'object') pushUrl(a.url || a.src || a.link, a.nome || a.name || `Anexo ${idx + 1}`);
      });
    }

    const triagem = Array.isArray(p.respostasTriagem) ? p.respostasTriagem : [];
    triagem.forEach((row) => {
      const raw = typeof row === 'object' ? String(row.resposta || '') : String(row || '');
      const namedMatch = raw.match(/^\\s*([^\\n]+?)\\s*-\\s*https?:\\/\\//i);
      const maybeName = namedMatch ? namedMatch[1].trim() : '';
      const matches = raw.match(/https?:\\/\\/[^\\s)]+/g) || [];
      matches.forEach((url) => {
        const clean = url.replace(/[.,;!?]+$/, '');
        const name = maybeName || clean.split('/').pop() || 'Anexo';
        pushUrl(clean, name);
      });
    });

    return out;
  }

  function renderDetailsModal(p){
    if(!p) return;
    const locObj = p.localizacao || {};
    const locText = [
      locObj.endereco || locObj['endereço'] || '',
      locObj.numero || locObj['número'] || '',
      locObj.complemento || '',
      locObj.referencia || ''
    ].map((v)=>String(v || '').trim()).filter(Boolean).join(', ');

    const rows = [
      ['ID', detailsValue(p.id)],
      ['Cliente', detailsValue(p.nome || p.usuario, 'Cliente')],
      ['Status', detailsValue(statusLabel(p.status))],
      ['Tipo', detailsValue(p.tipo)],
      ['Prazo', detailsValue(p.paraQuando || p.prazo, 'A combinar')],
      ['Turno', detailsValue(p.turno, 'Nao informado')],
      ['Modo', detailsValue(p.modoAtend, 'Nao informado')],
      ['Valor', detailsValue(p.valor, 'Sob orcamento')]
    ];
    const motivoRecusa = detailsValue(p.motivoRecusa, '');
    if(String(p.status || '').toLowerCase() === 'recusado' && motivoRecusa){
      rows.push(['Motivo da recusa', motivoRecusa]);
    }

    if(el.detailsSubtitle) el.detailsSubtitle.textContent = `${detailsValue(p.usuario || p.nome, '@cliente')} - ${detailsValue(p.categoria, 'Geral')}`;
    if(el.detailsGrid) el.detailsGrid.innerHTML = rows.map(([k,v]) => `<div class="details-item"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('');
    if(el.detailsDescription) el.detailsDescription.textContent = detailsValue(p.mensagemInicial || p.descricaoBase || p.descricao, 'Sem descricao.');

    const triagem = Array.isArray(p.respostasTriagem) ? p.respostasTriagem : [];
    const triagemRows = [];
    if(locText){
      triagemRows.push({ pergunta:'Local', resposta: locText });
    }
    triagem.forEach((item, idx) => {
      if(item && typeof item === 'object'){
        triagemRows.push({
          pergunta: detailsValue(item.pergunta, `Pergunta ${idx + 1}`),
          resposta: detailsValue(item.resposta, '')
        });
      }else if(item != null){
        triagemRows.push({ pergunta:`Triagem ${idx + 1}`, resposta: detailsValue(item, '') });
      }
    });
    if(!triagemRows.length){
      triagemRows.push({ pergunta:'Triagem', resposta:'Sem respostas de triagem neste pedido.' });
    }
    if(el.detailsTriagem) el.detailsTriagem.innerHTML = triagemRows.map((r) => `
      <div class="triagem-row">
        <small>${esc(r.pergunta)}</small>
        <strong>${esc(r.resposta)}</strong>
      </div>
    `).join('');

    const anexos = collectAnexos(p);
    if(el.detailsAnexos){
      if(!anexos.length){
        el.detailsAnexos.innerHTML = `<div class="triagem-row"><small>Anexos</small><strong>Sem anexos neste pedido.</strong></div>`;
      }else{
        el.detailsAnexos.innerHTML = anexos.map((a, idx) => {
          const isImg = looksLikeImage(a.url);
          return `
            <div class="anexo-item">
              <a href="${esc(a.url)}" target="_blank" rel="noopener">
                ${isImg ? `<img src="${esc(a.url)}" alt="Anexo ${idx + 1}" onerror="this.style.display='none'"/>` : ''}
                <span class="anexo-caption">${esc(a.name || `Anexo ${idx + 1}`)}</span>
              </a>
            </div>
          `;
        }).join('');
      }
    }

    if(el.detailsModal){
      el.detailsModal.classList.add('open');
      el.detailsModal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeDetailsModal(){
    if(!el.detailsModal) return;
    el.detailsModal.classList.remove('open');
    el.detailsModal.setAttribute('aria-hidden', 'true');
  }

  function lockScrollIfNeeded(){
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    const drawerOpen = !!(
      el.chatDrawer &&
      el.chatDrawer.classList.contains('open') &&
      document.body.classList.contains('chat-drawer-open')
    );
    document.documentElement.classList.toggle('no-scroll', !!(isMobile && drawerOpen));
    document.body.classList.toggle('no-scroll', !!(isMobile && drawerOpen));
    if (!(isMobile && drawerOpen)) {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
  }

  function forceCloseChatDrawer(){
    if(el.chatDrawer){
      el.chatDrawer.classList.remove('open');
      el.chatDrawer.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('chat-drawer-open');
    document.body.classList.remove('chat-open');
    document.documentElement.classList.remove('no-scroll');
    document.body.classList.remove('no-scroll');
  }

  forceCloseChatDrawer();
  document.documentElement.classList.remove('no-scroll');
  document.body.classList.remove('no-scroll');
  document.body.classList.remove('chat-drawer-open');
  runtimeOn(window, 'resize', lockScrollIfNeeded);
  runtimeOn(window, 'pageshow', lockScrollIfNeeded);
  runtimeOn(window, 'focus', lockScrollIfNeeded);
  runtimeOn(window, 'pageshow', () => {
    if(!document.body.classList.contains('chat-open')) forceCloseChatDrawer();
  });
  runtimeOn(document, 'visibilitychange', function(){
    if (!document.hidden) lockScrollIfNeeded();
  });

  function setActivePedidoCard(pedidoId){
    const pid = String(pedidoId||'');
    if(state.activePedidoId){
      const prev = document.querySelector(`.card[data-id="${cssEsc(String(state.activePedidoId))}"]`);
      if(prev) prev.classList.remove('chat-active');
      const prevBtn = document.querySelector(`button[data-action="chat"][data-id="${cssEsc(String(state.activePedidoId))}"]`);
      if(prevBtn){
        const t = prevBtn.querySelector('.btn-text');
        if(t) t.textContent = 'Abrir chat';
        prevBtn.classList.remove('danger');
      }
    }
    state.activePedidoId = pid;
    if(!pid) return;
    const cardEl = document.querySelector(`.card[data-id="${cssEsc(pid)}"]`);
    if(cardEl) cardEl.classList.add('chat-active');
    const btn = document.querySelector(`button[data-action="chat"][data-id="${cssEsc(pid)}"]`);
    if(btn){
      const t = btn.querySelector('.btn-text');
      if(t) t.textContent = 'Fechar chat';
      btn.classList.add('danger');
    }
  }

  function openInlineChat(p){
    if(!p || !p.id){ showToast('Pedido invalido para abrir chat.'); return; }
    if(!canOpenChat(p)){ showToast('O chat sera liberado quando o pedido for aceito.'); return; }
    setChatPanelTitle(p);
    setActivePedidoCard(p.id);
    try{
      localStorage.setItem('doke_pedido_contexto', JSON.stringify(p));
      localStorage.setItem('pedidoAtual', JSON.stringify(p));
      localStorage.setItem('doke_chat_prefill', JSON.stringify({ pedidoId: p.id, titulo: p.titulo, usuario: p.usuario, nome: p.nome, origem: 'pedidos.html' }));
    }catch(_){ }

    const meUid = resolveUid();
    const outroUid = String(
      (meUid && p.deUid && p.paraUid)
        ? (String(p.deUid) === String(meUid) ? p.paraUid : p.deUid)
        : (p.paraUid || p.deUid || '')
    ).trim();
    const peerName = String(p.nome || p.usuario || '').trim();
    const peerPhoto = normalizeMediaUrl(p.avatar);
    const statusHint = String(p.statusOriginal || p.status || '').trim();
    const pid = encodeURIComponent(String(p.id));
    const q = [
      'embed=1',
      'noshell=1',
      `chatId=${pid}`,
      `pedidoId=${pid}`,
      'from=pedidos',
      'aba=pedidos',
      'origin=pedido',
      `deep=${Date.now()}`
    ];
    if(outroUid) q.push(`outroUid=${encodeURIComponent(outroUid)}`);
    if(peerName) q.push(`peerName=${encodeURIComponent(peerName)}`);
    if(peerPhoto) q.push(`peerPhoto=${encodeURIComponent(peerPhoto)}`);
    if(statusHint) q.push(`status=${encodeURIComponent(statusHint)}`);
    const chatUrl = `mensagens.html?${q.join('&')}`;
    state.activeChatUrl = chatUrl;
    state.activeChatOutroUid = outroUid;
    state.activeChatStatusRaw = statusHint || 'pendente';

    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;

    if(isDesktop && el.chatSide && el.chatPanel){
      document.body.classList.add('chat-open');
      document.body.classList.add('chat-split-open');
      document.body.classList.remove('chat-split-full');
      el.chatSide.setAttribute('aria-hidden', 'false');
      if(!el.chatSide.contains(el.chatPanel)) el.chatSide.appendChild(el.chatPanel);
      if(el.chatDrawer){
        el.chatDrawer.classList.remove('open');
        el.chatDrawer.setAttribute('aria-hidden', 'true');
      }
      document.documentElement.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
    }

    if(el.chatFrame){
      setChatFrameLoading(true);
      if(el.chatFrame.getAttribute('src') !== chatUrl){
        el.chatFrame.setAttribute('src', chatUrl);
      }else{
        waitForPedidoChatReady(1800);
      }
    }
    if(!isDesktop && el.chatDrawer){
      document.body.classList.add('chat-open');
      document.body.classList.add('chat-drawer-open');
      el.chatDrawer.classList.add('open');
      el.chatDrawer.setAttribute('aria-hidden', 'false');
    }
    state.chatMaximized = false;
    state.chatWidth = clampChatWidth(state.chatWidth || localStorage.getItem(CHAT_WIDTH_KEY));
    applyChatPanelLayout();
    if(!isDesktop) lockScrollIfNeeded();
  }

  function closeInlineChat(){
    stopChatResize();
    setActivePedidoCard('');
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if(isDesktop){
      document.body.classList.remove('chat-split-open');
      document.body.classList.remove('chat-split-full');
      document.body.classList.remove('chat-open');
      if(el.chatSide) el.chatSide.setAttribute('aria-hidden', 'true');
      if(el.chatDrawer && el.chatPanel && !el.chatDrawer.contains(el.chatPanel)){
        el.chatDrawer.appendChild(el.chatPanel);
      }
    }

    if(el.chatDrawer){
      el.chatDrawer.classList.remove('open');
      el.chatDrawer.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('chat-drawer-open');
    document.body.classList.remove('chat-open');
    document.documentElement.classList.remove('no-scroll');
    document.body.classList.remove('no-scroll');
    try{ el.chatFrame?.contentWindow?.postMessage?.({type:'doke-chat-pause'}, '*'); }catch(_){ }
  }

  function openChat(p){
    openInlineChat(p);
  }

  function askRecusaMotivo(){
    return new Promise((resolve) => {
      const modal = el.rejectPromptModal;
      const input = el.rejectPromptInput;
      const err = el.rejectPromptError;
      const btnCancel = el.rejectPromptCancelBtn;
      const btnConfirm = el.rejectPromptConfirmBtn;
      if(!modal || !input || !err || !btnCancel || !btnConfirm){
        const fallback = window.prompt('Informe a justificativa da recusa (minimo de 5 caracteres):', '');
        const motivoFallback = fallback == null ? null : String(fallback || '').trim();
        resolve(motivoFallback && motivoFallback.length >= 5 ? motivoFallback : null);
        return;
      }

      const cleanup = () => {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        modal.removeEventListener('click', onBackdrop);
        btnCancel.removeEventListener('click', onCancel);
        btnConfirm.removeEventListener('click', onConfirm);
        input.removeEventListener('keydown', onKeydown);
        document.removeEventListener('keydown', onEscape);
      };
      const done = (value) => {
        cleanup();
        resolve(value);
      };
      const onBackdrop = (ev) => { if(ev.target === modal) done(null); };
      const onCancel = () => done(null);
      const onConfirm = () => {
        const motivo = String(input.value || '').trim();
        if(motivo.length < 5){
          err.textContent = 'Digite ao menos 5 caracteres.';
          input.focus();
          return;
        }
        done(motivo);
      };
      const onKeydown = (ev) => {
        if(ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)){
          ev.preventDefault();
          onConfirm();
        }
      };
      const onEscape = (ev) => {
        if(ev.key === 'Escape' && modal.classList.contains('open')){
          ev.preventDefault();
          done(null);
        }
      };

      input.value = '';
      err.textContent = '';
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      modal.addEventListener('click', onBackdrop);
      btnCancel.addEventListener('click', onCancel);
      btnConfirm.addEventListener('click', onConfirm);
      input.addEventListener('keydown', onKeydown);
      runtimeOn(document, 'keydown', onEscape);
      runtimeLater(() => input.focus(), 20);
    });
  }

  async function persistPedidoStatus(p, nextStatus, motivoRecusa){
    const { getFirestore, doc, updateDoc } = window || {};
    if(typeof getFirestore !== 'function' || typeof doc !== 'function' || typeof updateDoc !== 'function') return false;
    const db = window.db || getFirestore();
    const nowIso = new Date().toISOString();
    const payload = {
      status: nextStatus,
      statusPedido: nextStatus,
      situacao: nextStatus,
      estado: nextStatus,
      dataAtualizacao: nowIso,
      updatedAt: nowIso
    };
    if(nextStatus === 'aceito') payload.dataAceite = nowIso;
    if(nextStatus === 'cancelado') payload.dataCancelamento = nowIso;
    if(nextStatus === 'recusado'){
      payload.dataRecusa = nowIso;
      const motivo = String(motivoRecusa || '').trim();
      if(motivo){
        payload.motivoRecusa = motivo;
        payload.justificativaRecusa = motivo;
        payload.recusaMotivo = motivo;
        payload.motivoRejeicao = motivo;
        payload.motivo = motivo;
        payload.recusa = { motivo, data: nowIso };
      }
    }
    await updateDoc(doc(db, 'pedidos', String(p.id)), payload);
    return true;
  }

  async function decidePedido(p, nextStatus){
    if(!ensurePedidosAuth()) return;
    if(!p || !p.id){
      showToast('Pedido invalido.');
      return;
    }
    const meuPapel = String(p?.meuPapel || '').toLowerCase();
    if((nextStatus === 'aceito' || nextStatus === 'recusado') && meuPapel !== 'profissional'){
      showToast('Somente o profissional pode aceitar ou recusar este pedido.');
      return;
    }
    if(nextStatus === 'cancelado'){
      if(meuPapel !== 'cliente'){
        showToast('Somente o cliente pode cancelar este pedido.');
        return;
      }
      if(!isPendenteStatus(p.status)){
        showToast('So e possivel cancelar enquanto o pedido estiver pendente.');
        return;
      }
      const ok = (typeof window.dokeConfirm === 'function')
        ? await window.dokeConfirm('Cancelar este pedido? O profissional ainda nao respondeu.', 'Cancelar pedido')
        : window.confirm('Cancelar este pedido?');
      if(!ok) return;
    }
    const pid = String(p.id);
    const normalized = statusCode(nextStatus);
    const motivoRecusa = nextStatus === 'recusado' ? await askRecusaMotivo() : '';
    if(nextStatus === 'recusado' && !motivoRecusa) return;
    let savedServer = true;
    try{
      await persistPedidoStatus(p, nextStatus, motivoRecusa);
    }catch(err){
      savedServer = false;
      console.warn('Falha ao atualizar status do pedido:', err);
    }
    patchLocalPedidoCaches(pid, nextStatus, motivoRecusa);
    state.pedidos = (state.pedidos || []).map((item) => {
      if(String(item.id) !== pid) return item;
      return {
        ...item,
        status: normalized,
        statusOriginal: nextStatus,
        motivoRecusa: nextStatus === 'recusado' ? motivoRecusa : '',
        atualizado: 'agora',
        urgente: nextStatus === 'recusado' ? false : item.urgente
      };
    });
    render();
    if(savedServer) showToast(nextStatus === 'aceito' ? 'Pedido aceito.' : (nextStatus === 'recusado' ? 'Pedido recusado.' : 'Pedido cancelado.'));
    else showToast('Atualizado localmente. Conecte-se para sincronizar no servidor.');
  }

  async function openDetails(p){
    if(!p || !p.id){ showToast('Pedido invalido para abrir detalhes.'); return; }
    try{
      localStorage.setItem('doke_pedido_detalhes', JSON.stringify(p));
      localStorage.setItem('pedidoAtual', JSON.stringify(p));
    }catch(_){ }
    const full = await fetchPedidoCompleto(p);
    renderDetailsModal(full || p);
  }

  function toggleSelectMode(force){
    const next = typeof force === 'boolean' ? force : !state.selectMode;
    state.selectMode = next;
    if(!next) state.selected.clear();
    render();
  }

  function toggleSelected(id){
    const key = String(id || '');
    if(!key) return;
    if(state.selected.has(key)) state.selected.delete(key);
    else state.selected.add(key);
    render();
  }

  function updateBulkInfo(){
    if(!el.bulkInfo) return;
    const selectedItems = (state.pedidos || []).filter((p) => state.selected.has(String(p.id)));
    const total = selectedItems.length;
    const clearable = selectedItems.filter(isStatusFinalizadoOuRecusado).length;
    el.bulkInfo.textContent = total
      ? `${total} selecionado(s) - ${clearable} apto(s) para limpar`
      : '0 pedidos selecionados';
    if(el.bulkFinalizeBtn){
      el.bulkFinalizeBtn.disabled = (total === 0);
      el.bulkFinalizeBtn.title = 'A finalizacao so ocorre apos confirmacao do cliente no app dele.';
    }
    if(el.bulkClearBtn){
      el.bulkClearBtn.disabled = (clearable === 0);
      el.bulkClearBtn.title = clearable ? 'Limpar pedidos finalizados ou recusados' : 'Selecione pedidos recusados/finalizados para limpar';
    }
  }

  function finalizeSelected(){
    if(!state.selected.size){ showToast('Selecione pelo menos 1 pedido.'); return; }
    showToast('A finalizacao depende da confirmacao do cliente na tela dele.');
  }

  function clearSelectedDoneOrRejected(){
    if(!state.selected.size){ showToast('Selecione pelo menos 1 pedido.'); return; }
    const selectedItems = (state.pedidos || []).filter((p) => state.selected.has(String(p.id)));
    const canClearIds = new Set(selectedItems.filter(isStatusFinalizadoOuRecusado).map((p) => String(p.id)));
    if(!canClearIds.size){
      showToast('Limpar so funciona para pedidos finalizados ou recusados.');
      return;
    }
    addHiddenPedidos(Array.from(canClearIds));
    purgePedidosFromLocalCaches(Array.from(canClearIds));
    const before = state.pedidos.length;
    state.pedidos = (state.pedidos || []).filter((p) => !canClearIds.has(String(p.id)));
    Array.from(canClearIds).forEach((id) => state.selected.delete(String(id)));
    const removed = before - state.pedidos.length;
    render();
    showToast(`${removed} pedido${removed !== 1 ? 's' : ''} limpo${removed !== 1 ? 's' : ''}.`);
  }

  async function hydrate(forceFs){
    const authOk = await ensurePedidosAuth();
    if(!authOk){ state.pedidos = []; render(); return; }
    let local = [];
    try{ local = loadLocal(); }catch(err){ console.warn('loadLocal erro:', err); }
    let merged = mergePedidos(local);
    try{ await enrichPedidosComUsuarios(merged); }catch(_e){}
    if(forceFs || merged.length < 3){
      try{
        const fs = await loadFirestore();
        merged = mergePedidos([...(merged || []), ...(fs || [])]);
      }catch(err){
        console.warn('loadFirestore erro:', err);
      }
    }
    state.pedidos = merged;
    syncRoleChipsVisibility();
    render();
  }

  const filtersDock = {
    parent: el.filtersBar ? el.filtersBar.parentElement : null,
    next: el.filtersBar ? el.filtersBar.nextElementSibling : null
  };

  function syncFiltersPlacement(){
    if(!el.filtersBar || !el.toolbarActions || !filtersDock.parent) return;
    const compact = window.matchMedia('(min-width: 769px) and (max-width: 1023px)').matches;
    if(compact){
      if(el.filtersBar.parentElement !== el.toolbarActions){
        el.toolbarActions.appendChild(el.filtersBar);
      }
      el.filtersBar.classList.add('filters-inline');
    }else{
      if(el.filtersBar.parentElement !== filtersDock.parent){
        if(filtersDock.next && filtersDock.next.parentElement === filtersDock.parent){
          filtersDock.parent.insertBefore(el.filtersBar, filtersDock.next);
        }else{
          filtersDock.parent.appendChild(el.filtersBar);
        }
      }
      el.filtersBar.classList.remove('filters-inline');
    }
  }

  function bind(){
    const on = (node, evt, fn, options) => runtimeOn(node, evt, fn, options);
    on(el.search, 'input', () => { state.query = String(el.search?.value || ''); render(); });
    on(el.sortBtn, 'click', () => { nextSort(); render(); });
    on(el.selectBtn, 'click', () => toggleSelectMode());
    on(el.bulkFinalizeBtn, 'click', finalizeSelected);
    on(el.bulkClearBtn, 'click', clearSelectedDoneOrRejected);
    on(el.refreshBtn, 'click', async () => { if(el.refreshBtn){ el.refreshBtn.disabled = true; } await hydrate(true); if(el.refreshBtn){ el.refreshBtn.disabled = false; } showToast('Pedidos atualizados'); });

    on(el.filtersBtn, 'click', () => {
      if(!el.filtersBar) return;
      syncFiltersPlacement();
      const open = el.filtersBar.classList.toggle('show');
      el.filtersBtn.classList.toggle('active', open);
      el.filtersBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    runtimeOn(window, 'resize', syncFiltersPlacement);
    (el.chips || []).forEach(ch => on(ch, 'click', () => { state.filter = ch.dataset.filter || 'all'; render(); }));
    on(el.grid, 'click', (ev) => {
      const infoBtn = ev.target.closest('.need-info');
      if(infoBtn){
        ev.preventDefault();
        ev.stopPropagation();
        document.querySelectorAll('.need-info.is-open').forEach((b)=>{ if(b!==infoBtn) b.classList.remove('is-open'); });
        infoBtn.classList.toggle('is-open');
        return;
      }
      const btn = ev.target.closest('button[data-action][data-id]');
      if(btn){
        const p = byId(btn.dataset.id);
        const action = String(btn.dataset.action || '');
        if(btn.dataset.action === 'select'){
          if(!state.selectMode) state.selectMode = true;
          toggleSelected(btn.dataset.id);
          return;
        }
        if(state.selectMode){ toggleSelected(btn.dataset.id); return; }
        if(action === 'accept'){ decidePedido(p, 'aceito'); return; }
        if(action === 'reject'){ decidePedido(p, 'recusado'); return; }
        if(action === 'cancel'){ decidePedido(p, 'cancelado'); return; }
        if(action === 'chat'){
          const pid = String(btn.dataset.id||'');
          if(document.body.classList.contains('chat-open') && state.activePedidoId && String(state.activePedidoId)===pid){
            closeInlineChat();
            return;
          }
          openChat(p);
          return;
        }
        if(action === 'details'){ openDetails(p); return; }
        return;
      }
      const cardEl = ev.target.closest('.card[data-id]');
      if(!cardEl || !state.selectMode) return;
      toggleSelected(cardEl.dataset.id);
    });
    runtimeOn(document, 'click', (ev) => {
      if(!ev.target.closest('.need-info')){
        document.querySelectorAll('.need-info.is-open').forEach((b)=>b.classList.remove('is-open'));
      }
      const btn = ev.target.closest('#chatDrawer [data-close], #chatSide [data-close]');
      if(btn) closeInlineChat();
    });
    on(el.chatNarrowBtn, 'click', () => nudgeChatWidth(-CHAT_WIDTH_STEP));
    on(el.chatWidenBtn, 'click', () => nudgeChatWidth(CHAT_WIDTH_STEP));
    on(el.chatWidthLabel, 'dblclick', resetChatWidth);
    on(el.chatExpandBtn, 'click', toggleChatMaximize);
    on(el.chatResizeHandle, 'mousedown', startChatResize);
    on(el.chatFrame, 'load', () => {
      waitForPedidoChatReady(3200);
    });
    runtimeOn(document, 'mousemove', handleChatResizeMove);
    runtimeOn(document, 'mouseup', stopChatResize);
    runtimeOn(window, 'resize', applyChatPanelLayout);
    on(el.detailsCloseBtn, 'click', closeDetailsModal);
    on(el.detailsModal, 'click', (ev) => {
      if(ev.target === el.detailsModal) closeDetailsModal();
    });
    runtimeOn(document, 'keydown', (ev) => {
      if(ev.key !== 'Escape') return;
      if(el.detailsModal?.classList.contains('open')) closeDetailsModal();
      if(el.chatDrawer?.classList.contains('open')) closeInlineChat();
    });
    runtimeOn(window, 'storage', (ev) => { const key = String(ev?.key || ''); if(!key || /(pedido|orcamento|doke_)/i.test(key)) hydrate(false); });
  }

  async function bootstrapPedidos(){
    try{
      if(!(await ensurePedidosAuth())) return;
      syncFiltersPlacement();
      bind();
      state.chatWidth = clampChatWidth(localStorage.getItem(CHAT_WIDTH_KEY));
      state.chatMaximized = false;
      setChatExpandButtonState();
      applyChatPanelLayout();
      runtimeLater(() => {
        try {
          const loadingText = String(el.subtitle?.textContent || '');
          const semPedidos = !Array.isArray(state?.pedidos) || state.pedidos.length === 0;
          if (/Carregando/i.test(loadingText) && semPedidos) {
            render();
          }
        } catch (_e) {}
      }, 2200);
      hydrate(true).catch(async (err) => {
        console.error('[pedidos] hydrate error', err);
        const authOk = await ensurePedidosAuth();
        if(!authOk){ state.pedidos = []; render(); return; }
        try{ state.pedidos = mergePedidos(loadLocal()); }catch(_){ state.pedidos = []; }
        render();
        try{ showToast('Erro ao carregar pedidos. Mostrando dados locais.'); }catch(_){ }
      });
    }catch(err){
      console.error('[pedidos] bootstrap error', err);
      try{ state.pedidos = mergePedidos(loadLocal()); }catch(_){ state.pedidos = []; }
      try{ render(); }catch(_){ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapPedidos, { once: true });
  } else {
    bootstrapPedidos();
  }
})();

