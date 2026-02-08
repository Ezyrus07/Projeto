(function(){
  const MQ = window.matchMedia("(max-width:1024px)");
  const PAGES = {
    home: "index.html",
    search: "busca.html",
    comunidades: "comunidade.html",
    negocios: "negocios.html",
    perfil: "meuperfil.html",
    chat: "chat.html",
    notif: "notificacoes.html",
    mais: "mais.html"
  };

  const LOGO_SRC = "assets/Imagens/doke-logo.png";

  function toast(msg, type="info"){
    try{
      if(typeof window.dokeToast === "function") return window.dokeToast(msg, {type});
      if(typeof window.mostrarToast === "function") return window.mostrarToast(msg, type);
    }catch(e){}
    try{ console[type==="error"?"error":"log"]("[DOKE]", msg); }catch(e){}
  }

  function safeParse(json){
    try{ return JSON.parse(json); }catch(e){ return null; }
  }

  function getProfile(){
    const keys = ["doke_usuario_perfil", "usuarioLogado", "usuario_logado", "perfil_usuario"];
    for(const k of keys){
      let v = null;
      try{ v = localStorage.getItem(k); }catch(e){}
      if(!v) continue;
      const obj = safeParse(v);
      if(obj && typeof obj === "object") return obj;
    }
    return null;
  }

  function getAvatarUrl(profile){
    if(!profile) return null;
    return profile.foto || profile.avatar || profile.foto_url || profile.fotoPerfil || profile.photoURL || profile.imagem || null;
  }

  function hasMeaningfulHeader(){
    const headers = Array.from(document.querySelectorAll("header"))
      .filter(h => !h.classList.contains("doke-mobile-header"));
    for(const h of headers){
      const cls = String(h.className||"").toLowerCase();
      if (cls.includes("main-header") || cls.includes("header") || cls.includes("topbar")) return true;
      if (h.querySelector("nav, a, button, input, img")) return true;
      const txt = (h.textContent||"").trim();
      if (txt.length > 20) return true;
    }
    if (document.querySelector(".main-header, .header-container, .top-header, .header")) return true;
    return false;
  }

  function hasMeaningfulBottomNav(){
    if (document.querySelector(".doke-bottom-nav")) return true;
    if (document.querySelector(".bottom-nav, nav.bottom-nav, .nav-bottom, .menu-bottom, .footer-nav, .mobile-nav")) return true;
    return false;
  }

  function ensureBottomSpacer(){
    let sp = document.querySelector(".doke-bottom-spacer");
    if(!sp){
      sp = document.createElement("div");
      sp.className = "doke-bottom-spacer";
      const host = document.querySelector("footer.main-footer") || document.querySelector(".main-footer") || document.body;
      host.appendChild(sp);
    }
  }

  function syncBottomNavHeight(nav){
    if(!nav) return;
    const h = Math.ceil(nav.getBoundingClientRect().height || nav.offsetHeight || 84);
    document.documentElement.style.setProperty("--doke-btm-real", h + "px");
    ensureBottomSpacer();
  }

  function setActive(bottom){
    if(!bottom) return;
    const path = (location.pathname.split("/").pop() || "").toLowerCase();
    const map = [
      {key:"home", files:["index.html","feed.html","novidades.html"]},
      {key:"comunidades", files:["comunidade.html","grupo.html"]},
      {key:"negocios", files:["negocios.html","negocio.html","anunciar-negocio.html","empresas.html","meuempreendimento.html"]},
      {key:"perfil", files:["meuperfil.html","perfil-profissional.html","perfil-cliente.html","perfil-empresa.html","perfil-usuario.html"]},
    ];
    bottom.querySelectorAll("a").forEach(a=>a.classList.remove("active"));
    const found = map.find(m=>m.files.includes(path));
    if(found){
      const a = bottom.querySelector(`[data-nav="${found.key}"]`);
      if(a) a.classList.add("active");
    }
  }

  function ensureShell(){
    if(!MQ.matches) return;

    const body = document.body;
    const mode = (body && body.getAttribute("data-doke-shell")) || "";
    // Allow explicit opt-out (keeps native header/nav)
    if (mode === "0" || mode === "off" || mode === "native") return;

    // Quick opt-out for debugging
    try{
      if (new URLSearchParams(location.search).has("noshell")) return;
    }catch(e){}

    const force = (mode === "1" || mode === "force");

    // Avoid double-binding on the same page (but still allow force re-init)
    if(!force){
      try{
        if(document.documentElement.dataset.dokeShellInit === "1") return;
        document.documentElement.dataset.dokeShellInit = "1";
      }catch(e){}
    }

    // IMPORTANT:
    // Many pages have a desktop header/nav that becomes hidden on small screens.
    // So we should not decide based only on "exists"; we ensure the shell exists.
    // This keeps header + bottom nav present on mobile/tablet.
    const existingShellHeader = document.querySelector(".doke-mobile-header");
    const existingShellBottom = document.querySelector(".doke-bottom-nav");
    const needHeader = force || !existingShellHeader;
    const needBottom = force || !existingShellBottom;
    // Always mark active on mobile/tablet. Even if shell is already present, we may need to bind handlers.
    document.body.classList.add("doke-shell-active");
    // Some pages don't have a <main>. Add safe bottom spacing so content doesn't hide behind bottom nav.
    if(!document.querySelector("main")) document.body.classList.add("doke-no-main");

    // Boxicons
    try{
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      const hasBoxicons = links.some(l => String(l.href||'').includes('boxicons'));
      if(!hasBoxicons){
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css';
        document.head.appendChild(link);
      }
    }catch(e){}

    const profile = getProfile();
    const isLogged = !!profile;
    const isPro = profile && (profile.isProfissional === true || profile.tipo === "profissional" || profile.role === "profissional");
    const nomePerfil = (profile && (profile.user || profile.nome || profile.name)) || "Minha conta";
    const linkAnunciar = isPro ? "anunciar.html" : "tornar-profissional.html";
    const labelAnunciar = isPro ? "Anunciar" : "Seja Profissional";
    const itemCarteira = isPro ? `<a href="carteira.html" class="dropdown-item"><i class='bx bx-wallet'></i> Carteira</a>` : "";
    const itemAlternar = isLogged ? `<a href="#" class="dropdown-item" data-action="alternar-conta"><i class='bx bx-user-pin'></i> Alternar Conta</a>` : "";
    const itemSair = isLogged
      ? `<a href="#" class="dropdown-item item-sair" data-action="logout"><i class='bx bx-log-out'></i> Sair</a>`
      : `<a href="login.html" class="dropdown-item"><i class='bx bx-log-in'></i> Entrar</a>`;

    // If the shell was already injected (e.g., navigating via history cache), reuse it.
    let header = existingShellHeader || null;
    let bottom = existingShellBottom || null;
    let backdrop = document.querySelector(".doke-drawer-backdrop") || null;
    let drawer = document.querySelector(".doke-drawer") || null;
    let overlay = document.querySelector(".doke-search-overlay") || null;

    if(needHeader){
      header = document.createElement("header");
      header.className = "doke-mobile-header";
      header.innerHTML = `
        <button class="doke-hamb" type="button" aria-label="Abrir menu">
          <i class='bx bx-menu'></i>
        </button>
        <div class="doke-logo"><img src="${LOGO_SRC}" alt="Doke" style="height:28px;width:auto;display:block;"></div>
        <div class="doke-h-actions">
          <a class="doke-icon-btn" href="${PAGES.notif}" aria-label="Notificações"><i class='bx bx-bell'></i><span class="doke-badge" style="display:none">0</span></a>
          <a class="doke-icon-btn" href="${PAGES.chat}" aria-label="Mensagens"><i class='bx bx-message-rounded-dots'></i><span class="doke-badge" style="display:none">0</span></a>
          <div class="profile-container doke-mobile-profile">
            <button class="doke-avatar-btn" type="button" aria-label="Perfil">
              <img class="doke-avatar profile-img-btn" alt="Perfil">
            </button>
            <div class="dropdown-profile doke-mobile-dropdown">
              <div style="padding: 10px 15px; border-bottom: 1px solid #eee; font-weight: bold; color: var(--cor2);">
                ${nomePerfil}
              </div>
              <a href="${PAGES.perfil}" class="dropdown-item"><i class='bx bx-user-circle'></i> Ver Perfil</a>
              ${itemCarteira}
              ${itemAlternar}
              <a href="${linkAnunciar}" class="dropdown-item"><i class='bx bx-plus-circle'></i> ${labelAnunciar}</a>
              ${itemSair}
            </div>
          </div>
        </div>
      `;
      document.body.prepend(header);

      // Drawer + backdrop (only create if missing)
      if(!backdrop){
        backdrop = document.createElement("div");
        backdrop.className = "doke-drawer-backdrop";
      }
      if(!drawer){
        drawer = document.createElement("aside");
        drawer.className = "doke-drawer";
      }
      drawer.innerHTML = `
        <div class="doke-drawer-top">
          <div class="doke-logo"><img src="${LOGO_SRC}" alt="Doke" style="height:28px;width:auto;display:block;"></div>
          <button class="doke-drawer-close" type="button" aria-label="Fechar menu"><i class='bx bx-x'></i></button>
        </div>
        <nav>
          <a href="${PAGES.home}"><i class='bx bx-home-alt'></i> Início</a>
          <a href="#" data-action="open-search"><i class='bx bx-search'></i> Pesquisar</a>
          <a href="${PAGES.negocios}"><i class='bx bx-store-alt'></i> Negócios</a>
          <a href="empresas.html"><i class='bx bx-buildings'></i> Empresas</a>
          <a href="${PAGES.comunidades}"><i class='bx bx-group'></i> Comunidades</a>
          <a href="${PAGES.notif}"><i class='bx bx-bell'></i> Notificações</a>
          <a href="${PAGES.chat}"><i class='bx bx-message-rounded-dots'></i> Mensagens</a>
          <a href="${PAGES.perfil}"><i class='bx bx-user'></i> Perfil</a>
          <a href="${PAGES.mais}"><i class='bx bx-dots-horizontal-rounded'></i> Mais</a>
        </nav>
      `;
      if(!document.body.contains(backdrop)) document.body.appendChild(backdrop);
      if(!document.body.contains(drawer)) document.body.appendChild(drawer);
    }

    if(needBottom){
      bottom = document.createElement("nav");
      bottom.className = "doke-bottom-nav";
      bottom.innerHTML = `
        <a href="${PAGES.home}" data-nav="home"><i class='bx bx-home-alt'></i><span>Início</span></a>
        <a href="#" data-nav="search"><i class='bx bx-search'></i><span>Pesquisar</span></a>
        <a href="${PAGES.comunidades}" data-nav="comunidades"><i class='bx bx-group'></i><span>Comunidades</span></a>
        <a href="${PAGES.negocios}" data-nav="negocios"><i class='bx bx-store-alt'></i><span>Negócios</span></a>
        <a href="${PAGES.perfil}" data-nav="perfil"><span><img class="doke-nav-avatar" alt="Perfil"></span><span>Perfil</span></a>
      `;
      document.body.appendChild(bottom);

      syncBottomNavHeight(bottom);
      requestAnimationFrame(()=>syncBottomNavHeight(bottom));
      setTimeout(()=>syncBottomNavHeight(bottom), 350);
      setTimeout(()=>syncBottomNavHeight(bottom), 1200);

      window.addEventListener("resize", ()=>{
        if(MQ.matches) {
          syncBottomNavHeight(bottom);
          requestAnimationFrame(()=>syncBottomNavHeight(bottom));
          setTimeout(()=>syncBottomNavHeight(bottom), 350);
          setTimeout(()=>syncBottomNavHeight(bottom), 1200);
        }
      });
    }

    // If the bottom nav already existed, still sync height & spacer once.
    if(bottom && !needBottom){
      syncBottomNavHeight(bottom);
      requestAnimationFrame(()=>syncBottomNavHeight(bottom));
      setTimeout(()=>syncBottomNavHeight(bottom), 350);
      setTimeout(()=>syncBottomNavHeight(bottom), 1200);
      if(!bottom.dataset.dokeResizeBound){
        bottom.dataset.dokeResizeBound = "1";
        window.addEventListener("resize", ()=>{
          if(MQ.matches) {
            syncBottomNavHeight(bottom);
            requestAnimationFrame(()=>syncBottomNavHeight(bottom));
            setTimeout(()=>syncBottomNavHeight(bottom), 350);
            setTimeout(()=>syncBottomNavHeight(bottom), 1200);
          }
        });
      }
    }

    // Search overlay (create once; reuse if already exists)
    if((header || bottom) && !overlay){
      overlay = document.createElement("div");
      overlay.className = "doke-search-overlay";
      overlay.innerHTML = `
        <div class="doke-search-sheet">
          <div class="doke-search-top">
            <button class="doke-search-back" type="button" aria-label="Voltar"><i class='bx bx-arrow-back'></i></button>
            <div class="doke-search-input-wrap">
              <i class='bx bx-search'></i>
              <input class="doke-search-input" type="search" placeholder="Buscar por nome ou serviço" />
            </div>
            <button class="doke-search-go" type="button">Buscar</button>
          </div>
          <div class="doke-chip-row" role="list">
            <button class="doke-chip active" type="button"><i class='bx bx-grid-alt'></i> Todos</button>
            <button class="doke-chip" type="button"><i class='bx bx-time'></i> Atendimento rápido</button>
            <button class="doke-chip" type="button"><i class='bx bx-map'></i> Perto</button>
            <button class="doke-chip" type="button"><i class='bx bx-star'></i> Super</button>
            <button class="doke-chip" type="button"><i class='bx bx-bolt-circle'></i> Recentes</button>
            <button class="doke-chip" type="button"><i class='bx bx-badge-check'></i> Verificados</button>
          </div>
          <div class="doke-recent">
            <h4>Buscas recentes</h4>
            <div class="doke-recent-list"></div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    function openDrawer(){ document.body.classList.add("doke-drawer-open"); }
    function closeDrawer(){ document.body.classList.remove("doke-drawer-open"); }
    function closeSearch(){ document.body.classList.remove("doke-search-open"); }

    function saveRecent(q){
      q = (q||"").trim();
      if(!q) return;
      let arr = [];
      try{ arr = JSON.parse(localStorage.getItem("doke_recent_searches")||"[]"); }catch(e){}
      arr = arr.filter(x => (x||"").toLowerCase() !== q.toLowerCase());
      arr.unshift(q);
      arr = arr.slice(0, 8);
      try{ localStorage.setItem("doke_recent_searches", JSON.stringify(arr)); }catch(e){}
    }

    function renderRecents(){
      if(!overlay) return;
      const list = overlay.querySelector(".doke-recent-list");
      if(!list) return;
      list.innerHTML = "";
      let arr = [];
      try{ arr = JSON.parse(localStorage.getItem("doke_recent_searches")||"[]"); }catch(e){}
      if(!arr.length){
        list.innerHTML = `<div style="color:#777; font-size:13px; padding: 6px 2px;">Nenhuma busca recente.</div>`;
        return;
      }
      for(const q of arr){
        const div = document.createElement("div");
        div.className = "doke-recent-item";
        div.innerHTML = `<i class='bx bx-time'></i><span>${q}</span>`;
        div.addEventListener("click", ()=>goSearch(q));
        list.appendChild(div);
      }
    }

    function goSearch(q){
      if(!overlay) return;
      q = (q || overlay.querySelector(".doke-search-input")?.value || "").trim();
      if(!q) return;
      saveRecent(q);
      location.href = `${PAGES.search}?q=${encodeURIComponent(q)}`;
    }

    function openSearch(){
      closeDrawer();
      if(!overlay) return;
      document.body.classList.add("doke-search-open");
      const inp = overlay.querySelector(".doke-search-input");
      setTimeout(()=>inp && inp.focus(), 60);
      renderRecents();
    }

    // Drawer binds
    if(header && drawer && backdrop){
      const hamb = header.querySelector(".doke-hamb");
      const closeBtn = drawer.querySelector(".doke-drawer-close");
      hamb && hamb.addEventListener("click", openDrawer);
      backdrop.addEventListener("click", closeDrawer);
      closeBtn && closeBtn.addEventListener("click", closeDrawer);

      drawer.querySelector('[data-action="open-search"]')?.addEventListener("click", (e)=>{ e.preventDefault(); openSearch(); });

      // Profile dropdown
      const profileContainer = header.querySelector(".profile-container");
      const profileBtn = header.querySelector(".doke-avatar-btn");
      const profileMenu = header.querySelector(".dropdown-profile");
      if(profileContainer && profileBtn && profileMenu){
        profileBtn.addEventListener("click", (e)=>{
          e.preventDefault(); e.stopPropagation();
          profileMenu.classList.toggle("show");
        });
        document.addEventListener("click", (e)=>{
          if (!profileContainer.contains(e.target)) profileMenu.classList.remove("show");
        });
      }

      // Dropdown actions
      header.addEventListener("click", (e)=>{
        const a = e.target.closest("[data-action]");
        if(!a) return;
        const act = a.getAttribute("data-action");
        if(!act) return;
        e.preventDefault();

        if(act === "alternar-conta"){
          if(typeof window.alternarConta === "function") return window.alternarConta();
          toast("Alternar conta ainda não está disponível nesta página.", "info");
        }
        if(act === "logout"){
          if(typeof window.fazerLogout === "function") return window.fazerLogout();
          try{
            ["usuarioLogado","usuario_logado","doke_usuario_perfil","perfil_usuario"].forEach(k=>localStorage.removeItem(k));
          }catch(e){}
          location.href = "login.html";
        }
      });
    }

    // Bottom nav search
    if(bottom && overlay){
      bottom.querySelector('[data-nav="search"]')?.addEventListener("click", (e)=>{ e.preventDefault(); openSearch(); });
      setActive(bottom);
    }

    // Overlay binds
    if(overlay){
      overlay.querySelector(".doke-search-back")?.addEventListener("click", closeSearch);
      overlay.querySelector(".doke-search-go")?.addEventListener("click", ()=>goSearch());
      overlay.querySelector(".doke-search-input")?.addEventListener("keydown", (e)=>{
        if(e.key === "Enter"){ e.preventDefault(); goSearch(); }
      });
      overlay.querySelectorAll(".doke-chip").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          overlay.querySelectorAll(".doke-chip").forEach(b=>b.classList.remove("active"));
          btn.classList.add("active");
        });
      });
    }

    // Avatar (aplica no que existir)
    const avatarUrl = getAvatarUrl(profile);
    if(header){
      const headerImg = header.querySelector(".doke-avatar");
      if(avatarUrl && headerImg){
        headerImg.src = avatarUrl;
      }else{
        const btn = header.querySelector(".doke-avatar-btn");
        if(btn) btn.innerHTML = "<i class='bx bx-user' style='font-size:22px; color: var(--doke-green); display:flex; align-items:center; justify-content:center; height:100%;'></i>";
      }
    }
    if(bottom){
      const navImg = bottom.querySelector(".doke-nav-avatar");
      if(avatarUrl && navImg){
        navImg.src = avatarUrl;
      }else{
        const perfilEl = bottom.querySelector('[data-nav="perfil"] span');
        if(perfilEl) perfilEl.innerHTML = "<i class='bx bx-user'></i>";
      }
    }

    // ESC fecha search/drawer
    document.addEventListener("keydown", (e)=>{
      if(e.key === "Escape"){ closeSearch(); closeDrawer(); }
    });
  }

  MQ.addEventListener?.("change", ()=>{ if(MQ.matches) ensureShell(); });
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", ensureShell);
  }else{
    ensureShell();
  }
})();