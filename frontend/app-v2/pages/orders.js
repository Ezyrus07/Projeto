(() => {
  const key = "__DOKE_V2_PAGE_ORDERS__";
  if (window[key]) return;

  const CSS_ID = "doke-v2-orders-css";
  const state = {
    pedidos: [],
    filter: "all",
    query: "",
    sort: "recent",
    loading: true
  };

  const SORT_LABELS = {
    recent: "Mais recentes",
    unread: "Não lidas",
    urgent: "Urgentes",
    updated: "Atualização"
  };

  let templateCache = "";

  function ensureCss() {
    const href = "app-v2/pages/orders.css?v=20260309v01";
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
      const res = await fetch("app-v2/pages/orders.template.html?v=20260309v01", { credentials: "same-origin" });
      templateCache = await res.text();
    } catch (_e) {
      templateCache = "<section class='doke-v2-page doke-v2-page-orders'><div class='v2-orders-shell'></div></section>";
    }
    return templateCache;
  }

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#39;" }[m]));
  }

  function parseJSON(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_e) { return null; }
  }

  function asArray(input) {
    if (Array.isArray(input)) return input;
    if (input && typeof input === "object") {
      if (Array.isArray(input.items)) return input.items;
      if (Array.isArray(input.data)) return input.data;
      if (Array.isArray(input.rows)) return input.rows;
      if (Array.isArray(input.pedidos)) return input.pedidos;
      if (Array.isArray(input.orcamentos)) return input.orcamentos;
    }
    return [];
  }

  function pick(obj, keys, fallback) {
    for (const k of keys) {
      const v = obj ? obj[k] : null;
      if (v == null) continue;
      const s = String(v).trim();
      if (s) return s;
    }
    return fallback;
  }

  function toDate(v) {
    if (!v) return null;
    if (v instanceof Date && Number.isFinite(v.getTime())) return v;
    if (typeof v === "number") {
      const d = new Date(v > 1e12 ? v : v * 1000);
      return Number.isFinite(d.getTime()) ? d : null;
    }
    if (typeof v === "string") {
      const n = Number(v.trim());
      if (Number.isFinite(n)) {
        const dn = new Date(v.trim().length >= 13 ? n : n * 1000);
        if (Number.isFinite(dn.getTime())) return dn;
      }
      const d = new Date(v);
      return Number.isFinite(d.getTime()) ? d : null;
    }
    if (typeof v === "object") {
      if (typeof v.toDate === "function") {
        const d = v.toDate();
        if (d instanceof Date && Number.isFinite(d.getTime())) return d;
      }
      if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
      if (typeof v._seconds === "number") return new Date(v._seconds * 1000);
    }
    return null;
  }

  function formatUpdated(v) {
    const d = toDate(v);
    if (!d) return String(v || "recentemente");
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "agora";
    if (diff < 3600000) return `há ${Math.max(1, Math.round(diff / 60000))} min`;
    if (diff < 86400000) return `há ${Math.max(1, Math.round(diff / 3600000))} h`;
    return d.toLocaleDateString("pt-BR");
  }

  function statusCode(raw) {
    const s = String(raw || "pendente").toLowerCase();
    if (s.includes("and") || s.includes("aceit") || s.includes("pago")) return "andamento";
    if (s.includes("fin") || s.includes("conc")) return "finalizado";
    return "pendente";
  }

  function statusLabel(s) {
    if (s === "andamento") return "Em andamento";
    if (s === "finalizado") return "Finalizado";
    return "Pendente";
  }

  function normalizeMediaUrl(v) {
    if (!v) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "object") return String(v.url || v.src || v.link || "").trim();
    return "";
  }

  function normalizeId(v) {
    const id = String(v == null ? "" : v).trim();
    if (!id) return "";
    if (/^PD-\d+$/i.test(id) || /^TEMP-/i.test(id) || /^NEW-/i.test(id)) return "";
    return id;
  }

  function resolveUid() {
    const perfil = parseJSON(localStorage.getItem("doke_usuario_perfil")) || {};
    return String(window.auth?.currentUser?.uid || window.firebaseAuth?.currentUser?.uid || localStorage.getItem("doke_uid") || perfil.uid || perfil.id || "").trim();
  }

  function mine(row, uid) {
    if (!uid) return true;
    const fields = [
      row.deUid,row.deuid,row.de_uid,row.clienteUid,row.clienteuid,row.cliente_uid,row.uidCliente,row.uid_cliente,row.solicitanteUid,row.solicitante_uid,
      row.paraUid,row.parauid,row.para_uid,row.prestadorUid,row.prestadoruid,row.prestador_uid,row.profissionalUid,row.profissionaluid,row.profissional_uid,row.uidPrestador,row.uid_prestador,
      row.participante1,row.participante2,row.uid1,row.uid2,row.clienteId,row.profissionalId
    ].map((v) => String(v || "").trim()).filter(Boolean);
    if (Array.isArray(row.participantes)) fields.push(...row.participantes.map((v) => String(v || "").trim()).filter(Boolean));
    return fields.includes(String(uid));
  }

  function normalizePedido(row, idx, forcedId) {
    if (!row || typeof row !== "object") return null;
    const id = normalizeId(forcedId || pick(row, ["id","codigo","pedidoId","idPedido","orderId","orcamentoId","chatId","threadId","postid","docId"], ""));
    if (!id) return null;

    const uidAtual = resolveUid();
    const deUid = pick(row, ["deUid","deuid","de_uid","clienteUid","clienteuid","cliente_uid"], "");
    const paraUid = pick(row, ["paraUid","parauid","para_uid","prestadorUid","prestadoruid","prestador_uid"], "");
    const isSouCliente = !!uidAtual && !!deUid && String(uidAtual) === String(deUid);
    const isSouProfissional = !!uidAtual && !!paraUid && String(uidAtual) === String(paraUid);

    const nome = isSouCliente
      ? pick(row, ["paraNome","nomePrestador","profissionalNome","nome","nomeCliente","clienteNome","cliente","usuarioNome","userName","deNome"], "Cliente")
      : isSouProfissional
        ? pick(row, ["deNome","nomeCliente","clienteNome","nome","cliente","usuarioNome","userName","paraNome"], "Cliente")
        : pick(row, ["nome","nomeCliente","clienteNome","cliente","usuarioNome","userName","deNome","paraNome"], "Cliente");

    const usuarioBase = isSouCliente
      ? pick(row, ["paraUser","usuarioPrestador","usernamePrestador","usuario","username","user","handle"], nome || "cliente")
      : isSouProfissional
        ? pick(row, ["deUser","usuarioCliente","usernameCliente","usuario","username","user","handle"], nome || "cliente")
        : pick(row, ["usuario","username","user","handle","deUser","paraUser"], nome || "cliente");
    const usuario = usuarioBase.startsWith("@") ? usuarioBase : `@${usuarioBase.toLowerCase().replace(/\s+/g, ".")}`;

    const titulo = pick(row, ["titulo","servicoReferencia","nomeServico","servico","assunto","pedidoTitulo","orcamentoTitulo","title"], "Pedido");
    const descricao = pick(row, ["descricao","descricaoBase","mensagem","mensagemInicial","detalhes","observacoes","preview","ultimaMensagem"], "Sem detalhes adicionais.");
    const tipoRaw = pick(row, ["tipo","tipoPedido","categoriaTipo"], "");
    const tipo = tipoRaw || (String(titulo).toLowerCase().includes("orc") ? "Orçamento" : "Serviço");
    const status = statusCode(pick(row, ["status","statusPedido","situacao","estado"], "pendente"));
    const updatedRaw = pick(row, ["dataAtualizacao","updatedAt","updatedat","ultimaAtualizacao","timestamp","lastMessageAt","createdAt"], "");
    const createdRaw = pick(row, ["criadoEm","createdAt","createdat","dataCriacao","dataPedido"], updatedRaw || new Date().toISOString());

    return {
      id,
      usuario,
      nome,
      avatar: pick(row, isSouCliente
        ? ["paraFoto","fotoPrestador","profilePicture","avatar","foto","fotoPerfil","profissionalFoto","deFoto","fotoCliente"]
        : isSouProfissional
          ? ["deFoto","fotoCliente","profilePicture","avatar","foto","fotoPerfil","paraFoto","profissionalFoto"]
          : ["avatar","foto","fotoCliente","fotoPerfil","profilePicture","deFoto","paraFoto","clienteFoto","profissionalFoto"],
      "assets/Imagens/user_placeholder.png"),
      titulo,
      descricao,
      tipo,
      status,
      urgente: !!(row.urgente || String(row.prioridade || "").toLowerCase() === "alta" || String(row.priority || "").toLowerCase() === "high"),
      prazo: pick(row, ["prazo","paraQuando","dataEspecifica","deadline","turno"], "A combinar"),
      atualizado: formatUpdated(updatedRaw || createdRaw),
      valor: pick(row, ["valor","preco","orcamento","faixa","precoFormatado","valorOrcamento","valor_orcamento"], "Sob orçamento"),
      naoLidas: Number(row.naoLidas || row.naolidas || row.unread || row.unreadCount || row.mensagensNaoLidas || row.qtdNaoLidas || 0) || 0,
      categoria: pick(row, ["categoria","categoriaServico","area","segmento"], "Geral"),
      criadoEm: toDate(createdRaw)?.toISOString() || new Date().toISOString()
    };
  }

  function mergePedidos(list) {
    const map = new Map();
    (list || []).forEach((p) => {
      if (!p || !p.id) return;
      const keyId = String(p.id);
      const cur = map.get(keyId);
      if (!cur) {
        map.set(keyId, { ...p });
        return;
      }
      const next = { ...cur };
      Object.keys(p).forEach((k) => {
        const v = p[k];
        if (k === "naoLidas") {
          next[k] = Math.max(Number(next[k] || 0), Number(v || 0));
          return;
        }
        if (k === "descricao" && String(v || "").length > String(next[k] || "").length) {
          next[k] = v;
          return;
        }
        if ((next[k] == null || String(next[k]).trim() === "" || String(next[k]) === "—") && String(v ?? "").trim() !== "") next[k] = v;
      });
      map.set(keyId, next);
    });
    return Array.from(map.values());
  }

  function loadLocal() {
    let list = [];
    if (Array.isArray(window.pedidosCache)) {
      list = list.concat(window.pedidosCache.map((r, i) => normalizePedido(r, i)).filter(Boolean));
    }
    const primaryKeys = [
      "doke_pedidos","pedidos","DOKE_PEDIDOS","meus_pedidos","cachePedidos","doke_cache_pedidos",
      "orcamentos","doke_orcamentos","orcamentosCache","doke_orcamentos_cache","doke_cache_orcamentos","orcamentos_pedidos"
    ];
    primaryKeys.forEach((keyName) => {
      const arr = asArray(parseJSON(localStorage.getItem(keyName)));
      arr.forEach((row, idx) => {
        const n = normalizePedido(row, idx);
        if (n) list.push(n);
      });
    });
    const singleRows = [
      parseJSON(localStorage.getItem("doke_pedido_contexto")),
      parseJSON(localStorage.getItem("doke_pedido_detalhes")),
      parseJSON(localStorage.getItem("pedidoAtual")),
      parseJSON(localStorage.getItem("doke_chat_prefill")),
      parseJSON(localStorage.getItem("pedidoSelecionado"))
    ].filter(Boolean);
    singleRows.forEach((row, idx) => {
      const n = normalizePedido(row, idx);
      if (n) list.push(n);
    });
    return mergePedidos(list);
  }

  async function loadFirestore() {
    const { getFirestore, collection, query, limit, getDocs } = window || {};
    if (typeof getFirestore !== "function" || typeof collection !== "function" || typeof query !== "function" || typeof limit !== "function" || typeof getDocs !== "function") return [];
    const uid = resolveUid();
    const db = window.db || getFirestore();
    try {
      const snap = await getDocs(query(collection(db, "pedidos"), limit(300)));
      const out = [];
      let idx = 0;
      snap.forEach((d) => {
        const row = d.data() || {};
        if (!mine(row, uid)) return;
        const n = normalizePedido(row, idx++, d.id);
        if (n) out.push(n);
      });
      return mergePedidos(out);
    } catch (_e) {
      return [];
    }
  }



  async function resolveVerifiedAuthUser() {
    try {
      if (typeof window.dokeResolveAuthUser === "function") {
        const resolved = await window.dokeResolveAuthUser();
        if (resolved && String(resolved.uid || resolved.id || "").trim()) return resolved;
      }
    } catch (_e) {}

    try {
      const auth = window.sb?.auth || window.supabaseClient?.auth || window.supabase?.auth || null;
      if (auth?.getSession) {
        const { data, error } = await auth.getSession();
        if (!error && data?.session?.user) return data.session.user;
      }
      if (typeof window.dokeRestoreSupabaseSessionFromStorage === "function") {
        const restored = await window.dokeRestoreSupabaseSessionFromStorage({ force: true });
        if (restored && auth?.getSession) {
          const retry = await auth.getSession();
          if (!retry?.error && retry?.data?.session?.user) return retry.data.session.user;
        }
      }
      if (auth?.getUser) {
        const { data, error } = await auth.getUser();
        if (!error && data?.user) return data.user;
      }
    } catch (_e) {}

    const fbUser = window.auth?.currentUser || window.firebaseAuth?.currentUser || null;
    if (fbUser && String(fbUser.uid || fbUser.id || "").trim()) return fbUser;
    return null;
  }

  async function ensureAuthenticatedOrRedirect() {
    const user = await resolveVerifiedAuthUser();
    const hasUser = !!String(user?.uid || user?.id || "").trim();
    if (hasUser) {
      try {
        localStorage.setItem("usuarioLogado", "true");
        const uid = String(user.uid || user.id || "").trim();
        if (uid) localStorage.setItem("doke_uid", uid);
      } catch (_e) {}
      return true;
    }
    try {
      [
        "usuarioLogado","logado","isLoggedIn","doke_logged_in","doke_uid","doke_usuario_perfil",
        "perfil_usuario","doke_usuario_logado","userLogado"
      ].forEach((keyName) => localStorage.removeItem(keyName));
    } catch (_e) {}
    const next = encodeURIComponent(`${location.pathname.split('/').pop() || 'pedidos.html'}${location.search || ''}`);
    const target = `login.html?next=${next}`;
    if (typeof window.__DOKE_V2_HARD_NAVIGATE__ === "function") {
      window.__DOKE_V2_HARD_NAVIGATE__(target);
    } else {
      location.href = target;
    }
    return false;
  }

  function counters(list) {
    return {
      total: list.length,
      recent: list.filter((p) => String(p.atualizado).includes("agora") || String(p.atualizado).includes("há")).length,
      progress: list.filter((p) => p.status === "andamento").length,
      urgent: list.filter((p) => p.urgente).length
    };
  }

  function sortList(list) {
    const arr = [...list];
    if (state.sort === "updated") return arr.sort((a, b) => String(a.atualizado).localeCompare(String(b.atualizado), "pt-BR"));
    if (state.sort === "unread") return arr.sort((a, b) => Number(b.naoLidas || 0) - Number(a.naoLidas || 0) || (new Date(b.criadoEm) - new Date(a.criadoEm)));
    if (state.sort === "urgent") return arr.sort((a, b) => Number(b.urgente) - Number(a.urgente) || (new Date(b.criadoEm) - new Date(a.criadoEm)));
    return arr.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  }

  function filteredPedidos() {
    let arr = [...state.pedidos];
    if (state.filter === "pending") arr = arr.filter((p) => p.status === "pendente");
    if (state.filter === "progress") arr = arr.filter((p) => p.status === "andamento");
    if (state.filter === "done") arr = arr.filter((p) => p.status === "finalizado");
    if (state.filter === "urgent") arr = arr.filter((p) => p.urgente);
    const q = state.query.trim().toLowerCase();
    if (q) {
      arr = arr.filter((p) => [p.id,p.nome,p.usuario,p.titulo,p.descricao,p.categoria,p.tipo,p.prazo,p.valor].filter(Boolean).join(" ").toLowerCase().includes(q));
    }
    return sortList(arr);
  }

  function skeletonCard() {
    return `
      <article class="v2-orders-skeleton" aria-hidden="true">
        <div class="v2-orders-skeleton-body">
          <div class="v2-orders-skeleton-line sm"></div>
          <div class="v2-orders-skeleton-user">
            <span class="v2-orders-skeleton-avatar"></span>
            <div style="flex:1;display:grid;gap:8px;min-width:0">
              <div class="v2-orders-skeleton-line md"></div>
              <div class="v2-orders-skeleton-line sm"></div>
            </div>
          </div>
          <div class="v2-orders-skeleton-line lg"></div>
          <div class="v2-orders-skeleton-line md"></div>
          <div class="v2-orders-skeleton-meta"><span></span><span></span><span></span></div>
          <div class="v2-orders-skeleton-line lg"></div>
        </div>
      </article>`;
  }

  function statusTagClass(status) {
    if (status === "andamento") return "v2-orders-tag--progress";
    if (status === "finalizado") return "v2-orders-tag--done";
    return "v2-orders-tag--pending";
  }

  function cardMarkup(p) {
    const avatar = esc(normalizeMediaUrl(p.avatar) || "assets/Imagens/user_placeholder.png");
    return `
      <article class="v2-orders-card" data-order-id="${esc(p.id)}">
        <div class="v2-orders-card-top">
          <div class="v2-orders-card-tags">
            <span class="v2-orders-tag"><i class='bx bx-receipt'></i>${esc(p.tipo)}</span>
            <span class="v2-orders-tag ${statusTagClass(p.status)}">${esc(statusLabel(p.status))}</span>
            ${p.urgente ? `<span class="v2-orders-tag v2-orders-tag--urgent"><i class='bx bx-error'></i>Urgente</span>` : ""}
          </div>
        </div>
        <div class="v2-orders-card-user">
          <img class="v2-orders-card-avatar" src="${avatar}" alt="Avatar" onerror="this.onerror=null;this.src='assets/Imagens/user_placeholder.png'">
          <div style="min-width:0">
            <strong>${esc(p.nome || p.usuario || "Cliente")}</strong>
            <small>${esc(p.usuario || p.id)} • ${esc(p.categoria || "Geral")}</small>
          </div>
        </div>
        <h3 class="v2-orders-card-title">${esc(p.titulo || "Pedido")}</h3>
        <p class="v2-orders-card-desc">${esc(p.descricao || "Sem detalhes adicionais.")}</p>
        <div class="v2-orders-card-meta">
          <div class="v2-orders-card-meta-item"><small>Prazo</small><strong>${esc(p.prazo || "A combinar")}</strong></div>
          <div class="v2-orders-card-meta-item"><small>Atualizado</small><strong>${esc(p.atualizado || "recentemente")}</strong></div>
          <div class="v2-orders-card-meta-item"><small>Valor</small><strong>${esc(String(p.valor ?? "Sob orçamento"))}</strong></div>
        </div>
        <div class="v2-orders-card-footer">
          <small>${Number(p.naoLidas || 0) > 0 ? `${Number(p.naoLidas)} novas mensagens` : "Sem mensagens pendentes"}</small>
          <div class="v2-orders-card-actions">
            <button type="button" class="v2-orders-card-action" data-order-action="details" data-order-id="${esc(p.id)}">Detalhes</button>
            <button type="button" class="v2-orders-card-action v2-orders-card-action--primary" data-order-action="chat" data-order-id="${esc(p.id)}">Abrir chat</button>
          </div>
        </div>
      </article>`;
  }

  function cycleSort() {
    if (state.sort === "recent") state.sort = "unread";
    else if (state.sort === "unread") state.sort = "urgent";
    else if (state.sort === "urgent") state.sort = "updated";
    else state.sort = "recent";
  }

  function bindActions(root, refs) {
    refs.search.addEventListener("input", () => {
      state.query = String(refs.search.value || "");
      render(refs);
    });
    refs.sort.addEventListener("click", () => {
      cycleSort();
      render(refs);
    });
    refs.refresh.addEventListener("click", async () => {
      refs.refresh.disabled = true;
      await hydrate(refs, true);
      refs.refresh.disabled = false;
    });
    refs.filters.forEach((btn) => btn.addEventListener("click", () => {
      state.filter = btn.dataset.filter || "all";
      render(refs);
    }));
    refs.list.addEventListener("click", (ev) => {
      const button = ev.target.closest("button[data-order-action][data-order-id]");
      if (!(button instanceof HTMLButtonElement)) return;
      const id = String(button.dataset.orderId || "");
      const pedido = state.pedidos.find((item) => String(item.id) === id);
      if (!pedido) return;
      if (button.dataset.orderAction === "chat") {
        try {
          localStorage.setItem("doke_pedido_contexto", JSON.stringify(pedido));
          localStorage.setItem("pedidoAtual", JSON.stringify(pedido));
          localStorage.setItem("doke_chat_prefill", JSON.stringify({ pedidoId: pedido.id, titulo: pedido.titulo, usuario: pedido.usuario, nome: pedido.nome, origem: "pedidos.html" }));
        } catch (_e) {}
        if (typeof window.__DOKE_V2_NAVIGATE__ === "function") {
          window.__DOKE_V2_NAVIGATE__(`mensagens.html?chatId=${encodeURIComponent(pedido.id)}&pedidoId=${encodeURIComponent(pedido.id)}`);
        } else {
          location.href = `mensagens.html?chatId=${encodeURIComponent(pedido.id)}&pedidoId=${encodeURIComponent(pedido.id)}`;
        }
        return;
      }
      try {
        localStorage.setItem("doke_pedido_detalhes", JSON.stringify(pedido));
        localStorage.setItem("pedidoAtual", JSON.stringify(pedido));
      } catch (_e) {}
      if (typeof window.__DOKE_V2_NAVIGATE__ === "function") {
        window.__DOKE_V2_NAVIGATE__(`detalhes.html?pedidoId=${encodeURIComponent(pedido.id)}`);
      } else {
        location.href = `detalhes.html?pedidoId=${encodeURIComponent(pedido.id)}`;
      }
    });
    window.addEventListener("storage", refs.onStorage);
  }

  async function hydrate(refs, forceFirestore) {
    state.loading = true;
    try { refs.page?.setAttribute("data-ui-state", "loading"); } catch (_e) {}
    render(refs);
    let merged = [];
    try {
      merged = mergePedidos(loadLocal());
      if (forceFirestore || merged.length < 3) {
        const remote = await loadFirestore();
        merged = mergePedidos([...(merged || []), ...(remote || [])]);
      }
    } catch (_e) {}
    if ((!Array.isArray(merged) || merged.length === 0) && Array.isArray(state.pedidos) && state.pedidos.length) {
      merged = state.pedidos.slice();
    }
    state.pedidos = Array.isArray(merged) ? merged : [];
    state.loading = false;
    try { refs.page?.setAttribute("data-ui-state", merged.length ? "ready" : "empty"); } catch (_e) {}
    render(refs);
  }

  function render(refs) {
    const allCounters = counters(state.pedidos);
    if (refs.total) refs.total.textContent = String(allCounters.total);
    if (refs.recent) refs.recent.textContent = String(allCounters.recent);
    if (refs.progress) refs.progress.textContent = String(allCounters.progress);
    if (refs.urgent) refs.urgent.textContent = String(allCounters.urgent);
    refs.sortLabel.textContent = SORT_LABELS[state.sort] || SORT_LABELS.recent;
    refs.filters.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.filter === state.filter));

    if (state.loading) {
      refs.subtitle.textContent = "Carregando pedidos…";
      refs.list.classList.add("is-grid-ready");
      refs.list.innerHTML = new Array(6).fill(0).map(() => skeletonCard()).join("");
      refs.empty.hidden = true;
      return;
    }

    const list = filteredPedidos();
    refs.subtitle.textContent = list.length ? `Mostrando ${list.length} pedido${list.length > 1 ? "s" : ""}` : "Nenhum pedido encontrado";
    refs.list.classList.add("is-grid-ready");
    refs.list.innerHTML = list.map(cardMarkup).join("");
    refs.empty.hidden = list.length > 0;
  }

  async function mountOrders(ctx) {
    const allowed = await ensureAuthenticatedOrRedirect();
    if (!allowed) return { unmount() {} };
    await ensureCss();
    const html = await loadTemplate();
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const page = tpl.content.firstElementChild;
    ctx.root.appendChild(page);

    const refs = {
      page,
      total: page.querySelector("[data-orders-total]"),
      recent: page.querySelector("[data-orders-recent]"),
      progress: page.querySelector("[data-orders-progress]"),
      urgent: page.querySelector("[data-orders-urgent]"),
      search: page.querySelector("[data-orders-search]"),
      sort: page.querySelector("[data-orders-sort]"),
      sortLabel: page.querySelector("[data-orders-sort-label]"),
      refresh: page.querySelector("[data-orders-refresh]"),
      subtitle: page.querySelector("[data-orders-subtitle]"),
      list: page.querySelector("[data-orders-list]"),
      empty: page.querySelector("[data-orders-empty]"),
      filters: Array.from(page.querySelectorAll("[data-filter]")),
      onStorage: (ev) => {
        const keyName = String(ev?.key || "");
        if (!keyName || /(pedido|orcamento|doke_)/i.test(keyName)) hydrate(refs, false);
      }
    };

    bindActions(ctx.root, refs);
    hydrate(refs, true);

    return {
      unmount() {
        window.removeEventListener("storage", refs.onStorage);
        try { page.remove(); } catch (_e) {}
      }
    };
  }

  window[key] = { mountOrders };
})();
