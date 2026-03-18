(function () {
  "use strict";

  const PAGE = document.body && document.body.dataset ? document.body.dataset.page : "";
  if (PAGE !== "notificacoes") return;

  const els = {
    badge: document.getElementById("notifBadge"),
    list: document.getElementById("notifList"),
    empty: document.getElementById("notifEmpty"),
    q: document.getElementById("notifSearch"),
    chips: Array.from(document.querySelectorAll("[data-notif-filter]")),
    btnReadAll: document.getElementById("notifReadAll"),
    btnSettings: document.getElementById("notifSettings")
  };

  const state = {
    uid: "",
    filter: "all",
    query: "",
    items: []
  };

  function formatRelative(date) {
    const ts = date instanceof Date ? date.getTime() : Number(date || 0);
    if (!Number.isFinite(ts) || ts <= 0) return "";
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} h`;
    const d = Math.floor(h / 24);
    return `${d} d`;
  }

  function mapIcon(acao) {
    const a = String(acao || "").toLowerCase();
    if (a.includes("pedido") || a.includes("orc")) return "bx-package";
    if (a.includes("mensag") || a.includes("chat")) return "bx-message-rounded-dots";
    if (a.includes("coment")) return "bx-comment-detail";
    if (a.includes("curt") || a.includes("like")) return "bx-heart";
    if (a.includes("segu")) return "bx-user-plus";
    return "bx-bell";
  }

  function mapTitle(n) {
    const nome = String(n.deNome || n.deUser || "").trim();
    const acao = String(n.acao || "").trim();
    if (nome && acao) return `${nome} ${acao}`;
    if (acao) return acao;
    if (nome) return `${nome} interagiu com você`;
    return "Notificação";
  }

  function normalizeItem(row) {
    const created = row.createdAt ? new Date(row.createdAt) : null;
    return {
      id: String(row.id || ""),
      paraUid: String(row.paraUid || ""),
      deUid: String(row.deUid || ""),
      deNome: String(row.deNome || ""),
      deUser: String(row.deUser || ""),
      deFoto: String(row.deFoto || ""),
      acao: String(row.acao || ""),
      comentarioTexto: String(row.comentarioTexto || ""),
      link: String(row.link || ""),
      lida: !!row.lida,
      createdAt: created && !Number.isNaN(created.getTime()) ? created : null
    };
  }

  function setLoading(text) {
    if (!els.list) return;
    els.list.innerHTML =
      `<div class="doke-inline-loading" role="status" aria-live="polite"><i class="bx bx-loader-alt bx-spin"></i><span>${text || "Carregando notificações..."}</span></div>`;
  }

  function setBadge(unreadCount) {
    if (!els.badge) return;
    const n = Number(unreadCount || 0);
    if (!Number.isFinite(n) || n <= 0) {
      els.badge.style.display = "none";
      return;
    }
    els.badge.textContent = String(n);
    els.badge.style.display = "inline-flex";
  }

  function matchesFilter(item) {
    if (state.filter === "unread") return !item.lida;
    if (state.filter === "orders") return /pedido|orc/i.test(item.acao || "");
    if (state.filter === "messages") return /mensag|chat/i.test(item.acao || "");
    if (state.filter === "social") return /curt|like|coment|segu/i.test(item.acao || "");
    return true;
  }

  function matchesQuery(item) {
    const q = String(state.query || "").trim().toLowerCase();
    if (!q) return true;
    const hay = `${item.deNome} ${item.deUser} ${item.acao} ${item.comentarioTexto}`.toLowerCase();
    return hay.includes(q);
  }

  function render() {
    if (!els.list || !els.empty) return;
    const filtered = state.items.filter((it) => matchesFilter(it) && matchesQuery(it));
    const unread = state.items.reduce((acc, it) => acc + (it.lida ? 0 : 1), 0);
    setBadge(unread);

    els.empty.style.display = filtered.length ? "none" : "block";
    if (!filtered.length) {
      els.list.innerHTML = "";
      return;
    }

    els.list.innerHTML = filtered
      .map((n) => {
        const title = mapTitle(n);
        const icon = mapIcon(n.acao);
        const when = n.createdAt ? formatRelative(n.createdAt) : "";
        const preview = n.comentarioTexto ? `<div class="notif-preview">${escapeHtml(n.comentarioTexto)}</div>` : "";
        const unreadDot = n.lida ? "" : `<span class="notif-dot" aria-hidden="true"></span>`;
        return `
          <article class="notif-item ${n.lida ? "" : "is-unread"}" data-notif-id="${escapeAttr(n.id)}" tabindex="0" role="button" aria-label="${escapeAttr(title)}">
            <div class="notif-icon" aria-hidden="true"><i class="bx ${icon}"></i></div>
            <div class="notif-main">
              <p class="notif-title">${escapeHtml(title)}</p>
              <div class="notif-meta">
                ${when ? `<small>${escapeHtml(when)}</small>` : ""}
                ${n.deUser ? `<small>@${escapeHtml(n.deUser)}</small>` : ""}
              </div>
              ${preview}
            </div>
            <div class="notif-right">${unreadDot}</div>
          </article>
        `;
      })
      .join("");
  }

  function escapeHtml(v) {
    return String(v || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function escapeAttr(v) {
    return escapeHtml(v).replace(/`/g, "&#096;");
  }

  async function getClient() {
    const client = window.sb || window.supabaseClient || window.sbClient || window.__supabaseClient;
    if (client && client.from) return client;
    return null;
  }

  async function loadNotifications() {
    setLoading("Carregando notificações...");
    const uid = await (window.DokeAuth && window.DokeAuth.getUid ? window.DokeAuth.getUid({ liveTimeoutMs: 2200 }) : Promise.resolve(""));
    state.uid = String(uid || "").trim();
    if (!state.uid) {
      state.items = [];
      render();
      return;
    }
    const client = await getClient();
    if (!client) {
      setLoading("Inicializando sessão...");
      setTimeout(loadNotifications, 350);
      return;
    }

    const { data, error } = await client
      .from("notificacoes")
      .select("*")
      .eq("paraUid", state.uid)
      .order("createdAt", { ascending: false })
      .limit(60);

    if (error) {
      if (els.list) els.list.innerHTML = `<div class="doke-inline-loading"><i class="bx bx-error"></i><span>Não foi possível carregar suas notificações.</span></div>`;
      state.items = [];
      render();
      return;
    }

    state.items = Array.isArray(data) ? data.map(normalizeItem) : [];
    render();
  }

  async function markAllRead() {
    if (!state.uid) return;
    const client = await getClient();
    if (!client) return;
    const ids = state.items.filter((n) => !n.lida).map((n) => n.id).filter(Boolean);
    if (!ids.length) return;
    await client.from("notificacoes").update({ lida: true }).in("id", ids);
    state.items = state.items.map((n) => ({ ...n, lida: true }));
    render();
  }

  async function markOneRead(id) {
    const item = state.items.find((n) => n.id === id);
    if (!item || item.lida) return;
    const client = await getClient();
    if (!client) return;
    await client.from("notificacoes").update({ lida: true }).eq("id", id);
    item.lida = true;
  }

  function installEvents() {
    if (els.q) {
      els.q.addEventListener("input", () => {
        state.query = String(els.q.value || "");
        render();
      });
    }
    els.chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        state.filter = String(chip.getAttribute("data-notif-filter") || "all");
        els.chips.forEach((c) => c.setAttribute("aria-pressed", c === chip ? "true" : "false"));
        render();
      });
    });
    if (els.btnReadAll) els.btnReadAll.addEventListener("click", markAllRead);
    if (els.btnSettings) els.btnSettings.addEventListener("click", () => location.assign("preferencia-notif.html"));

    if (els.list) {
      const onActivate = async (target) => {
        const card = target && target.closest ? target.closest("[data-notif-id]") : null;
        if (!card) return;
        const id = String(card.getAttribute("data-notif-id") || "");
        const notif = state.items.find((n) => n.id === id);
        await markOneRead(id);
        render();
        const link = notif && notif.link ? String(notif.link).trim() : "";
        if (link) location.assign(link);
      };
      els.list.addEventListener("click", (ev) => onActivate(ev.target));
      els.list.addEventListener("keydown", (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        ev.preventDefault();
        onActivate(ev.target);
      });
    }
  }

  function boot() {
    installEvents();
    loadNotifications();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

