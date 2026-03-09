(() => {
  const key = "__DOKE_V2_SHELL__";
  if (window[key]) return;

  const SIDEBAR_LINKS = [
    { href: "index.html", title: "Inicio", icon: "bx-home-alt", label: "Inicio" },
    { href: "busca.html", title: "Pesquisar", icon: "bx-search-alt-2", label: "Pesquisar", action: "open-search-panel" },
    { href: "negocios.html", title: "Negocios", icon: "bx-store", label: "Negocios" },
    { href: "notificacoes.html", title: "Notificacoes", icon: "bx-bell", label: "Notificacoes" },
    { href: "mensagens.html", title: "Mensagens", icon: "bx-message-rounded-dots", label: "Mensagens" },
    { href: "pedidos.html", title: "Pedidos", icon: "bx-package", label: "Pedidos" },
    { href: "comunidade.html", title: "Comunidades", icon: "bx-group", label: "Comunidades" },
    { href: "meuperfil.html", title: "Perfil", icon: "bx-user", label: "Perfil" },
    { href: "mais.html", title: "Mais", icon: "bx-menu", label: "Mais" }
  ];

  const BOTTOM_NAV_LINKS = [
    { href: "index.html", icon: "bx-home-alt", label: "Inicio" },
    { href: "busca.html", icon: "bx-search", label: "Pesquisar" },
    { href: "comunidade.html", icon: "bx-group", label: "Comunidades" },
    { href: "negocios.html", icon: "bx-store", label: "Negocios" },
    { href: "meuperfil.html", icon: "bx-user", label: "Perfil" }
  ];
  const SEARCH_HISTORY_KEY = "doke_historico_busca";
  const SEARCH_USER_HISTORY_KEY = "doke_user_quicksearch_hist_v2";
  const SEARCH_MODE_KEY = "doke_ig_search_mode_v2";
  const SEARCH_HISTORY_LIMIT = 8;

  function safeParse(json) {
    try { return JSON.parse(json); } catch (_e) { return null; }
  }

  function readProfile() {
    const keys = [
      "doke_usuario_perfil",
      "perfil_usuario",
      "usuario_logado",
      "doke_usuario_logado",
      "userLogado"
    ];
    for (const keyName of keys) {
      try {
        const raw = localStorage.getItem(keyName);
        if (!raw) continue;
        const parsed = safeParse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      } catch (_e) {}
    }
    return {};
  }

  function readSavedAccounts() {
    try {
      const raw = localStorage.getItem("doke_saved_accounts") || "[]";
      const parsed = safeParse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  }

  function profileAvatarFromObject(obj) {
    if (!obj || typeof obj !== "object") return "";
    return String(
      obj.foto ||
      obj.avatar ||
      obj.foto_url ||
      obj.fotoPerfil ||
      obj.avatar_url ||
      obj.photoURL ||
      obj.imagem ||
      ""
    ).trim();
  }

  function readAvatar(profile) {
    const direct = profileAvatarFromObject(profile);
    if (direct) return direct;

    const uid = String(profile?.uid || profile?.id || localStorage.getItem("doke_uid") || "").trim();
    const email = String(profile?.email || "").trim().toLowerCase();
    const saved = readSavedAccounts();
    if (saved.length) {
      const byIdentity = saved.find((acc) => {
        const accUid = String(acc?.uid || acc?.id || "").trim();
        const accEmail = String(acc?.email || "").trim().toLowerCase();
        return (uid && accUid && accUid === uid) || (email && accEmail && accEmail === email);
      });
      const best = byIdentity || saved[0];
      const savedAvatar = profileAvatarFromObject(best);
      if (savedAvatar) return savedAvatar;
    }

    try {
      const domAvatar = document.querySelector(
        ".navbar-desktop .profile-img-btn, .navbar-desktop .profile-img, .doke-shell-profile-btn img, .doke-avatar-btn img"
      );
      if (domAvatar instanceof HTMLImageElement) {
        const src = String(domAvatar.getAttribute("src") || domAvatar.src || "").trim();
        if (src) return src;
      }
    } catch (_e) {}

    return "https://i.pravatar.cc/96?img=12";
  }

  function createShell() {
    const profile = readProfile();
    const isPro = String(
      profile.tipo ||
      profile.userType ||
      profile.tipoConta ||
      profile.accountType ||
      ""
    ).toLowerCase().includes("pro");
    const profileName = String(profile.user || profile.nome || profile.name || "Minha conta").trim() || "Minha conta";
    const profileHref = isPro ? "meuperfil.html" : "perfil-usuario.html";
    const anunciarHref = isPro ? "anunciar.html" : "tornar-profissional.html";
    const avatar = readAvatar(profile);

    const renderNavLink = (link, withDataV2Link) => {
      const attrs = [
        `href="${link.href}"`,
        `title="${link.title || link.label || ""}"`
      ];
      if (withDataV2Link) attrs.push("data-v2-link");
      if (link.action) {
        attrs.push(`data-v2-action="${link.action}"`);
        attrs.push("data-v2-native");
      }
      return `<a ${attrs.join(" ")}><i class='bx ${link.icon}'></i><span>${link.label}</span></a>`;
    };

    const sidebarLinksHtml = SIDEBAR_LINKS
      .map((link) => renderNavLink(link, true))
      .join("");

    const bottomLinksHtml = BOTTOM_NAV_LINKS
      .map((link) => `<a href="${link.href}" data-v2-link title="${link.label}"><i class='bx ${link.icon}'></i><span>${link.label}</span></a>`)
      .join("");

    const drawerLinksHtml = SIDEBAR_LINKS
      .map((link) => renderNavLink(link, true))
      .join("");

    const root = document.createElement("div");
    root.className = "doke-v2";
    root.innerHTML = `
      <aside class="doke-v2-sidebar">
        <a href="index.html" data-v2-link class="brand" aria-label="Doke">
          <img src="assets/Imagens/doke-logo.png" alt="Doke">
        </a>
        <nav class="nav">
          ${sidebarLinksHtml}
        </nav>
      </aside>

      <aside class="doke-v2-search-panel" aria-hidden="true">
        <div class="doke-v2-search-panel-head">
          <h3>Pesquisar</h3>
          <button type="button" class="doke-v2-search-close" data-v2-action="close-search-panel" aria-label="Fechar pesquisa">
            <i class='bx bx-x'></i>
          </button>
        </div>
        <form class="doke-v2-search-form" data-v2-role="search-form">
          <i class='bx bx-search-alt-2'></i>
          <input type="search" placeholder="Busque servicos e profissionais..." autocomplete="off" data-v2-role="search-input">
          <button type="submit" data-v2-role="search-submit">Buscar</button>
        </form>
        <div class="doke-v2-search-tabs" role="tablist" aria-label="Tipo de pesquisa">
          <button type="button" class="is-active" data-v2-action="search-mode" data-mode="ads" role="tab" aria-selected="true">Anuncios</button>
          <button type="button" data-v2-action="search-mode" data-mode="users" role="tab" aria-selected="false">Usuarios</button>
        </div>
        <div class="doke-v2-search-list-head">
          <span data-v2-role="search-list-title">Recentes</span>
          <button type="button" data-v2-action="clear-search-history">Limpar</button>
        </div>
        <div class="doke-v2-search-list" data-v2-role="search-history"></div>
        <div class="doke-v2-search-reco-head">
          <span data-v2-role="search-reco-title">Recomendados</span>
          <button type="button" data-v2-action="open-full-search">Ver no Buscar</button>
        </div>
        <div class="doke-v2-search-reco" data-v2-role="search-reco"></div>
      </aside>
      <div class="doke-v2-search-backdrop" data-v2-action="close-search-panel" aria-hidden="true"></div>

      <header class="doke-v2-header">
        <div class="mobile-left">
          <button type="button" class="mobile-hamb" aria-label="Abrir menu">
            <i class='bx bx-menu'></i>
          </button>
          <a href="index.html" data-v2-link class="mobile-brand" aria-label="Doke">
            <img src="assets/Imagens/doke-logo.png" alt="Doke">
          </a>
        </div>

        <nav class="top-menu">
          <a href="escolheranuncio.html" data-v2-link>Anunciar</a>
          <a href="comunidade.html" data-v2-link>Comunidades <span class="novo">NOVO</span></a>
          <a href="novidades.html" data-v2-link>Novidades</a>
        </nav>

        <div class="header-right">
          <div class="mobile-actions">
            <a href="notificacoes.html" data-v2-link class="icon-btn" aria-label="Notificacoes"><i class='bx bx-bell'></i></a>
            <a href="mensagens.html" data-v2-link class="icon-btn" aria-label="Mensagens"><i class='bx bx-message-rounded-dots'></i></a>
          </div>

          <div class="profile">
            <button type="button" class="profile-btn" aria-label="Perfil">
              <img src="${avatar}" alt="Perfil" onerror="this.onerror=null;this.src='https://i.pravatar.cc/96?img=12'">
            </button>
            <div class="profile-menu" hidden>
              <div class="pm-head">${profileName}</div>
              <a href="${profileHref}" data-v2-link><i class='bx bx-user-circle'></i><span>Ver Perfil</span></a>
              <a href="carteira.html" data-v2-link><i class='bx bx-wallet'></i><span>Carteira</span></a>
              <a href="#" data-v2-action="switch-account"><i class='bx bx-user-pin'></i><span>Alternar Conta</span></a>
              <a href="${anunciarHref}" data-v2-link><i class='bx bx-plus-circle'></i><span>Anunciar</span></a>
              <a href="pedidos.html" data-v2-link><i class='bx bx-package'></i><span>Pedidos</span></a>
              <a href="mensagens.html" data-v2-link><i class='bx bx-chat'></i><span>Mensagens</span></a>
              <a href="login.html?logout=1" class="pm-logout"><i class='bx bx-log-out'></i><span>Sair</span></a>
            </div>
          </div>
        </div>
      </header>

      <aside class="doke-v2-drawer" aria-hidden="true">
        <div class="drawer-head">
          <a href="index.html" data-v2-link class="drawer-brand" aria-label="Doke">
            <img src="assets/Imagens/doke-logo.png" alt="Doke">
          </a>
          <button type="button" class="drawer-close" aria-label="Fechar menu">
            <i class='bx bx-x'></i>
          </button>
        </div>
        <nav class="drawer-nav">
          ${drawerLinksHtml}
        </nav>
      </aside>
      <div class="doke-v2-drawer-backdrop" aria-hidden="true"></div>

      <main class="doke-v2-main"></main>
      <nav class="doke-v2-bottom-nav" aria-label="Navegacao principal mobile">
        ${bottomLinksHtml}
      </nav>
    `;

    const main = root.querySelector(".doke-v2-main");
    const profileBtn = root.querySelector(".profile-btn");
    const profileMenu = root.querySelector(".profile-menu");
    const drawer = root.querySelector(".doke-v2-drawer");
    const drawerBackdrop = root.querySelector(".doke-v2-drawer-backdrop");
    const drawerOpenBtn = root.querySelector(".mobile-hamb");
    const drawerCloseBtn = root.querySelector(".drawer-close");
    const searchPanel = root.querySelector(".doke-v2-search-panel");
    const searchInput = root.querySelector("[data-v2-role='search-input']");
    const searchForm = root.querySelector("[data-v2-role='search-form']");
    const searchHistory = root.querySelector("[data-v2-role='search-history']");
    const searchReco = root.querySelector("[data-v2-role='search-reco']");
    const searchRecoHead = root.querySelector(".doke-v2-search-reco-head");
    const searchListTitle = root.querySelector("[data-v2-role='search-list-title']");
    const searchRecoTitle = root.querySelector("[data-v2-role='search-reco-title']");
    const searchModeButtons = Array.from(root.querySelectorAll("[data-v2-action='search-mode']"));
    let searchMode = "ads";

    const closeProfileMenu = () => {
      if (profileMenu) profileMenu.hidden = true;
    };

    const openDrawer = () => {
      if (!(drawer instanceof HTMLElement)) return;
      drawer.classList.add("show");
      if (drawerBackdrop instanceof HTMLElement) drawerBackdrop.classList.add("show");
      document.body.classList.add("doke-v2-drawer-open");
    };

    const closeDrawer = () => {
      if (!(drawer instanceof HTMLElement)) return;
      drawer.classList.remove("show");
      if (drawerBackdrop instanceof HTMLElement) drawerBackdrop.classList.remove("show");
      document.body.classList.remove("doke-v2-drawer-open");
    };

    function readSearchHistory() {
      try {
        const raw = localStorage.getItem(SEARCH_HISTORY_KEY) || "[]";
        const parsed = safeParse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
          .map((item) => String(item || "").trim())
          .filter(Boolean)
          .slice(0, SEARCH_HISTORY_LIMIT);
      } catch (_e) {
        return [];
      }
    }

    function readSearchMode() {
      const raw = String(localStorage.getItem(SEARCH_MODE_KEY) || "").toLowerCase();
      return raw === "users" ? "users" : "ads";
    }

    function saveSearchMode(mode) {
      try { localStorage.setItem(SEARCH_MODE_KEY, mode === "users" ? "users" : "ads"); } catch (_e) {}
    }

    function readUserSearchHistory() {
      try {
        const raw = localStorage.getItem(SEARCH_USER_HISTORY_KEY) || "[]";
        const parsed = safeParse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
          .map((item) => (item && typeof item === "object" && (item.t === "user" || item.uid || item.id) ? item : null))
          .filter(Boolean)
          .slice(0, SEARCH_HISTORY_LIMIT);
      } catch (_e) {
        return [];
      }
    }

    function saveUserSearchHistory(item) {
      if (!item || typeof item !== "object") return;
      const uid = String(item.uid || item.id || "").trim();
      if (!uid) return;
      const current = readUserSearchHistory().filter((row) => String(row.uid || row.id || "").trim() !== uid);
      const next = [{ ...item, uid, ts: Date.now() }, ...current].slice(0, SEARCH_HISTORY_LIMIT);
      try { localStorage.setItem(SEARCH_USER_HISTORY_KEY, JSON.stringify(next)); } catch (_e) {}
    }

    function clearUserSearchHistoryOnly() {
      try {
        const raw = localStorage.getItem(SEARCH_USER_HISTORY_KEY) || "[]";
        const parsed = safeParse(raw);
        if (!Array.isArray(parsed)) {
          localStorage.removeItem(SEARCH_USER_HISTORY_KEY);
          return;
        }
        const keep = parsed.filter((item) => !(item && typeof item === "object" && (item.t === "user" || item.uid || item.id)));
        localStorage.setItem(SEARCH_USER_HISTORY_KEY, JSON.stringify(keep));
      } catch (_e) {
        try { localStorage.removeItem(SEARCH_USER_HISTORY_KEY); } catch (_e2) {}
      }
    }

    function saveSearchTerm(term) {
      const value = String(term || "").trim();
      if (!value) return;
      const next = [value, ...readSearchHistory().filter((item) => item.toLowerCase() !== value.toLowerCase())]
        .slice(0, SEARCH_HISTORY_LIMIT);
      try { localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next)); } catch (_e) {}
    }

    function escapeAttr(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function normalizeText(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    }

    function getCurrentTerm() {
      if (!(searchInput instanceof HTMLInputElement)) return "";
      return String(searchInput.value || "").trim();
    }

    function getAdsCache() {
      if (Array.isArray(window.__dokeAnunciosCacheFull) && window.__dokeAnunciosCacheFull.length) {
        return window.__dokeAnunciosCacheFull;
      }
      try {
        const raw = localStorage.getItem("doke_cache_home_anuncios_v4");
        const parsed = raw ? JSON.parse(raw) : null;
        const list = Array.isArray(parsed?.data) ? parsed.data : [];
        return list;
      } catch (_e) {
        return [];
      }
    }

    function pickAdsByTerm(term, limit = 4) {
      const all = getAdsCache();
      if (!all.length) return [];
      const q = normalizeText(term);
      const withScore = all.map((item) => {
        const text = normalizeText(`${item?.titulo || ""} ${item?.descricao || ""} ${item?.categoria || ""} ${item?.categorias || ""} ${item?.cidade || ""} ${item?.bairro || ""}`);
        let score = 0;
        if (!q) score = 1;
        else if (text.includes(q)) score += 30;
        const tokens = q.split(/\s+/).filter(Boolean);
        tokens.forEach((tk) => { if (tk && text.includes(tk)) score += 7; });
        return { item, score };
      });
      return withScore
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(1, limit))
        .map((row) => row.item);
    }

    async function searchUsersByTerm(term) {
      const q = String(term || "").trim();
      if (q.length < 2) return [];
      const sb = (window.sb && window.sb.from) ? window.sb : (typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null);
      if (!sb || typeof sb.from !== "function") return [];

      const tables = ["usuarios", "usuarios_legacy"];
      for (const table of tables) {
        try {
          const { data, error } = await sb
            .from(table)
            .select("id,uid,uid_text,user,nome,foto,isProfissional,categoria_profissional")
            .or(`user.ilike.%${q}%,nome.ilike.%${q}%`)
            .limit(6);
          if (!error && Array.isArray(data)) return data;
        } catch (_e) {}
      }
      return [];
    }

    function syncSearchModeUI() {
      searchModeButtons.forEach((btn) => {
        const on = String(btn.dataset.mode || "") === searchMode;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
      });
      if (searchInput instanceof HTMLInputElement) {
        searchInput.placeholder = searchMode === "users"
          ? "Busque usuarios ou @perfil..."
          : "Busque servicos e profissionais...";
      }
      if (searchListTitle instanceof HTMLElement) {
        searchListTitle.textContent = searchMode === "users" ? "Recentes de usuarios" : "Recentes de anuncios";
      }
      if (searchRecoTitle instanceof HTMLElement) {
        searchRecoTitle.textContent = searchMode === "users" ? "Usuarios recomendados" : "Anuncios recomendados";
      }
      if (searchReco instanceof HTMLElement) {
        searchReco.hidden = searchMode === "users";
      }
      if (searchRecoHead instanceof HTMLElement) {
        searchRecoHead.hidden = searchMode === "users";
      }
    }

    function renderSearchRecommendations() {
      if (!(searchReco instanceof HTMLElement)) return;
      const term = getCurrentTerm();
      if (searchMode === "users") {
        const hist = readUserSearchHistory().slice(0, 4);
        if (!hist.length) {
          searchReco.innerHTML = `<p class="doke-v2-search-empty">Sem recomendacoes de usuarios ainda.</p>`;
          return;
        }
        searchReco.innerHTML = hist.map((u) => {
          const uid = escapeAttr(u.uid || u.id || "");
          const name = escapeAttr(u.nome || "Usuario");
          const user = escapeAttr(u.user || "perfil");
          const foto = escapeAttr(u.foto || `https://i.pravatar.cc/96?u=${encodeURIComponent(uid || user)}`);
          const isProf = !!u.isProfissional;
          const dest = isProf
            ? `perfil-profissional.html?uid=${encodeURIComponent(uid)}`
            : `perfil-usuario.html?uid=${encodeURIComponent(uid)}`;
          return `<article class="doke-v2-mini-card doke-v2-mini-card-user" data-href="${escapeAttr(dest)}">
            <img src="${foto}" alt="">
            <div class="meta">
              <strong>@${user.replace(/^@/, "")}</strong>
              <small>${name}</small>
            </div>
            <button type="button" data-v2-action="open-mini-user" data-href="${escapeAttr(dest)}"
              data-uid="${uid}" data-user="${user}" data-nome="${name}" data-foto="${foto}" data-isprof="${isProf ? "1" : "0"}">Ver perfil</button>
          </article>`;
        }).join("");
        return;
      }

      const picked = pickAdsByTerm(term, 4);
      if (!picked.length) {
        searchReco.innerHTML = `<p class="doke-v2-search-empty">Sem anuncios recomendados no momento.</p>`;
        return;
      }
      searchReco.innerHTML = picked.map((ad) => {
        const adId = String(ad?.id || ad?.anuncioId || ad?.anuncio_id || ad?.servicoId || ad?.servico_id || "").trim();
        const title = escapeAttr(ad?.titulo || ad?.descricao || ad?.categoria || "Anuncio");
        const local = escapeAttr([ad?.bairro, ad?.cidade].filter(Boolean).join(" - ") || "Local nao informado");
        const price = escapeAttr(String(ad?.preco || "Sob orcamento"));
        const img = escapeAttr(ad?.img || ad?.imagem || ad?.thumb || "https://placehold.co/180x120?text=Doke");
        const q = encodeURIComponent(getCurrentTerm() || String(ad?.titulo || ad?.categoria || ""));
        const detailsHref = adId ? `detalhes.html?id=${encodeURIComponent(adId)}` : `busca.html${q ? `?q=${q}&src=mini_ad_no_id` : ""}`;
        return `<article class="doke-v2-mini-card" data-term="${q}">
          <img src="${img}" alt="">
          <div class="meta">
            <strong>${title}</strong>
            <small>${local}</small>
            <small class="price">${price}</small>
          </div>
          <button type="button" data-v2-action="open-mini-ad" data-term="${q}" data-href="${escapeAttr(detailsHref)}">Mais detalhes</button>
        </article>`;
      }).join("");
    }

    function renderSearchHistory() {
      if (!(searchHistory instanceof HTMLElement)) return;
      if (searchMode === "users") {
        const items = readUserSearchHistory();
        if (!items.length) {
          searchHistory.innerHTML = `<p class="doke-v2-search-empty">Sem historico recente.</p>`;
          return;
        }
        searchHistory.innerHTML = items
          .map((item) => {
            const uid = escapeAttr(item.uid || item.id || "");
            const nome = escapeAttr(item.nome || "Usuario");
            const user = escapeAttr(item.user || "perfil");
            const foto = escapeAttr(item.foto || `https://i.pravatar.cc/96?u=${encodeURIComponent(uid || user)}`);
            const isProf = item.isProfissional === true;
            const dest = isProf
              ? `perfil-profissional.html?uid=${encodeURIComponent(uid)}`
              : `perfil-usuario.html?uid=${encodeURIComponent(uid)}`;
            return `<article class="doke-v2-mini-card doke-v2-mini-card-user" data-href="${escapeAttr(dest)}">
              <img src="${foto}" alt="">
              <div class="meta">
                <strong>@${user.replace(/^@/, "")}</strong>
                <small>${nome}</small>
              </div>
              <button type="button" data-v2-action="open-mini-user" data-href="${escapeAttr(dest)}"
                data-uid="${uid}" data-user="${user}" data-nome="${nome}" data-foto="${foto}" data-isprof="${isProf ? "1" : "0"}">Ver perfil</button>
            </article>`;
          })
          .join("");
      } else {
        const items = readSearchHistory();
        if (!items.length) {
          searchHistory.innerHTML = `<p class="doke-v2-search-empty">Sem historico recente.</p>`;
          return;
        }
        searchHistory.innerHTML = items
          .map((item) => {
            const safe = escapeAttr(item);
            return `<button type="button" class="doke-v2-search-chip" data-v2-action="use-search-history" data-term="${safe}"><i class='bx bx-time-five'></i><span>${safe}</span></button>`;
          })
          .join("");
      }
    }

    function closeSearchPanel() {
      if (!(searchPanel instanceof HTMLElement)) return;
      searchPanel.classList.remove("show");
      searchPanel.setAttribute("aria-hidden", "true");
      document.body.classList.remove("doke-v2-search-panel-open");
      root.querySelectorAll("[data-v2-action='open-search-panel']").forEach((el) => el.classList.remove("is-open"));
    }

    function openSearchPanel(initialTerm) {
      if (!(searchPanel instanceof HTMLElement)) return;
      closeProfileMenu();
      closeDrawer();
      searchMode = readSearchMode();
      syncSearchModeUI();
      renderSearchHistory();
      renderSearchRecommendations();
      searchPanel.classList.add("show");
      searchPanel.setAttribute("aria-hidden", "false");
      document.body.classList.add("doke-v2-search-panel-open");
      root.querySelectorAll("[data-v2-action='open-search-panel']").forEach((el) => el.classList.add("is-open"));
      if (searchInput instanceof HTMLInputElement) {
        if (typeof initialTerm === "string") searchInput.value = initialTerm;
        renderSearchRecommendations();
        try {
          window.setTimeout(() => {
            searchInput.focus();
            const len = searchInput.value.length;
            searchInput.setSelectionRange(len, len);
          }, 10);
        } catch (_e) {}
      }
    }

    async function runSearch(rawTerm) {
      const term = String(rawTerm || "").trim();
      if (!term) return;
      if (searchMode === "users") {
        const users = await searchUsersByTerm(term);
        if (!users.length) {
          if (searchHistory instanceof HTMLElement) {
            searchHistory.innerHTML = `<p class="doke-v2-search-empty">Nenhum usuario encontrado para "${escapeAttr(term)}".</p>`;
          }
          return;
        }
        if (searchHistory instanceof HTMLElement) {
          searchHistory.innerHTML = users.map((u) => {
            const uid = String(u?.uid || u?.uid_text || u?.id || "").trim();
            const nome = escapeAttr(u?.nome || "Usuario");
            const user = escapeAttr(u?.user || nome || "perfil");
            const foto = escapeAttr(u?.foto || `https://i.pravatar.cc/96?u=${encodeURIComponent(uid || user)}`);
            const isProf = u?.isProfissional === true;
            const dest = isProf
              ? `perfil-profissional.html?uid=${encodeURIComponent(uid)}`
              : `perfil-usuario.html?uid=${encodeURIComponent(uid)}`;
            return `<article class="doke-v2-mini-card doke-v2-mini-card-user" data-href="${escapeAttr(dest)}">
              <img src="${foto}" alt="">
              <div class="meta">
                <strong>@${user.replace(/^@/, "")}</strong>
                <small>${nome}</small>
              </div>
              <button type="button" data-v2-action="open-mini-user" data-href="${escapeAttr(dest)}"
                data-uid="${escapeAttr(uid)}" data-user="${user}" data-nome="${nome}" data-foto="${foto}" data-isprof="${isProf ? "1" : "0"}">Ver perfil</button>
            </article>`;
          }).join("");
        }
        return;
      }
      saveSearchTerm(term);
      closeSearchPanel();
      const target = `busca.html?q=${encodeURIComponent(term)}&src=sidebar_search`;
      if (typeof window.__DOKE_V2_NAVIGATE__ === "function") {
        await window.__DOKE_V2_NAVIGATE__(target);
      } else {
        location.href = target;
      }
    }

    if (profileBtn && profileMenu) {
      profileBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const isOpen = !profileMenu.hidden;
        closeDrawer();
        profileMenu.hidden = isOpen;
      });

      profileMenu.querySelectorAll("[data-v2-action='switch-account']").forEach((a) => {
        a.addEventListener("click", (ev) => {
          ev.preventDefault();
          closeProfileMenu();
          try {
            if (typeof window.alternarConta === "function") {
              window.alternarConta();
              return;
            }
          } catch (_e) {}
          location.href = "login.html";
        });
      });
    }

    if (drawerOpenBtn) {
      drawerOpenBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        closeProfileMenu();
        openDrawer();
      });
    }

    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        closeDrawer();
      });
    }

    if (drawerBackdrop) {
      drawerBackdrop.addEventListener("click", closeDrawer);
    }

    if (searchForm) {
      searchForm.addEventListener("submit", (ev) => {
        ev.preventDefault();
        if (!(searchInput instanceof HTMLInputElement)) return;
        runSearch(searchInput.value);
      });
    }

    let userSearchTimer = null;
    if (searchInput instanceof HTMLInputElement) {
      searchInput.addEventListener("input", () => {
        if (searchMode === "users") {
          if (userSearchTimer) {
            try { window.clearTimeout(userSearchTimer); } catch (_e) {}
          }
          const term = getCurrentTerm();
          if (term.length >= 2) {
            userSearchTimer = window.setTimeout(() => {
              runSearch(term);
            }, 220);
            return;
          }
          renderSearchHistory();
          return;
        }
        renderSearchRecommendations();
      });
    }

    root.addEventListener("click", (ev) => {
      const target = ev.target;
      if (!(target instanceof Element)) return;
      const openBtn = target.closest("[data-v2-action='open-search-panel']");
      if (openBtn) {
        ev.preventDefault();
        const q = new URLSearchParams(location.search || "").get("q") || "";
        openSearchPanel(q);
        return;
      }

      const closeBtn = target.closest("[data-v2-action='close-search-panel']");
      if (closeBtn) {
        ev.preventDefault();
        closeSearchPanel();
        return;
      }

      const historyBtn = target.closest("[data-v2-action='use-search-history']");
      if (historyBtn instanceof HTMLElement) {
        ev.preventDefault();
        runSearch(historyBtn.dataset.term || "");
        return;
      }

      const userHistoryBtn = target.closest("[data-v2-action='use-user-history']");
      if (userHistoryBtn instanceof HTMLElement) {
        ev.preventDefault();
        const uid = String(userHistoryBtn.dataset.uid || "").trim();
        const userItem = readUserSearchHistory().find((row) => String(row.uid || row.id || "").trim() === uid);
        if (userItem) {
          const dest = userItem.isProfissional
            ? `perfil-profissional.html?uid=${encodeURIComponent(uid)}`
            : `perfil-usuario.html?uid=${encodeURIComponent(uid)}`;
          location.href = dest;
        }
        return;
      }

      const clearBtn = target.closest("[data-v2-action='clear-search-history']");
      if (clearBtn) {
        ev.preventDefault();
        try {
          if (searchMode === "users") clearUserSearchHistoryOnly();
          else localStorage.removeItem(SEARCH_HISTORY_KEY);
        } catch (_e) {}
        renderSearchHistory();
        renderSearchRecommendations();
        return;
      }

      const modeBtn = target.closest("[data-v2-action='search-mode']");
      if (modeBtn instanceof HTMLElement) {
        ev.preventDefault();
        searchMode = String(modeBtn.dataset.mode || "") === "users" ? "users" : "ads";
        saveSearchMode(searchMode);
        syncSearchModeUI();
        renderSearchHistory();
        renderSearchRecommendations();
        return;
      }

      const openFullBtn = target.closest("[data-v2-action='open-full-search']");
      if (openFullBtn) {
        ev.preventDefault();
        const term = getCurrentTerm();
        const targetHref = `busca.html${term ? `?q=${encodeURIComponent(term)}&src=sidebar_panel` : ""}`;
        closeSearchPanel();
        if (typeof window.__DOKE_V2_NAVIGATE__ === "function") window.__DOKE_V2_NAVIGATE__(targetHref);
        else location.href = targetHref;
        return;
      }

      const openMiniAdBtn = target.closest("[data-v2-action='open-mini-ad']");
      if (openMiniAdBtn instanceof HTMLElement) {
        ev.preventDefault();
        const directHref = String(openMiniAdBtn.dataset.href || "").trim();
        let term = String(openMiniAdBtn.dataset.term || "").trim();
        try { term = decodeURIComponent(term); } catch (_e) {}
        const targetHref = directHref || `busca.html${term ? `?q=${encodeURIComponent(term)}&src=mini_ad` : ""}`;
        closeSearchPanel();
        location.href = targetHref;
        return;
      }

      const openMiniUserBtn = target.closest("[data-v2-action='open-mini-user']");
      if (openMiniUserBtn instanceof HTMLElement) {
        ev.preventDefault();
        const href = String(openMiniUserBtn.dataset.href || "").trim();
        if (!href) return;
        saveUserSearchHistory({
          t: "user",
          uid: String(openMiniUserBtn.dataset.uid || "").trim(),
          user: String(openMiniUserBtn.dataset.user || "").trim(),
          nome: String(openMiniUserBtn.dataset.nome || "").trim(),
          foto: String(openMiniUserBtn.dataset.foto || "").trim(),
          isProfissional: String(openMiniUserBtn.dataset.isprof || "") === "1"
        });
        location.href = href;
      }
    }, true);

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        closeProfileMenu();
        closeDrawer();
        closeSearchPanel();
      }
    });

    document.addEventListener("click", (ev) => {
      const t = ev.target;
      if (!(t instanceof Element)) return;
      if (!t.closest(".profile")) closeProfileMenu();
      const clickedLink = t.closest(".doke-v2-drawer .drawer-nav a[data-v2-link]");
      if (clickedLink) closeDrawer();
      if (!t.closest(".doke-v2-search-panel") && !t.closest("[data-v2-action='open-search-panel']")) {
        closeSearchPanel();
      }
    }, true);

    function setActive(pathname) {
      const file = String(pathname || "").toLowerCase().split("/").pop() || "index.html";

      root.querySelectorAll(".doke-v2-sidebar .nav a, .doke-v2-bottom-nav a").forEach((a) => {
        const href = String(a.getAttribute("href") || "").toLowerCase().split("?")[0];
        a.classList.toggle("active", href === file);
      });

      root.querySelectorAll(".doke-v2-header .top-menu a").forEach((a) => {
        const href = String(a.getAttribute("href") || "").toLowerCase().split("?")[0];
        a.classList.toggle("active", href === file);
      });
    }

    return { root, main, setActive };
  }

  window[key] = { createShell };
})();
