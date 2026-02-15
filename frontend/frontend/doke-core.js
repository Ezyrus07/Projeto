/* ============================================================
   DOKE — Core (Global)
   ------------------------------------------------------------
   Objetivo:
   - Criar uma base comum para TODAS as páginas (HTMLs) "conversarem"
   - Sem quebrar o script.js antigo (quando ele existe)
   - Melhorar consistência de: Auth (header), Localização (CEP/cidade/bairro),
     eventos globais e helpers.
   ------------------------------------------------------------
   Carregado via <script defer src="doke-core.js?..."></script>
   ============================================================ */
(function () {
  "use strict";

  const Doke = (window.Doke = window.Doke || {});
  const bus = (Doke.bus = Doke.bus || new EventTarget());

  const file = (location.pathname.split("/").pop() || "").toLowerCase();
  const pageFromBody = document.body && document.body.dataset ? (document.body.dataset.page || "") : "";
  const page = (pageFromBody || file.replace(".html", "") || "page").toLowerCase();
  Doke.page = page;

  Doke.on = function (name, handler) {
    try { bus.addEventListener(name, handler); } catch (_) {}
  };
  Doke.emit = function (name, detail) {
    try { bus.dispatchEvent(new CustomEvent(name, { detail })); } catch (_) {}
  };

  // ------------------------------------------------------------
  // Auth helpers (Supabase como verdade; localStorage como cache)
  // ------------------------------------------------------------
  const AUTH_CACHE_KEYS = [
    "doke_usuario_logado",
    "doke_usuario_perfil",
    "usuarioLogado",
    "usuario_logado",
    "userLogado",
  ];

  function safeJsonParse(str) {
    try { return JSON.parse(str); } catch (_) { return null; }
  }

  function getCachedUser() {
    for (const k of AUTH_CACHE_KEYS) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const obj = safeJsonParse(raw);
      if (!obj) continue;

      // formatos comuns:
      // { id, nome, email, tipo } OU { uid, ... } OU { user: {id...}}
      const u = obj.user || obj.usuario || obj;
      const id = u.id || u.uid || u.user_id || u.userId;
      if (id) return {
        id,
        email: u.email || obj.email || "",
        nome: u.nome || u.name || obj.nome || "",
        tipo: u.tipo || u.role || obj.tipo || ""
      };
    }
    return null;
  }

  
async function getSupabaseUser() {
    try {
      const sb = window.sb;
      if (!sb || !sb.auth || typeof sb.auth.getSession !== "function") return null;

      // getSession() é local (não depende de rede), evita "meio logado" quando a rede falha.
      const { data } = await sb.auth.getSession();
      const u = data && data.session && data.session.user ? data.session.user : null;
      if (!u) return null;
      return { id: u.id, email: u.email || "" };
    } catch (_) {
      return null;
    }
  }

  Doke.auth = Doke.auth || {};
  Doke.auth.getUser = async function () {
    const sbUser = await getSupabaseUser();
    if (sbUser) return sbUser;
    return getCachedUser();
  };
  Doke.auth.isLoggedIn = async function () {
    const u = await Doke.auth.getSession();
    return !!(u && u.id);
  };
  Doke.auth.logout = async function () {
    try { await window.sb?.auth?.signOut?.(); } catch (_) {}
    // limpa caches comuns
    AUTH_CACHE_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
    try { localStorage.removeItem("doke_localizacao"); } catch (_) {}
    location.href = "index.html";
  };

  // ------------------------------------------------------------
  // UI helpers (header auth + localização)
  // ------------------------------------------------------------
  function setHeaderAreaHTML(el, html) {
    if (!el) return;
    if (el.dataset && el.dataset.dokeAuthApplied === "1") return;
    el.innerHTML = html;
    if (el.dataset) el.dataset.dokeAuthApplied = "1";
  }

  function looksLikeGuestArea(el) {
    if (!el) return false;
    const text = (el.textContent || "").toLowerCase();
    const hasEntrar = text.includes("entrar") || text.includes("login");
    const hasLoginHref = !!el.querySelector('a[href*="login.html"]');
    return hasEntrar || hasLoginHref;
  }

  function getDisplayNameFallback() {
    const cached = getCachedUser();
    if (cached && cached.nome) return cached.nome;
    return "Meu perfil";
  }

  function installHeaderAuth(user) {
    const desktopArea =
      document.getElementById("header-user-area") ||
      document.querySelector(".navbar-desktop .botoes-direita");

    const mobileArea =
      document.getElementById("header-user-mobile") ||
      document.querySelector(".navbar-mobile .botoes-direita");

    const loggedIn = user && user.id;

    if (loggedIn) {
      const label = getDisplayNameFallback();
      const profileHTML = `
        <a class="entrar" href="meuperfil.html" style="display:inline-flex;align-items:center;gap:8px;">
          <i class='bx bx-user' style="font-size:18px;"></i>
          <span>${escapeHtml(label)}</span>
        </a>
      `;
      if (desktopArea && looksLikeGuestArea(desktopArea)) setHeaderAreaHTML(desktopArea, profileHTML);

      // no mobile normalmente é <a id="header-user-mobile">Entrar</a>, então tratamos direto
      const mobileLink = document.getElementById("header-user-mobile");
      if (mobileLink && mobileLink.tagName === "A") {
        mobileLink.href = "meuperfil.html";
        mobileLink.textContent = "Perfil";
      } else if (mobileArea && looksLikeGuestArea(mobileArea)) {
        setHeaderAreaHTML(mobileArea, profileHTML);
      }
    } else {
      // se quiser, dá para padronizar guest; aqui só não força (evita brigar com script.js)
    }
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m]));
  }

  function updateLocationUI() {
    const span = document.getElementById("textoCepSpan");
    const input = document.getElementById("inputCep");
    if (!span && !input) return;

    // tenta puxar payload completo (cidade/bairro/uf) se existir
    const saved = safeJsonParse(localStorage.getItem("doke_localizacao") || "null");
    const cepFallback = localStorage.getItem("meu_cep_doke") || "";

    const payload = saved || (cepFallback ? { cep: cepFallback } : null);

    if (payload) {
      if (typeof window.atualizarTelaCep === "function") {
        window.atualizarTelaCep(payload);
      } else {
        // fallback simples
        const cidade = payload.cidade || "";
        const bairro = payload.bairro || "";
        const cep = payload.cep || "";
        if (span) {
          if (bairro && cidade) span.textContent = `${bairro}, ${cidade}`;
          else if (cep) span.textContent = `CEP: ${cep}`;
          else span.textContent = "Inserir CEP";
        }
        if (input && cep) input.value = cep;
      }
    }
  }

  // ------------------------------------------------------------
  // Init (idempotente)
  // ------------------------------------------------------------
  async function init() {
    if (window.__DOKE_CORE_INITED__) return;
    window.__DOKE_CORE_INITED__ = true;

    // 1) Auth no header
    const user = await Doke.auth.getSession();
    installHeaderAuth(user);

    // 2) Localização
    updateLocationUI();

    // 3) Eventos globais
    Doke.emit("doke:ready", { page, user: user || null });
  }

  // Se for defer, DOM já está em parse; ainda garantimos
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();


