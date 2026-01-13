// DOKE - Firebase Auth compat on top of Supabase Auth (bridge)
(function(){
  function isClient(obj){
    return obj && obj.auth && typeof obj.auth.getSession === "function";
  }
  const getClient = () => {
    const candidate =
      window.supabaseClient ||
      window.sbClient ||
      window.sb ||
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
    sb.auth.getSession().then(({ data, error }) => {
      if (!error) {
        const user = normalizeUser(data.session?.user) || null;
        setCurrentUser(user);
        cb(user);
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      const user = normalizeUser(session?.user) || null;
      setCurrentUser(user);
      cb(user);
    });
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

  console.log("[DOKE] Firebase Auth compat carregado.");
})();
