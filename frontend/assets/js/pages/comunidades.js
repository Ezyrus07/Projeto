(function () {
  "use strict";

  const PAGE = document.body && document.body.dataset ? document.body.dataset.page : "";
  if (PAGE !== "comunidade") return;

  const el = {
    search: document.getElementById("commSearch"),
    tabs: Array.from(document.querySelectorAll("[data-comm-filter]")),
    myGrid: document.getElementById("commMyGrid"),
    grid: document.getElementById("commGrid"),
    empty: document.getElementById("commEmpty"),
    btnCreate: document.getElementById("commCreateBtn"),
    modal: document.getElementById("commCreateModal"),
    modalClose: document.getElementById("commCreateClose"),
    form: document.getElementById("commCreateForm"),
    save: document.getElementById("commCreateSave")
  };

  const state = {
    all: [],
    my: [],
    filter: "todos",
    query: ""
  };

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[m]));
  }
  function escAttr(v) {
    return esc(v).replace(/`/g, "&#096;");
  }

  function normalizeRow(r) {
    const row = r && typeof r === "object" ? r : {};
    return {
      id: String(row.id || row.uuid || row.slug || ""),
      title: String(row.nome || row.name || row.titulo || "").trim() || "Comunidade",
      desc: String(row.descricao || row.description || row.resumo || "").trim(),
      type: String(row.tipo || row.type || row.categoria || "").trim() || "Grupo",
      members: Number(row.membros || row.members || row.total_membros || 0) || 0,
      cover: String(row.capa_url || row.cover_url || row.cover || row.capa || "").trim(),
      avatar: String(row.foto_url || row.avatar_url || row.avatar || row.foto || "").trim(),
      joined: !!(row.participando || row.joined || row.is_member)
    };
  }

  function skeletonCard() {
    return `<article class="comm-skeleton" aria-hidden="true"><div class="cover"></div><div class="body"><div class="avatar"></div><div class="lines"><div class="line"></div><div class="line sm"></div></div></div></article>`;
  }

  function renderMy() {
    if (!el.myGrid) return;
    const list = state.my.length ? state.my : state.all.slice(0, 3);
    if (!list.length) {
      el.myGrid.innerHTML = "";
      return;
    }
    el.myGrid.innerHTML = list
      .map((c) => {
        return `
          <article class="comm-mini" data-comm-id="${escAttr(c.id)}" tabindex="0" role="link">
            <div class="thumb" aria-hidden="true">
              ${c.avatar ? `<img src="${escAttr(c.avatar)}" alt=""/>` : `<i class="bx bx-group"></i>`}
            </div>
            <div class="meta">
              <strong title="${escAttr(c.title)}">${esc(c.title)}</strong>
              <small>${esc(c.type)} · ${c.members} membros</small>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function matchesFilter(c) {
    const f = String(state.filter || "todos").toLowerCase();
    if (f === "todos") return true;
    if (f === "em alta") return true;
    if (f === "novos") return true;
    if (f === "perto de você") return /condom|bairro|perto|local/i.test(`${c.type} ${c.desc}`);
    return `${c.type}`.toLowerCase().includes(f);
  }

  function applySort(list) {
    const f = String(state.filter || "todos").toLowerCase();
    if (f === "em alta") return [...list].sort((a, b) => (b.members || 0) - (a.members || 0));
    if (f === "novos") return [...list].reverse();
    return list;
  }

  function matchesQuery(c) {
    const q = String(state.query || "").trim().toLowerCase();
    if (!q) return true;
    return `${c.title} ${c.desc} ${c.type}`.toLowerCase().includes(q);
  }

  function renderGrid() {
    if (!el.grid || !el.empty) return;
    let list = state.all.filter((c) => matchesFilter(c) && matchesQuery(c));
    list = applySort(list);

    el.empty.style.display = list.length ? "none" : "block";
    if (!list.length) {
      el.grid.innerHTML = "";
      return;
    }
    el.grid.innerHTML = list
      .map((c) => {
        const cover = c.cover
          ? ` style="background-image:url('${escAttr(c.cover)}');background-size:cover;background-position:center"`
          : "";
        return `
          <article class="comm-card" data-comm-id="${escAttr(c.id)}" data-comm-type="${escAttr(String(c.type).toLowerCase())}" tabindex="0" role="link">
            <div class="comm-cover"${cover}></div>
            <div class="comm-body">
              <div class="comm-top">
                <div class="comm-avatar" aria-hidden="true">
                  ${c.avatar ? `<img src="${escAttr(c.avatar)}" alt=""/>` : `<i class="bx bx-group"></i>`}
                </div>
                <div class="comm-info">
                  <h3 title="${escAttr(c.title)}">${esc(c.title)}</h3>
                  <p>${esc(c.desc || "Sem descrição")}</p>
                </div>
                <button class="comm-join ${c.joined ? "is-joined" : ""}" type="button" data-join="1">${c.joined ? "Entrou" : "Entrar"}</button>
              </div>
              <div class="comm-meta">
                <span class="comm-pill">${esc(c.type)}</span>
                <span class="comm-pill">Público</span>
                <span class="comm-members">+${c.members} membros</span>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function getClient() {
    const client = window.sb || window.supabaseClient || window.sbClient || window.__supabaseClient;
    if (client && typeof client.from === "function") return client;
    return null;
  }

  async function loadReal() {
    const client = await getClient();
    if (!client) return null;
    const tried = ["comunidades", "communities"];
    for (const table of tried) {
      try {
        const { data, error } = await client.from(table).select("*").limit(60);
        if (error) continue;
        if (Array.isArray(data) && data.length) return data.map(normalizeRow);
      } catch (_e) {}
    }
    return null;
  }

  function loadLocal() {
    const keys = ["doke_comunidades", "comunidades", "doke_communities"];
    for (const k of keys) {
      try {
        const v = JSON.parse(localStorage.getItem(k) || "null");
        if (Array.isArray(v) && v.length) return v.map(normalizeRow);
      } catch (_e) {}
    }
    return [
      { title: "Condomínio Central", desc: "Avisos, indicações e segurança.", type: "Condomínios", members: 128, joined: true },
      { title: "Profissionais Doke", desc: "Networking e oportunidades.", type: "Profissionais", members: 56, joined: true },
      { title: "Hobbies & Trilhas", desc: "Encontros e grupos da cidade.", type: "Hobbies", members: 34, joined: false }
    ].map(normalizeRow);
  }

  function openModal(open) {
    if (!el.modal) return;
    el.modal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function bind() {
    if (el.search) {
      el.search.addEventListener("input", () => {
        state.query = String(el.search.value || "");
        renderGrid();
      });
    }
    el.tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        el.tabs.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
        state.filter = String(btn.getAttribute("data-comm-filter") || "todos");
        renderGrid();
      });
    });
    if (el.btnCreate) el.btnCreate.addEventListener("click", () => openModal(true));
    if (el.modalClose) el.modalClose.addEventListener("click", () => openModal(false));
    if (el.modal) el.modal.addEventListener("click", (ev) => { if (ev.target === el.modal) openModal(false); });
    if (el.save) el.save.addEventListener("click", () => openModal(false));

    const navigateToGroup = (id) => {
      const safe = String(id || "").trim();
      if (!safe) return;
      location.assign(`grupo.html?id=${encodeURIComponent(safe)}`);
    };

    if (el.grid) {
      el.grid.addEventListener("click", (ev) => {
        const join = ev.target && ev.target.closest ? ev.target.closest("[data-join]") : null;
        if (join) {
          // Sem escrever no servidor aqui: UI-only para não criar hotfix de schema.
          join.classList.toggle("is-joined");
          join.textContent = join.classList.contains("is-joined") ? "Entrou" : "Entrar";
          return;
        }
        const card = ev.target && ev.target.closest ? ev.target.closest("[data-comm-id]") : null;
        if (card) navigateToGroup(card.getAttribute("data-comm-id"));
      });
      el.grid.addEventListener("keydown", (ev) => {
        if (ev.key !== "Enter") return;
        const card = ev.target && ev.target.closest ? ev.target.closest("[data-comm-id]") : null;
        if (card) navigateToGroup(card.getAttribute("data-comm-id"));
      });
    }
    if (el.myGrid) {
      el.myGrid.addEventListener("click", (ev) => {
        const card = ev.target && ev.target.closest ? ev.target.closest("[data-comm-id]") : null;
        if (card) navigateToGroup(card.getAttribute("data-comm-id"));
      });
      el.myGrid.addEventListener("keydown", (ev) => {
        if (ev.key !== "Enter") return;
        const card = ev.target && ev.target.closest ? ev.target.closest("[data-comm-id]") : null;
        if (card) navigateToGroup(card.getAttribute("data-comm-id"));
      });
    }
  }

  async function init() {
    bind();
    if (el.grid) el.grid.innerHTML = `${skeletonCard()}${skeletonCard()}${skeletonCard()}`;
    if (el.myGrid) el.myGrid.innerHTML = `${skeletonCard()}${skeletonCard()}${skeletonCard()}`;

    const real = await loadReal();
    state.all = real && real.length ? real : loadLocal();
    state.my = state.all.filter((x) => !!x.joined).slice(0, 3);
    renderMy();
    renderGrid();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();

