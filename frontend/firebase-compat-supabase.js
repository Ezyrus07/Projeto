// DOKE - Firestore compat on top of Supabase (bridge for legacy code)
(function(){
  function isClient(obj){
    return obj && typeof obj.from === "function";
  }
  const getClient = () => {
    const candidate =
      window.supabaseClient ||
      window.sbClient ||
      window.sb ||
      window.supabase;
    return isClient(candidate) ? candidate : null;
  };

  window.collection = function(_dbIgnored, tableName){
    if (typeof _dbIgnored === "string") return { table: _dbIgnored };
    return { table: tableName };
  };
  window.where = function(field, op, value){ return { kind:"where", field, op, value }; };
  window.orderBy = function(field, dir){ return { kind:"orderBy", field, dir: (dir||"asc") }; };
  window.limit = function(n){ return { kind:"limit", n }; };
  window.query = function(coll, ...clauses){ return { table: coll.table, clauses }; };
  window.doc = function(collOrDb, tableOrId, maybeId){
    if (collOrDb && collOrDb.table && typeof tableOrId === "string" && maybeId === undefined){
      return { table: collOrDb.table, id: tableOrId };
    }
    if (typeof tableOrId === "string" && typeof maybeId === "string"){
      return { table: tableOrId, id: maybeId };
    }
    return { table: String(tableOrId||""), id: String(maybeId||"") };
  };

  window.increment = function(n){
    return typeof n === "number" ? n : 0;
  };

  function makeDocSnap(row){
    return {
      id: row?.id ?? row?.uid ?? row?.ID ?? null,
      exists: () => !!row,
      data: () => row || {},
      get: (k) => (row ? row[k] : undefined)
    };
  }
  function makeQuerySnap(rows){
    const docs = (rows||[]).map(r => makeDocSnap(r));
    return {
      empty: docs.length===0,
      size: docs.length,
      docs,
      forEach: (fn)=>docs.forEach(d=>fn(d))
    };
  }

  function shouldReturnEmpty(error){
    const status = error?.status;
    const msg = String(error?.message || "");
    if (status === 404) return true;
    if (status === 400 && msg.includes("invalid input syntax for type uuid")) return true;
    if (msg.includes("does not exist")) return true;
    return false;
  }

  window.getDocs = async function(q){
    const client = getClient();
    if (!client) throw new Error("Supabase client não inicializado (supabase-init.js).");
    if (!q || !q.table) return makeQuerySnap([]);
    let r = client.from(q.table).select("*");
    for (const c of (q.clauses||[])){
      if (!c) continue;
      if (c.kind === "where"){
        const op = c.op;
        if (op === "==" || op === "=") r = r.eq(c.field, c.value);
        else if (op === "!=") r = r.neq(c.field, c.value);
        else if (op === ">") r = r.gt(c.field, c.value);
        else if (op === ">=") r = r.gte(c.field, c.value);
        else if (op === "<") r = r.lt(c.field, c.value);
        else if (op === "<=") r = r.lte(c.field, c.value);
        else if (op === "in") r = r.in(c.field, c.value);
        else r = r.eq(c.field, c.value);
      }
      if (c.kind === "orderBy"){
        r = r.order(c.field, { ascending: (String(c.dir||"asc").toLowerCase() !== "desc") });
      }
      if (c.kind === "limit"){
        r = r.limit(c.n);
      }
    }
    const { data, error } = await r;
    if (error) {
      if (shouldReturnEmpty(error)) return makeQuerySnap([]);
      throw error;
    }
    return makeQuerySnap(data);
  };

  window.getDoc = async function(ref){
    const client = getClient();
    if (!client) throw new Error("Supabase client não inicializado (supabase-init.js).");
    if (!ref || !ref.table || !ref.id) return makeDocSnap(null);
    const { data, error } = await client.from(ref.table).select("*").eq("id", ref.id).maybeSingle();
    if (error) {
      if (shouldReturnEmpty(error)) return makeDocSnap(null);
      throw error;
    }
    return makeDocSnap(data);
  };

  window.addDoc = async function(coll, payload){
    const client = getClient();
    if (!client) throw new Error("Supabase client não inicializado (supabase-init.js).");
    const { data, error } = await client.from(coll.table).insert(payload).select("*").maybeSingle();
    if (error) throw error;
    return { id: data?.id, _raw: data };
  };

  window.setDoc = async function(ref, payload){
    const client = getClient();
    if (!client) throw new Error("Supabase client não inicializado (supabase-init.js).");
    const { error } = await client.from(ref.table).upsert({ ...payload, id: ref.id });
    if (error) throw error;
    return true;
  };

  window.updateDoc = async function(ref, payload){
    const client = getClient();
    if (!client) throw new Error("Supabase client não inicializado (supabase-init.js).");
    if (!ref || !ref.table || !ref.id) return true;
    const { error } = await client.from(ref.table).update(payload).eq("id", ref.id);
    if (error) {
      if (shouldReturnEmpty(error)) return true;
      throw error;
    }
    return true;
  };

  window.deleteDoc = async function(ref){
    const client = getClient();
    if (!client) throw new Error("Supabase client não inicializado (supabase-init.js).");
    if (!ref || !ref.table || !ref.id) return true;
    const { error } = await client.from(ref.table).delete().eq("id", ref.id);
    if (error) {
      if (shouldReturnEmpty(error)) return true;
      throw error;
    }
    return true;
  };

  // Minimal Storage compat (Supabase Storage)
  const defaultBucket =
    window.__DOKE_SUPABASE_STORAGE_BUCKET__ ||
    localStorage.getItem("DOKE_SUPABASE_STORAGE_BUCKET") ||
    "public";

  window.getStorage = function(){
    return { bucket: defaultBucket };
  };

  window.ref = function(storage, path){
    return { bucket: storage?.bucket || defaultBucket, path: path || "" };
  };

  window.uploadBytes = async function(storageRef, file){
    const client = getClient();
    if (!client) throw new Error("Supabase client não inicializado (supabase-init.js).");
    if (!storageRef || !storageRef.path) return { ref: storageRef };
    if (!file) return { ref: storageRef };
    const { data, error } = await client.storage
      .from(storageRef.bucket)
      .upload(storageRef.path, file, { upsert: true });
    if (error) throw error;
    return { ref: { ...storageRef, _raw: data } };
  };

  window.getDownloadURL = async function(storageRef){
    const client = getClient();
    if (!client) throw new Error("Supabase client não inicializado (supabase-init.js).");
    if (!storageRef || !storageRef.path) return "";
    const { data } = client.storage.from(storageRef.bucket).getPublicUrl(storageRef.path);
    return data?.publicUrl || "";
  };

  window.onSnapshot = function(refOrQuery, cb){
    let active = true;
    const run = async () => {
      if (!active) return;
      try {
        if (refOrQuery && refOrQuery.table && refOrQuery.clauses) {
          const snap = await window.getDocs(refOrQuery);
          if (active) cb(snap);
        } else if (refOrQuery && refOrQuery.table && refOrQuery.id) {
          const snap = await window.getDoc(refOrQuery);
          if (active) cb(snap);
        }
      } catch (e) {
        if (active) console.error(e);
      }
    };
    run();
    return function unsubscribe(){ active = false; };
  };

  // placeholders to reduce crashes
  window.initializeApp = window.initializeApp || function(){ return {}; };
  window.getFirestore = window.getFirestore || function(){ return {}; };

  console.log("[DOKE] Firestore compat carregado.");
})();
