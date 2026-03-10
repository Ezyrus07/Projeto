(() => {
  const key = "__DOKE_V2_PAGE_NOTIFICATIONS__";
  if (window[key]) return;

  const CSS_HREF = "app-v2/pages/notifications.css?v=20260309v01";
  const SETTINGS_KEY = "doke_notif_settings_v1";
  const DISMISS_KEY_PREFIX = "doke_notif_dismissed_";
  const SNOOZE_KEY = "doke_notif_snooze_until";
  const V2_ROUTES = new Set([
    "index.html",
    "busca.html",
    "detalhes.html",
    "negocios.html",
    "notificacoes.html",
    "comunidade.html",
    "novidades.html",
    "escolheranuncio.html",
    "pedidos.html",
    "mensagens.html",
    "meuperfil.html",
    "mais.html",
    "carteira.html"
  ]);

  const TEMPLATE = `<div class="notif-container">
  <section class="notif-hero-container">
    <div class="hero-content">
      <h1>Notificações <span class="badge-count" id="badge-count" style="display:none;">0</span></h1>
      <p>Acompanhe atualizações sobre pedidos, pagamentos e interações em um fluxo único.</p>
    </div>
    <div class="hero-actions">
      <button class="btn-hero-action" type="button" data-action="mark-all-read"><i class="bx bx-check-double"></i> Marcar tudo como lido</button>
      <button class="btn-hero-action" type="button" data-action="open-settings"><i class="bx bx-cog"></i> Ajustes</button>
    </div>
  </section>

  <section class="notif-summary" aria-label="Resumo das notificações">
    <article class="summary-card">
      <span>Total</span>
      <strong id="summary-total">0</strong>
    </article>
    <article class="summary-card">
      <span>Não lidas</span>
      <strong id="summary-unread">0</strong>
    </article>
    <article class="summary-card">
      <span>24 horas</span>
      <strong id="summary-24h">0</strong>
    </article>
  </section>

  <section class="notif-toolbar" aria-label="Filtros e busca">
    <div class="filters-scroll" role="tablist" aria-label="Filtrar notificações">
      <button class="filter-chip active" type="button" data-filter="todas" aria-pressed="true">Todas</button>
      <button class="filter-chip" type="button" data-filter="pedidos" aria-pressed="false">Pedidos</button>
      <button class="filter-chip" type="button" data-filter="financeiro" aria-pressed="false" id="filtro-financeiro">Financeiro</button>
      <button class="filter-chip" type="button" data-filter="social" aria-pressed="false">Interações</button>
    </div>
    <label class="notif-search" for="notif-search">
      <i class="bx bx-search"></i>
      <input id="notif-search" type="search" placeholder="Buscar por título, descrição ou pessoa" autocomplete="off">
    </label>
  </section>

  <section id="lista-notificacoes" aria-live="polite">
    <div class="notif-loading" role="status" aria-live="polite">
      <i class="bx bx-loader-alt bx-spin"></i>
      <p>Buscando atualizações...</p>
    </div>
    <div class="notif-skeleton-list" aria-hidden="true">
      <div class="notif-skeleton-card"></div>
      <div class="notif-skeleton-card"></div>
      <div class="notif-skeleton-card"></div>
    </div>
  </section>

  <section class="empty-state" id="empty-state" hidden>
    <i class="bx bx-bell-off"></i>
    <h3>Tudo limpo por aqui!</h3>
    <p>Você não tem novas notificações no momento.</p>
  </section>
</div>

<div class="notif-settings-modal" id="notif-settings-modal" aria-hidden="true">
  <div class="settings-card" role="dialog" aria-modal="true" aria-labelledby="notif-settings-title">
    <div class="settings-header">
      <div>
        <h3 id="notif-settings-title">Ajustes rápidos</h3>
        <p>Escolha como você prefere receber alertas.</p>
      </div>
      <button class="settings-close" type="button" data-action="close-settings" aria-label="Fechar ajustes">×</button>
    </div>
    <div class="settings-grid">
      <label class="setting-item">
        <span>Som de notificação</span>
        <input type="checkbox" data-setting="sound" checked>
      </label>
      <label class="setting-item">
        <span>Vibração no celular</span>
        <input type="checkbox" data-setting="vibration" checked>
      </label>
      <label class="setting-item">
        <span>Resumo diário</span>
        <input type="checkbox" data-setting="dailyDigest">
      </label>
      <label class="setting-item">
        <span>Silenciar mensagens</span>
        <input type="checkbox" data-setting="muteMessages">
      </label>
    </div>
    <div class="settings-row">
      <button class="settings-btn" type="button" data-action="manage-channels">Gerenciar canais</button>
      <button class="settings-btn ghost" type="button" data-action="snooze">Silenciar 1 hora</button>
    </div>
  </div>
</div>
`;

  function ensureCss() {
    const exists = Array.from(document.querySelectorAll("link[rel='stylesheet']")).some((link) => {
      return String(link.getAttribute("href") || "").includes("app-v2/pages/notifications.css");
    });
    if (exists) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_HREF;
    document.head.appendChild(link);
  }

  function safeInvoke(fn, fallback) {
    try {
      const out = typeof fn === "function" ? fn() : undefined;
      if (out && typeof out.then === "function") out.catch(() => {});
      return out;
    } catch (_e) {
      return fallback;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch (_e) { return fallback; }
  }

  function showToast(message, type) {
    const msg = String(message || "").trim();
    if (!msg) return;
    safeInvoke(() => {
      if (typeof window.dokeToast === "function") return window.dokeToast({ message: msg, type: type || "info" });
      if (typeof window.mostrarToast === "function") return window.mostrarToast(msg, type || "info");
      console.log("[DOKE]", msg);
    });
  }

  function parsePerfilLocal() {
    return safeParse(localStorage.getItem("doke_usuario_perfil") || "{}", {}) || {};
  }

  function normalizeAuthUser(user, perfilLocal) {
    if (!user) return null;
    const nomeFallback = user.user_metadata?.nome
      || user.displayName
      || perfilLocal?.nome
      || (user.email ? String(user.email).split("@")[0] : "Usuário");
    return {
      uid: user.uid || user.id || perfilLocal?.uid || localStorage.getItem("doke_uid") || null,
      email: user.email || perfilLocal?.email || null,
      user_metadata: {
        nome: nomeFallback,
        user: user.user_metadata?.user || perfilLocal?.user || nomeFallback,
        foto: user.user_metadata?.foto || user.photoURL || perfilLocal?.foto || ""
      }
    };
  }

  async function resolveAuthenticatedUser(getAuthApi, onAuthChanged, later) {
    const perfilLocal = parsePerfilLocal();
    const auth = typeof getAuthApi === "function" ? safeInvoke(() => getAuthApi(), null) : null;

    if (auth?.currentUser?.uid || auth?.currentUser?.id) {
      return normalizeAuthUser(auth.currentUser, perfilLocal);
    }

    if (auth && typeof onAuthChanged === "function") {
      const observerUser = await new Promise((resolve) => {
        let done = false;
        let unsub = null;
        const timeoutId = later(() => {
          if (done) return;
          done = true;
          if (typeof unsub === "function") unsub();
          resolve(null);
        }, 1400);

        try {
          unsub = onAuthChanged(auth, (user) => {
            if (done) return;
            done = true;
            if (timeoutId) clearTimeout(timeoutId);
            if (typeof unsub === "function") unsub();
            resolve(user || null);
          }, () => {
            if (done) return;
            done = true;
            if (timeoutId) clearTimeout(timeoutId);
            if (typeof unsub === "function") unsub();
            resolve(null);
          });
        } catch (_e) {
          if (timeoutId) clearTimeout(timeoutId);
          resolve(null);
        }
      });

      if (observerUser?.uid || observerUser?.id) {
        return normalizeAuthUser(observerUser, perfilLocal);
      }
    }

    try {
      const sb = window.sb || window.dokeSupabase || null;
      if (sb?.auth?.getSession) {
        const { data: sessionData, error: sessionError } = await sb.auth.getSession();
        const sessionUser = !sessionError ? (sessionData?.session?.user || null) : null;
        if (sessionUser?.id) return normalizeAuthUser(sessionUser, perfilLocal);
      }
      if (sb?.auth?.getUser) {
        const { data, error } = await sb.auth.getUser();
        if (!error && data?.user?.id) return normalizeAuthUser(data.user, perfilLocal);
      }
    } catch (_e) {}

    const uidLocal = perfilLocal?.uid || localStorage.getItem("doke_uid") || null;
    if (uidLocal && (localStorage.getItem("usuarioLogado") === "true" || !!localStorage.getItem("doke_usuario_perfil"))) {
      return normalizeAuthUser({ uid: uidLocal }, perfilLocal);
    }

    return null;
  }

  function parseNotifDate(value) {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value === "object" && typeof value.seconds === "number") return new Date(value.seconds * 1000);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function calcularTempo(value) {
    const data = parseNotifDate(value);
    const diffMs = Date.now() - data.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);
    if (diffMin < 1) return "Agora mesmo";
    if (diffMin < 60) return `${diffMin} min`;
    if (diffHoras < 24) return `${diffHoras} h`;
    return `${diffDias} d`;
  }

  function mapTipoLabel(tipo) {
    if (tipo === "financeiro") return "Financeiro";
    if (tipo === "pedidos") return "Pedidos";
    if (tipo === "social") return "Interações";
    return "Geral";
  }

  function dedupeNotificacoes(lista) {
    const seen = new Map();
    (Array.isArray(lista) ? lista : []).forEach((notif) => {
      if (!notif) return;
      let key = `${notif.role || "x"}|${notif.id || ""}`;
      if (notif.role === "social") {
        const acao = notif.acao || "";
        const postKey = notif.postId || "";
        const commentKey = notif.comentarioId || "";
        const actorKey = notif.deUid || notif.actor || "";
        key = `social|${acao}|${postKey}|${commentKey}|${actorKey}`;
      }
      const existing = seen.get(key);
      const notifTime = parseNotifDate(notif.time).getTime();
      const existingTime = existing ? parseNotifDate(existing.time).getTime() : -Infinity;
      if (!existing || notifTime > existingTime) seen.set(key, notif);
    });
    return Array.from(seen.values());
  }

  function agruparPorData(lista) {
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    const grupos = [
      { label: "Hoje", items: [] },
      { label: "Ontem", items: [] },
      { label: "Esta semana", items: [] },
      { label: "Mais antigas", items: [] }
    ];

    (Array.isArray(lista) ? lista : []).forEach((notif) => {
      const data = parseNotifDate(notif.time);
      if (data >= hoje) grupos[0].items.push(notif);
      else if (data >= ontem) grupos[1].items.push(notif);
      else if ((agora.getTime() - data.getTime()) <= 7 * 24 * 60 * 60 * 1000) grupos[2].items.push(notif);
      else grupos[3].items.push(notif);
    });

    return grupos.filter((grupo) => grupo.items.length > 0);
  }

  function montarNotificacaoSocial(data, docId) {
    const actor = data.deUser || data.deNome || data.deuser || data.denome || "Alguém";
    const avatar = data.deFoto || data.deAvatar || data.deImagem || data.defoto || data.deavatar || data.deimagem || "";
    const postId = data.postId || data.postid || null;
    const comentarioId = data.comentarioId || data.comentarioid || null;
    const deUid = data.deUid || data.deuid || null;
    let titulo = "Atualização";
    let desc = "Você recebeu uma interação.";
    let iconClass = "bx-bell";
    let colorClass = "ni-info";
    let tipoCategoria = "social";

    if (data.acao === "comentario_post") {
      titulo = "Novo comentário";
      desc = `${actor} comentou no seu post.`;
      iconClass = "bx-message-rounded";
    } else if (data.acao === "comentario_reel") {
      titulo = "Novo comentário";
      desc = `${actor} comentou no seu vídeo curto.`;
      iconClass = "bx-message-rounded";
    } else if (data.acao === "resposta_comentario") {
      titulo = "Nova resposta";
      desc = `${actor} respondeu seu comentário.`;
      iconClass = "bx-reply";
    } else if (data.acao === "curtida_post") {
      titulo = "Novo like";
      desc = `${actor} curtiu seu post.`;
      iconClass = "bx-heart";
      colorClass = "ni-success";
    } else if (data.acao === "curtida_reel") {
      titulo = "Novo like";
      desc = `${actor} curtiu seu vídeo curto.`;
      iconClass = "bx-heart";
      colorClass = "ni-success";
    } else if (data.acao === "curtida_comentario") {
      titulo = "Curtiram seu comentário";
      desc = `${actor} curtiu seu comentário.`;
      iconClass = "bx-like";
      colorClass = "ni-success";
    } else if (data.acao === "pedido_amizade") {
      titulo = "Novo pedido de amizade";
      desc = `${actor} enviou um pedido de amizade.`;
      iconClass = "bx-user-plus";
    } else if (data.acao === "seguir_usuario") {
      titulo = "Novo seguidor";
      desc = `${actor} começou a seguir você.`;
      iconClass = "bx-user-check";
      colorClass = "ni-success";
    } else if (data.acao === "portfolio_consent_request") {
      titulo = "Autorização de portfólio";
      desc = `${actor} pediu permissão para usar a mídia no portfólio.`;
      iconClass = "bx-collection";
      colorClass = "ni-pedido";
      tipoCategoria = "pedidos";
    } else if (data.acao === "portfolio_consent_approved") {
      titulo = "Portfólio autorizado";
      desc = "Cliente autorizou o uso da mídia no portfólio.";
      iconClass = "bx-check-circle";
      colorClass = "ni-success";
      tipoCategoria = "pedidos";
    } else if (data.acao === "portfolio_consent_rejected") {
      titulo = "Portfólio recusado";
      desc = "Cliente recusou o uso da mídia no portfólio.";
      iconClass = "bx-x-circle";
      colorClass = "ni-alerta";
      tipoCategoria = "pedidos";
    } else if (data.acao === "portfolio_published") {
      titulo = "Mídia publicada";
      desc = `${actor} publicou a mídia no portfólio.`;
      iconClass = "bx-check-shield";
      colorClass = "ni-info";
      tipoCategoria = "pedidos";
    }

    const timeRaw = data.createdAt || data.createdat;
    return {
      id: docId,
      role: "social",
      acao: data.acao || null,
      titulo,
      desc,
      tipo: tipoCategoria,
      status: data.lida ? "read" : "unread",
      time: parseNotifDate(timeRaw),
      iconClass,
      colorClass,
      link: data.link || (deUid ? `perfil-usuario.html?id=${encodeURIComponent(deUid)}` : "index.html"),
      actor,
      avatar,
      postId,
      comentarioId,
      deUid
    };
  }

  function normalizeRouteFile(path) {
    return String(path || "").toLowerCase().split("/").pop().split("?")[0] || "index.html";
  }

  function loadSettings() {
    const defaults = { sound: true, vibration: true, dailyDigest: false, muteMessages: false };
    const parsed = safeParse(localStorage.getItem(SETTINGS_KEY) || "null", null);
    if (!parsed || typeof parsed !== "object") return defaults;
    return {
      sound: parsed.sound !== false,
      vibration: parsed.vibration !== false,
      dailyDigest: parsed.dailyDigest === true,
      muteMessages: parsed.muteMessages === true
    };
  }

  function saveSettings(settings) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_e) {}
  }

  async function mountNotifications(ctx) {
    ensureCss();
    const page = document.createElement("section");
    page.className = "doke-v2-page doke-v2-page-notifications";
    page.innerHTML = TEMPLATE;
    ctx.root.appendChild(page);

    try { document.body.setAttribute("data-page", "notificacoes"); } catch (_e) {}

    const teardowns = [];
    const state = {
      destroyed: false,
      currentUserUid: null,
      currentFilter: "todas",
      searchTerm: "",
      notifications: [],
      dismissedIds: new Set(),
      settings: loadSettings(),
      db: null
    };

    const on = (target, type, handler, options) => {
      if (!target || typeof target.addEventListener !== "function" || typeof handler !== "function") return;
      target.addEventListener(type, handler, options);
      teardowns.push(() => {
        try { target.removeEventListener(type, handler, options); } catch (_e) {}
      });
    };

    const later = (handler, ms) => {
      if (typeof handler !== "function") return null;
      const id = window.setTimeout(() => {
        if (state.destroyed) return;
        handler();
      }, ms);
      teardowns.push(() => {
        try { clearTimeout(id); } catch (_e) {}
      });
      return id;
    };

    const refs = {
      badge: page.querySelector("#badge-count"),
      total: page.querySelector("#summary-total"),
      unread: page.querySelector("#summary-unread"),
      day: page.querySelector("#summary-24h"),
      list: page.querySelector("#lista-notificacoes"),
      empty: page.querySelector("#empty-state"),
      search: page.querySelector("#notif-search"),
      chips: Array.from(page.querySelectorAll(".filter-chip")),
      filterFinanceiro: page.querySelector("#filtro-financeiro"),
      modal: page.querySelector("#notif-settings-modal"),
      modalInputs: Array.from(page.querySelectorAll("[data-setting]")),
      markAllBtn: page.querySelector("[data-action='mark-all-read']"),
      openSettingsBtn: page.querySelector("[data-action='open-settings']"),
      closeSettingsBtn: page.querySelector("[data-action='close-settings']"),
      manageChannelsBtn: page.querySelector("[data-action='manage-channels']"),
      snoozeBtn: page.querySelector("[data-action='snooze']")
    };

    function navigate(target) {
      const href = String(target || "").trim();
      if (!href) return;
      const file = normalizeRouteFile(href);
      if (typeof window.__DOKE_V2_NAVIGATE__ === "function" && V2_ROUTES.has(file)) {
        safeInvoke(() => window.__DOKE_V2_NAVIGATE__(href));
        return;
      }
      location.href = href;
    }

    function openSettings() {
      if (!(refs.modal instanceof HTMLElement)) return;
      refs.modal.classList.add("active");
      refs.modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("doke-v2-notifications-modal-open");
    }

    function closeSettings() {
      if (!(refs.modal instanceof HTMLElement)) return;
      refs.modal.classList.remove("active");
      refs.modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("doke-v2-notifications-modal-open");
    }

    function renderLoading() {
      if (!(refs.list instanceof HTMLElement)) return;
      try { page.setAttribute("data-ui-state", "loading"); } catch (_e) {}
      refs.list.innerHTML = `
        <div class="notif-loading" role="status" aria-live="polite">
          <i class="bx bx-loader-alt bx-spin"></i>
          <p>Buscando atualizações...</p>
        </div>
        <div class="notif-skeleton-list" aria-hidden="true">
          <div class="notif-skeleton-card"></div>
          <div class="notif-skeleton-card"></div>
          <div class="notif-skeleton-card"></div>
        </div>
      `;
      if (refs.empty instanceof HTMLElement) refs.empty.hidden = true;
    }

    function renderError(message) {
      if (!(refs.list instanceof HTMLElement)) return;
      try { page.setAttribute("data-ui-state", "error"); } catch (_e) {}
      refs.list.innerHTML = `<div class="notif-error"><i class='bx bx-error-circle'></i><p>${escapeHtml(message || "Erro ao carregar notificações.")}</p></div>`;
      if (refs.empty instanceof HTMLElement) refs.empty.hidden = true;
    }

    function updateSettingsUi() {
      refs.modalInputs.forEach((input) => {
        const keyName = String(input.getAttribute("data-setting") || "");
        input.checked = state.settings[keyName] === true;
      });
    }

    function updateSummary() {
      const total = state.notifications.length;
      const unread = state.notifications.filter((item) => item.status === "unread").length;
      const now = Date.now();
      const dayCount = state.notifications.filter((item) => (now - parseNotifDate(item.time).getTime()) <= 24 * 60 * 60 * 1000).length;
      if (refs.total) refs.total.textContent = String(total);
      if (refs.unread) refs.unread.textContent = String(unread);
      if (refs.day) refs.day.textContent = String(dayCount);
    }

    function updateBadge() {
      const unread = state.notifications.filter((item) => item.status === "unread").length;
      if (!(refs.badge instanceof HTMLElement)) return;
      if (unread > 0) {
        refs.badge.textContent = String(unread);
        refs.badge.style.display = "inline-flex";
      } else {
        refs.badge.style.display = "none";
      }
    }

    function currentFilteredList() {
      let filtered = state.notifications.slice();
      if (state.currentFilter !== "todas") filtered = filtered.filter((item) => item.tipo === state.currentFilter);
      if (state.searchTerm) {
        const term = state.searchTerm;
        filtered = filtered.filter((item) => {
          const haystack = `${item.titulo || ""} ${item.desc || ""} ${item.actor || ""}`.toLowerCase();
          return haystack.includes(term);
        });
      }
      return filtered;
    }

    function renderList(items) {
      if (!(refs.list instanceof HTMLElement)) return;
      const list = Array.isArray(items) ? items : [];
      refs.list.innerHTML = "";

      if (!list.length) {
        try { page.setAttribute("data-ui-state", "empty"); } catch (_e) {}
        refs.list.style.minHeight = "0";
        if (refs.empty instanceof HTMLElement) {
          const title = refs.empty.querySelector("h3");
          const desc = refs.empty.querySelector("p");
          if (title) title.textContent = state.searchTerm || state.currentFilter !== "todas" ? "Nenhum resultado" : "Tudo limpo por aqui!";
          if (desc) desc.textContent = state.searchTerm || state.currentFilter !== "todas"
            ? "Tente ajustar os filtros ou a busca."
            : "Você não tem novas notificações no momento.";
          refs.empty.hidden = false;
        }
        return;
      }

      try { page.setAttribute("data-ui-state", "ready"); } catch (_e) {}
      refs.list.style.minHeight = "260px";
      if (refs.empty instanceof HTMLElement) refs.empty.hidden = true;

      const grupos = agruparPorData(list);
      refs.list.innerHTML = grupos.map((grupo) => `
        <div class="date-group">
          <div class="date-label">${escapeHtml(grupo.label)} <span>${grupo.items.length}</span></div>
          ${grupo.items.map((notif) => `
            <article class="notif-card ${notif.status === "read" ? "read" : "unread"}" data-id="${escapeAttr(notif.id || "")}" data-role="${escapeAttr(notif.role || "")}" data-link="${escapeAttr(notif.link || "")}">
              <div class="notif-icon ${escapeAttr(notif.colorClass || "ni-info")}"><i class='bx ${escapeAttr(notif.iconClass || "bx-bell")}'></i></div>
              <div class="notif-content">
                <div class="notif-header">
                  <div class="notif-title-wrap">
                    <span class="notif-title">${escapeHtml(notif.titulo || "Atualização")}</span>
                    <span class="notif-tag">${escapeHtml(mapTipoLabel(notif.tipo))}</span>
                  </div>
                  <span class="notif-time">${escapeHtml(calcularTempo(notif.time))}</span>
                </div>
                ${notif.actor ? `
                  <div class="notif-author">
                    ${notif.avatar ? `<img src="${escapeAttr(notif.avatar)}" alt="${escapeAttr(notif.actor)}" loading="lazy" decoding="async">` : ""}
                    <span>${escapeHtml(notif.actor)}</span>
                  </div>
                ` : ""}
                <p class="notif-desc">${escapeHtml(notif.desc || "")}</p>
                <div class="notif-actions">
                  <button class="notif-btn primary" type="button" data-action="open">Abrir</button>
                  <button class="notif-btn" type="button" data-action="read" ${notif.status === "read" ? "disabled" : ""}>Marcar lida</button>
                  <button class="notif-btn" type="button" data-action="dismiss">Dispensar</button>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      `).join("");
    }

    function refreshView() {
      updateSummary();
      updateBadge();
      renderList(currentFilteredList());
    }

    function loadDismissed(uid) {
      if (!uid) return new Set();
      const raw = localStorage.getItem(`${DISMISS_KEY_PREFIX}${uid}`);
      const parsed = safeParse(raw || "[]", []);
      return new Set(Array.isArray(parsed) ? parsed.map((item) => String(item)) : []);
    }

    function saveDismissed(id) {
      if (!state.currentUserUid || !id) return;
      state.dismissedIds.add(String(id));
      try {
        localStorage.setItem(`${DISMISS_KEY_PREFIX}${state.currentUserUid}`, JSON.stringify(Array.from(state.dismissedIds)));
      } catch (_e) {}
    }

    async function openProfileByUid(uid) {
      if (!uid) return;
      try {
        const getDocApi = window.getDoc;
        const docApi = window.doc;
        if (typeof getDocApi === "function" && typeof docApi === "function" && state.db) {
          const snap = await getDocApi(docApi(state.db, "usuarios", uid));
          const data = snap && typeof snap.data === "function" ? (snap.data() || {}) : {};
          const dest = data?.isProfissional ? "perfil-profissional.html" : "perfil-cliente.html";
          navigate(`${dest}?id=${encodeURIComponent(uid)}`);
          return;
        }
      } catch (_e) {}
      navigate(`perfil-cliente.html?id=${encodeURIComponent(uid)}`);
    }

    async function markNotificationRead(notif) {
      if (!notif || notif.status === "read") return;
      try {
        const docApi = window.doc;
        const updateDocApi = window.updateDoc;
        if (typeof docApi !== "function" || typeof updateDocApi !== "function" || !state.db) return;
        if (notif.role === "social") {
          await updateDocApi(docApi(state.db, "notificacoes", notif.id), { lida: true });
        } else if (notif.role === "profissional") {
          await updateDocApi(docApi(state.db, "pedidos", notif.id), { notificacaoLidaProfissional: true });
        } else {
          await updateDocApi(docApi(state.db, "pedidos", notif.id), { notificacaoLidaCliente: true });
        }
        notif.status = "read";
        refreshView();
      } catch (error) {
        console.error("Erro ao marcar notificação:", error);
      }
    }

    async function dismissNotification(notif) {
      if (!notif) return;
      try {
        if (notif.role === "social" && typeof window.doc === "function" && typeof window.deleteDoc === "function" && state.db) {
          await window.deleteDoc(window.doc(state.db, "notificacoes", notif.id));
        } else {
          await markNotificationRead(notif);
        }
      } catch (error) {
        console.error("Erro ao dispensar notificação:", error);
      }
      if (notif.id) saveDismissed(notif.id);
      state.notifications = state.notifications.filter((item) => String(item.id) !== String(notif.id));
      refreshView();
    }

    async function markAllRead() {
      if (!(refs.markAllBtn instanceof HTMLButtonElement)) return;
      const unread = state.notifications.filter((item) => item.status === "unread");
      if (!unread.length) {
        showToast("Não há notificações pendentes.", "info");
        return;
      }
      const original = refs.markAllBtn.innerHTML;
      refs.markAllBtn.disabled = true;
      refs.markAllBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Salvando...";
      try {
        const docApi = window.doc;
        const updateDocApi = window.updateDoc;
        if (typeof docApi !== "function" || typeof updateDocApi !== "function" || !state.db) return;
        await Promise.all(unread.map((notif) => {
          if (notif.role === "social") return updateDocApi(docApi(state.db, "notificacoes", notif.id), { lida: true });
          if (notif.role === "profissional") return updateDocApi(docApi(state.db, "pedidos", notif.id), { notificacaoLidaProfissional: true });
          return updateDocApi(docApi(state.db, "pedidos", notif.id), { notificacaoLidaCliente: true });
        }));
        state.notifications.forEach((item) => { item.status = "read"; });
        refreshView();
        showToast("Notificações marcadas como lidas.", "success");
      } catch (error) {
        console.error("Erro ao marcar todas como lidas:", error);
      } finally {
        refs.markAllBtn.disabled = false;
        refs.markAllBtn.innerHTML = original;
      }
    }

    async function loadNotifications(uid) {
      renderLoading();
      state.dismissedIds = loadDismissed(uid);
      state.notifications = [];
      const { collection, query, where, getDocs, getFirestore } = window;
      state.db = window.db || (typeof getFirestore === "function" ? safeInvoke(() => getFirestore(), null) : null);
      if (!state.db || typeof collection !== "function" || typeof query !== "function" || typeof where !== "function" || typeof getDocs !== "function") {
        renderError("Camada de dados indisponível para carregar notificações.");
        return;
      }

      try {
        const readSafely = async (queryRef) => {
          try {
            const snap = await getDocs(queryRef);
            return Array.isArray(snap?.docs) ? snap.docs : [];
          } catch (_e) {
            return [];
          }
        };

        const mergeById = (...lists) => {
          const map = new Map();
          lists.forEach((arr) => (Array.isArray(arr) ? arr : []).forEach((docSnap) => {
            if (!docSnap?.id || map.has(docSnap.id)) return;
            map.set(docSnap.id, docSnap);
          }));
          return Array.from(map.values());
        };

        const qRecebidos = query(collection(state.db, "pedidos"), where("paraUid", "==", uid));
        const qRecebidosAlt = query(collection(state.db, "pedidos"), where("parauid", "==", uid));
        const qEnviados = query(collection(state.db, "pedidos"), where("deUid", "==", uid));
        const qEnviadosAlt = query(collection(state.db, "pedidos"), where("deuid", "==", uid));
        const qSociais = query(collection(state.db, "notificacoes"), where("parauid", "==", uid));
        const qSociaisAlt = query(collection(state.db, "notificacoes"), where("paraUid", "==", uid));

        const [docsRecebidos, docsRecebidosAlt, docsEnviados, docsEnviadosAlt, docsSociais, docsSociaisAlt] = await Promise.all([
          readSafely(qRecebidos),
          readSafely(qRecebidosAlt),
          readSafely(qEnviados),
          readSafely(qEnviadosAlt),
          readSafely(qSociais),
          readSafely(qSociaisAlt)
        ]);

        const recebidos = mergeById(docsRecebidos, docsRecebidosAlt);
        const enviados = mergeById(docsEnviados, docsEnviadosAlt);
        const sociais = mergeById(docsSociais, docsSociaisAlt);

        recebidos.forEach((docSnap) => {
          const data = typeof docSnap.data === "function" ? (docSnap.data() || {}) : {};
          const statusLido = data.notificacaoLidaProfissional === true ? "read" : "unread";

          if (data.status === "pendente") {
            const servico = data.servicoReferencia || data.descricaoBase || data.titulo || "Serviço";
            state.notifications.push({
              id: docSnap.id,
              role: "profissional",
              titulo: "Novo orçamento",
              desc: `${data.clienteNome || "Cliente"} solicitou um orçamento de ${servico}.`,
              tipo: "pedidos",
              status: statusLido,
              time: parseNotifDate(data.dataPedido),
              iconClass: "bx-file-blank",
              colorClass: "ni-pedido",
              link: `mensagens.html?chatId=${encodeURIComponent(docSnap.id)}`,
              actor: data.clienteNome || "Cliente",
              avatar: data.clienteFoto || ""
            });
          } else if (data.status === "pago") {
            state.notifications.push({
              id: docSnap.id,
              role: "profissional",
              titulo: "Pagamento em garantia",
              desc: "O cliente realizou o pagamento. Valor retido até a conclusão.",
              tipo: "financeiro",
              status: statusLido,
              time: parseNotifDate(data.dataPagamento || new Date()),
              iconClass: "bx-shield-quarter",
              colorClass: "ni-money",
              link: `mensagens.html?chatId=${encodeURIComponent(docSnap.id)}`,
              actor: data.clienteNome || "Cliente",
              avatar: data.clienteFoto || ""
            });
          } else if (data.status === "finalizado") {
            state.notifications.push({
              id: docSnap.id,
              role: "profissional",
              titulo: "Pagamento liberado",
              desc: `Serviço concluído. O valor de ${data.valorFinal || ""} foi liberado.`,
              tipo: "financeiro",
              status: statusLido,
              time: parseNotifDate(data.dataConclusao || new Date()),
              iconClass: "bx-check-double",
              colorClass: "ni-success",
              link: "carteira.html",
              actor: data.clienteNome || "Cliente",
              avatar: data.clienteFoto || ""
            });
          }
        });

        enviados.forEach((docSnap) => {
          const data = typeof docSnap.data === "function" ? (docSnap.data() || {}) : {};
          const statusLido = data.notificacaoLidaCliente === true ? "read" : "unread";

          if (data.status === "aceito") {
            state.notifications.push({
              id: docSnap.id,
              role: "cliente",
              titulo: "Orçamento aceito",
              desc: "O profissional aceitou seu pedido.",
              tipo: "pedidos",
              status: statusLido,
              time: parseNotifDate(data.dataAtualizacao || data.dataPedido),
              iconClass: "bx-check-circle",
              colorClass: "ni-info",
              link: `mensagens.html?chatId=${encodeURIComponent(docSnap.id)}`,
              actor: data.profissionalNome || data.nomeProfissional || data.paraNome || "Profissional",
              avatar: data.profissionalFoto || data.paraFoto || data.fotoProfissional || ""
            });
          } else if (data.status === "recusado") {
            const motivo = data.motivoRecusa ? `Motivo: ${data.motivoRecusa}` : "O profissional não pode atender no momento.";
            state.notifications.push({
              id: docSnap.id,
              role: "cliente",
              titulo: "Pedido recusado",
              desc: motivo,
              tipo: "pedidos",
              status: statusLido,
              time: parseNotifDate(data.dataAtualizacao || data.dataPedido),
              iconClass: "bx-x-circle",
              colorClass: "ni-alerta",
              link: `mensagens.html?chatId=${encodeURIComponent(docSnap.id)}`,
              actor: data.profissionalNome || data.nomeProfissional || data.paraNome || "Profissional",
              avatar: data.profissionalFoto || data.paraFoto || data.fotoProfissional || ""
            });
          } else if (data.status === "finalizado" && !data.avaliado) {
            state.notifications.push({
              id: docSnap.id,
              role: "cliente",
              titulo: "Avalie o serviço",
              desc: "O serviço foi concluído. Deixe sua avaliação.",
              tipo: "pedidos",
              status: "unread",
              time: parseNotifDate(data.dataConclusao || new Date()),
              iconClass: "bx-star",
              colorClass: "ni-money",
              link: `avaliar.html?pedidoId=${encodeURIComponent(docSnap.id)}`,
              actor: data.profissionalNome || data.nomeProfissional || data.paraNome || "Profissional",
              avatar: data.profissionalFoto || data.paraFoto || data.fotoProfissional || ""
            });
          }
        });

        sociais.forEach((docSnap) => {
          const data = typeof docSnap.data === "function" ? (docSnap.data() || {}) : {};
          state.notifications.push(montarNotificacaoSocial(data, docSnap.id));
        });

        state.notifications = dedupeNotificacoes(state.notifications)
          .filter((item) => !state.dismissedIds.has(String(item.id)))
          .sort((a, b) => parseNotifDate(b.time).getTime() - parseNotifDate(a.time).getTime());

        refreshView();
      } catch (error) {
        console.error("Erro notifications:", error);
        renderError("Erro ao carregar notificações.");
      }
    }

    async function init() {
      updateSettingsUi();
      renderLoading();
      const user = await resolveAuthenticatedUser(window.getAuth, window.onAuthStateChanged, later)
        || await new Promise((resolve) => later(async () => resolve(await resolveAuthenticatedUser(window.getAuth, window.onAuthStateChanged, later)), 900));

      const resolvedUser = user && user.uid ? user : null;
      if (!resolvedUser?.uid) {
        location.href = "login.html";
        return;
      }

      const perfilLocal = parsePerfilLocal();
      if (!localStorage.getItem("doke_usuario_perfil")) {
        try {
          localStorage.setItem("doke_usuario_perfil", JSON.stringify({
            nome: resolvedUser.user_metadata?.nome || (resolvedUser.email ? String(resolvedUser.email).split("@")[0] : "Usuário"),
            user: resolvedUser.user_metadata?.user || resolvedUser.user_metadata?.nome || "Usuário",
            foto: resolvedUser.user_metadata?.foto || "",
            uid: resolvedUser.uid
          }));
        } catch (_e) {}
      }
      try {
        localStorage.setItem("usuarioLogado", "true");
        localStorage.setItem("doke_uid", resolvedUser.uid);
      } catch (_e) {}

      if (perfilLocal.isProfissional !== true && refs.filterFinanceiro instanceof HTMLElement) {
        refs.filterFinanceiro.style.display = "none";
        if (state.currentFilter === "financeiro") state.currentFilter = "todas";
      }

      safeInvoke(() => window.verificarEstadoLogin && window.verificarEstadoLogin());
      state.currentUserUid = resolvedUser.uid;
      await loadNotifications(resolvedUser.uid);
    }

    on(refs.search, "input", (event) => {
      state.searchTerm = String(event.target?.value || "").toLowerCase().trim();
      renderList(currentFilteredList());
    });

    refs.chips.forEach((chip) => {
      on(chip, "click", () => {
        const nextFilter = String(chip.getAttribute("data-filter") || "todas");
        state.currentFilter = nextFilter || "todas";
        refs.chips.forEach((item) => {
          const active = item === chip;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", active ? "true" : "false");
        });
        renderList(currentFilteredList());
      });
    });

    on(refs.markAllBtn, "click", () => { markAllRead(); });
    on(refs.openSettingsBtn, "click", openSettings);
    on(refs.closeSettingsBtn, "click", closeSettings);
    on(refs.modal, "click", (event) => {
      if (event.target === refs.modal) closeSettings();
    });
    on(document, "keydown", (event) => {
      if (event.key === "Escape") closeSettings();
    });

    refs.modalInputs.forEach((input) => {
      on(input, "change", () => {
        const keyName = String(input.getAttribute("data-setting") || "");
        if (!keyName) return;
        state.settings[keyName] = input.checked === true;
        saveSettings(state.settings);
      });
    });

    on(refs.manageChannelsBtn, "click", () => navigate("preferencia-notif.html"));
    on(refs.snoozeBtn, "click", () => {
      try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + 60 * 60 * 1000)); } catch (_e) {}
      closeSettings();
      showToast("Notificações silenciadas por 1 hora.", "info");
    });

    on(refs.list, "click", async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const btn = target.closest(".notif-btn");
      const card = target.closest(".notif-card");
      if (!(card instanceof HTMLElement)) return;
      const notifId = card.getAttribute("data-id") || "";
      const notif = state.notifications.find((item) => String(item.id) === String(notifId))
        || state.notifications.find((item) => String(item.link || "") === String(card.getAttribute("data-link") || ""));
      if (!notif) return;

      if (btn instanceof HTMLButtonElement) {
        event.stopPropagation();
        const action = String(btn.getAttribute("data-action") || "");
        if (action === "open") {
          if (notif.acao === "seguir_usuario" || notif.acao === "pedido_amizade") {
            const uid = notif.deUid || notif.deuid;
            if (uid) return openProfileByUid(uid);
          }
          navigate(notif.link);
        } else if (action === "read") {
          await markNotificationRead(notif);
        } else if (action === "dismiss") {
          await dismissNotification(notif);
        }
        return;
      }

      if (notif.acao === "seguir_usuario" || notif.acao === "pedido_amizade") {
        const uid = notif.deUid || notif.deuid;
        if (uid) return openProfileByUid(uid);
      }
      navigate(notif.link);
    });

    init();

    return {
      unmount() {
        state.destroyed = true;
        closeSettings();
        teardowns.splice(0).forEach((fn) => {
          try { fn(); } catch (_e) {}
        });
        try { page.remove(); } catch (_e) {}
      }
    };
  }

  window[key] = { mountNotifications };
})();
