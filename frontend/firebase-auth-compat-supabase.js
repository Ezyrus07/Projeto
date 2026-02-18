// DOKE - Firebase Auth compat on top of Supabase Auth (bridge)
(function(){
  function isClient(obj){
    return obj && obj.auth && typeof obj.auth.getSession === "function";
  }
  const getClient = () => {
    const candidate =
      window.sb ||
      window.supabaseClient ||
      window.sbClient ||
      window.supabase;
    return isClient(candidate) ? candidate : null;
  };
  function ensure(){
    const c = getClient();
    if (!c) throw new Error("Supabase client não inicializado (supabase-init.js).");
    return c;
  }
  function normalizeUser(user){
    if (user && !user.uid && user.id) user.uid = user.id;
    if (user && !user.id && user.uid) user.id = user.uid;
    return user;
  }
  function safeStorageGet(key){
    try { return localStorage.getItem(key); } catch (_e) { return null; }
  }
  function safeStorageKeys(){
    try { return Object.keys(localStorage || {}); } catch (_e) { return []; }
  }
  function safeJsonParse(raw){
    try { return JSON.parse(raw); } catch (_e) { return null; }
  }
  function decodeJwtPayload(token){
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
  function buildCachedUserFromTokenStorage(){
    const extractUserFromRaw = (raw) => {
      if (!raw) return null;
      let parsed = safeJsonParse(raw);
      if (typeof parsed === "string") parsed = safeJsonParse(parsed);
      if (!parsed || typeof parsed !== "object") return null;
      const sessions = [parsed, parsed.currentSession, parsed.session, parsed.data?.session].filter(Boolean);
      for (const sess of sessions) {
        const token = String(sess?.access_token || "").trim();
        if (!token) continue;
        const payload = decodeJwtPayload(token);
        const expMs = Number(payload?.exp || 0) * 1000;
        if (expMs && expMs < (Date.now() - 60000)) continue;
        const fromUser = normalizeUser(sess?.user || null);
        if (fromUser?.uid) return fromUser;
        const uid = String(payload?.sub || "").trim();
        if (!uid) continue;
        return normalizeUser({ uid, id: uid, email: payload?.email || null });
      }
      return null;
    };
    try {
      const keys = safeStorageKeys().filter((k) => /^sb-[a-z0-9-]+-auth-token$/i.test(k));
      for (const key of keys) {
        const user = extractUserFromRaw(safeStorageGet(key));
        if (user) return user;
      }
    } catch (_e) {}

    try {
      const backupUser = extractUserFromRaw(safeStorageGet("doke_auth_session_backup"));
      if (backupUser) return backupUser;
    } catch (_e) {}

    try {
      const cookieName = "doke_dev_session=";
      const parts = String(document.cookie || "").split(";");
      for (const p of parts) {
        const item = String(p || "").trim();
        if (!item.startsWith(cookieName)) continue;
        const raw = decodeURIComponent(item.slice(cookieName.length));
        const cookieUser = extractUserFromRaw(raw);
        if (cookieUser) return cookieUser;
      }
    } catch (_e) {}

    return null;
  }
  function buildCachedUserFromLocalProfile(){
    try {
      const isLogged = safeStorageGet("usuarioLogado") === "true";
      if (!isLogged) return null;
      const perfil = safeJsonParse(safeStorageGet("doke_usuario_perfil") || "{}") || {};
      const uid = String(
        perfil.uid ||
        perfil.id ||
        perfil.user_uid ||
        perfil.userId ||
        safeStorageGet("doke_uid") ||
        ""
      ).trim();
      if (!uid) return null;
      return normalizeUser({
        uid,
        id: uid,
        email: perfil.email || null,
        user_metadata: {
          nome: perfil.nome || null,
          user: perfil.user || null,
          foto: perfil.foto || null
        }
      });
    } catch (_e) {
      return null;
    }
  }
  function getCachedAuthUserFallback(opts){
    const allowProfileFallback = !(opts && opts.allowProfileFallback === false);
    const tokenUser = buildCachedUserFromTokenStorage();
    if (tokenUser) return tokenUser;
    if (allowProfileFallback && window.DOKE_ALLOW_PROFILE_ONLY_AUTH === true) {
      return buildCachedUserFromLocalProfile() || null;
    }
    return null;
  }

  function buildUserFromSessionToken(sessionLike){
    const token = String(sessionLike?.access_token || "").trim();
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    const uid = String(payload?.sub || "").trim();
    if (!uid) return null;
    return normalizeUser({
      uid,
      id: uid,
      email: payload?.email || null,
      user_metadata: sessionLike?.user?.user_metadata || {}
    });
  }
  function isStrictSessionMode(){
    return window.DOKE_STRICT_AUTH_SESSION !== false;
  }
  function installCurrentUserAccessor(target){
    try {
      if (!target || typeof target !== "object") return;
      if (target.__DOKE_CURRENTUSER_ACCESSOR__) return;
      let shadow = normalizeUser(target.currentUser || null);
      Object.defineProperty(target, "currentUser", {
        configurable: true,
        enumerable: true,
        get(){
          if (shadow?.uid) return shadow;
          const cached = getCachedAuthUserFallback({ allowProfileFallback: false });
          if (cached?.uid) {
            shadow = normalizeUser(cached);
            return shadow;
          }
          return null;
        },
        set(value){
          shadow = normalizeUser(value || null);
        }
      });
      target.__DOKE_CURRENTUSER_ACCESSOR__ = true;
    } catch (_e) {}
  }
  async function resolveSessionOrCachedUser(sb){
    try {
      if (sb?.auth?.getSession) {
        const { data } = await sb.auth.getSession();
        const sessionUser = normalizeUser(data?.session?.user || null) || buildUserFromSessionToken(data?.session || null);
        if (sessionUser) return sessionUser;

        if (typeof window.dokeRestoreSupabaseSessionFromStorage === "function") {
          try {
            const restored = await window.dokeRestoreSupabaseSessionFromStorage({ force: true });
            if (restored) {
              const retry = await sb.auth.getSession();
              const retryUser = normalizeUser(retry?.data?.session?.user || null) || buildUserFromSessionToken(retry?.data?.session || null);
              if (retryUser) return retryUser;
            }
          } catch (_e) {}
        }

        if (sb?.auth?.getUser) {
          try {
            const u = await sb.auth.getUser();
            const gu = normalizeUser(u?.data?.user || null);
            if (gu) return gu;
          } catch (_e) {}
        }

        if (sb?.auth?.getUser && typeof window.dokeGetStoredSupabaseSessionCandidate === "function") {
          try {
            const stored = window.dokeGetStoredSupabaseSessionCandidate(true);
            const token = String(stored?.access_token || "").trim();
            if (token) {
              const byToken = await sb.auth.getUser(token);
              const tokenUser = normalizeUser(byToken?.data?.user || null);
              if (tokenUser) return tokenUser;
            }
          } catch (_e) {}
        }
      }
    } catch (_e) {}
    if (isStrictSessionMode()) return getCachedAuthUserFallback({ allowProfileFallback: false });
    return getCachedAuthUserFallback({ allowProfileFallback: true });
  }
  const ensureRowState = Object.create(null);
  const authObj = { currentUser: null, signOut: () => window.signOut() };
  installCurrentUserAccessor(authObj);
  window.getAuth = function(){ return authObj; };

  function setCurrentUser(user){
    const normalized = normalizeUser(user || null);
    installCurrentUserAccessor(authObj);
    authObj.currentUser = normalized;
    if (!window.auth || typeof window.auth !== "object") {
      window.auth = authObj;
    } else {
      installCurrentUserAccessor(window.auth);
      window.auth.currentUser = normalized;
    }
    return normalized;
  }

  async function __dokeEnsureUsuariosRow(user){
    try {
      const sb = getClient();
      if (!sb || !sb.from) return;
      const id = user?.id || user?.uid;
      if (!id) return;
      const now = Date.now();
      const st = ensureRowState[id] || { ok: false, failUntil: 0, running: false };
      if (st.ok) return;
      if (st.running) return;
      if (st.failUntil && now < st.failUntil) return;
      st.running = true;
      ensureRowState[id] = st;
      // tenta criar/atualizar o registro do usuario para destravar perfil/feed
      const meta = user?.user_metadata || user?.user_metadata || {};
      const nome = meta?.nome || meta?.name || (user?.email ? String(user.email).split('@')[0] : null) || null;
      const handle = meta?.user || meta?.username || null;
      const foto = meta?.foto || meta?.avatar_url || null;
      const payload = { id, uid: String(id), nome, user: handle, foto };
      const { error } = await sb.from('usuarios').upsert(payload, { onConflict: 'id' });
      if (error) {
        const msg = String(error.message || '').toLowerCase();
        st.failUntil = now + 5 * 60 * 1000;
        st.running = false;
        ensureRowState[id] = st;
        if (
          msg.includes('exceeded maximum http header buffer size') ||
          msg.includes('error code: 520') ||
          msg.includes('failed to fetch')
        ) {
          return;
        }
        if (msg.includes('relation') && msg.includes('usuarios') && msg.includes('does not exist')) {
          console.warn('[DOKE] Tabela public.usuarios não existe no Supabase. Rode o arquivo supabase_schema.sql.');
        }
        return;
      }
      st.ok = true;
      st.failUntil = 0;
      st.running = false;
      ensureRowState[id] = st;
    } catch (_e) {}
  }

  async function __dokeHydrateCurrentUser(){
    try {
      const sb = getClient();
      const user = await resolveSessionOrCachedUser(sb);
      setCurrentUser(user);
      if (window.DOKE_ENSURE_USUARIO_ROW === true && user) {
        try { __dokeEnsureUsuariosRow(user); } catch(_e) {}
      }
      return user;
    } catch (_e) {
      return null;
    }
  }

  // keep global getAuth using authObj

  window.createUserWithEmailAndPassword = async function(_authIgnored, email, password){
    const sb = ensure();
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    const user = normalizeUser(data.user);
    setCurrentUser(user);
    return { user, session: data.session, _raw: data };
  };

  window.signInWithEmailAndPassword = async function(_authIgnored, email, password){
    const sb = ensure();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const user = normalizeUser(data.user);
    setCurrentUser(user);
    return { user, session: data.session, _raw: data };
  };

  window.signOut = async function(_authIgnored){
    const sb = ensure();
    const { error } = await sb.auth.signOut();
    if (error) throw error;
    setCurrentUser(null);
    try { localStorage.removeItem("usuarioLogado"); } catch (_e) {}
    try { localStorage.removeItem("doke_uid"); } catch (_e) {}
    try { localStorage.removeItem("doke_auth_session_backup"); } catch (_e) {}
    try { document.cookie = "doke_dev_session=; path=/; max-age=0; samesite=lax"; } catch (_e) {}
    return true;
  };

  window.sendPasswordResetEmail = async function(_authIgnored, email){
    const sb = ensure();
    const { error } = await sb.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return true;
  };

  window.updatePassword = async function(_userIgnored, newPassword){
    const sb = ensure();
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  };

  window.EmailAuthProvider = {
    credential: function(email, password){
      return { email, password };
    }
  };

  window.reauthenticateWithCredential = async function(_userIgnored, credential){
    const sb = ensure();
    const email = credential?.email;
    const password = credential?.password;
    if (!email || !password) throw new Error("Credenciais invalidas.");
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const user = normalizeUser(data.user);
    setCurrentUser(user);
    return { user, session: data.session, _raw: data };
  };

  window.deleteUser = async function(_userIgnored){
    const sb = ensure();
    // Supabase nao permite delete de usuario via client sem server-side.
    const { error } = await sb.auth.signOut();
    if (error) throw error;
    setCurrentUser(null);
    console.warn("[DOKE] deleteUser: operacao no client nao suportada; usuario apenas deslogado.");
    return true;
  };

  window.onAuthStateChanged = function(_authIgnored, cb){
    const sb = ensure();
    let emitted = false;
    const shouldEnsureRow = window.DOKE_ENSURE_USUARIO_ROW === true;
    const emit = (user) => {
      emitted = true;
      setCurrentUser(user);
      if (shouldEnsureRow && user) { try { __dokeEnsureUsuariosRow(user); } catch(_e) {} }
      try { cb(user); } catch (_e) {}
    };
    const { data: sub } = sb.auth.onAuthStateChange(async (_event, session) => {
      const directSessionUser = normalizeUser(session?.user || null);
      if (directSessionUser) {
        emit(directSessionUser);
        return;
      }

      if (isStrictSessionMode()) {
        try {
          if (typeof window.dokeRestoreSupabaseSessionFromStorage === "function") {
            const restored = await window.dokeRestoreSupabaseSessionFromStorage({ force: true });
            if (restored && sb?.auth?.getSession) {
              const retry = await sb.auth.getSession();
              const retryUser = normalizeUser(retry?.data?.session?.user || null);
              if (retryUser) {
                emit(retryUser);
                return;
              }
            }
          }
        } catch (_e) {}
        const strictTokenFallback = getCachedAuthUserFallback({ allowProfileFallback: false }) || null;
        emit(strictTokenFallback);
        return;
      }

      const fallbackUser = getCachedAuthUserFallback({ allowProfileFallback: !isStrictSessionMode() }) || null;
      emit(fallbackUser);
    });
    // Evita tela travada caso o evento inicial não dispare por algum motivo.
    setTimeout(async () => {
      if (emitted) return;
      try {
        const user = await resolveSessionOrCachedUser(sb);
        const resolved = user || authObj.currentUser || null;
        emit(resolved);
      } catch (_e) {
        const fallback = getCachedAuthUserFallback({ allowProfileFallback: !isStrictSessionMode() }) || authObj.currentUser || null;
        emit(fallback);
      }
    }, 0);
    return function unsubscribe(){
      try { sub.subscription?.unsubscribe(); } catch(e) {}
    };
  };

  window.sendEmailVerification = async function(user){
    const sb = ensure();
    const email = user?.email;
    if (!email) return true;
    if (typeof sb.auth.resend === "function") {
      const { error } = await sb.auth.resend({ type: "signup", email });
      if (error) throw error;
    }
    return true;
  };

  // Exponha aliases estaveis para evitar sobrescrita por IDs globais
  window.__dokeAuthCompat = window.__dokeAuthCompat || {};
  window.__dokeAuthCompat.getAuth = window.getAuth;
  window.__dokeAuthCompat.onAuthStateChanged = window.onAuthStateChanged;
  window.__dokeAuthCompat.signOut = window.signOut;
  window.__dokeAuthCompat.signInWithEmailAndPassword = window.signInWithEmailAndPassword;
  window.__dokeAuthCompat.createUserWithEmailAndPassword = window.createUserWithEmailAndPassword;
  window.__dokeAuthCompat.sendPasswordResetEmail = window.sendPasswordResetEmail;
  window.__dokeAuthCompat.updatePassword = window.updatePassword;
  window.__dokeAuthCompat.reauthenticateWithCredential = window.reauthenticateWithCredential;
  window.__dokeAuthCompat.deleteUser = window.deleteUser;
  window.__dokeAuthCompat.resolveAuthUser = async function(){
    const sb = getClient();
    const user = await resolveSessionOrCachedUser(sb);
    setCurrentUser(user || null);
    return user || null;
  };
  window.__dokeAuthCompat.ensureAuthUserFromCacheSync = function(){
    const user = isStrictSessionMode()
      ? getCachedAuthUserFallback({ allowProfileFallback: false })
      : getCachedAuthUserFallback({ allowProfileFallback: true });
    if (user) setCurrentUser(user);
    return user || null;
  };

  if (typeof window.dokeResolveAuthUser !== "function") {
    window.dokeResolveAuthUser = window.__dokeAuthCompat.resolveAuthUser;
  }
  if (typeof window.dokeEnsureAuthUserFromCacheSync !== "function") {
    window.dokeEnsureAuthUserFromCacheSync = window.__dokeAuthCompat.ensureAuthUserFromCacheSync;
  }

  window.__dokeEnsureAuthCompat = function(){
    const c = window.__dokeAuthCompat || {};
    installCurrentUserAccessor(authObj);
    if (window.auth && typeof window.auth === "object") installCurrentUserAccessor(window.auth);
    if (typeof window.getAuth !== "function" && typeof c.getAuth === "function") window.getAuth = c.getAuth;
    if (typeof window.onAuthStateChanged !== "function" && typeof c.onAuthStateChanged === "function") window.onAuthStateChanged = c.onAuthStateChanged;
    if (typeof window.signOut !== "function" && typeof c.signOut === "function") window.signOut = c.signOut;
    if (typeof window.signInWithEmailAndPassword !== "function" && typeof c.signInWithEmailAndPassword === "function") window.signInWithEmailAndPassword = c.signInWithEmailAndPassword;
    if (typeof window.createUserWithEmailAndPassword !== "function" && typeof c.createUserWithEmailAndPassword === "function") window.createUserWithEmailAndPassword = c.createUserWithEmailAndPassword;
    if (typeof window.sendPasswordResetEmail !== "function" && typeof c.sendPasswordResetEmail === "function") window.sendPasswordResetEmail = c.sendPasswordResetEmail;
    if (typeof window.updatePassword !== "function" && typeof c.updatePassword === "function") window.updatePassword = c.updatePassword;
    if (typeof window.reauthenticateWithCredential !== "function" && typeof c.reauthenticateWithCredential === "function") window.reauthenticateWithCredential = c.reauthenticateWithCredential;
    if (typeof window.deleteUser !== "function" && typeof c.deleteUser === "function") window.deleteUser = c.deleteUser;
  };

  __dokeHydrateCurrentUser().catch(() => {});

  console.log("[DOKE] Firebase Auth compat carregado.");
})();
