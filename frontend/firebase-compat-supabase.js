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

  // ------------------------
  // Helpers
  // ------------------------
  function singularize(name){
    const n = String(name||"").trim();
    if (!n) return "";
    if (n.endsWith('ies')) return n.slice(0,-3) + 'y';
    if (n.endsWith('ses')) return n.slice(0,-2);
    if (n.endsWith('s') && n.length > 1) return n.slice(0,-1);
    return n;
  }

  function buildTableFromPath(parts){
    // parts: [collection, docId, subcollection, docId, ...]
    // Firestore path: pedidos/{id}/mensagens  -> table pedidos_mensagens + parent (pedido_id)
    const c0 = parts[0];
    const id0 = parts[1];
    const c1 = parts[2];
    const table = `${c0}_${c1}`;
    const fk = `${singularize(c0)}_id`;
    return { table, parent: { id: id0, fk } };
  }

  function isPathCollectionArgs(args){
    // (db, "pedidos", id, "mensagens")
    return args.length >= 4 && typeof args[1] === 'string' && typeof args[2] === 'string' && typeof args[3] === 'string';
  }

  // ------------------------
  // Firestore-like API
  // ------------------------
  window.collection = function(){
    const args = Array.from(arguments);
    // Support: collection(db, 'pedidos')
    // Support subcollection: collection(db, 'pedidos', pedidoId, 'mensagens')
    if (args.length === 1 && typeof args[0] === 'string') return { table: args[0] };
    if (args.length === 2 && typeof args[1] === 'string') return { table: args[1] };

    if (isPathCollectionArgs(args)) {
      const parts = args.slice(1); // remove db
      const built = buildTableFromPath(parts);
      return { table: built.table, parent: built.parent, _path: parts };
    }

    // Fallback: try second arg as table
    const tableName = (typeof args[1] === 'string') ? args[1] : String(args[0]||'');
    return { table: tableName };
  };

  window.where = function(field, op, value){ return { kind:"where", field, op, value }; };
  window.orderBy = function(field, dir){ return { kind:"orderBy", field, dir: (dir||"asc") }; };
  window.limit = function(n){ return { kind:"limit", n }; };

  window.query = function(coll, ...clauses){
    return { table: coll.table, clauses, parent: coll.parent || null };
  };

  window.doc = function(){
    const args = Array.from(arguments);
    // Firestore: doc(collectionRef, id)
    if (args[0] && args[0].table && typeof args[1] === 'string' && args.length === 2) {
      return { table: args[0].table, id: args[1], parent: args[0].parent || null };
    }

    // Firestore: doc(db, 'pedidos', id)
    if (args.length === 3 && typeof args[1] === 'string' && typeof args[2] === 'string') {
      return { table: args[1], id: args[2] };
    }

    // Firestore: doc(db, 'pedidos', pedidoId, 'mensagens', msgId)
    if (args.length >= 5 && typeof args[1] === 'string' && typeof args[2] === 'string' && typeof args[3] === 'string' && typeof args[4] === 'string') {
      const built = buildTableFromPath(args.slice(1,4)); // [col,id,sub]
      return { table: built.table, id: args[4], parent: built.parent };
    }

    // Fallback
    const table = String(args[1]||args[0]||'');
    const id = String(args[2]||'');
    return { table, id };
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

  function parseMissingColumn(error){
    const msg = String(error?.message || error?.details || "");
    let m = msg.match(/Could not find the \'([^\']+)\' column/i);
    if (m && m[1]) return m[1];
    m = msg.match(/Could not find the \"([^\"]+)\" column/i);
    if (m && m[1]) return m[1];
    m = msg.match(/column \"([^\"]+)\".*does not exist/i);
    if (m && m[1]) return m[1];
    return null;
  }

  async function insertWithMissingColumnRetry(client, table, payload){
    const maxTries = 6;
    let safe = { ...(payload||{}) };
    for (let attempt = 1; attempt <= maxTries; attempt++){
      const { data, error } = await client.from(table).insert(safe).select("*").maybeSingle();
      if (!error) return { data, safe };
      const missing = (error?.status === 400) ? parseMissingColumn(error) : null;
      if (missing && Object.prototype.hasOwnProperty.call(safe, missing)){
        console.warn(`[supabase-compat] insert: coluna inexistente removida ("${missing}") e retry ${attempt}/${maxTries} na tabela "${table}".`);
        delete safe[missing];
        continue;
      }
      throw error;
    }
    throw new Error("Falha ao inserir apos multiplas tentativas (colunas inexistentes)." );
  }

  async function updateWithMissingColumnRetry(client, table, id, payload){
    const maxTries = 6;
    let safe = { ...(payload||{}) };
    for (let attempt = 1; attempt <= maxTries; attempt++){
      const { error } = await client.from(table).update(safe).eq("id", id);
      if (!error) return { safe };
      const missing = (error?.status === 400) ? parseMissingColumn(error) : null;
      if (missing && Object.prototype.hasOwnProperty.call(safe, missing)){
        console.warn(`[supabase-compat] update: coluna inexistente removida ("${missing}") e retry ${attempt}/${maxTries} na tabela "${table}".`);
        delete safe[missing];
        continue;
      }
      throw error;
    }
    throw new Error("Falha ao atualizar apos multiplas tentativas (colunas inexistentes)." );
  }

  async function upsertWithMissingColumnRetry(client, table, payload){
    const maxTries = 6;
    let safe = { ...(payload||{}) };
    for (let attempt = 1; attempt <= maxTries; attempt++){
      const { error } = await client.from(table).upsert(safe);
      if (!error) return { safe };
      const missing = (error?.status === 400) ? parseMissingColumn(error) : null;
      if (missing && Object.prototype.hasOwnProperty.call(safe, missing)){
        console.warn(`[supabase-compat] upsert: coluna inexistente removida ("${missing}") e retry ${attempt}/${maxTries} na tabela "${table}".`);
        delete safe[missing];
        continue;
      }
      throw error;
    }
    throw new Error("Falha ao upsert apos multiplas tentativas (colunas inexistentes)." );
  }

  window.getDocs = async function(q){
    const client = getClient();
    if (!client) throw new Error("Supabase client nao inicializado (supabase-init.js).");
    if (!q || !q.table) return makeQuerySnap([]);
    const clauses = (q.clauses || []);
    const whereClauses = clauses.filter(c => c && c.kind === "where");
    const orderClauses = clauses.filter(c => c && c.kind === "orderBy");
    const limitClause = clauses.find(c => c && c.kind === "limit");

    let base = client.from(q.table).select("*");

    // Implicit parent filter for subcollections
    if (q.parent && q.parent.fk && q.parent.id) {
      base = base.eq(q.parent.fk, q.parent.id);
    }

    for (const c of whereClauses) {
      const op = c.op;
      if (op === "==" || op === "=") base = base.eq(c.field, c.value);
      else if (op === "!=") base = base.neq(c.field, c.value);
      else if (op === ">") base = base.gt(c.field, c.value);
      else if (op === ">=") base = base.gte(c.field, c.value);
      else if (op === "<") base = base.lt(c.field, c.value);
      else if (op === "<=") base = base.lte(c.field, c.value);
      else if (op === "in") base = base.in(c.field, c.value);
      else if (op === "array-contains") base = base.contains(c.field, [c.value]);
      else base = base.eq(c.field, c.value);
    }

    const limitN = limitClause ? limitClause.n : null;

    const isMissingColumnOrderError = (err) => {
      const msg = String(err?.message || "").toLowerCase();
      return err?.status === 400 && (msg.includes("could not find") && msg.includes("column"));
    };

    const buildOrderFallbacks = (requested) => {
      const f = String(requested || "").trim();
      const lower = f.toLowerCase();
      const defaults = ["dataCriacao", "created_at", "createdAt", "timestamp", "data", "created"]; 
      if (!f) return defaults;
      if (lower === "created_at") return ["dataCriacao", "createdAt", ...defaults.filter(x => x !== "created_at")];
      if (lower === "datacriacao") return ["created_at", "createdAt", ...defaults.filter(x => x.toLowerCase() !== "datacriacao")];
      return [f, ...defaults.filter(x => x !== f)];
    };

    const execQuery = async (orders) => {
      let r = base;
      for (const o of orders) {
        const asc = (String(o.dir || "asc").toLowerCase() !== "desc");
        r = r.order(o.field, { ascending: asc });
      }
      if (Number.isFinite(limitN)) r = r.limit(limitN);
      return await r;
    };

    let result = await execQuery(orderClauses);
    if (result.error && isMissingColumnOrderError(result.error) && orderClauses.length) {
      const original = orderClauses[0];
      const fallbacks = buildOrderFallbacks(original.field);
      let lastErr = result.error;
      for (const candidate of fallbacks) {
        if (!candidate) continue;
        const retryOrders = [{ ...original, field: candidate }, ...orderClauses.slice(1)];
        const retry = await execQuery(retryOrders);
        if (!retry.error) {
          result = retry;
          lastErr = null;
          break;
        }
        lastErr = retry.error;
      }
      if (lastErr) result = { data: null, error: lastErr };
    }

    const { data, error } = result;
    if (error) {
      if (shouldReturnEmpty(error)) return makeQuerySnap([]);
      throw error;
    }
    return makeQuerySnap(data);
  };

  window.getDoc = async function(ref){
    const client = getClient();
    if (!client) throw new Error("Supabase client nao inicializado (supabase-init.js).");
    if (!ref || !ref.table || !ref.id) return makeDocSnap(null);

    let q = client.from(ref.table).select("*").eq("id", ref.id);
    if (ref.parent && ref.parent.fk && ref.parent.id) {
      q = q.eq(ref.parent.fk, ref.parent.id);
    }

    const { data, error } = await q.maybeSingle();
    if (error) {
      if (shouldReturnEmpty(error)) return makeDocSnap(null);
      throw error;
    }
    return makeDocSnap(data);
  };

  window.addDoc = async function(coll, payload){
    const client = getClient();
    if (!client) throw new Error("Supabase client nao inicializado (supabase-init.js).");
    const table = coll?.table;
    if (!table) throw new Error("Tabela nao informada em collection().");

    let finalPayload = { ...(payload||{}) };
    if (coll.parent && coll.parent.fk && coll.parent.id) {
      finalPayload[coll.parent.fk] = coll.parent.id;
    }

    const { data } = await insertWithMissingColumnRetry(client, table, finalPayload);
    return { id: data?.id, _raw: data };
  };

  window.setDoc = async function(ref, payload){
    const client = getClient();
    if (!client) throw new Error("Supabase client nao inicializado (supabase-init.js).");
    const up = { ...payload, id: ref.id };
    if (ref.parent && ref.parent.fk && ref.parent.id) {
      up[ref.parent.fk] = ref.parent.id;
    }
    await upsertWithMissingColumnRetry(client, ref.table, up);
    return true;
  };

  window.updateDoc = async function(ref, payload){
    const client = getClient();
    if (!client) throw new Error("Supabase client nao inicializado (supabase-init.js).");
    if (!ref || !ref.table || !ref.id) return true;
    try {
      await updateWithMissingColumnRetry(client, ref.table, ref.id, payload);
      return true;
    } catch (error) {
      if (shouldReturnEmpty(error)) return true;
      throw error;
    }
  };

  window.deleteDoc = async function(ref){
    const client = getClient();
    if (!client) throw new Error("Supabase client nao inicializado (supabase-init.js).");
    if (!ref || !ref.table || !ref.id) return true;
    let q = client.from(ref.table).delete().eq("id", ref.id);
    if (ref.parent && ref.parent.fk && ref.parent.id) {
      q = q.eq(ref.parent.fk, ref.parent.id);
    }
    const { error } = await q;
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
    if (!client) throw new Error("Supabase client nao inicializado (supabase-init.js).");
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
    if (!client) throw new Error("Supabase client nao inicializado (supabase-init.js).");
    if (!storageRef || !storageRef.path) return "";
    const { data } = client.storage.from(storageRef.bucket).getPublicUrl(storageRef.path);
    return data?.publicUrl || "";
  };

  // "Realtime" (polling). Supabase Realtime channels demand more setup; polling keeps the legacy API working.
  const DEFAULT_POLL_MS = 3500;

  window.onSnapshot = function(refOrQuery, cb, options){
    let active = true;
    const pollMs = (options && typeof options.pollMs === 'number') ? options.pollMs : DEFAULT_POLL_MS;

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
    const t = setInterval(run, pollMs);
    return function unsubscribe(){ active = false; clearInterval(t); };
  };

  // placeholders to reduce crashes
  window.initializeApp = window.initializeApp || function(){ return {}; };
  window.getFirestore = window.getFirestore || function(){ return {}; };

  console.log("[DOKE] Firestore compat carregado.");
})();
