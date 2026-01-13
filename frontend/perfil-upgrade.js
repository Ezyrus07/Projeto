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
  async function loadPublicacoes(client, userId){
    const grid = $("#dpGridPublicacoes");
    if(!grid) return;
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
    for(const item of data){
      const media = item.tipo === "video"
        ? `<video src="${item.media_url}" controls preload="metadata"></video>`
        : `<img src="${item.media_url}" alt="">`;
      const card = document.createElement("div");
      card.className = "dp-item";
      const title = item.titulo || item.legenda || "";
      const desc = item.descricao || (item.titulo ? item.legenda : "") || "";
      card.innerHTML = `
        <div class="dp-itemMedia">${media}</div>
        <div class="dp-itemBody">
          <b>${escapeHtml(title)}</b>
          <p>${escapeHtml(desc)}</p>
        </div>
      `;
      grid.appendChild(card);
    }
  }

  async function loadReels(client, userId){
    const grid = $("#dpGridReels");
    if(!grid) return;
    grid.innerHTML = `<div class="dp-empty">Carregando vídeos curtos...</div>`;
    const { data, error } = await client
      .from("videos_curtos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending:false })
      .limit(40);
    if(error){
      if(isMissingTableError(error)){
        grid.innerHTML = `<div class="dp-empty">Nenhum vídeo curto ainda.</div>`;
        return;
      }
      grid.innerHTML = `<div class="dp-empty">Erro ao carregar. Se você ainda não criou as tabelas do perfil, rode o arquivo <b>supabase_schema.sql</b>.</div>`;
      console.error(error);
      return;
    }
    if(!data?.length){
      grid.innerHTML = `<div class="dp-empty">Sem vídeos curtos ainda.</div>`;
      return;
    }
    grid.innerHTML = "";
    for(const item of data){
      const card = document.createElement("div");
      card.className = "dp-item";
      card.innerHTML = `
        <div class="dp-itemMedia"><video src="${item.video_url}" controls preload="metadata"></video></div>
        <div class="dp-itemBody">
          <b>${escapeHtml(item.titulo || "")}</b>
          <p>${escapeHtml(item.descricao || "")}</p>
        </div>
      `;
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
  async function createPublicacao(client, ctx, { tipo, titulo, legenda, file }){
    // upload to storage
    const storageId = ctx.me?.uid || ctx.me?.id;
    const up = await uploadToStorage(client, { bucket:"perfil", path:`publicacoes/${storageId}/${crypto.randomUUID()}`, file });
    if(up.error) throw up.error;
    const payload = {
      user_id: ctx.me.id,
      tipo,
      titulo,
      legenda,
      media_url: up.url
    };
    let { error } = await client.from("publicacoes").insert(payload);
    if(error && error.code === "PGRST204"){
      const msg = String(error.message || "");
      const retry = {
        user_id: ctx.me.id,
        tipo,
        media_url: up.url
      };
      if(!msg.includes("titulo") && titulo) retry.titulo = titulo;
      if(!msg.includes("legenda")){
        retry.legenda = legenda;
      }else{
        retry.descricao = legenda;
      }
      const r2 = await client.from("publicacoes").insert(retry);
      error = r2.error || null;
    }
    if(error) throw error;
  }

  async function createReel(client, ctx, { titulo, descricao, file }){
    const storageId = ctx.me?.uid || ctx.me?.id;
    const up = await uploadToStorage(client, { bucket:"perfil", path:`reels/${storageId}/${crypto.randomUUID()}`, file });
    if(up.error) throw up.error;
    const { error } = await client.from("videos_curtos").insert({
      user_id: ctx.me.id,
      titulo,
      descricao,
      video_url: up.url
    });
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

    function activate(tab){
      buttons.forEach(b=> b.classList.toggle("active", b.dataset.tab === tab));
      sections.forEach(s=> s.style.display = (s.dataset.tab === tab ? "" : "none"));

      // Lazy load
      if(tab === "publicacoes") loadPublicacoes(ctx.client, ctx.target.id);
      if(tab === "reels") loadReels(ctx.client, ctx.target.id);
      if(tab === "servicos") loadServicos(ctx.client, ctx.target.id);
      if(tab === "portfolio") loadPortfolio(ctx.client, ctx.target.id);
      if(tab === "avaliacoes") loadAvaliacoes(ctx.client, ctx.target.id);
    }

    buttons.forEach(b=>{
      b.addEventListener("click", ()=> activate(b.dataset.tab));
    });

    // default tab
    activate("publicacoes");
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
        if(!file) return toast("Selecione um arquivo.");
        try{
          if(tipo === "curto"){
            if(!ctx.me.isProfissional) return toast("Disponivel para perfil profissional.");
            await createReel(client, ctx, {
              titulo: safeStr($("#dpPubTitulo")?.value),
              descricao: safeStr($("#dpPubDesc")?.value),
              file
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
            file
          });
          modal.close();
          toast("Publicado!");
          loadPublicacoes(ctx.client, ctx.target.id);
        }catch(e){
          console.error(e);
          toast("Erro ao publicar.");
        }
      }, { saveLabel: "Publicar", savingLabel: "Publicando..." });
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
        if(!file) return toast("Selecione um vídeo.");
        try{
          await createReel(client, ctx, {
            titulo: safeStr($("#dpReelTitulo")?.value),
            descricao: safeStr($("#dpReelDesc")?.value),
            file
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

    // Novo Serviço
    $("#dpNewServico")?.addEventListener("click", ()=>{
      if(!ctx.canEdit) return toast("Apenas no seu perfil.");
      if(!ctx.me.isProfissional) return toast("Disponível para perfil profissional.");
      modal.open("Novo serviço", `
        <div class="dp-form">
          <div>
            <label>Título</label>
            <input class="dp-input" id="dpServTitulo" placeholder="Ex: Instalação de ar-condicionado" />
          </div>
          <div class="dp-row2">
            <div>
              <label>Categoria</label>
              <input class="dp-input" id="dpServCat" placeholder="Ex: Assistência técnica" />
            </div>
            <div>
              <label>Preço (opcional)</label>
              <input class="dp-input" id="dpServPreco" placeholder="Ex: 150" inputmode="decimal" />
            </div>
          </div>
          <div>
            <label>Descrição</label>
            <textarea class="dp-textarea" id="dpServDesc"></textarea>
          </div>
        </div>
      `, async ()=>{
        const client = mustSupa();
        if(!client) return;
        try{
          await createServico(client, ctx, {
            titulo: safeStr($("#dpServTitulo")?.value),
            categoria: safeStr($("#dpServCat")?.value),
            preco: safeStr($("#dpServPreco")?.value).replace(",","."),
            descricao: safeStr($("#dpServDesc")?.value),
          });
          modal.close();
          toast("Serviço salvo!");
          loadServicos(ctx.client, ctx.target.id);
        }catch(e){
          console.error(e);
          toast("Erro ao salvar serviço.");
        }
      });
    });

    // Novo Portfolio
    $("#dpNewPortfolio")?.addEventListener("click", ()=>{
      if(!ctx.canEdit) return toast("Apenas no seu perfil.");
      if(!ctx.me.isProfissional) return toast("Disponível para perfil profissional.");
      modal.open("Novo item de portfólio", `
        <div class="dp-form">
          <div>
            <label>Arquivo (foto/vídeo)</label>
            <input class="dp-input" type="file" id="dpPortFile" accept="image/*,video/*"/>
          </div>
          <div>
            <label>Título</label>
            <input class="dp-input" id="dpPortTitulo" />
          </div>
          <div>
            <label>Descrição</label>
            <textarea class="dp-textarea" id="dpPortDesc"></textarea>
          </div>
        </div>
      `, async ()=>{
        const client = mustSupa();
        if(!client) return;
        const file = $("#dpPortFile")?.files?.[0];
        if(!file) return toast("Selecione um arquivo.");
        try{
          await createPortfolioItem(client, ctx, {
            titulo: safeStr($("#dpPortTitulo")?.value),
            descricao: safeStr($("#dpPortDesc")?.value),
            file
          });
          modal.close();
          toast("Portfólio atualizado!");
          loadPortfolio(ctx.client, ctx.target.id);
        }catch(e){
          console.error(e);
          toast("Erro ao salvar portfólio.");
        }
      });
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






