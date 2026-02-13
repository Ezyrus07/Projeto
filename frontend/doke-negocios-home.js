
/* Doke - Negócios (home) - mantém o layout do index e só troca dados/fluxo */
(function(){
  if (window.__dokeNegociosHomeLoaded) return;
  window.__dokeNegociosHomeLoaded = true;

  function isNegocios(){
    return document.body && document.body.dataset && document.body.dataset.kind === "negocios";
  }

  function el(tag, attrs={}, children=[]){
    const n = document.createElement(tag);
    Object.entries(attrs||{}).forEach(([k,v])=>{
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) n.setAttribute(k, v);
    });
    (children||[]).forEach(c=>{
      if (c === null || c === undefined) return;
      if (typeof c === "string") n.appendChild(document.createTextNode(c));
      else n.appendChild(c);
    });
    return n;
  }

  const CATEGORIAS = [
    { key:"restaurantes", label:"Restaurantes", icon:"bx bx-bowl-hot" },
    { key:"cafes", label:"Cafés", icon:"bx bx-coffee-togo" },
    { key:"mercados", label:"Mercados", icon:"bx bx-basket" },
    { key:"farmacias", label:"Farmácias", icon:"bx bx-plus-medical" },
    { key:"lojas", label:"Lojas", icon:"bx bx-store" },
    { key:"servicos", label:"Serviços", icon:"bx bx-briefcase-alt-2" },
    { key:"saude", label:"Saúde", icon:"bx bx-heart" },
    { key:"beleza", label:"Beleza", icon:"bx bx-cut" },
    { key:"auto", label:"Auto", icon:"bx bx-car" },
    { key:"delivery", label:"Delivery", icon:"bx bx-package" },
    { key:"perto", label:"Perto", icon:"bx bx-navigation" },
  ];

  let map = null;
  let markersLayer = null;
  let lastNegocios = [];

  function ensureMap(){
    const mapEl = document.getElementById("mapNegocios");
    if (!mapEl) return null;
    if (!window.L) return null;

    if (map) return map;

    map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false, tap: false });
    const start = getSavedCenter() || { lat: -12.9714, lng: -38.5014, zoom: 12 }; // Salvador
    map.setView([start.lat, start.lng], start.zoom || 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    map.on("moveend", ()=>{
      const c = map.getCenter();
      saveCenter({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    });

    // desbloqueia scroll só quando o mouse está em cima do mapa
    mapEl.addEventListener("mouseenter", ()=>{ map.scrollWheelZoom.enable(); });
    mapEl.addEventListener("mouseleave", ()=>{ map.scrollWheelZoom.disable(); });

    return map;
  }

  function saveCenter(obj){
    try { localStorage.setItem("doke_negocios_map_center", JSON.stringify(obj)); } catch(e){}
  }
  function getSavedCenter(){
    try { return JSON.parse(localStorage.getItem("doke_negocios_map_center")||"null"); } catch(e){ return null; }
  }

  async function usarLocalizacao(){
    if (!navigator.geolocation){
      alert("Seu navegador não suporta localização.");
      return;
    }
    return new Promise((resolve)=>{
      navigator.geolocation.getCurrentPosition((pos)=>{
        const { latitude, longitude } = pos.coords;
        const m = ensureMap();
        if (m){
          m.setView([latitude, longitude], 15);
          L.circleMarker([latitude, longitude], { radius: 8 }).addTo(m);
        }
        resolve({ lat: latitude, lng: longitude });
      }, (err)=>{
        console.warn("[NEGÓCIOS] Erro geolocalização:", err);
        alert("Não consegui acessar sua localização. Verifique as permissões do navegador.");
        resolve(null);
      }, { enableHighAccuracy: true, timeout: 8000 });
    });
  }

  function bindLocalizacaoBtns(){
    const b1 = document.getElementById("btnUsarLocalizacaoTopo");
    const b2 = document.getElementById("btnUsarLocalizacaoMapa");
    [b1,b2].forEach(btn=>{
      if (!btn) return;
      btn.addEventListener("click", async ()=>{
        await usarLocalizacao();
        const mapEl = document.getElementById("mapNegocios");
        if (mapEl) mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  function renderCategorias(){
    const wrap = document.getElementById("listaCategorias");
    if (!wrap) return;

    wrap.innerHTML = "";
    CATEGORIAS.forEach(cat=>{
      const card = el("button", { class:"cat-card", type:"button", "data-cat": cat.key }, [
        el("div", { class:"cat-icon" }, [ el("i", { class: cat.icon }) ]),
        el("div", { class:"cat-text" }, [
          el("div", { class:"cat-title" }, [cat.label]),
          el("div", { class:"cat-sub" }, ["Negócios"])
        ])
      ]);
      card.addEventListener("click", ()=>{
        executarBuscaNegocios(cat.label);
      });
      wrap.appendChild(card);
    });
  }

  function setVideosEmpty(){
    const gal = document.getElementById("galeria-dinamica");
    if (!gal) return;
    gal.innerHTML = "";
    const empty = el("div", { class:"tiktok-empty" }, [
      el("div", { class:"tiktok-empty-inner" }, [
        el("i", { class:"bx bx-video-off tiktok-empty-ico" }),
        el("div", { class:"tiktok-empty-title" }, ["Nenhum vídeo curto disponível por aqui ainda."]),
        el("div", { class:"tiktok-empty-sub" }, ["Quando você anunciar um negócio, poderá postar vídeos curtos (em breve)."])
      ])
    ]);
    gal.appendChild(empty);
  }

  function getSb(){
    return window.sb || null;
  }

  function normalizeNegocio(row){
    return {
      id: row.id ?? row.uuid ?? row.negocio_id ?? null,
      nome: row.nome ?? row.titulo ?? row.name ?? "Negócio",
      categoria: row.categoria ?? row.tipo ?? row.segmento ?? "",
      descricao: row.descricao ?? row.descrição ?? row.sobre ?? "",
      bairro: row.bairro ?? "",
      cidade: row.cidade ?? "",
      uf: row.uf ?? "",
      capa: row.capa_url ?? row.capa ?? row.foto_capa ?? row.banner_url ?? "",
      foto: row.foto_url ?? row.foto ?? row.logo_url ?? "",
      rating: row.rating ?? row.media_avaliacao ?? row.media ?? null,
      total: row.total_avaliacoes ?? row.qtd_avaliacoes ?? row.avaliacoes ?? null,
      aberto: row.aberto_agora ?? row.aberto ?? null,
      delivery: row.delivery ?? row.entrega ?? null,
      lat: row.lat ?? row.latitude ?? null,
      lng: row.lng ?? row.longitude ?? null,
      created_at: row.created_at ?? row.criado_em ?? null
    };
  }

  function buildNegocioCard(n){
    const imgSrc = n.capa || n.foto || "";
    const hasImg = !!imgSrc;

    const thumb = hasImg
      ? el("img", { src: imgSrc, alt: n.nome, loading:"lazy", class:"anuncio-thumb-img" })
      : el("div", { class:"anuncio-thumb-placeholder" }, [ el("span", { class:"anuncio-thumb-emoji" }, ["ðŸª"]) ]);

    const locParts = [n.bairro, n.cidade].filter(Boolean).join(", ");
    const ratingTxt = (n.rating !== null && n.rating !== undefined) ? String(n.rating).replace(".", ",") : "";
    const totalTxt = (n.total !== null && n.total !== undefined) ? `(${n.total})` : "";

    const badges = [];
    if (n.aberto === true) badges.push(el("span", { class:"badge badge-open" }, ["Aberto agora"]));
    if (n.delivery === true) badges.push(el("span", { class:"badge badge-delivery" }, ["Delivery"]));

    const card = el("article", { class:"card-premium negocio-card" }, [
      el("div", { class:"card-premium-top" }, [
        el("div", { class:"card-premium-thumb" }, [thumb]),
        el("div", { class:"card-premium-info" }, [
          el("div", { class:"card-premium-title" }, [n.nome]),
          el("div", { class:"card-premium-sub" }, [
            n.categoria ? el("span", { class:"muted" }, [n.categoria]) : null,
            (n.categoria && locParts) ? " • " : null,
            locParts ? el("span", { class:"muted" }, [locParts]) : null
          ]),
          (ratingTxt ? el("div", { class:"card-premium-rating" }, [
            el("i", { class:"bx bxs-star" }),
            el("span", {}, [ratingTxt]),
            (totalTxt ? el("span", { class:"muted" }, [" ", totalTxt]) : null)
          ]) : null),
          (badges.length ? el("div", { class:"card-premium-badges" }, badges) : null)
        ])
      ]),
      el("div", { class:"card-premium-actions" }, [
        el("a", { class:"btn-action ghost", href: `negocio.html?id=${encodeURIComponent(n.id||"")}` }, [
          el("i", { class:"bx bx-store" }), " Ver negócio"
        ]),
        el("a", { class:"btn-action primary", href: `chat.html?negocio=${encodeURIComponent(n.id||"")}` }, [
          el("i", { class:"bx bx-chat" }), " Chat"
        ])
      ])
    ]);

    return card;
  }

  function renderNegociosList(rows, termo){
    const feed = document.getElementById("feedAnuncios");
    if (!feed) return;

    feed.innerHTML = "";
    const meta = document.getElementById("metaResultadosNegocios");
    if (meta){
      if (termo){
        meta.style.display = "block";
        meta.textContent = `Resultados para: ${termo}`;
      } else {
        meta.style.display = "none";
        meta.textContent = "";
      }
    }

    if (!rows || rows.length === 0){
      const empty = el("div", { class:"empty-premium" }, [
        el("div", { class:"empty-title" }, ["Nenhum negócio encontrado."]),
        el("div", { class:"empty-sub" }, ["Tente buscar por categoria, bairro, cidade ou nome."]),
      ]);
      feed.appendChild(empty);

      // Exemplo (apenas quando não há nada)
      const example = buildNegocioCard({
        id:"exemplo",
        nome:"Café Pituba",
        categoria:"Cafés",
        bairro:"Pituba",
        cidade:"Salvador",
        rating:4.8,
        total:128,
        aberto:true,
        delivery:true,
        capa:"",
        foto:""
      });
      example.classList.add("is-example");
      const tag = el("div", { class:"example-tag" }, ["Exemplo"]);
      example.prepend(tag);
      feed.appendChild(example);
      lastNegocios = [];
      updateMapMarkers([]);
      return;
    }

    rows.forEach(r=>{
      feed.appendChild(buildNegocioCard(r));
    });

    lastNegocios = rows;
    updateMapMarkers(rows);
  }

  function updateMapMarkers(rows){
    const m = ensureMap();
    if (!m || !markersLayer) return;

    markersLayer.clearLayers();
    const bounds = [];

    (rows||[]).forEach(n=>{
      if (n.lat == null || n.lng == null) return;
      const marker = L.marker([Number(n.lat), Number(n.lng)]);
      const loc = [n.bairro, n.cidade].filter(Boolean).join(", ");
      marker.bindPopup(`<b>${escapeHtml(n.nome)}</b><br>${escapeHtml(n.categoria||"")}${loc ? "<br>"+escapeHtml(loc) : ""}`);
      marker.addTo(markersLayer);
      bounds.push([Number(n.lat), Number(n.lng)]);
    });

    if (bounds.length){
      try { m.fitBounds(bounds, { padding:[24,24] }); } catch(e){}
    }
  }

  function escapeHtml(str){
    return String(str||"").replace(/[&<>"']/g, (c)=>({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
  }

  async function carregarNegocios(termo){
    const sb = getSb();
    const feed = document.getElementById("feedAnuncios");
    if (!feed) return;

    // loading
    feed.innerHTML = "";
    feed.appendChild(el("div", { class:"skeleton-card" }, ["Carregando negócios..."]));

    if (!sb){
      feed.innerHTML = "";
      feed.appendChild(el("div", { class:"empty-premium" }, [
        el("div", { class:"empty-title" }, ["Supabase não está pronto."]),
        el("div", { class:"empty-sub" }, ["Verifique o supabase-init.js e as chaves no seu projeto."])
      ]));
      return;
    }

    try {
      let q = sb.from("negocios").select("*").limit(40);

      if (termo && termo.trim()){
        const t = termo.trim();
        // tenta buscar em várias colunas comuns
        const like = `%${t}%`;
        q = q.or(
          `nome.ilike.${like},descricao.ilike.${like},categoria.ilike.${like},bairro.ilike.${like},cidade.ilike.${like}`
        );
      }

      // ordenação robusta
      q = q.order("created_at", { ascending: false });

      const { data, error } = await q;
      if (error) throw error;

      const normalized = (data || []).map(normalizeNegocio);
      renderNegociosList(normalized, termo);

    } catch (e){
      console.error("[NEGÓCIOS] Erro ao carregar:", e);
      feed.innerHTML = "";
      feed.appendChild(el("div", { class:"empty-premium" }, [
        el("div", { class:"empty-title" }, ["Erro ao carregar negócios."]),
        el("div", { class:"empty-sub" }, ["Confira se a tabela 'negocios' existe e se as colunas estão corretas."])
      ]));
    }
  }

  function setupBusca(){
    const input = document.getElementById("inputBusca");
    const btn = document.querySelector(".btn-procurar");
    if (!input || !btn) return;

    function run(){
      const termo = (input.value || "").trim();
      if (!termo) return;
      if (typeof window.salvarBusca === "function") window.salvarBusca(termo);
      carregarNegocios(termo);
    }

    btn.addEventListener("click", (e)=>{ e.preventDefault(); run(); });
    input.addEventListener("keydown", (e)=>{
      if (e.key === "Enter"){
        e.preventDefault();
        run();
      }
    });

    // expõe para o script.js reaproveitar
    window.executarBuscaNegocios = (termo)=>{
      const t = (termo || "").trim();
      if (!t) return;
      input.value = t;
      if (typeof window.salvarBusca === "function") window.salvarBusca(t);
      carregarNegocios(t);
    };
  }

  function addMetaPlaceholder(){
    // injeta uma linha pequena de resultados, sem alterar layout
    const feed = document.getElementById("feedAnuncios");
    if (!feed) return;
    const parent = feed.parentElement;
    if (!parent) return;

    if (!document.getElementById("metaResultadosNegocios")){
      const meta = el("div", { id:"metaResultadosNegocios", class:"resultados-meta", style:"display:none;margin:10px 0 0;color:#475569;font-weight:700;" }, []);
      parent.insertBefore(meta, feed);
    }
  }

  function injectStyles(){
    if (document.getElementById("dokeNegociosHomeStyle")) return;
    const css = `
      body[data-kind="negocios"] .cat-card .cat-sub{ opacity:.75; font-size:12px; }
      body[data-kind="negocios"] .tiktok-empty{ padding: 22px; width: 100%; }
      body[data-kind="negocios"] .tiktok-empty-inner{
        border:1px dashed rgba(15,23,42,.18);
        border-radius: 18px;
        padding: 22px;
        background: rgba(255,255,255,.65);
        text-align:center;
      }
      body[data-kind="negocios"] .tiktok-empty-ico{ font-size: 28px; opacity:.75; }
      body[data-kind="negocios"] .tiktok-empty-title{ margin-top: 8px; font-weight: 900; }
      body[data-kind="negocios"] .tiktok-empty-sub{ margin-top: 6px; color:#64748b; }
      body[data-kind="negocios"] .empty-feed-negocios{ padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,.65); border: 1px dashed rgba(15,23,42,.18); color:#64748b; font-weight: 700; }
      body[data-kind="negocios"] .empty-premium{
        border:1px dashed rgba(15,23,42,.18);
        border-radius: 18px;
        padding: 18px;
        background: rgba(255,255,255,.65);
        margin: 10px 0;
      }
      body[data-kind="negocios"] .empty-title{ font-weight: 900; }
      body[data-kind="negocios"] .empty-sub{ margin-top: 6px; color:#64748b; }
      body[data-kind="negocios"] .skeleton-card{
        border-radius: 18px;
        padding: 18px;
        background: linear-gradient(90deg, rgba(226,232,240,.55), rgba(241,245,249,.85), rgba(226,232,240,.55));
        animation: dokeSk 1.4s infinite;
        font-weight: 800;
        color: #0f172a;
      }
      @keyframes dokeSk{
        0%{ filter: brightness(1); }
        50%{ filter: brightness(1.05); }
        100%{ filter: brightness(1); }
      }
      body[data-kind="negocios"] .negocio-card .anuncio-thumb-img{
        width:100%; height:100%; object-fit:cover; display:block;
      }
      body[data-kind="negocios"] .negocio-card .card-premium-thumb{
        width: 90px; height: 90px; border-radius: 16px; overflow:hidden;
        background: rgba(15,23,42,.06);
      }
      body[data-kind="negocios"] .negocio-card .anuncio-thumb-placeholder{
        width:100%; height:100%; display:flex; align-items:center; justify-content:center;
      }
      body[data-kind="negocios"] .negocio-card .anuncio-thumb-emoji{ font-size: 30px; opacity:.9; }
      body[data-kind="negocios"] .card-premium-badges{ display:flex; gap:8px; margin-top: 8px; flex-wrap: wrap; }
      body[data-kind="negocios"] .badge{
        font-size: 11px; font-weight: 800;
        padding: 6px 10px; border-radius: 999px;
        background: rgba(15,23,42,.06);
        border: 1px solid rgba(15,23,42,.10);
      }
      body[data-kind="negocios"] .badge-open{ background: rgba(16,185,129,.12); border-color: rgba(16,185,129,.25); color: #065f46; }
      body[data-kind="negocios"] .badge-delivery{ background: rgba(2,132,199,.10); border-color: rgba(2,132,199,.22); color: #075985; }
      body[data-kind="negocios"] .is-example{ margin-top: 12px; position: relative; }
      body[data-kind="negocios"] .example-tag{
        position:absolute; top: 10px; right: 10px;
        background: rgba(15,23,42,.85); color:#fff;
        padding: 6px 10px; font-weight: 900; font-size: 11px;
        border-radius: 999px;
      }
    `;
    const style = document.createElement("style");
    style.id = "dokeNegociosHomeStyle";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function init(){
    if (!isNegocios()) return;

    injectStyles();
    bindLocalizacaoBtns();
    renderCategorias();
    setVideosEmpty();
    addMetaPlaceholder();
    setupBusca();

    // carrega sem termo (listagem inicial)
    carregarNegocios("");

    // se vier ?q=... na URL, busca direto
    const params = new URLSearchParams(window.location.search);
    const q = (params.get("q") || "").trim();
    if (q) {
      window.executarBuscaNegocios(q);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();



