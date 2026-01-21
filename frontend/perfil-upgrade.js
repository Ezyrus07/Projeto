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
    const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${meses[d.getMonth()]} ${d.getFullYear()}`;
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
        ? `<video src="${item.media_url}"${poster} preload="metadata" muted playsinline></video>`
        : `<img src="${item.media_url}" alt="">`;
      const card = document.createElement("div");
      card.className = "dp-item dp-item--clickable";
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      const title = item.titulo || item.legenda || "";
      const desc = item.descricao || (item.titulo ? item.legenda : "") || "";
      card.innerHTML = `
        <div class="dp-itemMedia">${media}</div>
        <div class="dp-itemBody">
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
      if(isMissingTableError(error)){
        grid.innerHTML = `<div class="dp-empty">Nenhum serviço cadastrado.</div>`;
        return;
      }
      grid.innerHTML = `<div class="dp-empty">Erro ao carregar. Se você ainda não criou as tabelas do perfil, rode o arquivo <b>supabase_schema.sql</b>.</div>`;
      console.error(error);
      return;
    }
    if(!data?.length){
      grid.innerHTML = `<div class="dp-empty">Sem serviços cadastrados ainda.</div>`;
      return;
    }
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

  async function loadAvaliacoes(client, profId){
    const box = $("#dpBoxAvaliacoes");
    if(!box) return;
    box.innerHTML = `<div class="dp-empty">Carregando avaliações...</div>`;
    const { data, error } = await client
      .from("avaliacoes")
      .select("*")
      .eq("profissional_id", profId)
      .order("created_at", { ascending:false })
      .limit(80);
    if(error){
      if(isMissingTableError(error)){
        grid.innerHTML = `<div class="dp-empty">Sem avaliações ainda.</div>`;
        return;
      }
      grid.innerHTML = `<div class="dp-empty">Erro ao carregar. Se você ainda não criou as tabelas do perfil, rode o arquivo <b>supabase_schema.sql</b>.</div>`;
      console.error(error);
      return;
    }
    if(!data?.length){
      box.innerHTML = `<div class="dp-empty">Sem avaliações ainda.</div>`;
      return;
    }
    const avg = data.reduce((a,x)=>a+(x.nota||0),0)/data.length;
    const stars = "★★★★★".slice(0, Math.round(avg)) + "☆☆☆☆☆".slice(0, 5-Math.round(avg));
    box.innerHTML = `
      <div class="dp-empty" style="border-style:solid; border-color:rgba(0,0,0,.06);">
        <b>Média:</b> ${avg.toFixed(1)} • ${stars} <small>(${data.length})</small>
      </div>
      <div id="dpAvalList" style="display:grid; gap:10px; margin-top:12px;"></div>
    `;
    const list = $("#dpAvalList");
    data.forEach(a=>{
      const el = document.createElement("div");
      el.className = "dp-item";
      el.innerHTML = `
        <div class="dp-itemBody">
          <b>${"★".repeat(a.nota || 0)}${"☆".repeat(5-(a.nota||0))}</b>
          <p>${escapeHtml(a.comentario || "")}</p>
          <p><small>${fmtDateShort(a.created_at)}</small></p>
        </div>
      `;
      list.appendChild(el);
    });
  }

  // -----------------------------
  // Create items
  // -----------------------------
  async function createPublicacao(client, ctx, { tipo, titulo, legenda, file, capaFile }){
    // upload to storage
    const storageId = ctx.me?.uid || ctx.me?.id;
    let thumbUrl = null;
    if(capaFile){
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
      if(tab === "avaliacoes") loadAvaliacoes(ctx.client, ctx.target.id);
    }

    buttons.forEach(b=>{
      b.addEventListener("click", ()=> activate(b.dataset.tab));
    });

    // default tab
    activate("publicacoes");
  }

  function initStatsNav(){
    const stats = $(".dp-stats");
    const prev = $(".dp-statsPrev");
    const next = $(".dp-statsNext");
    if(!stats || !prev || !next) return;

    const scrollAmount = () => Math.max(120, Math.round(stats.clientWidth * 0.6));
    const updateNav = () => {
      const maxScroll = stats.scrollWidth - stats.clientWidth;
      const hide = maxScroll <= 1;
      prev.disabled = stats.scrollLeft <= 0;
      next.disabled = stats.scrollLeft >= maxScroll - 1;
      prev.style.visibility = hide ? "hidden" : "visible";
      next.style.visibility = hide ? "hidden" : "visible";
    };

    prev.addEventListener("click", ()=> {
      stats.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
    });
    next.addEventListener("click", ()=> {
      stats.scrollBy({ left: scrollAmount(), behavior: "smooth" });
    });
    stats.addEventListener("scroll", updateNav, { passive: true });
    window.addEventListener("resize", updateNav);
    updateNav();
  }

  // -----------------------------
  // Section actions
  // -----------------------------
  function initSectionActions(ctx){
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
              </select>
            </div>
            <div>
              <label>Arquivo</label>
              <input class="dp-input" type="file" id="dpPubFile" accept="image/*,video/*"/>
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
        if(!file) return toast("Selecione um arquivo.");
        try{
          if(tipo === "curto"){
            if(!ctx.me.isProfissional) return toast("Disponivel para perfil profissional.");
            await createReel(client, ctx, {
              titulo: safeStr($("#dpPubTitulo")?.value),
              descricao: safeStr($("#dpPubDesc")?.value),
              file,
              capaFile
            });
            modal.close();
            toast("Video curto publicado!");
            loadReels(ctx.client, ctx.target.id);
            return;
          }
          await createPublicacao(client, ctx, {
            tipo,
            titulo: safeStr($("#dpPubTitulo")?.value),
            legenda: safeStr($("#dpPubDesc")?.value),
            file,
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
      const updateCover = ()=>{
        const show = (tipoEl?.value || "foto") !== "foto";
        if(coverRow) coverRow.style.display = show ? "" : "none";
        if(!show && coverInput) coverInput.value = "";
      };
      tipoEl?.addEventListener("change", updateCover);
      updateCover();
    });

    // Novo Reel
    $("#dpNewReel")?.addEventListener("click", ()=>{
      if(!ctx.canEdit) return toast("Apenas no seu perfil.");
      if(!ctx.me.isProfissional) return toast("Disponível para perfil profissional.");
      modal.open("Novo vídeo curto", `
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
          toast("Vídeo curto publicado!");
          loadReels(ctx.client, ctx.target.id);
        }catch(e){
          console.error(e);
          toast("Erro ao publicar.");
        }
      }, { saveLabel: "Publicar", savingLabel: "Publicando..." });
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
              <option value="5">★★★★★ (5)</option>
              <option value="4">★★★★☆ (4)</option>
              <option value="3">★★★☆☆ (3)</option>
              <option value="2">★★☆☆☆ (2)</option>
              <option value="1">★☆☆☆☆ (1)</option>
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
          loadAvaliacoes(ctx.client, ctx.target.id);
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

    // Solicitar orçamento (para visitante)
    $("#dpOrcBtn")?.addEventListener("click", ()=>{
      const id = ctx.target?.id || "";
      window.location.href = `orcamento.html?prof=${encodeURIComponent(id)}`;
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

    const bio = u.bio || (u.isProfissional ? "Profissional na Doke." : "Olá! Sou novo na comunidade Doke.");
    setText("#dpBio", bio);
    const aboutText = stats?.about || u.sobre || "";
    const aboutFallback = "As informacoes do perfil aparecem aqui. (Bio, local e tempo de membro sao editaveis no botao \"Editar perfil\".)";
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
    const isPro = !!u.isProfissional;
    showIf("[data-pro-only]", isPro);
    hideIf("[data-pro-hide]", isPro);

    // actions for visitor
    const canEdit = ctx.canEdit;
    showIf("#dpOrcBtn", !canEdit && isPro);
    hideIf("#dpEditBtn", !canEdit);

    // availability
    initAvailability(ctx);
  }

  // -----------------------------
  // Main init
  // -----------------------------
  async function init(){
    const rootEl = $("#dpRoot");
    // Mostra feedback de carregamento e garante que não fica "branco"
    rootEl?.classList.add("dp-loading");

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
      const pageMode = root?.dataset?.mode || "self"; // self | public
      const pageTheme = root?.dataset?.theme || "cliente"; // cliente|profissional (visual)

      // Evita flicker suave
      root?.classList.remove("dp-ready");
      await sleep(20);

      // Session (optional on public pages)
      const sess = await getSessionUser(client);
      const authUser = sess.user;

      let me = null;
      if(authUser){
        const r = await getUsuarioByAuthUid(client, authUser.id);
        if(r.error) console.error(r.error);
        me = r.usuario || null;
      }

      // target
      const params = new URLSearchParams(location.search);
      const targetIdParam = params.get("id");
      let targetId = targetIdParam || me?.id || null;

      if(pageMode === "self" && !me){
        toast("Faça login para ver seu perfil.");
        setTimeout(()=> window.location.href="login.html", 600);
        return;
      }

      if(!targetId){
        toast("Perfil não encontrado.");
        return;
      }

      const tRes = await getUsuarioById(client, targetId);
      if(tRes.error){
        console.error(tRes.error);
        toast("Erro ao carregar perfil.");
        return;
      }

      const target = tRes.usuario;
      if(!target){
        toast("Usuário não encontrado.");
        return;
      }

      const canEdit = !!(me && me.id === target.id);

      const ctx = {
        client,
        me,
        target,
        targetId: target.id,
        canEdit,
        pageTheme
      };

      // Top button (Entrar/Perfil)
      const topBtn = document.getElementById("dpTopAuthBtn");
      if(topBtn){
        if(me){
          topBtn.textContent = "Perfil";
          topBtn.href = me.isProfissional ? "meuperfil.html" : "perfil-usuario.html";
        }else{
          topBtn.textContent = "Entrar";
          topBtn.href = "login.html";
        }
      }

      // Render (cada etapa protegida para não travar a UI)
      try{ renderHeader(ctx); }catch(e){ console.error(e); }
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

  try { window.dokeSetupGerenciarBtn && window.dokeSetupGerenciarBtn(ctx); } catch (_) {}

  // garante o mesmo layout do feed do index
  try { grid.classList.add("lista-cards-premium"); } catch (_) {}

  grid.innerHTML = `<div class="dp-empty">Carregando serviços...</div>`;

  // fallback simples (caso o builder do index nao exista por algum motivo)
  const fallbackCard = (anuncio) => {
    const card = document.createElement("div");
    card.className = "card-premium";
    const titulo = anuncio.titulo || "Sem titulo";
    const descricao = anuncio.descricao || "";
    const preco = anuncio.preco || "A combinar";
    const img = (anuncio.fotos && anuncio.fotos[0]) || anuncio.img || "https://placehold.co/600x400";
    card.innerHTML = `
      <button class="btn-topo-avaliacao" onclick="window.location.href='detalhes.html?id=${anuncio.id}'">
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
        <button class="btn-solicitar" onclick="window.location.href='orcamento.html?uid=${anuncio.uid}&aid=${anuncio.id}'">Solicitar Orçamento</button>
      </div>
    `;
    return card;
  };

  try {
    // Busca na coleção 'anuncios' onde o 'uid' é o do perfil atual
    const donoUid = (ctx && ctx.target && ctx.target.uid) ? ctx.target.uid : ctx.targetId;
    const q = query(
      collection(window.db, "anuncios"),
      where("uid", "==", donoUid)
    );

    const snapshot = await getDocs(q);

    // atualiza o contador (se existir)
    const countEl = document.getElementById("dpServicesCount");
    if (countEl) countEl.textContent = String(snapshot.size || 0);

    if (snapshot.empty) {
      grid.innerHTML = `<div class="dp-empty">Nenhum serviço publicado.</div>`;
      return;
    }

    grid.innerHTML = "";

    const anuncios = [];
    snapshot.forEach((docSnap) => {
      anuncios.push({ id: docSnap.id, ...docSnap.data() });
    });

    // cache para o gerenciador
    try { window.__dpCachedAnuncios = anuncios.slice(); } catch (_) {}

    // Publico: nao mostra desativados
    const listaParaRender = (ctx && ctx.canEdit) ? anuncios : anuncios.filter(a => a && a.ativo !== false);

    // Ordena (mais recentes primeiro)
    listaParaRender.sort((a,b) => {
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return db - da;
    });

    listaParaRender.forEach((anuncio) => {
      const card = (typeof window.dokeBuildCardPremium === "function")
        ? window.dokeBuildCardPremium(anuncio)
        : fallbackCard(anuncio);

      // Visual de "desativado" no perfil do dono
      try {
        if (ctx && ctx.canEdit && anuncio && anuncio.ativo === false) {
          card.classList.add("dp-anuncio-inativo");
        }
      } catch (_) {}

      grid.appendChild(card);
    });
  } catch (error) {
    console.error("Erro ao carregar serviços:", error);
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
    btn.classList.add("dp-manageBtn");
    btn.innerHTML = `<i class='bx bx-cog'></i> Gerenciar anúncios`;
    btn.onclick = (e)=>{
      e.preventDefault();
      e.stopPropagation();
      window.dokeOpenGerenciarAnuncios && window.dokeOpenGerenciarAnuncios(ctx);
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

    if(title) title.textContent = "Gerenciar anúncios";
    if(back) back.style.display = "none";
    if(foot) { foot.style.display = "none"; foot.innerHTML = ""; }

    if(!body) return;
    body.innerHTML = `<div style="padding:10px 0; color:#666;">Carregando seus anúncios...</div>`;

    const uid = ctx?.target?.uid || window.auth?.currentUser?.uid || ctx?.targetId;

    fetchAnunciosByUid(uid).then((anuncios)=>{
      window.__dpCachedAnuncios = anuncios.slice();

      if(!anuncios.length){
        body.innerHTML = `
          <div style="padding:16px; border:1px dashed #ddd; border-radius:16px; color:#666;">
            <b>Nenhum anúncio encontrado.</b><br>
            Publique seu primeiro anúncio em <a href="anunciar.html">Anuncie seu serviço</a>.
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
            <b>${escapeHtml(a.titulo || "Sem título")}</b>
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
