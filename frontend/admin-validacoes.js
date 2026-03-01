(function(){
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const state = {
    rows: [],
    filtered: [],
    authUser: null,
    me: null,
    isAdmin: false,
    busy: false,
    strictSession: false
  };
  const STRICT_ADMIN_MODE = true;

  const refs = {
    gate: $("#avGate"),
    list: $("#avList"),
    seal: $("#avAdminSeal"),
    search: $("#avSearch"),
    statusFilter: $("#avStatusFilter"),
    refreshBtn: $("#avRefreshBtn"),
    kpiTotal: $("#kpiTotal"),
    kpiPendente: $("#kpiPendente"),
    kpiAnalise: $("#kpiAnalise"),
    kpiAprovado: $("#kpiAprovado")
  };

  function setAdminSeal(kind, text){
    if(!refs.seal) return;
    const k = String(kind || "pending");
    refs.seal.classList.remove("av-tip--ok", "av-tip--warn", "av-tip--err", "av-tip--pending");
    refs.seal.classList.add(`av-tip--${k}`);
    const icon =
      k === "ok" ? "bx bx-check-shield" :
      k === "warn" ? "bx bx-shield-quarter" :
      k === "err" ? "bx bx-shield-x" :
      "bx bx-loader-alt bx-spin";
    refs.seal.innerHTML = `<i class='${icon}'></i> ${esc(text || "")}`;
  }

  function toast(msg, type){
    const t = String(type || "info");
    if(typeof window.dokeToast === "function"){
      window.dokeToast({ message: String(msg || ""), type: t });
      return;
    }
    if(typeof window.mostrarToast === "function"){
      window.mostrarToast(String(msg || ""), t);
      return;
    }
    try{ console.log(msg); }catch(_){}
  }

  function sbClient(){
    return window.sb || window.supabaseClient || window.supabase || null;
  }

  function normalizeStatus(value){
    const raw = String(value || "").trim().toLowerCase();
    if(!raw) return "pendente";
    if(raw.includes("apro")) return "aprovado";
    if(raw.includes("reje") || raw.includes("recus")) return "rejeitado";
    if(raw.includes("anal")) return "analise";
    if(raw.includes("pend")) return "pendente";
    return "pendente";
  }

  function statusLabel(status){
    const st = normalizeStatus(status);
    if(st === "analise") return "Em analise";
    if(st === "aprovado") return "Aprovado";
    if(st === "rejeitado") return "Rejeitado";
    return "Pendente";
  }

  function statusClass(status){
    return `st-${normalizeStatus(status)}`;
  }

  function fmtDate(value){
    if(!value) return "--";
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return "--";
    return d.toLocaleString("pt-BR");
  }

  function formatCpf(value){
    const n = String(value || "").replace(/\D/g, "");
    if(n.length !== 11) return value || "--";
    return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`;
  }

  function computeIsAdmin(profile){
    const p = profile && typeof profile === "object" ? profile : {};
    const role = String(p.role || p.tipo || p.perfil || "").toLowerCase().trim();
    return (
      p.isAdmin === true ||
      p.is_admin === true ||
      p.admin === true ||
      role === "admin" ||
      role === "moderador"
    );
  }

  async function verifyAdminSession(profile){
    const sb = sbClient();
    const localFlag = computeIsAdmin(profile);
    if(!sb?.from || !state?.authUser?.id){
      return { ok: false, strict: false, reason: "supabase_indisponivel", localFlag };
    }

    let rpcOk = null;
    try{
      if(typeof sb.rpc === "function"){
        const rpcRes = await sb.rpc("doke_is_admin");
        if(!rpcRes?.error){
          rpcOk = !!rpcRes?.data;
        }
      }
    }catch(_){}

    let policyReadOk = false;
    let policyReadErr = null;
    try{
      const probe = await sb.from("profissional_validacao").select("*").limit(1);
      if(!probe?.error) policyReadOk = true;
      else policyReadErr = probe.error;
    }catch(err){
      policyReadErr = err;
    }

    if(rpcOk === true && policyReadOk){
      return { ok: true, strict: true, reason: "rpc_and_policy", localFlag };
    }
    if(rpcOk === true && !policyReadOk){
      return { ok: false, strict: true, reason: "rpc_true_policy_blocked", localFlag, error: policyReadErr };
    }
    if(rpcOk === false){
      return { ok: false, strict: true, reason: "rpc_false", localFlag };
    }

    if(STRICT_ADMIN_MODE){
      return { ok: false, strict: true, reason: "strict_requires_rpc", localFlag, error: policyReadErr };
    }

    if(policyReadOk && localFlag){
      return { ok: true, strict: false, reason: "policy_plus_local", localFlag };
    }
    if(policyReadOk && !localFlag){
      return { ok: false, strict: false, reason: "policy_ok_local_false", localFlag };
    }
    return { ok: false, strict: false, reason: "policy_blocked", localFlag, error: policyReadErr };
  }

  function readLocalProfile(){
    try{
      const raw = localStorage.getItem("doke_usuario_perfil");
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : {};
    }catch(_){
      return {};
    }
  }

  function saveLocalProfile(next){
    try{
      localStorage.setItem("doke_usuario_perfil", JSON.stringify(next || {}));
    }catch(_){}
  }

  async function resolveAuthUser(){
    const sb = sbClient();
    if(!sb?.auth) return null;

    try{
      const sess = await sb.auth.getSession();
      if(sess?.data?.session?.user) return sess.data.session.user;
    }catch(_){}

    try{
      const usr = await sb.auth.getUser();
      if(usr?.data?.user) return usr.data.user;
    }catch(_){}

    try{
      if(typeof window.dokeResolveAuthUser === "function"){
        const u = await window.dokeResolveAuthUser();
        if(u?.uid || u?.id){
          return { id: u.uid || u.id, email: u.email || "" };
        }
      }
    }catch(_){}

    return null;
  }

  async function loadMyProfile(uid){
    const sb = sbClient();
    const local = readLocalProfile();
    if(!uid || !sb?.from){
      return local;
    }

    let remote = null;
    try{
      const res = await sb.from("usuarios").select("*").or(`id.eq.${uid},uid.eq.${uid}`).limit(1);
      if(!res?.error && Array.isArray(res?.data) && res.data.length){
        remote = res.data[0];
      }
    }catch(_){}

    const merged = {
      ...local,
      ...(remote || {}),
      uid: local.uid || remote?.uid || uid,
      id: local.id || remote?.id || uid
    };
    saveLocalProfile(merged);
    return merged;
  }

  function setBusy(next){
    state.busy = !!next;
    if(refs.refreshBtn) refs.refreshBtn.disabled = state.busy;
    const buttons = refs.list ? refs.list.querySelectorAll("button[data-action]") : [];
    buttons.forEach((b) => { b.disabled = state.busy; });
  }

  function renderGate(html){
    if(!refs.gate) return;
    refs.gate.style.display = "";
    refs.gate.innerHTML = html;
  }

  function hideGate(){
    if(!refs.gate) return;
    refs.gate.style.display = "none";
    refs.gate.innerHTML = "";
  }

  function updateKpis(rows){
    const source = Array.isArray(rows) ? rows : [];
    let pend = 0;
    let ana = 0;
    let apr = 0;
    source.forEach((r) => {
      const st = normalizeStatus(r?.status || r?.situacao || r?.estado);
      if(st === "pendente") pend += 1;
      else if(st === "analise") ana += 1;
      else if(st === "aprovado") apr += 1;
    });
    if(refs.kpiTotal) refs.kpiTotal.textContent = String(source.length);
    if(refs.kpiPendente) refs.kpiPendente.textContent = String(pend);
    if(refs.kpiAnalise) refs.kpiAnalise.textContent = String(ana);
    if(refs.kpiAprovado) refs.kpiAprovado.textContent = String(apr);
  }

  function rowSearchText(row){
    const parts = [
      row?.nome,
      row?.usuario_nome,
      row?.user,
      row?.cpf,
      row?.telefone,
      row?.uid,
      row?.user_id,
      row?.usuario_id,
      row?.cidade,
      row?.uf,
      row?.status,
      row?.situacao,
      row?.estado
    ];
    return parts.map((v) => String(v || "").toLowerCase()).join(" ");
  }

  function applyFilters(){
    const q = String(refs.search?.value || "").trim().toLowerCase();
    const stFilter = normalizeStatus(refs.statusFilter?.value || "");
    const hasStatusFilter = String(refs.statusFilter?.value || "").trim() !== "";

    state.filtered = state.rows.filter((row) => {
      const st = normalizeStatus(row?.status || row?.situacao || row?.estado);
      if(hasStatusFilter && st !== stFilter) return false;
      if(q && !rowSearchText(row).includes(q)) return false;
      return true;
    });
    renderList();
  }

  function rowDisplayName(row){
    const name = String(row?.nome || row?.usuario_nome || row?.user || "").trim();
    if(name) return name;
    const hint = String(row?.uid || row?.usuario_id || row?.user_id || "").trim();
    return hint ? `Usuario ${hint.slice(0, 8)}` : "Usuario sem nome";
  }

  function rowMainId(row){
    return (
      String(row?.usuario_id || "").trim() ||
      String(row?.user_id || "").trim() ||
      String(row?.uid || "").trim() ||
      ""
    );
  }

  function rowReason(row){
    return String(row?.motivo_rejeicao || row?.motivo || row?.reason || "").trim();
  }

  function renderList(){
    if(!refs.list) return;

    if(!state.filtered.length){
      refs.list.innerHTML = `
        <article class="av-empty">
          <b>Nenhuma solicitacao encontrada</b>
          <span>Tente mudar o filtro ou atualizar os dados.</span>
        </article>
      `;
      return;
    }

    refs.list.innerHTML = state.filtered.map((row, idx) => {
      const status = normalizeStatus(row?.status || row?.situacao || row?.estado);
      const uid = esc(rowMainId(row) || "--");
      const nome = esc(rowDisplayName(row));
      const cpf = esc(formatCpf(row?.cpf || ""));
      const tel = esc(row?.telefone || "--");
      const city = esc([row?.cidade, row?.uf].filter(Boolean).join(" / ") || "--");
      const createdAt = esc(fmtDate(row?.created_at || row?.createdAt));
      const updatedAt = esc(fmtDate(row?.updated_at || row?.updatedAt));
      const docUrl = String(row?.identidade_url || "").trim();
      const reason = esc(rowReason(row));

      return `
        <article class="av-card" data-idx="${idx}">
          <div class="av-head">
            <h3>${nome}</h3>
            <span class="av-badge ${statusClass(status)}"><i class='bx bx-shield'></i> ${esc(statusLabel(status))}</span>
          </div>

          <div class="av-meta">
            <div class="x"><div class="l">Id de referencia</div><div class="v">${uid}</div></div>
            <div class="x"><div class="l">CPF</div><div class="v">${cpf}</div></div>
            <div class="x"><div class="l">Telefone</div><div class="v">${tel}</div></div>
            <div class="x"><div class="l">Cidade / UF</div><div class="v">${city}</div></div>
            <div class="x"><div class="l">Criado em</div><div class="v">${createdAt}</div></div>
            <div class="x"><div class="l">Atualizado em</div><div class="v">${updatedAt}</div></div>
          </div>

          <label style="font-weight:800; color:#1f3550;">Motivo de rejeicao (opcional)</label>
          <textarea class="av-reason" data-role="reason">${reason}</textarea>

          <div class="av-row">
            ${docUrl ? `<a class="av-btn link" href="${esc(docUrl)}" target="_blank" rel="noopener"><i class='bx bx-id-card'></i> Ver documento</a>` : ""}
            <button type="button" class="av-btn review" data-action="analise"><i class='bx bx-loader-alt'></i> Em analise</button>
            <button type="button" class="av-btn approve" data-action="aprovar"><i class='bx bx-check'></i> Aprovar</button>
            <button type="button" class="av-btn reject" data-action="rejeitar"><i class='bx bx-x'></i> Rejeitar</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function rlsHint(error){
    const msg = String(error?.message || "").toLowerCase();
    const code = String(error?.code || "").toLowerCase();
    return msg.includes("row-level security") || msg.includes("permission denied") || code === "42501";
  }

  function updatePayloads(nextStatus, reason){
    const now = new Date().toISOString();
    const base = {
      status: nextStatus,
      updated_at: now,
      reviewed_at: now,
      reviewed_by: state.authUser?.id || null
    };
    if(nextStatus === "rejeitado"){
      base.motivo_rejeicao = reason || "Nao aprovado nesta rodada.";
      base.motivo = base.motivo_rejeicao;
    }else{
      base.motivo_rejeicao = null;
      base.motivo = null;
    }

    const clean = (obj) => {
      const out = {};
      Object.keys(obj || {}).forEach((k) => {
        if(obj[k] !== undefined) out[k] = obj[k];
      });
      return out;
    };

    return [
      clean(base),
      clean({ ...base, reviewed_by: undefined, reviewed_at: undefined }),
      clean({ status: nextStatus, updated_at: now, motivo_rejeicao: base.motivo_rejeicao, motivo: base.motivo }),
      clean({ status: nextStatus })
    ];
  }

  async function updateValidationRow(row, nextStatus, reason){
    const sb = sbClient();
    const keys = [
      { col: "usuario_id", val: row?.usuario_id },
      { col: "user_id", val: row?.user_id },
      { col: "uid", val: row?.uid },
      { col: "cpf", val: row?.cpf }
    ].filter((k) => String(k.val || "").trim() !== "");

    let lastError = null;
    for(const payload of updatePayloads(nextStatus, reason)){
      for(const key of keys){
        try{
          const res = await sb.from("profissional_validacao")
            .update(payload)
            .eq(key.col, key.val)
            .select("*")
            .limit(1);
          if(!res?.error && Array.isArray(res?.data) && res.data.length){
            return { ok: true, row: res.data[0] };
          }
          if(res?.error){
            lastError = res.error;
          }
        }catch(err){
          lastError = err;
        }
      }
    }
    return { ok: false, error: lastError || new Error("Nao foi possivel atualizar a solicitacao.") };
  }

  async function promoteUsuario(row){
    const sb = sbClient();
    const now = new Date().toISOString();
    const tries = [];

    const pushTry = (col, val) => {
      const v = String(val || "").trim();
      if(!v) return;
      if(tries.some((x) => x.col === col && String(x.val) === v)) return;
      tries.push({ col, val: v });
    };

    pushTry("id", row?.usuario_id);
    pushTry("id", row?.user_id);
    pushTry("uid", row?.uid);
    pushTry("uid", row?.usuario_id);
    pushTry("uid", row?.user_id);
    pushTry("id", row?.uid);

    const payloads = [
      { isProfissional: true, updated_at: now },
      { isProfissional: true }
    ];

    let lastError = null;
    for(const payload of payloads){
      for(const t of tries){
        try{
          const res = await sb.from("usuarios")
            .update(payload)
            .eq(t.col, t.val)
            .select("id,uid,isProfissional")
            .limit(1);
          if(!res?.error && Array.isArray(res?.data) && res.data.length){
            return { ok: true, row: res.data[0] };
          }
          if(res?.error) lastError = res.error;
        }catch(err){
          lastError = err;
        }
      }
    }
    return { ok: false, error: lastError || new Error("Nao foi possivel promover o usuario.") };
  }

  async function writeAudit(row, nextStatus, reason, outcome){
    const sb = sbClient();
    if(!sb?.from) return;
    const payload = {
      reviewer_uid: state.authUser?.id || null,
      target_uid: String(row?.uid || row?.usuario_id || row?.user_id || "") || null,
      cpf: String(row?.cpf || "") || null,
      status_to: nextStatus,
      reason: String(reason || "") || null,
      outcome: String(outcome || "ok"),
      created_at: new Date().toISOString()
    };
    try{
      await sb.from("profissional_validacao_logs").insert(payload);
    }catch(_){}
  }

  async function decide(row, action, reason){
    if(STRICT_ADMIN_MODE && !state.strictSession){
      toast("Sessao admin nao validada em modo estrito.", "error");
      return;
    }
    const nextStatus = action === "aprovar" ? "aprovado" : (action === "rejeitar" ? "rejeitado" : "analise");
    if(nextStatus === "rejeitado" && !String(reason || "").trim()){
      toast("Informe o motivo para rejeitar.", "warning");
      return;
    }

    setBusy(true);
    try{
      const upd = await updateValidationRow(row, nextStatus, reason);
      if(!upd.ok){
        if(rlsHint(upd.error)){
          renderGate(`
            <b>Sem permissao para moderar no banco</b>
            <div>Rode o SQL de admin no Supabase e marque seu usuario como admin.</div>
            <div style="margin-top:6px;">Arquivo: <code>frontend/sql/profissional_validacao_admin.sql</code></div>
          `);
        }
        const msg = String(upd?.error?.message || "Erro ao atualizar solicitacao.");
        toast(msg, "error");
        await writeAudit(row, nextStatus, reason, `erro_update: ${msg}`);
        return;
      }

      if(nextStatus === "aprovado"){
        const promoted = await promoteUsuario(upd.row || row);
        if(!promoted.ok){
          const msg = String(promoted?.error?.message || "Aprovado, mas nao foi possivel atualizar usuarios.isProfissional.");
          toast(msg, "warning");
          await writeAudit(row, nextStatus, reason, `erro_promocao: ${msg}`);
        }else{
          toast("Solicitacao aprovada e perfil profissional liberado.", "success");
          await writeAudit(row, nextStatus, reason, "ok_aprovado");
        }
      }else if(nextStatus === "rejeitado"){
        toast("Solicitacao rejeitada.", "info");
        await writeAudit(row, nextStatus, reason, "ok_rejeitado");
      }else{
        toast("Solicitacao movida para em analise.", "info");
        await writeAudit(row, nextStatus, reason, "ok_analise");
      }

      await loadRows();
    }finally{
      setBusy(false);
    }
  }

  async function loadRows(){
    const sb = sbClient();
    if(!sb?.from){
      renderGate("<b>Supabase indisponivel</b><div>Verifique o arquivo <code>supabase-init.js</code>.</div>");
      return;
    }

    setBusy(true);
    hideGate();
    try{
      let res = await sb.from("profissional_validacao").select("*").order("updated_at", { ascending: false }).limit(400);
      if(res?.error){
        res = await sb.from("profissional_validacao").select("*").limit(400);
      }

      if(res?.error){
        if(rlsHint(res.error)){
          renderGate(`
            <b>Voce nao tem permissao de moderacao</b>
            <div>Este painel exige policy admin para ler e atualizar <code>profissional_validacao</code> e <code>usuarios</code>.</div>
            <div style="margin-top:6px;">Rode: <code>frontend/sql/profissional_validacao_admin.sql</code></div>
          `);
          refs.list.innerHTML = "";
          updateKpis([]);
          return;
        }
        renderGate(`<b>Erro ao carregar solicitacoes</b><div>${esc(res.error.message || "Falha desconhecida.")}</div>`);
        refs.list.innerHTML = "";
        updateKpis([]);
        return;
      }

      state.rows = Array.isArray(res?.data) ? res.data.slice() : [];
      state.rows.sort((a, b) => {
        const da = new Date(a?.updated_at || a?.created_at || 0).getTime() || 0;
        const db = new Date(b?.updated_at || b?.created_at || 0).getTime() || 0;
        return db - da;
      });
      updateKpis(state.rows);
      applyFilters();
    }finally{
      setBusy(false);
    }
  }

  function bindEvents(){
    refs.refreshBtn?.addEventListener("click", () => loadRows());
    refs.search?.addEventListener("input", () => applyFilters());
    refs.statusFilter?.addEventListener("change", () => applyFilters());

    refs.list?.addEventListener("click", async (ev) => {
      const btn = ev.target && ev.target.closest ? ev.target.closest("button[data-action]") : null;
      if(!btn || state.busy) return;
      const card = btn.closest(".av-card");
      if(!card) return;
      const idx = Number(card.dataset.idx || -1);
      if(!Number.isFinite(idx) || idx < 0 || idx >= state.filtered.length) return;
      const row = state.filtered[idx];
      const action = String(btn.dataset.action || "");
      if(!row || !action) return;
      const reasonEl = card.querySelector("textarea[data-role='reason']");
      const reason = String(reasonEl?.value || "").trim();
      await decide(row, action, reason);
    });
  }

  async function init(){
    bindEvents();
    const sb = sbClient();
    if(!sb?.auth){
      renderGate("<b>Supabase nao iniciado</b><div>Verifique a configuracao em <code>supabase-init.js</code>.</div>");
      return;
    }

    state.authUser = await resolveAuthUser();
    if(!state.authUser?.id){
      const next = `${window.location.pathname || "admin-validacoes.html"}${window.location.search || ""}${window.location.hash || ""}`;
      window.location.href = `login.html?next=${encodeURIComponent(next)}`;
      return;
    }

    state.me = await loadMyProfile(state.authUser.id);
    const adminCheck = await verifyAdminSession(state.me);
    state.isAdmin = !!adminCheck.ok;
    state.strictSession = !!(adminCheck.ok && adminCheck.strict);

    if(adminCheck.ok && adminCheck.strict){
      setAdminSeal("ok", "Sessao admin confirmada no banco");
    }else if(adminCheck.ok && !adminCheck.strict){
      setAdminSeal("warn", STRICT_ADMIN_MODE ? "Modo estrito ativo: fallback desabilitado" : "Admin valido por fallback local/policy");
    }else if(!adminCheck.ok && adminCheck.strict){
      setAdminSeal("err", "Sem permissao admin no banco");
    }else{
      setAdminSeal("warn", STRICT_ADMIN_MODE ? "Modo estrito: RPC admin obrigatoria" : "Nao foi possivel confirmar admin com rigor");
    }

    if(!state.isAdmin){
      renderGate(`
        <b>Acesso restrito</b>
        <div>Seu usuario ainda nao tem permissao de moderacao.</div>
        <div style="margin-top:6px;">Para liberar, rode o SQL <code>frontend/sql/profissional_validacao_admin.sql</code> e marque seu usuario com <code>isAdmin = true</code>.</div>
        ${STRICT_ADMIN_MODE ? `<div style="margin-top:6px;">Modo estrito exige <code>rpc('doke_is_admin')</code> retornando <b>true</b>.</div>` : ``}
      `);
      refs.list.innerHTML = "";
      updateKpis([]);
      return;
    }

    await loadRows();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
