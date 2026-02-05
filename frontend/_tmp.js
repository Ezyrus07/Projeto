/* DOKE — Perfil (upgrade) | Supabase
   Requer:
   - <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   - <script src="supabase-init.js"></script>  (cria window.sb)
*/

(() => {
  "use strict";

  // -----------------------------
  // Helpers
  // -----------------------------
  const root = document.documentElement;
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));
  const LS = {
    get(key, fallback){
      try{
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      }catch(_){
        return fallback;
      }
    },
    set(key, value){
      try{
        localStorage.setItem(key, JSON.stringify(value));
      }catch(_){}
    }
  };
  const fmtDateShort = (iso)=>{
    if(!iso) return "";
    const d = new Date(iso);
    if(Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString('pt-BR');
  };
  const setIconButton = (btn, icon, title)=>{
    if(!btn) return;
    btn.innerHTML = `<i class='bx ${icon}'></i>`;
    if (title) {
      btn.title = title;
      btn.setAttribute("aria-label", title);
    }
    btn.classList.add("dp-icon-only");
  };

  // -----------------------------
  // Toast
  // -----------------------------
  let toastEl;
  function toast(msg){
    try{
      if(!toastEl){
        toastEl = document.createElement("div");
        toastEl.className = "dp-toast";
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = msg;
      toastEl.style.display = "block";
      clearTimeout(toastEl._t);
      toastEl._t = setTimeout(()=> toastEl.style.display="none", 2600);
    }catch(e){ console.log(msg); }
  }

  function supa(){
    return window.sb || window.supabaseClient || window.sbClient || window.supabase;
  }

  function mustSupa(){
    const c = supa();
    if(!c?.from || !c?.auth){
      console.error("[DOKE] Supabase não inicializado. Verifique supabase-init.js.");
      toast("Supabase não configurado.");
      return null;
    }
    return c;
  }

  // -----------------------------
  // Amizades
  // -----------------------------
  async function getFriendStatus(client, meUid, otherUid){
    if(!client || !meUid || !otherUid) return { status: "none" };
    try{
      const [outRes, inRes] = await Promise.all([
        client.from("amizades").select("*").eq("deUid", meUid).eq("paraUid", otherUid).limit(1),
        client.from("amizades").select("*").eq("deUid", otherUid).eq("paraUid", meUid).limit(1)
      ]);
      const outRow = outRes?.data?.[0] || null;
      const inRow = inRes?.data?.[0] || null;

      const outStatus = outRow ? String(outRow.status || "").toLowerCase() : "";
      const inStatus = inRow ? String(inRow.status || "").toLowerCase() : "";

      if (outStatus === "aceito" || inStatus === "aceito") {
        return { status: "aceito", id: outRow?.id || inRow?.id || "", direction: outStatus === "aceito" ? "out" : "in" };
      }
      if (inStatus === "pendente") return { status: "pendente_in", id: inRow.id, direction: "in" };
      if (outStatus === "pendente") return { status: "pendente_out", id: outRow.id, direction: "out" };
      if (inStatus === "recusado") return { status: "recusado", id: inRow.id, direction: "in" };
      if (outStatus === "recusado") return { status: "recusado", id: outRow.id, direction: "out" };
      return { status: "none" };
    }catch(e){
      console.warn("Falha ao buscar amizade:", e);
      return { status: "none" };
    }
  }

  async function updateFriendButton(ctx){
    const btn = $("#dpFriendBtn");
    const msgBtn = $("#dpMessageBtn");
    if(!btn) return;
    if(ctx?.canEdit){
      btn.style.display = "none";
      if (msgBtn) msgBtn.style.display = "none";
      return;
    }
    if(!ctx?.me){
      btn.style.display = "inline-flex";
      btn.dataset.friendStatus = "nologin";
      setIconButton(btn, "bx-user-plus", "Entrar para adicionar");
      if (msgBtn) msgBtn.style.display = "none";
      return;
    }
    const meUid = ctx.me.uid || ctx.me.id;
    const otherUid = ctx.target?.uid || ctx.target?.id;
    if(!meUid || !otherUid){
      btn.style.display = "none";
      return;
    }
    const client = ctx.client;
    const rel = await getFriendStatus(client, meUid, otherUid);
    btn.style.display = "inline-flex";
    btn.dataset.friendStatus = rel.status || "none";
    btn.dataset.friendId = rel.id || "";
    btn.dataset.friendDirection = rel.direction || "";

    if (rel.status === "aceito") {
      setIconButton(btn, "bx-user-minus", "Desfazer amizade");
    } else if (rel.status === "pendente_out") {
      setIconButton(btn, "bx-time", "Cancelar pedido de amizade");
    } else if (rel.status === "pendente_in") {
      setIconButton(btn, "bx-user-check", "Aceitar amizade");
    } else if (rel.status === "recusado") {
      setIconButton(btn, "bx-user-plus", "Novo pedido de amizade");
    } else {
      setIconButton(btn, "bx-user-plus", "Adicionar amizade");
    }
    if (msgBtn) {
      const canMessage = rel.status === "aceito";
      msgBtn.style.display = canMessage ? "inline-flex" : "none";
      msgBtn.onclick = () => {
        const otherUidMsg = ctx.target?.uid || ctx.target?.id;
        if (!otherUidMsg) return;
        window.location.href = `chat.html?uid=${encodeURIComponent(otherUidMsg)}`;
      };
      if (canMessage) setIconButton(msgBtn, "bx-message-rounded", "Enviar mensagem");
    }
  }

  async function handleFriendAction(ctx){
    const btn = $("#dpFriendBtn");
    if(!btn) return;
    const status = btn.dataset.friendStatus || "none";
    if (status === "nologin") {
      window.location.href = "login.html";
      return;
    }
    const relId = btn.dataset.friendId || "";
    const client = ctx.client;
    const meUid = ctx.me.uid || ctx.me.id;
    const otherUid = ctx.target?.uid || ctx.target?.id;
    if(!client || !meUid || !otherUid) return;

    const sendFriendNotif = async () => {
      try{
        if (typeof window.criarNotificacaoSocial === "function") {
          await window.criarNotificacaoSocial({ acao: "pedido_amizade", paraUid: otherUid });
          return;
        }
        if (!window.db || !window.addDoc || !window.collection) return;
        const actorNome = ctx?.me?.nome || ctx?.me?.user || "Usuario";
        const actorUser = ctx?.me?.user ? (String(ctx.me.user).startsWith("@") ? ctx.me.user : `@${ctx.me.user}`) : "@usuario";
        const actorFoto = ctx?.me?.foto || "https://placehold.co/50";
        await window.addDoc(window.collection(window.db, "notificacoes"), {
          parauid: otherUid,
          deuid: meUid,
          denome: actorNome,
          deuser: actorUser,
          defoto: actorFoto,
          acao: "pedido_amizade",
          lida: false,
          createdat: new Date().toISOString(),
          link: `perfil-cliente.html?id=${encodeURIComponent(meUid)}`
        });
      }catch(e){}
    };

    try{
      if (status === "aceito") {
        if (!confirm("Remover amizade?")) return;
        if (relId) {
          await client.from("amizades").delete().eq("id", relId);
        } else {
          await client.from("amizades").delete().eq("deUid", meUid).eq("paraUid", otherUid);
          await client.from("amizades").delete().eq("deUid", otherUid).eq("paraUid", meUid);
        }
        toast("Amizade removida.");
      } else if (status === "pendente_in") {
        await client.from("amizades").update({
          status: "aceito",
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq("id", relId);
        toast("Amizade aceita!");
      } else if (status === "pendente_out") {
        await client.from("amizades").update({
          status: "recusado",
          updated_at: new Date().toISOString()
        }).eq("id", relId);
        toast("Pedido cancelado.");
      } else {
        if (status === "recusado" && relId) {
          await client.from("amizades").update({
            status: "pendente",
            updated_at: new Date().toISOString()
          }).eq("id", relId);
          await sendFriendNotif();
        } else {
          await client.from("amizades").insert({
            deUid: meUid,
            paraUid: otherUid,
            status: "pendente",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          await sendFriendNotif();
        }
        toast("Pedido de amizade enviado.");
      }
    }catch(e){
      console.error(e);
      toast("Nao foi possivel atualizar amizade.");
    }
    await updateFriendButton(ctx);
  }

  // -----------------------------
  // Seguidores
  // -----------------------------
  async function getFollowStatus(client, meUid, otherUid){
    if(!client || !meUid || !otherUid) return { following: false, isFollower: false };
    try{
      const [outRes, inRes] = await Promise.all([
        client
          .from("seguidores")
          .select("id")
          .eq("seguidorUid", meUid)
          .eq("seguidoUid", otherUid)
          .limit(1),
        client
          .from("seguidores")
          .select("id")
          .eq("seguidorUid", otherUid)
          .eq("seguidoUid", meUid)
          .limit(1)
      ]);
      const following = !!(outRes?.data && outRes.data[0]);
      const isFollower = !!(inRes?.data && inRes.data[0]);
      return { following, isFollower, id: outRes?.data?.[0]?.id || "" };
    }catch(e){
      return { following: false, isFollower: false };
    }
  }

  async function updateFollowButton(ctx){
    const btn = $("#dpFollowBtn");
    if(!btn) return;
    if(ctx?.canEdit){
      btn.style.display = "none";
      return;
    }
    if(!ctx?.me){
      btn.style.display = "inline-flex";
      btn.dataset.following = "nologin";
      btn.classList.remove("dp-icon-only");
      btn.innerHTML = "<i class='bx bx-heart'></i> Entrar para seguir";
      btn.title = "Entrar para seguir";
      return;
    }
    const meUid = ctx.me.uid || ctx.me.id;
    const otherUid = ctx.target?.uid || ctx.target?.id;
    if(!meUid || !otherUid){
      btn.style.display = "none";
      return;
    }
    const rel = await getFollowStatus(ctx.client, meUid, otherUid);
    btn.style.display = "inline-flex";
    btn.dataset.following = rel.following ? "1" : "0";
    btn.dataset.followId = rel.id || "";
    btn.classList.remove("dp-icon-only");
    if (rel.following) {
      btn.innerHTML = "<i class='bx bx-heart'></i> Deixar de seguir";
      btn.title = "Deixar de seguir";
    } else if (rel.isFollower) {
      btn.innerHTML = "<i class='bx bx-heart'></i> Seguir de volta";
      btn.title = "Seguir de volta";
    } else {
      btn.innerHTML = "<i class='bx bx-heart'></i> Seguir";
      btn.title = "Seguir";
    }
  }

  async function handleFollowAction(ctx){
    const btn = $("#dpFollowBtn");
    if(!btn) return;
    if (btn.dataset.following === "nologin") {
      window.location.href = "login.html";
      return;
    }
    const following = btn.dataset.following === "1";
    const followId = btn.dataset.followId || "";
    const meUid = ctx.me.uid || ctx.me.id;
    const otherUid = ctx.target?.uid || ctx.target?.id;
    const client = ctx.client;
    if(!client || !meUid || !otherUid) return;

    const sendFollowNotif = async () => {
      try{
        if (typeof window.criarNotificacaoSocial === "function") {
          await window.criarNotificacaoSocial({ acao: "seguir_usuario", paraUid: otherUid });
          return;
        }
        if (!window.db || !window.addDoc || !window.collection) return;
        const actorNome = ctx?.me?.nome || ctx?.me?.user || "Usuario";
        const actorUser = ctx?.me?.user ? (String(ctx.me.user).startsWith("@") ? ctx.me.user : `@${ctx.me.user}`) : "@usuario";
        const actorFoto = ctx?.me?.foto || "https://placehold.co/50";
        await window.addDoc(window.collection(window.db, "notificacoes"), {
          parauid: otherUid,
          deuid: meUid,
          denome: actorNome,
          deuser: actorUser,
          defoto: actorFoto,
          acao: "seguir_usuario",
          lida: false,
          createdat: new Date().toISOString(),
          link: `perfil-cliente.html?id=${encodeURIComponent(meUid)}`
        });
      }catch(e){}
    };

    try{
      if (following && followId) {
        btn.dataset.following = "0";
        btn.innerHTML = "<i class='bx bx-heart'></i> Seguir";
        const fEl = $("#dpFollowers");
        if (fEl && /^\d+$/.test(String(fEl.textContent || ""))) {
          fEl.textContent = String(Math.max(0, Number(fEl.textContent) - 1));
        }
        await client.from("seguidores").delete().eq("id", followId);
        toast("Deixou de seguir.");
      } else {
        btn.dataset.following = "1";
        btn.innerHTML = "<i class='bx bx-heart'></i> Seguindo";
        const fEl = $("#dpFollowers");
        if (fEl && /^\d+$/.test(String(fEl.textContent || ""))) {
          fEl.textContent = String(Number(fEl.textContent) + 1);
        }
        await client.from("seguidores").insert({
          seguidorUid: meUid,
          seguidoUid: otherUid,
          created_at: new Date().toISOString()
        });
        await sendFollowNotif();
        toast("Agora você está seguindo.");
      }
    }catch(e){
      console.error(e);
      toast("Nao foi possivel atualizar seguir.");
    }
    await updateFollowButton(ctx);
    await updateFollowCounts(ctx);
  }

  async function updateFollowCounts(ctx){
    const client = ctx?.client;
    if(!client) return;
    const targetUid = ctx?.target?.uid || ctx?.target?.id;
    const meUid = ctx?.me?.uid || ctx?.me?.id;
    if(!targetUid) return;
    try{
      const [followersRes, followingRes] = await Promise.all([
        client.from("seguidores").select("id", { count: "exact", head: true }).eq("seguidoUid", targetUid),
        client.from("seguidores").select("id", { count: "exact", head: true }).eq("seguidorUid", targetUid)
      ]);
      const followers = typeof followersRes.count === "number" ? followersRes.count : 0;
      const following = typeof followingRes.count === "number" ? followingRes.count : 0;
      setText("#dpFollowers", String(followers));
      setText("#dpFollowing", String(following));
      if (meUid && meUid === targetUid) {
        // para o próprio perfil, mantém visível o número atualizado
      }
    }catch(e){}
  }

  // -----------------------------
  // UI: Modal
  // -----------------------------
  const modal = {
    overlay: null,
    title: null,
    body: null,
    onSave: null,
    open(title, html, onSave, opts){
      this.overlay = this.overlay || $("#dpModalOverlay");
      this.title = this.title || $("#dpModalTitle");
      this.body = this.body || $("#dpModalBody");
      this.onSave = onSave || null;

      this.title.textContent = title;
      this.body.innerHTML = html;
      const saveBtn = $("#dpModalSave");
      if (saveBtn) saveBtn.textContent = opts?.saveLabel || "Salvar";
      this.overlay.classList.add("open");
      if (window.updateScrollLock) window.updateScrollLock();

      $("#dpModalClose")?.addEventListener("click", ()=> this.close(), { once:true });
      $("#dpModalCancel")?.addEventListener("click", ()=> this.close(), { once:true });
      saveBtn?.addEventListener("click", async ()=>{
        if(!this.onSave) return;
        saveBtn.disabled = true;
        const original = saveBtn.textContent;
        saveBtn.textContent = opts?.savingLabel || "Salvando...";
        try{
          await this.onSave();
        }finally{
          saveBtn.disabled = false;
          saveBtn.textContent = original;
        }
      }, { once:true });
    },
    close(){
      this.overlay?.classList.remove("open");
      if (window.updateScrollLock) window.updateScrollLock();
      this.onSave = null;
      this.body && (this.body.innerHTML = "");
    }
  };

  // -----------------------------
  // UI: Dropdown (3 dots)
  // -----------------------------
  let dd;
  function ensureDropdown(){
    if(dd) return dd;
    dd = document.createElement("div");
    dd.className = "dp-dd";
    dd.id = "dpMoreMenu";
    dd.innerHTML = `
      <a href="#" id="dpMenuViewAs"><span></span> Ver como cliente</a>
      <a href="tornar-profissional.html" id="dpMenuBecomePro"><span></span> Quero ser Profissional</a>
      <a href="anunciar.html" id="dpMenuAds"><span></span> Gerenciar anúncios</a>
      <hr/>
      <button type="button" id="dpMenuLogout"><span></span> Sair</button>
    `;
    document.body.appendChild(dd);

    document.addEventListener("click", (e)=>{
      const btn = $("#dpMoreBtn");
      if(btn && (btn === e.target || btn.contains(e.target))) return;
      if(dd.contains(e.target)) return;
      dd.classList.remove("open");
    });
    window.addEventListener("resize", ()=> dd.classList.remove("open"));
    window.addEventListener("scroll", ()=> dd.classList.remove("open"), { passive:true });

    return dd;
  }

  function openDropdown(anchorEl, ctx){
    const menu = ensureDropdown();

    // show/hide items
    const become = $("#dpMenuBecomePro", menu);
    if(become) become.style.display = ctx.me?.isProfissional ? "none" : "flex";

    const viewAs = $("#dpMenuViewAs", menu);
    if(viewAs){
      viewAs.onclick = (e)=>{
        e.preventDefault();
        // alterna para view público do próprio perfil (cliente)
        const id = ctx.target?.id || ctx.targetId;
        const isPro = !!ctx.target?.isProfissional;
        const dest = isPro ? "perfil-profissional.html" : "perfil-cliente.html";
        window.location.href = `${dest}?id=${encodeURIComponent(id)}`;
      };
    }

    $("#dpMenuLogout", menu).onclick = async ()=>{
      const client = mustSupa();
      if(!client) return;
      await client.auth.signOut();
      toast("Saiu da conta.");
      setTimeout(()=> window.location.href = "login.html", 400);
    };

    const r = anchorEl.getBoundingClientRect();
    const top = Math.min(window.innerHeight - 12, r.bottom + 10);
    const left = Math.min(window.innerWidth - 12, Math.max(12, r.right - 260));
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.classList.add("open");
  }

  // -----------------------------
  // Storage helpers
  // -----------------------------
  async function uploadToStorage(client, { bucket, path, file }){
    try{
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safePath = `${path}.${ext}`.replaceAll("//","/");
      const { error: upErr } = await client.storage.from(bucket).upload(safePath, file, { upsert: true, cacheControl: "3600" });
      if(upErr) return { error: upErr };
      const { data } = client.storage.from(bucket).getPublicUrl(safePath);
      return { url: data?.publicUrl || null, path: safePath };
    }catch(e){
      return { error: e };
    }
  }

  function fileToDataUrl(file){
    return new Promise((resolve)=>{
      const r = new FileReader();
      r.onload = ()=> resolve(r.result);
      r.onerror = ()=> resolve(null);
      r.readAsDataURL(file);
    });
  }

  // -----------------------------
  // Data helpers (usuarios)
  // -----------------------------
  async function getSessionUser(client){
    const { data, error } = await client.auth.getSession();
    if(error) return { error };
    return { session: data?.session || null, user: data?.session?.user || null };
  }

  async function getUsuarioByAuthUid(client, authUid){
    const { data, error } = await client
      .from("usuarios")
      .select("*")
      .eq("uid", authUid)
      .maybeSingle();
    if(error) return { error };
    return { usuario: data || null };
  }

  async function getUsuarioById(client, id){
    // Tenta por "id" e, se não achar, tenta por "uid" (muitos projetos guardam o auth.uid aqui)
    let r = await client.from("usuarios").select("*").eq("id", id).maybeSingle();
    if(!r.error && !r.data){
      r = await client.from("usuarios").select("*").eq("uid", id).maybeSingle();
    }
    if(r.error) return { error: r.error };
    return { usuario: r.data || null };
  }

  async function getUsuarioByUsername(client, username){
    const { data, error } = await client
      .from("usuarios")
      .select("*")
      .eq("user", username)
      .maybeSingle();
    if(error) return { error };
    return { usuario: data || null };
  }

  async function updateUsuario(client, rowId, patch){
    // Atualiza por id; se não afetar ninguém, tenta por uid.
    let r = await client.from("usuarios").update(patch).eq("id", rowId).select("id,uid");
    if(r.error) return { error: r.error };
    if(Array.isArray(r.data) && r.data.length) return { error: null };

    r = await client.from("usuarios").update(patch).eq("uid", rowId).select("id,uid");
    return { error: r.error || null };
  }

  function parseStats(usuario){
    const s = usuario?.stats;
    if(!s) return {};
    if(typeof s === "object") return s;
    try{ return JSON.parse(s); }catch(_){ return {}; }
  }

  async function patchStats(client, rowId, currentStats, patchObj){
    const next = deepMerge(structuredClone(currentStats || {}), patchObj || {});
    const { error } = await updateUsuario(client, rowId, { stats: next });
    return { error, stats: next };
  }

  function deepMerge(a, b){
    if(!b || typeof b !== "object") return a;
    for(const k of Object.keys(b)){
      const bv = b[k];
      if(bv && typeof bv === "object" && !Array.isArray(bv)){
        a[k] = deepMerge(a[k] && typeof a[k]==="object" ? a[k] : {}, bv);
      }else{
        a[k] = bv;
      }
    }
    return a;
  }

  // -----------------------------
  // Profile rendering
  // -----------------------------
  function setCover(url){
    const el = $("#dpCover");
    if(!el) return;
    if(url) el.style.backgroundImage = `url('${url}')`;
  }
  function setAvatar(url, fallbackLetter){
    const img = $("#dpAvatarImg");
    const letter = $("#dpAvatarLetter");
    if(img){
      if(url){
        img.src = url;
        img.style.display = "block";
        letter && (letter.style.display = "none");
      }else{
        img.removeAttribute("src");
        img.style.display = "none";
        if(letter){
          letter.textContent = (fallbackLetter || "U").slice(0,1).toUpperCase();
          letter.style.display = "flex";
        }
      }
    }
  }

  function setText(id, value){
    const el = $(id);
    if(el) el.textContent = value ?? "";
  }

  function setHTML(id, value){
    const el = $(id);
    if(el) el.innerHTML = value ?? "";
  }

function ensureTheme(ctx, theme){
  const root = $("#dpRoot");
  const t = theme || ctx?.pageTheme || (roleFromUsuario(ctx?.usuario) === "profissional" ? "profissional" : "cliente");
  if(!root) return t;
  root.classList.toggle("dp-theme-profissional", t === "profissional");
  root.setAttribute("data-dp-theme", t);
  return t;
}

function hideIf(selector, cond){
    $$(selector).forEach(el => el.style.display = cond ? "none" : "");
  }

  function showIf(selector, cond){
    $$(selector).forEach(el => el.style.display = cond ? "" : "none");
  }

  function safeStr(v){ return (v ?? "").toString().trim(); }

  function roleFromUsuario(usuario){
    return usuario?.isProfissional ? "profissional" : "cliente";
  }

  function isMissingTableError(err){
    if(!err) return false;
    const msg = (err.message||"") + " " + (err.hint||"") + " " + (err.details||"");
    return err.code === "PGRST205" || err.status === 404 || /could not find the table/i.test(msg) || /not found/i.test(msg);
  }

  function isMissingColumnError(err, column){
    if(!err) return false;
    const msg = String(err.message || "").toLowerCase();
    return err.code === "PGRST204" && msg.includes(`'${String(column).toLowerCase()}'`);
  }

  async function safeSelect(queryFn){
    try{
      const { data, error } = await queryFn();
      if(error){
        if(isMissingTableError(error)) return { data: null, error: null, missing: true };
        return { data: null, error, missing: false };
      }
      return { data, error: null, missing: false };
    }catch(e){
      return { data: null, error: e, missing: false };
    }
  }

  // -----------------------------
  // Sections loaders
  // -----------------------------
  async function loadPublicacoes(client, userId, ctx){
    const grid = $("#dpGridPublicacoes");
    if(!grid) return;
    grid.classList.add("dp-grid--masonry");
    grid.innerHTML = `<div class="dp-empty">Carregando publicações...</div>`;
    const { data, error } = await client
      .from("publicacoes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending:false })
      .limit(40);
    if(error){
      if(isMissingTableError(error)){
        grid.innerHTML = `<div class="dp-empty">Nenhuma publicação ainda.</div>`;
        return;
      }
      grid.innerHTML = `<div class="dp-empty">Erro ao carregar. Se você ainda não criou as tabelas do perfil, rode o arquivo <b>supabase_schema.sql</b>.</div>`;
      console.error(error);
      return;
    }
    if(!data?.length){
      grid.innerHTML = `<div class="dp-empty">Sem publicações ainda.</div>`;
      return;
    }
    grid.innerHTML = "";
    const canEdit = !!ctx?.canEdit;
    for(const item of data){
      const poster = item.thumb_url ? ` poster="${item.thumb_url}"` : "";
      const media = item.tipo === "video"
        ? `<video src="${item.media_url}"${item.thumb_url ? ` poster="${item.thumb_url}"` : ``} preload="metadata" muted playsinline></video>`
        : (item.tipo === "antes_depois" && item.thumb_url
            ? `<div class="dp-ba js-antes-depois" data-before="${item.media_url}" data-after="${item.thumb_url}"><img src="${item.media_url}" loading="lazy" alt=""><span class="dp-ba-badge">Antes</span></div>`
            : `<img src="${item.media_url}" loading="lazy" alt="">`);
      const card = document.createElement("div");
      card.className = "dp-item dp-item--clickable";
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      const title = item.titulo || item.legenda || "";
      const desc = item.descricao || (item.titulo ? item.legenda : "") || "";
      card.innerHTML = `
        <div class="dp-itemMedia">${media}</div>
        <div class="dp-itemBody">
          ${(() => {
            const u = (ctx && ctx.target) ? (ctx.target.user || (ctx.target.nome ? String(ctx.target.nome).split(" ")[0] : "")) : "";
            const f = (ctx && ctx.target) ? (ctx.target.foto || "") : "";
            if(!u && !f) return "";
            const avatar = f ? `<img src="${f}" alt="">` : `<img src="https://i.pravatar.cc/80?u=${encodeURIComponent(String(userId||""))}" alt="">`;
            const meta = item.created_at || item.data || item.createdAt || item.createdat;
            const dt = meta ? new Date(meta) : null;
            const when = dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString("pt-BR") : "";
            return `<div class="dp-itemAuthor">${avatar}<div><div class="dp-itemUser">@${escapeHtml(u||"usuario")}</div>${when ? `<span class="dp-itemMeta">${when}</span>` : ``}</div></div>`;
          })()}
          <b>${escapeHtml(title)}</b>
          <p>${escapeHtml(desc)}</p>
        </div>
      `;
      if(canEdit){
        const menu = document.createElement("div");
        menu.className = "dp-itemMenu";
        menu.innerHTML = `
          <button class="dp-itemMenuBtn" type="button" aria-label="Opcoes">...</button>
          <div class="dp-itemMenuList">
            <button type="button" class="dp-itemMenuDelete">Excluir</button>
          </div>
        `;
        const menuBtn = menu.querySelector(".dp-itemMenuBtn");
        const menuList = menu.querySelector(".dp-itemMenuList");
        const deleteBtn = menu.querySelector(".dp-itemMenuDelete");
        menuBtn?.addEventListener("click", (event)=>{
          event.preventDefault();
          event.stopPropagation();
          menuList?.classList.toggle("open");
        });
        deleteBtn?.addEventListener("click", async (event)=>{
          event.preventDefault();
          event.stopPropagation();
          menuList?.classList.remove("open");
          if(!confirm("Excluir esta publicação?")) return;
          const { error: delErr } = await client
            .from("publicacoes")
            .delete()
            .eq("id", item.id);
          if(delErr){
            console.error(delErr);
            toast("Erro ao excluir.");
            return;
          }
          toast("Publicação excluída.");
          loadPublicacoes(client, userId, ctx);
        });
        card.appendChild(menu);
      }
      const openModal = () => {
        if(typeof window.abrirModalPublicacao === "function"){
          window.abrirModalPublicacao(item.id);
          return;
        }
        toast("Detalhes indisponiveis no momento.");
      };
      card.addEventListener("click", (event)=>{
        event.preventDefault();
        openModal();
      });
      card.addEventListener("keydown", (event)=>{
        if(event.key === "Enter" || event.key === " "){
          event.preventDefault();
          openModal();
        }
      });
      grid.appendChild(card);
    }
  }

    async function loadReels(client, userId){
    const grid = $("#dpGridReels");
    if(!grid) return;
    grid.classList.add("dp-grid--reels");
    grid.innerHTML = `<div class="dp-empty">Carregando videos curtos...</div>`;
    const { data, error } = await client
      .from("videos_curtos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending:false })
      .limit(40);
    if(error){
      if(isMissingTableError(error)){
        grid.innerHTML = `<div class="dp-empty">Nenhum video curto ainda.</div>`;
        return;
      }
      grid.innerHTML = `<div class="dp-empty">Erro ao carregar. Se voce ainda nao criou as tabelas do perfil, rode o arquivo <b>supabase_schema.sql</b>.</div>`;
      console.error(error);
      return;
    }
    if(!data?.length){
      grid.innerHTML = `<div class="dp-empty">Sem videos curtos ainda.</div>`;
      return;
    }
    grid.innerHTML = "";
    for(const item of data){
      const card = document.createElement("div");
      card.className = "dp-reelCard dp-item dp-item--clickable";
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      card.innerHTML = `
        <div class="dp-reelMedia">
          <video src="${item.video_url}"${item.thumb_url ? ` poster="${item.thumb_url}"` : ""} muted loop playsinline preload="metadata"></video>
          <div class="dp-reelOverlay">
            <b>${escapeHtml(item.titulo || "Video curto")}</b>
            <p>${escapeHtml(item.descricao || "")}</p>
          </div>
          <div class="dp-reelPlay"><i class='bx bx-play'></i></div>
        </div>
      `;
      const openReel = () => {
        window.location.href = `feed.html?start=sb-${item.id}`;
      };
      card.addEventListener("click", (event) => {
        event.preventDefault();
        openReel();
      });
      card.addEventListener("keydown", (event) => {
        if(event.key === "Enter" || event.key === " "){
          event.preventDefault();
          openReel();
        }
      });
      if (window.playReelPreview && window.stopReelPreview) {
        card.addEventListener("mouseenter", () => window.playReelPreview(card));
        card.addEventListener("mouseleave", () => window.stopReelPreview(card));
      }
      grid.appendChild(card);
    }
  }

  async function loadPortfolio(client, profId){
    const grid = $("#dpGridPortfolio");
    if(!grid) return;
    grid.innerHTML = `<div class="dp-empty">Carregando portfólio...</div>`;
    const { data, error } = await client
      .from("portfolio")
      .select("*")
      .eq("profissional_id", profId)
      .order("created_at", { ascending:false })
      .limit(40);
    if(error){
      if(isMissingTableError(error)){
        grid.innerHTML = `<div class="dp-empty">Portfólio vazio.</div>`;
        return;
      }
      grid.innerHTML = `<div class="dp-empty">Erro ao carregar. Se você ainda não criou as tabelas do perfil, rode o arquivo <b>supabase_schema.sql</b>.</div>`;
      console.error(error);
      return;
    }
    if(!data?.length){
      grid.innerHTML = `<div class="dp-empty">Sem itens no portfólio ainda.</div>`;
      return;
    }
    grid.innerHTML = "";
    for(const item of data){
      const isVideo = /\.(mp4|webm|ogg)$/i.test(item.media_url || "");
      const media = isVideo
        ? `<video src="${item.media_url}" controls preload="metadata"></video>`
        : `<img src="${item.media_url}" alt="">`;
      const card = document.createElement("div");
      card.className = "dp-item";
      card.innerHTML = `
        <div class="dp-itemMedia">${media}</div>
        <div class="dp-itemBody">
          <b>${escapeHtml(item.titulo || "")}</b>
          <p>${escapeHtml(item.descricao || "")}</p>
          ${(() => {
            const d = item.data_entrega || item.dataEntrega || item.delivered_at || item.created_at || item.createdAt || item.createdat;
            const dt = d ? new Date(d) : null;
            const when = dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString("pt-BR") : "";
            return when ? `<div class="dp-portfolioDate">Entregue em ${when}</div>` : ``;
          })()}
        </div>
      `;
      grid.appendChild(card);
    }
  }

  async function loadServicos(client, profId){
    const grid = $("#dpGridServicos");
    if(!grid) return;
    grid.innerHTML = `<div class="dp-empty">Carregando serviços...</div>`;
    const { data, error } = await client
      .from("servicos")
      .select("*")
      .eq("profissional_id", profId)
      .order("created_at", { ascending:false })
      .limit(50);
    if(error){
      const countEl = document.getElementById("dpServicesCount");
      if (countEl) countEl.textContent = "0";
      if(isMissingTableError(error)){
        grid.innerHTML = `<div class="dp-empty">Nenhum serviço cadastrado.</div>`;
        return;
      }
      grid.innerHTML = `<div class="dp-empty">Erro ao carregar. Se você ainda não criou as tabelas do perfil, rode o arquivo <b>supabase_schema.sql</b>.</div>`;
      console.error(error);
      return;
    }
    if(!data?.length){
      const countEl = document.getElementById("dpServicesCount");
      if (countEl) countEl.textContent = "0";
      grid.innerHTML = `<div class="dp-empty">Sem serviços cadastrados ainda.</div>`;
      return;
    }
    const countEl = document.getElementById("dpServicesCount");
    if (countEl) countEl.textContent = String(data.length || 0);
    grid.innerHTML = "";
    for(const s of data){
      const card = document.createElement("div");
      card.className = "dp-item";
      card.innerHTML = `
        <div class="dp-itemBody">
          <b>${escapeHtml(s.titulo || "")}</b>
          <p>${escapeHtml(s.categoria || "")}${s.preco ? ` • R$ ${Number(s.preco).toFixed(2).replace(".",",")}` : ""}</p>
          <p>${escapeHtml(s.descricao || "")}</p>
        </div>
      `;
      grid.appendChild(card);
    }
  }

  async function loadAvaliacoes(client, prof){
    const box = $("#dpBoxAvaliacoes");
    if(!box) return;
    box.innerHTML = `<div class="dp-empty">Carregando avaliações...</div>`;
    const profId = (typeof prof === "object" && prof) ? (prof.id || prof.profissional_id || prof.profissionalId) : prof;
    const profUid = (typeof prof === "object" && prof) ? (prof.uid || prof.user_uid || prof.auth_uid || prof.authUid) : null;

    const filters = [];
    if(profId) filters.push({ col: "profissional_id", val: profId });
    if(profUid) filters.push({ col: "profUid", val: profUid });
    if(profUid) filters.push({ col: "profuid", val: profUid });
    if(profUid) filters.push({ col: "prof_uid", val: profUid });
    if(profId) filters.push({ col: "profId", val: profId });
    if(profId) filters.push({ col: "profissionalId", val: profId });
    if(profId) filters.push({ col: "profissionalid", val: profId });
    if(profUid) filters.push({ col: "profissionalUid", val: profUid });

    const orders = ["data", "created_at", "createdAt", "createdat", null];
    let data = null;
    let lastError = null;

    for(const f of filters){
      let success = false;
      for(const ord of orders){
        let q = client
          .from("avaliacoes")
          .select("*")
          .eq(f.col, f.val)
          .limit(80);
        if(ord) q = q.order(ord, { ascending:false });
        const res = await q;
        if(res.error){
          if(isMissingTableError(res.error)){
            box.innerHTML = `<div class="dp-empty">Nenhuma avaliação. Se você ainda não criou as tabelas do perfil, rode o arquivo <b>supabase_schema.sql</b>.</div>`;
            console.error(res.error);
            return;
          }
          if(isMissingColumnError(res.error, f.col) || (ord && isMissingColumnError(res.error, ord))){
            lastError = res.error;
            continue;
          }
          lastError = res.error;
          success = true;
          break;
        }
        data = res.data || [];
        success = true;
        break;
      }
      if(success && data && data.length) break;
    }

    if(!data){
      if(lastError){
        console.error(lastError);
        box.innerHTML = `<div class="dp-empty">Erro ao carregar avaliações.</div>`;
        const countEl = document.getElementById("dpReviews");
        if (countEl) countEl.textContent = "0";
        return;
      }
      data = [];
    }
    const countEl = document.getElementById("dpReviews");
    if (countEl) countEl.textContent = String((data && data.length) || 0);
    if(!data?.length){
      box.innerHTML = `<div class="dp-empty">Sem avaliações ainda.</div>`;
      return;
    }

    const allData = Array.isArray(data) ? data.slice() : [];
    const getPedidoId = (a)=> a?.pedidoId || a?.pedido_id || a?.pedidoid || a?.pedido;
    const getAnuncioId = (a)=> a?.anuncioId || a?.anuncio_id || a?.anuncioid || a?.anuncio || a?.servico_id || a?.servicoId || a?.servico;

    const normalizeAnuncioId = (v)=>{
      if(!v) return "";
      let s = String(v).trim();
      // normaliza ids do feed (ex: "sb-<uuid>")
      if(s.startsWith("sb-")) s = s.slice(3);
      // remove lixo comum
      s = s.replace(/^[^a-f0-9]+/i, "");
      // mantém apenas uuid se tiver
      const m = s.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      return m ? m[0] : s;
    };

    const pedidoIds = new Set();
    allData.forEach(a=>{
      const aid = getAnuncioId(a);
      if(aid) a.__anuncioId = normalizeAnuncioId(aid);
      if(!aid){
        const pid = getPedidoId(a);
        if(pid) pedidoIds.add(String(pid));
      }
    });

    if(pedidoIds.size && client?.from){
      try{
        const ids = Array.from(pedidoIds);
        const { data: pedidos, error } = await client
          .from("pedidos")
          .select("id,anuncioId,anuncio_id,anuncioid,anuncio")
          .in("id", ids);
        if(!error && Array.isArray(pedidos)){
          const map = new Map();
          pedidos.forEach(p=>{
            const pid = p?.id;
            const aid = p?.anuncioId || p?.anuncio_id || p?.anuncioid || p?.anuncio;
            if(pid && aid) map.set(String(pid), normalizeAnuncioId(aid));
          });
          allData.forEach(a=>{
            if(a.__anuncioId) return;
            const pid = getPedidoId(a);
            const aid = pid ? map.get(String(pid)) : null;
            if(aid) a.__anuncioId = normalizeAnuncioId(aid);
          });
        }
      }catch(e){ /* ignore */ }
    }

    // Fallback: tenta mapear pedidoId -> anuncioId via Firebase (quando pedidos não existe no Supabase)
    try{
      const pendentes = new Set();
      allData.forEach(a=>{
        if(a.__anuncioId) return;
        const pid = getPedidoId(a);
        if(pid) pendentes.add(String(pid));
      });
      if(pendentes.size && window.db && window.getDoc && window.doc){
        const ids = Array.from(pendentes);
        const snaps = await Promise.all(ids.map(id=>{
          try{ return window.getDoc(window.doc(window.db, "pedidos", id)); }catch(_){ return null; }
        }));
        const map = new Map();
        snaps.forEach((snap, idx)=>{
          if(!snap || !snap.exists?.()) return;
          const d = snap.data ? snap.data() : null;
          const aid = d?.anuncioId || d?.anuncio_id || d?.anuncioid || d?.anuncio || d?.servico_id || d?.servicoId || d?.servico;
          if(aid) map.set(String(ids[idx]), normalizeAnuncioId(aid));
        });
        allData.forEach(a=>{
          if(a.__anuncioId) return;
          const pid = getPedidoId(a);
          const aid = pid ? map.get(String(pid)) : null;
          if(aid) a.__anuncioId = normalizeAnuncioId(aid);
        });
      }
    }catch(_){ /* ignore */ }

    // Se ainda não tiver anúncio, agrupa como "sem serviço"
    allData.forEach(a=>{
      if(!a.__anuncioId) a.__anuncioId = "__sem_servico";
    });

    const servicoIdsRaw = Array.from(new Set(allData.map(a=>a.__anuncioId).filter(Boolean)));
    const servicoIdsReal = servicoIdsRaw.filter(id => String(id) !== "__sem_servico");
    const showSemServico = servicoIdsReal.length > 0 && servicoIdsRaw.includes("__sem_servico");
    const servicoIds = showSemServico ? servicoIdsRaw : servicoIdsReal;
    let anunciosMap = new Map();

    if(servicoIdsReal.length){
      try{
        let anuncios = [];
        if(client?.from){
          const { data: rows, error } = await client
            .from("anuncios")
            .select("id,titulo,categoria,preco,descricao,img,fotos")
            .in("id", servicoIdsReal);
          if(!error && Array.isArray(rows)) anuncios = rows;
        }
        if(!anuncios.length && profUid){
          anuncios = await fetchAnunciosByUid(profUid);
        }
        (anuncios || []).forEach(a=>{
          const id = a?.id || a?.uid;
          if(id) anunciosMap.set(String(id), a);
        });
      }catch(e){ /* ignore */ }
    }

      const getServicoInfo = (id)=>{
        if(String(id) === "__sem_servico"){
          return {
            titulo: "Avaliações sem vínculo",
            categoria: "",
            preco: "",
            img: ""
          };
        }
        const a = anunciosMap.get(String(id)) || {};
        const fotos = Array.isArray(a.fotos) ? a.fotos : (a.fotos ? [a.fotos] : []);
        const img = fotos[0] || a.img || "";
        return {
          titulo: a.titulo || `Serviço ${id}`,
          categoria: a.categoria || "",
          preco: a.preco || "",
          img,
          id: a.id || id
        };
      };

    const buildFilterBar = (activeId)=>{
      if(!servicoIds.length) return "";
      const cards = servicoIds.map(id=>{
        const info = getServicoInfo(id);
        const active = String(activeId) === String(id) ? "active" : "";
        const foto = info.img ? `<div class="fr-servico-thumb" style="background-image:url('${info.img}')"></div>` : `<div class="fr-servico-thumb empty"></div>`;
        const meta = [info.categoria, info.preco].filter(Boolean).join(" • ");
        return `
          <button class="fr-servico-card ${active}" type="button" data-servico="${id}">
            ${foto}
            <div class="fr-servico-info">
              <div class="fr-servico-title">${escapeHtml(info.titulo)}</div>
              <div class="fr-servico-meta">${escapeHtml(meta)}</div>
            </div>
          </button>`;
      }).join("");
      const allActive = activeId === "all" ? "active" : "";
      return `
        <div class="fr-servico-bar">
          <button class="fr-servico-card ${allActive}" type="button" data-servico="all">
            <div class="fr-servico-thumb empty"></div>
            <div class="fr-servico-info">
              <div class="fr-servico-title">Todas as avaliações</div>
              <div class="fr-servico-meta">${allData.length} avaliações</div>
            </div>
          </button>
          ${cards}
        </div>`;
    };

    const bindFilter = ()=>{
      if(!servicoIds.length) return;
      box.querySelectorAll(".fr-servico-card").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const id = btn.getAttribute("data-servico") || "all";
          renderAvaliacoes(id);
        });
      });
    };

      const renderAvaliacoes = (activeId="all")=>{
        data = (activeId === "all") ? allData : allData.filter(a=>String(a.__anuncioId) === String(activeId));
        const filterHtml = buildFilterBar(activeId);
        if(!data || !data.length){
          box.innerHTML = `${filterHtml}<div class="dp-empty">Sem avaliações para este serviço.</div>`;
          bindFilter();
          const countEl = document.getElementById("dpReviews");
          if (countEl) countEl.textContent = String((data && data.length) || 0);
          return;
        }
    const criterios = [
      { id: 'pontualidade', label: 'Pontualidade' },
      { id: 'profissionalismo', label: 'Profissionalismo' },
      { id: 'qualidade', label: 'Qualidade' },
      { id: 'preco', label: 'Preço / Valor' },
      { id: 'atendimento', label: 'Atendimento' }
    ];
    const starHtml = (valor, extraClass="") => {
      const pct = Math.max(0, Math.min(100, (Number(valor || 0) / 5) * 100));
      return `
        <span class="fr-stars ${extraClass}">
          <span class="fr-stars-base">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
          <span class="fr-stars-fill" style="width:${pct}%;">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
        </span>`;
    };

    const avg = data.reduce((a,x)=>a+(Number(x.media ?? x.nota) || 0),0)/data.length;
    const ratingCounts = [0,0,0,0,0];
    const critTotals = {};
    const critCounts = {};
    const critDistrib = {};
    criterios.forEach(c=>{ critTotals[c.id]=0; critCounts[c.id]=0; critDistrib[c.id]=[0,0,0,0,0]; });

    data.forEach(a=>{
      const r = Math.round(Number(a.media ?? a.nota) || 0);
      if(r>=1 && r<=5) ratingCounts[r-1]++;
      if(a.detalhes){
        criterios.forEach(c=>{
          const n = Number(a.detalhes?.[c.id]?.nota || 0);
          if(n>0){
            critTotals[c.id] += n;
            critCounts[c.id] += 1;
            if(n >= 1 && n <= 5) critDistrib[c.id][n-1] += 1;
          }
        });
      }
    });

    const histRows = [5,4,3,2,1].map(n=>{
      const count = ratingCounts[n-1] || 0;
      const pct = data.length ? (count / data.length) * 100 : 0;
      return `
        <div class="fr-bar-row">
          <span class="fr-bar-label">${n}</span>
          <div class="fr-bar"><span class="fr-bar-fill" style="width:${pct}%;"></span></div>
          <span class="fr-bar-count">${count}</span>
        </div>`;
    }).join("");

    const critLabels = ["Péssimo","Ruim","Regular","Bom","Ótimo"];
    const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    const getMeta = (a)=> (a && a.detalhes && a.detalhes._meta) ? a.detalhes._meta : {};
    const getComentarioGeral = (a)=>{
      const meta = getMeta(a);
      return a.comentarioGeral || a.comentario || meta.comentarioGeral || meta.comentario || "";
    };
    const getNomeCliente = (a)=>{
      const meta = getMeta(a);
      if(meta.anonimo) return "Anônimo";
      return a.clienteNome || meta.clienteNome || "Cliente";
    };
    const getFotoCliente = (a)=>{
      const meta = getMeta(a);
      return a.clienteFoto || meta.clienteFoto || defaultAvatar;
    };
    const getDateText = (a)=>{
      const dateValue = a.data || a.created_at || a.createdAt || a.createdat;
      return dateValue ? fmtDateShort(dateValue) : "";
    };
    const buildCritComments = (critId)=>{
      const items = [];
      data.forEach(a=>{
        const det = a.detalhes?.[critId];
        const texto = det?.comentario;
        if(!texto) return;
        items.push({
          nome: getNomeCliente(a),
          foto: getFotoCliente(a),
          dataText: getDateText(a),
          text: texto
        });
      });
      return items;
    };
    const criteriaCards = criterios.map(c=>{
      const dist = critDistrib[c.id] || [0,0,0,0,0];
      const total = dist.reduce((a,b)=>a+b,0);
      const avgC = total ? (critTotals[c.id] / total) : 0;
      const avgText = total ? avgC.toFixed(1) : "-";
      const distRows = critLabels.map((lab,i)=>{
        const count = dist[i] || 0;
        const pct = total ? (count / total) * 100 : 0;
        return `
          <div class="fr-crit-dist-row">
            <span class="fr-crit-dist-label">${lab}</span>
            <div class="fr-crit-dist-bar"><span class="fr-crit-dist-fill" style="width:${pct}%;"></span></div>
            <span class="fr-crit-dist-count">${count}</span>
          </div>`;
      }).join("");
      const comments = buildCritComments(c.id);
      const commentsHtml = comments.length
        ? comments.map((m)=>(
          `<div class="fr-crit-comment-item">
            <div class="fr-crit-comment-head">
              <img class="fr-crit-comment-avatar" src="${m.foto}" alt="">
              <div>
                <div class="fr-crit-comment-name">${escapeHtml(m.nome)}</div>
                <div class="fr-crit-comment-date">${m.dataText}</div>
              </div>
            </div>
            <div class="fr-crit-comment-text">${escapeHtml(m.text)}</div>
          </div>`
        )).join("")
        : `<div class="fr-crit-comment-empty">Sem comentarios neste criterio.</div>`;
      const commentBtnDisabled = comments.length ? "" : " disabled";
      return `
        <div class="fr-crit-card">
          <div class="fr-crit-card-title">${c.label}</div>
          <div class="fr-crit-card-score">
            <div class="fr-crit-card-value">${avgText}</div>
            ${starHtml(avgC, "fr-stars-sm")}
            <div class="fr-crit-card-meta">${total ? `${total} votos` : "sem voto"}</div>
          </div>
          <div class="fr-crit-dist">
            ${distRows}
          </div>
          <button class="fr-crit-comment-btn" type="button" data-target="fr-crit-comments-${c.id}" aria-expanded="false"${commentBtnDisabled}>
            Comentarios <span class="fr-crit-comment-count">${comments.length}</span>
          </button>
          <div class="fr-crit-comments" id="fr-crit-comments-${c.id}" aria-hidden="true">
            ${commentsHtml}
          </div>
        </div>`;
    }).join("");

    box.innerHTML = `
      ${filterHtml}
      <div class="fr-rating">
        <div class="fr-score">
          <div class="fr-score-num">${avg.toFixed(1)}</div>
          ${starHtml(avg)}
          <div class="fr-score-meta">${data.length} avaliações</div>
        </div>
        <div class="fr-hist">${histRows}</div>
      </div>
      <div class="fr-criteria">
        <div class="fr-criteria-head">
          <div class="fr-criteria-title">Detalhes por critério</div>
          <div class="fr-criteria-nav">
            <button class="fr-nav-btn" data-dir="-1" aria-label="Anterior">‹</button>
            <button class="fr-nav-btn" data-dir="1" aria-label="Próximo">›</button>
          </div>
        </div>
        <div class="fr-criteria-viewport">
          <div class="fr-criteria-track">
            ${criteriaCards}
          </div>
        </div>
      </div>
      <div class="fr-comments">
        <div class="fr-comments-title">Mensagens</div>
        <div id="dpAvalList" class="fr-comment-list"></div>
      </div>
    `;

    // carousel setup
    const viewport = box.querySelector(".fr-criteria-viewport");
    const track = box.querySelector(".fr-criteria-track");
    const btnPrev = box.querySelector(".fr-nav-btn[data-dir='-1']");
    const btnNext = box.querySelector(".fr-nav-btn[data-dir='1']");
    if(viewport && track && btnPrev && btnNext){
      const updateNav = () => {
        const maxScroll = track.scrollWidth - viewport.clientWidth;
        const x = viewport.scrollLeft;
        btnPrev.disabled = x <= 4;
        btnNext.disabled = x >= maxScroll - 4;
      };
      const getStep = () => {
        const first = track.children[0];
        if(!first) return viewport.clientWidth;
        const style = getComputedStyle(track);
        const gap = parseFloat(style.gap || style.columnGap || "0");
        return first.getBoundingClientRect().width + gap;
      };
      btnPrev.addEventListener("click", ()=> {
        viewport.scrollBy({ left: -getStep(), behavior: "smooth" });
      });
      btnNext.addEventListener("click", ()=> {
        viewport.scrollBy({ left: getStep(), behavior: "smooth" });
      });
      viewport.addEventListener("scroll", updateNav, { passive: true });
      window.addEventListener("resize", updateNav);
      updateNav();
    }

    // criterio: toggle comentarios
    const commentButtons = box.querySelectorAll(".fr-crit-comment-btn");
    commentButtons.forEach(btn=>{
      const targetId = btn.getAttribute("data-target");
      const panel = targetId ? box.querySelector(`#${targetId}`) : null;
      if(!panel) return;
      btn.addEventListener("click", ()=>{
        const isOpen = panel.classList.toggle("open");
        btn.classList.toggle("active", isOpen);
        btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
      });
    });

      const list = $("#dpAvalList");
      let hasMsgs = false;
      data.forEach(a=>{
        const mediaVal = Number(a.media ?? a.nota ?? 0);
        const dateText = getDateText(a);
        const mensagens = [];
        const comentarioGeral = getComentarioGeral(a);
        if(comentarioGeral) mensagens.push({ label: "Comentario geral", text: comentarioGeral });
        if(!mensagens.length) return;
        hasMsgs = true;
        const nomeCliente = getNomeCliente(a);
        const fotoCliente = getFotoCliente(a);
        const servInfo = getServicoInfo(a.__anuncioId);
        const servTitle = servInfo?.titulo || "Serviço";
        const servId = servInfo?.id;
        const servLink = (servId && String(a.__anuncioId) !== "__sem_servico")
          ? `detalhes.html?id=${encodeURIComponent(servId)}`
          : "";
        const el = document.createElement("div");
        el.className = "fr-comment";
        const msgsHtml = mensagens.map(m=>(
          `<div class="fr-msg"><span class="fr-msg-label">${m.label}:</span> ${escapeHtml(m.text)}</div>`
        )).join("");
        el.innerHTML = `
          <div class="fr-comment-head">
            <img class="fr-review-avatar" src="${fotoCliente}" alt="">
            <div>
              <div class="fr-review-name">${escapeHtml(nomeCliente)}</div>
              <div class="fr-review-date">${dateText}</div>
              <div class="fr-review-service">${servLink ? `<a href="${servLink}">${escapeHtml(servTitle)}</a>` : escapeHtml(servTitle)}</div>
            </div>
            <div class="fr-review-score">
              ${starHtml(mediaVal, "fr-stars-sm")}
              <div class="fr-review-score-num">${mediaVal.toFixed(1)}</div>
            </div>
          </div>
          <div class="fr-comment-body">${msgsHtml}</div>
        `;
        list.appendChild(el);
      });
    if(!hasMsgs){
      list.innerHTML = `<div class="fr-empty">Sem mensagens.</div>`;
    }
    bindFilter();
  };

  renderAvaliacoes("all");
  }

  // -----------------------------
  // Create items
  // -----------------------------
  async function createPublicacao(client, ctx, { tipo, titulo, legenda, file, afterFile, capaFile }){
    // upload to storage
    const storageId = ctx.me?.uid || ctx.me?.id;
    let thumbUrl = null;
    // Antes x Depois: usa thumb_url como 'depois'
    if(tipo === 'antes_depois' && afterFile){
      const upAfter = await uploadToStorage(client, { bucket:'perfil', path:`publicacoes/${storageId}/depois/${crypto.randomUUID()}`, file: afterFile });
      if(upAfter.error) throw upAfter.error;
      thumbUrl = upAfter.url;
    }
    if(capaFile && tipo !== 'antes_depois'){
      const upCover = await uploadToStorage(client, { bucket:"perfil", path:`publicacoes/${storageId}/capa/${crypto.randomUUID()}`, file: capaFile });
      if(upCover.error) throw upCover.error;
      thumbUrl = upCover.url;
    }
    const up = await uploadToStorage(client, { bucket:"perfil", path:`publicacoes/${storageId}/${crypto.randomUUID()}`, file });
    if(up.error) throw up.error;
    const payload = {
      user_id: ctx.me.id,
      tipo,
      titulo,
      legenda,
      media_url: up.url
    };
    if(thumbUrl) payload.thumb_url = thumbUrl;
    let { error } = await client.from("publicacoes").insert(payload);
    if(error && error.code === "PGRST204"){
      const msg = String(error.message || "").toLowerCase();
      const retry = {
        user_id: ctx.me.id,
        tipo,
        media_url: up.url
      };
      if(titulo && !msg.includes("titulo")) retry.titulo = titulo;
      if(thumbUrl && !msg.includes("thumb_url")) retry.thumb_url = thumbUrl;
      if(legenda){
        if(!msg.includes("legenda")) {
          retry.legenda = legenda;
        } else if(!msg.includes("descricao")) {
          retry.descricao = legenda;
        }
      }
      const r2 = await client.from("publicacoes").insert(retry);
      error = r2.error || null;
    }
    if(error) throw error;
  }

  async function createReel(client, ctx, { titulo, descricao, file, capaFile }){
    const storageId = ctx.me?.uid || ctx.me?.id;
    let thumbUrl = null;
    // Antes x Depois: usa thumb_url como 'depois'
    if(tipo === 'antes_depois' && afterFile){
      const upAfter = await uploadToStorage(client, { bucket:'perfil', path:`publicacoes/${storageId}/depois/${crypto.randomUUID()}`, file: afterFile });
      if(upAfter.error) throw upAfter.error;
      thumbUrl = upAfter.url;
    }
    if(capaFile && tipo !== 'antes_depois'){
      const upCover = await uploadToStorage(client, { bucket:"perfil", path:`reels/${storageId}/capa/${crypto.randomUUID()}`, file: capaFile });
      if(upCover.error) throw upCover.error;
      thumbUrl = upCover.url;
    }
    const up = await uploadToStorage(client, { bucket:"perfil", path:`reels/${storageId}/${crypto.randomUUID()}`, file });
    if(up.error) throw up.error;
    const payload = {
      user_id: ctx.me.id,
      titulo,
      descricao,
      video_url: up.url
    };
    if(thumbUrl) payload.thumb_url = thumbUrl;
    let { error } = await client.from("videos_curtos").insert(payload);
    if(error && error.code === "PGRST204"){
      const msg = String(error.message || "").toLowerCase();
      const retry = {
        user_id: ctx.me.id,
        video_url: up.url
      };
      if(titulo && !msg.includes("titulo")) retry.titulo = titulo;
      if(descricao && !msg.includes("descricao")) retry.descricao = descricao;
      if(thumbUrl && !msg.includes("thumb_url")) retry.thumb_url = thumbUrl;
      const r2 = await client.from("videos_curtos").insert(retry);
      error = r2.error || null;
    }
    if(error) throw error;
  }

  async function createPortfolioItem(client, ctx, { titulo, descricao, file }){
    const storageId = ctx.me?.uid || ctx.me?.id;
    const up = await uploadToStorage(client, { bucket:"perfil", path:`portfolio/${storageId}/${crypto.randomUUID()}`, file });
    if(up.error) throw up.error;
    const { error } = await client.from("portfolio").insert({
      profissional_id: ctx.me.id,
      titulo,
      descricao,
      media_url: up.url
    });
    if(error) throw error;
  }

  async function createServico(client, ctx, { titulo, categoria, preco, descricao }){
    const { error } = await client.from("servicos").insert({
      profissional_id: ctx.me.id,
      titulo,
      categoria,
      preco: preco ? Number(preco) : null,
      descricao
    });
    if(error) throw error;
  }

  async function createAvaliacao(client, ctx, { profissionalId, nota, comentario }){
    const { error } = await client.from("avaliacoes").insert({
      profissional_id: profissionalId,
      cliente_id: ctx.me.id,
      nota: Number(nota),
      comentario
    });
    if(error) throw error;
  }

  // -----------------------------
  // Escape
  // -----------------------------
  function escapeHtml(str){
    return (str ?? "").toString()
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  // -----------------------------
  // Availability toggle
  // -----------------------------
  function initAvailability(ctx){
    const row = $("#dpAvailabilityRow");
    const sw = $("#dpSwitch");
    const text = $("#dpStatusText");
    if(!row || !sw || !text) return;

    if(!ctx.canEdit || !ctx.target?.isProfissional){
      row.style.display = "none";
      return;
    }
    row.style.display = "flex";

    const v = !!(ctx.target.disponivel ?? false);
    sw.classList.toggle("on", v);
    text.textContent = v ? "Disponível" : "Indisponível";

    sw.onclick = async ()=>{
      const next = !sw.classList.contains("on");
      sw.classList.toggle("on", next);
      text.textContent = next ? "Disponível" : "Indisponível";
      const client = mustSupa();
      if(!client) return;
      const { error } = await updateUsuario(client, ctx.me.id, { disponivel: next });
      if(error){
        console.error(error);
        toast("Sem permissão para atualizar.");
      }else{
        toast("Status atualizado.");
      }
    };
  }

  // -----------------------------
  // Cover / Avatar (persistente)
  // -----------------------------
  function initMedia(ctx){
    const coverBtn = $("#dpCoverBtn");
    const coverInput = $("#dpCoverInput");
    const avatarBtn = $("#dpAvatarBtn");
    const avatarInput = $("#dpAvatarInput");
    const storageId = ctx.me?.uid || ctx.me?.id;

    if(!ctx.canEdit){
      coverBtn && (coverBtn.style.display = "none");
      avatarBtn && (avatarBtn.style.display = "none");
      return;
    }

    coverBtn?.addEventListener("click", ()=> coverInput?.click());
    avatarBtn?.addEventListener("click", ()=> avatarInput?.click());

    coverInput?.addEventListener("change", async ()=>{
      const file = coverInput.files?.[0];
      if(!file) return;

      const localUrl = await fileToDataUrl(file);
      if(localUrl) setCover(localUrl); // preview

      const client = mustSupa();
      if(!client) return;

      const up = await uploadToStorage(client, { bucket: "perfil", path: `covers/${storageId}/cover`, file });
      if(up.error){
        console.error(up.error);
        toast("Erro ao enviar capa.");
        return;
      }
      // salva no stats
      const stats = parseStats(ctx.me);
      const { error, stats: nextStats } = await patchStats(client, ctx.me.id, stats, {
        media: { cover_url: up.url, cover_path: up.path, cover_updated_at: new Date().toISOString() }
      });
      if(error){
        console.error(error);
        toast("Sem permissão para salvar capa.");
        return;
      }
      ctx.me.stats = nextStats;
      ctx.target.stats = nextStats;
      setCover(up.url);
      toast("Capa salva!");
    });

    avatarInput?.addEventListener("change", async ()=>{
      const file = avatarInput.files?.[0];
      if(!file) return;

      const localUrl = await fileToDataUrl(file);
      if(localUrl) setAvatar(localUrl, ctx.target?.nome?.[0] || "U"); // preview

      const client = mustSupa();
      if(!client) return;

      const up = await uploadToStorage(client, { bucket: "perfil", path: `avatars/${storageId}/avatar`, file });
      if(up.error){
        console.error(up.error);
        toast("Erro ao enviar foto.");
        return;
      }
      // salva em coluna foto + stats
      const stats = parseStats(ctx.me);
      const { error: err1 } = await updateUsuario(client, ctx.me.id, { foto: up.url });
      const { error: err2, stats: nextStats } = await patchStats(client, ctx.me.id, stats, {
        media: { avatar_url: up.url, avatar_path: up.path, avatar_updated_at: new Date().toISOString() }
      });
      if(err1 || err2){
        console.error(err1 || err2);
        toast("Sem permissão para salvar foto.");
        return;
      }
      ctx.me.foto = up.url;
      ctx.me.stats = nextStats;
      ctx.target.foto = up.url;
      ctx.target.stats = nextStats;
      setAvatar(up.url, ctx.target?.nome?.[0] || "U");
      toast("Foto salva!");
    });
  }

  // -----------------------------
  // Edit profile
  // -----------------------------
  function openEditProfile(ctx){
    const u = ctx.me;
    const stats = parseStats(u);
    const about = stats?.about || u.sobre || "";
    modal.open("Editar perfil", `
      <div class="dp-form">
        <div>
          <label>Nome</label>
          <input class="dp-input" id="dpEditNome" value="${escapeHtml(u.nome || "")}" />
        </div>
        <div class="dp-row2">
          <div>
            <label>@usuário</label>
            <input class="dp-input" id="dpEditUser" value="${escapeHtml(u.user || "")}" />
          </div>
          <div>
            <label>Local</label>
            <input class="dp-input" id="dpEditLocal" value="${escapeHtml(u.local || "")}" />
          </div>
        </div>
        <div>
          <label>Bio</label>
          <textarea class="dp-textarea" id="dpEditBio">${escapeHtml(u.bio || "")}</textarea>
        </div>
        <div>
          <label>Sobre</label>
          <textarea class="dp-textarea" id="dpEditSobre" placeholder="Escreva algo sobre voce...">${escapeHtml(about)}</textarea>
        </div>
      </div>
    `, async ()=>{
      const client = mustSupa();
      if(!client) return;
      const patch = {
        nome: safeStr($("#dpEditNome")?.value),
        user: safeStr($("#dpEditUser")?.value).replace(/^@/,""),
        local: safeStr($("#dpEditLocal")?.value),
        bio: safeStr($("#dpEditBio")?.value),
      };
      const { error } = await updateUsuario(client, ctx.me.id, patch);
      if(error){
        console.error(error);
        toast("Sem permissão para salvar.");
        return;
      }
      const aboutNext = safeStr($("#dpEditSobre")?.value);
      const { error: statsErr, stats: nextStats } = await patchStats(client, ctx.me.id, stats, { about: aboutNext });
      if(statsErr){
        console.error(statsErr);
        toast("Sobre nao foi salvo.");
      }else{
        ctx.me.stats = nextStats;
        ctx.target.stats = nextStats;
      }
      Object.assign(ctx.me, patch);
      Object.assign(ctx.target, patch);
      renderHeader(ctx);
      modal.close();
      toast("Perfil atualizado!");
    });
  }

  // -----------------------------
  // Tabs
  // -----------------------------
  function initTabs(ctx){
    const buttons = $$(".dp-tab");
    const sections = $$(".dp-section[data-tab]");
    const tabsWrap = $(".dp-tabs");
    const prevNav = $(".dp-tabsPrev");
    const nextNav = $(".dp-tabsNext");
    let sectionsWrap = $(".dp-sections");

    const isProOwnerTabs = !!(ctx?.target?.isProfissional && ctx?.canEdit);
    // Esconde aba/section de estatísticas para quem não é o dono profissional
    buttons.forEach(b=>{ if(b.hasAttribute("data-pro-owner-only") && !isProOwnerTabs) b.style.display = "none"; });
    sections.forEach(s=>{ if(s.hasAttribute("data-pro-owner-only") && !isProOwnerTabs) s.style.display = "none"; });

    if(tabsWrap && prevNav && nextNav){
      const scrollAmount = () => Math.max(140, Math.round(tabsWrap.clientWidth * 0.6));
      const updateNav = () => {
        const maxScroll = tabsWrap.scrollWidth - tabsWrap.clientWidth;
        const hide = maxScroll <= 1;
        prevNav.disabled = tabsWrap.scrollLeft <= 0;
        nextNav.disabled = tabsWrap.scrollLeft >= maxScroll - 1;
        prevNav.style.visibility = hide ? "hidden" : "visible";
        nextNav.style.visibility = hide ? "hidden" : "visible";
      };

      prevNav.addEventListener("click", ()=> {
        tabsWrap.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
      });
      nextNav.addEventListener("click", ()=> {
        tabsWrap.scrollBy({ left: scrollAmount(), behavior: "smooth" });
      });
      tabsWrap.addEventListener("scroll", updateNav, { passive: true });
      window.addEventListener("resize", updateNav);
      updateNav();
    }

    if(!sectionsWrap && sections.length){
      sectionsWrap = document.createElement("div");
      sectionsWrap.className = "dp-sections";
      sections[0].parentNode.insertBefore(sectionsWrap, sections[0]);
      sections.forEach(s => sectionsWrap.appendChild(s));
    }

    sections.forEach(s => {
      if(s.hasAttribute("data-pro-owner-only") && !isProOwnerTabs){
        s.classList.add("dp-section--hidden");
        s.setAttribute("aria-hidden", "true");
        return;
      }
      s.style.display = "";
      s.setAttribute("aria-hidden", "true");
    });

    let activeSection = null;
    const updateWrapHeight = (nextHeight, forceShrink=false) => {
      if(!sectionsWrap) return;
      const current = parseFloat(sectionsWrap.style.minHeight || "0") || 0;
      const next = Math.max(nextHeight || 0, 220);
      const canShrink = forceShrink || (window.scrollY <= (sectionsWrap.offsetTop + 20));
      if(next >= current || canShrink){
        sectionsWrap.style.minHeight = `${next}px`;
      }
    };

    if("ResizeObserver" in window && sectionsWrap){
      const ro = new ResizeObserver((entries)=>{
        if(!activeSection) return;
        for(const entry of entries){
          if(entry.target === activeSection){
            updateWrapHeight(entry.contentRect.height);
          }
        }
      });
      sections.forEach(s => ro.observe(s));
    }

    function activate(tab){
      if(sectionsWrap){
        updateWrapHeight(sectionsWrap.offsetHeight, true);
      }

      buttons.forEach(b=> b.classList.toggle("active", b.dataset.tab === tab));
      sections.forEach(s=> {
        const isActive = s.dataset.tab === tab;
        s.classList.toggle("dp-section--hidden", !isActive);
        s.setAttribute("aria-hidden", isActive ? "false" : "true");
        if(isActive) activeSection = s;
      });
      if(sectionsWrap && activeSection){
        updateWrapHeight(activeSection.offsetHeight);
      }

      // Lazy load
      if(tab === "publicacoes") loadPublicacoes(ctx.client, ctx.target.id, ctx);
      if(tab === "reels") loadReels(ctx.client, ctx.target.id);
      if(tab === "servicos") loadServicosPerfil(ctx);
      if(tab === "portfolio") loadPortfolio(ctx.client, ctx.target.id);
      if(tab === "avaliacoes") loadAvaliacoes(ctx.client, ctx.target);
      if(tab === "estatisticas") initProDashboard(ctx);
    }

    buttons.forEach(b=>{
      b.addEventListener("click", ()=> activate(b.dataset.tab));
    });

    // default tab
    activate("publicacoes");
  }


  // -----------------------------
  // Estatísticas (Dashboard do Profissional) — DEMO
  // -----------------------------
    let __dpDashInited = false;

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
  function pct(n){
    if(n === null || n === undefined || isNaN(n)) return "—";
    return `${Math.round(n*100)}%`;
  }
  function safeNum(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  function parseDateAny(v){
    if(!v) return null;
    try{
      if(v instanceof Date) return v;
      if(typeof v === "number") return new Date(v);
      // supabase can return ISO strings
      const d = new Date(String(v));
      if(!isNaN(d.getTime())) return d;
    }catch(_){}
    return null;
  }
  function startOfDay(d){
    const x = new Date(d);
    x.setHours(0,0,0,0);
    return x;
  }
  function endOfDay(d){
    const x = new Date(d);
    x.setHours(23,59,59,999);
    return x;
  }
  function buildDayLabels(days, startDate){
    const labels = [];
    const start = startOfDay(startDate);
    for(let i=0;i<days;i++){
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      labels.push(d.toISOString().slice(0,10));
    }
    return labels;
  }

  async function detectColumn(client, table, candidates){
    if(!client || !client.from) return null;
    for(const col of (candidates||[])){
      if(!col) continue;
      try{
        const res = await client.from(table).select(col).limit(1);
        if(res?.error){
          if(isMissingTableError(res.error)) return null;
          if(isMissingColumnError(res.error, col)) continue;
          // RLS / outra falha: assume que a coluna existe
          return col;
        }
        return col;
      }catch(e){
        // tenta próxima
      }
    }
    return null;
  }

  function pickField(obj, candidates){
    if(!obj) return null;
    for(const k of (candidates||[])){
      if(k in obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return null;
  }

  async function loadProAnalytics(ctx, days){
    const client = ctx?.client;
    const proUid = String(ctx?.target?.uid || "");
    const now = new Date();
    const end = endOfDay(now);
    const start = startOfDay(new Date(end));
    start.setDate(start.getDate() - Math.max(0, (Number(days)||14) - 1));

    const labels = buildDayLabels(Math.max(1, Number(days)||14), start);
    const seriesPedidos = Array(labels.length).fill(0);
    const seriesMsgs = Array(labels.length).fill(0);

    const stats = {
      labels,
      seriesPedidos,
      seriesMsgs,
      totals: {
        views: 0,
        clicks: 0,
        leads: 0,
        activeAds: 0,
        ads: 0,
        ratingAvg: null,
        ratingCount: 0,
        responseRate: null,
        medianReplyMins: null
      },
      cats: [], // {label, value}
      funnel: { impressions: 0, clicks: 0, leads: 0 }
    };

    if(!client || !client.from || !proUid) return stats;

    // 1) Anúncios
    let anuncios = [];
    try{
      const res = await client.from("anuncios").select("*").eq("uid", proUid).limit(500);
      if(!res.error && Array.isArray(res.data)) anuncios = res.data;
    }catch(e){ /* ignore */ }

    stats.totals.ads = anuncios.length;
    stats.totals.activeAds = anuncios.filter(a => (a?.ativo === true || a?.ativo === 1 || a?.ativo === 'true' || a?.ativo === undefined)).length;

    // Totais de visualizações/cliques (quando existirem)
    anuncios.forEach(a=>{
      stats.totals.views += safeNum(pickField(a, ["views","visualizacoes","visualizações","impressions","impressões"]));
      stats.totals.clicks += safeNum(pickField(a, ["cliques","clicks","click"]));
    });

    // Categorias: usa categoria ou primeiro item de categorias
    const catMap = new Map();
    anuncios.forEach(a=>{
      const raw = pickField(a, ["categoria","categoriaFinal","category"]) || "";
      let cat = String(raw || "").trim();
      if(!cat){
        const catsStr = pickField(a, ["categorias","cats","tags"]);
        if(typeof catsStr === "string" && catsStr.includes(",")){
          cat = catsStr.split(",")[0].trim();
        }
      }
      if(!cat) return;
      const weight = safeNum(pickField(a, ["views","cliques","clicks"])) || 1;
      catMap.set(cat, (catMap.get(cat) || 0) + weight);
    });
    stats.cats = Array.from(catMap.entries())
      .sort((a,b)=> b[1]-a[1])
      .slice(0,6)
      .map(([label,value])=>({label, value}));

    // 2) Pedidos (orçamentos) vinculados aos anúncios do pro
    const anuncioIds = anuncios.map(a=>a?.id).filter(Boolean).map(String);
    let pedidos = [];
    const pedidoAidCol = await detectColumn(client, "pedidos", ["anuncioId","anuncio_id","anuncioid","anuncio","servico_id","servicoId","servico"]);
    const pedidoDateCol = await detectColumn(client, "pedidos", ["dataPedido","created_at","createdAt","createdat","data","timestamp"]);
    if(anuncioIds.length && pedidoAidCol){
      try{
        let q = client.from("pedidos").select("*").in(pedidoAidCol, anuncioIds).limit(1500);
        if(pedidoDateCol){
          q = q.gte(pedidoDateCol, start.toISOString()).lte(pedidoDateCol, end.toISOString());
        }
        const res = await q;
        if(!res.error && Array.isArray(res.data)) pedidos = res.data;
      }catch(e){ /* ignore */ }
    }
    stats.totals.leads = pedidos.length;
    stats.funnel.leads = stats.totals.leads;

    // Série diária de pedidos
    if(pedidoDateCol){
      pedidos.forEach(p=>{
        const d = parseDateAny(p?.[pedidoDateCol]);
        if(!d) return;
        const key = startOfDay(d).toISOString().slice(0,10);
        const i = labels.indexOf(key);
        if(i >= 0) seriesPedidos[i] += 1;
      });
    }

    // 3) Mensagens dos pedidos (para taxa/tempo de resposta)
    let mensagens = [];
    const msgPedidoCol = await detectColumn(client, "pedidos_mensagens", ["pedidoId","pedidoid","pedido_id"]);
    const msgDateCol = await detectColumn(client, "pedidos_mensagens", ["timestamp","created_at","createdAt","createdat","data"]);
    const msgSenderCol = await detectColumn(client, "pedidos_mensagens", ["senderuid","senderUid","sender","fromUid","fromuid"]);
    const pedidoIds = pedidos.map(p=>p?.id).filter(Boolean).map(String);

    if(pedidoIds.length && msgPedidoCol){
      try{
        let q = client.from("pedidos_mensagens").select("*").in(msgPedidoCol, pedidoIds).limit(5000);
        if(msgDateCol){
          q = q.gte(msgDateCol, start.toISOString()).lte(msgDateCol, end.toISOString());
        }
        const res = await q;
        if(!res.error && Array.isArray(res.data)) mensagens = res.data;
      }catch(e){ /* ignore */ }
    }

    // Série diária de mensagens
    if(msgDateCol){
      mensagens.forEach(m=>{
        const d = parseDateAny(m?.[msgDateCol]);
        if(!d) return;
        const key = startOfDay(d).toISOString().slice(0,10);
        const i = labels.indexOf(key);
        if(i >= 0) seriesMsgs[i] += 1;
      });
    }

    // Taxa de resposta (% de pedidos em que o pro enviou pelo menos 1 msg)
    if(stats.totals.leads){
      const responded = new Set();
      mensagens.forEach(m=>{
        const pid = m?.[msgPedidoCol];
        const sender = msgSenderCol ? m?.[msgSenderCol] : m?.senderuid;
        if(!pid || !sender) return;
        if(String(sender) === proUid) responded.add(String(pid));
      });
      stats.totals.responseRate = responded.size / Math.max(1, stats.totals.leads);
    }else{
      stats.totals.responseRate = null;
    }

    // Tempo mediano até primeira resposta (minutos)
    try{
      if(pedidoIds.length && msgDateCol && msgSenderCol){
        const byPedido = new Map();
        mensagens.forEach(m=>{
          const pid = m?.[msgPedidoCol];
          if(!pid) return;
          const arr = byPedido.get(String(pid)) || [];
          const d = parseDateAny(m?.[msgDateCol]);
          if(d) arr.push({ t: d.getTime(), sender: String(m?.[msgSenderCol]||"") });
          byPedido.set(String(pid), arr);
        });
        const diffs = [];
        byPedido.forEach(arr=>{
          arr.sort((a,b)=>a.t-b.t);
          const firstClient = arr.find(x=> x.sender && x.sender !== proUid);
          if(!firstClient) return;
          const firstPro = arr.find(x=> x.sender === proUid && x.t >= firstClient.t);
          if(!firstPro) return;
          diffs.push((firstPro.t - firstClient.t) / 60000);
        });
        diffs.sort((a,b)=>a-b);
        if(diffs.length){
          const mid = Math.floor(diffs.length/2);
          stats.totals.medianReplyMins = diffs.length % 2 ? diffs[mid] : (diffs[mid-1]+diffs[mid])/2;
        }
      }
    }catch(e){}

    // 4) Avaliações (nota média)
    let avals = [];
    const avProfCol = await detectColumn(client, "avaliacoes", ["profUid","profuid","prof_uid","profissionalUid"]);
    const avDateCol = await detectColumn(client, "avaliacoes", ["data","created_at","createdAt","createdat"]);
    if(avProfCol){
      try{
        let q = client.from("avaliacoes").select("*").eq(avProfCol, proUid).limit(500);
        if(avDateCol){
          const start30 = new Date(end); start30.setDate(start30.getDate() - 29);
          q = q.gte(avDateCol, startOfDay(start30).toISOString()).lte(avDateCol, end.toISOString());
        }
        const res = await q;
        if(!res.error && Array.isArray(res.data)) avals = res.data;
      }catch(e){ /* ignore */ }
    }
    const medias = avals.map(a=> safeNum(pickField(a, ["media","nota","rating"]))).filter(n=>n>0);
    stats.totals.ratingCount = medias.length;
    stats.totals.ratingAvg = medias.length ? (medias.reduce((s,n)=>s+n,0)/medias.length) : null;

    // Funnel (se não houver tracking granular, usa totais atuais)
    stats.funnel.impressions = stats.totals.views;
    stats.funnel.clicks = stats.totals.clicks;
    return stats;
  }

  function formatCompact(n){
    const x = Number(n)||0;
    if(x >= 1000000) return (x/1000000).toFixed(1).replace(".0","")+" mi";
    if(x >= 1000) return (x/1000).toFixed(1).replace(".0","")+" mil";
    return String(Math.round(x));
  }

  function drawLineChart(canvas, seriesA, seriesB){
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    const pad = 26;
    const gridTop = 12, gridBottom = h-22, gridLeft = 20, gridRight = w-16;

    const maxV = Math.max(...seriesA, ...seriesB, 10);
    const minV = 0;

    // grid
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(15,23,42,0.08)";
    const steps = 4;
    for(let i=0;i<=steps;i++){
      const y = gridTop + (gridBottom-gridTop)*(i/steps);
      ctx.beginPath();
      ctx.moveTo(gridLeft, y);
      ctx.lineTo(gridRight, y);
      ctx.stroke();
    }

    const mapX = (i, n) => gridLeft + (gridRight-gridLeft)*(i/(Math.max(n-1,1)));
    const mapY = (v) => gridBottom - (gridBottom-gridTop)*((v-minV)/(maxV-minV));

    function strokeLine(arr, color){
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = color;
      ctx.beginPath();
      arr.forEach((v,i)=>{
        const x = mapX(i, arr.length);
        const y = mapY(v);
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      });
      ctx.stroke();
      // points
      ctx.fillStyle = color;
      arr.forEach((v,i)=>{
        if(i % Math.max(1, Math.floor(arr.length/8)) !== 0 && i !== arr.length-1) return;
        const x = mapX(i, arr.length);
        const y = mapY(v);
        ctx.beginPath();
        ctx.arc(x,y,3,0,Math.PI*2);
        ctx.fill();
      });
    }

    // area under views
    ctx.fillStyle = "rgba(59,130,246,0.10)";
    ctx.beginPath();
    seriesA.forEach((v,i)=>{
      const x = mapX(i, seriesA.length);
      const y = mapY(v);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.lineTo(mapX(seriesA.length-1, seriesA.length), gridBottom);
    ctx.lineTo(mapX(0, seriesA.length), gridBottom);
    ctx.closePath();
    ctx.fill();

    strokeLine(seriesA, "rgba(59,130,246,0.95)"); // views (azul)
    strokeLine(seriesB, "rgba(11,119,104,0.95)"); // clicks (verde)

    // y labels
    ctx.fillStyle = "rgba(15,23,42,0.55)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "left";
    ctx.fillText("0", gridLeft, gridBottom+14);
    ctx.textAlign = "right";
    ctx.fillText(formatCompact(maxV), gridRight, gridTop+10);
  }

    function renderBars(container, items){
    if(!container) return;
    const arr = Array.isArray(items) ? items : [];
    if(arr.length === 0){
      container.innerHTML = `<div class="dp-emptyMini"><i class="bx bx-bar-chart-alt-2"></i> Sem dados suficientes para categorias no período.</div>`;
      return;
    }
    const max = Math.max(...arr.map(i=>safeNum(i.v)), 1);
    container.innerHTML = arr.map(i=>{
      const v = safeNum(i.v);
      const w = Math.round((v/max)*100);
      return `
        <div class="dp-barRow">
          <div class="dp-barLabel">${escapeHtml(i.k)}</div>
          <div class="dp-barTrack"><div class="dp-barFill" style="width:${w}%"></div></div>
          <div class="dp-barVal">${formatCompact(v)}</div>
        </div>
      `;
    }).join("");
  }

    function renderFunnel(container, views, clicks, leads){
    if(!container) return;
    const v = safeNum(views);
    const c = safeNum(clicks);
    const l = safeNum(leads);

    const cRate = v > 0 ? (c/v) : null;
    const lRate = c > 0 ? (l/c) : null;

    container.innerHTML = `
      <div class="dp-funnelRow">
        <div class="dp-funnelStep dp-funnelStep--views">
          <b>${formatCompact(v)}</b>
          <div class="dp-subtle">Impressões</div>
        </div>
        <div class="dp-funnelArrow">→</div>
        <div class="dp-funnelStep dp-funnelStep--clicks">
          <b>${formatCompact(c)}</b>
          <div class="dp-subtle">Cliques • ${cRate === null ? "—" : pct(cRate)}</div>
        </div>
        <div class="dp-funnelArrow">→</div>
        <div class="dp-funnelStep dp-funnelStep--leads">
          <b>${formatCompact(l)}</b>
          <div class="dp-subtle">Orçamentos • ${lRate === null ? "—" : pct(lRate)}</div>
        </div>
      </div>
    `;
  }

    function renderKpis(container, stats){
    if(!container) return;
    const t = stats?.totals || {};
    const views = safeNum(t.views);
    const clicks = safeNum(t.clicks);
    const leads = safeNum(t.leads);
    const ratingAvg = (t.ratingAvg === null || t.ratingAvg === undefined) ? null : Number(t.ratingAvg);
    const ratingCount = safeNum(t.ratingCount);
    const rr = (t.responseRate === null || t.responseRate === undefined) ? null : Number(t.responseRate);
    const replyMins = (t.medianReplyMins === null || t.medianReplyMins === undefined) ? null : Number(t.medianReplyMins);

    const ctr = views > 0 ? (clicks / views) : null;
    const conv = clicks > 0 ? (leads / clicks) : null;

    const cards = [
      { title: "Visualizações", value: formatCompact(views), sub: views > 0 ? `CTR ${pct(ctr)} • total` : "total" },
      { title: "Cliques", value: formatCompact(clicks), sub: clicks > 0 ? `Conversão ${pct(conv)} • total` : "total" },
      { title: "Orçamentos", value: formatCompact(leads), sub: "no período" },
      { title: "Nota média", value: (ratingAvg ? ratingAvg.toFixed(1) : "—"), sub: ratingCount ? `${ratingCount} avaliações (30d)` : "sem avaliações (30d)" },
      { title: "Taxa de resposta", value: rr === null ? "—" : pct(rr), sub: replyMins ? `mediana ${Math.round(replyMins)}min` : "mensagens/orçamentos" }
    ];

    container.innerHTML = cards.map(c=>`
      <div class="dp-kpi">
        <div class="dp-kpiTitle">${escapeHtml(c.title)}</div>
        <div class="dp-kpiValue">${escapeHtml(c.value)}</div>
        <div class="dp-kpiSub">${escapeHtml(c.sub)}</div>
      </div>
    `).join("");
  }
    if(leads === 0 && views >= 150){
      items.push({ cls:"todo", icon:"bx bx-target-lock", title:"Fortaleça o CTA", text:"Você tem visualizações no período, mas nenhum orçamento. Ajuste preço/descrição e botão de contato." });
    }
    if(rr !== null && leads >= 3 && rr < 0.6){
      items.push({ cls:"todo", icon:"bx bx-message-rounded-dots", title:"Responda mais rápido", text:`Sua taxa de resposta está em ${pct(rr)}. Configure notificações e responda em até 1h.` });
    }
    if(replyMins !== null && replyMins >= 120){
      items.push({ cls:"todo", icon:"bx bx-time-five", title:"Reduza o tempo de resposta", text:`Mediana de ${Math.round(replyMins)} min. Respostas rápidas aumentam fechamentos.` });
    }
    if(ratingAvg !== null && ratingCount){
      if(ratingAvg < 4.5){
        items.push({ cls:"todo", icon:"bx bx-star", title:"Suba sua nota", text:`Sua média (30d) é ${ratingAvg.toFixed(1)}. Peça avaliações após concluir o serviço.` });
      }else{
        items.push({ cls:"ok", icon:"bx bx-star", title:"Boa reputação", text:`Média ${ratingAvg.toFixed(1)} nas últimas avaliações.` });
      }
    }else{
      items.push({ cls:"todo", icon:"bx bx-star", title:"Peça avaliações", text:"Após fechar um serviço, peça para o cliente avaliar. Isso melhora seu ranking." });
    }

    if(items.length === 0){
      items.push({ cls:"ok", icon:"bx bx-check-circle", title:"Perfil bem completo", text:"Seu perfil está com boa base. Continue postando e respondendo rápido." });
      items.push({ cls:"ok", icon:"bx bx-rocket", title:"Próximo passo", text:"Teste um novo título e thumbnail no anúncio com mais visualizações." });
    }

    listEl.innerHTML = items.slice(0,8).map(it=>`
      <li class="dp-insight ${it.cls}">
        <i class="${it.icon}"></i>
        <div>
          <b>${escapeHtml(it.title)}</b>
          <div class="dp-subtle">${escapeHtml(it.text)}</div>
        </div>
      </li>
    `).join("");
  }

