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
    return user;
  }
  const authObj = { currentUser: null, signOut: () => window.signOut() };
  window.getAuth = function(){ return authObj; };

  function setCurrentUser(user){
    authObj.currentUser = user || null;
    if (window.auth && typeof window.auth === "object") {
      window.auth.currentUser = user || null;
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
    const emit = (user) => {
      emitted = true;
      setCurrentUser(user);
      try { cb(user); } catch (_e) {}
    };
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      const user = normalizeUser(session?.user) || null;
      emit(user);
    });
    // Evita tela travada caso o evento inicial não dispare por algum motivo.
    setTimeout(() => {
      if (!emitted) emit(authObj.currentUser || null);
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

  window.__dokeEnsureAuthCompat = function(){
    const c = window.__dokeAuthCompat || {};
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

  console.log("[DOKE] Firebase Auth compat carregado.");
})();

