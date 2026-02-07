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

  function safeParse(json){
    try{ return JSON.parse(json); }catch(e){ return null; }
  }

  function getProfile(){
    // Project commonly stores profile in localStorage
    const keys = ["doke_usuario_perfil", "usuarioLogado", "usuario_logado", "perfil_usuario"];
    for(const k of keys){
      const v = localStorage.getItem(k);
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

  function ensureShell(){
    if(!MQ.matches) return;
    if(document.querySelector(".doke-mobile-header")) return;

    // Ensure Boxicons CSS exists (some pages missed it -> icons break on mobile)
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

    // Header
    const header = document.createElement("header");
    header.className = "doke-mobile-header";
    const profile = getProfile();
    const isLogged = !!profile;
    const isPro = profile && (profile.isProfissional === true || profile.tipo === "profissional" || profile.role === "profissional");
    const nomePerfil = (profile && (profile.user || profile.nome || profile.name)) || "Minha conta";
    const linkAnunciar = isPro ? "anunciar.html" : "tornar-profissional.html";
    const labelAnunciar = isPro ? "Anunciar" : "Seja Profissional";
    const itemCarteira = isPro ? `<a href="carteira.html" class="dropdown-item"><i class='bx bx-wallet'></i> Carteira</a>` : "";
    const itemAlternar = isLogged ? `<a href="#" onclick="alternarConta()" class="dropdown-item"><i class='bx bx-user-pin'></i> Alternar Conta</a>` : "";
    const itemSair = isLogged
      ? `<a href="#" onclick="fazerLogout()" class="dropdown-item item-sair"><i class='bx bx-log-out'></i> Sair</a>`
      : `<a href="login.html" class="dropdown-item"><i class='bx bx-log-in'></i> Entrar</a>`;

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

    // Bottom Nav (5 items)
    const bottom = document.createElement("nav");
    bottom.className = "doke-bottom-nav";
    bottom.innerHTML = `
      <a href="${PAGES.home}" data-nav="home"><i class='bx bx-home-alt'></i><span>Início</span></a>
      <a href="#" data-nav="search"><i class='bx bx-search'></i><span>Pesquisar</span></a>
      <a href="${PAGES.comunidades}" data-nav="comunidades"><i class='bx bx-group'></i><span>Comunidades</span></a>
      <a href="${PAGES.negocios}" data-nav="negocios"><i class='bx bx-store-alt'></i><span>Negócios</span></a>
      <a href="${PAGES.perfil}" data-nav="perfil"><span><img class="doke-nav-avatar" alt="Perfil"></span><span>Perfil</span></a>
    `;
    document.body.appendChild(bottom);
    // --- Sync real height + Spacer (evita rodapé atrás do bottom-nav) ---
    function ensureBottomSpacer(){
      let sp = document.querySelector(".doke-bottom-spacer");
      if(!sp){
        sp = document.createElement("div");
        sp.className = "doke-bottom-spacer";
        // Preferir colocar dentro do <footer> para manter a cor de fundo no final
        const host = document.querySelector("footer.main-footer") || document.querySelector(".main-footer") || document.body;
        host.appendChild(sp);
      }
    }
    function syncBottomNavHeight(){
      const nav = document.querySelector(".doke-bottom-nav");
      if(!nav) return;
      // mede a altura real (inclui safe-area via padding-bottom no CSS)
      const h = Math.ceil(nav.getBoundingClientRect().height || nav.offsetHeight || 84);
      document.documentElement.style.setProperty("--doke-btm-real", h + "px");
      ensureBottomSpacer();
    }

    syncBottomNavHeight();
    requestAnimationFrame(syncBottomNavHeight);
    setTimeout(syncBottomNavHeight, 350);
    setTimeout(syncBottomNavHeight, 1200);

    window.addEventListener('resize', ()=>{ if(MQ.matches) syncBottomNavHeight();
    requestAnimationFrame(syncBottomNavHeight);
    setTimeout(syncBottomNavHeight, 350);
    setTimeout(syncBottomNavHeight, 1200);
 });


    // Drawer
    const backdrop = document.createElement("div");
    backdrop.className = "doke-drawer-backdrop";
    const drawer = document.createElement("aside");
    drawer.className = "doke-drawer";
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
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    // Search Overlay (fullscreen)
    const overlay = document.createElement("div");
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

    // Behavior
    const hamb = header.querySelector(".doke-hamb");
    const closeBtn = drawer.querySelector(".doke-drawer-close");
    function openDrawer(){ document.body.classList.add("doke-drawer-open"); }
    function closeDrawer(){ document.body.classList.remove("doke-drawer-open"); }
    hamb.addEventListener("click", openDrawer);
    backdrop.addEventListener("click", closeDrawer);
    closeBtn.addEventListener("click", closeDrawer);

    function openSearch(){
      closeDrawer();
      document.body.classList.add("doke-search-open");
      const inp = overlay.querySelector(".doke-search-input");
      setTimeout(()=>inp && inp.focus(), 60);
      renderRecents();
    }
    function closeSearch(){ document.body.classList.remove("doke-search-open"); }

    bottom.querySelector('[data-nav="search"]').addEventListener("click", (e)=>{ e.preventDefault(); openSearch(); });
    drawer.querySelector('[data-action="open-search"]').addEventListener("click", (e)=>{ e.preventDefault(); openSearch(); });
    overlay.querySelector(".doke-search-back").addEventListener("click", closeSearch);

    function saveRecent(q){
      q = (q||"").trim();
      if(!q) return;
      let arr = [];
      try{ arr = JSON.parse(localStorage.getItem("doke_recent_searches")||"[]"); }catch(e){}
      arr = arr.filter(x => (x||"").toLowerCase() !== q.toLowerCase());
      arr.unshift(q);
      arr = arr.slice(0,8);
      localStorage.setItem("doke_recent_searches", JSON.stringify(arr));
    }
    function renderRecents(){
      let arr = [];
      try{ arr = JSON.parse(localStorage.getItem("doke_recent_searches")||"[]"); }catch(e){}
      const list = overlay.querySelector(".doke-recent-list");
      list.innerHTML = "";
      if(!arr.length){
        list.innerHTML = `<div class="doke-recent-item" style="opacity:.7"><i class='bx bx-info-circle'></i> Nenhuma busca recente.</div>`;
        return;
      }
      for(const q of arr){
        const div = document.createElement("div");
        div.className = "doke-recent-item";
        div.innerHTML = `<i class='bx bx-time-five'></i><div style="font-weight:700">${escapeHtml(q)}</div>`;
        div.addEventListener("click", ()=>{
          overlay.querySelector(".doke-search-input").value = q;
          goSearch(q);
        });
        list.appendChild(div);
      }
    }
    function goSearch(q){
      q = (q || overlay.querySelector(".doke-search-input").value || "").trim();
      if(!q){ return; }
      saveRecent(q);
      const url = `${PAGES.search}?q=${encodeURIComponent(q)}`;
      location.href = url;
    }
    overlay.querySelector(".doke-search-go").addEventListener("click", ()=>goSearch());
    overlay.querySelector(".doke-search-input").addEventListener("keydown", (e)=>{
      if(e.key === "Enter"){ e.preventDefault(); goSearch(); }
    });

    overlay.querySelectorAll(".doke-chip").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        overlay.querySelectorAll(".doke-chip").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // Avatar
    const avatarUrl = getAvatarUrl(profile);
    const headerImg = header.querySelector(".doke-avatar");
    const navImg = bottom.querySelector(".doke-nav-avatar");
    if(avatarUrl){
      headerImg.src = avatarUrl;
      navImg.src = avatarUrl;
    }else{
      // fallback
      headerImg.style.display="none";
      header.querySelector(".doke-avatar-btn").innerHTML = "<i class='bx bx-user' style='font-size:22px; color: var(--doke-green); display:flex; align-items:center; justify-content:center; height:100%;'></i>";
      navImg.style.display="none";
      bottom.querySelector('[data-nav="perfil"] span').innerHTML = "<i class='bx bx-user'></i>";
    }

    // Active state
    setActive(bottom);

    // Profile dropdown (mobile header)
    const profileContainer = header.querySelector(".profile-container");
    const profileBtn = header.querySelector(".doke-avatar-btn");
    const profileMenu = header.querySelector(".dropdown-profile");
    if(profileContainer && profileBtn && profileMenu){
      const toggleMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        profileMenu.classList.toggle("show");
      };
      profileBtn.addEventListener("click", toggleMenu);
      document.addEventListener("click", (e) => {
        if (!profileContainer.contains(e.target)) profileMenu.classList.remove("show");
      });
    }

    // Swipe to close drawer/search (basic)
    document.addEventListener("keydown", (e)=>{
      if(e.key === "Escape"){ closeSearch(); closeDrawer(); }
    });
  }

  function setActive(bottom){
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

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, s => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[s]));
  }

  MQ.addEventListener?.("change", ()=>{ if(MQ.matches) ensureShell(); });
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", ensureShell);
  }else{
    ensureShell();
  }
})();
