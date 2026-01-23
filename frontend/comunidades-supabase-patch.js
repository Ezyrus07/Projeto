
/* DOKE Comunidades Patch (Supabase real + sem alerts + abrir grupo) */
(function(){
  // Expor getSupabaseClient no window, se já existir como função local no script.js
  try{
    if(typeof window.getSupabaseClient !== "function" && typeof getSupabaseClient === "function"){
      window.getSupabaseClient = getSupabaseClient;
    }
  }catch(e){}

  function sb(){
    try{
      if(typeof window.getSupabaseClient === "function") return window.getSupabaseClient();
      if(typeof getSupabaseClient === "function") return getSupabaseClient();
    }catch(e){}
    // fallback para init comum
    return window.sb || window.supabaseClient || window.sbClient || null;
  }

  // Toast simples (substitui alert)
  function ensureToast(){
    if(document.getElementById("dokeToastWrap")) return;
    const wrap = document.createElement("div");
    wrap.id = "dokeToastWrap";
    wrap.style.cssText = "position:fixed;top:18px;right:18px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;";
    document.body.appendChild(wrap);
  }
  window.dokeToast = function(titulo, msg, tipo="info"){
    try{
      ensureToast();
      const el = document.createElement("div");
      el.style.cssText = "pointer-events:none;min-width:240px;max-width:360px;background:#fff;border:1px solid rgba(0,0,0,.08);box-shadow:0 12px 40px rgba(0,0,0,.12);border-radius:14px;padding:12px 14px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;";
      const top = document.createElement("div");
      top.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;";
      const h = document.createElement("div");
      h.style.cssText = "font-weight:800;font-size:14px;color:#111;";
      h.textContent = titulo || "Aviso";
      const badge = document.createElement("div");
      badge.style.cssText = "font-size:11px;font-weight:800;padding:4px 8px;border-radius:999px;background:rgba(42,95,144,.12);color:var(--cor2,#2a5f90);";
      badge.textContent = (tipo||"info").toUpperCase();
      top.appendChild(h); top.appendChild(badge);

      const p = document.createElement("div");
      p.style.cssText = "font-size:13px;color:#444;line-height:1.35;";
      p.textContent = msg || "";
      el.appendChild(top); el.appendChild(p);
      const wrap = document.getElementById("dokeToastWrap");
      wrap.appendChild(el);
      setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateY(-6px)"; el.style.transition="all .25s ease"; }, 2600);
      setTimeout(()=>{ el.remove(); }, 3000);
    }catch(e){}
  };

  // Abrir grupo (SEM alert)
  window.abrirGrupo = function(grupoId){
    if(!grupoId) return;
    window.location.href = "grupo.html?id=" + encodeURIComponent(grupoId);
  };

  // Capa default (sem texto de exemplo)
  function defaultCoverDataUrl(){
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#2a5f90"/>
            <stop offset="1" stop-color="#ecedf2"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="400" rx="36" fill="url(#g)"/>
      </svg>`;
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
  }

  // Render cards
  function tagClassFor(tipo){
    const t = (tipo||"").toLowerCase();
    if(t.includes("pro")) return "tag-pro";
    if(t.includes("cond")) return "tag-cond";
    if(t.includes("hobb")) return "tag-hobby";
    return "tag-pro";
  }

  function renderCard(comm){
    const capa = comm.capa || comm.capa_url || defaultCoverDataUrl();
    const tipo = comm.tipo || "Comunidade";
    const nome = comm.nome || "Comunidade";
    const desc = comm.descricao || "";
    const membrosCount = comm.membrosCount ?? comm.membros_count ?? (Array.isArray(comm.membros)? comm.membros.length : 1);
    const tagClass = tagClassFor(tipo);
    const id = comm.id || comm.uuid || comm.comunidade_id;
    return `
      <div class="card-comm" data-tipo="${tipo}" onclick="window.abrirGrupo('${id}')">
        <div class="card-cover" style="background-image:url('${capa}')">
          <span class="card-tag ${tagClass}">${tipo}</span>
        </div>
        <div class="card-body">
          <div class="card-icon"><img src="${capa}" style="object-fit:cover;"></div>
          <h3 class="card-title">${nome}</h3>
          <p class="card-desc">${desc}</p>
          <div class="members-preview">
            <div class="mem-avatar" style="background:#eee;"></div>
            <div class="mem-avatar" style="background:#ddd;"></div>
            <span class="mem-count">+${membrosCount} membros</span>
          </div>
          <div class="card-footer">
            <button class="btn-entrar" onclick="event.stopPropagation(); window.abrirGrupo('${id}')">Ver Grupo</button>
          </div>
        </div>
      </div>`;
  }

  function renderMyGroupItem(comm){
    const capa = comm.capa || comm.capa_url || defaultCoverDataUrl();
    const nome = comm.nome || "Comunidade";
    const id = comm.id || comm.uuid || comm.comunidade_id;
    return `
      <div class="my-group-item" onclick="window.abrirGrupo('${id}')">
        <div class="group-img-ring"><img src="${capa}" alt=""></div>
        <div class="my-group-meta">
          <div class="my-group-name">${nome}</div>
          <div class="my-group-sub">${comm.tipo || ""}</div>
        </div>
      </div>`;
  }

  async function listarComunidades(){
    const container = document.getElementById("listaComunidadesGeral");
    if(!container) return;
    const client = sb();
    if(!client?.from){
      console.error("[DOKE] Supabase client não encontrado (sb).");
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;background:white;border-radius:16px;border:1px dashed #ddd;padding:22px;color:#666;">Supabase não inicializado.</div>`;
      return;
    }

    try{
      let q = client.from("comunidades").select("*").limit(30);
      // tenta order por dataCriacao se existir
      const ordered = await q.order("dataCriacao", { ascending:false });
      let rows = ordered.data;
      if(ordered.error){
        const plain = await client.from("comunidades").select("*").limit(30);
        if(plain.error) throw plain.error;
        rows = plain.data;
      }
      container.innerHTML = "";
      if(!rows || rows.length===0){
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:22px; background:white; border-radius:16px; border:1px dashed #ddd;">
          <i class='bx bx-group' style="font-size:3rem; color:#ddd; margin-bottom:10px;"></i>
          <h4 style="color:#555;">Nenhum grupo encontrado</h4>
          <p style="color:#888; font-size:0.9rem;">Seja o primeiro a criar uma comunidade!</p>
        </div>`;
        return;
      }
      rows.forEach(r=> container.insertAdjacentHTML("beforeend", renderCard(r)));
    }catch(e){
      console.error("Erro ao listar geral:", e);
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;background:white;border-radius:16px;border:1px dashed #ddd;padding:22px;color:#666;">Erro ao carregar comunidades.</div>`;
    }
  }

  async function listarMeusGrupos(){
    const container = document.getElementById("listaMeusGrupos");
    if(!container) return;
    const user = window.auth?.currentUser;
    if(!user){
      container.innerHTML = `<div style="color:rgba(255,255,255,0.7); padding:10px; font-size:0.9rem;">Faça login para ver.</div>`;
      return;
    }
    const client = sb();
    if(!client?.from){
      console.error("[DOKE] carregarMeusGrupos: sb client não encontrado");
      container.innerHTML = `<div style="color:rgba(255,255,255,0.7); padding:10px; font-size:0.9rem;">Supabase não inicializado.</div>`;
      return;
    }
    try{
      // membros é jsonb array -> contains
      let resp = await client.from("comunidades").select("*").contains("membros", [user.uid]).limit(50);
      if(resp.error){
        // fallback para text[] (cs) ou para filtrar local se policy bloquear
        resp = await client.from("comunidades").select("*").limit(200);
        if(resp.error) throw resp.error;
        resp.data = (resp.data||[]).filter(c => Array.isArray(c.membros) && c.membros.includes(user.uid));
      }
      const rows = resp.data || [];
      container.innerHTML = "";
      if(rows.length===0){
        container.innerHTML = `<div style="color:rgba(255,255,255,0.7); padding:10px; font-size:0.9rem;">Você não participa de nenhum grupo.</div>`;
        return;
      }
      rows.forEach(r=> container.insertAdjacentHTML("beforeend", renderMyGroupItem(r)));
    }catch(e){
      console.error("Erro meus grupos:", e);
      container.innerHTML = `<div style="color:rgba(255,255,255,0.7); padding:10px; font-size:0.9rem;">Erro ao carregar seus grupos.</div>`;
    }
  }

  // Override do carregamento padrão
  window.carregarDadosComunidade = function(){
    listarComunidades();
    listarMeusGrupos();
  };

  // Override criar comunidade (supabase real, sem placeholder com texto)
  window.criarNovaComunidade = async function(e){
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector("button");
    const user = window.auth?.currentUser;
    if(!user){
      window.dokeToast("Login necessário", "Faça login para criar um grupo.", "erro");
      return;
    }
    const client = sb();
    if(!client?.from){
      window.dokeToast("Erro", "Supabase não inicializado.", "erro");
      return;
    }

    const nome = document.getElementById("commNome")?.value?.trim();
    const desc = document.getElementById("commDesc")?.value?.trim();
    const tipo = document.getElementById("commTipo")?.value || "Comunidade";
    const fileInput = document.getElementById("commFoto");

    if(!nome){
      window.dokeToast("Nome obrigatório", "Digite o nome do grupo.", "info");
      return;
    }

    btn && (btn.disabled = true, btn.innerText = "Criando...");

    try{
      let capaUrl = defaultCoverDataUrl();
      // Se selecionou foto, converte para base64 (mantém seu padrão atual)
      if(fileInput?.files?.[0]){
        capaUrl = await new Promise((resolve, reject)=>{
          const r = new FileReader();
          r.onload = ()=> resolve(String(r.result||""));
          r.onerror = reject;
          r.readAsDataURL(fileInput.files[0]);
        });
      }

      const payload = {
        donoUid: user.uid,
        nome: nome,
        descricao: desc || "",
        tipo: tipo,
        capa: capaUrl,
        membrosCount: 1,
        membros: [user.uid],
        dataCriacao: new Date().toISOString()
      };

      const ins = await client.from("comunidades").insert(payload).select("*").single();
      if(ins.error) throw ins.error;

      window.dokeToast("Grupo criado", "Sua comunidade foi criada com sucesso.", "sucesso");
      if(window.fecharModalCriarComm) window.fecharModalCriarComm();
      form?.reset?.();

      listarComunidades();
      listarMeusGrupos();
    }catch(err){
      console.error("Erro ao criar:", err);
      window.dokeToast("Erro", "Não foi possível criar o grupo. Verifique permissões (RLS).", "erro");
    }finally{
      btn && (btn.disabled = false, btn.innerText = "Criar Comunidade");
    }
  };

})();
