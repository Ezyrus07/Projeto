// DOKE - Firestore compat on top of Supabase (bridge for legacy code)
(function(){
  const DOWN_KEY = "doke_supa_down_until";
  const READ_TIMEOUT_MS = 9000;

  function isSupaTemporarilyDown(){
    try{
      const until = Number(sessionStorage.getItem(DOWN_KEY) || 0);
      return Number.isFinite(until) && until > Date.now();
    }catch(_e){
      return false;
    }
  }

  function markSupaTemporarilyDown(ms){
    try{
      const ttl = Math.max(10000, Number(ms) || 120000);
      sessionStorage.setItem(DOWN_KEY, String(Date.now() + ttl));
    }catch(_e){}
  }

  function looksLikeNetworkOrCorsError(err){
    if (!err) return false;
    const code = String(err.code || "").toLowerCase();
    const msg = String(err.message || err.details || err.hint || "").toLowerCase();
    return (
      code === "" ||
      msg.includes("aborterror") ||
      msg.includes("failed to fetch") ||
      msg.includes("cors") ||
      msg.includes("network") ||
      msg.includes("request was aborted") ||
      msg.includes("timeout")
    );
  }

  async function withTimeout(promise, ms, tag){
    let timer = null;
    try{
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(tag || "timeout_supabase_compat")), ms || READ_TIMEOUT_MS);
        })
      ]);
    }finally{
      if (timer) clearTimeout(timer);
    }
  }

  function isClient(obj){
    return obj && typeof obj.from === "function";
  }
  const getClient = () => {
    const candidate =
      window.sb ||
      window.supabaseClient ||
      window.sbClient ||
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
    // Firestore path: pedidos/{id}/mensagens  -> table pedidos_mensagens + parent (pedidoId)
    const c0 = parts[0];
    const id0 = parts[1];
    const c1 = parts[2];
    const table = `${c0}_${c1}`;

    // Algumas tabelas do projeto usam camelCase (ex: "pedidoId") e outras snake_case (ex: conversa_id).
    // Para evitar erros do tipo: "column ... does not exist" seguido de NOT NULL violation,
    // carregamos uma lista de candidatos e (1) filtramos com OR e (2) inserimos com ambos.
    const baseSnake = `${singularize(c0)}_id`;
    const baseCamel = `${singularize(c0)}Id`;
    const baseLower = baseCamel.toLowerCase();

    const c0l = String(c0||"").toLowerCase();
    const c1l = String(c1||"").toLowerCase();

    // IMPORTANT: seu schema pode usar camelCase (pedidoId) ou snake_case (pedido_id)
    // ou ainda colunas sem aspas (pedidoid). Mantemos lista de candidatos.
    let fks = [baseCamel, baseLower, baseSnake];
    if (c0l === 'pedidos' && c1l === 'mensagens') {
      fks = ['pedido_id', 'pedidoid', 'pedidoId'];
    } else if (c0l === 'pedidos') {
      fks = [baseCamel, baseLower, baseSnake];
    }
    if (c0l === 'conversas' && c1l === 'mensagens') {
      fks = ['conversa_id', 'conversaid', 'conversaId'];
    } else if (c0l === 'conversas') {
      fks = [baseCamel, baseLower, baseSnake];
    }
    // remove duplicados mantendo ordem
    fks = Array.from(new Set(fks.filter(Boolean)));

    // Preferência: usa o primeiro como "fk" principal, mas mantém todos em "fks".
    const fk = fks[0];
    return { table, parent: { id: id0, fk, fks } };
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

  function normalizeMissingColumnName(name){
    if (!name) return null;
    const last = String(name).trim().split(".").pop();
    return last.replace(/^["']|["']$/g, "");
  }

  function parseMissingColumn(error){
    const msg = String(error?.message || error?.details || error?.hint || "");
    let m = msg.match(/Could not find the \'([^\']+)\' column/i);
    if (m && m[1]) return normalizeMissingColumnName(m[1]);
    m = msg.match(/Could not find the \"([^\"]+)\" column/i);
    if (m && m[1]) return normalizeMissingColumnName(m[1]);
    m = msg.match(/column \"([^\"]+)\".*does not exist/i);
    if (m && m[1]) return normalizeMissingColumnName(m[1]);
    m = msg.match(/column ([^\s]+) does not exist/i);
    if (m && m[1]) return normalizeMissingColumnName(m[1]);
    return null;
  }

  async function insertWithMissingColumnRetry(client, table, payload){
    const initialKeys = Object.keys(payload || {}).length;
    const maxTries = Math.max(6, initialKeys + 2);
    let safe = { ...(payload||{}) };
    for (let attempt = 1; attempt <= maxTries; attempt++){
      const { data, error } = await client.from(table).insert(safe).select("*").maybeSingle();
      if (!error) return { data, safe };
      const missing = parseMissingColumn(error);
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
    const initialKeys = Object.keys(payload || {}).length;
    const maxTries = Math.max(6, initialKeys + 2);
    let safe = { ...(payload||{}) };
    const hasKeys = (obj) => obj && Object.keys(obj).length > 0;
    if (!hasKeys(safe)) return { safe, skipped: true };
    for (let attempt = 1; attempt <= maxTries; attempt++){
      if (!hasKeys(safe)) return { safe, skipped: true };
      const { error } = await client.from(table).update(safe).eq("id", id);
      if (!error) return { safe };
      const missing = parseMissingColumn(error);
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
    const initialKeys = Object.keys(payload || {}).length;
    const maxTries = Math.max(6, initialKeys + 2);
    let safe = { ...(payload||{}) };
    for (let attempt = 1; attempt <= maxTries; attempt++){
      const { error } = await client.from(table).upsert(safe);
      if (!error) return { safe };
      const missing = parseMissingColumn(error);
      if (missing && Object.prototype.hasOwnProperty.call(safe, missing)){
        console.warn(`[supabase-compat] upsert: coluna inexistente removida ("${missing}") e retry ${attempt}/${maxTries} na tabela "${table}".`);
        delete safe[missing];
        continue;
      }
      throw error;
    }
    throw new Error("Falha ao upsert apos multiplas tentativas (colunas inexistentes)." );
  }

  function applyParentFilter(queryBuilder, parent){
    if (!parent || !parent.id) return queryBuilder;
    const fks = Array.isArray(parent.fks) && parent.fks.length ? parent.fks : (parent.fk ? [parent.fk] : []);
    const unique = Array.from(new Set(fks.filter(Boolean)));
    if (!unique.length) return queryBuilder;
    if (unique.length === 1) return queryBuilder.eq(unique[0], parent.id);

    // Supabase: OR filter (FK1 == id OR FK2 == id ...)
    // Ex: .or('pedidoId.eq.<uuid>,pedido_id.eq.<uuid>')
    const orExpr = unique.map(k => `${k}.eq.${parent.id}`).join(',');
    return queryBuilder.or(orExpr);
  }

  function normalizePayload(payload){
    const out = { ...(payload||{}) };

    // Mapeia campos camelCase -> snake_case usados no schema atual
    // (mantém ambos para compat com código legado)
    if (out.maxParcelas != null && out.maxparcelas == null) out.maxparcelas = out.maxParcelas;
    if (out.ultimaMensagem != null && out.ultimamensagem == null) out.ultimamensagem = out.ultimaMensagem;
    if (out.dataAtualizacao != null && out.dataatualizacao == null) out.dataatualizacao = out.dataAtualizacao;
    if (out.pedidoId != null && out.pedido_id == null) out.pedido_id = out.pedidoId;
    if (out.pedidoId != null && out.pedidoid == null) out.pedidoid = out.pedidoId;
    if (out.pedido_id != null && out.pedidoid == null) out.pedidoid = out.pedido_id;
    if (out.conversaId != null && out.conversa_id == null) out.conversa_id = out.conversaId;
    if (out.conversaId != null && out.conversaid == null) out.conversaid = out.conversaId;
    if (out.conversa_id != null && out.conversaid == null) out.conversaid = out.conversa_id;
    if (out.respostasTriagem != null && out.respostas_triagem == null) out.respostas_triagem = out.respostasTriagem;
    if (out.respostasTriagem != null && out.respostastriagem == null) out.respostastriagem = out.respostasTriagem;
    if (out.respostas_triagem != null && out.respostastriagem == null) out.respostastriagem = out.respostas_triagem;
    if (out.formularioRespostas != null && out.formulario_respostas == null) out.formulario_respostas = out.formularioRespostas;
    if (out.formularioRespostas != null && out.formulariorespostas == null) out.formulariorespostas = out.formularioRespostas;
    if (out.formulario_respostas != null && out.formulariorespostas == null) out.formulariorespostas = out.formulario_respostas;
    if (out.perguntasFormularioJson != null && out.perguntasformulariojson == null) out.perguntasformulariojson = out.perguntasFormularioJson;
    if (out.perguntasFormularioJson != null && out.perguntas_formulario_json == null) out.perguntas_formulario_json = out.perguntasFormularioJson;
    if (out.perguntasformulariojson != null && out.perguntasFormularioJson == null) out.perguntasFormularioJson = out.perguntasformulariojson;
    if (out.perguntas_formulario_json != null && out.perguntasFormularioJson == null) out.perguntasFormularioJson = out.perguntas_formulario_json;

    // Normaliza campos de sender uid (prioriza senderuid para evitar retries)
    if (out.senderUid != null && out.senderuid == null) out.senderuid = out.senderUid;

    // Normaliza Date -> ISO string
    for (const k of Object.keys(out)) {
      const v = out[k];
      if (v instanceof Date) out[k] = v.toISOString();
      // Firestore Timestamp-like {seconds,nanoseconds}
      if (v && typeof v === 'object' && typeof v.seconds === 'number') {
        out[k] = new Date(v.seconds * 1000).toISOString();
      }
    }
    return out;
  }

  window.getDocs = async function(q){
    const client = getClient();
    if (!client) throw new Error("Supabase client nao inicializado (supabase-init.js).");
    if (!q || !q.table) return makeQuerySnap([]);
    if (isSupaTemporarilyDown()) return makeQuerySnap([]);
    const clauses = (q.clauses || []);
    const whereClauses = clauses.filter(c => c && c.kind === "where");
    const orderClauses = clauses.filter(c => c && c.kind === "orderBy");
    const limitClause = clauses.find(c => c && c.kind === "limit");
    const limitN = limitClause ? limitClause.n : null;
    const parent = (q && q.parent && q.parent.id) ? q.parent : null;
    const parentFks = parent ? ((parent.fks && parent.fks.length) ? parent.fks : (parent.fk ? [parent.fk] : [])) : [];
    const fkCandidates = (parent && parentFks.length) ? parentFks : [null];

    const buildBase = (fk) => {
      let base = client.from(q.table).select("*");
      if (parent && parent.id && fk) base = base.eq(fk, parent.id);
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
      return base;
    };

    const isMissingColumnOrderError = (err, field) => {
      const missing = parseMissingColumn(err);
      if (missing) {
        if (!field) return true;
        return String(missing).toLowerCase() === String(field).toLowerCase();
      }
      const msg = String(err?.message || "").toLowerCase();
      return err?.status === 400 && (msg.includes("could not find") && msg.includes("column"));
    };
    const isMissingColumnError = (err) => !!parseMissingColumn(err);
    const shouldTryNextFk = (err) => {
      if (!err) return false;
      if (isMissingColumnError(err)) return true;
      if (err?.status !== 400) return false;
      const msg = String(err?.message || err?.details || err?.hint || "").toLowerCase();
      if (msg.includes("column") || msg.includes("schema") || msg.includes("does not exist")) return true;
      return msg.trim() === "" || msg === "bad request";
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

    const execQuery = async (orders, fk) => {
      let r = buildBase(fk);
      for (const o of orders) {
        const asc = (String(o.dir || "asc").toLowerCase() !== "desc");
        r = r.order(o.field, { ascending: asc });
      }
      if (Number.isFinite(limitN)) r = r.limit(limitN);
      return await withTimeout(r, READ_TIMEOUT_MS, `timeout_supabase_getdocs_${String(q.table || "unknown")}`);
    };

    let lastErr = null;
    for (const fk of fkCandidates) {
      let result = null;
      try {
        result = await execQuery(orderClauses, fk);
      } catch (e) {
        result = { data: null, error: e };
      }
      if (result.error && orderClauses.length) {
        const original = orderClauses[0];
        if (isMissingColumnOrderError(result.error, original.field)) {
          const fallbacks = buildOrderFallbacks(original.field);
          let orderErr = result.error;
          for (const candidate of fallbacks) {
            if (!candidate) continue;
            const retryOrders = [{ ...original, field: candidate }, ...orderClauses.slice(1)];
            let retry = null;
            try {
              retry = await execQuery(retryOrders, fk);
            } catch (e) {
              retry = { data: null, error: e };
            }
            if (!retry.error) {
              result = retry;
              orderErr = null;
              break;
            }
            orderErr = retry.error;
          }
          if (orderErr) result = { data: null, error: orderErr };
        }
      }

      if (result.error) {
        if (looksLikeNetworkOrCorsError(result.error)) {
          markSupaTemporarilyDown();
          return makeQuerySnap([]);
        }
        if (fk && shouldTryNextFk(result.error)) {
          lastErr = result.error;
          continue;
        }
        if (shouldReturnEmpty(result.error)) return makeQuerySnap([]);
        throw result.error;
      }
      return makeQuerySnap(result.data);
    }
    if (lastErr) {
      if (looksLikeNetworkOrCorsError(lastErr)) {
        markSupaTemporarilyDown();
        return makeQuerySnap([]);
      }
      if (shouldReturnEmpty(lastErr)) return makeQuerySnap([]);
      throw lastErr;
    }
    return makeQuerySnap([]);
  };

  window.getDoc = async function(ref){
    const client = getClient();
    if (!client) throw new Error("Supabase client nao inicializado (supabase-init.js).");
    if (!ref || !ref.table || !ref.id) return makeDocSnap(null);
    if (isSupaTemporarilyDown()) return makeDocSnap(null);

    const parent = (ref && ref.parent && ref.parent.id) ? ref.parent : null;
    const fks = parent ? ((parent.fks && parent.fks.length) ? parent.fks : (parent.fk ? [parent.fk] : [])) : [];
    const fkCandidates = (parent && fks.length) ? fks : [null];
    const isMissingColumnError = (err) => !!parseMissingColumn(err);

    let lastErr = null;
    for (const fk of fkCandidates) {
      let q = client.from(ref.table).select("*").eq("id", ref.id);
      if (parent && parent.id && fk) q = q.eq(fk, parent.id);

      let data = null;
      let error = null;
      try {
        const res = await withTimeout(
          q.maybeSingle(),
          READ_TIMEOUT_MS,
          `timeout_supabase_getdoc_${String(ref.table || "unknown")}`
        );
        data = res?.data || null;
        error = res?.error || null;
      } catch (e) {
        error = e;
      }
      if (error) {
        if (looksLikeNetworkOrCorsError(error)) {
          markSupaTemporarilyDown();
          return makeDocSnap(null);
        }
        if (isMissingColumnError(error) && fk) {
          lastErr = error;
          continue;
        }
        if (shouldReturnEmpty(error)) return makeDocSnap(null);
        throw error;
      }
      return makeDocSnap(data);
    }
    if (lastErr) {
      if (looksLikeNetworkOrCorsError(lastErr)) {
        markSupaTemporarilyDown();
        return makeDocSnap(null);
      }
      if (shouldReturnEmpty(lastErr)) return makeDocSnap(null);
      throw lastErr;
    }
    return makeDocSnap(null);
  };

  window.addDoc = async function(coll, payload){
    const client = getClient();
    if (!client) throw new Error("Supabase client nao inicializado (supabase-init.js).");
    const table = coll?.table;
    if (!table) throw new Error("Tabela nao informada em collection().");

    const finalPayload = normalizePayload(payload);
    if ((table === 'pedidos_mensagens' || table === 'conversas_mensagens') && finalPayload.senderuid != null) {
      delete finalPayload.senderUid;
      delete finalPayload.sender_uid;
    }

    if (coll.parent && coll.parent.id) {
      const fks = (coll.parent.fks && coll.parent.fks.length) ? coll.parent.fks : (coll.parent.fk ? [coll.parent.fk] : []);
      if (fks.length > 1) {
        let lastErr = null;
        for (const fk of fks) {
          const attempt = { ...finalPayload };
          for (const other of fks) {
            if (other !== fk) delete attempt[other];
          }
          attempt[fk] = coll.parent.id;
          try {
            const { data } = await insertWithMissingColumnRetry(client, table, attempt);
            return { id: data?.id, _raw: data };
          } catch (error) {
            const missing = parseMissingColumn(error);
            if (missing && String(missing).toLowerCase() === String(fk).toLowerCase()) {
              lastErr = error;
              continue;
            }
            throw error;
          }
        }
        if (lastErr) throw lastErr;
      } else {
        for (const fk of fks) finalPayload[fk] = coll.parent.id;
      }
    }

    const { data } = await insertWithMissingColumnRetry(client, table, finalPayload);
    return { id: data?.id, _raw: data };
  };

  window.setDoc = async function(ref, payload){
    const client = getClient();
    if (!client) throw new Error("Supabase client nao inicializado (supabase-init.js).");
    const up = normalizePayload({ ...payload, id: ref.id });
    if (ref.parent && ref.parent.id) {
      const fks = (ref.parent.fks && ref.parent.fks.length) ? ref.parent.fks : (ref.parent.fk ? [ref.parent.fk] : []);
      for (const fk of fks) up[fk] = ref.parent.id;
    }
    await upsertWithMissingColumnRetry(client, ref.table, up);
    return true;
  };

  window.updateDoc = async function(ref, payload){
    const client = getClient();
    if (!client) throw new Error("Supabase client nao inicializado (supabase-init.js).");
    if (!ref || !ref.table || !ref.id) return true;
    try {
      await updateWithMissingColumnRetry(client, ref.table, ref.id, normalizePayload(payload));
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
    if (ref.parent && ref.parent.id) {
      const fks = (ref.parent.fks && ref.parent.fks.length) ? ref.parent.fks : (ref.parent.fk ? [ref.parent.fk] : []);
      if (fks.length === 1) q = q.eq(fks[0], ref.parent.id);
      else if (fks.length > 1) q = q.or(fks.map(k => `${k}.eq.${ref.parent.id}`).join(','));
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
    "perfil";

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

  // "Realtime" (polling) — versão leve.
  // Motivo: polling muito agressivo causava "net::ERR_INSUFFICIENT_RESOURCES" e falhas de fetch.
  const DEFAULT_POLL_MS = 5000;

  window.onSnapshot = function(refOrQuery, cb, options){
    let active = true;
    let timer = null;
    let inFlight = false;
    const pollMs = (options && typeof options.pollMs === 'number') ? Math.max(800, options.pollMs) : DEFAULT_POLL_MS;

    const schedule = (ms) => {
      if (!active) return;
      clearTimeout(timer);
      timer = setTimeout(run, ms);
    };

    const run = async () => {
      if (!active) return;
      // Evita loop agressivo quando a aba está em background
      if (typeof document !== "undefined" && document.hidden) {
        schedule(Math.max(pollMs, 10000));
        return;
      }
      if (inFlight) {
        schedule(pollMs);
        return;
      }
      inFlight = true;
      try {
        if (refOrQuery && refOrQuery.table && refOrQuery.clauses) {
          const snap = await window.getDocs(refOrQuery);
          if (active) cb(snap);
        } else if (refOrQuery && refOrQuery.table && refOrQuery.id) {
          const snap = await window.getDoc(refOrQuery);
          if (active) cb(snap);
        }
      } catch (e) {
        if (looksLikeNetworkOrCorsError(e)) {
          markSupaTemporarilyDown();
        } else if (active) {
          console.error(e);
        }
      } finally {
        inFlight = false;
        schedule(pollMs);
      }
    };

    // Primeira execução imediata + agenda as próximas
    run();
    schedule(pollMs);

    // Quando volta para o foco, puxa uma atualização rápida
    const onVis = () => { if (active && !document.hidden) schedule(250); };
    if (typeof document !== "undefined") document.addEventListener('visibilitychange', onVis);

    return function unsubscribe(){
      active = false;
      clearTimeout(timer);
      if (typeof document !== "undefined") document.removeEventListener('visibilitychange', onVis);
    };
  };

  // placeholders to reduce crashes
  window.initializeApp = window.initializeApp || function(){ return {}; };
  window.getFirestore = window.getFirestore || function(){ return {}; };

  // Exponha aliases estaveis para evitar sobrescrita por IDs globais
  window.__dokeFirestoreCompat = window.__dokeFirestoreCompat || {};
  window.__dokeFirestoreCompat.collection = window.collection;
  window.__dokeFirestoreCompat.query = window.query;
  window.__dokeFirestoreCompat.where = window.where;
  window.__dokeFirestoreCompat.orderBy = window.orderBy;
  window.__dokeFirestoreCompat.limit = window.limit;
  window.__dokeFirestoreCompat.doc = window.doc;
  window.__dokeFirestoreCompat.getDoc = window.getDoc;
  window.__dokeFirestoreCompat.getDocs = window.getDocs;
  window.__dokeFirestoreCompat.addDoc = window.addDoc;
  window.__dokeFirestoreCompat.setDoc = window.setDoc;
  window.__dokeFirestoreCompat.updateDoc = window.updateDoc;
  window.__dokeFirestoreCompat.deleteDoc = window.deleteDoc;
  window.__dokeFirestoreCompat.onSnapshot = window.onSnapshot;
  window.__dokeFirestoreCompat.increment = window.increment;
  window.__dokeFirestoreCompat.getStorage = window.getStorage;
  window.__dokeFirestoreCompat.ref = window.ref;
  window.__dokeFirestoreCompat.uploadBytes = window.uploadBytes;
  window.__dokeFirestoreCompat.getDownloadURL = window.getDownloadURL;

  window.__dokeEnsureFirestoreCompat = function(){
    const c = window.__dokeFirestoreCompat || {};
    if (typeof window.collection !== "function" && typeof c.collection === "function") window.collection = c.collection;
    if (typeof window.query !== "function" && typeof c.query === "function") window.query = c.query;
    if (typeof window.where !== "function" && typeof c.where === "function") window.where = c.where;
    if (typeof window.orderBy !== "function" && typeof c.orderBy === "function") window.orderBy = c.orderBy;
    if (typeof window.limit !== "function" && typeof c.limit === "function") window.limit = c.limit;
    if (typeof window.doc !== "function" && typeof c.doc === "function") window.doc = c.doc;
    if (typeof window.getDoc !== "function" && typeof c.getDoc === "function") window.getDoc = c.getDoc;
    if (typeof window.getDocs !== "function" && typeof c.getDocs === "function") window.getDocs = c.getDocs;
    if (typeof window.addDoc !== "function" && typeof c.addDoc === "function") window.addDoc = c.addDoc;
    if (typeof window.setDoc !== "function" && typeof c.setDoc === "function") window.setDoc = c.setDoc;
    if (typeof window.updateDoc !== "function" && typeof c.updateDoc === "function") window.updateDoc = c.updateDoc;
    if (typeof window.deleteDoc !== "function" && typeof c.deleteDoc === "function") window.deleteDoc = c.deleteDoc;
    if (typeof window.onSnapshot !== "function" && typeof c.onSnapshot === "function") window.onSnapshot = c.onSnapshot;
    if (typeof window.increment !== "function" && typeof c.increment === "function") window.increment = c.increment;
    if (typeof window.getStorage !== "function" && typeof c.getStorage === "function") window.getStorage = c.getStorage;
    if (typeof window.ref !== "function" && typeof c.ref === "function") window.ref = c.ref;
    if (typeof window.uploadBytes !== "function" && typeof c.uploadBytes === "function") window.uploadBytes = c.uploadBytes;
    if (typeof window.getDownloadURL !== "function" && typeof c.getDownloadURL === "function") window.getDownloadURL = c.getDownloadURL;
  };

  console.log("[DOKE] Firestore compat carregado.");
})();


