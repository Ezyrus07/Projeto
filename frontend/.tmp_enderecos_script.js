(function(){
  const FORM_ID = "addrForm";
  const LIST_ID = "addrList";
  const SEARCH_ID = "addrSearch";
  const URL_PARAMS = new URLSearchParams(window.location.search);
  const CAME_FROM_ANUNCIAR = URL_PARAMS.get("from") === "anunciar";
  const RETURN_TO = String(URL_PARAMS.get("return") || "anunciar.html?from_enderecos=1").trim();
  const STATE = {
    editingId: "",
    list: []
  };

  function getSb(){
    return window.sb || window.supabase || window.supabaseClient || window.sbClient || null;
  }

  function safeParse(json, fallback){
    try { return JSON.parse(json || ""); } catch { return fallback; }
  }

  function normalizeCep(v){
    const raw = String(v || "").replace(/\D/g, "").slice(0, 8);
    if (raw.length !== 8) return raw;
    return raw.slice(0, 5) + "-" + raw.slice(5);
  }

  function normalizeUidLike(v){
    return String(v || "").trim();
  }

  function getCurrentProfile(){
    return safeParse(localStorage.getItem("doke_usuario_perfil"), null) || {};
  }

  function getCurrentUid(){
    const profile = getCurrentProfile();
    const fallbackUid = normalizeUidLike(localStorage.getItem("doke_uid"));
    const uid = normalizeUidLike(profile.uid || profile.id || fallbackUid || "guest");
    return uid || "guest";
  }

  function getStorageKey(){
    return "doke_address_book_" + getCurrentUid();
  }
  function getStorageCandidates(){
    const profile = getCurrentProfile();
    const maybeUids = [
      getCurrentUid(),
      normalizeUidLike(profile.uid),
      normalizeUidLike(profile.id),
      normalizeUidLike(localStorage.getItem("doke_uid")),
      "guest"
    ].filter(Boolean);
    const keys = maybeUids.map((u) => "doke_address_book_" + u);
    keys.push("doke_enderecos");
    return Array.from(new Set(keys));
  }
  function getSelectedStorageKey(){
    return "doke_selected_address_" + getCurrentUid();
  }

  function looksLikeUuid(value){
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
  }

  function sanitizeAddress(addr){
    return {
      id: String(addr?.id || ("addr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8))),
      label: String(addr?.label || addr?.apelido || "").trim(),
      cep: normalizeCep(addr?.cep || ""),
      endereco: String(addr?.endereco || addr?.endere�o || "").trim(),
      numero: String(addr?.numero || addr?.n�mero || "").trim(),
      complemento: String(addr?.complemento || "").trim(),
      referencia: String(addr?.referencia || "").trim(),
      info: String(addr?.info || "").trim(),
      principal: !!addr?.principal,
      updatedAt: String(addr?.updatedAt || addr?.updated_at || new Date().toISOString())
    };
  }

  function mergeAddressLists(lists){
    const map = new Map();
    (Array.isArray(lists) ? lists : []).forEach((list) => {
      if (!Array.isArray(list)) return;
      list.forEach((raw) => {
        const addr = sanitizeAddress(raw);
        const dedupeKey = [
          String(addr.cep || "").replace(/\D/g, ""),
          String(addr.endereco || "").trim().toLowerCase(),
          String(addr.numero || "").trim().toLowerCase(),
          String(addr.complemento || "").trim().toLowerCase()
        ].join("|") || String(addr.id || "");
        const prev = map.get(dedupeKey);
        if (!prev || (addr.principal && !prev.principal)) {
          map.set(dedupeKey, addr);
        }
      });
    });
    const out = Array.from(map.values()).slice(0, 40);
    if (out.length && !out.some((x) => !!x.principal)) out[0].principal = true;
    return out;
  }

  function readLocal(){
    const lists = getStorageCandidates().map((key) => {
      const arr = safeParse(localStorage.getItem(key), []);
      return Array.isArray(arr) ? arr : [];
    });
    return mergeAddressLists(lists);
  }

  function writeLocal(list){
    const safe = (Array.isArray(list) ? list : []).map(sanitizeAddress).slice(0, 40);
    localStorage.setItem(getStorageKey(), JSON.stringify(safe));
    localStorage.setItem("doke_enderecos", JSON.stringify(safe));
    const profile = safeParse(localStorage.getItem("doke_usuario_perfil"), null);
    if (profile && typeof profile === "object") {
      profile.enderecosSalvos = safe;
      localStorage.setItem("doke_usuario_perfil", JSON.stringify(profile));
    }
    return safe;
  }

  function esc(v){
    return String(v || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function enderecoResumo(addr){
    const p1 = [addr.endereco, addr.numero ? ("N� " + addr.numero) : ""].filter(Boolean).join(", ");
    const p2 = [addr.complemento, addr.referencia].filter(Boolean).join(" � ");
    return { p1, p2, info: String(addr.info || "").trim() };
  }

  function montarTitulo(addr, idx){
    const custom = String(addr.label || "").trim();
    if (custom) return custom;
    if (addr.principal || idx === 0) return "Endere�o principal";
    return "Endere�o " + (idx + 1);
  }

  function applyFilter(list){
    const q = String(document.getElementById(SEARCH_ID)?.value || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter((addr) => {
      const hay = [
        addr.label, addr.cep, addr.endereco, addr.numero, addr.complemento, addr.referencia, addr.info
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  function renderList(){
    const wrap = document.getElementById(LIST_ID);
    if (!wrap) return;
    const filtered = applyFilter(STATE.list);
    if (!filtered.length) {
      wrap.innerHTML = '<div class="addr-empty">Nenhum endere�o encontrado.</div>';
      return;
    }
    wrap.innerHTML = filtered.map((addr, idx) => {
      const resumo = enderecoResumo(addr);
      const principal = !!addr.principal;
      return `
        <article class="addr-card ${principal ? "is-principal" : ""}" data-id="${esc(addr.id)}">
          <div class="addr-pin">
            <i class='bx ${principal ? "bxs-check-circle" : "bx-map"}'></i>
          </div>
          <div class="addr-main">
            ${principal ? `<span class="addr-badge"><i class='bx bxs-star'></i> Principal</span>` : ``}
            <h3>${esc(montarTitulo(addr, idx))}</h3>
            <p>${esc(resumo.p1)}</p>
            ${resumo.p2 ? `<p class="muted">${esc(resumo.p2)}</p>` : ``}
            ${addr.cep ? `<p class="muted">CEP ${esc(addr.cep)}</p>` : ``}
            ${resumo.info ? `<p class="muted">${esc(resumo.info)}</p>` : ``}
          </div>
          <div class="addr-menu">
            <button type="button" data-action="principal" class="${principal ? "is-active" : ""}" title="Definir como principal"><i class='bx ${principal ? "bxs-star" : "bx-star"}'></i></button>
            <button type="button" data-action="editar" title="Editar"><i class='bx bx-pencil'></i></button>
            <button type="button" data-action="excluir" title="Excluir"><i class='bx bx-trash'></i></button>
          </div>
        </article>
      `;
    }).join("");
  }

  function fillForm(addr){
    document.getElementById("addrLabel").value = addr?.label || "";
    document.getElementById("addrCep").value = addr?.cep || "";
    document.getElementById("addrEndereco").value = addr?.endereco || "";
    document.getElementById("addrNumero").value = addr?.numero || "";
    document.getElementById("addrComplemento").value = addr?.complemento || "";
    document.getElementById("addrReferencia").value = addr?.referencia || "";
    document.getElementById("addrInfo").value = addr?.info || "";
  }

  function readForm(){
    return sanitizeAddress({
      id: STATE.editingId || "",
      label: document.getElementById("addrLabel").value,
      cep: document.getElementById("addrCep").value,
      endereco: document.getElementById("addrEndereco").value,
      numero: document.getElementById("addrNumero").value,
      complemento: document.getElementById("addrComplemento").value,
      referencia: document.getElementById("addrReferencia").value,
      info: document.getElementById("addrInfo").value
    });
  }

  function formIsValid(addr){
    return !!(String(addr.cep || "").replace(/\D/g, "").length === 8 && String(addr.endereco || "").trim() && String(addr.numero || "").trim());
  }

  function closeForm(){
    STATE.editingId = "";
    const form = document.getElementById(FORM_ID);
    form?.classList.remove("show");
    fillForm(null);
  }

  function openForm(addr){
    const form = document.getElementById(FORM_ID);
    if (!form) return;
    STATE.editingId = String(addr?.id || "");
    fillForm(addr || null);
    form.classList.add("show");
    setTimeout(() => document.getElementById("addrLabel")?.focus(), 30);
  }

  async function loadRemote(){
    try {
      const sb = getSb();
      const uid = getCurrentUid();
      if (!sb?.from || !uid || uid === "guest") return null;
      const { data, error } = await sb
        .from("enderecos_usuario")
        .select("id, apelido, cep, endereco, numero, complemento, referencia, info, principal, updated_at, ativo")
        .eq("usuario_uid", uid)
        .eq("ativo", true)
        .order("principal", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (Array.isArray(data) ? data : []).map((row) => sanitizeAddress({
        id: row.id,
        label: row.apelido || "",
        cep: row.cep || "",
        endereco: row.endereco || "",
        numero: row.numero || "",
        complemento: row.complemento || "",
        referencia: row.referencia || "",
        info: row.info || "",
        principal: !!row.principal,
        updated_at: row.updated_at
      }));
    } catch (e) {
      console.warn("[enderecos] fallback local", e);
      return null;
    }
  }

  async function saveRemote(addr, forcePrincipal){
    try {
      const sb = getSb();
      const uid = getCurrentUid();
      if (!sb?.from || !uid || uid === "guest") return null;

      const payload = {
        usuario_uid: uid,
        uid: looksLikeUuid(uid) ? uid : null,
        apelido: addr.label || "",
        cep: addr.cep || "",
        endereco: addr.endereco || "",
        numero: addr.numero || "",
        complemento: addr.complemento || "",
        referencia: addr.referencia || "",
        info: addr.info || "",
        principal: !!forcePrincipal,
        ativo: true
      };

      if (forcePrincipal) {
        await sb.from("enderecos_usuario").update({ principal: false }).eq("usuario_uid", uid).eq("ativo", true);
      }

      if (looksLikeUuid(addr.id)) {
        const { data, error } = await sb
          .from("enderecos_usuario")
          .update(payload)
          .eq("id", addr.id)
          .eq("usuario_uid", uid)
          .select("id, apelido, cep, endereco, numero, complemento, referencia, info, principal, updated_at")
          .maybeSingle();
        if (!error && data) return data;
      }

      const { data, error } = await sb
        .from("enderecos_usuario")
        .insert([payload])
        .select("id, apelido, cep, endereco, numero, complemento, referencia, info, principal, updated_at")
        .maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (e) {
      console.warn("[enderecos] save remote falhou", e);
      return null;
    }
  }

  async function setPrincipalRemote(id){
    try {
      const sb = getSb();
      const uid = getCurrentUid();
      if (!sb?.from || !uid || uid === "guest" || !looksLikeUuid(id)) return;
      await sb.from("enderecos_usuario").update({ principal: false }).eq("usuario_uid", uid).eq("ativo", true);
      await sb.from("enderecos_usuario").update({ principal: true }).eq("id", id).eq("usuario_uid", uid);
    } catch (e) {
      console.warn("[enderecos] set principal remote falhou", e);
    }
  }

  async function deleteRemote(id){
    try {
      const sb = getSb();
      const uid = getCurrentUid();
      if (!sb?.from || !uid || uid === "guest" || !looksLikeUuid(id)) return;
      await sb.from("enderecos_usuario").update({ ativo: false, principal: false }).eq("id", id).eq("usuario_uid", uid);
    } catch (e) {
      console.warn("[enderecos] delete remote falhou", e);
    }
  }

  async function saveAddress(){
    const addr = readForm();
    if (!formIsValid(addr)) {
      (window.dokeAlert || alert)("Preencha CEP, endere�o e n�mero.");
      return;
    }
    const list = [...STATE.list];
    const idx = list.findIndex((x) => String(x.id) === String(addr.id));
    const hasPrincipal = list.some((x) => !!x.principal && String(x.id) !== String(addr.id));
    addr.principal = idx >= 0 ? !!list[idx].principal : !hasPrincipal;

    if (idx >= 0) list[idx] = addr;
    else list.unshift(addr);

    STATE.list = writeLocal(list);
    renderList();
    closeForm();
    if (window.dokeToast) window.dokeToast(idx >= 0 ? "Endere�o atualizado." : "Endere�o salvo.");

    const remote = await saveRemote(addr, !!addr.principal);
    if (remote) {
      const refreshed = STATE.list.map((x) => String(x.id) === String(addr.id) ? sanitizeAddress({
        ...x,
        id: remote.id || x.id,
        label: remote.apelido || x.label,
        principal: !!remote.principal,
        updated_at: remote.updated_at
      }) : x);
      STATE.list = writeLocal(refreshed);
      renderList();
    }
  }

  async function markAsPrincipal(id){
    const list = STATE.list.map((x) => ({ ...x, principal: String(x.id) === String(id) }));
    STATE.list = writeLocal(list);
    renderList();
    if (window.dokeToast) window.dokeToast("Endere�o principal atualizado.");
    await setPrincipalRemote(id);
  }

  async function removeAddress(id){
    const current = STATE.list.find((x) => String(x.id) === String(id));
    if (!current) return;
    if (!confirm("Deseja remover este endere�o?")) return;
    let list = STATE.list.filter((x) => String(x.id) !== String(id));
    if (!list.some((x) => !!x.principal) && list.length) list[0].principal = true;
    STATE.list = writeLocal(list);
    renderList();
    await deleteRemote(id);
    if (current.principal && list.length) await setPrincipalRemote(list[0].id);
  }

  function wireEvents(){
    if (CAME_FROM_ANUNCIAR) {
      const backBtn = document.getElementById("btnVoltarAnunciar");
      if (backBtn) {
        backBtn.style.display = "inline-flex";
        backBtn.addEventListener("click", () => {
          window.location.href = RETURN_TO;
        });
      }
    }
    document.getElementById("btnNovoEndereco")?.addEventListener("click", () => openForm(null));
    document.getElementById("btnCancelarEndereco")?.addEventListener("click", () => closeForm());
    document.getElementById(FORM_ID)?.addEventListener("submit", (e) => {
      e.preventDefault();
      saveAddress().catch((err) => console.error(err));
    });
    document.getElementById("addrCep")?.addEventListener("input", (e) => {
      e.target.value = normalizeCep(e.target.value);
    });
    document.getElementById(SEARCH_ID)?.addEventListener("input", renderList);

    document.getElementById(LIST_ID)?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-action]");
      const card = ev.target.closest(".addr-card");
      if (!card) return;
      const id = String(card.dataset.id || "");
      if (!id) return;
      if (!btn && CAME_FROM_ANUNCIAR) {
        const found = STATE.list.find((x) => String(x.id) === id);
        if (found) {
          localStorage.setItem(getSelectedStorageKey(), JSON.stringify(sanitizeAddress(found)));
          window.location.href = RETURN_TO;
        }
        return;
      }
      if (!btn) return;
      const action = String(btn.dataset.action || "");
      if (action === "principal") {
        markAsPrincipal(id).catch((e) => console.error(e));
        return;
      }
      if (action === "editar") {
        const found = STATE.list.find((x) => String(x.id) === id);
        if (found) openForm(found);
        return;
      }
      if (action === "excluir") {
        removeAddress(id).catch((e) => console.error(e));
      }
    });
  }

  async function initProfile(){
    const profile = safeParse(localStorage.getItem("doke_usuario_perfil"), null);
    const logged = localStorage.getItem("usuarioLogado") === "true" || !!profile;
    if (!logged) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  async function init(){
    const ok = await initProfile();
    if (!ok) return;
    wireEvents();
    STATE.list = writeLocal(readLocal());
    renderList();

    const remoteList = await loadRemote();
    if (Array.isArray(remoteList) && remoteList.length) {
      STATE.list = writeLocal(remoteList);
      renderList();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();