(function(){
  window.__DOKE_SHELL_BUILD__ = "20260218v47";
  try { console.log("[DOKE] shell build:", window.__DOKE_SHELL_BUILD__); } catch(_e) {}
  const MQ = window.matchMedia("(max-width:1024px)");
  const PAGES = {
    home: "index.html",
    search: "busca.html",
    comunidades: "comunidade.html",
    negocios: "negocios.html",
    perfil: "meuperfil.html",
    chat: "mensagens.html",
    pedidos: "pedidos.html",
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

  function consumeFlashNotice(){
    try{
      const raw = localStorage.getItem("doke_flash_notice");
      if(!raw) return;
      localStorage.removeItem("doke_flash_notice");
      const payload = safeParse(raw) || {};
      const msg = String(payload.message || "").trim();
      if(!msg) return;
      const type = String(payload.type || "info");
      const title = String(payload.title || "");
      if(typeof window.dokeToast === "function"){
        window.dokeToast(msg, { type, title });
      }else if(typeof window.mostrarToast === "function"){
        window.mostrarToast(msg, type, title);
      }else{
        toast(msg, type);
      }
    }catch(e){}
  }

  function safeParse(json){
    try{ return JSON.parse(json); }catch(e){ return null; }
  }

  function escapeHtml(value){
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

    function sanitizePlainText(value){
    return String(value ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const AUTH_CACHE_KEYS = [
    "doke_usuario_perfil",
    "usuarioLogado",
    "usuario_logado",
    "perfil_usuario",
    "doke_usuario_logado",
    "userLogado",
    "doke_uid",
    "doke_auth_session_backup",
    "doke_next_account"
  ];
  const DOKE_SAVED_ACCOUNTS_KEY = "doke_saved_accounts";
  const DOKE_SAVED_ACCOUNTS_LIMIT = 6;
  const DOKE_DEV_SESSION_COOKIE = "doke_dev_session";

  function clearCookieEverywhere(name){
    const cookieName = String(name || "").trim();
    if(!cookieName) return;
    const past = "Thu, 01 Jan 1970 00:00:00 GMT";
    const paths = ["/", "/frontend"];
    const domains = ["", `domain=${location.hostname}`, "domain=localhost", "domain=127.0.0.1"];
    for(const p of paths){
      for(const d of domains){
        try{
          const domainPart = d ? `; ${d}` : "";
          document.cookie = `${cookieName}=; expires=${past}; path=${p}; samesite=lax${domainPart}`;
        }catch(_e){}
      }
    }
  }

  function clearAuthCache(){
    for(const k of AUTH_CACHE_KEYS){
      try{ localStorage.removeItem(k); }catch(e){}
    }
    try{
      const keys = Object.keys(localStorage).filter((k) => /^sb-[a-z0-9-]+-auth-token$/i.test(k));
      keys.forEach((k) => {
        try { localStorage.removeItem(k); } catch (_e) {}
      });
    }catch(e){}
    try{
      for(const k of AUTH_CACHE_KEYS){
        sessionStorage.removeItem(k);
      }
    }catch(e){}
    try{ clearCookieEverywhere(DOKE_DEV_SESSION_COOKIE); }catch(_e){}
  }

  function getProfile(){
    for(const k of AUTH_CACHE_KEYS){
      let v = null;
      try{ v = localStorage.getItem(k); }catch(e){}
      if(!v) continue;
      const obj = safeParse(v);
      if(obj && typeof obj === "object") return obj;
    }
    return null;
  }

  function hasLocalLoginFlag(){
    try{
      if(localStorage.getItem("usuarioLogado") === "true") return true;
      if(localStorage.getItem("doke_logged_in") === "1") return true;
    }catch(e){}
    return false;
  }

  function setShellAuthStateReady(isReady){
    try{
      const body = document.body;
      if(!body) return;
      body.classList.toggle("doke-auth-pending", !isReady);
      body.classList.toggle("doke-auth-ready", !!isReady);
    }catch(_e){}
  }

  async function getSessionUser(){
    try{
      const sb = window.sb || window.supabaseClient || window.sbClient || window.supabase;
      if(sb?.auth?.getUser){
        const { data, error } = await sb.auth.getSession();
        if ((error || !data?.session?.user) && typeof window.dokeRestoreSupabaseSessionFromStorage === "function") {
          try { await window.dokeRestoreSupabaseSessionFromStorage({ force: true }); } catch (_e) {}
        }
        const retry = await sb.auth.getSession().catch(() => ({ data: { session: null }, error: null }));
        if(!retry?.error && retry?.data?.session?.user) return retry.data.session && retry.data.session.user;
        if(!error && data?.session?.user) return data.session && data.session.user;
      }
    }catch(e){}
    try{
      if (typeof window.dokeResolveAuthUser === "function") {
        const user = await window.dokeResolveAuthUser();
        if (user?.uid || user?.id) return { id: user.uid || user.id, email: user.email || "", user_metadata: user.user_metadata || {} };
      }
    }catch(e){}
    try{
      const fb = window.auth?.currentUser;
      if(fb?.uid) return { id: fb.uid, email: fb.email || "" };
    }catch(e){}
    return null;
  }

    function hydrateProfileFromSession(sessionUser, currentProfile){
    const p = (currentProfile && typeof currentProfile === "object") ? { ...currentProfile } : {};
    const uid = String(sessionUser?.id || sessionUser?.uid || "").trim();
    const email = String(sessionUser?.email || "").trim();
    const meta = sessionUser?.user_metadata || {};
    const nomeMeta = sanitizePlainText(meta.nome || meta.full_name || "");
    const userMeta = sanitizePlainText(meta.user || meta.username || "");
    const fotoMeta = String(meta.foto || meta.avatar_url || sessionUser?.photoURL || "").trim();
    const nomeFallback = email && email.includes("@") ? email.split("@")[0] : "Usuario";

    if (uid) {
      if (!p.uid) p.uid = uid;
      if (!p.id) p.id = uid;
    }
    if (!p.email && email) p.email = email;
    if (!p.nome && nomeMeta) p.nome = nomeMeta;
    if (!p.nome && nomeFallback) p.nome = nomeFallback;
    if (!p.user && userMeta) p.user = userMeta;
    if (!p.user && p.nome) p.user = p.nome;
    if (!p.foto && fotoMeta) p.foto = fotoMeta;

    try {
      localStorage.setItem("doke_usuario_perfil", JSON.stringify(p));
      localStorage.setItem("usuarioLogado", "true");
      if (uid) localStorage.setItem("doke_uid", uid);
    } catch (_e) {}
    try {
      rememberSavedAccount({
        uid: uid || p.uid || p.id || "",
        email: p.email || email || "",
        nome: p.nome || "",
        user: p.user || p.nome || "",
        foto: p.foto || ""
      });
    } catch (_e) {}
    return p;
  }

  async function signOutEverywhereFallback(){
    const call = async (fn, args = []) => {
      if (typeof fn !== "function") return;
      try { await fn(...args); } catch (_e) {}
    };
    const sbAuth = window.sb?.auth || window.supabaseClient?.auth || null;
    const prevForce = window.DOKE_FORCE_SIGNOUT === true;
    window.DOKE_FORCE_SIGNOUT = true;
    try { if (typeof window.dokeAllowSignOut === "function") window.dokeAllowSignOut(15000); } catch (_e) {}
    try {
      await call(sbAuth?.signOut?.bind(sbAuth), [{ scope: "local" }]);
      await call(window.auth?.signOut?.bind(window.auth));
      if (typeof window.signOut === "function") {
        await call(window.signOut, [window.auth || {}]);
      }
    } finally {
      window.DOKE_FORCE_SIGNOUT = prevForce;
    }
  }
  function readSavedAccounts(){
    try {
      const raw = localStorage.getItem(DOKE_SAVED_ACCOUNTS_KEY) || "[]";
      const parsed = safeParse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  }

  function writeSavedAccounts(list){
    const safe = Array.isArray(list) ? list : [];
    try { localStorage.setItem(DOKE_SAVED_ACCOUNTS_KEY, JSON.stringify(safe.slice(0, DOKE_SAVED_ACCOUNTS_LIMIT))); } catch (_e) {}
  }

  function normalizeSavedAccount(input){
    const source = (input && typeof input === "object") ? input : {};
    const uid = String(source.uid || source.id || source.user_uid || source.userId || "").trim();
    const email = String(source.email || "").trim().toLowerCase();
    if(!uid && !email) return null;
    const nomeBase = sanitizePlainText(source.nome || source.user || source.name || (email ? email.split("@")[0] : "Conta") || "Conta");
    const userBase = sanitizePlainText(source.user || source.nome || source.name || nomeBase || "Conta");
    const foto = String(source.foto || source.avatar || source.avatar_url || source.photoURL || source.foto_url || source.fotoPerfil || "").trim();
    return {
      uid: uid || null,
      email: email || null,
      nome: nomeBase || "Conta",
      user: userBase || nomeBase || "Conta",
      foto: foto || null,
      isProfissional: source.isProfissional === true || source.tipo === "profissional" || source.role === "profissional",
      lastUsedAt: new Date().toISOString()
    };
  }

  function rememberSavedAccount(input){
    const normalized = normalizeSavedAccount(input);
    if(!normalized) return null;
    const saved = readSavedAccounts();
    const idx = saved.findIndex((acc) => {
      const uidMatch = normalized.uid && String(acc?.uid || "") === normalized.uid;
      const emailMatch = normalized.email && String(acc?.email || "").toLowerCase() === normalized.email;
      return uidMatch || emailMatch;
    });
    if(idx >= 0){
      saved[idx] = { ...saved[idx], ...normalized, lastUsedAt: normalized.lastUsedAt };
    }else{
      saved.push(normalized);
    }
    saved.sort((a,b) => String(b?.lastUsedAt || "").localeCompare(String(a?.lastUsedAt || "")));
    writeSavedAccounts(saved);
    return normalized;
  }

  function getCurrentSavedAccount(){
    try {
      const profile = getProfile() || {};
      const uid = String(profile.uid || profile.id || localStorage.getItem("doke_uid") || "").trim();
      const email = String(profile.email || "").trim().toLowerCase();
      if(!uid && !email) return null;
      return { uid: uid || null, email: email || null };
    } catch (_e) {
      return null;
    }
  }

  function ensureFallbackDropdownBehavior(){
    if (typeof window.toggleDropdown !== "function") {
      window.toggleDropdown = function(event){
        if (event) event.stopPropagation();
        const target = event?.currentTarget || event?.target;
        const container = target?.closest ? target.closest(".profile-container") : null;
        const drop = container ? container.querySelector(".dropdown-profile") : document.getElementById("dropdownPerfil");
        if(!drop) return;
        const willOpen = !drop.classList.contains("show");
        document.querySelectorAll(".dropdown-profile.show").forEach((el) => el.classList.remove("show"));
        if (willOpen) drop.classList.add("show");
      };
    }
    if (window.__dokeShellDropdownFallbackBound) return;
    window.__dokeShellDropdownFallbackBound = true;
    document.addEventListener("click", (ev) => {
      if (ev.target && ev.target.closest && ev.target.closest(".profile-container")) return;
      document.querySelectorAll(".dropdown-profile.show").forEach((el) => el.classList.remove("show"));
    });
  }

  function buildSwitchLoginUrl(account){
    const params = new URLSearchParams();
    const email = String(account?.email || "").trim();
    const uid = String(account?.uid || "").trim();
    if(email) params.set("email", email);
    if(uid) params.set("uid", uid);
    params.set("switch", "1");
    return `login.html?${params.toString()}`;
  }

  async function performShellSignOut(targetHref){
    await signOutEverywhereFallback();
    clearAuthCache();
    location.href = String(targetHref || "login.html");
    return true;
  }

  function openSwitchAccountModalFallback(saved){
    let modal = document.getElementById("dokeSwitchModal");
    if(modal) modal.remove();
    const current = getCurrentSavedAccount();
    modal = document.createElement("div");
    modal.id = "dokeSwitchModal";
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.background = "rgba(0,0,0,.45)";
    modal.style.zIndex = "999999";
    modal.style.padding = "18px";
    modal.innerHTML = `
      <div style="max-width:560px; margin:5vh auto; background:#fff; border-radius:18px; padding:18px; box-shadow:0 20px 50px rgba(0,0,0,.25);">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="font-size:1.2rem; font-weight:900; color:#0d2a29;">Alternar conta</div>
          <button id="dokeSwitchClose" type="button" style="width:40px;height:40px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:#fff;cursor:pointer;font-size:20px;line-height:1;">&times;</button>
        </div>
        <div style="margin-top:8px; color:rgba(0,0,0,.65);">Escolha uma conta salva</div>
        <div id="dokeSwitchList" style="margin-top:14px; display:flex; flex-direction:column; gap:10px; max-height:min(56vh,430px); overflow:auto;"></div>
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px; flex-wrap:wrap;">
          <button id="dokeSwitchOther" type="button" class="btn-pro-action" style="background:#fff;color:#0b7768;border:1px solid rgba(0,0,0,.12);">Outra conta</button>
          <button id="dokeSwitchLogout" type="button" class="btn-pro-action">Sair</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const list = modal.querySelector("#dokeSwitchList");
    (saved || []).slice(0, DOKE_SAVED_ACCOUNTS_LIMIT).forEach((raw) => {
      const account = normalizeSavedAccount(raw);
      if(!account) return;
      const foto = account.foto || `https://i.pravatar.cc/80?u=${encodeURIComponent(String(account.uid || account.email || "u"))}`;
      const nome = account.user || account.nome || account.email || "Conta";
      const email = account.email || "";
      const isCurrent = !!current && ((current.uid && account.uid && current.uid === account.uid) || (current.email && account.email && current.email === account.email));
      const row = document.createElement("button");
      row.type = "button";
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "12px";
      row.style.padding = "12px";
      row.style.border = isCurrent ? "2px solid rgba(11,119,104,.45)" : "1px solid rgba(0,0,0,.12)";
      row.style.borderRadius = "14px";
      row.style.background = "#fff";
      row.style.cursor = "pointer";
      row.innerHTML = `
        <img src="${foto}" alt="" style="width:46px;height:46px;border-radius:50%;object-fit:cover;border:2px solid rgba(0,0,0,.10);" />
        <div style="text-align:left; min-width:0; flex:1;">
          <div style="font-weight:900; color:#102a28; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(nome)}</div>
          <div style="color:rgba(0,0,0,.6); font-size:.92rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(email || "Sem e-mail salvo")}</div>
        </div>
        ${isCurrent ? '<span style="font-size:.76rem;font-weight:900;color:#0b7768;background:rgba(11,119,104,.12);padding:4px 8px;border-radius:999px;">Atual</span>' : ''}
      `;
      row.addEventListener("click", async () => {
        await performShellSignOut(buildSwitchLoginUrl(account));
      });
      list.appendChild(row);
    });

    const close = () => { try { modal.remove(); } catch(_e){} };
    modal.querySelector("#dokeSwitchClose")?.addEventListener("click", close);
    modal.addEventListener("click", (ev) => { if(ev.target === modal) close(); });
    modal.querySelector("#dokeSwitchOther")?.addEventListener("click", async () => {
      await performShellSignOut("login.html?switch=1");
    });
    modal.querySelector("#dokeSwitchLogout")?.addEventListener("click", async () => {
      await performShellSignOut("login.html?logout=1");
    });
  }

  function ensureGlobalAuthActions(){
    ensureFallbackDropdownBehavior();
    if (typeof window.fazerLogout !== "function") {
      window.fazerLogout = async function(){
        let confirmed = false;
        try {
          confirmed = (typeof window.dokeConfirm === "function")
            ? await window.dokeConfirm("Tem certeza que deseja sair?", "Sair")
            : window.confirm("Tem certeza que deseja sair?");
        } catch (_e) {
          confirmed = window.confirm("Tem certeza que deseja sair?");
        }
        if(!confirmed) return false;
        await performShellSignOut("login.html?logout=1");
        return true;
      };
    }

    if (typeof window.alternarConta !== "function") {
      window.alternarConta = async function(){
        const saved = readSavedAccounts();
        if(!saved.length){
          await performShellSignOut("login.html?switch=1");
          return false;
        }
        openSwitchAccountModalFallback(saved);
        return true;
      };
    }
    try {
      window.__dokeShellFallbackLogout = window.fazerLogout;
      window.__dokeShellFallbackSwitch = window.alternarConta;
      window.__dokeAuthActions = {
        fazerLogout: window.fazerLogout,
        alternarConta: window.alternarConta
      };
    } catch (_e) {}
  }

  function syncClassicDesktopHeader(opts){
    const isLogged = !!opts?.isLogged;
    const profile = (opts?.profile && typeof opts.profile === "object") ? opts.profile : {};
    const avatarUrl = String(opts?.avatarUrl || "").trim();
    const isPro = !!opts?.isPro;
    const nomePerfil = sanitizePlainText(profile.user || profile.nome || profile.name || "Minha conta");
    const nomePerfilSafe = escapeHtml(nomePerfil || "Minha conta");
    const profileHref = isPro ? "meuperfil.html" : "perfil-usuario.html";
    const linkAnunciar = isPro ? "anunciar.html" : "tornar-profissional.html";
    const itemCarteira = isPro ? `<a href="carteira.html" class="dropdown-item"><i class='bx bx-wallet'></i> Carteira</a>` : "";
    const buildProfileDropdown = (photo) => `
      <div class="profile-container">
        <img src="${photo}" class="profile-img-btn" onclick="toggleDropdown(event)" alt="Perfil" style="width:40px;height:40px;border-radius:50%;object-fit:cover;cursor:pointer;border:2px solid #ddd;">
        <div id="dropdownPerfil" class="dropdown-profile">
          <div style="padding: 10px 15px; border-bottom: 1px solid #eee; font-weight: bold; color: var(--cor2);">${nomePerfilSafe}</div>
          <a href="${profileHref}" class="dropdown-item"><i class='bx bx-user-circle'></i> Ver Perfil</a>
          ${itemCarteira}
          <a href="#" onclick="alternarConta()" class="dropdown-item"><i class='bx bx-user-pin'></i> Alternar Conta</a>
          <a href="${linkAnunciar}" class="dropdown-item"><i class='bx bx-plus-circle'></i> Anunciar</a>
          <a href="#" onclick="fazerLogout()" class="dropdown-item item-sair"><i class='bx bx-log-out'></i> Sair</a>
        </div>
      </div>`;

    const containers = Array.from(document.querySelectorAll(".botoes-direita"))
      .filter((el) => !el.closest(".doke-mobile-header"));

    containers.forEach((container) => {
      if(!isLogged){
        container.innerHTML = `<a href="login.html" class="entrar">Entrar</a>`;
        return;
      }

      const photo = avatarUrl || "https://i.pravatar.cc/150?img=12";
      container.innerHTML = buildProfileDropdown(photo);
    });

    const topAuthNodes = Array.from(document.querySelectorAll("#btnAuthTopo"));
    topAuthNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (!isLogged) {
        node.setAttribute("href", "login.html");
        node.innerHTML = `<button class="btn-login" onclick="realizarLogin()">Fazer login</button>`;
        return;
      }
      const photo = avatarUrl || "https://i.pravatar.cc/150?img=12";
      node.removeAttribute("href");
      node.setAttribute("role", "button");
      node.setAttribute("aria-label", "Abrir menu de perfil");
      node.innerHTML = buildProfileDropdown(photo);
    });
  }function getAvatarUrl(profile){
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

  function isVisibleModalLayer(el){
    if(!el || !el.isConnected || el.hidden) return false;
    if(el.getAttribute("aria-hidden") === "true") return false;
    let st = null;
    try{ st = getComputedStyle(el); }catch(_){}
    if(!st) return true;
    if(st.display === "none" || st.visibility === "hidden") return false;
    if(Number(st.opacity || "1") <= 0) return false;
    if(!el.getClientRects || !el.getClientRects().length){
      if((el.offsetWidth || 0) <= 0 && (el.offsetHeight || 0) <= 0) return false;
    }
    return true;
  }

  function hasOpenModalLayer(){
    const selectors = [
      ".doke-overlay.active",
      ".modal-overlay-custom",
      ".modal-detalhes",
      ".modal-disputa",
      ".dp-xmodal.open",
      ".custom-alert-overlay.active",
      ".swal2-container",
      "[data-modal-open='1']"
    ];
    for(const sel of selectors){
      const nodes = Array.from(document.querySelectorAll(sel));
      if(nodes.some(isVisibleModalLayer)) return true;
    }
    return false;
  }

  function syncShellModalLayerClass(){
    if(!MQ.matches){
      document.body.classList.remove("doke-modal-open");
      return;
    }
    document.body.classList.toggle("doke-modal-open", hasOpenModalLayer());
  }

  function initShellModalLayerObserver(){
    if(window.__dokeShellModalObserverBound) return;
    window.__dokeShellModalObserverBound = true;
    let raf = null;
    const queueSync = () => {
      if(raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        syncShellModalLayerClass();
      });
    };
    const obs = new MutationObserver(queueSync);
    try{
      obs.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class","style","hidden","aria-hidden","open","data-modal-open"]
      });
    }catch(_){}
    window.addEventListener("resize", queueSync, { passive: true });
    document.addEventListener("click", queueSync, true);
    setTimeout(queueSync, 0);
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

  async function ensureShell(){
    setShellAuthStateReady(false);
    let embedChatMode = false;
    try{
      const params = new URLSearchParams(location.search || "");
      const byParam =
        params.get("embed") === "1" ||
        params.get("embed") === "true" ||
        params.get("from") === "pedidos" ||
        params.get("origin") === "pedido";
      const byDom =
        document.documentElement.classList.contains("embed-chat-mode") ||
        document.body?.classList?.contains("embed-chat-mode") ||
        document.body?.getAttribute("data-embed-chat") === "1";
      embedChatMode = byParam || byDom || window.__DOKE_DISABLE_SHELL__ === true;
    }catch(_e){}
    if(embedChatMode){
      try{
        document.body?.classList?.remove("doke-shell-active","doke-no-main","doke-drawer-open","doke-search-open","doke-menu-open");
      }catch(_e){}
      setShellAuthStateReady(true);
      return;
    }
    const body = document.body;
    const mode = (body && body.getAttribute("data-doke-shell")) || "";
    const force = (mode === "1" || mode === "force");

    let profile = getProfile();
    const hasLocalAuth = !!profile || hasLocalLoginFlag();
    let sessionUser = null;
    if(profile && (profile.uid || profile.id || profile.email)){
      sessionUser = { id: profile.uid || profile.id || profile.email || "cached_user" };
    }
    if(!sessionUser){
      sessionUser = await getSessionUser();
      if(sessionUser && !profile) profile = getProfile();
    }
    if (sessionUser) {
      profile = hydrateProfileFromSession(sessionUser, profile);
    }

    const isLogged = !!sessionUser || hasLocalAuth;
    const isPro = profile && (profile.isProfissional === true || profile.tipo === "profissional" || profile.role === "profissional");
    const nomePerfil = sanitizePlainText((profile && (profile.user || profile.nome || profile.name)) || (isLogged ? "Minha conta" : "Visitante"));
    const nomePerfilSafe = escapeHtml(nomePerfil);
    const profileHref = isLogged ? PAGES.perfil : "login.html";
    const linkAnunciar = isPro ? "anunciar.html" : "tornar-profissional.html";
    const labelAnunciar = "Anunciar";
    const itemCarteira = isPro ? `<a href="carteira.html" class="dropdown-item"><i class='bx bx-wallet'></i> Carteira</a>` : "";
    const itemAlternar = isLogged ? `<a href="#" class="dropdown-item" data-action="alternar-conta"><i class='bx bx-user-pin'></i> Alternar Conta</a>` : "";
    const itemSair = `<a href="#" class="dropdown-item item-sair" data-action="logout"><i class='bx bx-log-out'></i> Sair</a>`;
    const profileItemHTML = `<a href="${profileHref}" class="dropdown-item"><i class='bx bx-user-circle'></i> Ver Perfil</a>`;
    const guestItemHTML = `<a href="login.html" class="dropdown-item"><i class='bx bx-log-in'></i> Entrar</a>`;
    const dropdownItemsHTML = isLogged
      ? `${profileItemHTML}${itemCarteira}${itemAlternar}<a href="${linkAnunciar}" class="dropdown-item"><i class='bx bx-plus-circle'></i> ${labelAnunciar}</a>${itemSair}`
      : guestItemHTML;

    const avatarUrl = isLogged ? getAvatarUrl(profile) : null;
    const authUid = String(
      profile?.uid ||
      profile?.id ||
      sessionUser?.id ||
      localStorage.getItem("doke_uid") ||
      ""
    ).trim();
    const currentFile = String(location.pathname.split("/").pop() || "").toLowerCase();
    const shouldBindBadges = !["login.html", "cadastro.html", "senha.html"].includes(currentFile);
    if (authUid) {
      try {
        const raw = localStorage.getItem(`doke_badges_cache_${authUid}`);
        const cached = raw ? safeParse(raw) : null;
        const notif = Math.max(0, Number(cached?.notif || 0) || 0);
        const chat = Math.max(0, Number(cached?.chat || 0) || 0);
        if (notif > 0 || chat > 0) {
          const prev = window.__dokeBadgeTotals || {};
          window.__dokeBadgeTotals = {
            notif: Math.max(0, Number(prev.notif || 0) || 0, notif),
            chat: Math.max(0, Number(prev.chat || 0) || 0, chat)
          };
          try {
            window.dispatchEvent(new CustomEvent("doke:badges", { detail: window.__dokeBadgeTotals }));
          } catch (_e) {}
        }
      } catch (_e) {}
      if (shouldBindBadges) {
        try {
          if (typeof window.monitorarNotificacoesGlobal === "function") {
            window.monitorarNotificacoesGlobal(authUid);
          }
        } catch (_e) {}
      }
    }
    if (isLogged) {
      try {
        rememberSavedAccount({
          uid: profile?.uid || profile?.id || sessionUser?.id || "",
          email: profile?.email || sessionUser?.email || "",
          nome: profile?.nome || "",
          user: profile?.user || profile?.nome || "",
          foto: profile?.foto || avatarUrl || "",
          isProfissional: isPro
        });
      } catch (_e) {}
    }

    ensureGlobalAuthActions();
    syncClassicDesktopHeader({ isLogged, profile, avatarUrl, isPro });
    setShellAuthStateReady(true);

    if(!MQ.matches) return;

    // Allow explicit opt-out (keeps native header/nav)
    if (mode === "0" || mode === "off" || mode === "native") return;

    // Quick opt-out for debugging
    try{
      if (new URLSearchParams(location.search).has("noshell")) return;
    }catch(e){}

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
          <a class="doke-icon-btn doke-pedidos-btn" href="${PAGES.pedidos}" aria-label="Pedidos"><i class='bx bx-package'></i></a>
          <a class="doke-icon-btn" href="${PAGES.chat}" aria-label="Mensagens"><i class='bx bx-message-rounded-dots'></i><span class="doke-badge" style="display:none">0</span></a>
          <div class="profile-container doke-mobile-profile">
            <button class="doke-avatar-btn" type="button" aria-label="Perfil">
              <img class="doke-avatar profile-img-btn" alt="Perfil">
            </button>
            <div class="dropdown-profile doke-mobile-dropdown">
              <div style="padding: 10px 15px; border-bottom: 1px solid #eee; font-weight: bold; color: var(--cor2);">
                ${nomePerfilSafe}
              </div>
              ${dropdownItemsHTML}
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
          <a href="${PAGES.pedidos}"><i class='bx bx-package'></i> Pedidos</a>
          <a href="${profileHref}"><i class='bx bx-user'></i> Perfil</a>
          <a href="${PAGES.mais}"><i class='bx bx-dots-horizontal-rounded'></i> Mais</a>
        </nav>
      `;
      if(!document.body.contains(backdrop)) document.body.appendChild(backdrop);
      if(!document.body.contains(drawer)) document.body.appendChild(drawer);
    }

    // Se o shell já existir (navegação com cache), atualiza conteúdo do dropdown.
    if (header) {
      const profileMenu = header.querySelector(".doke-mobile-dropdown");
      if (profileMenu) {
        profileMenu.innerHTML = `
          <div style="padding: 10px 15px; border-bottom: 1px solid #eee; font-weight: bold; color: var(--cor2);">
            ${nomePerfilSafe}
          </div>
          ${dropdownItemsHTML}
        `;
      }
    }

    if(needBottom){
      bottom = document.createElement("nav");
      bottom.className = "doke-bottom-nav";
      bottom.innerHTML = `
        <a href="${PAGES.home}" data-nav="home"><i class='bx bx-home-alt'></i><span>Início</span></a>
        <a href="#" data-nav="search"><i class='bx bx-search'></i><span>Pesquisar</span></a>
        <a href="${PAGES.comunidades}" data-nav="comunidades"><i class='bx bx-group'></i><span>Comunidades</span></a>
        <a href="${PAGES.negocios}" data-nav="negocios"><i class='bx bx-store-alt'></i><span>Negócios</span></a>
        <a href="${profileHref}" data-nav="perfil"><span class="doke-nav-avatar-wrap"><img class="doke-nav-avatar" alt="Perfil"></span><span>Perfil</span></a>
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

    // Ativa o shell somente depois de garantir a estrutura.
    document.body.classList.add("doke-shell-active");
    if(!document.querySelector("main")) document.body.classList.add("doke-no-main");

    // Search overlay (create once; reuse if already exists)
    if((header || bottom) && !overlay){
      overlay = document.createElement("div");
      overlay.className = "doke-search-overlay";
      overlay.innerHTML = `
        <div class="doke-search-sheet">
          <div class="doke-search-top">
            <button class="doke-search-back" type="button" aria-label="Voltar"><i class='bx bx-arrow-back'></i></button>
            <div class="doke-search-input-wrap">
              <label class="sr-only" for="dokeShellSearchInput">Buscar no Doke</label>
              <i class='bx bx-search'></i>
              <input class="doke-search-input" id="dokeShellSearchInput" name="dokeShellSearchInput" type="search" placeholder="Buscar por nome ou serviço" />
            </div>
            <button class="doke-search-go" type="button" aria-label="Buscar">
              <i class='bx bx-search-alt-2'></i>
              <span>Buscar</span>
            </button>
          </div>
          <div class="doke-chip-row" role="list">
            <button class="doke-chip active" type="button" data-search-target="users"><i class='bx bx-user'></i> Usuários</button>
            <button class="doke-chip" type="button" data-search-target="ads"><i class='bx bx-badge-check'></i> Anúncios</button>
          </div>
          <div class="doke-recent">
            <h4>Buscas recentes</h4>
            <div class="doke-recent-list"></div>
          </div>
          <div class="doke-search-results" hidden></div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    function openDrawer(){ document.body.classList.add("doke-drawer-open"); }
    function closeDrawer(){
      document.body.classList.remove("doke-drawer-open");
      try { normalizeShellScrollLocks(); } catch(_e) {}
    }
    function closeSearch(){
      document.body.classList.remove("doke-search-open");
      if(!overlay) return;
      const inp = overlay.querySelector(".doke-search-input");
      const results = overlay.querySelector(".doke-search-results");
      const recent = overlay.querySelector(".doke-recent");
      searchTarget = "users";
      overlay.querySelectorAll(".doke-chip").forEach((b)=> b.classList.remove("active"));
      overlay.querySelector('.doke-chip[data-search-target="users"]')?.classList.add("active");
      if(inp) inp.value = "";
      if(results){
        results.hidden = true;
        results.innerHTML = "";
      }
      if(recent) recent.style.display = "";
      try { normalizeShellScrollLocks(); } catch(_e) {}
    }
    function normalizeShellScrollLocks(){
      try{
        const drawerOpen = document.body.classList.contains("doke-drawer-open");
        const searchOpen = document.body.classList.contains("doke-search-open");
        if (!drawerOpen && !searchOpen) {
          document.body.classList.remove("doke-menu-open");
          document.body.classList.remove("no-scroll");
        }
      }catch(_e){}
    }

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

    async function searchUsers(term){
      const sb = window.sb || window.supabaseClient || window.sbClient || window.supabase
        || (typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null);
      if(!sb?.from) return [];
      const t = String(term || "").trim();
      if(t.length < 2) return [];
      const safe = t.replace(/[%_]/g, "\$&");
      try{
        const { data, error } = await sb
          .from("usuarios_legacy")
          .select("id, uid, user, nome, foto, isProfissional, categoria_profissional")
          .or(`user.ilike.%${safe}%,nome.ilike.%${safe}%`)
          .limit(8);
        if(error) return [];
        return Array.isArray(data) ? data : [];
      }catch(_){
        return [];
      }
    }

    function shufflePick(list, limit){
      const arr = Array.isArray(list) ? list.slice() : [];
      for(let i = arr.length - 1; i > 0; i -= 1){
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr.slice(0, Math.max(0, Number(limit) || 0));
    }

    function isTruthyActive(v){
      if(v === undefined || v === null) return true;
      if(v === true || v === 1) return true;
      const t = String(v).trim().toLowerCase();
      return !(t === "false" || t === "0" || t === "inativo" || t === "inactive");
    }

    function getAdPriceLabel(a){
      const raw = a?.preco ?? a?.["preço"] ?? a?.valor ?? a?.price ?? "";
      const txt = String(raw || "").trim();
      return txt || "A combinar";
    }

    function getAdImage(a){
      const fotos = Array.isArray(a?.fotos) ? a.fotos : (a?.fotos ? [a.fotos] : []);
      return String(fotos[0] || a?.img || a?.foto || "").trim();
    }

    function buildUserResultHtml(list){
      if(!Array.isArray(list) || !list.length){
        return `<div class="doke-search-empty"><i class='bx bx-user-x'></i><span>Nenhum usuário encontrado.</span></div>`;
      }
      return list.map((u) => {
        const uid = String(u.uid || u.id || "").trim();
        const nome = String(u.nome || "").trim();
        const handleBase = String(u.user || (nome ? nome.split(" ")[0] : "usuario")).trim();
        const handle = handleBase.startsWith("@") ? handleBase : `@${handleBase}`;
        const foto = String(u.foto || `https://i.pravatar.cc/88?u=${encodeURIComponent(uid || handle)}`);
        const isProf = u.isProfissional === true;
        const subtitulo = isProf
          ? String(u.categoria_profissional || "Profissional")
          : (nome || "Usuário");
        const perfil = isProf ? "perfil-profissional.html" : "perfil-usuario.html";
        return `
          <button class="doke-user-result" type="button" data-go="${perfil}?uid=${encodeURIComponent(uid)}">
            <img src="${escapeHtml(foto)}" alt="">
            <div class="doke-user-result-main">
              <strong>${escapeHtml(handle)}</strong>
              <small>${escapeHtml(subtitulo)}</small>
            </div>
            <span class="doke-user-pill">${isProf ? "Profissional" : "Usuário"}</span>
          </button>
        `;
      }).join("");
    }

    function buildAdsResultHtml(list){
      if(!Array.isArray(list) || !list.length){
        return `<div class="doke-search-empty"><i class='bx bx-store-alt'></i><span>Nenhum anúncio encontrado.</span></div>`;
      }
      return list.map((a) => {
        const aid = String(a?.id || a?.anuncio_id || "").trim();
        const titulo = String(a?.titulo || a?.title || a?.nome || "Anúncio").trim();
        const categoria = String(a?.categoria || a?.categoria_profissional || a?.tipo || "Serviço").trim();
        const preco = getAdPriceLabel(a);
        const img = getAdImage(a);
        const goto = aid ? `detalhes.html?id=${encodeURIComponent(aid)}` : "busca.html";
        return `
          <button class="doke-ad-result" type="button" data-go="${goto}">
            <div class="doke-ad-thumb${img ? "" : " no-img"}">${img ? `<img src="${escapeHtml(img)}" alt="">` : `<i class='bx bx-image'></i>`}</div>
            <div class="doke-ad-main">
              <strong>${escapeHtml(titulo)}</strong>
              <small>${escapeHtml(categoria)}</small>
            </div>
            <div class="doke-ad-side">
              <span class="doke-ad-price">${escapeHtml(preco)}</span>
              <span class="doke-ad-pill">Anúncio</span>
            </div>
          </button>
        `;
      }).join("");
    }

    async function searchAds(term){
      const sb = window.sb || window.supabaseClient || window.sbClient || window.supabase
        || (typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null);
      if(!sb?.from) return [];
      const t = String(term || "").trim();
      if(t.length < 2) return [];
      const safe = t.replace(/[%_]/g, "\$&");
      try{
        const { data, error } = await sb
          .from("anuncios")
          .select("*")
          .or(`titulo.ilike.%${safe}%,categoria.ilike.%${safe}%`)
          .limit(12);
        if(error) return [];
        const rows = Array.isArray(data) ? data : [];
        return rows.filter((a) => isTruthyActive(a?.ativo));
      }catch(_){
        return [];
      }
    }

    const searchExploreCache = { ts: 0, users: [], ads: [] };
    async function getExploreData(){
      const now = Date.now();
      if((now - (searchExploreCache.ts || 0)) < 90000 && (searchExploreCache.users.length || searchExploreCache.ads.length)){
        return {
          users: shufflePick(searchExploreCache.users, 4),
          ads: shufflePick(searchExploreCache.ads, 4)
        };
      }
      const sb = window.sb || window.supabaseClient || window.sbClient || window.supabase
        || (typeof window.getSupabaseClient === "function" ? window.getSupabaseClient() : null);
      if(!sb?.from) return { users: [], ads: [] };

      let users = [];
      let ads = [];
      try{
        const { data, error } = await sb
          .from("usuarios_legacy")
          .select("id, uid, user, nome, foto, isProfissional, categoria_profissional")
          .eq("isProfissional", true)
          .limit(24);
        if(!error && Array.isArray(data)) users = data;
      }catch(_){ }
      if(!users.length){
        try{
          const { data, error } = await sb
            .from("usuarios")
            .select("id, uid, user, nome, foto, isProfissional, categoria_profissional")
            .eq("isProfissional", true)
            .limit(24);
          if(!error && Array.isArray(data)) users = data;
        }catch(_){ }
      }

      try{
        const { data, error } = await sb
          .from("anuncios")
          .select("*")
          .limit(24);
        if(!error && Array.isArray(data)) ads = data.filter((a) => isTruthyActive(a?.ativo));
      }catch(_){ }

      searchExploreCache.ts = now;
      searchExploreCache.users = Array.isArray(users) ? users.slice() : [];
      searchExploreCache.ads = Array.isArray(ads) ? ads.slice() : [];

      return {
        users: shufflePick(searchExploreCache.users, 4),
        ads: shufflePick(searchExploreCache.ads, 4)
      };
    }

    function bindOverlayResultClicks(results){
      if(!results) return;
      results.querySelector(".doke-result-action")?.addEventListener("click", () => {
        const btn = results.querySelector(".doke-result-action");
        const q = btn?.getAttribute("data-q") || "";
        goSearch(q, { forceAds: true });
      });
      results.querySelectorAll(".doke-user-result, .doke-ad-result").forEach((btn) => {
        btn.addEventListener("click", () => {
          const go = btn.getAttribute("data-go") || "";
          if(go) location.href = go;
        });
      });
    }

    async function renderExploreResults(currentToken, results, recent){
      if(!results || !recent) return;
      recent.style.display = "";
      results.hidden = false;
      results.innerHTML = `<div class="doke-search-loading"><i class='bx bx-loader-alt bx-spin'></i><span>Carregando sugestões...</span></div>`;
      const { users, ads } = await getExploreData();
      if(currentToken !== searchToken) return;
      let recentsEmpty = true;
      try{ recentsEmpty = !(JSON.parse(localStorage.getItem("doke_recent_searches") || "[]") || []).length; }catch(_){ recentsEmpty = true; }
      const note = recentsEmpty
        ? `<div class="doke-search-explore-note">Sugestões para começar sem digitar.</div>`
        : `<div class="doke-search-explore-note">Enquanto isso, veja sugestões aleatórias.</div>`;
      results.innerHTML = `
        ${note}
        <div class="doke-results-title">Anúncios</div>
        ${buildAdsResultHtml(ads)}
        <div class="doke-results-title">Profissionais</div>
        ${buildUserResultHtml((users || []).filter(u => u && u.isProfissional === true))}
      `;
      bindOverlayResultClicks(results);
    }


    let searchToken = 0;
    let searchTarget = "users"; // users | ads
    async function renderSearchResults(term){
      if(!overlay) return;
      const results = overlay.querySelector(".doke-search-results");
      const recent = overlay.querySelector(".doke-recent");
      if(!results || !recent) return;

      const q = String(term || "").trim();
      if(q.length < 2){
        const currentToken = ++searchToken;
        if(bottom && bottom.classList.contains("doke-bottom-nav")){
          await renderExploreResults(currentToken, results, recent);
        }else{
          results.hidden = true;
          results.innerHTML = "";
          recent.style.display = "";
        }
        return;
      }

      recent.style.display = "none";
      results.hidden = false;
      const currentToken = ++searchToken;
      results.innerHTML = `<div class="doke-search-loading"><i class='bx bx-loader-alt bx-spin'></i><span>Buscando...</span></div>`;

      const shouldSearchUsers = searchTarget === "users";
      const shouldSearchAds = searchTarget === "ads";
      const [users, ads] = await Promise.all([
        shouldSearchUsers ? searchUsers(q) : Promise.resolve([]),
        shouldSearchAds ? searchAds(q) : Promise.resolve([])
      ]);
      if(currentToken !== searchToken) return;

      const actionHtml = shouldSearchAds ? `
        <button class="doke-result-action" type="button" data-q="${escapeHtml(q)}">
          <i class='bx bx-right-arrow-alt'></i>
          <div>
            <strong>Buscar anúncios por "${escapeHtml(q)}"</strong>
            <small>Abrir resultados completos</small>
          </div>
        </button>
      ` : ``;

      const usersHtml = shouldSearchUsers ? buildUserResultHtml(users) : "";
      const adsHtml = shouldSearchAds ? buildAdsResultHtml(ads) : "";

      results.innerHTML = `
        ${actionHtml}
        ${shouldSearchUsers ? `<div class="doke-results-title">Usuários</div>${usersHtml}` : ``}
        ${shouldSearchAds ? `<div class="doke-results-title">Anúncios</div>${adsHtml}` : ``}
      `;

      bindOverlayResultClicks(results);
    }


    function goSearch(q, opts = {}){
      if(!overlay) return;
      q = (q || overlay.querySelector(".doke-search-input")?.value || "").trim();
      if(!q) return;
      const forceAds = !!opts.forceAds;
      if(searchTarget === "users" && !forceAds){
        renderSearchResults(q);
        return;
      }
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
      renderSearchResults(inp?.value || "");
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
      header.addEventListener("click", async (e)=>{
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
          if(typeof window.fazerLogout === "function"){
            try{
              const out = window.fazerLogout();
              if (out && typeof out.then === "function") {
                out.catch(async ()=> {
                  await signOutEverywhereFallback();
                  clearAuthCache();
                  location.href = "login.html";
                });
              }
              return out;
            }catch(_e){}
          }
          await signOutEverywhereFallback();
          clearAuthCache();
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
      let searchDebounce = null;
      overlay.querySelector(".doke-search-back")?.addEventListener("click", closeSearch);
      overlay.querySelector(".doke-search-go")?.addEventListener("click", ()=>goSearch());
      overlay.querySelector(".doke-search-input")?.addEventListener("keydown", (e)=>{
        if(e.key === "Enter"){ e.preventDefault(); goSearch(); }
      });
      overlay.querySelector(".doke-search-input")?.addEventListener("input", (e)=>{
        const value = e.target?.value || "";
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => { renderSearchResults(value); }, 180);
      });
      overlay.querySelectorAll(".doke-chip").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          overlay.querySelectorAll(".doke-chip").forEach(b=>b.classList.remove("active"));
          btn.classList.add("active");
          const target = btn.getAttribute("data-search-target");
          if(target === "users" || target === "ads"){
            searchTarget = target;
            renderSearchResults(overlay.querySelector(".doke-search-input")?.value || "");
          }
        });
      });
    }

    function applyShellBadges(totals){
      if (!totals || typeof totals !== "object") return;
      const notifRaw = Number(totals.notif);
      const chatRaw = Number(totals.chat);
      const notif = Number.isFinite(notifRaw) ? Math.max(0, Math.trunc(notifRaw)) : null;
      const chat = Number.isFinite(chatRaw) ? Math.max(0, Math.trunc(chatRaw)) : null;
      const applyTo = (href, total) => {
        if (total === null) return;
        document.querySelectorAll(`.doke-mobile-header a.doke-icon-btn[href="${href}"]`).forEach((link) => {
          let badge = link.querySelector(".doke-badge");
          if(!badge){
            badge = document.createElement("span");
            badge.className = "doke-badge";
            link.appendChild(badge);
          }
          if(total > 0){
            badge.textContent = total > 99 ? "99+" : String(total);
            badge.style.display = "flex";
          }else{
            badge.style.display = "none";
          }
        });
      };
      applyTo(PAGES.notif, notif);
      applyTo(PAGES.chat, chat);
    }

    try{
      applyShellBadges(window.__dokeBadgeTotals || null);
    }catch(e){}

    if(!window.__dokeShellBadgeListenerBound){
      window.__dokeShellBadgeListenerBound = true;
      window.addEventListener("doke:badges", (ev) => {
        try{ applyShellBadges(ev?.detail || null); }catch(e){}
      });
    }
    window.addEventListener("pageshow", normalizeShellScrollLocks);
    window.addEventListener("focus", normalizeShellScrollLocks);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) normalizeShellScrollLocks();
    });
    if(!window.__dokeShellBadgeHydrateBound){
      window.__dokeShellBadgeHydrateBound = true;
      const hydrateBadges = () => {
        try{ applyShellBadges(window.__dokeBadgeTotals || null); }catch(_e){}
        try{
          const uid = String(localStorage.getItem("doke_uid") || "").trim();
          if(uid && shouldBindBadges && typeof window.monitorarNotificacoesGlobal === "function"){
            window.monitorarNotificacoesGlobal(uid);
          }
        }catch(_e){}
      };
      window.addEventListener("focus", hydrateBadges);
      window.addEventListener("pageshow", hydrateBadges);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) hydrateBadges();
      });
    }

    // Avatar (aplica no que existir)
    /* avatarUrl já calculado acima */
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
      try{
        const headerImg = header ? header.querySelector(".doke-avatar") : null;
        const headerSrc = String(headerImg?.getAttribute("src") || "").trim();
        const navSrc = String(navImg?.getAttribute("src") || "").trim();
        if(navImg && headerSrc && (!navSrc || !avatarUrl)){
          navImg.src = headerSrc;
        }
      }catch(_){}
    }

    initShellModalLayerObserver();
    syncShellModalLayerClass();

    // ESC fecha search/drawer
    document.addEventListener("keydown", (e)=>{
      if(e.key === "Escape"){ closeSearch(); closeDrawer(); }
    });
  }

  MQ.addEventListener?.("change", ()=>{
    if(MQ.matches) ensureShell();
    else document.body.classList.remove("doke-modal-open");
  });
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", ()=>{
      consumeFlashNotice();
      ensureShell();
    });
  }else{
    consumeFlashNotice();
    ensureShell();
  }
})();


