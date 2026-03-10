(() => {
  const key = "__DOKE_V2_PAGE_MESSAGES__";
  if (window[key]) return;
  const CSS_ID = "doke-v2-messages-css";
  let templateCache = "";

  function ensureCss() {
    const href = "app-v2/pages/messages.css?v=20260310v01";
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
      const res = await fetch("app-v2/pages/messages.template.html?v=20260310v01", { cache: "no-store" });
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
    const prefill = safeParse(localStorage.getItem("doke_chat_prefill") || "null", {});
    const pedido = safeParse(localStorage.getItem("pedidoAtual") || localStorage.getItem("doke_pedido_contexto") || "null", {});
    const now = new Date().toISOString();
    const id = String(prefill.pedidoId || pedido.id || qs().get("chatId") || qs().get("pedidoId") || "pedido-demo");
    const nome = String(prefill.nome || pedido.nome || pedido.usuario || pedido.titulo || "Cliente");
    const titulo = String(prefill.titulo || pedido.titulo || "Conversa sobre pedido");
    return [{ id, nome, title: titulo, updatedAt: now, unread: 0, archived: false, messages: [] }];
  }

  function loadThreads() {
    const fromLocal = safeParse(localStorage.getItem("doke_v2_messages_threads") || "null", null);
    const threads = Array.isArray(fromLocal) && fromLocal.length ? fromLocal : seedThreads();
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
      refs.emptyThread.hidden = !!thread;
      refs.thread.hidden = !thread;
      if (!thread) return;
      refs.avatar.innerHTML = avatarMarkup(thread);
      refs.name.textContent = thread.nome;
      refs.meta.textContent = thread.title || 'Sem contexto';
      refs.archive.querySelector('span').textContent = thread.archived ? 'Desarquivar' : 'Arquivar';
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
      refs.total.textContent = String(state.threads.filter((t) => !t.archived).length);
      refs.unread.textContent = String(state.threads.reduce((sum, t) => sum + (Number(t.unread) || 0), 0));
      refs.emptyList.hidden = list.length > 0 || state.loading;
      refs.list.hidden = list.length === 0 && !state.loading;
      if (state.loading) {
        try { page.setAttribute('data-ui-state', 'loading'); } catch (_e) {}
        refs.list.hidden = false;
        refs.list.innerHTML = listSkeleton();
        refs.threadPanel.innerHTML = threadSkeleton();
        return;
      }
      refs.list.innerHTML = list.map((t) => conversationMarkup(t, t.id === state.activeId)).join('');
      try { page.setAttribute('data-ui-state', list.length ? 'ready' : 'empty'); } catch (_e) {}
      if (!refs.thread.querySelector || !page.contains(refs.thread)) return;
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
        refs.list.innerHTML = list.map((t) => conversationMarkup(t, t.id === state.activeId)).join('');
        refs.emptyList.hidden = list.length > 0;
      });
    }

    function bindThreadInteractions() {
      refs.back.addEventListener('click', () => {
        state.activeId = null;
        page.classList.remove('has-active-thread');
        refs.emptyThread.hidden = false;
        refs.thread.hidden = true;
      });
      refs.archive.addEventListener('click', () => {
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
