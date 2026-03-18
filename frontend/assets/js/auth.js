(function () {
  "use strict";

  if (window.DokeAuth) return;

  const AUTH = {};
  const AUTH_MARKER_UID = "doke_uid";
  const AUTH_MARKER_FLAG = "usuarioLogado";
  const AUTH_VERIFIED_AT = "doke_auth_verified_at";
  const AUTH_FORCE_LOGOUT_AT = "doke_force_logged_out_at";
  const AUTH_SESSION_BACKUP = "doke_auth_session_backup";
  const DEV_SESSION_COOKIE = "doke_dev_session";

  function now() {
    return Date.now();
  }

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

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

  function buildSessionCandidate(source) {
    if (!source || typeof source !== "object") return null;
    const sessions = [source, source.currentSession, source.session, source.data && source.data.session];
    for (let i = 0; i < sessions.length; i += 1) {
      const session = sessions[i];
      if (!session || typeof session !== "object") continue;
      const access = String(session.access_token || "").trim();
      if (!access) continue;
      const payload = decodeJwtPayload(access);
      const expiresAtMs = normalizeExpMs(session.expires_at || session.expiresAt || (payload && payload.exp));
      if (expiresAtMs && expiresAtMs <= (now() + 10000)) continue;
      const user = session.user && typeof session.user === "object" ? session.user : null;
      const uid = String((user && (user.id || user.uid)) || (payload && payload.sub) || "").trim();
      return {
        access_token: access,
        refresh_token: String(session.refresh_token || "").trim(),
        expires_at_ms: expiresAtMs,
        uid,
        user: user || (uid ? { id: uid, uid } : null)
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
        const decoded = decodeURIComponent(item.slice(needle.length));
        const parsed = buildSessionCandidate(readJson(decoded));
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
        const candidate = buildSessionCandidate(readJson(localStorage.getItem(key) || ""));
        if (candidate) return candidate;
      }
    } catch (_e) {}
    const backup = buildSessionCandidate(readJson(localStorage.getItem(AUTH_SESSION_BACKUP) || ""));
    if (backup) return backup;
    return readSessionFromCookie(DEV_SESSION_COOKIE);
  }

  function hasForcedLogoutMarker() {
    try {
      const forcedAt = Number(localStorage.getItem(AUTH_FORCE_LOGOUT_AT) || sessionStorage.getItem(AUTH_FORCE_LOGOUT_AT) || 0);
      return Number.isFinite(forcedAt) && forcedAt > 0 && (now() - forcedAt) < 1000 * 60 * 60 * 24 * 7;
    } catch (_e) {
      return false;
    }
  }

  function persistLoginMarkers(uid) {
    try {
      const safeUid = String(uid || "").trim();
      if (safeUid) localStorage.setItem(AUTH_MARKER_UID, safeUid);
      localStorage.setItem(AUTH_MARKER_FLAG, "true");
      localStorage.setItem(AUTH_VERIFIED_AT, String(now()));
      sessionStorage.setItem(AUTH_VERIFIED_AT, String(now()));
    } catch (_e) {}
  }

  function hasTrustedLoginMarkers(maxAgeMs) {
    try {
      const verifiedAt = Number(localStorage.getItem(AUTH_VERIFIED_AT) || sessionStorage.getItem(AUTH_VERIFIED_AT) || 0);
      const maxAge = clampNumber(maxAgeMs, 1000, 1000 * 60 * 60 * 24 * 30, 1000 * 60 * 60 * 24 * 14);
      if (!Number.isFinite(verifiedAt) || verifiedAt <= 0 || (now() - verifiedAt) > maxAge) return false;
      const uid = String(localStorage.getItem(AUTH_MARKER_UID) || "").trim();
      if (!uid) return false;
      const flag = String(localStorage.getItem(AUTH_MARKER_FLAG) || "").toLowerCase();
      return flag === "true" || flag === "1";
    } catch (_e) {
      return false;
    }
  }

  function getSupabaseClient() {
    const candidates = [window.sb, window.supabaseClient, window.sbClient, window.__supabaseClient];
    for (let i = 0; i < candidates.length; i += 1) {
      const client = candidates[i];
      if (client && client.auth && typeof client.auth.getSession === "function") return client;
    }
    return null;
  }

  function waitForSupabase(timeoutMs) {
    const timeout = Math.max(0, Number(timeoutMs) || 0);
    return new Promise((resolve) => {
      const ready = getSupabaseClient();
      if (ready) return resolve(ready);
      if (!timeout) return resolve(null);
      const startedAt = now();
      const timer = setInterval(() => {
        const client = getSupabaseClient();
        if (client) {
          clearInterval(timer);
          resolve(client);
          return;
        }
        if ((now() - startedAt) >= timeout) {
          clearInterval(timer);
          resolve(null);
        }
      }, 40);
    });
  }

  async function getLiveSession(timeoutMs) {
    const client = await waitForSupabase(timeoutMs);
    if (!client) return { status: "unknown", client: null, session: null, user: null };
    try {
      const sessionRes = await client.auth.getSession();
      const session = sessionRes && sessionRes.data ? sessionRes.data.session : null;
      if (session && session.user && session.access_token) {
        if (session.expires_at && Number(session.expires_at) * 1000 <= now()) {
          return { status: "anonymous", client, session: null, user: null };
        }
        try {
          if (typeof client.auth.getUser === "function") {
            const userRes = await client.auth.getUser();
            const user = userRes && userRes.data ? userRes.data.user : null;
            if (!user || !user.id) return { status: "anonymous", client, session: null, user: null };
          }
        } catch (_e) {
          return { status: "anonymous", client, session: null, user: null };
        }
        persistLoginMarkers(String(session.user.id || session.user.uid || ""));
        return { status: "authenticated", client, session, user: session.user };
      }
      return { status: "anonymous", client, session: null, user: null };
    } catch (_e) {
      return { status: "unknown", client, session: null, user: null };
    }
  }

  async function resolveAuthState(options) {
    const liveTimeoutMs = clampNumber(options && options.liveTimeoutMs, 0, 5000, 1800);
    const markerMaxAgeMs = clampNumber(options && options.markerMaxAgeMs, 1000, 1000 * 60 * 60 * 24 * 30, 1000 * 60 * 60 * 24 * 14);
    if (hasForcedLogoutMarker()) {
      return { status: "anonymous", uid: "", source: "forced_logout", session: null };
    }

    const storedSession = getStoredSessionCandidate();
    if (storedSession && storedSession.uid) persistLoginMarkers(storedSession.uid);

    const live = await getLiveSession(liveTimeoutMs);
    if (live.status === "authenticated") {
      return {
        status: "authenticated",
        uid: String((live.user && (live.user.id || live.user.uid)) || "").trim(),
        source: "supabase_live",
        session: live.session
      };
    }
    if (live.status === "anonymous") {
      return { status: "anonymous", uid: "", source: "supabase_anonymous", session: null };
    }

    // Supabase not ready/unknown: controlled fallback
    if (storedSession && storedSession.access_token) {
      return { status: "authenticated", uid: String(storedSession.uid || "").trim(), source: "storage_session", session: storedSession };
    }
    if (hasTrustedLoginMarkers(markerMaxAgeMs)) {
      return { status: "authenticated", uid: String(localStorage.getItem(AUTH_MARKER_UID) || "").trim(), source: "markers", session: null };
    }
    return { status: "anonymous", uid: "", source: "no_evidence", session: null };
  }

  function buildNextParam() {
    try {
      const file = String((location.pathname || "").split("/").pop() || "index.html");
      return `${file}${location.search || ""}${location.hash || ""}`;
    } catch (_e) {
      return "index.html";
    }
  }

  function redirectToLogin(next) {
    const target = String(next || "").trim() || buildNextParam();
    location.replace(`login.html?noshell=1&next=${encodeURIComponent(target)}`);
  }

  function cloakPage() {
    try {
      document.documentElement.style.visibility = "hidden";
    } catch (_e) {}
  }

  function releasePage() {
    try {
      document.documentElement.style.visibility = "";
    } catch (_e) {}
  }

  AUTH.resolveAuthState = resolveAuthState;
  AUTH.requireAuth = async function requireAuth(options) {
    const next = (options && options.next) || buildNextParam();
    cloakPage();
    const state = await resolveAuthState(options);
    if (state.status === "authenticated") {
      releasePage();
      return state;
    }
    redirectToLogin(next);
    return state;
  };
  AUTH.getUid = async function getUid(options) {
    const state = await resolveAuthState(options);
    return state.status === "authenticated" ? String(state.uid || "") : "";
  };

  window.DokeAuth = AUTH;
})();

