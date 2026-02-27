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
  function normalizeIdentity(v){
    if(v === null || v === undefined) return "";
    return String(v).trim();
  }
  function collectIdentityKeys(user){
    if(!user || typeof user !== "object") return [];
    const values = [
      user.id,
      user.uid,
      user.auth_uid,
      user.authUid,
      user.user_uid,
      user.userId,
      user.user_id,
      user.profile_id
    ].map(normalizeIdentity).filter(Boolean);
    return Array.from(new Set(values));
  }
  function sameIdentity(a, b){
    const left = collectIdentityKeys(a);
    const right = collectIdentityKeys(b);
    if(!left.length || !right.length) return false;
    return left.some(v => right.includes(v));
  }
  function uniqueStrings(values){
    const out = [];
    for(const v of (values || [])){
      const n = normalizeIdentity(v);
      if(!n) continue;
      if(!out.includes(n)) out.push(n);
    }
    return out;
  }
  function getCachedPerfilIdentityKeys(){
    try{
      const cached = JSON.parse(localStorage.getItem("doke_usuario_perfil") || "null");
      if(!cached || typeof cached !== "object") return [];
      return collectIdentityKeys(cached);
    }catch(_){
      return [];
    }
  }
  function getOwnerQueryValues(ctx, primaryId){
    const includeSelfFallback = !!(ctx && (ctx.canEdit || String(ctx.pageMode || "").toLowerCase() === "self"));
    return uniqueStrings([
      primaryId,
      ctx?.target?.id,
      ctx?.target?.uid,
      ctx?.target?.auth_uid,
      ctx?.target?.authUid,
      ctx?.target?.user_uid,
      ...(includeSelfFallback ? [
        ctx?.me?.id,
        ctx?.me?.uid,
        ctx?.me?.auth_uid,
        ctx?.me?.authUid
      ] : []),
      ...(includeSelfFallback ? getCachedPerfilIdentityKeys() : [])
    ]);
  }
  function isOwnProfile(ctx){
    if(!ctx) return false;
    if(ctx.canEdit) return true;
    if(!ctx.me || !ctx.target) return false;
    return sameIdentity(ctx.me, ctx.target);
  }
  let mobileActionsBound = false;
  let dpPubSelectMode = false;
  let dpPubSelectedIds = new Set();
  let dpPubVisibleIds = [];
  let dpPubCtx = null;
  let dpReelSelectMode = false;
  let dpReelSelectedIds = new Set();
  let dpReelVisibleIds = [];
  let dpReelCtx = null;
  let dpPubLoadInFlight = false;
  let dpSvcSelectMode = false;
  let dpSvcSelectedIds = new Set();
  let dpSvcVisibleIds = [];
  let dpSvcCtx = null;
  function placeProfileActionsForMobile(){
    const rootEl = $("#dpRoot");
    if(!rootEl) return;
    const body = $(".dp-body", rootEl);
    const info = $(".dp-info", rootEl);
    const actions = $(".dp-actions", rootEl);
    const actionsRow = $(".dp-actionsRow", rootEl);
    const handle = $("#dpHandle", rootEl);
    const followBtn = $("#dpFollowBtn", rootEl);
    if(!body || !info || !actions) return;

    if(actions.parentElement !== body){
      body.appendChild(actions);
    }

    if(info.nextElementSibling !== actions){
      body.insertBefore(actions, info.nextSibling);
    }

    if(!handle) return;

    let handleRow = $(".dp-handleRow", info);
    if(!handleRow){
      handleRow = document.createElement("div");
      handleRow.className = "dp-handleRow";
      if(handle.parentElement === info){
        info.insertBefore(handleRow, handle);
        handleRow.appendChild(handle);
      }
    }else if(handle.parentElement !== handleRow){
      handleRow.insertBefore(handle, handleRow.firstChild || null);
    }

    if(!followBtn || !actionsRow) return;

    const ownerMode = rootEl.getAttribute("data-owner") || "";
    const isVisitor = ownerMode !== "self";
    if(isVisitor){
      followBtn.classList.add("dp-followCompact");
      if(followBtn.parentElement !== handleRow){
        handleRow.appendChild(followBtn);
      }
    }else{
      followBtn.classList.remove("dp-followCompact");
      if(followBtn.parentElement !== actionsRow){
        actionsRow.insertBefore(followBtn, actionsRow.firstChild || null);
      }
      if(handleRow.parentElement && handleRow.childElementCount === 1 && handleRow.firstElementChild === handle){
        handleRow.replaceWith(handle);
      }
    }
  }
  function bindMobileActionsPlacement(){
    if(mobileActionsBound) return;
    mobileActionsBound = true;

    let rt;
    const rerenderPlacement = ()=>{
      clearTimeout(rt);
      rt = setTimeout(placeProfileActionsForMobile, 80);
    };
    window.addEventListener("resize", rerenderPlacement, { passive: true });
    window.addEventListener("orientationchange", ()=> setTimeout(placeProfileActionsForMobile, 120), { passive: true });
  }

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
    const applyFriendLabel = (icon, label) => {
      if (!btn) return;
      btn.classList.remove("dp-icon-only");
      btn.innerHTML = `<i class='bx ${icon}'></i> ${label}`;
      btn.title = label;
      btn.setAttribute("aria-label", label);
    };
    const setupMessageButton = () => {
      if (!msgBtn) return;
      const otherUidMsg = ctx?.target?.uid || ctx?.target?.id || "";
      const canSend = !!(ctx?.me && otherUidMsg);
      msgBtn.style.display = "inline-flex";
      setIconButton(msgBtn, "bx-message-rounded", canSend ? "Mensagem" : "Entrar para enviar mensagem");
      msgBtn.onclick = () => {
        if (!canSend) {
          window.location.href = "login.html";
          return;
        }
        window.location.href = `mensagens.html?uid=${encodeURIComponent(otherUidMsg)}`;
      };
    };
    if(!btn) return;
    if(ctx?.sbRestDown || isRestBackoffActive()){
      btn.style.display = "none";
      if(msgBtn) msgBtn.style.display = "none";
      return;
    }
    if(isOwnProfile(ctx)){
      btn.style.display = "none";
      if (msgBtn) msgBtn.style.display = "none";
      return;
    }
    setupMessageButton();
    if(!ctx?.me){
      btn.style.display = "inline-flex";
      btn.dataset.friendStatus = "nologin";
      applyFriendLabel("bx-user-plus", "Entrar para adicionar");
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
      applyFriendLabel("bx-user-minus", "Desfazer amizade");
    } else if (rel.status === "pendente_out") {
      applyFriendLabel("bx-time", "Cancelar pedido");
    } else if (rel.status === "pendente_in") {
      applyFriendLabel("bx-user-check", "Aceitar amizade");
    } else if (rel.status === "recusado") {
      applyFriendLabel("bx-user-plus", "Novo pedido");
    } else {
      applyFriendLabel("bx-user-plus", "Adicionar amizade");
    }
    setupMessageButton();
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
        const actorNome = ctx?.me?.nome || ctx?.me?.user || "Usuário";
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
      toast("Não foi possível atualizar amizade.");
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
    if(ctx?.sbRestDown || isRestBackoffActive()){
      btn.style.display = "none";
      return;
    }
    if(isOwnProfile(ctx)){
      btn.style.display = "none";
      return;
    }
    if(!ctx?.me){
      btn.style.display = "inline-flex";
      btn.dataset.following = "nologin";
      btn.classList.remove("dp-icon-only");
      btn.innerHTML = "<i class='bx bx-heart'></i> Seguir";
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
      btn.innerHTML = "<i class='bx bx-heart'></i> Seguindo";
      btn.title = "Seguindo";
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
        const actorNome = ctx?.me?.nome || ctx?.me?.user || "Usuário";
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
      toast("Não foi possível atualizar seguir.");
    }
    await updateFollowButton(ctx);
    await updateFollowCounts(ctx);
  }

  async function updateFollowCounts(ctx){
    const client = ctx?.client;
    if(!client) return;
    if(isRestBackoffActive()){
      setText("#dpFollowers", "0");
      setText("#dpFollowing", "0");
      return;
    }
    const targetUid = ctx?.target?.uid || ctx?.target?.id;
    const meUid = ctx?.me?.uid || ctx?.me?.id;
    if(!targetUid) return;
    try{
      const [followersRes, followingRes] = await Promise.all([
        selectRowsByOwnerCompat(client, {
          table: "seguidores",
          select: "id",
          ownerColumns: ["seguidoUid", "seguido_uid", "seguido_id", "seguidoid"],
          ownerValues: [targetUid],
          orderColumns: [null],
          limit: 500,
          maxAttempts: 8
        }),
        selectRowsByOwnerCompat(client, {
          table: "seguidores",
          select: "id",
          ownerColumns: ["seguidorUid", "seguidor_uid", "seguidor_id", "seguidorid"],
          ownerValues: [targetUid],
          orderColumns: [null],
          limit: 500,
          maxAttempts: 8
        })
      ]);
      if(isTransientRestError(followersRes?.error) || isTransientRestError(followingRes?.error)){
        markRestBackoff(followersRes?.error || followingRes?.error);
        setText("#dpFollowers", "0");
        setText("#dpFollowing", "0");
        return;
      }
      const followers = Array.isArray(followersRes?.data) ? followersRes.data.length : 0;
      const following = Array.isArray(followingRes?.data) ? followingRes.data.length : 0;
      setText("#dpFollowers", String(followers));
      setText("#dpFollowing", String(following));
      if (meUid && meUid === targetUid) {
        // para o próprio perfil, mantém visível o número atualizado
      }
    }catch(e){
      if(isTransientRestError(e)) markRestBackoff(e);
    }
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
      <a href="anunciar.html" id="dpMenuAds"><span></span> Novo anúncio</a>
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
    if(become) become.style.display = isProfissionalUsuario(ctx.me) ? "none" : "flex";

    const viewAs = $("#dpMenuViewAs", menu);
    if(viewAs){
      viewAs.onclick = (e)=>{
        e.preventDefault();
        // alterna para view público do próprio perfil (cliente)
        const id = ctx.target?.id || ctx.targetId;
        const isPro = isProfissionalUsuario(ctx.target);
        const dest = isPro ? "perfil-profissional.html" : "perfil-cliente.html";
        window.location.href = `${dest}?id=${encodeURIComponent(id)}`;
      };
    }

    const adsLink = $("#dpMenuAds", menu);
    if(adsLink){
      const canPublish = !!(ctx?.canEdit && isProfissionalUsuario(ctx?.me));
      adsLink.style.display = canPublish ? "flex" : "none";
      adsLink.setAttribute("href", canPublish ? "anunciar.html" : "tornar-profissional.html");
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
      let safePath = `${path}.${ext}`.replaceAll("//","/");
      const buckets = Array.from(new Set([bucket, "perfil"].filter(Boolean)));
      const candidates = [safePath];

      // Compatibilidade com policies que exigem prefixo por tipo:
      // - covers/{uid}/cover.ext
      // - avatars/{uid}/avatar.ext
      const m1 = safePath.match(/^([^/]+)\/(covers|avatars)\/(.+)$/i); // uid/covers/...
      if(m1){
        const uid = m1[1];
        const kind = m1[2].toLowerCase();
        const rest = m1[3];
        candidates.push(`${kind}/${uid}/${rest}`);
      }
      const m2 = safePath.match(/^(covers|avatars)\/([^/]+)\/(.+)$/i); // covers/uid/...
      if(m2){
        const kind = m2[1].toLowerCase();
        const uid = m2[2];
        const rest = m2[3];
        candidates.push(`${uid}/${kind}/${rest}`);
      }

      let authUid = "";
      try{
        const sess = await client.auth.getSession().catch(() => null);
        authUid = String(sess?.data?.session?.user?.id || "").trim();
        if(!authUid && typeof window.dokeResolveAuthUser === "function"){
          const resolved = await window.dokeResolveAuthUser().catch(() => null);
          authUid = String(resolved?.id || resolved?.uid || "").trim();
        }
      }catch(_){}
      if(authUid){
        const normalized = [];
        for (const p of candidates) {
          const mTop = String(p).match(/^(covers|avatars)\/[^/]+\/(.+)$/i);
          if (mTop) {
            normalized.push(`${authUid}/${mTop[1].toLowerCase()}/${mTop[2]}`);
          }
          const mUidFirst = String(p).match(/^[^/]+\/(covers|avatars)\/(.+)$/i);
          if (mUidFirst) {
            normalized.push(`${authUid}/${mUidFirst[1].toLowerCase()}/${mUidFirst[2]}`);
          }
        }
        const withUidPrefix = candidates
          .filter((p) => p && !String(p).startsWith(`${authUid}/`))
          .map((p) => `${authUid}/${p}`);
        candidates.push(...normalized, ...withUidPrefix);
      }

      const tryUpload = async () => {
        let lastErr = null;
        for(const b of buckets){
          for(const candidate of Array.from(new Set(candidates))){
            const upRes = await client.storage.from(b).upload(candidate, file, { upsert: true, cacheControl: "3600" });
            const upErr = upRes?.error || null;
            if(!upErr){
              const { data } = client.storage.from(b).getPublicUrl(candidate);
              return { url: data?.publicUrl || null, path: candidate, bucket: b, error: null };
            }
            lastErr = upErr;
          }
        }
        return { url: null, path: null, bucket: null, error: lastErr || new Error("Falha ao enviar arquivo.") };
      };

      let result = await tryUpload();
      if(!result.error){
        return { url: result.url, path: result.path, bucket: result.bucket };
      }

      if (isPermissionDeniedError(result.error) && typeof window.dokeRestoreSupabaseSessionFromStorage === "function") {
        try {
          const restored = await window.dokeRestoreSupabaseSessionFromStorage({ force: true });
          if (restored) {
            result = await tryUpload();
            if(!result.error){
              return { url: result.url, path: result.path, bucket: result.bucket };
            }
          }
        } catch (_) {}
      }

      if(result.error) return { error: result.error };
      return { url: result.url, path: result.path, bucket: result.bucket };
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
  // Data helpers (usuários)

  function looksUUID(v){
    return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  }

  function getUsuariosTableOrderCompat(){
    const preferred = String(window.__dokeUsuariosTable || window.__dokePerfilUsuariosTable || "").trim();
    if(preferred === "usuarios_legacy") return ["usuarios_legacy", "usuarios"];
    return ["usuarios", "usuarios_legacy"];
  }

  function isQueryValueCompatError(err){
    if(!err) return false;
    const msg = String((err.message||"") + " " + (err.hint||"") + " " + (err.details||"")).toLowerCase();
    return (
      err.code === "22P02" ||
      err.code === "42804" ||
      /invalid input syntax/i.test(msg) ||
      /operator does not exist/i.test(msg) ||
      /cannot cast/i.test(msg) ||
      /failed to parse/i.test(msg)
    );
  }

  function isPermissionDeniedError(err){
    if(!err) return false;
    const msg = String((err.message||"") + " " + (err.hint||"") + " " + (err.details||"")).toLowerCase();
    return (
      err.code === "42501" ||
      err.status === 401 ||
      err.status === 403 ||
      /permission denied/i.test(msg) ||
      /row-level security/i.test(msg) ||
      /rls/i.test(msg)
    );
  }

  function isUsuariosCompatError(err){
    if(!err) return false;
    const msg = String((err.message||"") + " " + (err.hint||"") + " " + (err.details||"")).toLowerCase();
    return (
      err.code === "PGRST205" ||
      err.code === "PGRST204" ||
      err.status === 404 ||
      /could not find the table/i.test(msg) ||
      /could not find the .* column/i.test(msg) ||
      /column .* does not exist/i.test(msg) ||
      isQueryValueCompatError(err)
    );
  }

  async function runUsuariosCompatQuery(client, requestBuilder, opts){
    if(!client || typeof requestBuilder !== "function"){
      return { data: null, error: null, table: null, uidField: "uid" };
    }

    const continueOnEmpty = !!opts?.continueOnEmpty;
    let lastCompatErr = null;
    let hadNoErrorEmpty = false;

    for(const table of getUsuariosTableOrderCompat()){
      const uidField = table === "usuarios_legacy" ? "uid_text" : "uid";
      let res = null;
      try{
        res = await requestBuilder({ table, uidField });
      }catch(err){
        if(isNetworkFetchError(err)) return { data: null, error: err, table, uidField };
        if(isUsuariosCompatError(err)){ lastCompatErr = err; continue; }
        return { data: null, error: err, table, uidField };
      }

      const err = res?.error || null;
      if(err && isNetworkFetchError(err)){
        return { data: null, error: err, table, uidField };
      }
      if(err && isUsuariosCompatError(err)){
        lastCompatErr = err;
        continue;
      }
      if(err){
        return { data: null, error: err, table, uidField };
      }

      const data = res?.data ?? null;
      if(continueOnEmpty && (data === null || (Array.isArray(data) && data.length < 1))){
        hadNoErrorEmpty = true;
        continue;
      }

      window.__dokeUsuariosTable = table;
      window.__dokePerfilUsuariosTable = table;
      return { data, error: null, table, uidField };
    }

    if(hadNoErrorEmpty) return { data: null, error: null, table: null, uidField: "uid" };
    return { data: null, error: lastCompatErr, table: null, uidField: "uid" };
  }
  async function queryUsuarioRestCompat(client, columns, values){
    const cols = uniqueStrings(columns || []);
    const vals = uniqueStrings(values || []);
    if(!cols.length || !vals.length){
      return { usuario: null, error: null };
    }

    let lastError = null;
    for(const table of getUsuariosTableOrderCompat()){
      for(const col of cols){
        for(const rawValue of vals){
          const value = normalizeIdentity(rawValue);
          if(!value) continue;

          const rest = await restSelectRowsByOwnerCompat(client, {
            table,
            select: "*",
            ownerCol: col,
            ownerValue: value,
            limit: 1,
            orderCol: ""
          });

          if(rest?.error){
            const err = rest.error;
            if(isTransientRestError(err)){
              markRestBackoff(err);
              return { usuario: null, error: err };
            }
            if(
              isMissingTableError(err) ||
              isMissingColumnError(err, col) ||
              isPermissionDeniedError(err) ||
              isUsuariosCompatError(err) ||
              isQueryValueCompatError(err)
            ){
              lastError = err;
              continue;
            }
            lastError = err;
            continue;
          }

          const rows = Array.isArray(rest?.data) ? rest.data : [];
          if(rows.length > 0){
            window.__dokeUsuariosTable = table;
            window.__dokePerfilUsuariosTable = table;
            return { usuario: rows[0], error: null };
          }
        }
      }
    }

    if(
      lastError &&
      !isPermissionDeniedError(lastError) &&
      !isUsuariosCompatError(lastError) &&
      !isQueryValueCompatError(lastError)
    ){
      return { usuario: null, error: lastError };
    }
    return { usuario: null, error: null };
  }
  // -----------------------------
  async function getSessionUser(client){
    const strictSessionMode = window.DOKE_STRICT_AUTH_SESSION !== false;
    const allowCachedFallbackInStrict = (() => {
      try{
        const forcedLogoutAt = Number(localStorage.getItem("doke_force_logged_out_at") || sessionStorage.getItem("doke_force_logged_out_at") || 0);
        const forceLogoutActive = Number.isFinite(forcedLogoutAt) && forcedLogoutAt > 0 && (Date.now() - forcedLogoutAt) < (12 * 60 * 60 * 1000);
        if(forceLogoutActive) return false;
      }catch(_){}
      try{
        const lsLogado = localStorage.getItem("usuarioLogado") === "true";
        const hasPerfil = !!localStorage.getItem("doke_usuario_perfil");
        return lsLogado || hasPerfil;
      }catch(_){
        return false;
      }
    })();
    function normalizeAuthUserCandidate(raw){
      if(!raw || typeof raw !== "object") return null;
      const uid = normalizeIdentity(
        raw.id ||
        raw.uid ||
        raw.user_id ||
        raw.userId ||
        raw.auth_uid ||
        raw.authUid
      );
      if(!uid) return null;
      const meta = raw.user_metadata || {};
      return {
        id: uid,
        uid,
        email: raw.email || null,
        user_metadata: {
          nome: meta.nome || raw.nome || null,
          user: meta.user || raw.user || null,
          foto: meta.foto || meta.avatar_url || raw.foto || raw.avatar_url || null
        }
      };
    }

    function decodeJwtPayload(token){
      try {
        const parts = String(token || "").split(".");
        if (parts.length < 2) return null;
        const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const pad = "=".repeat((4 - (b64.length % 4)) % 4);
        const json = atob(b64 + pad);
        return JSON.parse(json);
      } catch(_){
        return null;
      }
    }

    function pickCachedUser(){
      try {
        const compat = normalizeAuthUserCandidate(window.auth?.currentUser || null);
        if (compat) return compat;
      } catch(_){}
      if (window.DOKE_ALLOW_PROFILE_ONLY_AUTH === true) {
        try {
          const cached = JSON.parse(localStorage.getItem("doke_usuario_perfil") || "null");
          const uid = normalizeIdentity(
            cached?.uid ||
            cached?.id ||
            cached?.user_uid ||
            cached?.userId ||
            localStorage.getItem("doke_uid")
          );
          if (uid) {
            return {
              id: uid,
              uid,
              email: cached?.email || null,
              user_metadata: {
                nome: cached?.nome || null,
                user: cached?.user || null,
                foto: cached?.foto || null
              }
            };
          }
        } catch(_) {}
      }

      try {
        const keys = Object.keys(localStorage).filter((k) => /^sb-[a-z0-9-]+-auth-token$/i.test(k));
        for (const k of keys) {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          let parsed = null;
          try { parsed = JSON.parse(raw); } catch(_) { parsed = null; }
          if (!parsed || typeof parsed !== "object") continue;
          const sessions = [parsed, parsed.currentSession, parsed.session, parsed.data?.session].filter(Boolean);
          for (const sess of sessions) {
            const direct = normalizeAuthUserCandidate(sess?.user || null);
            if (direct) return direct;
            const payload = decodeJwtPayload(sess?.access_token || "");
            const expMs = Number(payload?.exp || 0) * 1000;
            if (expMs && expMs < (Date.now() - 60000)) continue;
            const uid = normalizeIdentity(payload?.sub);
            if (!uid) continue;
            return { id: uid, uid, email: payload?.email || null, user_metadata: {} };
          }
        }
      } catch(_){}

      return null;
    }

    try{
      const { data, error } = await client.auth.getSession();
      if(!error && data?.session?.user){
        return { session: data.session, user: data.session.user };
      }

      if (!data?.session?.user && typeof window.dokeRestoreSupabaseSessionFromStorage === "function") {
        try {
          const restored = await window.dokeRestoreSupabaseSessionFromStorage({ force: true });
          if (restored) {
            const retry = await client.auth.getSession();
            if (!retry?.error && retry?.data?.session?.user) {
              return { session: retry.data.session, user: retry.data.session.user };
            }
          }
        } catch (_) {}
      }

      if (strictSessionMode) {
        if (typeof window.dokeResolveAuthUser === "function") {
          try {
            const resolved = await window.dokeResolveAuthUser();
            const compatResolved = normalizeAuthUserCandidate(resolved);
            if (compatResolved) return { session: null, user: compatResolved };
          } catch (_) {}
        }
        const compatCurrent = normalizeAuthUserCandidate(window.auth?.currentUser || null);
        if (compatCurrent) return { session: null, user: compatCurrent };
        if (allowCachedFallbackInStrict) {
          const cachedUser = pickCachedUser();
          if (cachedUser) return { session: null, user: cachedUser };
        }
        if (error) return { error };
        return { session: null, user: null };
      }

      const cachedUser = pickCachedUser();
      if (cachedUser) return { session: null, user: cachedUser };
      if(error) return { error };
      return { session: null, user: null };
    }catch(err){
      if (strictSessionMode) {
        if (typeof window.dokeResolveAuthUser === "function") {
          try {
            const resolved = await window.dokeResolveAuthUser();
            const compatResolved = normalizeAuthUserCandidate(resolved);
            if (compatResolved) return { session: null, user: compatResolved };
          } catch (_) {}
        }
        const compatCurrent = normalizeAuthUserCandidate(window.auth?.currentUser || null);
        if (compatCurrent) return { session: null, user: compatCurrent };
        if (allowCachedFallbackInStrict) {
          const cachedUser = pickCachedUser();
          if (cachedUser) return { session: null, user: cachedUser };
        }
        return { error: err };
      }
      const cachedUser = pickCachedUser();
      if (cachedUser) return { session: null, user: cachedUser };
      return { error: err };
    }
  }

  async function getUsuarioByAuthUid(client, authUid){
    const authKey = normalizeIdentity(authUid);
    if(!authKey) return { usuario: null };

    const filters = looksUUID(authKey)
      ? ["uid", "uid_text"]
      : ["uid", "uid_text", "id"];
    const r = await queryUsuarioRestCompat(client, filters, [authKey]);
    if(r.error && !isPermissionDeniedError(r.error)) return { error: r.error };
    return { usuario: r.usuario || null };
  }

  async function getUsuarioById(client, id){
    const key = normalizeIdentity(id);
    if(!key) return { usuario: null };

    const filters = looksUUID(key)
      ? ["uid", "uid_text"]
      : ["id", "uid", "uid_text"];
    const r = await queryUsuarioRestCompat(client, filters, [key]);
    if(r.error && !isPermissionDeniedError(r.error)) return { error: r.error };
    return { usuario: r.usuario || null };
  }

  async function getUsuarioByUsername(client, username){
    const raw = normalizeIdentity(username);
    if(!raw) return { usuario: null };
    const values = uniqueStrings([raw, raw.startsWith("@") ? raw.slice(1) : raw, raw.startsWith("@") ? raw : `@${raw}`]);
    const columns = ["user", "username", "handle"];
    const r = await queryUsuarioRestCompat(client, columns, values);
    if(r.error && !isPermissionDeniedError(r.error)) return { error: r.error };
    return { usuario: r.usuario || null };
  }

  async function getAuthUidForWrite(client){
    try{
      const sess = await client?.auth?.getSession?.().catch(() => null);
      const uid = normalizeIdentity(sess?.data?.session?.user?.id);
      if(uid) return uid;
    }catch(_){}

    try{
      if(typeof window.dokeResolveAuthUser === "function"){
        const resolved = await window.dokeResolveAuthUser();
        const uid = normalizeIdentity(resolved?.id || resolved?.uid);
        if(uid) return uid;
      }
    }catch(_){}

    try{
      const compatUid = normalizeIdentity(window.auth?.currentUser?.uid || window.firebaseAuth?.currentUser?.uid);
      if(compatUid) return compatUid;
    }catch(_){}

    try{
      const lsUid = normalizeIdentity(localStorage.getItem("doke_uid"));
      if(lsUid) return lsUid;
    }catch(_){}

    return "";
  }

  async function updateUsuario(client, rowId, patch){
    const authUid = await getAuthUidForWrite(client);
    const keys = uniqueStrings([authUid, rowId]);
    const attempts = [];

    // prioridade: uid (auth) -> uid_text (legado texto) -> id (legado serial/uuid)
    for(const key of keys){
      if(looksUUID(key)){
        attempts.push({ col: "uid", value: key });
      }
    }
    for(const key of keys){
      if(looksUUID(key)){
        attempts.push({ col: "uid_text", value: key });
      }
    }
    for(const key of keys){
      attempts.push({ col: "id", value: key });
    }

    const seen = new Set();
    let lastErr = null;
    for(const att of attempts){
      const id = `${att.col}:${att.value}`;
      if(!att.value || seen.has(id)) continue;
      seen.add(id);
      const res = await client
        .from("usuarios")
        .update(patch)
        .eq(att.col, att.value)
        .select("id,uid")
        .limit(1);
      if(!res?.error) return { error: null };
      lastErr = res.error;
      if(!isPermissionDeniedError(res.error) && !isQueryValueCompatError(res.error) && !isUsuariosCompatError(res.error)){
        return { error: res.error };
      }
    }
    return { error: lastErr || null };
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

  function setVisible(el, visible){
    if(!el) return;
    if(visible){
      el.style.removeProperty("display");
      return;
    }
    // Precisa de !important para vencer regras responsivas com display: inline-flex !important
    el.style.setProperty("display", "none", "important");
  }

  function hideIf(selector, cond){
    $$(selector).forEach(el => setVisible(el, !cond));
  }

  function showIf(selector, cond){
    $$(selector).forEach(el => setVisible(el, !!cond));
  }

  function safeStr(v){ return (v ?? "").toString().trim(); }

  function getSkeletonCountByViewport(desktop = 4, tablet = 3, mobile = 2){
    const w = window.innerWidth || document.documentElement.clientWidth || 1024;
    if (w <= 600) return mobile;
    if (w <= 1024) return tablet;
    return desktop;
  }

  function renderPerfilGridSkeleton(grid, kind){
    if(!grid) return;
    const tpl = [];
    grid.classList.remove("dp-grid--loading");
    grid.classList.add("dp-grid--loading");

    if(kind === "reels"){
      const count = getSkeletonCountByViewport(4, 3, 2);
      grid.classList.add("dp-grid--reels");
      for(let i = 0; i < count; i++){
        tpl.push(
          `<article class="dp-reelCard dp-item dp-skelCard dp-skelCard--reel" aria-hidden="true">
             <div class="dp-reelMedia dp-skelMedia dp-skelMedia--reel skeleton"></div>
           </article>`
        );
      }
      grid.innerHTML = tpl.join("");
      return;
    }

    if(kind === "servicos"){
      const count = getSkeletonCountByViewport(2, 2, 1);
      try { grid.classList.add("lista-cards-premium"); } catch(_){}
      for(let i = 0; i < count; i++){
        tpl.push(
          `<article class="card-premium skeleton-premium-card dp-serviceSkel" aria-hidden="true">
             <div class="skeleton skeleton-premium-cover"></div>
             <div class="skeleton-premium-body">
               <div class="skeleton skeleton-line lg"></div>
               <div class="skeleton skeleton-line md"></div>
               <div class="skeleton skeleton-line sm"></div>
             </div>
           </article>`
        );
      }
      grid.innerHTML = tpl.join("");
      return;
    }

    if(kind === "portfolio"){
      const count = getSkeletonCountByViewport(8, 6, 4);
      grid.classList.add("dp-grid--masonry");
      for(let i = 0; i < count; i++){
        tpl.push(
          `<article class="dp-item dp-skelCard dp-skelCard--portfolio" aria-hidden="true">
             <div class="dp-itemMedia dp-skelMedia dp-skelMedia--portfolio skeleton"></div>
             <div class="dp-itemBody dp-skelBody dp-skelBody--portfolio">
               <div class="skeleton dp-skelLine dp-skelLine--md"></div>
             </div>
           </article>`
        );
      }
      grid.innerHTML = tpl.join("");
      return;
    }

    if(kind === "publicacoes"){
      const count = getSkeletonCountByViewport(8, 6, 4);
      grid.classList.add("dp-grid--masonry");
      for(let i = 0; i < count; i++){
        tpl.push(
          `<article class="dp-item dp-skelCard dp-skelCard--publicação" aria-hidden="true">
             <div class="dp-itemMedia dp-skelMedia skeleton"></div>
             <div class="dp-itemBody dp-skelBody">
               <div class="dp-skelAuthor">
                 <span class="skeleton dp-skelAvatar"></span>
                 <span class="skeleton dp-skelLine dp-skelLine--author"></span>
               </div>
               <div class="skeleton dp-skelLine dp-skelLine--lg"></div>
               <div class="skeleton dp-skelLine dp-skelLine--md"></div>
             </div>
           </article>`
        );
      }
      grid.innerHTML = tpl.join("");
      return;
    }
  }

  function renderPerfilBoxSkeleton(box){
    if(!box) return;
    box.innerHTML = `
      <div class="dp-empty dp-skelPanel" aria-hidden="true">
        <div class="skeleton dp-skelLine dp-skelLine--lg"></div>
        <div class="skeleton dp-skelLine dp-skelLine--md"></div>
        <div class="skeleton dp-skelLine dp-skelLine--sm"></div>
      </div>
    `;
  }

  try{
    window.renderPerfilGridSkeleton = renderPerfilGridSkeleton;
    window.renderPerfilBoxSkeleton = renderPerfilBoxSkeleton;
  }catch(_){}

  function roleFromUsuario(usuario){
    return isProfissionalUsuario(usuario) ? "profissional" : "cliente";
  }

  function flagAtivo(v){
    if (v === true || v === 1) return true;
    if (v === false || v === 0 || v == null) return false;
    const s = String(v).trim().toLowerCase();
    return s === "true" || s === "1" || s === "sim" || s === "yes";
  }

  function isProfissionalUsuario(usuario){
    if(!usuario || typeof usuario !== "object") return false;
    return flagAtivo(
      usuario.isProfissional ??
      usuario.is_profissional ??
      usuario.profissional ??
      usuario.isProfessional ??
      false
    );
  }

  function isMissingTableError(err){
    if(!err) return false;
    const msg = (err.message||"") + " " + (err.hint||"") + " " + (err.details||"");
    return err.code === "PGRST205" || err.status === 404 || /could not find the table/i.test(msg) || /not found/i.test(msg);
  }

  function isMissingColumnError(err, column){
    if(!err) return false;
    const col = String(column || "").toLowerCase();
    const msg = String((err.message || "") + " " + (err.hint || "") + " " + (err.details || "")).toLowerCase();
    if (err.code === "PGRST204") return !col || msg.includes(col);
    if (err.code === "42703") return !col || msg.includes(col);
    if (/column .* does not exist/i.test(msg)) return !col || msg.includes(col);
    return false;
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

  function isNetworkFetchError(err){
    if(!err) return false;
    const msg = String(err.message || err.details || err.error_description || err || "").toLowerCase();
    const status = Number(err.status || 0);
    return (
      status === 0 ||
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("load failed") ||
      msg.includes("fetch failed") ||
      msg.includes("timeout")
    );
  }

  function isSupabaseUnavailableError(err){
    if(!err) return false;
    const status = Number(err.status || err.statusCode || 0);
    if([500, 502, 503, 504, 520, 522, 524].includes(status)) return true;
    const msg = String(err.message || err.details || err.error_description || err || "").toLowerCase();
    return (
      msg.includes("connection reset") ||
      msg.includes("err_connection_reset") ||
      msg.includes("origin unreachable") ||
      msg.includes("bad gateway") ||
      msg.includes("proxy error")
    );
  }

  function isTransientRestError(err){
    return isNetworkFetchError(err) || isSupabaseUnavailableError(err);
  }

  const DOKE_REST_BACKOFF_KEY = "__DOKE_REST_BACKOFF_UNTIL__";
  const DOKE_REST_BACKOFF_ERR_KEY = "__DOKE_REST_BACKOFF_ERR__";
  const DOKE_REST_BACKOFF_MS = 25000;

  function getRestBackoffUntil(){
    try{
      return Number(window[DOKE_REST_BACKOFF_KEY] || 0) || 0;
    }catch(_){
      return 0;
    }
  }

  function getRestBackoffError(){
    try{
      return window[DOKE_REST_BACKOFF_ERR_KEY] || null;
    }catch(_){
      return null;
    }
  }

  function isRestBackoffActive(){
    return getRestBackoffUntil() > Date.now();
  }

  function markRestBackoff(err, ms){
    const ttl = Math.max(4000, Number(ms || DOKE_REST_BACKOFF_MS));
    try{
      window[DOKE_REST_BACKOFF_KEY] = Date.now() + ttl;
      window[DOKE_REST_BACKOFF_ERR_KEY] = err || { message: "rest_backoff", status: 520 };
    }catch(_){}
  }

  function getSupabaseRestCfg(){
    const bases = [];
    const pageOrigin = (()=>{
      try{
        if(typeof location === "undefined") return "";
        return String(location.origin || "").trim().replace(/\/+$/g, "");
      }catch(_){
        return "";
      }
    })();
    const pageIsLoopback = (()=>{
      try{
        if(typeof location === "undefined") return false;
        const host = String(location.hostname || "").toLowerCase();
        return host === "localhost" || host === "127.0.0.1";
      }catch(_){
        return false;
      }
    })();
    const pushBase = (raw)=>{
      const value = String(raw || "").trim().replace(/\/+$/g, "");
      if(!value) return;
      if(!/^https?:\/\//i.test(value)) return;
      if(pageIsLoopback && pageOrigin){
        try{
          const candidate = new URL(value);
          const candidateIsLoopback = /^(localhost|127\.0\.0\.1)$/i.test(String(candidate.hostname || ""));
          // Nunca usa loopback cross-origin (ex.: localhost:5500 -> 127.0.0.1:5500 / localhost:5501).
          if(candidateIsLoopback && candidate.origin !== pageOrigin) return;
        }catch(_){
          return;
        }
      }
      if(!bases.includes(value)) bases.push(value);
    };
    try{
      const proxyEnabled = !!window.DOKE_SUPABASE_PROXY_ENABLED;
      if(typeof location !== "undefined"){
        const host = String(location.hostname || "").toLowerCase();
        if(proxyEnabled && (host === "localhost" || host === "127.0.0.1")){
          pushBase(location.origin);
        }
      }
    }catch(_){}
    try{
      const remembered = String(sessionStorage.getItem("DOKE_PROXY_ORIGIN") || "").trim();
      if(remembered){
        if(pageOrigin){
          const origin = new URL(remembered, pageOrigin).origin;
          if(origin === pageOrigin){
            pushBase(origin);
          }
        }else{
          pushBase(remembered);
        }
      }
    }catch(_){}
    pushBase(window.DOKE_SUPABASE_PROXY_ORIGIN);
    pushBase(window.DOKE_SUPABASE_URL);
    pushBase(window.SUPABASE_URL);
    try{
      pushBase(localStorage.getItem("DOKE_SUPABASE_URL"));
      pushBase(localStorage.getItem("SUPABASE_URL"));
    }catch(_){}
    pushBase(window.DOKE_SUPABASE_PROXY_UPSTREAM);
    const base = bases[0] || "";
    const anon = String(
      window.DOKE_SUPABASE_ANON_KEY ||
      window.SUPABASE_ANON_KEY ||
      localStorage.getItem("DOKE_SUPABASE_ANON_KEY") ||
      localStorage.getItem("SUPABASE_ANON_KEY") ||
      ""
    ).trim();
    return { base, bases, anon };
  }

  function isSupabaseLikeResponse(resp){
    try{
      if(!resp || !resp.headers) return false;
      const sbRef = String(resp.headers.get("sb-project-ref") || "").trim();
      const sbGateway = String(resp.headers.get("sb-gateway-version") || "").trim();
      const contentProfile = String(resp.headers.get("content-profile") || "").trim();
      return !!(sbRef || sbGateway || contentProfile);
    }catch(_){
      return false;
    }
  }

  async function getAccessToken(client){
    try{
      if(!client?.auth?.getSession) return null;
      const { data, error } = await client.auth.getSession();
      if(error) return null;
      return data?.session?.access_token || null;
    }catch(_){
      return null;
    }
  }

  async function restSelectRowsByOwnerCompat(client, cfg){
    try{
      const table = String(cfg?.table || "").trim();
      const select = String(cfg?.select || "*").trim() || "*";
      const ownerCol = String(cfg?.ownerCol || "").trim();
      const ownerValue = String(cfg?.ownerValue ?? "").trim();
      const orderCol = cfg?.orderCol ? String(cfg.orderCol).trim() : "";
      const limit = Math.max(1, Number(cfg?.limit || 40));
      const ascending = !!cfg?.ascending;
      if(!table || !ownerCol || !ownerValue){
        return { data: null, error: { message: "invalid_rest_fallback_args" } };
      }

      const { base, bases, anon } = getSupabaseRestCfg();
      if(!base || !anon){
        return { data: null, error: { message: "missing_supabase_config" } };
      }

      const token = await getAccessToken(client);
      const useAuthToken = !!(window.DOKE_USE_AUTH_FOR_PROFILE_REST === true);
      const bearer = useAuthToken ? (token || anon) : anon;
      const params = new URLSearchParams();
      params.set("select", select);
      params.set(ownerCol, `eq.${ownerValue}`);
      params.set("limit", String(limit));
      if(orderCol){
        params.set("order", `${orderCol}.${ascending ? "asc" : "desc"}`);
      }

      const targets = (Array.isArray(bases) && bases.length ? bases : [base]).filter(Boolean);
      let resp;
      let lastNetworkError = null;
      let usedBase = "";
      for(const targetBase of targets){
        usedBase = targetBase;
        try{
          const candidateResp = await fetch(`${targetBase}/rest/v1/${encodeURIComponent(table)}?${params.toString()}`, {
            method: "GET",
            headers: {
              apikey: anon,
              Authorization: `Bearer ${bearer}`,
            },
          });
          // Se não parece resposta do Supabase/proxy, segue para próxima base.
          if(!isSupabaseLikeResponse(candidateResp) && targets.length > 1){
            lastNetworkError = { message: "non_supabase_response", status: candidateResp.status, base: targetBase };
            resp = null;
            continue;
          }
          resp = candidateResp;
          lastNetworkError = null;
          break;
        }catch(e){
          lastNetworkError = e;
          resp = null;
        }
      }
      if(!resp){
        return { data: null, error: { message: String(lastNetworkError?.message || lastNetworkError || "Failed to fetch"), status: 0, base: usedBase } };
      }

      let text = "";
      try{
        text = await resp.text();
      }catch(e){
        return { data: null, error: { message: String(e?.message || e || "Failed to fetch"), status: 0 } };
      }

      let payload = null;
      try{ payload = text ? JSON.parse(text) : null; }catch(_){ payload = text; }
      if(!resp.ok){
        const err = (payload && typeof payload === "object")
          ? payload
          : { message: String(payload || resp.statusText || `HTTP ${resp.status}`) };
        if(!err.status) err.status = resp.status;
        if(!err.base) err.base = usedBase;
        return { data: null, error: err };
      }

      if(Array.isArray(payload)) return { data: payload, error: null };
      if(payload == null) return { data: [], error: null };
      return { data: [payload], error: null };
    }catch(e){
      return { data: null, error: { message: String(e?.message || e || "Failed to fetch"), status: 0 } };
    }
  }

  async function selectRowsByOwnerCompat(client, cfg){
    const table = String(cfg?.table || "").trim();
    if(!client?.from || !table) return { data: [], error: null, missingTable: false, denied: false };
    if(isRestBackoffActive()){
      const cachedErr = getRestBackoffError() || { message: "rest_backoff_active", status: 520 };
      return { data: [], error: cachedErr, missingTable: false, denied: false };
    }

    const select = cfg?.select || "*";
    const limit = Math.max(1, Number(cfg?.limit || 40));
    const ownerColumns = uniqueStrings(cfg?.ownerColumns || []);
    const ownerValues = uniqueStrings(cfg?.ownerValues || []);
    const orderColumns = Array.isArray(cfg?.orderColumns) ? cfg.orderColumns : ["created_at", null];
    const ascending = !!cfg?.ascending;

    if(ownerColumns.length < 1 || ownerValues.length < 1){
      return { data: [], error: null, missingTable: false, denied: false };
    }

    let sawEmptySuccess = false;
    let lastError = null;
    const maxAttempts = Math.max(1, Number(cfg?.maxAttempts || 8));
    let attempts = 0;

    outerValues:
    for(const ownerValue of ownerValues){
      for(const ownerCol of ownerColumns){
        for(const orderColRaw of orderColumns){
          if(attempts >= maxAttempts){
            break outerValues;
          }
          attempts += 1;
          const orderCol = orderColRaw ? String(orderColRaw).trim() : "";
          let restRes;
          try{
            restRes = await restSelectRowsByOwnerCompat(client, {
              table,
              select,
              ownerCol,
              ownerValue,
              orderCol,
              limit,
              ascending
            });
          }catch(fe){
            restRes = { data: null, error: fe || { message: "Failed to fetch", status: 0 } };
          }
          if(restRes?.error){
            const err = restRes.error;
            if(isMissingTableError(err)){
              return { data: [], error: null, missingTable: true, denied: false };
            }
            if(isPermissionDeniedError(err)){
              return { data: [], error: null, missingTable: false, denied: true };
            }
            if(isTransientRestError(err)){
              markRestBackoff(err);
              return { data: [], error: err, missingTable: false, denied: false };
            }
            if(orderCol && isMissingColumnError(err, orderCol)){
              lastError = err;
              continue;
            }
            if(
              isMissingColumnError(err, ownerCol) ||
              isQueryValueCompatError(err)
            ){
              lastError = err;
              break;
            }
            lastError = err;
            continue;
          }

          const rows = Array.isArray(restRes?.data) ? restRes.data : [];
          if(rows.length > 0){
            return { data: rows, error: null, missingTable: false, denied: false };
          }
          sawEmptySuccess = true;
          break;
        }
      }
    }

    if(sawEmptySuccess) return { data: [], error: null, missingTable: false, denied: false };
    return { data: [], error: lastError, missingTable: false, denied: false };
  }

  function setPublicacoesSelectMode(on, opts = {}){
    dpPubSelectMode = !!on;
    if(!dpPubSelectMode){
      dpPubSelectedIds.clear();
    }

    const grid = $("#dpGridPublicacoes");
    if(grid){
      grid.classList.toggle("dp-select-mode", dpPubSelectMode);
    }

    const btn = $("#dpSelectPublicacoesBtn");
    if(btn){
      btn.classList.toggle("is-active", dpPubSelectMode);
      btn.innerHTML = dpPubSelectMode
        ? `<i class='bx bx-x'></i> Cancelar`
        : `<i class='bx bx-check-square'></i> Selecionar`;
      btn.setAttribute("aria-pressed", dpPubSelectMode ? "true" : "false");
    }

    const bar = $("#dpPubSelectionBar");
    if(bar){
      bar.hidden = !dpPubSelectMode;
    }

    refreshPublicacoesSelectionUI();
    if(!opts.silent && !dpPubSelectMode){
      // Mantido sem toast para não poluir a navegação.
    }
  }

  function refreshPublicacoesSelectionUI(){
    const grid = $("#dpGridPublicacoes");
    if(grid){
      grid.classList.toggle("dp-select-mode", dpPubSelectMode);
      $$(".dp-item[data-pub-id]", grid).forEach((card)=>{
        const id = String(card.dataset.pubId || "");
        const isSelected = !!(id && dpPubSelectedIds.has(id));
        card.classList.toggle("dp-selected", isSelected);
        card.setAttribute("aria-pressed", isSelected ? "true" : "false");
      });
    }

    const count = dpPubSelectedIds.size;
    const total = dpPubVisibleIds.length;
    const countEl = $("#dpPubSelectionCount");
    const deleteBtn = $("#dpPubDeleteSelBtn");
    const allBtn = $("#dpPubSelectAllBtn");
    const clearBtn = $("#dpPubClearSelBtn");

    if(countEl){
      countEl.textContent = count === 1 ? "1 selecionada" : `${count} selecionadas`;
    }
    if(deleteBtn){
      deleteBtn.disabled = count < 1;
    }
    if(allBtn){
      allBtn.disabled = total < 1;
      allBtn.textContent = (total > 0 && count === total) ? "Desmarcar todas" : "Selecionar todas";
    }
    if(clearBtn){
      clearBtn.disabled = count < 1;
    }
  }

  function togglePublicacaoSelection(id){
    const key = String(id || "").trim();
    if(!key) return;
    if(dpPubSelectedIds.has(key)){
      dpPubSelectedIds.delete(key);
    }else{
      dpPubSelectedIds.add(key);
    }
    refreshPublicacoesSelectionUI();
  }

  async function deleteSelectedPublicacoes(){
    const ids = Array.from(dpPubSelectedIds).filter(Boolean);
    if(!ids.length){
      toast("Selecione ao menos uma publicação.");
      return;
    }
    if(!dpPubCtx?.client?.from || !dpPubCtx?.target?.id){
      toast("Recarregue a página e tente novamente.");
      return;
    }

    const plural = ids.length > 1;
    const confirmMsg = `Excluir ${ids.length} publica${plural ? "ções" : "ção"} selecionada${plural ? "s" : ""}?`;
    let confirmed = false;
    if (typeof window.dokeConfirm === "function") {
      try {
        confirmed = await window.dokeConfirm(confirmMsg, "Excluir publicações", "danger");
      } catch (_) {
        confirmed = false;
      }
    } else {
      confirmed = confirm(confirmMsg);
    }
    if(!confirmed){
      return;
    }

    const { error } = await dpPubCtx.client
      .from("publicacoes")
      .delete()
      .in("id", ids);

    if(error){
      console.error(error);
      toast("Erro ao excluir publicações.");
      return;
    }

    try {
      const keys = [
        "doke_cache_home_publicacoes_v4",
        "doke_cache_home_publicacoes_v3",
        "doke_cache_home_publicacoes_v2",
        "doke_cache_home_publicacoes_v1"
      ];
      keys.forEach((key) => localStorage.removeItem(key));
      localStorage.setItem("doke_publicacoes_feed_dirty", String(Date.now()));
    } catch (_) {}

    setPublicacoesSelectMode(false, { silent: true });
    toast(plural ? "Publicações excluídas." : "Publicação excluída.");
    await loadPublicacoes(dpPubCtx.client, dpPubCtx.target.id, dpPubCtx);
  }

  function ensurePublicacoesSelectionControls(ctx){
    const section = $('.dp-section[data-tab="publicações"]');
    const header = section ? $(".dp-sectionHeader", section) : null;
    const canEdit = !!ctx?.canEdit;

    const oldBtn = $("#dpSelectPublicacoesBtn");
    const oldBar = $("#dpPubSelectionBar");

    if(!canEdit || !section || !header){
      if(oldBtn) oldBtn.style.display = "none";
      if(oldBar) oldBar.hidden = true;
      setPublicacoesSelectMode(false, { silent: true });
      return;
    }

    const newBtn = $("#dpNewPublicacao", header);
    if(!newBtn) return;

    let selectBtn = $("#dpSelectPublicacoesBtn");
    if(!selectBtn){
      selectBtn = document.createElement("button");
      selectBtn.type = "button";
      selectBtn.id = "dpSelectPublicacoesBtn";
      selectBtn.className = "dp-newBtn dp-selectToggleBtn";
      newBtn.insertAdjacentElement("afterend", selectBtn);
    }
    selectBtn.style.display = "inline-flex";

    if(!selectBtn.dataset.bound){
      selectBtn.dataset.bound = "1";
      selectBtn.addEventListener("click", ()=>{
        setPublicacoesSelectMode(!dpPubSelectMode);
      });
    }

    let bar = $("#dpPubSelectionBar");
    if(!bar){
      bar = document.createElement("div");
      bar.id = "dpPubSelectionBar";
      bar.className = "dp-pubSelectionBar";
      bar.hidden = true;
      bar.innerHTML = `
        <span class="dp-pubSelectionCount" id="dpPubSelectionCount">0 selecionadas</span>
        <div class="dp-pubSelectionActions">
          <button type="button" id="dpPubSelectAllBtn">Selecionar todas</button>
          <button type="button" id="dpPubClearSelBtn">Limpar seleção</button>
          <button type="button" class="danger" id="dpPubDeleteSelBtn" disabled>Excluir selecionadas</button>
        </div>
      `;
      header.insertAdjacentElement("afterend", bar);
    }

    if(!bar.dataset.bound){
      bar.dataset.bound = "1";
      $("#dpPubSelectAllBtn", bar)?.addEventListener("click", ()=>{
        const total = dpPubVisibleIds.length;
        if(total < 1) return;
        if(dpPubSelectedIds.size === total){
          dpPubSelectedIds.clear();
        }else{
          dpPubSelectedIds = new Set(dpPubVisibleIds);
        }
        refreshPublicacoesSelectionUI();
      });
      $("#dpPubClearSelBtn", bar)?.addEventListener("click", ()=>{
        dpPubSelectedIds.clear();
        refreshPublicacoesSelectionUI();
      });
      $("#dpPubDeleteSelBtn", bar)?.addEventListener("click", deleteSelectedPublicacoes);
    }

    setPublicacoesSelectMode(dpPubSelectMode, { silent: true });
  }

  function setReelsSelectMode(on, opts = {}){
    dpReelSelectMode = !!on;
    if(!dpReelSelectMode){
      dpReelSelectedIds.clear();
    }

    const grid = $("#dpGridReels");
    if(grid){
      grid.classList.toggle("dp-select-mode", dpReelSelectMode);
    }

    const btn = $("#dpSelectReelsBtn");
    if(btn){
      btn.classList.toggle("is-active", dpReelSelectMode);
      btn.innerHTML = dpReelSelectMode
        ? `<i class='bx bx-x'></i> Cancelar`
        : `<i class='bx bx-check-square'></i> Selecionar`;
      btn.setAttribute("aria-pressed", dpReelSelectMode ? "true" : "false");
    }

    const bar = $("#dpReelSelectionBar");
    if(bar){
      bar.hidden = !dpReelSelectMode;
    }

    refreshReelsSelectionUI();
    if(!opts.silent && !dpReelSelectMode){
      // Sem toast para não poluir a navegação.
    }
  }

  function refreshReelsSelectionUI(){
    const grid = $("#dpGridReels");
    if(grid){
      grid.classList.toggle("dp-select-mode", dpReelSelectMode);
      $$(".dp-reelCard[data-reel-id]", grid).forEach((card)=>{
        const id = String(card.dataset.reelId || "");
        const isSelected = !!(id && dpReelSelectedIds.has(id));
        card.classList.toggle("dp-selected", isSelected);
        card.setAttribute("aria-pressed", isSelected ? "true" : "false");
      });
    }

    const count = dpReelSelectedIds.size;
    const total = dpReelVisibleIds.length;
    const countEl = $("#dpReelSelectionCount");
    const deleteBtn = $("#dpReelDeleteSelBtn");
    const allBtn = $("#dpReelSelectAllBtn");
    const clearBtn = $("#dpReelClearSelBtn");

    if(countEl){
      countEl.textContent = count === 1 ? "1 selecionado" : `${count} selecionados`;
    }
    if(deleteBtn){
      deleteBtn.disabled = count < 1;
    }
    if(allBtn){
      allBtn.disabled = total < 1;
      allBtn.textContent = (total > 0 && count === total) ? "Desmarcar todos" : "Selecionar todos";
    }
    if(clearBtn){
      clearBtn.disabled = count < 1;
    }
  }

  function toggleReelSelection(id){
    const key = String(id || "").trim();
    if(!key) return;
    if(dpReelSelectedIds.has(key)){
      dpReelSelectedIds.delete(key);
    }else{
      dpReelSelectedIds.add(key);
    }
    refreshReelsSelectionUI();
  }

  async function deleteSelectedReels(){
    const ids = Array.from(dpReelSelectedIds).filter(Boolean);
    if(!ids.length){
      toast("Selecione ao menos um vídeo curto.");
      return;
    }
    if(!dpReelCtx?.client?.from || !dpReelCtx?.target?.id){
      toast("Recarregue a página e tente novamente.");
      return;
    }
    const plural = ids.length > 1;
    if(!confirm(`Excluir ${ids.length} vídeo${plural ? "s" : ""} curto${plural ? "s" : ""} selecionado${plural ? "s" : ""}?`)){
      return;
    }
    const { error } = await dpReelCtx.client
      .from("videos_curtos")
      .delete()
      .in("id", ids);
    if(error){
      console.error(error);
      toast("Erro ao excluir vídeos curtos.");
      return;
    }

    setReelsSelectMode(false, { silent: true });
    toast(plural ? "Vídeos curtos excluídos." : "Vídeo curto excluído.");
    await loadReels(dpReelCtx.client, dpReelCtx.target.id, dpReelCtx);
  }

  function ensureReelsSelectionControls(ctx){
    const section = $('.dp-section[data-tab="reels"]');
    const header = section ? $(".dp-sectionHeader", section) : null;
    const canEdit = !!ctx?.canEdit;

    const oldBtn = $("#dpSelectReelsBtn");
    const oldBar = $("#dpReelSelectionBar");

    if(!canEdit || !section || !header){
      if(oldBtn) oldBtn.style.display = "none";
      if(oldBar) oldBar.hidden = true;
      setReelsSelectMode(false, { silent: true });
      return;
    }

    const newBtn = $("#dpNewReel", header);
    if(!newBtn) return;

    let selectBtn = $("#dpSelectReelsBtn");
    if(!selectBtn){
      selectBtn = document.createElement("button");
      selectBtn.type = "button";
      selectBtn.id = "dpSelectReelsBtn";
      selectBtn.className = "dp-newBtn dp-selectToggleBtn";
      newBtn.insertAdjacentElement("afterend", selectBtn);
    }
    selectBtn.style.display = "inline-flex";

    if(!selectBtn.dataset.bound){
      selectBtn.dataset.bound = "1";
      selectBtn.addEventListener("click", ()=>{
        setReelsSelectMode(!dpReelSelectMode);
      });
    }

    let bar = $("#dpReelSelectionBar");
    if(!bar){
      bar = document.createElement("div");
      bar.id = "dpReelSelectionBar";
      bar.className = "dp-pubSelectionBar dp-reelSelectionBar";
      bar.hidden = true;
      bar.innerHTML = `
        <span class="dp-pubSelectionCount" id="dpReelSelectionCount">0 selecionados</span>
        <div class="dp-pubSelectionActions">
          <button type="button" id="dpReelSelectAllBtn">Selecionar todos</button>
          <button type="button" id="dpReelClearSelBtn">Limpar seleção</button>
          <button type="button" class="danger" id="dpReelDeleteSelBtn" disabled>Excluir selecionados</button>
        </div>
      `;
      header.insertAdjacentElement("afterend", bar);
    }

    if(!bar.dataset.bound){
      bar.dataset.bound = "1";
      $("#dpReelSelectAllBtn", bar)?.addEventListener("click", ()=>{
        const total = dpReelVisibleIds.length;
        if(total < 1) return;
        if(dpReelSelectedIds.size === total){
          dpReelSelectedIds.clear();
        }else{
          dpReelSelectedIds = new Set(dpReelVisibleIds);
        }
        refreshReelsSelectionUI();
      });
      $("#dpReelClearSelBtn", bar)?.addEventListener("click", ()=>{
        dpReelSelectedIds.clear();
        refreshReelsSelectionUI();
      });
      $("#dpReelDeleteSelBtn", bar)?.addEventListener("click", deleteSelectedReels);
    }

    setReelsSelectMode(dpReelSelectMode, { silent: true });
  }

  function setServicosSelectMode(on, opts = {}){
    dpSvcSelectMode = !!on;
    if(!dpSvcSelectMode){
      dpSvcSelectedIds.clear();
    }

    const grid = $("#dpGridServicos");
    if(grid){
      grid.classList.toggle("dp-select-mode", dpSvcSelectMode);
    }

    const btn = $("#dpSelectServicosBtn");
    if(btn){
      btn.classList.toggle("is-active", dpSvcSelectMode);
      btn.innerHTML = dpSvcSelectMode
        ? `<i class='bx bx-x'></i> Cancelar`
        : `<i class='bx bx-check-square'></i> Selecionar`;
      btn.setAttribute("aria-pressed", dpSvcSelectMode ? "true" : "false");
    }

    const bar = $("#dpServSelectionBar");
    if(bar){
      bar.hidden = !dpSvcSelectMode;
    }

    refreshServicosSelectionUI();
    if(!opts.silent && !dpSvcSelectMode){
      // Sem toast para não poluir a navegação.
    }
  }

  function refreshServicosSelectionUI(){
    const grid = $("#dpGridServicos");
    if(grid){
      grid.classList.toggle("dp-select-mode", dpSvcSelectMode);
      $$(".dp-serviceSelectable[data-service-id]", grid).forEach((card)=>{
        const id = String(card.dataset.serviceId || "");
        const isSelected = !!(id && dpSvcSelectedIds.has(id));
        card.classList.toggle("dp-selected", isSelected);
        card.setAttribute("aria-pressed", isSelected ? "true" : "false");
      });
    }

    const count = dpSvcSelectedIds.size;
    const total = dpSvcVisibleIds.length;
    const countEl = $("#dpServSelectionCount");
    const editBtn = $("#dpServEditSelBtn");
    const allBtn = $("#dpServSelectAllBtn");
    const clearBtn = $("#dpServClearSelBtn");

    if(countEl){
      countEl.textContent = count === 1 ? "1 selecionado" : `${count} selecionados`;
    }
    if(editBtn){
      editBtn.disabled = count !== 1;
    }
    if(allBtn){
      allBtn.disabled = total < 1;
      allBtn.textContent = (total > 0 && count === total) ? "Desmarcar todos" : "Selecionar todos";
    }
    if(clearBtn){
      clearBtn.disabled = count < 1;
    }
  }

  function toggleServicoSelection(id){
    const key = String(id || "").trim();
    if(!key) return;
    if(dpSvcSelectedIds.has(key)){
      dpSvcSelectedIds.delete(key);
    }else{
      dpSvcSelectedIds.add(key);
    }
    refreshServicosSelectionUI();
  }

  function setServicosVisibleIds(ids){
    dpSvcVisibleIds = Array.from(new Set((Array.isArray(ids) ? ids : []).map((id)=> String(id || "").trim()).filter(Boolean)));
    dpSvcSelectedIds = new Set(Array.from(dpSvcSelectedIds).filter((id)=> dpSvcVisibleIds.includes(id)));
    refreshServicosSelectionUI();
  }

  function openSelectedServicoForEdit(){
    const ids = Array.from(dpSvcSelectedIds).filter(Boolean);
    if(ids.length !== 1){
      toast("Selecione exatamente 1 anúncio para editar.");
      return;
    }
    window.location.href = `anunciar.html?mode=edit&id=${encodeURIComponent(ids[0])}`;
  }

  function registerServicoSelectableCard(card, servicoId){
    if(!card) return;
    const id = String(servicoId || "").trim();
    if(!id) return;

    card.classList.add("dp-serviceSelectable");
    card.setAttribute("role", card.getAttribute("role") || "button");
    if(!card.hasAttribute("tabindex")) card.tabIndex = 0;
    card.dataset.serviceId = id;

    let marker = $(".dp-itemSelectMark", card);
    if(!marker){
      marker = document.createElement("span");
      marker.className = "dp-itemSelectMark";
      marker.innerHTML = `<i class='bx bx-check'></i>`;
      card.appendChild(marker);
    }

    if(!card.dataset.selectBound){
      card.dataset.selectBound = "1";
      card.addEventListener("click", (event)=>{
        if(!dpSvcSelectMode) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        toggleServicoSelection(id);
      }, true);
      card.addEventListener("keydown", (event)=>{
        if(!dpSvcSelectMode) return;
        if(event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggleServicoSelection(id);
      });
    }
  }

  function ensureServicosSelectionControls(ctx){
    dpSvcCtx = ctx || dpSvcCtx || null;
    const section = $('.dp-section[data-tab="servicos"]');
    const header = section ? $(".dp-sectionHeader", section) : null;
    const canEdit = !!ctx?.canEdit;

    const oldBtn = $("#dpSelectServicosBtn");
    const oldBar = $("#dpServSelectionBar");

    if(!canEdit || !section || !header){
      if(oldBtn) oldBtn.style.display = "none";
      if(oldBar) oldBar.hidden = true;
      setServicosSelectMode(false, { silent: true });
      return;
    }

    const newBtn = $("#dpNewServico", header);
    if(!newBtn) return;

    let selectBtn = $("#dpSelectServicosBtn");
    if(!selectBtn){
      selectBtn = document.createElement("button");
      selectBtn.type = "button";
      selectBtn.id = "dpSelectServicosBtn";
      selectBtn.className = "dp-newBtn dp-selectToggleBtn";
      newBtn.insertAdjacentElement("afterend", selectBtn);
    }
    selectBtn.style.display = "inline-flex";

    if(!selectBtn.dataset.bound){
      selectBtn.dataset.bound = "1";
      selectBtn.addEventListener("click", ()=>{
        setServicosSelectMode(!dpSvcSelectMode);
      });
    }

    let bar = $("#dpServSelectionBar");
    if(!bar){
      bar = document.createElement("div");
      bar.id = "dpServSelectionBar";
      bar.className = "dp-pubSelectionBar dp-servSelectionBar";
      bar.hidden = true;
      bar.innerHTML = `
        <span class="dp-pubSelectionCount" id="dpServSelectionCount">0 selecionados</span>
        <div class="dp-pubSelectionActions">
          <button type="button" id="dpServSelectAllBtn">Selecionar todos</button>
          <button type="button" id="dpServClearSelBtn">Limpar seleção</button>
          <button type="button" class="primary" id="dpServEditSelBtn" disabled>Editar anúncio selecionado</button>
        </div>
      `;
      header.insertAdjacentElement("afterend", bar);
    }

    if(!bar.dataset.bound){
      bar.dataset.bound = "1";
      $("#dpServSelectAllBtn", bar)?.addEventListener("click", ()=>{
        const total = dpSvcVisibleIds.length;
        if(total < 1) return;
        if(dpSvcSelectedIds.size === total){
          dpSvcSelectedIds.clear();
        }else{
          dpSvcSelectedIds = new Set(dpSvcVisibleIds);
        }
        refreshServicosSelectionUI();
      });
      $("#dpServClearSelBtn", bar)?.addEventListener("click", ()=>{
        dpSvcSelectedIds.clear();
        refreshServicosSelectionUI();
      });
      $("#dpServEditSelBtn", bar)?.addEventListener("click", openSelectedServicoForEdit);
    }

    setServicosSelectMode(dpSvcSelectMode, { silent: true });
  }

  try{
    window.dpEnsureServicosSelectionControls = ensureServicosSelectionControls;
    window.dpSetServicosVisibleIds = setServicosVisibleIds;
    window.dpRegisterServicoSelectableCard = registerServicoSelectableCard;
    window.dpRefreshServicosSelectionUI = refreshServicosSelectionUI;
    window.dpSetServicosSelectMode = setServicosSelectMode;
  }catch(_){}

  // -----------------------------
  // Sections loaders
  // -----------------------------
  async function loadPublicacoes(client, userId, ctx){
    if(dpPubLoadInFlight) return;
    dpPubLoadInFlight = true;
    try{
    dpPubCtx = ctx || null;
    ensurePublicacoesSelectionControls(ctx);
    const grid = $("#dpGridPublicacoes");
    if(!grid) return;
    if(isRestBackoffActive()){
      grid.innerHTML = `<div class="dp-empty">Servidor em recuperacao. Aguarde alguns segundos e recarregue.</div>`;
      return;
    }
    if(ctx?.sbRestDown){
      grid.innerHTML = `<div class="dp-empty">Supabase indisponível (erro 520/servidor offline). Abra <b>diagnostico.html</b> e verifique se o projeto Supabase está pausado.</div>`;
      return;
    }
    renderPerfilGridSkeleton(grid, "publicacoes");
    const queryResult = await selectRowsByOwnerCompat(client, {
      table: "publicacoes",
      select: "*",
      ownerColumns: ["user_id", "uid"],
      ownerValues: uniqueStrings([
        userId,
        ctx?.target?.id,
        ctx?.target?.uid
      ]),
      orderColumns: ["created_at", null],
      limit: 40,
      maxAttempts: 4
    });
    const data = queryResult.data || [];
    if(queryResult.error || queryResult.denied){
      dpPubVisibleIds = [];
      dpPubSelectedIds.clear();
      refreshPublicacoesSelectionUI();
      if(queryResult.error && isTransientRestError(queryResult.error)){
        markRestBackoff(queryResult.error);
        grid.innerHTML = `<div class="dp-empty">Supabase indisponivel no momento. Tente novamente em instantes.</div>`;
        try{ window.__DOKE_LAST_PUBLICACOES_ERROR__ = queryResult.error; }catch(_){}
        console.error("[DOKE] loadPublicacoes transient error:", queryResult.error);
        return;
      }
      if(queryResult.missingTable){
        grid.innerHTML = `<div class="dp-empty">Nenhuma publicação ainda.</div>`;
        return;
      }
      if(queryResult.denied){
        grid.innerHTML = `<div class="dp-empty">Publicações indisponiveis no momento.</div>`;
        return;
      }
      grid.innerHTML = `<div class="dp-empty">Erro ao carregar. Se você ainda não criou as tabelas do perfil, rode o arquivo <b>supabase_schema.sql</b>.</div>`;
      try{ window.__DOKE_LAST_PUBLICACOES_ERROR__ = queryResult.error; }catch(_){}
      console.error("[DOKE] loadPublicacoes error:", queryResult.error);
      return;
    }
    if(!data?.length){
      dpPubVisibleIds = [];
      dpPubSelectedIds.clear();
      refreshPublicacoesSelectionUI();
      grid.innerHTML = `<div class="dp-empty">Sem publicações ainda.</div>`;
      return;
    }
    dpPubVisibleIds = data.map((item)=> String(item?.id || "")).filter(Boolean);
    dpPubSelectedIds = new Set(Array.from(dpPubSelectedIds).filter((id)=> dpPubVisibleIds.includes(id)));
    grid.classList.remove("dp-grid--loading");
    grid.innerHTML = "";
    const canEdit = !!ctx?.canEdit;
    for(const item of data){
      const media = item.tipo === "video"
        ? `<video src="${item.media_url}"${item.thumb_url ? ` poster="${item.thumb_url}"` : ``} preload="metadata" muted playsinline></video>`
        : (item.tipo === "antes_depois" && item.thumb_url
            ? `<div class="dp-ba js-antes-depois" data-before="${item.media_url}" data-after="${item.thumb_url}"><img src="${item.media_url}" loading="lazy" alt=""></div>`
            : `<img src="${item.media_url}" loading="lazy" alt="">`);
      const card = document.createElement("div");
      card.className = "dp-item dp-item--clickable";
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      card.dataset.pubId = String(item.id || "");
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
          <b class="dp-itemTitle">${escapeHtml(title)}</b>
          ${desc ? `<p class="dp-itemDesc">${escapeHtml(desc)}</p>` : ``}
        </div>
      `;
      if(canEdit){
        const marker = document.createElement("span");
        marker.className = "dp-itemSelectMark";
        marker.innerHTML = `<i class='bx bx-check'></i>`;
        card.appendChild(marker);
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
        if(canEdit && dpPubSelectMode){
          togglePublicacaoSelection(item.id);
          return;
        }
        openModal();
      });
      card.addEventListener("keydown", (event)=>{
        if(event.key === "Enter" || event.key === " "){
          event.preventDefault();
          if(canEdit && dpPubSelectMode){
            togglePublicacaoSelection(item.id);
            return;
          }
          openModal();
        }
      });
      grid.appendChild(card);
    }
    refreshPublicacoesSelectionUI();
    } finally {
      dpPubLoadInFlight = false;
    }
  }

    async function loadReels(client, userId, ctx){
    dpReelCtx = ctx || dpReelCtx || null;
    ensureReelsSelectionControls(ctx || dpReelCtx || null);
    const grid = $("#dpGridReels");
    if(!grid) return;
    renderPerfilGridSkeleton(grid, "reels");
    const queryResult = await selectRowsByOwnerCompat(client, {
      table: "videos_curtos",
      select: "*",
      ownerColumns: ["user_id", "userId", "uid", "user_uid", "userUid", "usuario_id", "autorUid", "owner_id"],
      ownerValues: getOwnerQueryValues(ctx, userId),
      orderColumns: ["created_at", "data", "createdAt", "createdat", null],
      limit: 40,
      maxAttempts: 10
    });
    const data = queryResult.data || [];
    if(queryResult.error || queryResult.denied){
      dpReelVisibleIds = [];
      dpReelSelectedIds.clear();
      refreshReelsSelectionUI();
      if(queryResult.error && isTransientRestError(queryResult.error)){
        grid.innerHTML = `<div class="dp-empty">Videos curtos indisponiveis agora (erro de rede/servidor).</div>`;
        console.error("[DOKE] loadReels transient error:", queryResult.error);
        return;
      }
      if(queryResult.missingTable){
        grid.innerHTML = `<div class="dp-empty">Nenhum Video curto ainda.</div>`;
        return;
      }
      if(queryResult.denied){
        grid.innerHTML = `<div class="dp-empty">Videos curtos indisponiveis no momento.</div>`;
        return;
      }
      grid.innerHTML = `<div class="dp-empty">Erro ao carregar. Se você ainda não criou as tabelas do perfil, rode o arquivo <b>supabase_schema.sql</b>.</div>`;
      console.error(queryResult.error);
      return;
    }
    if(!data?.length){
      dpReelVisibleIds = [];
      dpReelSelectedIds.clear();
      refreshReelsSelectionUI();
      grid.innerHTML = `<div class="dp-empty">Sem videos curtos ainda.</div>`;
      return;
    }
    const canEdit = !!(ctx?.canEdit);
    dpReelVisibleIds = data.map((item)=> String(item?.id || "")).filter(Boolean);
    dpReelSelectedIds = new Set(Array.from(dpReelSelectedIds).filter((id)=> dpReelVisibleIds.includes(id)));
    grid.classList.remove("dp-grid--loading");
    grid.innerHTML = "";
    for(const item of data){
      const card = document.createElement("div");
      card.className = "dp-reelCard dp-item dp-item--clickable";
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      card.dataset.reelId = String(item.id || "");
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
      if(canEdit){
        const marker = document.createElement("span");
        marker.className = "dp-itemSelectMark";
        marker.innerHTML = `<i class='bx bx-check'></i>`;
        card.appendChild(marker);
      }
      const openReel = () => {
        window.location.href = `feed.html?start=sb-${item.id}`;
      };
      card.addEventListener("click", (event) => {
        event.preventDefault();
        if(canEdit && dpReelSelectMode){
          toggleReelSelection(item.id);
          return;
        }
        openReel();
      });
      card.addEventListener("keydown", (event) => {
        if(event.key === "Enter" || event.key === " "){
          event.preventDefault();
          if(canEdit && dpReelSelectMode){
            toggleReelSelection(item.id);
            return;
          }
          openReel();
        }
      });
      if (window.playReelPreview && window.stopReelPreview) {
        card.addEventListener("mouseenter", () => window.playReelPreview(card));
        card.addEventListener("mouseleave", () => window.stopReelPreview(card));
      }
      grid.appendChild(card);
    }
    refreshReelsSelectionUI();
  }

  async function loadPortfolio(client, profId, ctx){
    const grid = $("#dpGridPortfolio");
    if(!grid) return;
    renderPerfilGridSkeleton(grid, "portfolio");
    const queryResult = await selectRowsByOwnerCompat(client, {
      table: "portfolio",
      select: "*",
      ownerColumns: ["profissional_id", "profissionalId", "profId", "prof_uid", "profUid", "uid", "user_id"],
      ownerValues: getOwnerQueryValues(ctx, profId),
      orderColumns: ["created_at", "data", "createdAt", "createdat", null],
      limit: 40,
      maxAttempts: 10
    });
    const data = queryResult.data || [];
    if(queryResult.error || queryResult.denied){
      if(queryResult.error && isTransientRestError(queryResult.error)){
        grid.innerHTML = `<div class="dp-empty">Portfolio indisponivel agora (erro de rede/servidor).</div>`;
        console.error("[DOKE] loadPortfolio transient error:", queryResult.error);
        return;
      }
      if(queryResult.missingTable){
        grid.innerHTML = `<div class="dp-empty">Portfolio vazio.</div>`;
        return;
      }
      if(queryResult.denied){
        grid.innerHTML = `<div class="dp-empty">Portfolio indisponivel no momento.</div>`;
        return;
      }
      grid.innerHTML = `<div class="dp-empty">Erro ao carregar. Se você ainda não criou as tabelas do perfil, rode o arquivo <b>supabase_schema.sql</b>.</div>`;
      console.error(queryResult.error);
      return;
    }
    if(!data?.length){
      grid.innerHTML = `<div class="dp-empty">Sem itens no portfolio ainda.</div>`;
      return;
    }
    const ensureGalleryModal = () => {
      if (document.getElementById("modalGaleria")) return;
      const html = `
      <div class="galeria-overlay" id="modalGaleria" onclick="fecharGaleria(event)" style="display:none;">
        <button class="btn-fechar-galeria" onclick="fecharGaleria(event)">x</button>
        <button class="btn-nav-esquerda" onclick="mudarImagem(-1); event.stopPropagation();">&lt;</button>
        <div class="galeria-conteudo"><img id="imgExpandida" src="" alt="Imagem expandida"></div>
        <button class="btn-nav-direita" onclick="mudarImagem(1); event.stopPropagation();">&gt;</button>
        <div class="galeria-thumbnails" id="areaThumbnails"></div>
      </div>`;
      document.body.insertAdjacentHTML("beforeend", html);
    };

    grid.classList.remove("dp-grid--loading");
    grid.innerHTML = "";
    for(const item of data){
      const mediaUrl = String(item.media_url || "").trim();
      const isVideo = /\.(mp4|webm|ogg|mov|m4v)$/i.test(mediaUrl);
      const media = isVideo
        ? `<video src="${escapeHtml(mediaUrl)}" preload="metadata" muted playsinline></video>`
        : `<img src="${escapeHtml(mediaUrl)}" alt="Item do portfolio" loading="lazy" decoding="async">`;
      const card = document.createElement("div");
      card.className = "dp-item dp-item--clickable";
      card.setAttribute("role", "button");
      card.tabIndex = 0;
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
      const openMedia = () => {
        if(!mediaUrl) return;
        if (!isVideo) {
          ensureGalleryModal();
          if (
            typeof window.abrirGaleria === "function" &&
            document.getElementById("modalGaleria") &&
            document.getElementById("imgExpandida") &&
            document.getElementById("areaThumbnails")
          ) {
            window.abrirGaleria([mediaUrl], 0);
            return;
          }
          window.open(mediaUrl, "_blank", "noopener,noreferrer");
          return;
        }
        const modal = document.getElementById("modalPlayerVideo");
        const player = document.getElementById("playerPrincipal");
        if (modal && player) {
          player.src = mediaUrl;
          modal.style.display = "flex";
          if (typeof window.updateScrollLock === "function") window.updateScrollLock();
          const p = player.play?.();
          if (p && typeof p.catch === "function") p.catch(() => {});
          return;
        }
        window.open(mediaUrl, "_blank", "noopener,noreferrer");
      };
      card.addEventListener("click", (event) => {
        event.preventDefault();
        openMedia();
      });
      card.addEventListener("keydown", (event) => {
        if(event.key === "Enter" || event.key === " "){
          event.preventDefault();
          openMedia();
        }
      });
      grid.appendChild(card);
    }
  }

  async function loadServicos(client, profId, ctx){
    const grid = $("#dpGridServicos");
    if(!grid) return;
    if (typeof renderPerfilGridSkeleton === "function") {
      renderPerfilGridSkeleton(grid, "servicos");
    } else {
      grid.innerHTML = `<div class="dp-empty">Carregando serviços...</div>`;
    }
    const queryResult = await selectRowsByOwnerCompat(client, {
      table: "servicos",
      select: "*",
      ownerColumns: ["profissional_id", "profissionalId", "profId", "prof_uid", "profUid", "uid", "user_id"],
      ownerValues: getOwnerQueryValues(ctx, profId),
      orderColumns: ["created_at", "data", "createdAt", "createdat", null],
      limit: 50,
      maxAttempts: 10
    });
    const data = queryResult.data || [];
    if(queryResult.error || queryResult.denied){
      const countEl = document.getElementById("dpServicesCount");
      if (countEl) countEl.textContent = "0";
      if(queryResult.error && isTransientRestError(queryResult.error)){
        grid.innerHTML = `<div class="dp-empty">Servicos indisponiveis agora (erro de rede/servidor).</div>`;
        console.error("[DOKE] loadServicos transient error:", queryResult.error);
        return;
      }
      if(queryResult.missingTable){
        grid.innerHTML = `<div class="dp-empty">Nenhum serviço cadastrado.</div>`;
        return;
      }
      if(queryResult.denied){
        grid.innerHTML = `<div class="dp-empty">Servicos indisponiveis no momento.</div>`;
        return;
      }
      grid.innerHTML = `<div class="dp-empty">Erro ao carregar. Se você ainda não criou as tabelas do perfil, rode o arquivo <b>supabase_schema.sql</b>.</div>`;
      console.error(queryResult.error);
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
    grid.classList.remove("dp-grid--loading");
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
    renderPerfilBoxSkeleton(box);
    const profId = (typeof prof === "object" && prof) ? (prof.id || prof.profissional_id || prof.profissionalId) : prof;
    const profUid = (typeof prof === "object" && prof) ? (prof.uid || prof.user_uid || prof.auth_uid || prof.authUid) : null;

    const filters = [];
    const pushFilter = (col, val)=>{
      const c = String(col || "").trim();
      const v = String(val || "").trim();
      if(!c || !v) return;
      if(filters.some((f)=> f.col === c && f.val === v)) return;
      filters.push({ col: c, val: v });
    };
    if(profId) pushFilter("profissional_id", profId);
    if(profUid) pushFilter("profissional_id", profUid);
    const ownerValues = uniqueStrings(filters.map((f)=> f.val));
    const queryResult = await selectRowsByOwnerCompat(client, {
      table: "avaliacoes",
      select: "*",
      ownerColumns: ["profissional_id", "profissionalId", "profissional_uid", "profissionalUid", "uid", "user_id"],
      ownerValues,
      orderColumns: ["created_at", null],
      limit: 80,
      maxAttempts: 10
    });
    let data = queryResult.data || [];

    if(queryResult.error || queryResult.denied){
      if(queryResult.missingTable){
        box.innerHTML = `<div class="dp-empty">Nenhuma avaliação. Se você ainda não criou as tabelas do perfil, rode o arquivo <b>supabase_schema.sql</b>.</div>`;
        return;
      }
      if(queryResult.denied){
        data = [];
      }else if(queryResult.error && isTransientRestError(queryResult.error)){
        const countEl = document.getElementById("dpReviews");
        if (countEl) countEl.textContent = "0";
        box.innerHTML = `<div class="dp-empty">Avaliacoes indisponiveis no momento (erro de rede/servidor).</div>`;
        console.error(queryResult.error);
        return;
      }else if(queryResult.error){
        console.error(queryResult.error);
        box.innerHTML = `<div class="dp-empty">Erro ao carregar avaliações.</div>`;
        const countEl = document.getElementById("dpReviews");
        if (countEl) countEl.textContent = "0";
        return;
      }
    }

    if(!Array.isArray(data)){
      const countEl = document.getElementById("dpReviews");
      if (countEl) countEl.textContent = "0";
      box.innerHTML = `<div class="dp-empty">Erro ao carregar avaliações.</div>`;
      return;
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
            .select("id,titulo,categoria,preço,descrição,img,fotos")
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

    const getScore = (a)=> Number(a.media ?? a.nota ?? 0) || 0;
    const classifySentiment = (a)=>{
      const score = getScore(a);
      if(score >= 4) return "positive";
      if(score <= 2) return "negative";
      return "neutral";
    };
    const filterBySentiment = (rows, sentiment)=>{
      if(sentiment === "positive") return rows.filter(a=> classifySentiment(a) === "positive");
      if(sentiment === "negative") return rows.filter(a=> classifySentiment(a) === "negative");
      return rows;
    };
    const sentimentCount = (rows, sentiment)=>{
      if(sentiment === "positive") return rows.filter(a=> classifySentiment(a) === "positive").length;
      if(sentiment === "negative") return rows.filter(a=> classifySentiment(a) === "negative").length;
      return rows.length;
    };
    const buildSentimentBar = (rows, activeSentiment)=>{
      const allCount = sentimentCount(rows, "all");
      const positiveCount = sentimentCount(rows, "positive");
      const negativeCount = sentimentCount(rows, "negative");
      const toneBtn = (id, label, count)=>{
        const active = activeSentiment === id ? "active" : "";
        return `<button class="fr-sentiment-chip ${active}" type="button" data-sentiment="${id}">${label} (${count})</button>`;
      };
      return `
        <div class="fr-sentiment-bar">
          ${toneBtn("all","Todas", allCount)}
          ${toneBtn("positive","Positivas", positiveCount)}
          ${toneBtn("negative","Negativas", negativeCount)}
        </div>`;
    };
    const reviewFilterState = { service: "all", sentiment: "all" };

    const bindFilter = ()=>{
      box.querySelectorAll(".fr-servico-card").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          reviewFilterState.service = btn.getAttribute("data-servico") || "all";
          renderAvaliacoes(reviewFilterState.service, reviewFilterState.sentiment);
        });
      });
      box.querySelectorAll(".fr-sentiment-chip").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          reviewFilterState.sentiment = btn.getAttribute("data-sentiment") || "all";
          renderAvaliacoes(reviewFilterState.service, reviewFilterState.sentiment);
        });
      });
    };

      const renderAvaliacoes = (activeId="all", activeSentiment="all")=>{
        const baseData = (activeId === "all") ? allData : allData.filter(a=>String(a.__anuncioId) === String(activeId));
        data = filterBySentiment(baseData, activeSentiment);
        const filterHtml = `${buildFilterBar(activeId)}${buildSentimentBar(baseData, activeSentiment)}`;
        if(!data || !data.length){
          box.innerHTML = `${filterHtml}<div class="dp-empty">Sem avaliações para este filtro.</div>`;
          bindFilter();
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
            <button class="fr-nav-btn" data-dir="-1" aria-label="Anterior">â€¹</button>
            <button class="fr-nav-btn" data-dir="1" aria-label="Próximo">â€º</button>
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

  renderAvaliacoes(reviewFilterState.service, reviewFilterState.sentiment);
  }

  // -----------------------------
  // Create items
  // -----------------------------
  async function createPublicacao(client, ctx, { tipo, titulo, legenda, file, afterFile, capaFile }){
    // upload to storage
    const storageId = ctx.authUser?.id || ctx.me?.uid || ctx.me?.id;
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
    const storageId = ctx.authUser?.id || ctx.me?.uid || ctx.me?.id;
    let thumbUrl = null;
    if(capaFile){
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
    const storageId = ctx.authUser?.id || ctx.me?.uid || ctx.me?.id;
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
  // hotfix UX: esconder toggle de disponibilidade para ganhar espaço no mobile
  const __dpAvailRow = document.getElementById('dpAvailabilityRow');
  if (__dpAvailRow) __dpAvailRow.remove();
  return;

    const row = $("#dpAvailabilityRow");
    const sw = $("#dpSwitch");
    const text = $("#dpStatusText");
    if(!row || !sw || !text) return;

    if(!ctx.canEdit || !isProfissionalUsuario(ctx.target)){
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
    const storageId = ctx.authUser?.id || ctx.me?.uid || ctx.me?.id;

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
    const USER_CHANGE_COOLDOWN_DAYS = 15;
    const USER_CHANGE_COOLDOWN_MS = USER_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    const currentUser = safeStr(u.user || "").replace(/^@/, "").trim().toLowerCase();
    const profileStats = (stats && typeof stats === "object" && stats.profile && typeof stats.profile === "object")
      ? stats.profile
      : {};
    const lastUserChangeRaw = safeStr(
      profileStats.userChangedAt ||
      profileStats.user_changed_at ||
      u.userChangedAt ||
      u.user_changed_at
    );
    const lastUserChangeTs = lastUserChangeRaw ? Date.parse(lastUserChangeRaw) : NaN;
    const hasUserChangeDate = Number.isFinite(lastUserChangeTs);
    const nextUserChangeTs = hasUserChangeDate ? (lastUserChangeTs + USER_CHANGE_COOLDOWN_MS) : 0;
    const canChangeUserNow = !hasUserChangeDate || Date.now() >= nextUserChangeTs;
    const fmtDateBR = (ts) => {
      try { return new Date(ts).toLocaleDateString("pt-BR"); } catch (_) { return ""; }
    };

    modal.open("Editar perfil", `
      <div class="dp-form">
        <div>
          <label>Nome</label>
          <input class="dp-input" id="dpEditNome" maxlength="40" value="${escapeHtml(u.nome || "")}" />
        </div>
        <div class="dp-row2">
          <div>
            <label>@usu&aacute;rio</label>
            <input class="dp-input" id="dpEditUser" maxlength="20" value="${escapeHtml(u.user || "")}" />
            <div class="dp-fieldHint" id="dpEditUserHint">O @usu&aacute;rio pode ser alterado a cada 15 dias.</div>
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
          <textarea class="dp-textarea" id="dpEditSobre" placeholder="Escreva algo sobre voc&ecirc;...">${escapeHtml(about)}</textarea>
        </div>
      </div>
    `, async ()=>{
      const client = mustSupa();
      if(!client) return;
      const inputUser = $("#dpEditUser");
      const userCandidate = safeStr(inputUser?.value).replace(/^@/,"").trim().toLowerCase();
      const userChanged = userCandidate !== currentUser;

      if(userCandidate && !/^[a-z0-9._]{3,20}$/.test(userCandidate)){
        toast("@usu\u00E1rio inv\u00E1lido. Use 3-20 caracteres: letras, n\u00FAmeros, ponto ou underline.");
        return;
      }
      if(userChanged && !canChangeUserNow){
        const msLeft = Math.max(0, nextUserChangeTs - Date.now());
        const daysLeft = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
        const nextDateLabel = fmtDateBR(nextUserChangeTs);
        toast(`Voc\u00EA poder\u00E1 alterar o @usu\u00E1rio em ${daysLeft} dia(s)${nextDateLabel ? ` (a partir de ${nextDateLabel})` : ""}.`);
        return;
      }

      const patch = {
        nome: safeStr($("#dpEditNome")?.value).slice(0, 40),
        user: userCandidate.slice(0, 20),
        local: safeStr($("#dpEditLocal")?.value),
        bio: safeStr($("#dpEditBio")?.value),
      };
      if(!patch.nome || patch.nome.length < 2){
        toast("Nome inv\u00E1lido. Use pelo menos 2 caracteres.");
        return;
      }
      const { error } = await updateUsuario(client, ctx.me.id, patch);
      if(error){
        console.error(error);
        toast("Sem permiss\u00E3o para salvar.");
        return;
      }
      const aboutNext = safeStr($("#dpEditSobre")?.value);
      const statsPatch = { about: aboutNext };
      if(userChanged){
        statsPatch.profile = { ...profileStats, userChangedAt: new Date().toISOString() };
      }
      const { error: statsErr, stats: nextStats } = await patchStats(client, ctx.me.id, stats, statsPatch);
      if(statsErr){
        console.error(statsErr);
        toast("Sobre n\u00E3o foi salvo.");
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

    const hintEl = $("#dpEditUserHint");
    if(hintEl){
      if(canChangeUserNow){
        hintEl.textContent = "Voc\u00EA pode alterar o @usu\u00E1rio agora. Depois da troca, s\u00F3 poder\u00E1 mudar novamente em 15 dias.";
      }else{
        const nextDateLabel = fmtDateBR(nextUserChangeTs);
        hintEl.textContent = `@usu\u00E1rio s\u00F3 pode ser alterado a cada 15 dias.${nextDateLabel ? ` Pr\u00F3xima altera\u00E7\u00E3o: ${nextDateLabel}.` : ""}`;
      }
    }
  }

  function initTabs(ctx){
    const buttons = $$(".dp-tab");
    const sections = $$(".dp-section[data-tab]");
    const tabsWrap = $(".dp-tabs");
    const prevNav = $(".dp-tabsPrev");
    const nextNav = $(".dp-tabsNext");
    const tabsHost = tabsWrap ? (tabsWrap.closest(".dp-tabsWrap") || tabsWrap) : null;
    let sectionsWrap = $(".dp-sections");

    const isProOwnerTabs = !!(isProfissionalUsuario(ctx?.target) && ctx?.canEdit);
    // Esconde aba/section de estatísticas para quem não é o dono profissional
    buttons.forEach(b=>{ if(b.hasAttribute("data-pro-owner-only") && !isProOwnerTabs) b.style.display = "none"; });
    sections.forEach(s=>{ if(s.hasAttribute("data-pro-owner-only") && !isProOwnerTabs) s.style.display = "none"; });

    let updateTabsHint = ()=>{};
    const enableTabsOverflowHint = true;
    if(tabsWrap && enableTabsOverflowHint){
      const shouldUseHint = ()=>{
        if(!(prevNav && nextNav)) return true;
        const prevVisible = prevNav.offsetParent !== null;
        const nextVisible = nextNav.offsetParent !== null;
        return !(prevVisible && nextVisible);
      };
      if(tabsHost){
        tabsHost.classList.add("dp-tabsHost");
      }
      let hintBtn = tabsHost ? $(".dp-tabsOverflowHint", tabsHost) : null;
      if(!hintBtn && tabsHost){
        hintBtn = document.createElement("button");
        hintBtn.type = "button";
        hintBtn.className = "dp-tabsOverflowHint";
        hintBtn.setAttribute("aria-label", "Ver mais abas");
        hintBtn.innerHTML = `<i class='bx bx-chevron-right'></i>`;
        hintBtn.hidden = true;
        hintBtn.addEventListener("click", ()=>{
          tabsWrap.scrollBy({ left: Math.max(140, Math.round(tabsWrap.clientWidth * 0.6)), behavior: "smooth" });
        });
        tabsHost.appendChild(hintBtn);
      }
      updateTabsHint = ()=>{
        if(!hintBtn) return;
        if(!shouldUseHint()){
          hintBtn.hidden = true;
          return;
        }
        const maxScroll = Math.max(0, tabsWrap.scrollWidth - tabsWrap.clientWidth);
        const showRight = maxScroll > 8 && tabsWrap.scrollLeft < (maxScroll - 2);
        hintBtn.hidden = !showRight;
      };
    }

    if(tabsWrap && prevNav && nextNav){
      const scrollAmount = () => Math.max(140, Math.round(tabsWrap.clientWidth * 0.6));
      const updateNav = () => {
        const maxScroll = tabsWrap.scrollWidth - tabsWrap.clientWidth;
        prevNav.disabled = tabsWrap.scrollLeft <= 0;
        nextNav.disabled = tabsWrap.scrollLeft >= maxScroll - 1;
        prevNav.style.visibility = "visible";
        nextNav.style.visibility = "visible";
        updateTabsHint();
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
    }else if(tabsWrap){
      tabsWrap.addEventListener("scroll", updateTabsHint, { passive: true });
      window.addEventListener("resize", updateTabsHint);
      updateTabsHint();
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
      if(tab !== "publicacoes" && dpPubSelectMode){
        setPublicacoesSelectMode(false, { silent: true });
      }
      if(tab !== "reels" && dpReelSelectMode){
        setReelsSelectMode(false, { silent: true });
      }
      if(tab !== "servicos" && dpSvcSelectMode){
        setServicosSelectMode(false, { silent: true });
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
      if(tab === "publicacoes"){
        ensurePublicacoesSelectionControls(ctx);
        loadPublicacoes(ctx.client, ctx.target.id, ctx);
      }
      if(tab === "reels"){
        ensureReelsSelectionControls(ctx);
        loadReels(ctx.client, ctx.target.id, ctx);
      }
      if(tab === "servicos"){
        ensureServicosSelectionControls(ctx);
        loadServicosPerfil(ctx);
      }
      if(tab === "portfolio") loadPortfolio(ctx.client, ctx.target.id, ctx);
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

  function isNetworkOrCorsError(err){
    const msg = String(err?.message || err || "").toLowerCase();
    const code = String(err?.code || "").toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("network request failed") ||
      msg.includes("load failed") ||
      msg.includes("cors") ||
      code.includes("err_failed")
    );
  }

  async function detectColumn(client, table, candidates){
    if(!client || !client.from) return null;
    for(const col of (candidates||[])){
      if(!col) continue;
      try{
        const res = await client.from(table).select(col).limit(1);
        if(res?.error){
          const status = Number(res.error?.status || res.error?.statusCode || 0);
          const code = String(res.error?.code || "").toUpperCase();
          if(isNetworkOrCorsError(res.error)) return null;
          if(isMissingTableError(res.error)) return null;
          if(isMissingColumnError(res.error, col)) continue;
          if (status === 401 || status === 403) return col;
          if (
            status === 400 || status === 404 ||
            code === "42703" || // undefined_column
            code === "42P01" || // undefined_table
            code === "PGRST100" || // parse
            code === "PGRST204" // schema cache miss
          ) continue;
          // RLS / outra falha: assume que a coluna existe
          return col;
        }
        return col;
      }catch(e){
        if(isNetworkOrCorsError(e)) return null;
        const status = Number(e?.status || e?.statusCode || 0);
        if (status === 400 || status === 404) continue;
        // tenta próxima somente para erro de coluna ausente/schema heterogêneo
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
        <div class="dp-funnelArrow">â†’</div>
        <div class="dp-funnelStep dp-funnelStep--clicks">
          <b>${formatCompact(c)}</b>
          <div class="dp-subtle">Cliques • ${cRate === null ? "—" : pct(cRate)}</div>
        </div>
        <div class="dp-funnelArrow">â†’</div>
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

  function aiReply(text){
    const t = String(text||"").toLowerCase();
    if(t.includes("titulo") || t.includes("descri")){
      return [
        "Ideias rápidas:",
        "• Título: benefício + urgência (ex: 'Encanador hoje — orçamento grátis')",
        "• Descrição: 1) o que você faz, 2) região atendida, 3) garantia, 4) como chamar",
        "• Use 3–5 fotos reais, e 1 antes/depois quando possível."
      ].join("\n");
    }
    if(t.includes("avali") || t.includes("segu")){
      return [
        "Para ganhar mais avaliações e seguidores:",
        "• Ao finalizar o serviço, peça avaliação com 1 clique (link direto no chat).",
        "• Poste antes/depois e marque 'trabalho concluído'.",
        "• Responda rápido: isso aumenta rank e confiança."
      ].join("\n");
    }
    if(t.includes("perfil") || t.includes("confian")){
      return [
        "Checklist de confiança no perfil:",
        "• Foto nítida + capa com sua área (ex: 'Elétrica / 24h').",
        "• Bio curta com diferencial (garantia, tempo, região).",
        "• 3 trabalhos no portfólio + 1 antes/depois.",
        "• Preço/forma de cobrança clara (a combinar / por hora)."
      ].join("\n");
    }
    // default
    return [
      "Sugestões para vender mais:",
      "• Ajuste o título para 'serviço + cidade + benefício'.",
      "• Coloque fotos reais (antes/depois) e uma prova social (avaliações).",
      "• Responda em menos de 15 min e ofereça orçamento rápido.",
      "Se quiser, me diga seu serviço e bairro/cidade que eu te dou 5 títulos prontos."
    ].join("\n");
  }

  function appendMsg(wrap, who, text){
    if(!wrap) return;
    const div = document.createElement("div");
    div.className = `dp-aiMsg ${who}`;
    const pre = document.createElement("pre");
    pre.textContent = text;
    div.appendChild(pre);
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
  }

    function initAiChat(ctx){
    const card = document.getElementById("dpAiCard") || document.querySelector(".dp-aiCard");
    const toggle = document.getElementById("dpAiToggle");

    const wrap = document.getElementById("dpAiMsgs");
    const input = document.getElementById("dpAiInput");
    const send = document.getElementById("dpAiSend");
    if(!wrap || !input || !send) return;

    // esconder/mostrar
    if(card && toggle && !toggle.dataset.bound){
      toggle.dataset.bound = "1";
      const key = "doke_ai_collapsed";
      const apply = (collapsed)=>{
        card.classList.toggle("dp-aiCollapsed", !!collapsed);
        toggle.innerHTML = collapsed ? '<i class="bx bx-chevron-up"></i>' : '<i class="bx bx-chevron-down"></i>';
        toggle.setAttribute("aria-label", collapsed ? "Mostrar DOKE-AI" : "Ocultar DOKE-AI");
      };
      apply(localStorage.getItem(key) === "1");
      toggle.addEventListener("click", ()=>{
        const next = !card.classList.contains("dp-aiCollapsed");
        apply(next);
        localStorage.setItem(key, next ? "1" : "0");
      });
    }

    // seed welcome
    if(!wrap.dataset.inited){
      wrap.dataset.inited = "1";
      appendMsg(wrap, "bot", "Oi! Eu sou o DOKE-AI (BETA). Posso sugerir melhorias para anúncios e perfil (layout de demonstração).");
      appendMsg(wrap, "bot", "Exemplos: 'melhorar título', 'como conseguir avaliações', 'o que falta no meu perfil'.");
    }

    const doSend = (q)=>{
      const txt = String(q || input.value || "").trim();
      if(!txt) return;
      appendMsg(wrap, "user", txt);
      input.value = "";
      // typing
      const typing = document.createElement("div");
      typing.className = "dp-aiMsg bot dp-aiTyping";
      typing.innerHTML = "<span></span><span></span><span></span>";
      wrap.appendChild(typing);
      wrap.scrollTop = wrap.scrollHeight;

      setTimeout(()=>{
        typing.remove();
        appendMsg(wrap, "bot", aiReply(txt));
      }, 550);
    };

    send.onclick = ()=> doSend();
    input.addEventListener("keydown", (e)=>{
      if(e.key === "Enter"){ e.preventDefault(); doSend(); }
    });

    document.querySelectorAll(".dp-aiChip").forEach(btn=>{
      btn.addEventListener("click", ()=> doSend(btn.dataset.q || btn.textContent));
    });
  }

    async function initProDashboard(ctx){
    // somente profissional DONO
    const isProOwner = !!(isProfissionalUsuario(ctx?.target) && ctx?.canEdit);
    if(!isProOwner){
      toast("Área restrita ao profissional.");
      return;
    }


    initAiChat(ctx);

    const rangeSel = document.getElementById("dpAnalyticsRange");
    const refreshBtn = document.getElementById("dpAnalyticsRefresh");
    const chart = document.getElementById("dpChartViews");
    const kpiRow = document.getElementById("dpKpiRow");
    const cats = document.getElementById("dpTopCats");
    const funnel = document.getElementById("dpFunnel");
    const subtitle = document.getElementById("dpChartSubtitle");
if(!rangeSel || !refreshBtn) return;

    const setBusy = (on)=>{
      if(on){
        refreshBtn.disabled = true;
        refreshBtn.classList.add("dp-busy");
      }else{
        refreshBtn.disabled = false;
        refreshBtn.classList.remove("dp-busy");
      }
    };

    const render = async ()=>{
      const days = parseInt(rangeSel.value || "14", 10) || 14;
      if(subtitle) subtitle.textContent = `Últimos ${days} dias`;

      setBusy(true);
      try{
        const stats = await loadProAnalytics(ctx, days);

        // Série: pedidos e mensagens no período
        drawLineChart(chart, stats.seriesPedidos || [], stats.seriesMsgs || []);

        renderKpis(kpiRow, stats);

        // Categorias (pondera por views/clicks quando houver)
        const catsData = (stats.cats || []).map(c=>({ k: c.label, v: c.value }));
        renderBars(cats, catsData);

        // Funil simples: impressões â†’ cliques â†’ orçamentos
        renderFunnel(funnel, safeNum(stats?.funnel?.impressions), safeNum(stats?.funnel?.clicks), safeNum(stats?.funnel?.leads));
}catch(e){
        console.warn("[DOKE] Falha ao carregar estatísticas:", e);
        toast("Não foi possível carregar estatísticas agora.");
      }finally{
        setBusy(false);
      }
    };

    if(!__dpDashInited){
      __dpDashInited = true;
      refreshBtn.addEventListener("click", render);
      rangeSel.addEventListener("change", render);
    }

    await render();
  }

  function initStatsNav(){
    const prev = $(".dp-statsPrev");
    const next = $(".dp-statsNext");
    if(prev) prev.style.display = "none";
    if(next) next.style.display = "none";
  }

  // -----------------------------
  // Section actions
  // -----------------------------
  function initSectionActions(ctx){
    ensurePublicacoesSelectionControls(ctx);
    ensureReelsSelectionControls(ctx);
    ensureServicosSelectionControls(ctx);
    // Novo Publicação
    $("#dpNewPublicacao")?.addEventListener("click", ()=>{
      if(!ctx.canEdit) return toast("Apenas no seu perfil.");
      modal.open("Nova publicação", `
        <div class="dp-form">
          <div class="dp-row2">
            <div>
              <label>Tipo</label>
              <select class="dp-select" id="dpPubTipo">
                <option value="foto">Foto</option>
                <option value="video">Vídeo</option>
                <option value="curto">Video curto</option>
                <option value="antes_depois">Antes x Depois</option>
              </select>
            </div>
            <div>
              <label>Arquivo</label>
              <input class="dp-input" type="file" id="dpPubFile" accept="image/*,video/*"/>
            <div id="dpPubAfterRow" style="display:none; margin-top:10px;">
              <label>Foto do Depois</label>
              <input class="dp-input" type="file" id="dpPubAfterFile" accept="image/*"/>
            </div>
            </div>
          </div>
          <div id="dpPubCoverRow" style="display:none;">
            <label>Capa do video (opcional)</label>
            <input class="dp-input" type="file" id="dpPubCover" accept="image/*"/>
          </div>
          <div>
            <label>Título</label>
            <input class="dp-input" id="dpPubTitulo" placeholder="Ex: Antes e depois" />
          </div>
          <div>
            <label>Descrição</label>
            <textarea class="dp-textarea" id="dpPubDesc" placeholder="Conte o que foi feito..."></textarea>
          </div>
        </div>
      `, async ()=>{
        const client = mustSupa();
        if(!client) return;
        const tipo = $("#dpPubTipo")?.value || "foto";
        const file = $("#dpPubFile")?.files?.[0];
        const capaFile = $("#dpPubCover")?.files?.[0] || null;
        const afterFile = $("#dpPubAfterFile")?.files?.[0] || null;
        if(!file) return toast("Selecione um arquivo.");
        if((tipo === "antes_depois") && !afterFile) return toast("Selecione a foto do Depois.");
        try{
          if(tipo === "curto"){
            if(!isProfissionalUsuario(ctx.me)) return toast("Disponível para perfil profissional.");
            await createReel(client, ctx, {
              titulo: safeStr($("#dpPubTitulo")?.value),
              descricao: safeStr($("#dpPubDesc")?.value),
              file,
              capaFile
            });
            modal.close();
            toast("Video curto publicado!");
            loadReels(ctx.client, ctx.target.id, ctx);
            return;
          }
          await createPublicacao(client, ctx, {
            tipo,
            titulo: safeStr($("#dpPubTitulo")?.value),
            legenda: safeStr($("#dpPubDesc")?.value),
            file,
            afterFile: tipo === "antes_depois" ? afterFile : null,
            capaFile: tipo === "video" ? capaFile : null
          });
          modal.close();
          toast("Publicado!");
          loadPublicacoes(ctx.client, ctx.target.id, ctx);
        }catch(e){
          console.error(e);
          toast("Erro ao publicar.");
        }
      }, { saveLabel: "Publicar", savingLabel: "Publicando..." });

      const tipoEl = $("#dpPubTipo");
      const coverRow = $("#dpPubCoverRow");
      const coverInput = $("#dpPubCover");
      const afterRow = $("#dpPubAfterRow");
      const afterInput = $("#dpPubAfterFile");
      const fileInput = $("#dpPubFile");
      const updateCover = ()=>{
        const tipo = (tipoEl?.value || "foto");
        const showCover = (tipo === "video" || tipo === "curto");
        if(coverRow) coverRow.style.display = showCover ? "" : "none";
        if(!showCover && coverInput) coverInput.value = "";
        // Antes x Depois: precisa de 2 imagens
        const showAfter = (tipo === "antes_depois");
        if(afterRow) afterRow.style.display = showAfter ? "" : "none";
        if(!showAfter && afterInput) afterInput.value = "";
        if(fileInput){
          fileInput.accept = showAfter ? "image/*" : "image/*,video/*";
        }
      };
      tipoEl?.addEventListener("change", updateCover);
      updateCover();
    });

    // Novo Reel
    $("#dpNewReel")?.addEventListener("click", ()=>{
      if(!ctx.canEdit) return toast("Apenas no seu perfil.");
      if(!isProfissionalUsuario(ctx.me)) return toast("Disponível para perfil profissional.");
      modal.open("Novo video curto", `
        <div class="dp-form">
          <div>
            <label>Arquivo (vídeo)</label>
            <input class="dp-input" type="file" id="dpReelFile" accept="video/*"/>
          </div>
          <div>
            <label>Capa do video (opcional)</label>
            <input class="dp-input" type="file" id="dpReelCover" accept="image/*"/>
          </div>
          <div>
            <label>Título</label>
            <input class="dp-input" id="dpReelTitulo" placeholder="Ex: Reparo em 30s" />
          </div>
          <div>
            <label>Descrição</label>
            <textarea class="dp-textarea" id="dpReelDesc"></textarea>
          </div>
        </div>
      `, async ()=>{
        const client = mustSupa();
        if(!client) return;
        const file = $("#dpReelFile")?.files?.[0];
        const capaFile = $("#dpReelCover")?.files?.[0] || null;
        if(!file) return toast("Selecione um vídeo.");
        try{
          await createReel(client, ctx, {
            titulo: safeStr($("#dpReelTitulo")?.value),
            descricao: safeStr($("#dpReelDesc")?.value),
            file,
            capaFile
          });
          modal.close();
          toast("Video curto publicado!");
          loadReels(ctx.client, ctx.target.id, ctx);
        }catch(e){
          console.error(e);
          toast("Erro ao publicar.");
        }
      }, { saveLabel: "Publicar", savingLabel: "Publicando..." });
    });

    // Novo Serviço (anúncio)
    $("#dpNewServico")?.addEventListener("click", ()=>{
      if(!ctx.canEdit) return toast("Apenas no seu perfil.");
      if(!isProfissionalUsuario(ctx.me)){
        window.location.href = "tornar-profissional.html";
        return;
      }
      window.location.href = "anunciar.html";
    });

    // Avaliar (cliente no perfil profissional)
    $("#dpWriteAvaliacao")?.addEventListener("click", ()=>{
      if(!ctx.me?.id) return toast("Faça login para avaliar.");
      if(ctx.canEdit) return toast("Você não pode se avaliar.");
      modal.open("Avaliar profissional", `
        <div class="dp-form">
          <div>
            <label>Nota</label>
            <select class="dp-select" id="dpAvalNota">
              <option value="5">â˜…â˜…â˜…â˜…â˜… (5)</option>
              <option value="4">â˜…â˜…â˜…â˜…â˜† (4)</option>
              <option value="3">â˜…â˜…â˜…â˜†â˜† (3)</option>
              <option value="2">â˜…â˜…â˜†â˜†â˜† (2)</option>
              <option value="1">â˜…â˜†â˜†â˜†â˜† (1)</option>
            </select>
          </div>
          <div>
            <label>Comentário</label>
            <textarea class="dp-textarea" id="dpAvalMsg" placeholder="Conte como foi o serviço..."></textarea>
          </div>
        </div>
      `, async ()=>{
        const client = mustSupa();
        if(!client) return;
        try{
          await createAvaliacao(client, ctx, {
            profissionalId: ctx.target.id,
            nota: $("#dpAvalNota")?.value || 5,
            comentario: safeStr($("#dpAvalMsg")?.value)
          });
          modal.close();
          toast("Avaliação enviada!");
          loadAvaliacoes(ctx.client, ctx.target);
        }catch(e){
          console.error(e);
          toast("Erro ao enviar avaliação.");
        }
      });
    });

    // Editar perfil
    $("#dpEditBtn")?.addEventListener("click", ()=>{
      if(!ctx.canEdit) return toast("Apenas no seu perfil.");
      openEditProfile(ctx);
    });

    // 3 pontos
    $("#dpMoreBtn")?.addEventListener("click", (e)=>{
      e.preventDefault();
      openDropdown(e.currentTarget, ctx);
    });

    // Solicitar Orçamento (para visitante)
    $("#dpOrcBtn")?.addEventListener("click", ()=>{
      const id = ctx.target?.id || "";
      window.location.href = `orçamento.html?prof=${encodeURIComponent(id)}`;
    });

    // Amizade (para visitante)
    updateFriendButton(ctx);
    $("#dpFriendBtn")?.addEventListener("click", async ()=>{
      await handleFriendAction(ctx);
    });

    // Seguir (para visitante)
    updateFollowButton(ctx);
    $("#dpFollowBtn")?.addEventListener("click", async ()=>{
      await handleFollowAction(ctx);
    });
  }

  // -----------------------------
  // Render header
  // -----------------------------
  function renderHeader(ctx){
    const u = ctx.target;
    ensureTheme(ctx, roleFromUsuario(u) === "profissional" ? "profissional" : "cliente");

    // avatar / cover
    const stats = parseStats(u);
    const coverUrl = stats?.media?.cover_url || u.capa_url || u.capa || null;
    const avatarUrl = u.foto_url || u.foto || stats?.media?.avatar_url || null;

    const lsCover = (ctx.canEdit ? LS.get(`doke_profile_cover_${ctx.targetId}`, null) : null);
    const lsAvatar = (ctx.canEdit ? LS.get(`doke_profile_avatar_${ctx.targetId}`, null) : null);

    setCover(lsCover || coverUrl);
    setAvatar(lsAvatar || avatarUrl, (u.nome||"U")[0]);

    setText("#dpName", u.nome || "Usuário");
    setText("#dpHandle", (u.user || "usuario"));

    const bio = u.bio || (isProfissionalUsuario(u) ? "Profissional na Doke." : "Olá! Sou novo na comunidade Doke.");
    setText("#dpBio", bio);
    const aboutText = stats?.about || u.sobre || "";
    const aboutFallback = "As informações do perfil aparecem aqui. (Bio, local e tempo de membro são editáveis no botão \"Editar perfil\".)";
    setText("#dpAboutText", aboutText || aboutFallback);

    // chips
    const local = u.local || "Brasil";
    const membro = u.membroDesde ? `Membro desde ${fmtDateShort(u.membroDesde)}` : `Membro desde ${fmtDateShort(u.created_at)}`;
    setHTML("#dpChips", `
      <span class="dp-chip"> <span>${escapeHtml(local)}</span></span>
      <span class="dp-chip"> <span>${escapeHtml(membro)}</span></span>
    `);

    // stats (placeholder; você pode ligar com tabelas de seguidores etc depois)
    setText("#dpFollowers", (u.stats?.followers_count || 0).toString());
    setText("#dpFollowing", (u.stats?.following_count || 0).toString());
    setText("#dpReviews", "0");
    setText("#dpServicesCount", "0");

    // buttons visibility
    const isPro = isProfissionalUsuario(u);
    showIf("[data-pro-only]", isPro);
    hideIf("[data-pro-hide]", isPro);
    // elementos somente para PROFISSIONAL DONO (dashboard)
    const isProOwner = !!(isPro && ctx.canEdit);
    $$("[data-pro-owner-only]").forEach(el => { el.style.display = isProOwner ? "" : "none"; });

    // actions for visitor
    const isOwner = isOwnProfile(ctx);
    const rootEl = $("#dpRoot");
    if(rootEl){
      rootEl.setAttribute("data-owner", isOwner ? "self" : "visitor");
    }
    const allowEdit = !!(isOwner && ctx.pageMode !== "public");
    showIf("#dpOrcBtn", !isOwner && isPro);
    showIf("#dpFriendBtn", !isOwner);
    showIf("#dpFollowBtn", !isOwner);
    if(isOwner) showIf("#dpMessageBtn", false);
    hideIf("#dpEditBtn", !allowEdit);
    showIf("#dpBecomeProBtn", !!(allowEdit && !isPro));
    showIf("#dpMoreBtn", allowEdit);
    showIf("#dpCoverBtn", allowEdit);
    showIf("#dpAvatarBtn", allowEdit);
    showIf("#dpAvailabilityRow", allowEdit);
    showIf("#dpNewPublicacao", allowEdit);
    showIf("#dpSelectPublicacoesBtn", allowEdit);
    showIf("#dpSelectReelsBtn", allowEdit);
    showIf("#dpSelectServicosBtn", allowEdit);
    showIf("#dpNewServico", allowEdit);
    showIf("#dpNewPortfolio", allowEdit);
    showIf("#dpNewReel", allowEdit);
    if(!allowEdit){
      setPublicacoesSelectMode(false, { silent: true });
      setReelsSelectMode(false, { silent: true });
      setServicosSelectMode(false, { silent: true });
    }
    if(rootEl){
      rootEl.setAttribute("data-has-orc", (!isOwner && isPro) ? "1" : "0");
    }
    const orcBtn = $("#dpOrcBtn");
    if (orcBtn && !isOwner && isPro) {
      orcBtn.classList.remove("dp-icon-only");
      orcBtn.innerHTML = "<i class='bx bx-receipt'></i> Solicitar orçamento";
      orcBtn.title = "Solicitar orçamento";
      orcBtn.setAttribute("aria-label", "Solicitar orçamento");
    }

    const becomeBtn = $("#dpBecomeProBtn");
    if (becomeBtn) {
      becomeBtn.onclick = ()=>{ window.location.href = "tornar-profissional.html"; };
    }
    // availability
    initAvailability(ctx);
  }

  async function updateAvaliacoesCountQuick(ctx){
    const countEl = $("#dpReviews");
    if(!countEl) return;
    const client = ctx?.client;
    if(!client?.from) return;
    if(ctx?.sbRestDown){
      countEl.textContent = "0";
      return;
    }
    const prof = ctx?.target || null;
    const profId = (typeof prof === "object" && prof) ? (prof.id || prof.profissional_id || prof.profissionalId) : prof;
    const profUid = (typeof prof === "object" && prof) ? (prof.uid || prof.user_uid || prof.auth_uid || prof.authUid) : null;

    const filters = [];
    const pushFilter = (col, val)=>{
      const c = String(col || "").trim();
      const v = String(val || "").trim();
      if(!c || !v) return;
      if(filters.some((f)=> f.col === c && f.val === v)) return;
      filters.push({ col: c, val: v });
    };
    if(profId) pushFilter("profissional_id", profId);
    if(profUid) pushFilter("profissional_id", profUid);
    const ownerValues = uniqueStrings(filters.map((f)=> f.val));
    const queryResult = await selectRowsByOwnerCompat(client, {
      table: "avaliacoes",
      select: "id",
      ownerColumns: ["profissional_id", "profissionalId", "profissional_uid", "profissionalUid", "uid", "user_id"],
      ownerValues,
      orderColumns: [null],
      limit: 200,
      maxAttempts: 10
    });
    if(queryResult.error){
      if(isTransientRestError(queryResult.error)){
        markRestBackoff(queryResult.error);
      }else{
        console.error(queryResult.error);
      }
      countEl.textContent = "0";
      return;
    }
    const rows = Array.isArray(queryResult.data) ? queryResult.data : [];
    countEl.textContent = String(rows.length || 0);
  }

  async function updateServicosCountQuick(ctx){
    const countEl = $("#dpServicesCount");
    if(!countEl) return;
    if(ctx?.sbRestDown){
      countEl.textContent = "0";
      return;
    }
    const target = ctx?.target || {};
    const donoUid = target.uid || target.id || ctx?.targetId;
    if(!donoUid) return;

    try{
      if(window.db && typeof window.query === "function" && typeof window.getDocs === "function" && typeof window.collection === "function" && typeof window.where === "function"){
        const q = query(collection(window.db, "anuncios"), where("uid", "==", donoUid));
        const snap = await getDocs(q);
        countEl.textContent = String(snap.size || 0);
        return;
      }
    }catch(e){
      console.warn("Falha ao contar servicos via Firestore:", e);
    }

    const client = ctx?.client;
    if(!client?.from) return;

    const ownerValues = getOwnerQueryValues(ctx, donoUid);
    const columns = ["profissional_id", "profissionalId", "profId", "prof_uid", "profUid", "uid", "user_id"];
    const maxAttempts = 12;
    let attempts = 0;

    for(const val of ownerValues){
      for(const col of columns){
        if(attempts >= maxAttempts){
          countEl.textContent = "0";
          return;
        }
        attempts += 1;
        const res = await client
          .from("servicos")
          .select("id", { count: "exact", head: true })
          .eq(col, val);

        if(res.error){
          if(isMissingTableError(res.error)){
            countEl.textContent = "0";
            return;
          }
          if(
            isMissingColumnError(res.error, col) ||
            isQueryValueCompatError(res.error) ||
            isPermissionDeniedError(res.error)
          ){
            continue;
          }
          if(isTransientRestError(res.error)){
            markRestBackoff(res.error);
            countEl.textContent = "0";
            return;
          }
          continue;
        }
        if(typeof res.count === "number"){
          countEl.textContent = String(res.count);
          return;
        }
        countEl.textContent = "0";
        return;
      }
    }
    countEl.textContent = "0";
  }

  async function updateProfileCounts(ctx){
    await Promise.allSettled([
      updateServicosCountQuick(ctx),
      updateAvaliacoesCountQuick(ctx),
      updateFollowCounts(ctx)
    ]);
  }

  // -----------------------------
  // Main init
  // -----------------------------
  async function init(){
    const rootEl = $("#dpRoot");
    // Mostra feedback de carregamento e garante que não fica "branco"
    rootEl?.classList.add("dp-loading");
    try{
      $$(".dp-section[data-tab]").forEach((section)=>{
        const isPublicacoes = String(section.dataset.tab || "").toLowerCase() === "publicacoes";
        section.style.display = isPublicacoes ? "" : "none";
        section.classList.toggle("dp-section--hidden", !isPublicacoes);
        section.setAttribute("aria-hidden", isPublicacoes ? "false" : "true");
      });
      const pubGrid = $("#dpGridPublicacoes");
      if(pubGrid && typeof renderPerfilGridSkeleton === "function"){
        renderPerfilGridSkeleton(pubGrid, "publicacoes");
      }
    }catch(_){}

    try{
      const client = mustSupa();

      // Fallback visual quando Supabase não está configurado
      if(!client){
        $("#dpName") && ($("#dpName").textContent = "Perfil");
        $("#dpHandle") && ($("#dpHandle").textContent = "@usuario");
        $("#dpBio") && ($("#dpBio").textContent = "Configure o Supabase em supabase-init.js para carregar os dados do seu perfil.");
        $("#dpAboutText") && ($("#dpAboutText").textContent = "Dica: Abra supabase-init.js e cole o Project URL e a ANON PUBLIC KEY. Depois recarregue a página.");

        // Esconde ações que dependem de login/dados
        ["#dpCoverBtn","#dpAvatarBtn","#dpEditBtn","#dpMoreBtn","#dpAvailabilityRow",
         "#dpNewPublicacao","#dpNewServico","#dpNewPortfolio","#dpNewReel","#dpWriteAvaliacao"
        ].forEach(sel => { const el = $(sel); if(el) el.style.display = "none"; });

        // Esconde abas PRO
        $$("[data-pro-only]").forEach(el => el.style.display = "none");

        return;
      }

      const root = rootEl;
      const file = (location.pathname.split("/").pop() || "").toLowerCase();
      const selfPages = new Set(["meuperfil.html"]);
      const declaredMode = String(root?.dataset?.mode || "").toLowerCase();
      let pageMode = selfPages.has(file) ? "self" : (declaredMode || "public"); // self | public
      const pageTheme = root?.dataset?.theme || "cliente"; // cliente|profissional (visual)

      // Evita flicker suave
      root?.classList.remove("dp-ready");
      await sleep(20);

      // Session (optional on public pages)
      const sess = await getSessionUser(client);
      const authUser = sess.user;

      let me = null;
      let meLoadError = null;
      if(authUser){
        const r = await getUsuarioByAuthUid(client, authUser.id);
        if(r.error){
          if(!isNetworkFetchError(r.error)) console.error(r.error);
          meLoadError = r.error;
        }
        me = r.usuario || null;
      }

      // target
      const params = new URLSearchParams(location.search);
      const targetIdParam = params.get("id");
      const targetUidParam = params.get("uid");
      const targetUserParam = params.get("user");
      const hasExplicitTarget = !!(targetIdParam || targetUidParam || (targetUserParam && String(targetUserParam).trim()));
      if (file === "meuperfil.html") {
        pageMode = "self";
      } else if (hasExplicitTarget) {
        pageMode = "public";
      } else if (file === "perfil-usuário.html") {
        pageMode = "self";
      }
      if(root && root.dataset){
        root.dataset.mode = pageMode;
      }
      let targetId = null;

      if(targetIdParam){
        targetId = targetIdParam;
      } else if(targetUidParam){
        targetId = targetUidParam;
      } else if(targetUserParam){
        // Busca por username (aceita com ou sem @)
        const raw = String(targetUserParam || "");
        const clean = raw.startsWith("@") ? raw.slice(1) : raw;
        let uRes = await getUsuarioByUsername(client, clean);
        if(!uRes.usuario && raw.startsWith("@")){
          uRes = await getUsuarioByUsername(client, raw);
        }
        if(uRes.error){
          console.error(uRes.error);
          toast("Erro ao buscar usuário por username.");
          return;
        }
        const usuario = uRes.usuario;
        if(!usuario){
          toast("Usuário não encontrado.");
          return;
        }
        targetId = usuario.id;
      } else {
        targetId = me?.id || me?.uid || authUser?.id || null;
      }
      if(pageMode === "self" && !me){
        if (authUser) {
          // Sessão existe, mas a linha em public.usuários pode não estar legível (RLS/Policy SELECT).
          // Para não cair em loop pedindo login, usa cache local como fallback.
          let cached = null;
          try { cached = JSON.parse(localStorage.getItem("doke_usuario_perfil") || "null"); } catch(_){ cached = null; }
          const emailNick = authUser.email ? String(authUser.email).split("@")[0] : "usuario";
          const cachedId = normalizeIdentity(cached?.id || cached?.profile_id || cached?.usuario_id);
          me = {
            id: cachedId || authUser.id,
            uid: authUser.id,
            nome: cached?.nome || authUser.user_metadata?.nome || authUser.user_metadata?.name || emailNick || "Usuário",
            user: cached?.user || authUser.user_metadata?.user || authUser.user_metadata?.username || emailNick,
            foto: cached?.foto || authUser.user_metadata?.avatar_url || authUser.user_metadata?.foto || null,
            tipo: cached?.tipo || authUser.user_metadata?.tipo || "usuario"
          };
          if(!targetId) targetId = me.id || authUser.id;
        } else {
          window.location.replace("login.html");
          return;
        }
      }

      if(!targetId){
        toast("Perfil não encontrado.");
        return;
      }

      // Health check rápido: 520 geralmente é Cloudflare/origem indisponível.
      // Ajuda a diferenciar "sem policy" de "Supabase offline".
      let health = null;
      try{ health = await (window.dokeSupabaseHealth ? window.dokeSupabaseHealth(2500) : null); }catch(_e){ health = null; }
      const restDown = !!(health && (health.restStatus === 520 || health.restOk === false));
      let tRes = { usuario: null, error: null };
      if(!restDown){
        tRes = await getUsuarioById(client, targetId);
      }
      let target = tRes.usuario || null;
      if(restDown && pageMode === "self"){
        target = me || target;
        if(target){
          toast("Supabase indisponível (520/erro de rede). Exibindo perfil do cache local.");
        }
      }
      const meKey = normalizeIdentity(me?.id || me?.uid);
      const tKey = normalizeIdentity(targetId);
      const isSelfTarget = (pageMode === "self") && !!meKey && (meKey === tKey);
      if(tRes.error){
        if(!isNetworkFetchError(tRes.error)) console.error(tRes.error);
        if (isSelfTarget && me) {
          // Mesmo se o banco estiver fora, não derruba a sessão nem força login.
          target = me;
          const msg = String(tRes.error?.message || tRes.error || '');
          const isFetchFail = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('timeout');
          const is520 = (health && health.restStatus === 520);
          if(is520 || isFetchFail){
            toast("Supabase indisponível (520/erro de rede). Exibindo perfil do cache local.");
          }else{
            toast("Sem permissão de leitura no banco (policy SELECT). Exibindo perfil do cache local.");
          }
        } else {
          toast("Erro ao carregar perfil.");
          return;
        }
      }

      if(!target){
        if(isSelfTarget && me){
          target = me;
        }else{
        toast("Usuário não encontrado.");
        return;
        }
      }

      const canEdit = !!(me && sameIdentity(me, target));

      const ctx = {
        client,
        authUser,
        me,
        target,
        targetId: target.id || target.uid || targetId,
        canEdit,
        pageTheme,
        pageMode,
        sbHealth: health,
        sbRestDown: !!(health && (health.restStatus === 520 || health.restOk === false))
      };
      if(root && root.dataset){
        root.dataset.owner = isOwnProfile(ctx) ? "self" : "visitor";
      }
      // Top button (Entrar/Perfil)
      const topBtn = document.getElementById("dpTopAuthBtn");
      if(topBtn){
        if(me){
          topBtn.textContent = "Perfil";
          topBtn.href = isProfissionalUsuario(me) ? "meuperfil.html" : "perfil-usuário.html";
        }else{
          topBtn.textContent = "Entrar";
          topBtn.href = "login.html";
        }
      }

      // Render (cada etapa protegida para não travar a UI)
      try{ renderHeader(ctx); }catch(e){ console.error(e); }
      try{
        placeProfileActionsForMobile();
        bindMobileActionsPlacement();
      }catch(e){ console.error(e); }
      // Liga contadores reais por padrão; só desliga se definido explicitamente como false.
      const enableLiveCounts = window.DOKE_PROFILE_LIVE_COUNTS !== false;
      if(enableLiveCounts){
        updateProfileCounts(ctx).catch(e=>console.error(e));
      }else{
        setText("#dpFollowers", "0");
        setText("#dpFollowing", "0");
        setText("#dpReviews", "0");
      }
      try{ initMedia(ctx); }catch(e){ console.error(e); }
      try{ initTabs(ctx); }catch(e){ console.error(e); }
      try{ initStatsNav(); }catch(e){ console.error(e); }
      try{ initSectionActions(ctx); }catch(e){ console.error(e); }

      // show write review only for public professional + logged in and not owner
      const showWrite = !!(pageMode === "public" && roleFromUsuario(target) === "profissional" && me && me.id !== target.id);
      showIf("#dpWriteAvaliacao", showWrite);

    }catch(err){
      console.error(err);
      toast("Falha ao renderizar o perfil.");
      $("#dpName") && ($("#dpName").textContent = "Perfil");
      $("#dpBio") && ($("#dpBio").textContent = "Ocorreu um erro ao carregar. Abra o console (F12) para ver detalhes.");
    }finally{
      rootEl?.classList.remove("dp-loading");
      rootEl?.classList.add("dp-ready");
    }
  }

  document.addEventListener("DOMContentLoaded", init);

})();

async function loadServicosPerfil(ctx) {
  const grid = document.getElementById("dpGridServicos");
  if (!grid) return;

  try { window.dpEnsureServicosSelectionControls && window.dpEnsureServicosSelectionControls(ctx); } catch (_) {}

  // tenta manter o mesmo visual do feed do index
  try { grid.classList.add("lista-cards-premium"); } catch (_) {}

  if (typeof window.renderPerfilGridSkeleton === "function") {
    window.renderPerfilGridSkeleton(grid, "servicos");
  } else {
    grid.innerHTML = `<div class="dp-empty">Carregando serviços...</div>`;
  }

  // fallback simples (caso o builder do index não exista)
  const fallbackCard = (anuncio) => {
    const card = document.createElement("div");
    card.className = "card-premium";
    const titulo = anuncio.titulo || "Sem titulo";
    const descricao = anuncio.descricao || "";
    const preco = anuncio.preco || "A combinar";
    const fotos = Array.isArray(anuncio.fotos) ? anuncio.fotos : (anuncio.fotos ? [anuncio.fotos] : []);
    const img = fotos[0] || anuncio.img || "https://placehold.co/600x400";
    const uid = anuncio.uid || anuncio.user_uid || anuncio.useruid || anuncio.prof_uid || "";
    card.innerHTML = `
      <button class="btn-topo-avaliacao" onclick="window.openDetalhesModal('detalhes.html?id=${anuncio.id}')">
        <i class='bx bx-info-circle'></i> Mais Informacoes
      </button>
      <div class="cp-body">
        <h3 class="cp-titulo">${titulo}</h3>
        <p class="cp-desc-clean">${descricao}</p>
      </div>
      <div class="grid-fotos-doke" style="grid-template-columns: 1fr;">
        <div class="foto-main" style="grid-column: 1; grid-row: 1/3;">
          <img src="${img}" class="img-cover">
        </div>
      </div>
      <div class="cp-footer-right">
        <div style="margin-right:auto;">
          <small style="display:block; color:#999; font-size:0.7rem;">A partir de</small>
          <strong style="color:var(--cor0); font-size:1.1rem;">${preco}</strong>
        </div>
        <button class="btn-solicitar" onclick="window.location.href='orçamento.html?uid=${uid}&aid=${anuncio.id}'">Solicitar orçamento</button>
      </div>
    `;
    return card;
  };

  const client = ctx && ctx.client;
  const donoUid = (ctx && ctx.target && ctx.target.uid) ? ctx.target.uid : (ctx && ctx.targetUid) ? ctx.targetUid : (ctx && ctx.targetId) ? ctx.targetId : null;

  if (!client || !client.from || !donoUid) {
    try { window.dpSetServicosVisibleIds && window.dpSetServicosVisibleIds([]); } catch (_) {}
    grid.innerHTML = `<div class="dp-empty">Não foi possível carregar os serviços.</div>`;
    return;
  }

  try {
    const { data, error } = await client
      .from("anuncios")
      .select("*")
      .eq("uid", donoUid)
      .limit(200);

    if (error) {
      console.error("Erro ao carregar serviços:", error);
      try { window.dpSetServicosVisibleIds && window.dpSetServicosVisibleIds([]); } catch (_) {}
      grid.innerHTML = `<div class="dp-empty">Erro ao carregar serviços.</div>`;
      return;
    }

    const anuncios = Array.isArray(data) ? data : [];

    // contador (se existir)
    const countEl = document.getElementById("dpServicesCount");
    if (countEl) countEl.textContent = String(anuncios.length || 0);

    if (!anuncios.length) {
      try { window.dpSetServicosVisibleIds && window.dpSetServicosVisibleIds([]); } catch (_) {}
      grid.innerHTML = `<div class="dp-empty">Nenhum serviço publicado.</div>`;
      return;
    }

    // cache p/ gerenciador (se existir)
    try { window.__dpCachedAnuncios = anuncios.slice(); } catch (_) {}

    // Público: não mostra desativados
    const listaParaRender = (ctx && ctx.canEdit)
      ? anuncios
      : anuncios.filter(a => {
          if (!a) return false;
          // cobre variações comuns de "ativo"
          if (a.ativo === false) return false;
          if (a.active === false) return false;
          if (a.isActive === false) return false;
          return true;
        });
    if (!listaParaRender.length) {
      try { window.dpSetServicosVisibleIds && window.dpSetServicosVisibleIds([]); } catch (_) {}
      grid.innerHTML = `<div class="dp-empty">Nenhum serviço disponível no momento.</div>`;
      return;
    }
    try {
      const visibleIds = listaParaRender.map((a) => String(a?.id || "")).filter(Boolean);
      window.dpSetServicosVisibleIds && window.dpSetServicosVisibleIds(visibleIds);
    } catch (_) {}

    // Ordena (mais recentes primeiro) — tenta vários campos
    listaParaRender.sort((a, b) => {
      const pick = (o) => o?.updatedat || o?.updatedAt || o?.dataAtualizacao || o?.dataCriacao || o?.dataCriacaoISO || o?.created_at || o?.createdAt || o?.createdat || 0;
      const da = new Date(pick(a)).getTime();
      const db = new Date(pick(b)).getTime();
      return (db || 0) - (da || 0);
    });

    grid.classList.remove("dp-grid--loading");
    grid.innerHTML = "";

    listaParaRender.forEach((anuncio) => {
      const card = (typeof window.dokeBuildCardPremium === "function")
        ? window.dokeBuildCardPremium(anuncio)
        : fallbackCard(anuncio);

      // Visual de "desativado" no perfil do dono
      try {
        if (ctx && ctx.canEdit && anuncio && (anuncio.ativo === false || anuncio.active === false)) {
          card.classList.add("dp-anuncio-inativo");
        }
      } catch (_) {}

      try {
        if (ctx && ctx.canEdit) {
          window.dpRegisterServicoSelectableCard && window.dpRegisterServicoSelectableCard(card, anuncio && anuncio.id);
        }
      } catch (_) {}

      grid.appendChild(card);
    });
    try { window.dpRefreshServicosSelectionUI && window.dpRefreshServicosSelectionUI(); } catch (_) {}
  } catch (e) {
    console.error(e);
    try { window.dpSetServicosVisibleIds && window.dpSetServicosVisibleIds([]); } catch (_) {}
    grid.innerHTML = `<div class="dp-empty">Erro ao carregar serviços.</div>`;
  }
}


// ============================================================
// GERENCIAR ANÚNCIOS (UX MELHORADA)
// - Botão único "Gerenciar anúncios" no header da aba Serviços
// - Lista para escolher o anúncio (clicando nele)
// - Editor centralizado (não fica por baixo do menu)
// - Desativar e Apagar exigem confirmação de senha (modal estilizado)
// ============================================================

(function(){
  "use strict";

  // -----------------------------
  // Setup do botão (aba Serviços)
  // -----------------------------
  window.dokeSetupGerenciarBtn = function(ctx){
    const btn = document.getElementById("dpNewServico");
    if(!btn) return;

    // Só o dono vê o botão
    if(!ctx || !ctx.canEdit){
      btn.style.display = "none";
      return;
    }

    btn.style.display = "inline-flex";
    btn.classList.remove("dp-manageBtn");
    btn.innerHTML = `<i class='bx bx-plus'></i> Novo`;
    btn.onclick = (e)=>{
      e.preventDefault();
      e.stopPropagation();
      window.location.href = "anunciar.html";
    };
  };

  // -----------------------------
  // UI helpers (modais)
  // -----------------------------
  function ensureUI(){
    // CSS
    if(!document.getElementById("dpAdMgrV2Style")){
      const st = document.createElement("style");
      st.id = "dpAdMgrV2Style";
      st.textContent = `
        body.dp-lock-scroll{overflow:hidden !important;}

        /* botão no header */
        .dp-manageBtn{gap:8px;}

        /* overlay base */
        .dp-xmodal{position:fixed; inset:0; display:none; align-items:center; justify-content:center; padding:16px; background:rgba(0,0,0,.55); z-index:200000;}
        .dp-xmodal.open{display:flex;}
        .dp-xcard{width:min(1060px, 100%); max-height:92vh; overflow:hidden; background:#fff; border-radius:18px; box-shadow:0 28px 80px rgba(0,0,0,.35);}
        .dp-xhead{display:flex; align-items:center; gap:10px; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #eee; position:sticky; top:0; background:#fff; z-index:2;}
        .dp-xhead h3{margin:0; font-size:1.05rem;}
        .dp-xheadLeft{display:flex; align-items:center; gap:10px;}
        .dp-xback{border:none; background:#f2f2f2; border-radius:10px; padding:8px 10px; cursor:pointer; font-weight:900;}
        .dp-xactions{display:flex; align-items:center; gap:10px;}
        .dp-xlink{display:inline-flex; align-items:center; gap:8px; text-decoration:none; background:#eefaf7; color:#0b7768; padding:8px 10px; border-radius:12px; font-weight:900;}
        .dp-xbtn{border:none; background:#f2f2f2; border-radius:12px; padding:10px 12px; cursor:pointer; font-weight:900;}
        .dp-xbtn.danger{background:#fff0f0; color:#b00020;}
        .dp-xbody{padding:14px 16px; overflow:auto; max-height:calc(92vh - 60px);}

        /* lista */
        .dp-adlist{display:flex; flex-direction:column; gap:10px;}
        .dp-adrow{display:grid; grid-template-columns:72px 1fr auto; gap:12px; align-items:center; border:1px solid #eee; border-radius:16px; padding:10px 12px; cursor:pointer;}
        .dp-adrow:hover{background:#fafafa;}
        .dp-adthumb{width:72px; height:54px; border-radius:12px; overflow:hidden; background:#f3f3f3;}
        .dp-adthumb img{width:100%; height:100%; object-fit:cover; display:block;}
        .dp-admeta b{display:block; font-size:.95rem; margin-bottom:2px;}
        .dp-admeta .dp-mini{color:#666; font-size:.8rem; line-height:1.2;}
        .dp-chip{display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; font-size:.75rem; font-weight:900; border:1px solid #e6e6e6;}
        .dp-chip.on{background:#eefaf7; color:#0b7768;}
        .dp-chip.off{background:#fff7e6; color:#8a5a00;}
        .dp-adactions{display:flex; gap:8px; align-items:center; justify-content:flex-end;}
        .dp-icbtn{border:none; background:#f4f4f4; border-radius:12px; padding:10px 10px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;}
        .dp-icbtn:hover{filter:brightness(.98);}
        .dp-icbtn.danger{background:#fff0f0; color:#b00020;}

        /* editor */
        .dp-form{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
        .dp-form .full{grid-column:1/-1;}
        .dp-field label{display:block; font-size:.78rem; color:#666; margin-bottom:6px; font-weight:900;}
        .dp-field input,.dp-field textarea,.dp-field select{width:100%; padding:12px 12px; border:1px solid #e6e6e6; border-radius:12px; outline:none; font-family:inherit;}
        .dp-field textarea{min-height:120px; resize:vertical;}
        .dp-ro{background:#f7f7f7;}
        .dp-photos{display:flex; flex-wrap:wrap; gap:10px;}
        .dp-photo{width:120px; border:1px solid #eee; border-radius:12px; overflow:hidden; position:relative;}
        .dp-photo img{width:100%; height:84px; object-fit:cover; display:block;}
        .dp-photo button{position:absolute; top:6px; right:6px; border:none; background:rgba(0,0,0,.65); color:#fff; border-radius:10px; padding:6px 8px; cursor:pointer;}
        .dp-footerBar{position:sticky; bottom:0; background:#fff; border-top:1px solid #eee; padding:12px 16px; display:flex; justify-content:flex-end; gap:10px;}
        .dp-btn{border:none; cursor:pointer; padding:12px 14px; border-radius:12px; font-weight:900;}
        .dp-btn.secondary{background:#f2f2f2;}
        .dp-btn.primary{background:var(--cor0); color:#fff;}

        /* responsivo */
        @media (max-width: 760px){
          .dp-xcard{max-height:94vh;}
          .dp-adrow{grid-template-columns:62px 1fr;}
          .dp-adactions{grid-column:1/-1; justify-content:flex-start;}
          .dp-form{grid-template-columns:1fr;}
        }

        /* Marca de desativado no grid do perfil (fora do gerenciador) */
        .dp-anuncio-inativo{opacity:.65; filter:saturate(.85); position:relative;}
        .dp-anuncio-inativo::after{content:"DESATIVADO"; position:absolute; left:12px; bottom:12px; padding:6px 10px; border-radius:12px; background:rgba(0,0,0,.7); color:#fff; font-weight:900; font-size:.75rem; letter-spacing:.04em; z-index:3;}

        /* modal de senha */
        .dp-passCard{width:min(520px, 100%); background:#fff; border-radius:18px; box-shadow:0 28px 80px rgba(0,0,0,.35); overflow:hidden;}
        .dp-passBody{padding:14px 16px;}
        .dp-passMsg{color:#555; line-height:1.35; margin:6px 0 12px;}
        .dp-passErr{display:none; background:#fff0f0; color:#b00020; padding:10px 12px; border-radius:12px; font-weight:800; margin-bottom:10px;}
        .dp-passRow{display:flex; gap:10px; align-items:center; margin-top:10px;}
        .dp-passRow input{
          flex:1;
          padding:14px 14px;
          border:1px solid #e6e6e6;
          border-radius:14px;
          background:#f9fafb;
          font-weight:700;
          outline:none;
          transition: box-shadow .15s ease, border-color .15s ease, background .15s ease;
        }
        .dp-passRow input:focus{
          border-color: rgba(11,119,104,.55);
          background:#fff;
          box-shadow: 0 0 0 4px rgba(11,119,104,.14);
        }
        .dp-eye{border:none; background:#f2f2f2; border-radius:12px; padding:10px 12px; cursor:pointer; font-weight:900;}
      `;
      document.head.appendChild(st);
    }

    // Manager modal
    if(!document.getElementById("dpMgrOverlayV2")){
      const el = document.createElement("div");
      el.id = "dpMgrOverlayV2";
      el.className = "dp-xmodal";
      el.innerHTML = `
        <div class="dp-xcard" role="dialog" aria-modal="true">
          <div class="dp-xhead">
            <div class="dp-xheadLeft">
              <button type="button" class="dp-xback" id="dpMgrBackV2" style="display:none;"><i class='bx bx-arrow-back'></i></button>
              <h3 id="dpMgrTitleV2">Gerenciar anúncios</h3>
            </div>
            <div class="dp-xactions">
              <a class="dp-xlink" href="anunciar.html"><i class='bx bx-plus'></i> Novo anúncio</a>
              <button type="button" class="dp-xbtn" id="dpMgrCloseV2">Fechar</button>
            </div>
          </div>
          <div class="dp-xbody" id="dpMgrBodyV2"></div>
          <div class="dp-footerBar" id="dpMgrFootV2" style="display:none;"></div>
        </div>
      `;
      document.body.appendChild(el);

      el.addEventListener("click", (e)=>{ if(e.target === el) closeMgr(); });
      document.getElementById("dpMgrCloseV2")?.addEventListener("click", closeMgr);
      document.getElementById("dpMgrBackV2")?.addEventListener("click", ()=> renderListView(window.__dpMgrCtx));
      document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") { closePass(); closeMgr(); } });
    }

    // Password modal
    if(!document.getElementById("dpPassOverlayV2")){
      const el = document.createElement("div");
      el.id = "dpPassOverlayV2";
      el.className = "dp-xmodal";
      el.innerHTML = `
        <div class="dp-passCard" role="dialog" aria-modal="true">
          <div class="dp-xhead">
            <h3 id="dpPassTitleV2">Confirmar senha</h3>
            <button type="button" class="dp-xbtn" id="dpPassCloseV2">Fechar</button>
          </div>
          <div class="dp-passBody">
            <div class="dp-passErr" id="dpPassErrV2"></div>
            <div class="dp-passMsg" id="dpPassMsgV2">Confirme sua senha para continuar.</div>
            <div class="dp-passRow">
              <input id="dpPassInputV2" type="password" placeholder="Sua senha" autocomplete="current-password" />
              <button type="button" class="dp-eye" id="dpPassEyeV2"><i class='bx bx-low-vision'></i></button>
            </div>
          </div>
          <div class="dp-footerBar">
            <button type="button" class="dp-btn secondary" id="dpPassCancelV2">Cancelar</button>
            <button type="button" class="dp-btn primary" id="dpPassOkV2">Confirmar</button>
          </div>
        </div>
      `;
      document.body.appendChild(el);
      el.addEventListener("click", (e)=>{ if(e.target === el) closePass(); });
      document.getElementById("dpPassCloseV2")?.addEventListener("click", closePass);
      document.getElementById("dpPassCancelV2")?.addEventListener("click", closePass);
      document.getElementById("dpPassEyeV2")?.addEventListener("click", ()=>{
        const inp = document.getElementById("dpPassInputV2");
        if(!inp) return;
        inp.type = (inp.type === "password") ? "text" : "password";
      });
    }
  }

  function updateScrollLock(){
    const mgrOpen = document.getElementById("dpMgrOverlayV2")?.classList.contains("open");
    const passOpen = document.getElementById("dpPassOverlayV2")?.classList.contains("open");
    const baseOpen = document.getElementById("dpModalOverlay")?.classList.contains("open");
    document.body.classList.toggle("dp-lock-scroll", !!(mgrOpen || passOpen || baseOpen));
  }

  function openMgr(){
    ensureUI();
    const el = document.getElementById("dpMgrOverlayV2");
    if(!el) return;
    el.classList.add("open");
    updateScrollLock();
  }

  function closeMgr(){
    const el = document.getElementById("dpMgrOverlayV2");
    if(!el) return;
    el.classList.remove("open");
    updateScrollLock();
    // volta para lista ao fechar
    try{ document.getElementById("dpMgrBackV2").style.display = "none"; }catch(_){ }
  }

  let passResolver = null;
  function openPass(){
    ensureUI();
    const el = document.getElementById("dpPassOverlayV2");
    if(!el) return;
    el.classList.add("open");
    updateScrollLock();
    const inp = document.getElementById("dpPassInputV2");
    if(inp){ inp.value=""; setTimeout(()=> inp.focus(), 20); }
    const err = document.getElementById("dpPassErrV2");
    if(err){ err.style.display="none"; err.textContent=""; }
  }
  function closePass(){
    const el = document.getElementById("dpPassOverlayV2");
    if(!el) return;
    el.classList.remove("open");
    updateScrollLock();
    if(passResolver){ passResolver(false); passResolver = null; }
  }

  async function verifyPasswordFlow(opts){
    ensureUI();
    return new Promise((resolve)=>{
      passResolver = resolve;
      const title = document.getElementById("dpPassTitleV2");
      const msg = document.getElementById("dpPassMsgV2");
      const ok = document.getElementById("dpPassOkV2");
      const cancel = document.getElementById("dpPassCancelV2");
      const err = document.getElementById("dpPassErrV2");
      const inp = document.getElementById("dpPassInputV2");

      if(title) title.textContent = opts?.title || "Confirmar senha";
      if(msg) msg.textContent = opts?.message || "Confirme sua senha para continuar.";
      if(ok) ok.textContent = opts?.confirmLabel || "Confirmar";

      const cleanup = ()=>{
        try{ if(ok){ ok.removeEventListener("click", onOk); if(ok.__dpOnOk === onOk) ok.__dpOnOk = null; } }catch(_){ }
        try{ if(cancel){ cancel.removeEventListener("click", onCancel); if(cancel.__dpOnCancel === onCancel) cancel.__dpOnCancel = null; } }catch(_){ }
      };

      const onCancel = ()=>{
        cleanup();
        closePass();
        resolve(false);
      };

      const onOk = async ()=>{
        if(!inp) return;
        const senha = (inp.value || "").trim();
        if(!senha){
          if(err){ err.textContent = "Digite sua senha."; err.style.display = "block"; }
          return;
        }

        try{
          ok.disabled = true;
          ok.textContent = "Verificando...";

          const user = window.auth?.currentUser;
          const email = user?.email;
          if(!user) throw new Error("Você precisa estar logado.");
          if(!email) throw new Error("Seu login não possui e-mail para confirmação.");
          if(typeof signInWithEmailAndPassword !== "function") throw new Error("Confirmação de senha indisponível nesta página.");

          await signInWithEmailAndPassword(window.auth, email, senha);

          cleanup();
          // fecha sem acionar resolver do closePass
          passResolver = null;
          document.getElementById("dpPassOverlayV2")?.classList.remove("open");
          updateScrollLock();
          resolve(true);
        }catch(e){
          if(err){ err.textContent = e?.message || "Senha incorreta."; err.style.display = "block"; }
        }finally{
          ok.disabled = false;
          ok.textContent = opts?.confirmLabel || "Confirmar";
        }
      };

      if(ok){
        if(ok.__dpOnOk) ok.removeEventListener("click", ok.__dpOnOk);
        ok.__dpOnOk = onOk;
        ok.addEventListener("click", onOk);
      }
      if(cancel){
        if(cancel.__dpOnCancel) cancel.removeEventListener("click", cancel.__dpOnCancel);
        cancel.__dpOnCancel = onCancel;
        cancel.addEventListener("click", onCancel);
      }

      openPass();
    });
  }

  // -----------------------------
  // Data: buscar anúncios do dono
  // -----------------------------
  async function fetchAnunciosByUid(uid){
    if(!window.db || !window.getDocs || !window.query || !window.collection || !window.where){
      throw new Error("Firebase não inicializado.");
    }
    const q = query(collection(window.db, "anuncios"), where("uid", "==", uid));
    const snap = await getDocs(q);
    const out = [];
    snap.forEach((d)=> out.push({ id: d.id, ...d.data() }));
    out.sort((a,b)=>{
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return db - da;
    });
    return out;
  }

  // -----------------------------
  // Render: lista e editor
  // -----------------------------
  function renderListView(ctx){
    window.__dpMgrCtx = ctx;
    openMgr();

    const title = document.getElementById("dpMgrTitleV2");
    const back = document.getElementById("dpMgrBackV2");
    const body = document.getElementById("dpMgrBodyV2");
    const foot = document.getElementById("dpMgrFootV2");
    const canPublish = isProfissionalUsuario(ctx?.me);
    const novoAnuncioLink = document.querySelector("#dpMgrOverlayV2 .dp-xlink");

    if(title) title.textContent = "Gerenciar anúncios";
    if(back) back.style.display = "none";
    if(foot) { foot.style.display = "none"; foot.innerHTML = ""; }
    if(novoAnuncioLink) novoAnuncioLink.style.display = canPublish ? "inline-flex" : "none";

    if(!body) return;
    body.innerHTML = `<div style="padding:10px 0; color:#666;">Carregando seus anúncios...</div>`;

    const uid = ctx?.target?.uid || window.auth?.currentUser?.uid || ctx?.targetId;

    fetchAnunciosByUid(uid).then((anuncios)=>{
      window.__dpCachedAnuncios = anuncios.slice();

      if(!anuncios.length){
        const ctaHref = canPublish ? "anunciar.html" : "tornar-profissional.html";
        const ctaLabel = canPublish ? "Anuncie seu serviço" : "Ative o perfil profissional";
        body.innerHTML = `
          <div style="padding:16px; border:1px dashed #ddd; border-radius:16px; color:#666;">
            <b>Nenhum anúncio encontrado.</b><br>
            Publique seu primeiro anúncio em <a href="${ctaHref}">${ctaLabel}</a>.
          </div>
        `;
        return;
      }

      const list = document.createElement("div");
      list.className = "dp-adlist";

      anuncios.forEach((a)=>{
        const row = document.createElement("div");
        row.className = "dp-adrow";

        const img = (Array.isArray(a.fotos) && a.fotos[0]) || a.img || "https://placehold.co/600x400";
        const isAtivo = (a.ativo !== false);

        row.innerHTML = `
          <div class="dp-adthumb"><img src="${img}" onerror="this.src='https://placehold.co/600x400?text=Foto'" /></div>
          <div class="dp-admeta">
            <b>${escapeHtml(a.titulo || "Sem titulo")}</b>
            <div class="dp-mini">${escapeHtml((a.preco || "A combinar"))} • ${escapeHtml((a.categoria || (a.categorias||"" ).split(',')[0] || "Geral").trim())}</div>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <span class="dp-chip ${isAtivo ? "on" : "off"}">
              <i class='bx ${isAtivo ? "bx-show" : "bx-hide"}'></i> ${isAtivo ? "Ativo" : "Desativado"}
            </span>
            <div class="dp-adactions">
              <button type="button" class="dp-icbtn" data-act="edit" title="Editar"><i class='bx bx-edit'></i></button>
              <button type="button" class="dp-icbtn" data-act="toggle" title="${isAtivo ? "Desativar" : "Ativar"}"><i class='bx ${isAtivo ? "bx-hide" : "bx-show"}'></i></button>
              <button type="button" class="dp-icbtn danger" data-act="delete" title="Apagar"><i class='bx bx-trash'></i></button>
            </div>
          </div>
        `;

        // Clique na linha abre o editor COMPLETO (anunciar.html) para ficar
        // 100% idêntico ao fluxo de criação. No modo edit, o anunciar.html
        // já esconde/bloqueia dados pessoais.
        row.addEventListener("click", ()=> {
          window.location.href = `anunciar.html?mode=edit&id=${encodeURIComponent(a.id)}`;
        });

        // Ações
        row.querySelectorAll("button[data-act]").forEach((b)=>{
          b.addEventListener("click", async (ev)=>{
            ev.preventDefault();
            ev.stopPropagation();
            const act = b.getAttribute("data-act");
            if(act === "edit"){
              window.location.href = `anunciar.html?mode=edit&id=${encodeURIComponent(a.id)}`;
              return;
            }
            if(act === "toggle"){
              await toggleAtivo(ctx, a);
              return;
            }
            if(act === "delete"){
              await apagarAnuncio(ctx, a);
              return;
            }
          });
        });

        list.appendChild(row);
      });

      body.innerHTML = "";
      body.appendChild(list);

    }).catch((e)=>{
      body.innerHTML = `<div style="padding:10px 0; color:#b00020; font-weight:800;">${escapeHtml(e?.message || "Erro ao carregar anúncios.")}</div>`;
    });
  }

  function renderEditView(ctx, anuncio){
    window.__dpMgrCtx = ctx;
    openMgr();

    const title = document.getElementById("dpMgrTitleV2");
    const back = document.getElementById("dpMgrBackV2");
    const body = document.getElementById("dpMgrBodyV2");
    const foot = document.getElementById("dpMgrFootV2");

    if(title) title.textContent = "Editar anúncio";
    if(back) back.style.display = "inline-flex";

    if(!body) return;

    const fotos = (Array.isArray(anuncio.fotos) && anuncio.fotos.length) ? anuncio.fotos.slice() : (anuncio.img ? [anuncio.img] : []);

    body.innerHTML = `
      <form id="dpEditFormV2">
        <input type="hidden" id="dpEditIdV2" value="${escapeAttr(anuncio.id)}" />
        <div class="dp-form">
          <div class="dp-field full">
            <label>Título</label>
            <input id="dpEditTituloV2" value="${escapeAttr(anuncio.titulo || "")}" required />
          </div>

          <div class="dp-field full">
            <label>Descrição</label>
            <textarea id="dpEditDescV2" required>${escapeHtml(anuncio.descricao || "")}</textarea>
          </div>

          <div class="dp-field">
            <label>Categoria (principal)</label>
            <input id="dpEditCatV2" value="${escapeAttr(anuncio.categoria || "")}" placeholder="Ex.: Assistência Técnica" />
          </div>

          <div class="dp-field">
            <label>Categorias (texto)</label>
            <input id="dpEditCatsV2" value="${escapeAttr(anuncio.categorias || "")}" placeholder="Ex.: Assistência Técnica, Celular" />
          </div>

          <div class="dp-field">
            <label>Modo de atendimento</label>
            <select id="dpEditModoV2">
              <option value="Presencial">Presencial</option>
              <option value="Online">Online</option>
            </select>
          </div>

          <div class="dp-field">
            <label>Preço</label>
            <input id="dpEditPrecoV2" value="${escapeAttr(anuncio.preco || "")}" placeholder="Ex.: A combinar / R$ 120" />
          </div>

          <div class="dp-field full">
            <label>Questionário (JSON) (opcional)</label>
            <textarea id="dpEditPergV2" placeholder='[{"pergunta":"..."}]'>${escapeHtml(anuncio.perguntasFormularioJson || "")}</textarea>
            <div class="dp-mini" style="margin-top:6px;">Deixe vazio se não houver formulário.</div>
          </div>

          <div class="dp-field full">
            <label>Fotos</label>
            <div class="dp-photos" id="dpFotosWrapV2"></div>
            <div style="display:flex; gap:10px; margin-top:10px;">
              <input id="dpFotoUrlV2" placeholder="Cole uma URL de imagem (https://...)" />
              <button type="button" class="dp-btn secondary" id="dpAddFotoV2">Adicionar</button>
            </div>
            <input type="hidden" id="dpFotosJsonV2" />
          </div>

          <div class="dp-field full">
            <label>Dados pessoais (somente leitura)</label>
            <div class="dp-form">
              <div class="dp-field"><label>Autor</label><input class="dp-ro" value="${escapeAttr(anuncio.nomeAutor || "")}" readonly /></div>
              <div class="dp-field"><label>@Usuário</label><input class="dp-ro" value="${escapeAttr(anuncio.userHandle || "")}" readonly /></div>
              <div class="dp-field"><label>WhatsApp</label><input class="dp-ro" value="${escapeAttr(anuncio.whatsapp || "")}" readonly /></div>
              <div class="dp-field"><label>Local</label><input class="dp-ro" value="${escapeAttr(buildLocal(anuncio))}" readonly /></div>
            </div>
          </div>
        </div>
      </form>
    `;

    // set select
    const modoSel = document.getElementById("dpEditModoV2");
    if(modoSel) modoSel.value = anuncio.modo_atend || "Presencial";

    // fotos state
    setFotosV2(fotos);

    document.getElementById("dpAddFotoV2")?.addEventListener("click", ()=>{
      const inp = document.getElementById("dpFotoUrlV2");
      const url = (inp?.value || "").trim();
      if(!url) return;
      const arr = getFotosV2();
      arr.push(url);
      setFotosV2(arr);
      if(inp) inp.value = "";
    });

    // footer actions
    if(foot){
      foot.style.display = "flex";
      foot.innerHTML = `
        <button type="button" class="dp-btn secondary" id="dpCancelEditV2">Cancelar</button>
        <button type="button" class="dp-btn primary" id="dpSaveEditV2">Salvar alterações</button>
      `;

      document.getElementById("dpCancelEditV2")?.addEventListener("click", ()=> renderListView(ctx));
      document.getElementById("dpSaveEditV2")?.addEventListener("click", async ()=>{
        await salvarEdicao(ctx, anuncio);
      });
    }
  }

  function getFotosV2(){
    try{ return JSON.parse(document.getElementById("dpFotosJsonV2")?.value || "[]") || []; }catch(_){ return []; }
  }
  function setFotosV2(fotos){
    const hid = document.getElementById("dpFotosJsonV2");
    const wrap = document.getElementById("dpFotosWrapV2");
    if(hid) hid.value = JSON.stringify(fotos || []);
    if(!wrap) return;
    wrap.innerHTML = "";
    (fotos || []).forEach((url, idx)=>{
      const box = document.createElement("div");
      box.className = "dp-photo";
      box.innerHTML = `<img src="${url}" onerror="this.src='https://placehold.co/600x400?text=Foto'" /><button type="button" title="Remover">×</button>`;
      box.querySelector("button")?.addEventListener("click", ()=>{
        const arr = getFotosV2().filter((_,i)=> i != idx);
        setFotosV2(arr);
      });
      wrap.appendChild(box);
    });
  }

  function buildLocal(a){
    return [a.bairro, a.cidade, a.uf, a.cep ? `CEP ${a.cep}` : ""].filter(Boolean).join(" - ");
  }

  
  async function toggleAtivo(ctx, anuncio){
    const isAtivo = (anuncio.ativo !== false);

    if(isAtivo){
      const ok = await verifyPasswordFlow({
        title: "Desativar anúncio",
        message: "Ao desativar, seu anúncio some do feed e do perfil público. Você pode reativar depois.",
        confirmLabel: "Desativar"
      });
      if(!ok) return;
    }

    await updateDoc(doc(window.db, "anuncios", anuncio.id), { ativo: !isAtivo, updatedAt: new Date().toISOString() });
    if(window.mostrarToast) window.mostrarToast(isAtivo ? "Anúncio desativado." : "Anúncio ativado.", "sucesso");

    // Recarrega lista e grid do perfil
    try{ await loadServicosPerfil(ctx); }catch(_){ }
    renderListView(ctx);
  }

  async function apagarAnuncio(ctx, anuncio){
    const ok = await verifyPasswordFlow({
      title: "Apagar anúncio",
      message: "Essa ação é permanente e não pode ser desfeita. Confirme sua senha para apagar.",
      confirmLabel: "Apagar"
    });
    if(!ok) return;

    await deleteDoc(doc(window.db, "anuncios", anuncio.id));
    if(window.mostrarToast) window.mostrarToast("Anúncio apagado.", "sucesso");

    try{ await loadServicosPerfil(ctx); }catch(_){ }
    renderListView(ctx);
  }

  // salvarEdicao
  async function salvarEdicao(ctx, anuncio){
    const btn = document.getElementById("dpSaveEditV2");
    const original = btn?.textContent || "Salvar alterações";
    if(btn){ btn.disabled = true; btn.textContent = "Salvando..."; }

    try{
      const id = document.getElementById("dpEditIdV2")?.value;
      const titulo = (document.getElementById("dpEditTituloV2")?.value || "").trim();
      const descricao = (document.getElementById("dpEditDescV2")?.value || "").trim();
      if(!id) throw new Error("ID do anúncio não encontrado.");
      if(!titulo || !descricao) throw new Error("Preencha título e descrição.");

      const categoria = (document.getElementById("dpEditCatV2")?.value || "").trim();
      const categorias = (document.getElementById("dpEditCatsV2")?.value || "").trim();
      const modo_atend = (document.getElementById("dpEditModoV2")?.value || "Presencial");
      const preco = (document.getElementById("dpEditPrecoV2")?.value || "").trim();
      const perguntasFormularioJson = (document.getElementById("dpEditPergV2")?.value || "").trim();
      const temFormulario = perguntasFormularioJson.length > 0;

      const fotos = getFotosV2();
      const fotosFinal = (fotos && fotos.length) ? fotos : (Array.isArray(anuncio.fotos) && anuncio.fotos.length ? anuncio.fotos : (anuncio.img ? [anuncio.img] : ["https://placehold.co/600x400?text=Sem+Foto"]));
      const img = fotosFinal[0] || anuncio.img || "https://placehold.co/600x400?text=Sem+Foto";

      const payload = {
        titulo,
        descricao,
        categoria: categoria || (categorias ? categorias.split(",")[0].trim() : (anuncio.categoria || "")),
        categorias,
        modo_atend,
        preco: preco || anuncio.preco || "A combinar",
        perguntasFormularioJson,
        temFormulario,
        fotos: fotosFinal,
        img,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(window.db, "anuncios", id), payload);
      if(window.mostrarToast) window.mostrarToast("Anúncio atualizado!", "sucesso");

      // Atualiza grid e volta para lista
      try{ await loadServicosPerfil(ctx); }catch(_){ }
      renderListView(ctx);

    }catch(e){
      console.error(e);
      if(window.mostrarToast) window.mostrarToast(e?.message || "Falha ao salvar.", "erro");
    }finally{
      if(btn){ btn.disabled = false; btn.textContent = original; }
    }
  }

  function escapeHtml(s){
    return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function escapeAttr(s){
    return escapeHtml(s).replace(/\n/g," ");
  }

  // expose para o modal base também
  try{ window.updateScrollLock = updateScrollLock; }catch(_){}

  // -----------------------------
  // API pública
  // -----------------------------
  window.dokeOpenGerenciarAnuncios = function(ctx){
    renderListView(ctx);
  };

})();





// Compat legado: delega para o enhancer compartilhado quando existir.
function setupAntesDepois(container){
  try{
    if (window.DokeAntesDepois && typeof window.DokeAntesDepois.refresh === "function") {
      window.DokeAntesDepois.refresh(container || document);
    }
  }catch(_){}
}
