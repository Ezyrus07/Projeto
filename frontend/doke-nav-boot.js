(function () {
  const NAV_PREBOOT_KEY = "doke_nav_preboot_target_v1";
  const ENTER_CLASS = "doke-nav-enter";
  const READY_CLASS = "doke-nav-enter-ready";
  const currentPath = `${location.pathname || ""}${location.search || ""}`;
  const currentFileName = String((location.pathname || "").split("/").pop() || "").toLowerCase();
  const isHomePage = currentFileName === "" || currentFileName === "index.html";
  const LOGO_SRC = "assets/Imagens/doke-logo.png";
  const TRANSITION_MIN_MS = 420;
  const TRANSITION_FADE_MS = 220;
  const BOOT_HOLD_ATTR = "data-doke-boot-hold";
  const BOOT_HOLD_TIMEOUT_MS = 4500;
  let overlayShownAt = 0;
  let overlayClearTimer = 0;
  let overlayHoldTimer = 0;
  let overlayHoldReleased = false;
  const protectedFiles = new Set([
    "acompanhamento-profissional.html",
    "admin-validacoes.html",
    "ajuda.html",
    "anunciar-negocio.html",
    "anunciar.html",
    "avaliar.html",
    "carteira.html",
    "dadospessoais.html",
    "editar-anuncio.html",
    "enderecos.html",
    "estatistica.html",
    "historico.html",
    "mais.html",
    "meuempreendimento.html",
    "meuperfil.html",
    "mensagens.html",
    "notificacoes.html",
    "orcamento.html",
    "pagamentos.html",
    "pagar.html",
    "pedido.html",
    "pedidos.html",
    "perfil-cliente.html",
    "perfil-empresa.html",
    "perfil-profissional.html",
    "perfil-usuario.html",
    "perfil.html",
    "preferencia-notif.html",
    "privacidade.html",
    "projeto.html",
    "publicacoes.html",
    "senha.html",
    "tornar-profissional.html"
  ]);

  function readJson(raw) {
    try {
      if (!raw) return null;
      let parsed = raw;
      for (let i = 0; i < 2; i += 1) {
        if (typeof parsed !== "string") break;
        parsed = parsed ? JSON.parse(parsed) : null;
      }
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_e) {
      return null;
    }
  }

  function decodeJwtPayload(token) {
    try {
      const parts = String(token || "").split(".");
      if (parts.length < 2) return null;
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = "=".repeat((4 - (b64.length % 4)) % 4);
      return JSON.parse(atob(b64 + pad));
    } catch (_e) {
      return null;
    }
  }

  function normalizeExpMs(rawExp) {
    const value = Number(rawExp || 0);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return value > 1000000000000 ? value : value * 1000;
  }

  function persistLoginMarkers(uid) {
    try {
      const safeUid = String(uid || "").trim();
      if (safeUid) localStorage.setItem("doke_uid", safeUid);
      localStorage.setItem("usuarioLogado", "true");
      localStorage.setItem("doke_auth_verified_at", String(Date.now()));
      sessionStorage.setItem("doke_auth_verified_at", String(Date.now()));
    } catch (_e) {}
  }

  function buildStoredSessionCandidate(source) {
    if (!source || typeof source !== "object") return null;
    const sessions = [source, source.currentSession, source.session, source.data && source.data.session];
    for (let i = 0; i < sessions.length; i += 1) {
      const session = sessions[i];
      if (!session || typeof session !== "object") continue;
      const access = String(session.access_token || "").trim();
      if (!access) continue;
      const payload = decodeJwtPayload(access);
      const expiresAtMs = normalizeExpMs(session.expires_at || session.expiresAt || (payload && payload.exp));
      if (expiresAtMs && expiresAtMs <= (Date.now() + 10000)) continue;
      const uid = String((session.user && (session.user.id || session.user.uid)) || (payload && payload.sub) || "").trim();
      return {
        access_token: access,
        expires_at_ms: expiresAtMs,
        uid
      };
    }
    return null;
  }

  function readSessionFromCookie(cookieName) {
    try {
      const needle = `${String(cookieName || "").trim()}=`;
      const parts = String(document.cookie || "").split(";");
      for (let i = 0; i < parts.length; i += 1) {
        const item = String(parts[i] || "").trim();
        if (!item.startsWith(needle)) continue;
        const parsed = buildStoredSessionCandidate(readJson(decodeURIComponent(item.slice(needle.length))));
        if (parsed) return parsed;
      }
    } catch (_e) {}
    return null;
  }

  function getStoredSessionCandidate() {
    try {
      const keys = Object.keys(localStorage || {});
      for (let i = 0; i < keys.length; i += 1) {
        const key = String(keys[i] || "");
        if (!/^sb-[a-z0-9-]+-auth-token$/i.test(key)) continue;
        const parsed = buildStoredSessionCandidate(readJson(localStorage.getItem(key) || ""));
        if (parsed) return parsed;
      }
    } catch (_e) {}
    const backup = buildStoredSessionCandidate(readJson(localStorage.getItem("doke_auth_session_backup") || ""));
    if (backup) return backup;
    return readSessionFromCookie("doke_dev_session");
  }

  function hasWeakTrustedMarkers() {
    try {
      const verifiedAt = Number(localStorage.getItem("doke_auth_verified_at") || sessionStorage.getItem("doke_auth_verified_at") || 0);
      if (!Number.isFinite(verifiedAt) || verifiedAt <= 0 || (Date.now() - verifiedAt) > 1000 * 60 * 60 * 24 * 14) return false;
      const uid = String(localStorage.getItem("doke_uid") || "").trim();
      if (!uid) return false;
      const flag = String(localStorage.getItem("usuarioLogado") || "").toLowerCase();
      return flag === "true" || flag === "1";
    } catch (_e) {
      return false;
    }
  }

  function hasValidStoredSession() {
    try {
      const logoutAt = Number(localStorage.getItem("doke_force_logged_out_at") || sessionStorage.getItem("doke_force_logged_out_at") || 0);
      if (Number.isFinite(logoutAt) && logoutAt > 0 && (Date.now() - logoutAt) < 1000 * 60 * 60 * 24 * 7) return false;
      const stored = getStoredSessionCandidate();
      if (stored && stored.access_token) {
        if (stored.uid) persistLoginMarkers(stored.uid);
        return true;
      }
      return hasWeakTrustedMarkers();
    } catch (_e) {
      return false;
    }
  }

  function toUrl(rawHref) {
    try {
      return new URL(String(rawHref || ""), location.href);
    } catch (_e) {
      return null;
    }
  }

  function isInternalHtmlUrl(url) {
    if (!url || url.origin !== location.origin) return false;
    if (url.hash && `${url.pathname}${url.search}` === `${location.pathname}${location.search}`) return false;
    return String(url.pathname || "").toLowerCase().endsWith(".html");
  }

  function extractInlineNavigationHref(rawOnclick) {
    const source = String(rawOnclick || "").trim();
    if (!source) return "";
    const assignMatch = source.match(/location(?:\.href)?\s*=\s*['"]([^'"]+\.html(?:[^'"]*)?)['"]/i);
    if (assignMatch && assignMatch[1]) return assignMatch[1];
    const callMatch = source.match(/location\.(?:assign|replace)\(\s*['"]([^'"]+\.html(?:[^'"]*)?)['"]\s*\)/i);
    return callMatch && callMatch[1] ? callMatch[1] : "";
  }

  function resolveNavigationUrlFromTarget(target) {
    if (!(target instanceof Element)) return null;
    const anchor = target.closest("a[href]");
    if (anchor instanceof HTMLAnchorElement) {
      if (anchor.hasAttribute("download")) return null;
      const targetAttr = String(anchor.getAttribute("target") || "").trim().toLowerCase();
      if (targetAttr && targetAttr !== "_self") return null;
      const anchorUrl = toUrl(anchor.getAttribute("href"));
      if (isInternalHtmlUrl(anchorUrl)) return anchorUrl;
    }

    const clickable = target.closest("[onclick]");
    if (!(clickable instanceof HTMLElement)) return null;
    const inlineHref = extractInlineNavigationHref(clickable.getAttribute("onclick") || "");
    const inlineUrl = toUrl(inlineHref);
    return isInternalHtmlUrl(inlineUrl) ? inlineUrl : null;
  }

  function markNextHtmlNavigation(url) {
    try {
      if (!isInternalHtmlUrl(url)) return;
      sessionStorage.setItem(NAV_PREBOOT_KEY, `${url.pathname || ""}${url.search || ""}`);
      if (document.body) document.body.classList.add("doke-nav-pending");
    } catch (_e) {}
  }

  function maybeRedirectProtectedPage() {
    try {
      if (!protectedFiles.has(currentFileName)) return false;
      if (hasValidStoredSession()) return false;
      try { document.documentElement.style.visibility = "hidden"; } catch (_e) {}
      const next = `${currentFileName || "index.html"}${location.search || ""}${location.hash || ""}`;
      location.replace(`login.html?noshell=1&next=${encodeURIComponent(next)}`);
      return true;
    } catch (_e) {
      return false;
    }
  }

  function cleanupDevServiceWorker() {
    try {
      if (!/^(localhost|127\.0\.0\.1)$/i.test(String(location.hostname || ""))) return;
      if (!("serviceWorker" in navigator)) return;
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
          try { reg.unregister(); } catch (_e) {}
        });
      }).catch(() => {});
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            try { caches.delete(key); } catch (_e) {}
          });
        }).catch(() => {});
      }
    } catch (_e) {}
  }

  function installStyle() {
    try {
      if (document.getElementById("dokeNavBootStyle")) return;
      const style = document.createElement("style");
      style.id = "dokeNavBootStyle";
      style.textContent = `
        #dokeNavBootOverlay{
          --doke-skel-base:#e8eef5;
          --doke-skel-glow:rgba(255,255,255,.82);
          position:fixed;
          inset:0;
          z-index:2147483647;
          opacity:0;
          pointer-events:none;
          background:linear-gradient(180deg,#f7fbff 0%,#eef5fb 100%);
          transition:opacity .14s ease;
        }
        html.${ENTER_CLASS} #dokeNavBootOverlay{ opacity:1; }
        .doke-nav-skeleton-shell{
          min-height:100%;
          padding:26px;
          display:grid;
          grid-template-rows:auto 1fr;
          gap:22px;
        }
        .doke-nav-skeleton-topbar{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          padding:18px 22px;
          border-radius:24px;
          background:rgba(255,255,255,.72);
          border:1px solid rgba(214,226,238,.9);
          box-shadow:0 20px 50px rgba(18,49,83,.08);
        }
        .doke-nav-skeleton-brand,
        .doke-nav-skeleton-actions{
          display:flex;
          align-items:center;
          gap:12px;
        }
        .doke-nav-skeleton-brand img{
          width:38px;
          height:38px;
          object-fit:contain;
          opacity:.9;
        }
        .doke-nav-skeleton-body{
          display:grid;
          grid-template-columns:minmax(220px,270px) minmax(0,1fr);
          gap:22px;
          min-height:0;
        }
        .doke-nav-skeleton-status{
          display:inline-flex;
          align-items:center;
          gap:10px;
          width:max-content;
          margin:0 4px;
          padding:10px 14px;
          border-radius:999px;
          background:rgba(255,255,255,.82);
          border:1px solid rgba(214,226,238,.92);
          box-shadow:0 14px 32px rgba(18,49,83,.08);
        }
        .doke-nav-skeleton-status-dot{
          width:10px;
          height:10px;
          border-radius:50%;
          background:#0b7768;
          box-shadow:0 0 0 0 rgba(11,119,104,.28);
          animation:dokeNavPulse 1.1s ease-out infinite;
        }
        .doke-nav-skeleton-status-text{
          color:#23415f;
          font-size:.94rem;
          font-weight:800;
          letter-spacing:.01em;
        }
        .doke-nav-skeleton-sidebar,
        .doke-nav-skeleton-main{
          background:rgba(255,255,255,.68);
          border:1px solid rgba(214,226,238,.88);
          box-shadow:0 20px 50px rgba(18,49,83,.08);
          border-radius:28px;
          padding:24px;
          display:grid;
          align-content:start;
          gap:16px;
        }
        .doke-nav-skeleton-main{ gap:18px; }
        .doke-nav-skeleton-grid{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:16px;
        }
        .doke-nav-skeleton-list{
          display:grid;
          gap:14px;
        }
        .doke-nav-skeleton-line,
        .doke-nav-skeleton-chip,
        .doke-nav-skeleton-avatar,
        .doke-nav-skeleton-box,
        .doke-nav-skeleton-hero,
        .doke-nav-skeleton-card,
        .doke-nav-skeleton-row{
          position:relative;
          overflow:hidden;
          background:var(--doke-skel-base);
        }
        .doke-nav-skeleton-line::after,
        .doke-nav-skeleton-chip::after,
        .doke-nav-skeleton-avatar::after,
        .doke-nav-skeleton-box::after,
        .doke-nav-skeleton-hero::after,
        .doke-nav-skeleton-card::after,
        .doke-nav-skeleton-row::after{
          content:"";
          position:absolute;
          inset:0;
          transform:translateX(-100%);
          background:linear-gradient(90deg,transparent 0%, var(--doke-skel-glow) 50%, transparent 100%);
          animation:dokeNavBootShimmer 1.05s linear infinite;
        }
        .doke-nav-skeleton-line{ height:14px; width:100%; border-radius:999px; }
        .doke-nav-skeleton-line.short{ width:62%; }
        .doke-nav-skeleton-line.is-brand{ width:128px; }
        .doke-nav-skeleton-chip{ width:96px; height:34px; border-radius:999px; }
        .doke-nav-skeleton-chip.short{ width:66px; }
        .doke-nav-skeleton-avatar{ width:42px; height:42px; border-radius:50%; }
        .doke-nav-skeleton-avatar.large{ width:78px; height:78px; }
        .doke-nav-skeleton-box{ height:92px; border-radius:22px; }
        .doke-nav-skeleton-hero{ height:180px; border-radius:26px; }
        .doke-nav-skeleton-card{ height:126px; border-radius:22px; }
        .doke-nav-skeleton-row{ height:76px; border-radius:20px; }
        @keyframes dokeNavBootShimmer{
          100%{ transform:translateX(100%); }
        }
        @keyframes dokeNavPulse{
          70%{ box-shadow:0 0 0 10px rgba(11,119,104,0); }
          100%{ box-shadow:0 0 0 0 rgba(11,119,104,0); }
        }
        @media (max-width: 900px){
          .doke-nav-skeleton-shell{ padding:18px; gap:16px; }
          .doke-nav-skeleton-body{ grid-template-columns:1fr; }
          .doke-nav-skeleton-sidebar{ display:none; }
          .doke-nav-skeleton-grid{ grid-template-columns:1fr; }
          .doke-nav-skeleton-topbar{ padding:16px 18px; }
        }
      `;
      document.head.appendChild(style);
      if (!document.getElementById("dokeNavBootOverlay")) {
        const overlay = document.createElement("div");
        overlay.id = "dokeNavBootOverlay";
        overlay.setAttribute("aria-hidden", "true");
        overlay.innerHTML = `
          <div class="doke-nav-skeleton-shell">
            <div class="doke-nav-skeleton-topbar">
              <div class="doke-nav-skeleton-brand">
                <img src="${LOGO_SRC}" alt="Doke">
                <span class="doke-nav-skeleton-line is-brand"></span>
              </div>
              <div class="doke-nav-skeleton-actions">
                <span class="doke-nav-skeleton-chip"></span>
                <span class="doke-nav-skeleton-chip short"></span>
                <span class="doke-nav-skeleton-avatar"></span>
              </div>
            </div>
            <div class="doke-nav-skeleton-status" aria-hidden="true">
              <span class="doke-nav-skeleton-status-dot"></span>
              <span class="doke-nav-skeleton-status-text">Carregando pagina</span>
            </div>
            <div class="doke-nav-skeleton-body">
              <div class="doke-nav-skeleton-sidebar">
                <span class="doke-nav-skeleton-avatar large"></span>
                <span class="doke-nav-skeleton-line"></span>
                <span class="doke-nav-skeleton-line short"></span>
                <span class="doke-nav-skeleton-box"></span>
                <span class="doke-nav-skeleton-box"></span>
              </div>
              <div class="doke-nav-skeleton-main">
                <div class="doke-nav-skeleton-hero"></div>
                <div class="doke-nav-skeleton-grid">
                  <span class="doke-nav-skeleton-card"></span>
                  <span class="doke-nav-skeleton-card"></span>
                  <span class="doke-nav-skeleton-card"></span>
                </div>
                <div class="doke-nav-skeleton-list">
                  <span class="doke-nav-skeleton-row"></span>
                  <span class="doke-nav-skeleton-row"></span>
                  <span class="doke-nav-skeleton-row"></span>
                </div>
              </div>
            </div>
          </div>
        `;
        (document.documentElement || document.body).appendChild(overlay);
      }
    } catch (_e) {}
  }

  function shouldBootTransition() {
    try {
      const targetPath = sessionStorage.getItem(NAV_PREBOOT_KEY) || "";
      return !!targetPath && targetPath === currentPath;
    } catch (_e) {
      return false;
    }
  }

  function getBootHoldToken() {
    try {
      const docToken = String(document.documentElement?.getAttribute(BOOT_HOLD_ATTR) || "").trim();
      if (docToken) return docToken;
    } catch (_e) {}
    try {
      return String(document.body?.getAttribute(BOOT_HOLD_ATTR) || "").trim();
    } catch (_e) {
      return "";
    }
  }

  function hasPendingBootHold() {
    return !!getBootHoldToken() && !overlayHoldReleased;
  }

  function releaseBootHold(token) {
    try {
      const currentToken = getBootHoldToken();
      if (token && currentToken && token !== currentToken) return false;
      overlayHoldReleased = true;
      clearTimeout(overlayHoldTimer);
      overlayHoldTimer = 0;
      try { document.documentElement.removeAttribute(BOOT_HOLD_ATTR); } catch (_e) {}
      try { document.body?.removeAttribute(BOOT_HOLD_ATTR); } catch (_e) {}
      finishOverlay();
      return true;
    } catch (_e) {
      return false;
    }
  }

  window.dokeReleaseBootTransition = releaseBootHold;

  function activateOverlay() {
    try {
      if (!shouldBootTransition()) return;
      installStyle();
      overlayShownAt = Date.now();
      overlayHoldReleased = !getBootHoldToken();
      clearTimeout(overlayHoldTimer);
      if (!overlayHoldReleased) {
        overlayHoldTimer = window.setTimeout(() => {
          overlayHoldReleased = true;
          finishOverlay();
        }, BOOT_HOLD_TIMEOUT_MS);
      }
      document.documentElement.classList.add(ENTER_CLASS);
    } catch (_e) {}
  }

  function clearOverlay() {
    try {
      clearTimeout(overlayClearTimer);
      overlayClearTimer = 0;
      clearTimeout(overlayHoldTimer);
      overlayHoldTimer = 0;
      overlayHoldReleased = false;
      sessionStorage.removeItem(NAV_PREBOOT_KEY);
      try { document.documentElement.removeAttribute(BOOT_HOLD_ATTR); } catch (_e) {}
      try { document.body?.removeAttribute(BOOT_HOLD_ATTR); } catch (_e) {}
      document.documentElement.classList.remove(ENTER_CLASS, READY_CLASS);
      try {
        const overlay = document.getElementById("dokeNavBootOverlay");
        if (overlay) overlay.remove();
      } catch (_e) {}
    } catch (_e) {}
  }

  function finishOverlay() {
    try {
      if (!document.documentElement.classList.contains(ENTER_CLASS)) return;
      if (hasPendingBootHold()) return;
      const waitMs = Math.max(0, TRANSITION_MIN_MS - (Date.now() - overlayShownAt));
      clearTimeout(overlayClearTimer);
      overlayClearTimer = window.setTimeout(() => {
        try {
          if (!document.documentElement.classList.contains(ENTER_CLASS)) return;
          document.documentElement.classList.add(READY_CLASS);
          window.setTimeout(clearOverlay, TRANSITION_FADE_MS);
        } catch (_e) {}
      }, waitMs);
    } catch (_e) {}
  }

  function forceHomeTop() {
    if (!isHomePage) return;
    try {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    } catch (_e) {}
    try {
      window.scrollTo(0, 0);
    } catch (_e) {}
  }

  cleanupDevServiceWorker();
  if (maybeRedirectProtectedPage()) return;

  activateOverlay();
  forceHomeTop();

  document.addEventListener("click", function (ev) {
    if (ev.defaultPrevented) return;
    if (ev.button !== 0) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const targetUrl = resolveNavigationUrlFromTarget(ev.target);
    if (!targetUrl) return;
    markNextHtmlNavigation(targetUrl);
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    requestAnimationFrame(forceHomeTop);
  }, { once: true });

  window.addEventListener("pageshow", function (ev) {
    requestAnimationFrame(forceHomeTop);
    if (ev && ev.persisted) finishOverlay();
  });

  window.addEventListener("load", function () {
    requestAnimationFrame(forceHomeTop);
    finishOverlay();
  }, { once: true });

  setTimeout(finishOverlay, 1800);
})();
