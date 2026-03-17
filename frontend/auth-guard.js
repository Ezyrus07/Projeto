(function () {
  try {
    var current = String((location.pathname || "").split("/").pop() || "index.html").toLowerCase();
    var publicFiles = new Set([
      "",
      "index.html",
      "login.html",
      "cadastro.html",
      "busca.html",
      "explorar.html",
      "feed.html",
      "comunidade.html",
      "grupo.html",
      "detalhes.html",
      "negocio.html",
      "negocios.html",
      "novidades.html",
      "sobre-doke.html",
      "videos-curtos.html",
      "resultado.html",
      "teste.html"
    ]);
    var protectedFiles = new Set([
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
    var protectedHints = [
      "pedido",
      "mensagen",
      "notific",
      "perfil",
      "conta",
      "preferencia",
      "senha",
      "privacidade",
      "pagamento",
      "carteira",
      "historico",
      "orcamento",
      "anunciar",
      "publicac",
      "projeto",
      "empreendimento",
      "estatistica",
      "admin-validacoes",
      "acompanhamento-profissional",
      "tornar-profissional"
    ];

    function isProtectedFile(fileName) {
      if (protectedFiles.has(fileName)) return true;
      if (publicFiles.has(fileName)) return false;
      for (var i = 0; i < protectedHints.length; i += 1) {
        if (fileName.indexOf(protectedHints[i]) !== -1) return true;
      }
      return false;
    }

    if (!isProtectedFile(current)) return;

    try { document.documentElement.style.visibility = "hidden"; } catch (_e) {}

    function readJson(raw) {
      try {
        if (!raw) return null;
        var parsed = raw;
        for (var i = 0; i < 2; i += 1) {
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
        var parts = String(token || "").split(".");
        if (parts.length < 2) return null;
        var b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        var pad = "=".repeat((4 - (b64.length % 4)) % 4);
        return JSON.parse(atob(b64 + pad));
      } catch (_e) {
        return null;
      }
    }

    function normalizeExpMs(rawExp) {
      var value = Number(rawExp || 0);
      if (!Number.isFinite(value) || value <= 0) return 0;
      return value > 1000000000000 ? value : value * 1000;
    }

    function buildSessionCandidate(source) {
      if (!source || typeof source !== "object") return null;
      var sessions = [
        source,
        source.currentSession,
        source.session,
        source.data && source.data.session
      ];
      for (var i = 0; i < sessions.length; i += 1) {
        var session = sessions[i];
        if (!session || typeof session !== "object") continue;
        var access = String(session.access_token || "").trim();
        if (!access) continue;
        var payload = decodeJwtPayload(access);
        var expiresAtMs = normalizeExpMs(session.expires_at || session.expiresAt || (payload && payload.exp));
        if (expiresAtMs && expiresAtMs <= (Date.now() + 10000)) continue;
        var user = session.user && typeof session.user === "object" ? session.user : null;
        var uid = String((user && (user.id || user.uid)) || (payload && payload.sub) || "").trim();
        return {
          access_token: access,
          refresh_token: String(session.refresh_token || "").trim(),
          expires_at_ms: expiresAtMs,
          uid: uid,
          user: user || (uid ? { id: uid, uid: uid, email: payload && payload.email ? payload.email : null } : null)
        };
      }
      return null;
    }

    function readSessionFromCookie(cookieName) {
      try {
        var needle = String(cookieName || "").trim() + "=";
        var parts = String(document.cookie || "").split(";");
        for (var i = 0; i < parts.length; i += 1) {
          var item = String(parts[i] || "").trim();
          if (!item.startsWith(needle)) continue;
          var decoded = decodeURIComponent(item.slice(needle.length));
          var parsed = buildSessionCandidate(readJson(decoded));
          if (parsed) return parsed;
        }
      } catch (_e) {}
      return null;
    }

    function getStoredSessionCandidate() {
      try {
        var keys = Object.keys(localStorage || {});
        for (var i = 0; i < keys.length; i += 1) {
          var key = String(keys[i] || "");
          if (!/^sb-[a-z0-9-]+-auth-token$/i.test(key)) continue;
          var candidate = buildSessionCandidate(readJson(localStorage.getItem(key) || ""));
          if (candidate) return candidate;
        }
      } catch (_e) {}
      var backup = buildSessionCandidate(readJson(localStorage.getItem("doke_auth_session_backup") || ""));
      if (backup) return backup;
      return readSessionFromCookie("doke_dev_session");
    }

    function hasForcedLogoutMarker() {
      var forcedLogoutAt = Number(localStorage.getItem("doke_force_logged_out_at") || sessionStorage.getItem("doke_force_logged_out_at") || 0);
      return Number.isFinite(forcedLogoutAt) && forcedLogoutAt > 0 && (Date.now() - forcedLogoutAt) < 1000 * 60 * 60 * 24 * 7;
    }

    function persistLoginMarkers(uid) {
      try {
        var safeUid = String(uid || "").trim();
        if (safeUid) localStorage.setItem("doke_uid", safeUid);
        localStorage.setItem("usuarioLogado", "true");
        localStorage.setItem("doke_auth_verified_at", String(Date.now()));
        sessionStorage.setItem("doke_auth_verified_at", String(Date.now()));
      } catch (_e) {}
    }

    function hasTrustedLoginMarkers() {
      try {
        var verifiedAt = Number(localStorage.getItem("doke_auth_verified_at") || sessionStorage.getItem("doke_auth_verified_at") || 0);
        if (!Number.isFinite(verifiedAt) || verifiedAt <= 0 || (Date.now() - verifiedAt) > 1000 * 60 * 60 * 24 * 14) return false;
        var uid = String(localStorage.getItem("doke_uid") || "").trim();
        if (!uid) return false;
        var flag = String(localStorage.getItem("usuarioLogado") || "").toLowerCase();
        return flag === "true" || flag === "1";
      } catch (_e) {
        return false;
      }
    }

    function hasLocalAuthEvidence() {
      if (hasForcedLogoutMarker()) return false;
      var storedSession = getStoredSessionCandidate();
      if (storedSession && storedSession.access_token) {
        if (storedSession.uid) persistLoginMarkers(storedSession.uid);
        return true;
      }
      return false;
    }

    function redirectToLogin() {
      var next = current + (location.search || "") + (location.hash || "");
      location.replace("login.html?noshell=1&next=" + encodeURIComponent(next));
    }

    function releasePage() {
      try { document.documentElement.style.visibility = ""; } catch (_e) {}
    }

    function getSupabaseClient() {
      var candidates = [window.sb, window.supabaseClient, window.sbClient, window.__supabaseClient, window.supabase];
      for (var i = 0; i < candidates.length; i += 1) {
        var client = candidates[i];
        if (client && client.auth && typeof client.auth.getSession === "function") return client;
      }
      return null;
    }

    function waitForSupabase(timeoutMs) {
      var timeout = Math.max(0, Number(timeoutMs) || 0);
      return new Promise(function (resolve) {
        var ready = getSupabaseClient();
        if (ready) {
          resolve(ready);
          return;
        }
        if (!timeout) {
          resolve(null);
          return;
        }
        var startedAt = Date.now();
        var timer = setInterval(function () {
          var client = getSupabaseClient();
          if (client) {
            clearInterval(timer);
            resolve(client);
            return;
          }
          if ((Date.now() - startedAt) >= timeout) {
            clearInterval(timer);
            resolve(null);
          }
        }, 40);
      });
    }

    async function hasLiveSession(storedSession) {
      var client = await waitForSupabase(900);
      if (!client) return null;
      try {
        var sessionRes = await client.auth.getSession();
        var session = sessionRes && sessionRes.data ? sessionRes.data.session : null;
        if (session && session.user && session.access_token) {
          if (session.expires_at && Number(session.expires_at) * 1000 <= Date.now()) return false;
          try {
            if (typeof client.auth.getUser === "function") {
              var userRes = await client.auth.getUser();
              var user = userRes && userRes.data ? userRes.data.user : null;
              if (!user || !user.id) return false;
            }
          } catch (_e) {
            return false;
          }
          persistLoginMarkers(String(session.user.id || session.user.uid || ""));
          return true;
        }

        if (storedSession && storedSession.access_token && typeof client.auth.getUser === "function") {
          try {
            var tokenUserRes = await client.auth.getUser(storedSession.access_token);
            var tokenUser = tokenUserRes && tokenUserRes.data ? tokenUserRes.data.user : null;
            if (tokenUser && (tokenUser.id || tokenUser.uid)) {
              persistLoginMarkers(String(tokenUser.id || tokenUser.uid || ""));
              return true;
            }
          } catch (_e) {}
        }

        return false;
      } catch (_e) {
        return false;
      }
    }

    (async function enforceAuth() {
      var storedSession = hasForcedLogoutMarker() ? null : getStoredSessionCandidate();
      if (storedSession && storedSession.uid) persistLoginMarkers(storedSession.uid);
      var liveSession = await hasLiveSession(storedSession);
      if (liveSession === true) {
        releasePage();
        return;
      }
      if (liveSession === false) {
        redirectToLogin();
        return;
      }
      // Only trust local/session markers when Supabase is not available yet.
      if (storedSession && storedSession.access_token) {
        releasePage();
        return;
      }
      if (hasLocalAuthEvidence()) {
        releasePage();
        return;
      }
      redirectToLogin();
    })();
  } catch (_e) {}
})();
