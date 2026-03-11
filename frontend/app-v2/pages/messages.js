(() => {
  const key = "__DOKE_V2_PAGE_MESSAGES__";
  if (window[key]) return;
  const CSS_ID = "doke-v2-messages-css";
  let templateCache = "";

  function ensureCss() {
    const href = "app-v2/pages/messages.css?v=20260311v04";
    const existing = document.getElementById(CSS_ID);
    if (existing) return Promise.resolve();
    return new Promise((resolve) => {
      const link = document.createElement("link");
      link.id = CSS_ID;
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
    });
  }

  async function loadTemplate() {
    if (templateCache) return templateCache;
    try {
      const res = await fetch("app-v2/pages/messages.template.html?v=20260311v03", { cache: "no-store" });
      templateCache = await res.text();
    } catch (_e) {
      templateCache = '<section class="doke-v2-page doke-v2-page-messages"><div class="v2-messages-shell"></div></section>';
    }
    return templateCache;
  }

  function safeParse(v, fallback) { try { return JSON.parse(v); } catch (_e) { return fallback; } }
  function qs() { return new URLSearchParams(location.search || ""); }
  function timeLabel(v) {
    const d = v ? new Date(v) : new Date();
    if (Number.isNaN(d.getTime())) return "agora";
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  function dateSort(a, b) {
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  }
  function avatarMarkup(thread) {
    const foto = String(thread.avatar || "").trim();
    if (foto) return `<img src="${foto}" alt="">`;
    return `<span>${String(thread.nome || thread.title || "?").trim().slice(0,1).toUpperCase() || "?"}</span>`;
  }

  function seedThreads() {
    const base = safeParse(localStorage.getItem("doke_v2_messages_threads") || "null", null);
    if (Array.isArray(base) && base.length) return base;
    const prefillRaw = safeParse(localStorage.getItem("doke_chat_prefill") || "null", null);
    const pedidoRaw = safeParse(localStorage.getItem("pedidoAtual") || localStorage.getItem("doke_pedido_contexto") || "null", null);
    const prefill = prefillRaw && typeof prefillRaw === "object" ? prefillRaw : {};
    const pedido = pedidoRaw && typeof pedidoRaw === "object" ? pedidoRaw : {};
    const now = new Date().toISOString();
    const id = String(prefill.pedidoId || pedido.id || qs().get("chatId") || qs().get("pedidoId") || "pedido-demo");
    const nome = String(prefill.nome || pedido.nome || pedido.usuario || pedido.titulo || "Cliente");
    const titulo = String(prefill.titulo || pedido.titulo || "Conversa sobre pedido");
    return [{ id, nome, title: titulo, updatedAt: now, unread: 0, archived: false, messages: [] }];
  }

  function legacyThreadCandidates() {
    const buckets = [];
    const keys = [
      "doke_v2_messages_threads",
      "doke_chat_prefill",
      "pedidoAtual",
      "doke_pedido_contexto",
      "usuarioLogado",
      "doke_usuario_perfil",
      "perfil_usuario"
    ];
    keys.forEach((key) => {
      try { buckets.push(JSON.parse(localStorage.getItem(key) || "null")); } catch (_e) {}
    });
    try {
      Object.keys(localStorage).forEach((key) => {
        if (!/conversa|chat|thread|mensag/i.test(key)) return;
        try { buckets.push(JSON.parse(localStorage.getItem(key) || "null")); } catch (_e) {}
      });
    } catch (_e) {}
    return buckets;
  }

  function normalizeCandidateThreads(raw) {
    const out = [];
    const pushThread = (item) => {
      if (!item || typeof item !== "object") return;
      const id = String(item.id || item.chatId || item.threadId || item.pedidoId || item.conversaId || item.codigo || "").trim() || cryptoRandom();
      const nome = String(item.nome || item.user || item.usuario || item.cliente || item.title || item.assunto || "Contato").trim();
      const titulo = String(item.title || item.titulo || item.assunto || item.ultimaMensagem || item.preview || "Conversa").trim();
      const mensagens = Array.isArray(item.messages) ? item.messages : [];
      out.push({ id, nome: nome || "Contato", title: titulo || "Conversa", avatar: String(item.avatar || item.foto || ""), unread: Number(item.unread || item.naoLidas || 0) || 0, archived: false, updatedAt: item.updatedAt || new Date().toISOString(), messages: mensagens });
    };
    const visit = (node) => {
      if (!node) return;
      if (Array.isArray(node)) return node.forEach(visit);
      if (typeof node !== "object") return;
      if (node.messages || node.chatId || node.threadId || node.pedidoId || node.conversaId) pushThread(node);
      Object.values(node).forEach((v) => { if (Array.isArray(v)) visit(v); });
    };
    legacyThreadCandidates().forEach(visit);
    return out;
  }

  function loadThreads() {
    const fromLocal = safeParse(localStorage.getItem("doke_v2_messages_threads") || "null", null);
    const legacy = normalizeCandidateThreads();
    const baseSeed = seedThreads();
    const threads = Array.isArray(fromLocal) && fromLocal.length ? fromLocal : (legacy.length ? legacy : baseSeed);
    return threads.map((t) => ({
      id: String(t.id || t.chatId || cryptoRandom()),
      nome: String(t.nome || t.user || t.usuario || t.title || "Conversa"),
      title: String(t.title || t.titulo || t.assunto || "Conversa"),
      avatar: String(t.avatar || t.foto || ""),
      unread: Number(t.unread || t.naoLidas || 0) || 0,
      archived: t.archived === true,
      updatedAt: t.updatedAt || new Date().toISOString(),
      messages: Array.isArray(t.messages) ? t.messages.map((m) => ({
        id: String(m.id || cryptoRandom()),
        author: m.author === "me" ? "me" : "other",
        text: String(m.text || m.mensagem || "").trim(),
        time: m.time || new Date().toISOString()
      })) : []
    })).sort(dateSort);
  }

  function saveThreads(threads) {
    try { localStorage.setItem("doke_v2_messages_threads", JSON.stringify(threads)); } catch (_e) {}
  }

  function cryptoRandom() {
    try { return (crypto.randomUUID && crypto.randomUUID()) || `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`; } catch (_e) { return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  }

  function conversationMarkup(thread, active) {
    const last = Array.isArray(thread.messages) && thread.messages.length ? thread.messages[thread.messages.length - 1] : null;
    const preview = last?.text || thread.title || "Sem mensagens ainda";
    return `
      <button type="button" class="v2-messages-list-item${active ? ' is-active' : ''}" data-msg-thread-id="${thread.id}">
        <div class="v2-messages-avatar">${avatarMarkup(thread)}</div>
        <div>
          <strong>${thread.nome}</strong>
          <p>${preview}</p>
          <small>${thread.title}</small>
        </div>
        ${thread.unread > 0 ? `<span class="v2-messages-badge">${thread.unread}</span>` : `<small>${timeLabel(thread.updatedAt)}</small>`}
      </button>`;
  }

  function listSkeleton() {
    return new Array(7).fill(0).map(() => '<div class="v2-messages-list-skeleton" aria-hidden="true"></div>').join("");
  }

  function threadSkeleton() {
    return '<div class="v2-messages-thread-skeleton" aria-hidden="true"></div>';
  }

  async function mountMessages(ctx) {
    await ensureCss();
    const html = await loadTemplate();
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const page = tpl.content.firstElementChild;
    ctx.root.appendChild(page);
    try { document.body.setAttribute("data-page", "chat"); } catch (_e) {}

    const refs = {
      board: page.querySelector('[data-msg-board]'),
      listPanel: page.querySelector('[data-msg-list-panel]'),
      threadPanel: page.querySelector('[data-msg-thread-panel]'),
      list: page.querySelector('[data-msg-list]'),
      emptyList: page.querySelector('[data-msg-empty-list]'),
      emptyThread: page.querySelector('[data-msg-empty-thread]'),
      emptyInline: page.querySelector('[data-msg-empty-inline]'),
      thread: page.querySelector('[data-msg-thread]'),
      threadBody: page.querySelector('[data-msg-thread-body]'),
      search: page.querySelector('[data-msg-search]'),
      total: page.querySelector('[data-msg-total]'),
      unread: page.querySelector('[data-msg-unread]'),
      back: page.querySelector('[data-msg-back]'),
      archive: page.querySelector('[data-msg-archive]'),
      form: page.querySelector('[data-msg-form]'),
      input: page.querySelector('[data-msg-input]'),
      name: page.querySelector('[data-msg-name]'),
      meta: page.querySelector('[data-msg-meta]'),
      avatar: page.querySelector('[data-msg-avatar]')
    };

    const state = { loading: true, threads: [], activeId: null, query: "", sending: false };
    try { page.setAttribute('data-ui-state', 'loading'); } catch (_e) {}
    const setActiveByUrl = () => {
      const targetId = String(qs().get("chatId") || qs().get("pedidoId") || "").trim();
      if (targetId && state.threads.some((t) => t.id === targetId)) state.activeId = targetId;
      else if (!state.activeId && state.threads.length && window.innerWidth >= 880) state.activeId = state.threads[0].id;
    };

    function filteredThreads() {
      const q = state.query.trim().toLowerCase();
      return state.threads.filter((t) => !t.archived).filter((t) => {
        if (!q) return true;
        const hay = `${t.nome} ${t.title} ${(t.messages || []).map((m) => m.text).join(' ')}`.toLowerCase();
        return hay.includes(q);
      }).sort(dateSort);
    }

    function activeThread() {
      return state.threads.find((t) => t.id === state.activeId) || null;
    }

    function renderThread() {
      const thread = activeThread();
      const mobileActive = !!thread;
      page.classList.toggle('has-active-thread', mobileActive);
      if (refs.emptyThread) { refs.emptyThread.hidden = !!thread || state.threads.length > 0; refs.emptyThread.style.display = (!!thread || state.threads.length > 0) ? 'none' : ''; }
      refs.thread.hidden = !thread;
      if (!thread) return;
      refs.avatar.innerHTML = avatarMarkup(thread);
      if (refs.name) refs.name.textContent = thread.nome;
      if (refs.meta) refs.meta.textContent = thread.title || 'Sem contexto';
      const archiveLabel = refs.archive?.querySelector ? refs.archive.querySelector('span') : null;
      if (archiveLabel) archiveLabel.textContent = thread.archived ? 'Desarquivar' : 'Arquivar';
      const msgs = Array.isArray(thread.messages) ? thread.messages : [];
      refs.emptyInline.hidden = msgs.length > 0;
      refs.threadBody.innerHTML = msgs.length ? msgs.map((m) => `
        <article class="v2-msg-bubble${m.author === 'me' ? ' is-me' : ''}">
          <div>${m.text}</div>
          <small>${timeLabel(m.time)}</small>
        </article>`).join('') : '';
      refs.threadBody.scrollTop = refs.threadBody.scrollHeight || 0;
    }

    function renderList() {
      const list = filteredThreads();
      if (refs.total) refs.total.textContent = String(state.threads.filter((t) => !t.archived).length);
      if (refs.unread) refs.unread.textContent = String(state.threads.reduce((sum, t) => sum + (Number(t.unread) || 0), 0));
      if (refs.emptyList) { refs.emptyList.hidden = true; refs.emptyList.style.display = 'none'; }
      refs.list.hidden = false;
      if (state.loading) {
        try { page.setAttribute('data-ui-state', 'loading'); } catch (_e) {}
        refs.list.hidden = false;
        refs.list.innerHTML = listSkeleton();
        refs.threadPanel.innerHTML = threadSkeleton();
        return;
      }
      if (!state.activeId && list.length) state.activeId = list[0].id;
      refs.list.innerHTML = list.map((t) => conversationMarkup(t, t.id === state.activeId)).join('');
      try { page.setAttribute('data-ui-state', list.length ? 'ready' : 'empty'); } catch (_e) {}
      if (refs.emptyList) { const show = !list.length; refs.emptyList.hidden = !show; refs.emptyList.style.display = show ? "grid" : "none"; }
      if (!refs.thread || !page.contains(refs.thread)) return;
      renderThread();
    }

    function bindListInteractions() {
      refs.list.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-msg-thread-id]');
        if (!(btn instanceof HTMLElement)) return;
        state.activeId = String(btn.getAttribute('data-msg-thread-id') || '');
        const thread = activeThread();
        if (thread) thread.unread = 0;
        saveThreads(state.threads);
        refs.list.innerHTML = filteredThreads().map((t) => conversationMarkup(t, t.id === state.activeId)).join('');
        renderThread();
        try { window.setTimeout(() => refs.form.removeAttribute('data-sending'), 220); } catch (_e) {}
      });
      refs.search.addEventListener('input', (ev) => {
        state.query = String(ev.target?.value || '');
        const list = filteredThreads();
        if (!state.activeId && list.length) state.activeId = list[0].id;
        refs.list.innerHTML = list.map((t) => conversationMarkup(t, t.id === state.activeId)).join('');
        if (refs.emptyList) { const show = !list.length; refs.emptyList.hidden = !show; refs.emptyList.style.display = show ? "grid" : "none"; }
        renderThread();
      });
    }

    function bindThreadInteractions() {
      refs.back.addEventListener('click', () => {
        state.activeId = null;
        page.classList.remove('has-active-thread');
        refs.emptyThread.hidden = false;
        refs.thread.hidden = true;
      });
      refs.archive?.addEventListener('click', () => {
        const thread = activeThread();
        if (!thread) return;
        thread.archived = !thread.archived;
        if (thread.archived) state.activeId = null;
        saveThreads(state.threads);
        refs.list.innerHTML = filteredThreads().map((t) => conversationMarkup(t, t.id === state.activeId)).join('');
        renderThread();
      });
      refs.form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const thread = activeThread();
        if (!thread) return;
        const text = String(refs.input.value || '').trim();
        if (!text) return;
        try { refs.form.setAttribute('data-sending', 'true'); } catch (_e) {}
        thread.messages.push({ id: cryptoRandom(), author: 'me', text, time: new Date().toISOString() });
        thread.updatedAt = new Date().toISOString();
        refs.input.value = '';
        saveThreads(state.threads);
        refs.list.innerHTML = filteredThreads().map((t) => conversationMarkup(t, t.id === state.activeId)).join('');
        renderThread();
      });
    }

    // preserve original panel nodes for loading-free swap
    const threadPanelTemplate = refs.threadPanel.innerHTML;
    bindListInteractions();
    refs.list.innerHTML = listSkeleton();
    refs.threadPanel.innerHTML = threadSkeleton();

    const finish = () => {
      refs.threadPanel.innerHTML = threadPanelTemplate;
      refs.emptyThread = page.querySelector('[data-msg-empty-thread]');
      refs.emptyInline = page.querySelector('[data-msg-empty-inline]');
      refs.thread = page.querySelector('[data-msg-thread]');
      refs.threadBody = page.querySelector('[data-msg-thread-body]');
      refs.back = page.querySelector('[data-msg-back]');
      refs.archive = page.querySelector('[data-msg-archive]');
      refs.form = page.querySelector('[data-msg-form]');
      refs.input = page.querySelector('[data-msg-input]');
      refs.name = page.querySelector('[data-msg-name]');
      refs.meta = page.querySelector('[data-msg-meta]');
      refs.avatar = page.querySelector('[data-msg-avatar]');
      bindThreadInteractions();
      state.loading = false;
      state.threads = loadThreads();
      try { page.setAttribute('data-ui-state', state.threads.length ? 'ready' : 'empty'); } catch (_e) {}
      setActiveByUrl();
      if (!state.activeId && state.threads.length) state.activeId = state.threads[0].id;
      renderList();
      renderThread();
    };

    const timer = window.setTimeout(finish, 320);
    return {
      unmount() {
        try { clearTimeout(timer); } catch (_e) {}
        try { page.remove(); } catch (_e) {}
      }
    };
  }

  window[key] = { mountMessages };
})();
