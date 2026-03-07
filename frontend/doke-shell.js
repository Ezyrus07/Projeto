(function(){
  window.__DOKE_SHELL_BUILD__ = "20260306v77";
  try { console.log("[DOKE] shell build:", window.__DOKE_SHELL_BUILD__); } catch(_e) {}
  const MQ = window.matchMedia("(max-width:1024px)");
  // Pages where the mobile shell (header/bottom-nav/search overlay) must NOT be injected
  const DOKE_DISABLE_SHELL_PAGES = ["login.html","cadastro.html","senha.html"];
  const __dokeCurrentFile = String((location.pathname||"").split("/").pop()||"").toLowerCase();
  if (DOKE_DISABLE_SHELL_PAGES.includes(__dokeCurrentFile)) {
    try { document.documentElement.classList.add("doke-no-shell"); } catch(_e) {}
    return;
  }
  const PAGES = {
    home: "index.html",
    search: "busca.html",
    comunidades: "comunidade.html",
    negocios: "negocios.html",
    pedidos: "pedidos.html",
    perfil: "meuperfil.html",
    chat: "mensagens.html",
    notif: "notificacoes.html",
    mais: "mais.html"
  };

  const LOGO_SRC = "assets/Imagens/doke-logo.png";

  function toast(msg, type="info"){
    try{
      if(typeof window.dokeToast === "function") return window.dokeToast({ message: String(msg || ""), type });
      if(typeof window.mostrarToast === "function") return window.mostrarToast(msg, type);
    }catch(e){}
    try{ console[type==="error"?"error":"log"]("[DOKE]", msg); }catch(e){}
  }

  function ensureProUpsellModal(){
    if (typeof window.dokeOpenProUpsellModal === "function") return;
    window.dokeOpenProUpsellModal = function(){
      const title = "Ative seu perfil profissional";
      const msg = "Para anunciar e receber novos clientes, primeiro ative seu perfil profissional. Leva só alguns minutos e libera todos os recursos de vendas.";
      if (document.querySelector('.doke-pro-upsell-overlay')) return;
      const overlay = document.createElement("div");
      overlay.className = "doke-pro-upsell-overlay";
      overlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);display:grid;place-items:center;padding:20px;";
      overlay.innerHTML = `
        <div style="width:min(680px,96vw);background:#fff;border-radius:22px;border:1px solid #dbe5f0;box-shadow:0 28px 80px rgba(15,23,42,.30);overflow:hidden;">
          <div style="padding:22px 24px 10px;">
            <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:#e7f7f3;color:#0b7768;font-weight:800;font-size:.86rem;"><i class='bx bx-shield-quarter'></i> Cresça na Doke</span>
            <h3 style="margin:12px 0 6px;font-size:2rem;line-height:1.1;color:#0f2744;font-weight:900;">${title}</h3>
            <p style="margin:0;color:#425466;font-size:1.16rem;line-height:1.5;font-weight:600;">${msg}</p>
          </div>
          <div style="margin-top:18px;padding:18px 24px 24px;display:flex;align-items:center;justify-content:flex-end;gap:10px;border-top:1px solid #e8eef5;">
            <button type="button" data-action="close" style="border:none;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer;background:#eef2f7;color:#334155;">Agora não</button>
            <button type="button" data-action="go" style="border:none;border-radius:12px;padding:12px 18px;font-weight:800;cursor:pointer;background:#0b7768;color:#fff;">Tornar-se profissional</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener("click", (ev) => {
        const t = ev.target;
        if (!(t instanceof Element)) return;
        const actionEl = t.closest("[data-action]");
        if (t === overlay || (actionEl && actionEl.getAttribute("data-action") === "close")) {
          overlay.remove();
          return;
        }
        if (actionEl && actionEl.getAttribute("data-action") === "go") {
          location.href = "tornar-profissional.html";
        }
      });
    };
  }
  ensureProUpsellModal();

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
        window.dokeToast({ message: msg, type, title });
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
      // Keep header stable: do not render pending placeholders.
      body.classList.remove("doke-auth-pending");
      body.classList.add("doke-auth-ready");
      if (isReady) window.__dokeAuthStateHydrated = true;
    }catch(_e){}
  }

  function normalizeLegacyAppUrl(){
    try{
      try { localStorage.removeItem("doke_enable_pjax"); } catch(_e) {}
      const file = String(location.pathname.split("/").pop() || "").toLowerCase();
      if(file !== "app.html") return;
      const hash = String(location.hash || "");
      const qs = String(location.search || "");
      const target = `index.html${qs}${hash}`;
      if (location.href.includes("/frontend/frontend/")) {
        location.replace(target);
        return;
      }
      location.replace(target);
    }catch(_e){}
  }

  async function getSessionUser(){
    const forcedLogoutAt = Number(localStorage.getItem("doke_force_logged_out_at") || sessionStorage.getItem("doke_force_logged_out_at") || 0);
    const forceLogoutActive = window.__dokeLogoutInProgress === true || (Number.isFinite(forcedLogoutAt) && forcedLogoutAt > 0 && (Date.now() - forcedLogoutAt) < 120000);
    if (forceLogoutActive) return null;

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
    const forcedLogoutAt = Number(localStorage.getItem("doke_force_logged_out_at") || sessionStorage.getItem("doke_force_logged_out_at") || 0);
    const forceLogoutActive = window.__dokeLogoutInProgress === true || (Number.isFinite(forcedLogoutAt) && forcedLogoutAt > 0 && (Date.now() - forcedLogoutAt) < 120000);
    if (forceLogoutActive) return (currentProfile && typeof currentProfile === "object") ? { ...currentProfile } : {};

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
    window.toggleDropdown = function(event){
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      const target = event?.currentTarget || event?.target || null;
      const container = target?.closest ? target.closest(".profile-container") : null;
      const drop = container ? container.querySelector(".dropdown-profile") : document.querySelector(".dropdown-profile");
      if(!drop) return;
      const willOpen = !drop.classList.contains("show");
      document.querySelectorAll(".dropdown-profile.show").forEach((el) => el.classList.remove("show"));
      if (willOpen) drop.classList.add("show");
    };

    if (window.__dokeShellDropdownFallbackBound) return;
    window.__dokeShellDropdownFallbackBound = true;
    document.addEventListener("click", (ev) => {
      const t = ev.target;
      if (!(t instanceof Element)) return;
      const toggle = t.closest(".profile-img-btn, .doke-avatar-btn, [data-action='toggle-profile-menu']");
      if (toggle) {
        window.toggleDropdown(ev);
        return;
      }
      if (t.closest(".profile-container")) return;
      document.querySelectorAll(".dropdown-profile.show").forEach((el) => el.classList.remove("show"));
    }, true);
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
    const nextHref = String(targetHref || "login.html");
    const fromPath = String(window.location.pathname || "").toLowerCase();
    window.__dokeLogoutInProgress = true;
    try { localStorage.setItem("doke_force_logged_out_at", String(Date.now())); } catch (_e) {}
    try { sessionStorage.setItem("doke_force_logged_out_at", String(Date.now())); } catch (_e) {}
    try {
      if (window.auth && typeof window.auth === "object") window.auth.currentUser = null;
      if (typeof window.dokeApplyCompatAuthUser === "function") window.dokeApplyCompatAuthUser(null);
    } catch (_e) {}
    clearAuthCache();
    try { if (typeof window.verificarEstadoLogin === "function") await window.verificarEstadoLogin(); } catch (_e) {}

    try {
      await Promise.race([
        signOutEverywhereFallback(),
        new Promise((resolve) => setTimeout(resolve, 900))
      ]);
    } catch (_e) {}

    try { window.location.replace(nextHref); } catch (_e) { window.location.href = nextHref; }
    setTimeout(() => {
      try {
        if (!String(window.location.href || "").includes("login.html")) {
          window.location.href = nextHref;
        }
      } catch (_e) {}
    }, 350);
    setTimeout(() => {
      try {
        const nowPath = String(window.location.pathname || "").toLowerCase();
        const stillLoggedFlag = localStorage.getItem("usuarioLogado") === "true";
        if (nowPath === fromPath || (stillLoggedFlag && !nowPath.includes("login.html"))) {
          window.location.reload();
        }
      } catch (_e) {}
    }, 950);
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

    const lockedAnnounceHref = !isLogged
      ? "login.html"
      : (isPro ? null : "tornar-profissional.html");
    const headerAnnounceAnchors = Array.from(document.querySelectorAll("header a, nav a, .menu a"))
      .filter((a) => a instanceof HTMLAnchorElement)
      .filter((a) => !a.closest(".doke-mobile-header"));

    headerAnnounceAnchors.forEach((link) => {
      const href = String(link.getAttribute("href") || "").toLowerCase();
      const txt = sanitizePlainText(link.textContent || "").toLowerCase();
      const isAnnounceLink =
        href.includes("anunciar.html") ||
        href.includes("anunciar-negocio.html") ||
        href.includes("escolheranuncio.html") ||
        href.includes("selecionaranuncio.html") ||
        txt === "anunciar";
      if (!isAnnounceLink || !lockedAnnounceHref) return;
      link.setAttribute("href", lockedAnnounceHref);
      link.dataset.requiresProfessional = isLogged ? "1" : "0";
      link.dataset.requiresLogin = isLogged ? "0" : "1";
      if (link.dataset.lockAnnounceBound === "1") return;
      link.dataset.lockAnnounceBound = "1";
      link.addEventListener("click", (e) => {
        if (link.dataset.requiresLogin === "1") {
          e.preventDefault();
          location.href = "login.html";
          return;
        }
        if (link.dataset.requiresProfessional === "1") {
          e.preventDefault();
          const msg = "Para anunciar e receber novos clientes, primeiro ative seu perfil profissional. Leva só alguns minutos e libera todos os recursos de vendas.";
          if (typeof window.dokeOpenProUpsellModal === "function") window.dokeOpenProUpsellModal();
          else if (typeof window.dokeAlert === "function") window.dokeAlert(msg, "Ative seu perfil profissional");
          else toast(msg, "info");
        }
      });
    });
  }

  function syncDesktopSidebarProfile(opts){
    try{
      const isLogged = !!opts?.isLogged;
      const profile = (opts?.profile && typeof opts.profile === "object") ? opts.profile : {};
      const avatarUrl = String(opts?.avatarUrl || "").trim();
      const isPro = !!opts?.isPro;
      const nomePerfil = sanitizePlainText(profile.user || profile.nome || profile.name || "Minha conta");
      const nomePerfilSafe = escapeHtml(nomePerfil || "Minha conta");
      const profileHref = isPro ? "meuperfil.html" : "perfil-usuario.html";
      const linkAnunciar = isPro ? "anunciar.html" : "tornar-profissional.html";
      const itemCarteira = isPro ? `<a href="carteira.html" class="dropdown-item"><i class='bx bx-wallet'></i> Carteira</a>` : "";

      document.querySelectorAll(".doke-sidebar-profile").forEach((box) => {
        if (!(box instanceof HTMLElement)) return;
        const avatar = box.querySelector(".doke-sidebar-account-avatar");
        const nameEl = box.querySelector(".doke-sidebar-account-name");
        const menu = box.querySelector(".doke-sidebar-account-menu");
        if (avatar instanceof HTMLImageElement) avatar.src = avatarUrl || "https://i.pravatar.cc/150?img=12";
        if (nameEl) nameEl.textContent = nomePerfil || "Minha conta";
        if (menu instanceof HTMLElement) {
          if (!isLogged) {
            menu.innerHTML = `<a href="login.html" class="dropdown-item"><i class='bx bx-log-in'></i> Entrar</a>`;
          } else {
            menu.innerHTML = `
              <div style="padding: 10px 15px; border-bottom: 1px solid #eee; font-weight: bold; color: var(--cor2);">${nomePerfilSafe}</div>
              <a href="${profileHref}" class="dropdown-item"><i class='bx bx-user-circle'></i> Ver Perfil</a>
              ${itemCarteira}
              <a href="#" onclick="alternarConta()" class="dropdown-item"><i class='bx bx-user-pin'></i> Alternar Conta</a>
              <a href="${linkAnunciar}" class="dropdown-item"><i class='bx bx-plus-circle'></i> Anunciar</a>
              <a href="#" onclick="fazerLogout()" class="dropdown-item item-sair"><i class='bx bx-log-out'></i> Sair</a>
            `;
          }
        }
      });
    }catch(_e){}
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

  function getDesktopCurrentFileName(){
    return String((location.pathname || "").split("/").pop() || "index.html")
      .split("?")[0]
      .trim()
      .toLowerCase();
  }

  function desktopMenuTargetForDesktopFile(file){
    const f = String(file || "").toLowerCase();
    const groups = {
      anunciar: new Set(["escolheranuncio.html","selecionaranuncio.html","anunciar.html","anunciar-negocio.html","editar-anuncio.html"]),
      comunidades: new Set(["comunidade.html","grupo.html"]),
      novidades: new Set(["novidades.html"])
    };
    if (groups.anunciar.has(f)) return "escolheranuncio.html";
    if (groups.comunidades.has(f)) return "comunidade.html";
    if (groups.novidades.has(f)) return "novidades.html";
    return f;
  }

  function ensureUnifiedDesktopChrome(){
  try{
    const body = document.body;
    if (!body) return;
    if (String(body.getAttribute("data-doke-unified-desktop") || "").toLowerCase() === "off") return;
    if (!window.matchMedia("(min-width:1025px)").matches) return;

    const file = getDesktopCurrentFileName();
    const topTarget = desktopMenuTargetForDesktopFile(file);
    const isActive = (href) => {
      const h = String(href || "").split("?")[0].trim().toLowerCase();
      if (h === "mensagens.html") return file === "mensagens.html";
      return h === file;
    };
    const item = (href, icon, cls, label, extraAttr) => `
      <div class="item ${isActive(href) ? "active" : ""}">
        <a href="${href}" ${extraAttr || ""}>
          <i class="bx ${icon} icon ${cls}"></i>
          <span>${label}</span>
        </a>
      </div>
    `;

    const headerMarkup = `
<header class="navbar-desktop" data-shell="unified-desktop">
  <div class="doke-header-left">
    <a class="doke-header-brand" href="index.html" aria-label="Doke">
      <img src="assets/Imagens/doke-logo.png" alt="Doke">
    </a>
  </div>
  <nav class="menu doke-header-menu">
    <a href="escolheranuncio.html" ${topTarget === "escolheranuncio.html" ? "class=\"active\" aria-current=\"page\"" : ""}>Anunciar</a>
    <a href="comunidade.html" ${topTarget === "comunidade.html" ? "class=\"active\" aria-current=\"page\"" : ""}>Comunidades <span class="badge-novo1">NOVO</span></a>
    <a href="novidades.html" ${topTarget === "novidades.html" ? "class=\"active\" aria-current=\"page\"" : ""}>Novidades</a>
  </nav>
  <div class="botoes-direita doke-header-right"><a class="entrar" href="login.html">Entrar</a></div>
</header>`;
const sidebarMarkup = `
<aside class="sidebar-icones" data-shell="unified-desktop">
  <div id="logo"><a href="index.html" aria-label="Doke"><img src="assets/Imagens/doke-logo.png" alt="Doke"></a></div>
  ${item("index.html", "bx-home-alt", "azul", "Início")}
  <div class="item ${file === "busca.html" ? "active" : ""}" id="pvSearchSidebarItem"><a href="#" class="pv-search-toggle" aria-label="Pesquisar"><i class="bx bx-search-alt-2 icon azul"></i><span>Pesquisar</span></a></div>
  ${item("negocios.html", "bx-store", "verde", "Negócios")}
  ${item("notificacoes.html", "bx-bell", "azul", "Notificações")}
  ${item("mensagens.html?aba=conversas", "bx-message-rounded-dots", "azul", "Mensagens")}
  ${item("pedidos.html", "bx-package", "verde", "Pedidos")}
  ${item("comunidade.html", "bx-group", "verde", "Comunidades")}
  ${item("meuperfil.html", "bx-user", "verde", "Perfil")}
  ${item("mais.html", "bx-menu", "azul", "Mais")}
</aside>`;

    document.querySelectorAll("header.navbar-desktop").forEach((el) => {
      if (el.getAttribute("data-shell") !== "unified-desktop") {
        try { el.remove(); } catch(_e){}
      }
    });
    document.querySelectorAll("aside.sidebar-icones").forEach((el) => {
      if (el.getAttribute("data-shell") !== "unified-desktop") {
        try { el.remove(); } catch(_e){}
      }
    });

    if (!document.querySelector('header.navbar-desktop[data-shell="unified-desktop"]')) {
      const anchor = document.querySelector("#overlay-menu");
      if (anchor) anchor.insertAdjacentHTML("afterend", headerMarkup);
      else document.body.insertAdjacentHTML("afterbegin", headerMarkup);
    }

    if (!document.querySelector('aside.sidebar-icones[data-shell="unified-desktop"]')) {
      const beforeMain = document.querySelector("main, .dp-wrap, .main-content, .messenger-layout, .content-wrap");
      if (beforeMain) beforeMain.insertAdjacentHTML("beforebegin", sidebarMarkup);
      else document.body.insertAdjacentHTML("beforeend", sidebarMarkup);
    }

    const sidebar = document.querySelector('aside.sidebar-icones[data-shell="unified-desktop"]');
    if (sidebar) {
      const getFileFromHref = (href) => {
        const raw = String(href || "").trim();
        if (!raw || raw.startsWith("#")) return "";
        try {
          const u = new URL(raw, location.href);
          return String(u.pathname.split("/").pop() || "").toLowerCase();
        } catch(_e) {
          return String(raw.split("?")[0].split("/").pop() || "").toLowerCase();
        }
      };
      sidebar.querySelectorAll(".item").forEach((it) => it.classList.remove("active"));
      let matched = false;
      sidebar.querySelectorAll(".item a[href]").forEach((a) => {
        const parent = a.closest(".item");
        if (!(parent instanceof HTMLElement)) return;
        const targetFile = getFileFromHref(a.getAttribute("href"));
        if (!targetFile) return;
        if (targetFile === file) {
          parent.classList.add("active");
          matched = true;
          return;
        }
        if (targetFile === "mensagens.html" && file === "mensagens.html") {
          parent.classList.add("active");
          matched = true;
        }
      });
      if (!matched && file === "busca.html") {
        const searchItem = sidebar.querySelector("#pvSearchSidebarItem");
        if (searchItem) searchItem.classList.add("active");
      }
      if (!matched && file === "index.html") {
        const homeItem = sidebar.querySelector('.item a[href*="index.html"]')?.closest(".item");
        if (homeItem) homeItem.classList.add("active");
      }
    }

    const header = document.querySelector('header.navbar-desktop[data-shell="unified-desktop"]');
    if (header) {
      header.querySelectorAll(".doke-header-menu a").forEach((a) => {
        const href = String(a.getAttribute("href") || "").split("?")[0].trim().toLowerCase();
        a.classList.remove("active");
        a.removeAttribute("aria-current");
        if (href && href === topTarget) {
          a.classList.add("active");
          a.setAttribute("aria-current", "page");
        }
      });
    }

  }catch(_e){}
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
      {key:"pedidos", files:["pedidos.html","pedido.html","mensagens.html"]},
      {key:"perfil", files:["meuperfil.html","perfil-profissional.html","perfil-cliente.html","perfil-empresa.html","perfil-usuario.html"]},
    ];
    bottom.querySelectorAll("a").forEach(a=>a.classList.remove("active"));
    const found = map.find(m=>m.files.includes(path));
    if(found){
      const a = bottom.querySelector(`[data-nav="${found.key}"]`);
      if(a) a.classList.add("active");
    }
  }

  

  // Normaliza o item ativo do menu superior (evita 2 ativos ao mesmo tempo).
  function normalizeTopMenuActive(){
    try{
      const file = String((location.pathname || '').split('/').pop() || '').trim().toLowerCase();
      const menu = document.querySelector('.navbar-desktop .menu');
      if(!menu) return;

      const groups = {
        anunciar: new Set(['escolheranuncio.html','selecionaranuncio.html','anunciar.html','anunciar-negocio.html','editar-anuncio.html']),
        comunidades: new Set(['comunidade.html','grupo.html']),
        novidades: new Set(['novidades.html'])
      };

      let target = file;
      if (groups.anunciar.has(file)) target = 'escolheranuncio.html';
      else if (groups.comunidades.has(file)) target = 'comunidade.html';
      else if (groups.novidades.has(file)) target = 'novidades.html';

      let activated = false;
      Array.from(menu.querySelectorAll('a[href]')).forEach((a) => {
        const raw = String(a.getAttribute('href') || '').trim();
        const href = raw.split('?')[0].trim().replace(/\s+$/,'').toLowerCase();
        a.classList.remove('active','ativo');
        a.removeAttribute('aria-current');
        if (!activated && href && target && href === target) {
          a.classList.add('active');
          a.setAttribute('aria-current', 'page');
          activated = true;
        }
      });
    }catch(_e){}
  }

  // Carrega um script leve da busca da sidebar em páginas que NÃO usam script.js
  // (mantém a busca "inline" no menu lateral sem navegar).
  function ensureSidebarSearchLite(){
    try{
      if (window.openDokeSidebarSearch) return;
      const sidebar = document.querySelector('aside.sidebar-icones, .sidebar-icones');
      if(!sidebar) return;
      if (document.querySelector('script[src*="script.js"]')) return;
      if (document.querySelector('script[src*="doke-sidebar-search-lite.js"]')) return;
      const s = document.createElement('script');
      s.src = 'doke-sidebar-search-lite.js?v=20260306v2';
      s.async = true;
      document.head.appendChild(s);
    }catch(_e){}
  }

  function ensureUnifiedDesktopCssLock(){
    try{
      const id = "doke-unified-desktop-lock";
      let st = document.getElementById(id);
      if (st) return;
      st = document.createElement("style");
      st.id = id;
      st.textContent = `
@media (min-width: 1025px){
  .navbar-desktop[data-shell="unified-desktop"]{
    left: var(--sidebar-width) !important;
    width: calc(100% - var(--sidebar-width)) !important;
    height: 72px !important;
    display: grid !important;
    grid-template-columns: 132px 1fr minmax(120px, auto) !important;
    align-items: center !important;
    gap: 12px !important;
    padding: 0 20px !important;
    box-sizing: border-box !important;
  }
  .navbar-desktop[data-shell="unified-desktop"] .doke-header-left{
    min-width: 132px !important;
    justify-self: start !important;
    justify-content: flex-start !important;
  }
  .navbar-desktop[data-shell="unified-desktop"] .doke-header-menu{
    justify-self: center !important;
    justify-content: center !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
  }
  .navbar-desktop[data-shell="unified-desktop"] .doke-header-right{
    justify-self: end !important;
    margin: 0 !important;
  }
}
`;
      document.head.appendChild(st);
    }catch(_e){}
  }

  function forceUnifiedDesktopHeaderLayout(){
    try{
      if (!window.matchMedia || !window.matchMedia("(min-width:1025px)").matches) return;
      const header = document.querySelector('header.navbar-desktop[data-shell="unified-desktop"]');
      if (!(header instanceof HTMLElement)) return;

      header.style.setProperty("left", "var(--sidebar-width)", "important");
      header.style.setProperty("width", "calc(100% - var(--sidebar-width))", "important");
      header.style.setProperty("height", "72px", "important");
      header.style.setProperty("display", "grid", "important");
      header.style.setProperty("grid-template-columns", "132px 1fr minmax(120px, auto)", "important");
      header.style.setProperty("align-items", "center", "important");
      header.style.setProperty("gap", "12px", "important");
      header.style.setProperty("padding", "0 20px", "important");
      header.style.setProperty("box-sizing", "border-box", "important");

      const left = header.querySelector(".doke-header-left");
      if (left instanceof HTMLElement){
        left.style.setProperty("min-width", "132px", "important");
        left.style.setProperty("justify-self", "start", "important");
        left.style.setProperty("justify-content", "flex-start", "important");
        left.style.setProperty("display", "flex", "important");
        left.style.setProperty("align-items", "center", "important");
      }

      const menu = header.querySelector(".doke-header-menu");
      if (menu instanceof HTMLElement){
        menu.style.setProperty("justify-self", "center", "important");
        menu.style.setProperty("justify-content", "center", "important");
        menu.style.setProperty("display", "flex", "important");
        menu.style.setProperty("gap", "24px", "important");
        menu.style.setProperty("margin", "0", "important");
        menu.style.setProperty("padding", "0", "important");
        menu.style.setProperty("transform", "none", "important");
        menu.querySelectorAll("a").forEach((a) => {
          if (!(a instanceof HTMLElement)) return;
          a.style.setProperty("font-family", "\"Poppins\", \"Segoe UI\", sans-serif", "important");
          a.style.setProperty("font-weight", "600", "important");
          a.style.setProperty("color", "#5f6670", "important");
          a.style.setProperty("opacity", "1", "important");
          a.style.setProperty("letter-spacing", "0", "important");
        });
      }

      const right = header.querySelector(".doke-header-right");
      if (right instanceof HTMLElement){
        right.style.setProperty("justify-self", "end", "important");
        right.style.setProperty("margin", "0", "important");
        right.style.setProperty("display", "flex", "important");
        right.style.setProperty("align-items", "center", "important");
      }
    }catch(_e){}
  }

  function ensureCompactSidebarMode(){
    try{
      const desktop = window.matchMedia("(min-width:1025px)").matches;
      const body = document.body;
      if(!body) return;
      const sidebars = Array.from(document.querySelectorAll("aside.sidebar-icones, .sidebar-icones"));
      if (sidebars.length > 1){
        sidebars.slice(1).forEach((el) => { try { el.remove(); } catch(_e){} });
      }
      const sidebar = sidebars[0] || null;
      const cssId = "dokeSidebarCompactCss";
      let link = document.getElementById(cssId);

      if (desktop && sidebar){
        body.classList.add("has-doke-sidebar");
        try { ensureDesktopSidebarToggle(sidebar); } catch(_e){}
        if (link) {
          try { link.remove(); } catch(_e){}
        }
        return;
      }

      body.classList.remove("has-doke-sidebar");
      if (link) {
        try { link.remove(); } catch(_e){}
      }
    }catch(_e){}
  }

  function ensureDesktopSidebarToggle(sidebar){
    if(!(sidebar instanceof HTMLElement)) return;
    const body = document.body;
    if(!body) return;
    const STORAGE_KEY = "doke_sidebar_mode_v1";

    const isExpanded = () => body.classList.contains("doke-sidebar-expanded");
    const readMode = () => {
      try { return localStorage.getItem(STORAGE_KEY) === "expanded" ? "expanded" : "compact"; }
      catch(_e){ return "compact"; }
    };
    const writeMode = (mode) => {
      try { localStorage.setItem(STORAGE_KEY, mode === "expanded" ? "expanded" : "compact"); } catch(_e){}
    };
    const applyMode = (mode) => {
      body.classList.toggle("doke-sidebar-expanded", mode === "expanded");
    };
    const syncBtn = (btn) => {
      if(!(btn instanceof HTMLElement)) return;
      const expanded = isExpanded();
      const icon = btn.querySelector("i");
      const lbl = btn.querySelector(".lbl");
      btn.setAttribute("aria-label", expanded ? "Recolher menu lateral" : "Expandir menu lateral");
      btn.setAttribute("title", expanded ? "Recolher menu" : "Expandir menu");
      if(lbl) lbl.textContent = expanded ? "Recolher" : "Expandir";
      if(icon){
        icon.classList.remove("bx-chevrons-right", "bx-chevrons-left");
        icon.classList.add(expanded ? "bx-chevrons-left" : "bx-chevrons-right");
      }
    };

    applyMode(readMode());

    sidebar.querySelectorAll(".doke-sidebar-toggle").forEach((el, idx) => {
      if (idx > 0) { try { el.remove(); } catch(_e){} }
    });
    let btn = sidebar.querySelector(".doke-sidebar-toggle");
    if(!(btn instanceof HTMLButtonElement)){
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "doke-sidebar-toggle";
      btn.innerHTML = "<i class='bx bx-chevrons-right'></i><span class='lbl'>Expandir</span>";
      sidebar.insertBefore(btn, sidebar.firstChild);
    }
    syncBtn(btn);
    if(btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      const nextMode = isExpanded() ? "compact" : "expanded";
      applyMode(nextMode);
      writeMode(nextMode);
      syncBtn(btn);
    });
  }
async function ensureShell(){
    setShellAuthStateReady(false);
    const body = document.body;
    try { ensureUnifiedDesktopCssLock(); } catch(_e) {}
    try { ensureUnifiedDesktopChrome(); } catch(_e) {}
    try { forceUnifiedDesktopHeaderLayout(); } catch(_e) {}
    try { ensureCompactSidebarMode(); } catch(_e) {}
    const mode = (body && body.getAttribute("data-doke-shell")) || "";
    const force = (mode === "1" || mode === "force");
    let profile = getProfile();
    const hasLocalAuth = !!profile || hasLocalLoginFlag();
    // Keep header stable (no skeleton), but DO NOT trust cache as authenticated.
    if (hasLocalAuth) setShellAuthStateReady(true);

    // Always verify a real session (Supabase/Firebase) when possible.
    let sessionUser = await getSessionUser();

    if (sessionUser && !profile) profile = getProfile();
    if (sessionUser) {
      profile = hydrateProfileFromSession(sessionUser, profile);
    }

    const isLogged = !!sessionUser;

    // Keep localStorage flags aligned with the verified session.
    if (!isLogged) {
      profile = null;
      try { localStorage.removeItem("usuarioLogado"); } catch (_e) {}
      try { localStorage.removeItem("doke_uid"); } catch (_e) {}
      try { localStorage.removeItem("doke_usuario_perfil"); } catch (_e) {}
      try { localStorage.removeItem("perfil_usuario"); } catch (_e) {}
      try { localStorage.removeItem("doke_usuario_logado"); } catch (_e) {}
      try { localStorage.removeItem("userLogado"); } catch (_e) {}
    } else {
      try { localStorage.setItem("usuarioLogado", "true"); } catch (_e) {}
      try {
        const uid = String(profile?.uid || profile?.id || sessionUser?.id || "").trim();
        if (uid) localStorage.setItem("doke_uid", uid);
      } catch (_e) {}
    }
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

    if (currentFile === "escolheranuncio.html" || currentFile === "selecionaranuncio.html") {
      const cards = Array.from(document.querySelectorAll("a.option-card[href]"))
        .filter((a) => a instanceof HTMLAnchorElement);
      cards.forEach((card) => {
        if (!isLogged) {
          card.setAttribute("href", "login.html");
          card.dataset.requiresLogin = "1";
          card.dataset.requiresProfessional = "0";
        } else if (!isPro) {
          card.setAttribute("href", "tornar-profissional.html");
          card.dataset.requiresLogin = "0";
          card.dataset.requiresProfessional = "1";
        } else {
          card.dataset.requiresLogin = "0";
          card.dataset.requiresProfessional = "0";
        }
        if (card.dataset.announceGuardBound === "1") return;
        card.dataset.announceGuardBound = "1";
        card.addEventListener("click", (e) => {
          if (card.dataset.requiresLogin === "1") {
            e.preventDefault();
            location.href = "login.html";
            return;
          }
          if (card.dataset.requiresProfessional === "1") {
            e.preventDefault();
            const msg = "Para anunciar e receber novos clientes, primeiro ative seu perfil profissional. Leva só alguns minutos e libera todos os recursos de vendas.";
            if (typeof window.dokeOpenProUpsellModal === "function") window.dokeOpenProUpsellModal();
            else if (typeof window.dokeAlert === "function") window.dokeAlert(msg, "Ative seu perfil profissional");
            else toast(msg, "info");
          }
        });
      });
    }

    if ((currentFile === "anunciar.html" || currentFile === "anunciar-negocio.html") && isLogged && !isPro) {
      try {
        localStorage.setItem("doke_flash_notice", JSON.stringify({
          type: "info",
          title: "Ative seu perfil profissional",
          message: "Para anunciar e receber novos clientes, primeiro ative seu perfil profissional. Leva só alguns minutos e libera todos os recursos de vendas."
        }));
      } catch (_e) {}
      if (typeof window.dokeOpenProUpsellModal === "function") window.dokeOpenProUpsellModal();
      else location.replace("tornar-profissional.html");
      return;
    }

    ensureGlobalAuthActions();
    syncClassicDesktopHeader({ isLogged, profile, avatarUrl, isPro });
    syncDesktopSidebarProfile({ isLogged, profile, avatarUrl, isPro });
    try { normalizeTopMenuActive(); } catch(_e) {}
    try { ensureSidebarSearchLite(); } catch(_e) {}
    try { ensureCompactSidebarMode(); } catch(_e) {}

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
          <a class="doke-icon-btn" href="${PAGES.chat}" aria-label="Mensagens"><i class='bx bx-message-rounded-dots'></i><span class="doke-badge" style="display:none">0</span></a>
          <a class="doke-icon-btn" href="${PAGES.pedidos}" aria-label="Pedidos"><i class='bx bx-package'></i></a>
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
            <button class="doke-chip active" type="button" data-search-target="all"><i class='bx bx-grid-alt'></i> Todos</button>
            <button class="doke-chip" type="button" data-search-target="users"><i class='bx bx-user'></i> Usuários</button>
            <button class="doke-chip" type="button" data-search-target="ads"><i class='bx bx-store-alt'></i> Serviços</button>
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
      searchTarget = "all";
      overlay.querySelectorAll(".doke-chip").forEach((b)=> b.classList.remove("active"));
      overlay.querySelector('.doke-chip[data-search-target="all"]')?.classList.add("active");
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
      const safe = t.replace(/[%_]/g, "\\$&");
      try{
        const { data, error } = await sb
          .from("usuarios_legacy")
          .select("id, uid, user, nome, foto, isProfissional, categoria_profissional")
          .or(`user.ilike.%${safe}%,nome.ilike.%${safe}%`)
          .limit(8);
        if(!error && Array.isArray(data) && data.length) return data;
      }catch(_){
      }
      try{
        const { data, error } = await sb
          .from("usuarios")
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
        return `<div class="doke-search-empty"><i class='bx bx-store-alt'></i><span>Nenhum serviço encontrado.</span></div>`;
      }
      return list.map((a) => {
        const aid = String(a?.id || a?.anuncio_id || "").trim();
        const titulo = String(a?.titulo || a?.title || a?.nome || "Serviço").trim();
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
              <span class="doke-ad-pill">Serviço</span>
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
      const safe = t.replace(/[%_]/g, "\\$&");
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
      const showUsers = searchTarget === "all" || searchTarget === "users";
      const showAds = searchTarget === "all" || searchTarget === "ads";
      results.innerHTML = `
        ${showAds ? `<div class="doke-results-title">Serviços</div>${buildAdsResultHtml(ads)}` : ``}
        ${showUsers ? `<div class="doke-results-title">Usuários</div>${buildUserResultHtml(users)}` : ``}
      `;
      bindOverlayResultClicks(results);
    }

    let searchToken = 0;
    let searchTarget = "all"; // all | users | ads
    async function renderSearchResults(term){
      if(!overlay) return;
      const results = overlay.querySelector(".doke-search-results");
      const recent = overlay.querySelector(".doke-recent");
      if(!results || !recent) return;

      const q = String(term || "").trim();
      if(q.length < 2){
        const currentToken = ++searchToken;
        await renderExploreResults(currentToken, results, recent);
        return;
      }

      recent.style.display = "none";
      results.hidden = false;
      const currentToken = ++searchToken;
      results.innerHTML = `<div class="doke-search-loading"><i class='bx bx-loader-alt bx-spin'></i><span>Buscando...</span></div>`;

      const shouldSearchUsers = searchTarget === "all" || searchTarget === "users";
      const shouldSearchAds = searchTarget === "all" || searchTarget === "ads";
      const [users, ads] = await Promise.all([
        shouldSearchUsers ? searchUsers(q) : Promise.resolve([]),
        shouldSearchAds ? searchAds(q) : Promise.resolve([])
      ]);
      if(currentToken !== searchToken) return;

      const actionHtml = searchTarget !== "ads" ? `
        <button class="doke-result-action" type="button" data-q="${escapeHtml(q)}">
          <i class='bx bx-right-arrow-alt'></i>
          <div>
            <strong>Buscar serviços por "${escapeHtml(q)}"</strong>
            <small>Abrir resultados completos</small>
          </div>
        </button>
      ` : ``;

      const usersHtml = buildUserResultHtml(users);
      const adsHtml = buildAdsResultHtml(ads);

      results.innerHTML = `
        ${actionHtml}
        ${shouldSearchUsers ? `<div class="doke-results-title">Usuários</div>${usersHtml}` : ``}
        ${shouldSearchAds ? `<div class="doke-results-title">Serviços</div>${adsHtml}` : ``}
      `;

      bindOverlayResultClicks(results);
    }

    function goSearch(q, opts = {}){
      if(!overlay) return;
      q = (q || overlay.querySelector(".doke-search-input")?.value || "").trim();
      if(!q) return;
      const forceAds = !!opts.forceAds;
      if((searchTarget === "users" || searchTarget === "all") && !forceAds){
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
          if(target === "all" || target === "users" || target === "ads"){
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
      const linkMatchesFile = (link, file) => {
        try{
          const href = String(link?.getAttribute("href") || "").trim();
          if(!href) return false;
          const url = new URL(href, location.href);
          return String(url.pathname || "").toLowerCase().endsWith("/" + String(file || "").toLowerCase());
        }catch(_e){
          return false;
        }
      };
      const applyDesktopSidebar = (file, total, clsName) => {
        if (total === null) return;
        const anchors = Array.from(document.querySelectorAll(".sidebar-icones .item a[href]"))
          .filter((a) => linkMatchesFile(a, file));
        anchors.forEach((a) => {
          const host = a.closest(".item") || a;
          if (!(host instanceof HTMLElement)) return;
          if (!host.style.position || host.style.position === "static") host.style.position = "relative";
          let badge = host.querySelector("." + clsName);
          if (!badge) {
            badge = document.createElement("span");
            badge.className = clsName;
            badge.style.cssText = [
              "position:absolute",
              "top:6px",
              "right:8px",
              "min-width:18px",
              "height:18px",
              "padding:0 5px",
              "border-radius:999px",
              "display:none",
              "align-items:center",
              "justify-content:center",
              "background:#ff2e63",
              "color:#fff",
              "font-size:10px",
              "font-weight:800",
              "border:2px solid #fff",
              "box-shadow:0 2px 6px rgba(0,0,0,.24)",
              "z-index:5"
            ].join(";");
            host.appendChild(badge);
          }
          if (total > 0) {
            badge.textContent = total > 99 ? "99+" : String(total);
            badge.style.display = "flex";
          } else {
            badge.style.display = "none";
          }
        });
      };
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
      applyDesktopSidebar(PAGES.notif, notif, "doke-desktop-badge-notif");
      applyDesktopSidebar(PAGES.chat, chat, "doke-desktop-badge-chat");
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

  function initDesktopNavPerf(){
    if (window.__dokeDesktopNavPerfBound) return;
    window.__dokeDesktopNavPerfBound = true;

    const prefetched = new Set();
    const fetchedDocs = new Set();

    const style = document.createElement("style");
    style.id = "dokeNavPerfStyle";
    style.textContent = `
      body.doke-nav-pending::before{
        content:"";
        position:fixed;
        left:0;
        top:0;
        height:3px;
        width:38%;
        z-index:2147483647;
        background:linear-gradient(90deg,#2e68a6,#0b7768);
        box-shadow:0 0 12px rgba(11,119,104,.35);
        animation:dokeNavLoad 900ms ease-in-out infinite;
      }
      @keyframes dokeNavLoad{
        0%{ transform:translateX(0); width:24%; }
        50%{ transform:translateX(115%); width:48%; }
        100%{ transform:translateX(265%); width:24%; }
      }
      body.doke-nav-pending main,
      body.doke-nav-pending .main-content,
      body.doke-nav-pending .dp-wrap,
      body.doke-nav-pending .messenger-layout{
        opacity:.88;
        transition:opacity .12s ease;
      }
    `;
    if(!document.getElementById(style.id)) document.head.appendChild(style);

    function toUrl(href){
      try { return new URL(String(href || ""), location.href); } catch(_e){ return null; }
    }

    function isInternalPageUrl(url){
      if(!url || url.origin !== location.origin) return false;
      if(url.hash && (url.pathname === location.pathname || (url.pathname + url.search) === (location.pathname + location.search))) return false;
      const pathname = String(url.pathname || "").toLowerCase();
      if(!pathname.endsWith(".html")) return false;
      if(pathname.endsWith("/app.html")) return false;
      return true;
    }

    function tryPrefetch(url){
      const abs = String(url?.toString() || "");
      if(!abs || prefetched.has(abs)) return;
      prefetched.add(abs);
      try{
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = abs;
        link.as = "document";
        document.head.appendChild(link);
      }catch(_e){}
    }
    try { forceUnifiedDesktopHeaderLayout(); } catch(_e) {}

    function warmDocCache(url){
      const abs = String(url?.toString() || "");
      if(!abs || fetchedDocs.has(abs)) return;
      fetchedDocs.add(abs);
      try{
        fetch(abs, {
          method: "GET",
          credentials: "same-origin",
          mode: "same-origin",
          cache: "force-cache"
        }).catch(() => {});
      }catch(_e){}
    }

    function pickAnchorFromEventTarget(target){
      if(!(target instanceof Element)) return null;
      const anchor = target.closest("a[href]");
      if(!(anchor instanceof HTMLAnchorElement)) return null;
      if(anchor.hasAttribute("download")) return null;
      const targetAttr = String(anchor.getAttribute("target") || "").trim().toLowerCase();
      if(targetAttr && targetAttr !== "_self") return null;
      const href = String(anchor.getAttribute("href") || "").trim();
      if(!href || href.startsWith("#") || href.startsWith("javascript:")) return null;
      if(href.startsWith("mailto:") || href.startsWith("tel:")) return null;
      return anchor;
    }

    document.addEventListener("mouseover", (ev) => {
      const a = pickAnchorFromEventTarget(ev.target);
      if(!a) return;
      const url = toUrl(a.getAttribute("href"));
      if(!isInternalPageUrl(url)) return;
      tryPrefetch(url);
      warmDocCache(url);
    }, true);

    document.addEventListener("focusin", (ev) => {
      const a = pickAnchorFromEventTarget(ev.target);
      if(!a) return;
      const url = toUrl(a.getAttribute("href"));
      if(!isInternalPageUrl(url)) return;
      tryPrefetch(url);
      warmDocCache(url);
    }, true);

    document.addEventListener("touchstart", (ev) => {
      const a = pickAnchorFromEventTarget(ev.target);
      if(!a) return;
      const url = toUrl(a.getAttribute("href"));
      if(!isInternalPageUrl(url)) return;
      tryPrefetch(url);
      warmDocCache(url);
    }, { capture: true, passive: true });

    document.addEventListener("pointerdown", (ev) => {
      const a = pickAnchorFromEventTarget(ev.target);
      if(!a) return;
      const url = toUrl(a.getAttribute("href"));
      if(!isInternalPageUrl(url)) return;
      tryPrefetch(url);
      warmDocCache(url);
    }, { capture: true, passive: true });

    document.addEventListener("click", (ev) => {
      const a = pickAnchorFromEventTarget(ev.target);
      if(!a) return;
      const url = toUrl(a.getAttribute("href"));
      if(!isInternalPageUrl(url)) return;
      document.body.classList.add("doke-nav-pending");
    }, true);

    window.addEventListener("pageshow", () => {
      document.body.classList.remove("doke-nav-pending");
    });

    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => {
        try{
          document.querySelectorAll(".sidebar-icones a[href], .navbar-desktop a[href], .doke-bottom-nav a[href]")
            .forEach((a) => {
              if(!(a instanceof HTMLAnchorElement)) return;
              const url = toUrl(a.getAttribute("href"));
              if(!isInternalPageUrl(url)) return;
              tryPrefetch(url);
            });
        }catch(_e){}
      }, { timeout: 2200 });
    }
  }

  function initAppLikeNavigationState(){
    if (window.__dokeAppLikeNavBound) return;
    window.__dokeAppLikeNavBound = true;

    const KEY_PREFIX = "doke_scroll_pos_v1:";
    const LAST_PAGE_KEY = "doke_last_page_v1";
    const currentPath = `${location.pathname || ""}${location.search || ""}`;
    const currentKey = `${KEY_PREFIX}${currentPath}`;

    const saveScroll = () => {
      try {
        const y = Math.max(0, Math.round(window.scrollY || 0));
        sessionStorage.setItem(currentKey, String(y));
        sessionStorage.setItem(LAST_PAGE_KEY, currentPath);
      } catch(_e){}
    };

    const restoreScroll = () => {
      try {
        if (location.hash && location.hash.length > 1) return;
        const raw = sessionStorage.getItem(currentKey);
        if (raw == null) return;
        const y = Number(raw);
        if (!Number.isFinite(y) || y <= 0) return;
        requestAnimationFrame(() => window.scrollTo(0, y));
      } catch(_e){}
    };

    window.addEventListener("pagehide", saveScroll);
    window.addEventListener("beforeunload", saveScroll);
    window.addEventListener("scroll", () => {
      try {
        clearTimeout(window.__dokeSaveScrollTimer);
        window.__dokeSaveScrollTimer = setTimeout(saveScroll, 140);
      } catch(_e){}
    }, { passive: true });
    window.addEventListener("pageshow", restoreScroll);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", restoreScroll, { once: true });
    } else {
      restoreScroll();
    }
  }

  function warmupCorePages(){
    if (window.__dokeCorePrefetchDone) return;
    window.__dokeCorePrefetchDone = true;
    const net = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const slow = !!(net && (net.saveData || /2g/.test(String(net.effectiveType || "").toLowerCase())));
    if (slow) return;
    const urls = [PAGES.home, PAGES.search, PAGES.chat, PAGES.notif, PAGES.comunidades, PAGES.negocios, PAGES.perfil]
      .filter(Boolean)
      .filter((u) => !location.pathname.toLowerCase().endsWith(String(u).toLowerCase()));
    const run = () => {
      urls.slice(0, 4).forEach((u) => {
        try{
          const abs = new URL(String(u), location.href).toString();
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.as = "document";
          link.href = abs;
          document.head.appendChild(link);
        }catch(_e){}
      });
    };
    if (typeof window.requestIdleCallback === "function") {
      requestIdleCallback(run, { timeout: 2000 });
    } else {
      setTimeout(run, 900);
    }
  }

  function normalizeLegacyAppLinks(){
    const anchors = Array.from(document.querySelectorAll("a[href]"))
      .filter((a) => a instanceof HTMLAnchorElement);
    anchors.forEach((a) => {
      const href = String(a.getAttribute("href") || "").trim();
      if(!href) return;
      if(!/app\.html/i.test(href)) return;
      const mapped = href
        .replace(/(^|\/)app\.html/i, "$1index.html")
        .replace(/(^|\/)frontend\/app\.html/i, "$1frontend/index.html")
        .replace(/(^|\/)frontend\/frontend\/app\.html/i, "$1frontend/index.html");
      a.setAttribute("href", mapped);
    });
  }

  function initPersistentShellNavigation(){
    if (window.__dokePersistentShellNavBound) return;
    window.__dokePersistentShellNavBound = true;
    // PJAX global: enabled by default for the whole site, with explicit opt-out.
    const currentFile = String((location.pathname || "").split("/").pop() || "").toLowerCase();
    try { localStorage.removeItem("doke_disable_pjax"); } catch(_e){}
    const forcedOff = (document.body?.getAttribute("data-doke-pjax") === "0");
    if (forcedOff) {
      try { document.body.classList.remove("doke-nav-pending"); } catch(_e) {}
      return;
    }

    const BLOCKED_FILES = new Set(["login.html", "cadastro.html", "senha.html", "app.html", "app-beta.html"]);
    // Fallback de estabilidade: essas páginas ainda têm boot legado e quebram com swap parcial.
    const PJAX_RUNTIME_BLOCKED = new Set(["index.html", "mensagens.html", "pedidos.html", "pedido.html"]);
    const SCRIPT_SKIP_PARTS = [
      "/doke-shell.js",
      "/doke-config.js",
      "/doke-toast.js",
      "/doke-alerts.js",
      "/doke-beforeafter.js",
      "/doke-reco.js",
      "/supabase-init.js",
      "/firebase-compat-supabase.js",
      "/firebase-auth-compat-supabase.js",
      "/@supabase/supabase-js"
    ];
    const STYLE_SKIP_PARTS = [
      "/style.css",
      "/doke-a11y.css",
      "/doke-layout-fix.css",
      "/doke-fixes.css",
      "/doke-toast.css",
      "/doke-alerts.css",
      "/doke-ux.css",
      "/doke-feedpatch.css",
      "/doke-shell.css",
      "/doke-responsive.css",
      "/doke-skeleton.css",
      "/doke-tablet-fix.css",
      "/boxicons"
    ];
    let inflightController = null;

    function toUrl(href){
      try { return new URL(String(href || ""), location.href); } catch(_e){ return null; }
    }

    function getCurrentFileName(urlObj){
      const path = String(urlObj?.pathname || "").toLowerCase();
      return path.split("/").pop() || "";
    }
    function getLiveCurrentFileName(){
      try { return getCurrentFileName(new URL(location.href)); } catch(_e) { return currentFile; }
    }

    function isBlockedPath(urlObj){
      const name = getCurrentFileName(urlObj);
      return BLOCKED_FILES.has(name);
    }

    function isInternalHtml(urlObj){
      if(!urlObj || urlObj.origin !== location.origin) return false;
      const pathname = String(urlObj.pathname || "").toLowerCase();
      if(!pathname.endsWith(".html")) return false;
      if(isBlockedPath(urlObj)) return false;
      return true;
    }

    function isPjaxAllowedUrl(urlObj){
      if(!isInternalHtml(urlObj)) return false;
      if (window.matchMedia && window.matchMedia("(max-width:1024px)").matches) return false;
      const liveCurrent = getLiveCurrentFileName();
      if (BLOCKED_FILES.has(liveCurrent)) return false;
      if (PJAX_RUNTIME_BLOCKED.has(liveCurrent)) return false;
      const nextName = getCurrentFileName(urlObj);
      if (PJAX_RUNTIME_BLOCKED.has(nextName)) return false;
      return true;
    }

    function pickAnchorFromEventTarget(target){
      if(!(target instanceof Element)) return null;
      const anchor = target.closest("a[href]");
      if(!(anchor instanceof HTMLAnchorElement)) return null;
      if(anchor.hasAttribute("download")) return null;
      if(anchor.dataset && (anchor.dataset.noPjax === "1" || anchor.dataset.dokeNoPjax === "1")) return null;
      const targetAttr = String(anchor.getAttribute("target") || "").trim().toLowerCase();
      if(targetAttr && targetAttr !== "_self") return null;
      const href = String(anchor.getAttribute("href") || "").trim();
      if(!href || href.startsWith("#") || href.startsWith("javascript:")) return null;
      if(href.startsWith("mailto:") || href.startsWith("tel:")) return null;
      return anchor;
    }

    function resolveSwapRoot(docLike){
      if(!docLike) return null;
      return docLike.querySelector("main")
        || docLike.querySelector("[data-page-root]")
        || docLike.querySelector("#app-view > *")
        || docLike.querySelector(".main-content")
        || docLike.querySelector(".container > main");
    }

    function normalizeBodyClasses(nextBodyClass){
      const body = document.body;
      if(!body) return;
      const preserve = Array.from(body.classList).filter((cls) => (
        cls.startsWith("doke-")
        || cls === "no-scroll"
        || cls === "menu-ativo"
        || cls === "chat-keyboard-open"
      ));
      body.className = String(nextBodyClass || "");
      preserve.forEach((cls) => body.classList.add(cls));
    }

    function syncBodyState(doc){
      if(!doc || !doc.body) return;
      normalizeBodyClasses(doc.body.className);
      const nextPage = String(doc.body.getAttribute("data-page") || "").trim();
      if(nextPage) document.body.setAttribute("data-page", nextPage);
      else document.body.removeAttribute("data-page");
    }

    function getAssetMatchText(src){
      const raw = String(src || "").trim();
      if(!raw) return "";
      const rawLow = raw.toLowerCase();
      const pathLow = String(toUrl(raw)?.pathname || "").toLowerCase();
      return `${rawLow} ${pathLow}`;
    }

    function shouldSkipScript(src){
      const low = getAssetMatchText(src);
      if(!low) return true;
      return SCRIPT_SKIP_PARTS.some((part) => low.includes(part));
    }

    function shouldSkipStyle(href){
      const low = getAssetMatchText(href);
      if(!low) return true;
      return STYLE_SKIP_PARTS.some((part) => low.includes(part));
    }

    function cleanupDynamicScripts(){
      document.querySelectorAll("script[data-doke-pjax-script='1']").forEach((s) => s.remove());
    }

    function cleanupDynamicHeadAssets(){
      document.querySelectorAll("link[data-doke-pjax-head='1'], style[data-doke-pjax-head='1']").forEach((n) => n.remove());
    }

    function appendHeadAsset(node){
      return new Promise((resolve) => {
        if (!(node instanceof Element)) { resolve(); return; }
        if (node.tagName.toLowerCase() === "style") {
          const style = document.createElement("style");
          style.dataset.dokePjaxHead = "1";
          style.textContent = node.textContent || "";
          document.head.appendChild(style);
          resolve();
          return;
        }
        if (node.tagName.toLowerCase() === "link") {
          const rel = String(node.getAttribute("rel") || "").toLowerCase();
          if (rel !== "stylesheet") { resolve(); return; }
          const href = String(node.getAttribute("href") || "").trim();
          if (!href || shouldSkipStyle(href)) { resolve(); return; }
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = toUrl(href)?.toString() || href;
          link.dataset.dokePjaxHead = "1";
          link.onload = () => resolve();
          link.onerror = () => resolve();
          document.head.appendChild(link);
          return;
        }
        resolve();
      });
    }

    async function syncHeadAssets(doc){
      cleanupDynamicHeadAssets();
      const nodes = Array.from(doc.querySelectorAll("head style, head link[rel='stylesheet']"));
      for (const node of nodes) {
        try { await appendHeadAsset(node); } catch(_e) {}
      }
    }

    function extractCharsetHint(input){
      const txt = String(input || "");
      const m = txt.match(/charset\s*=\s*["']?\s*([a-z0-9._-]+)/i);
      return m ? String(m[1] || "").trim().toLowerCase() : "";
    }

    function normalizeCharsetName(charset){
      const c = String(charset || "").trim().toLowerCase();
      if (!c) return "utf-8";
      if (c === "utf8") return "utf-8";
      if (c === "latin1" || c === "iso-8859-1" || c === "iso8859-1" || c === "windows-1252") return "windows-1252";
      return c;
    }

    function mojibakeScore(text){
      const t = String(text || "");
      if(!t) return 0;
      const hits = t.match(/Ã.|Â.|�/g);
      return hits ? hits.length : 0;
    }

    async function readHtmlResponse(res){
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const decode = (encoding) => {
        try { return new TextDecoder(encoding, { fatal: false }).decode(bytes); }
        catch(_e){ return ""; }
      };
      const utf8 = decode("utf-8");
      const headerCharset = extractCharsetHint(res.headers?.get?.("content-type") || "");
      const metaCharset = extractCharsetHint(utf8.slice(0, 4096));
      const hintedCharset = normalizeCharsetName(headerCharset || metaCharset || "utf-8");
      let html = decode(hintedCharset);
      if(!html) html = utf8;

      // Fallback anti-mojibake para páginas salvas em ANSI/Windows-1252.
      if (hintedCharset === "utf-8") {
        const latin = decode("windows-1252");
        if (latin && mojibakeScore(latin) < mojibakeScore(html)) html = latin;
      }
      return html;
    }

    function appendScriptNode(original, opts = {}){
      return new Promise((resolve) => {
        const s = document.createElement("script");
        s.dataset.dokePjaxScript = "1";
        if(original.type) s.type = original.type;
        if(original.noModule) s.noModule = true;
        if(original.referrerPolicy) s.referrerPolicy = original.referrerPolicy;
        if(original.crossOrigin) s.crossOrigin = original.crossOrigin;
        const src = String(original.getAttribute("src") || "").trim();
        if(src){
          const abs = toUrl(src)?.toString() || src;
          const alreadyLoaded = Array.from(document.querySelectorAll("script[src]")).some((node) => {
            const existingSrc = String(node.getAttribute("src") || "").trim();
            if(!existingSrc) return false;
            const existingAbs = toUrl(existingSrc)?.toString() || existingSrc;
            return existingAbs === abs;
          });
          if (alreadyLoaded) {
            resolve();
            return;
          }
          s.src = abs;
          s.async = false;
          s.onload = () => resolve();
          s.onerror = () => resolve();
          document.body.appendChild(s);
          return;
        }
        const inlineCode = String(original.textContent || "");
        const wrapInline = opts && opts.wrapInline === false ? false : true;
        // Some legacy pages (chat/pedidos) depend on globals shared across many inline blocks.
        s.textContent = wrapInline ? `(function(){\n${inlineCode}\n})();` : inlineCode;
        document.body.appendChild(s);
        resolve();
      });
    }

    async function runWithRuntimeTracking(executor){
      const windowTarget = window;
      const documentTarget = document;
      const trackedEvents = [];
      const trackedIntervals = [];
      const trackedTimeouts = [];
      const trackedRafs = [];

      const originalWindowAdd = windowTarget.addEventListener;
      const originalWindowRemove = windowTarget.removeEventListener;
      const originalDocumentAdd = documentTarget.addEventListener;
      const originalDocumentRemove = documentTarget.removeEventListener;
      const originalSetInterval = window.setInterval;
      const originalClearInterval = window.clearInterval;
      const originalSetTimeout = window.setTimeout;
      const originalClearTimeout = window.clearTimeout;
      const originalRaf = window.requestAnimationFrame;
      const originalCancelRaf = window.cancelAnimationFrame;

      const trackAdd = (target, type, listener, options) => {
        if (!target || !type || !listener) return;
        trackedEvents.push({ target, type, listener, options });
      };
      const trackRemove = (target, type, listener) => {
        if (!target || !type || !listener) return;
        for (let i = trackedEvents.length - 1; i >= 0; i--) {
          const e = trackedEvents[i];
          if (e.target === target && e.type === type && e.listener === listener) {
            trackedEvents.splice(i, 1);
            break;
          }
        }
      };

      try{
        windowTarget.addEventListener = function(type, listener, options){
          trackAdd(windowTarget, type, listener, options);
          return originalWindowAdd.call(windowTarget, type, listener, options);
        };
        windowTarget.removeEventListener = function(type, listener, options){
          trackRemove(windowTarget, type, listener);
          return originalWindowRemove.call(windowTarget, type, listener, options);
        };
        documentTarget.addEventListener = function(type, listener, options){
          trackAdd(documentTarget, type, listener, options);
          return originalDocumentAdd.call(documentTarget, type, listener, options);
        };
        documentTarget.removeEventListener = function(type, listener, options){
          trackRemove(documentTarget, type, listener);
          return originalDocumentRemove.call(documentTarget, type, listener, options);
        };
        window.setInterval = function(handler, timeout){
          const id = originalSetInterval.apply(window, arguments);
          trackedIntervals.push(id);
          return id;
        };
        window.setTimeout = function(handler, timeout){
          const id = originalSetTimeout.apply(window, arguments);
          trackedTimeouts.push(id);
          return id;
        };
        if (typeof originalRaf === "function" && typeof originalCancelRaf === "function") {
          window.requestAnimationFrame = function(callback){
            const id = originalRaf.call(window, callback);
            trackedRafs.push(id);
            return id;
          };
        }

        await executor();
      }finally{
        windowTarget.addEventListener = originalWindowAdd;
        windowTarget.removeEventListener = originalWindowRemove;
        documentTarget.addEventListener = originalDocumentAdd;
        documentTarget.removeEventListener = originalDocumentRemove;
        window.setInterval = originalSetInterval;
        window.clearInterval = originalClearInterval;
        window.setTimeout = originalSetTimeout;
        window.clearTimeout = originalClearTimeout;
        if (typeof originalRaf === "function" && typeof originalCancelRaf === "function") {
          window.requestAnimationFrame = originalRaf;
          window.cancelAnimationFrame = originalCancelRaf;
        }

        trackedEvents.forEach((e) => {
          window.dokeRegisterTeardown(() => {
            try { e.target.removeEventListener(e.type, e.listener, e.options); } catch(_e){}
          });
        });
        trackedIntervals.forEach((id) => {
          window.dokeRegisterTeardown(() => {
            try { originalClearInterval.call(window, id); } catch(_e){}
          });
        });
        trackedTimeouts.forEach((id) => {
          window.dokeRegisterTeardown(() => {
            try { originalClearTimeout.call(window, id); } catch(_e){}
          });
        });
        trackedRafs.forEach((id) => {
          window.dokeRegisterTeardown(() => {
            try { originalCancelRaf.call(window, id); } catch(_e){}
          });
        });
      }
    }

    async function runPageScripts(doc, swappedRoot, targetFile = ""){
      cleanupDynamicScripts();
      const tasks = [];
      const needsGlobalInline = new Set(["mensagens.html", "pedidos.html", "pedido.html"]);
      const wrapInline = !needsGlobalInline.has(String(targetFile || "").toLowerCase());
      const scheduledExternalScripts = new Set();
      const headScripts = Array.from(doc.querySelectorAll("head script[src]"));
      headScripts.forEach((scriptEl) => {
        const src = String(scriptEl.getAttribute("src") || "").trim();
        if(!src || shouldSkipScript(src)) return;
        const key = String(toUrl(src)?.toString() || src).toLowerCase();
        if (scheduledExternalScripts.has(key)) return;
        scheduledExternalScripts.add(key);
        tasks.push(() => appendScriptNode(scriptEl));
      });
      const bodyScripts = Array.from(doc.querySelectorAll("body script"));
      bodyScripts.forEach((scriptEl) => {
        const src = String(scriptEl.getAttribute("src") || "").trim();
        if(src){
          if(shouldSkipScript(src)) return;
          const key = String(toUrl(src)?.toString() || src).toLowerCase();
          if (scheduledExternalScripts.has(key)) return;
          scheduledExternalScripts.add(key);
          tasks.push(() => appendScriptNode(scriptEl));
          return;
        }
        if(swappedRoot && swappedRoot.contains(scriptEl)){
          tasks.push(() => appendScriptNode(scriptEl, { wrapInline }));
        }
      });
      await runWithRuntimeTracking(async () => {
        for(const task of tasks){
          try { await task(); } catch(_e) {}
        }
      });
    }

    function syncPageUrl(urlObj, mode){
      const href = `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
      const state = { __dokePjax: 1, path: `${urlObj.pathname}${urlObj.search}` };
      if(mode === "replace") history.replaceState(state, "", href);
      else history.pushState(state, "", href);
    }
    function runRegisteredTeardowns(){
      const bag = window.__dokePageTeardowns;
      if(!Array.isArray(bag) || !bag.length) return;
      const toRun = bag.splice(0, bag.length);
      toRun.forEach((fn) => { try { if(typeof fn === "function") fn(); } catch(_e){} });
    }
    if(typeof window.dokeRegisterTeardown !== "function"){
      window.dokeRegisterTeardown = function(fn){
        if(typeof fn !== "function") return;
        if(!Array.isArray(window.__dokePageTeardowns)) window.__dokePageTeardowns = [];
        window.__dokePageTeardowns.push(fn);
      };
    }
    if(!window.dokePageRuntime){
      window.dokePageRuntime = {
        cleanup(fn){
          if(typeof fn !== "function") return;
          window.dokeRegisterTeardown(fn);
        },
        on(target, type, handler, options){
          if(!target || typeof target.addEventListener !== "function" || !type || typeof handler !== "function") return () => {};
          target.addEventListener(type, handler, options);
          const off = () => { try { target.removeEventListener(type, handler, options); } catch(_e){} };
          window.dokeRegisterTeardown(off);
          return off;
        },
        interval(handler, ms){
          const id = setInterval(handler, ms);
          window.dokeRegisterTeardown(() => { try { clearInterval(id); } catch(_e){} });
          return id;
        },
        timeout(handler, ms){
          const id = setTimeout(handler, ms);
          window.dokeRegisterTeardown(() => { try { clearTimeout(id); } catch(_e){} });
          return id;
        },
        observer(observer){
          if(observer && typeof observer.disconnect === "function"){
            window.dokeRegisterTeardown(() => { try { observer.disconnect(); } catch(_e){} });
          }
          return observer;
        }
      };
    }

    async function navigateInPlace(urlObj, mode){
      if(!isPjaxAllowedUrl(urlObj)) return false;
      const liveCurrent = getLiveCurrentFileName();
      if(BLOCKED_FILES.has(liveCurrent)) return false;
      const currentPath = `${location.pathname}${location.search}`;
      const nextPath = `${urlObj.pathname}${urlObj.search}`;
      if(currentPath === nextPath && !urlObj.hash) return false;
      const currentRoot = resolveSwapRoot(document);
      if(!currentRoot) return false;
      if (inflightController) {
        try { inflightController.abort(); } catch(_e) {}
      }
      inflightController = new AbortController();
      document.body.classList.add("doke-nav-pending");
      try{
        const res = await fetch(urlObj.toString(), {
          method: "GET",
          credentials: "same-origin",
          headers: {
            "X-Requested-With": "doke-shell-pjax",
            "Accept": "text/html"
          },
          signal: inflightController.signal
        });
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await readHtmlResponse(res);
        const parser = new DOMParser();
        const nextDoc = parser.parseFromString(html, "text/html");
        const nextRoot = resolveSwapRoot(nextDoc);
        if(!nextRoot) throw new Error("Target root not found");
        await syncHeadAssets(nextDoc);
        try { window.dispatchEvent(new CustomEvent("doke:page-will-swap", { detail: { from: currentPath, to: nextPath } })); } catch(_e) {}
        runRegisteredTeardowns();

        const imported = document.importNode(nextRoot, true);
        currentRoot.replaceWith(imported);
        syncBodyState(nextDoc);
        if(nextDoc.title) document.title = nextDoc.title;
        syncPageUrl(urlObj, mode);
        window.scrollTo(0, 0);
        try { sessionStorage.setItem(`doke_scroll_pos_v1:${nextPath}`, "0"); } catch(_e) {}
        try { window.dispatchEvent(new CustomEvent("doke:page-swapped", { detail: { path: nextPath } })); } catch(_e) {}
        const nextFile = getCurrentFileName(urlObj);
        await runPageScripts(nextDoc, nextRoot, nextFile);
        const legacyDomReplayFiles = new Set(["mensagens.html", "pedidos.html", "pedido.html"]);
        if (legacyDomReplayFiles.has(String(nextFile || "").toLowerCase())) {
          try { document.dispatchEvent(new Event("DOMContentLoaded")); } catch(_e) {}
        }
        try { window.dispatchEvent(new Event("doke:page-ready")); } catch(_e) {}
        ensureShell();
        return true;
      }catch(err){
        if(err && err.name === "AbortError") return false;
        return false;
      }finally{
        inflightController = null;
        document.body.classList.remove("doke-nav-pending");
      }
    }

    if(!history.state || !history.state.__dokePjax){
      try{
        history.replaceState({ __dokePjax: 1, path: `${location.pathname}${location.search}` }, "", `${location.pathname}${location.search}${location.hash}`);
      }catch(_e){}
    }

    document.addEventListener("click", async (ev) => {
      if(ev.defaultPrevented) return;
      if(ev.button !== 0) return;
      if(ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const a = pickAnchorFromEventTarget(ev.target);
      if(!a) return;
      const urlObj = toUrl(a.getAttribute("href"));
      if(!isPjaxAllowedUrl(urlObj)) return;
      ev.preventDefault();
      const ok = await navigateInPlace(urlObj, "push");
      if(!ok) location.href = urlObj.toString();
    }, true);

    window.addEventListener("popstate", async () => {
      const urlObj = new URL(location.href);
      if(!isPjaxAllowedUrl(urlObj)) return;
      const ok = await navigateInPlace(urlObj, "replace");
      if(!ok) location.reload();
    });
  }

  MQ.addEventListener?.("change", ()=>{
    if(MQ.matches) ensureShell();
    else document.body.classList.remove("doke-modal-open");
    try { ensureCompactSidebarMode(); } catch(_e) {}
  });
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", ()=>{
      normalizeLegacyAppUrl();
      consumeFlashNotice();
      initDesktopNavPerf();
      initAppLikeNavigationState();
      warmupCorePages();
      normalizeLegacyAppLinks();
      initPersistentShellNavigation();
      ensureShell();
    });
  }else{
    normalizeLegacyAppUrl();
    consumeFlashNotice();
    initDesktopNavPerf();
    initAppLikeNavigationState();
    warmupCorePages();
    normalizeLegacyAppLinks();
    initPersistentShellNavigation();
    ensureShell();
  }
})();
