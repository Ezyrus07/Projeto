(() => {
  const key = "__DOKE_V2_SHELL__";
  if (window[key]) return;

  const SIDEBAR_LINKS = [
    { href: "index.html", title: "Inicio", icon: "bx-home-alt", label: "Inicio" },
    { href: "busca.html", title: "Pesquisar", icon: "bx-search-alt-2", label: "Pesquisar" },
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

    const sidebarLinksHtml = SIDEBAR_LINKS
      .map((link) => `<a href="${link.href}" data-v2-link title="${link.title}"><i class='bx ${link.icon}'></i><span>${link.label}</span></a>`)
      .join("");

    const bottomLinksHtml = BOTTOM_NAV_LINKS
      .map((link) => `<a href="${link.href}" data-v2-link title="${link.label}"><i class='bx ${link.icon}'></i><span>${link.label}</span></a>`)
      .join("");

    const drawerLinksHtml = SIDEBAR_LINKS
      .map((link) => `<a href="${link.href}" data-v2-link><i class='bx ${link.icon}'></i><span>${link.label}</span></a>`)
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

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        closeProfileMenu();
        closeDrawer();
      }
    });

    document.addEventListener("click", (ev) => {
      const t = ev.target;
      if (!(t instanceof Element)) return;
      if (!t.closest(".profile")) closeProfileMenu();
      const clickedLink = t.closest(".doke-v2-drawer .drawer-nav a[data-v2-link]");
      if (clickedLink) closeDrawer();
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
