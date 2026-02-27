
/* ============================================================
   DOKE - NEGÓCIOS (page script)
   - Não usa seções do index (categorias/vídeos/anúncios) para evitar conteúdo repetido
   - Busca dados da tabela "negócios" (Supabase) quando existir
   - Vídeos: tenta "videos_negocios" (se não existir, exibe vazio)
   - Mapa: Leaflet + OpenStreetMap (beta)
   ============================================================ */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const sb = window.sb;
  const hasSB = () => sb && typeof sb.from === "function";

  const els = {
    q: $("#inputBuscaNegocios"),
    btnGo: $("#btnProcurarNegocios"),
    btnCircle: $("#btnSearchCircleNegocios"),
    chips: $$(".chips-negócios .chip"),
    catTrack: $("#listaCategoriasNegocios"),
    catPrev: $("#negCatPrev"),
    catNext: $("#negCatNext"),
    vidTrack: $("#tiktokScrollNegocios"),
    vidPrev: $("#negVidPrev"),
    vidNext: $("#negVidNext"),
    vidEmpty: $("#negVideosEmpty"),
    destaques: $("#negDestaques"),
    destaquesEmpty: $("#negDestaquesEmpty"),
    resultados: $("#negResultados"),
    resultadosEmpty: $("#negResultadosEmpty"),
    resultadosMeta: $("#negResultadosMeta"),
    locText: $("#negLocText"),
    locPill: $("#negLocPill"),
    geoBtn: $("#btnGeoNegocios"),
    mapEl: $("#negMap"),
    mapNote: $("#negMapNote"),
  };

  const state = {
    chip: "Tudo",
    city: "",
    bairro: "",
    lat: null,
    lng: null,
    map: null,
    markers: [],
    userMarker: null,
    lastResults: [],
  };

  const ICONS = {
    "Restaurantes": "bx bx-bowl-hot",
    "Cafés": "bx bx-coffee-togo",
    "Mercados": "bx bx-store",
    "Lojas": "bx bx-shopping-bag",
    "Serviços": "bx bx-wrench",
    "Saúde": "bx bx-plus-medical",
    "Beleza": "bx bx-cut",
    "Auto": "bx bx-car",
    "Delivery": "bx bx-cycling",
    "Perto": "bx bx-navigation",
    "Pets": "bx bx-bone",
    "Educação": "bx bx-book",
    "Casa": "bx bx-home",
    "Farmácias": "bx bx-capsule",
  };

  function safeText(v, fallback = "") {
    if (v === null || v === undefined) return fallback;
    const s = String(v).trim();
    return s ? s : fallback;
  }

  function getLocFromStorage() {
    const city = localStorage.getItem("doke_loc_cidade") || localStorage.getItem("doke_cidade") || "";
    const bairro = localStorage.getItem("doke_loc_bairro") || localStorage.getItem("doke_bairro") || "";
    const lat = parseFloat(localStorage.getItem("doke_loc_lat") || localStorage.getItem("doke_lat") || "");
    const lng = parseFloat(localStorage.getItem("doke_loc_lng") || localStorage.getItem("doke_lng") || "");
    return {
      city: safeText(city),
      bairro: safeText(bairro),
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    };
  }

  function setLocToStorage({ city, bairro, lat, lng }) {
    if (city) localStorage.setItem("doke_loc_cidade", city);
    if (bairro) localStorage.setItem("doke_loc_bairro", bairro);
    if (Number.isFinite(lat)) localStorage.setItem("doke_loc_lat", String(lat));
    if (Number.isFinite(lng)) localStorage.setItem("doke_loc_lng", String(lng));
  }

  function updateLocUI() {
    const parts = [];
    if (state.bairro) parts.push(state.bairro);
    if (state.city) parts.push(state.city);
    if (parts.length) {
      els.locText.textContent = parts.join(", ");
    } else {
      els.locText.textContent = "Defina sua localização para ver negócios perto de você.";
    }
  }

  function debounce(fn, wait = 250) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function setupCarousel(track, prevBtn, nextBtn, step = 280) {
    if (!track || !prevBtn || !nextBtn) return;
    prevBtn.addEventListener("click", () => track.scrollBy({ left: -step, behavior: "smooth" }));
    nextBtn.addEventListener("click", () => track.scrollBy({ left: step, behavior: "smooth" }));
  }

  function pickBizFields(row) {
    const id = row.id ?? row.negocio_id ?? row.uuid ?? row.slug ?? null;
    const nome = safeText(row.nome || row.nome_fantasia || row.titulo || row.razao_social, "Negócio");
    const categoria = safeText(row.categoria || row.segmento || row.tipo, "");
    const bairro = safeText(row.bairro || row.distrito || "", "");
    const cidade = safeText(row.cidade || row.municipio || "", "");
    const cover = safeText(row.capa_url || row.banner_url || row.capa || row.cover_url || "", "");
    const logo = safeText(row.logo_url || row.foto_url || row.avatar_url || row.logo || "", "");
    const rating = row.avaliacao_media ?? row.rating ?? row.media_avaliacao ?? null;
    const ratingCount = row.num_avaliacoes ?? row.rating_count ?? row.total_avaliacoes ?? null;
    const lat = row.lat ?? row.latitude ?? null;
    const lng = row.lng ?? row.longitude ?? null;

    return { id, nome, categoria, bairro, cidade, cover, logo, rating, ratingCount, lat, lng };
  }

  function renderBizCard(row) {
    const b = pickBizFields(row);

    const coverHtml = b.cover
      ? `<img src="${b.cover}" alt="${b.nome}" loading="lazy">`
      : "";

    const logoHtml = b.logo
      ? `<img src="${b.logo}" alt="${b.nome}" loading="lazy">`
      : `<span>${b.nome.slice(0, 1).toUpperCase()}</span>`;

    const ratingText =
      (b.rating !== null && b.rating !== undefined && b.rating !== "")
        ? `${Number(b.rating).toFixed(1)}â˜…${b.ratingCount ? ` (${b.ratingCount})` : ""}`
        : "";

    const metaBits = [];
    if (b.categoria) metaBits.push(`<span class="neg-pill"><i class='bx bx-purchase-tag-alt'></i> ${b.categoria}</span>`);
    const loc = [b.bairro, b.cidade].filter(Boolean).join(", ");
    if (loc) metaBits.push(`<span><i class='bx bx-map'></i> ${loc}</span>`);
    if (ratingText) metaBits.push(`<span><i class='bx bx-star'></i> ${ratingText}</span>`);

    const hrefPerfil = b.id ? `negócio.html?id=${encodeURIComponent(b.id)}` : "negócio.html";
    const hrefChat = b.id ? `chat.html?negocio_id=${encodeURIComponent(b.id)}` : "chat.html";

    return `
      <article class="neg-card">
        <div class="neg-cover">${coverHtml}</div>
        <div class="neg-body">
          <div class="neg-logo">${logoHtml}</div>
          <div class="neg-info">
            <h3 class="neg-name" title="${b.nome}">${b.nome}</h3>
            <div class="neg-meta">${metaBits.join("")}</div>
            <div class="neg-actions">
              <a class="btn btn-secondary" href="${hrefPerfil}"><i class='bx bx-store'></i>&nbsp;Ver negócio</a>
              <a class="btn btn-primary" href="${hrefChat}"><i class='bx bx-message-rounded-dots'></i>&nbsp;Chat</a>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function setEmpty(el, show) {
    if (!el) return;
    el.hidden = !show;
  }

  async function reverseGeocode(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=16&addressdetails=1`;
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!res.ok) return null;
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
      const bairro = addr.suburb || addr.neighbourhood || addr.quarter || "";
      return { city: safeText(city), bairro: safeText(bairro) };
    } catch {
      return null;
    }
  }

  function initMap() {
    if (!els.mapEl || !window.L) return;

    const start = getLocFromStorage();
    const center = (start.lat && start.lng) ? [start.lat, start.lng] : [-12.97, -38.50]; // Salvador fallback
    const zoom = (start.lat && start.lng) ? 13 : 11;

    state.map = window.L.map(els.mapEl, { zoomControl: true }).setView(center, zoom);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(state.map);

    if (start.lat && start.lng) {
      state.userMarker = window.L.marker([start.lat, start.lng]).addTo(state.map).bindPopup("Você está aqui");
      els.mapNote.style.display = "none";
    }
  }

  function clearMarkers() {
    if (!state.map) return;
    state.markers.forEach(m => m.remove());
    state.markers = [];
  }

  function updateMapMarkers(rows) {
    if (!state.map || !window.L) return;
    clearMarkers();

    const pts = [];
    for (const r of rows) {
      const b = pickBizFields(r);
      const lat = Number(b.lat);
      const lng = Number(b.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      pts.push([lat, lng]);
      const marker = window.L.marker([lat, lng]).addTo(state.map);
      marker.bindPopup(`<b>${b.nome}</b><br>${[b.bairro, b.cidade].filter(Boolean).join(", ")}`);
      state.markers.push(marker);
    }

    if (pts.length) {
      const bounds = window.L.latLngBounds(pts);
      state.map.fitBounds(bounds.pad(0.2));
    }
  }

  async function loadCategories() {
    // fallback base
    const fallback = [
      { name: "Restaurantes", icon: ICONS["Restaurantes"] },
      { name: "Cafés", icon: ICONS["Cafés"] },
      { name: "Mercados", icon: ICONS["Mercados"] },
      { name: "Farmácias", icon: ICONS["Farmácias"] },
      { name: "Lojas", icon: ICONS["Lojas"] },
      { name: "Saúde", icon: ICONS["Saúde"] },
      { name: "Beleza", icon: ICONS["Beleza"] },
      { name: "Auto", icon: ICONS["Auto"] },
      { name: "Delivery", icon: ICONS["Delivery"] },
      { name: "Pets", icon: ICONS["Pets"] },
      { name: "Educação", icon: ICONS["Educação"] },
      { name: "Casa", icon: ICONS["Casa"] },
    ];

    let list = fallback.map(x => ({ ...x, count: null }));

    if (hasSB()) {
      try {
        const { data, error } = await sb.from("negocios").select("categoria").limit(1500);
        if (!error && Array.isArray(data) && data.length) {
          const freq = new Map();
          for (const row of data) {
            const cat = safeText(row.categoria || row.segmento || row.tipo, "");
            if (!cat) continue;
            const key = cat;
            freq.set(key, (freq.get(key) || 0) + 1);
          }
          const top = Array.from(freq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([name, count]) => ({
              name,
              count,
              icon: ICONS[name] || "bx bx-store-alt"
            }));
          if (top.length) list = top;
        }
      } catch { /* silent */ }
    }

    if (!els.catTrack) return;
    els.catTrack.innerHTML = list.map(item => `
      <div class="cat-card" role="listitem" data-cat="${encodeURIComponent(item.name)}">
        <div class="cat-icon"><i class="${item.icon}"></i></div>
        <p class="cat-name">${item.name}</p>
        ${item.count ? `<div class="cat-count">${item.count} negócios</div>` : ``}
      </div>
    `).join("");

    // click to apply chip / search
    $$(".cat-card", els.catTrack).forEach(card => {
      card.addEventListener("click", () => {
        const cat = decodeURIComponent(card.dataset.cat || "");
        if (!cat) return;
        setChip(cat);
        // move view to results
        $("#negResultados")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  async function loadVideos() {
    if (!els.vidTrack) return;

    // Start empty; only fill if table exists.
    els.vidTrack.innerHTML = "";
    setEmpty(els.vidEmpty, false);

    if (!hasSB()) {
      setEmpty(els.vidEmpty, true);
      return;
    }

    try {
      const { data, error } = await sb.from("videos_negocios").select("*").order("created_at", { ascending: false }).limit(10);
      if (error || !Array.isArray(data) || data.length === 0) {
        setEmpty(els.vidEmpty, true);
        return;
      }

      els.vidTrack.innerHTML = data.map((row) => {
        const url = safeText(row.url || row.video_url || "");
        const thumb = safeText(row.thumb_url || row.thumbnail_url || row.capa_url || "");
        const label = safeText(row.titulo || row.nome || "Vídeo");
        const media = url ? `<video src="${url}" muted playsinline></video>` : (thumb ? `<img src="${thumb}" alt="${label}" loading="lazy">` : "");
        return `
          <div class="video-card">
            ${media}
            <div class="video-badge">BETA</div>
          </div>
        `;
      }).join("");
    } catch {
      // relation might not exist
      setEmpty(els.vidEmpty, true);
    }
  }

  async function fetchNegocios({ q, chip, limit = 18 } = {}) {
    if (!hasSB()) return [];
    let query = sb.from("negocios").select("*").limit(limit);

    const Q = safeText(q, "");
    const C = safeText(chip, "Tudo");

    // location hint: if we have city, prefer it (soft filter via ilike)
    if (state.city) {
      query = query.ilike("cidade", `%${state.city}%`);
    }

    if (C && C !== "Tudo" && C !== "Perto") {
      // best-effort: match categoria or segmento
      query = query.or(`categoria.ilike.%${C}%,segmento.ilike.%${C}%,tipo.ilike.%${C}%`);
    }

    if (C === "Perto") {
      // Without PostGIS, "perto" vira filtro por cidade/bairro
      if (state.bairro) query = query.ilike("bairro", `%${state.bairro}%`);
    }

    if (Q.length >= 2) {
      // search across common fields (best-effort)
      const esc = Q.replace(/[%_,]/g, " "); // avoid breaking ilike syntax
      query = query.or(
        `nome.ilike.%${esc}%,nome_fantasia.ilike.%${esc}%,titulo.ilike.%${esc}%,descrição.ilike.%${esc}%,categoria.ilike.%${esc}%,bairro.ilike.%${esc}%`
      );
    } else if (Q.length > 0) {
      // too short, don't query aggressively
      return [];
    }

    // prefer newest (if col exists)
    try { query = query.order("created_at", { ascending: false }); } catch { /* ignore */ }

    const { data, error } = await query;
    if (error || !Array.isArray(data)) return [];
    return data;
  }

  async function loadDestaques() {
    if (!els.destaques) return;

    els.destaques.innerHTML = "";
    setEmpty(els.destaquesEmpty, false);

    if (!hasSB()) {
      setEmpty(els.destaquesEmpty, true);
      return;
    }

    try {
      let q = sb.from("negocios").select("*").limit(6);
      try { q = q.order("created_at", { ascending: false }); } catch {}
      const { data, error } = await q;
      if (error || !Array.isArray(data) || data.length === 0) {
        setEmpty(els.destaquesEmpty, true);
        return;
      }
      els.destaques.innerHTML = data.map(renderBizCard).join("");
    } catch {
      setEmpty(els.destaquesEmpty, true);
    }
  }

  async function runSearch() {
    const q = safeText(els.q?.value, "");
    const chip = state.chip;

    if (els.resultadosMeta) {
      els.resultadosMeta.textContent = q.length >= 2
        ? `Mostrando resultados para "${q}"` + (chip && chip !== "Tudo" ? ` em ${chip}` : "")
        : "Digite pelo menos 2 letras.";
    }

    els.resultados.innerHTML = "";
    setEmpty(els.resultadosEmpty, false);

    if (q.length > 0 && q.length < 2) {
      setEmpty(els.resultadosEmpty, true);
      updateMapMarkers([]);
      return;
    }

    const rows = await fetchNegocios({ q, chip, limit: 24 });
    state.lastResults = rows;

    if (!rows.length) {
      setEmpty(els.resultadosEmpty, true);
      updateMapMarkers([]);
      return;
    }

    els.resultados.innerHTML = rows.map(renderBizCard).join("");
    setEmpty(els.resultadosEmpty, true); // hide empty

    updateMapMarkers(rows);
  }

  function setChip(chip) {
    state.chip = chip;

    els.chips.forEach(btn => {
      const active = btn.dataset.chip === chip;
      btn.classList.toggle("is-active", active);
    });

    // Perto sugere geolocalização
    if (chip === "Perto" && (!state.lat || !state.lng)) {
      els.mapNote.style.display = "";
    }

    runSearch();
  }

  async function useGeolocation() {
    if (!navigator.geolocation) {
      alert("Seu navegador não suporta geolocalização.");
      return;
    }

    els.geoBtn?.classList.add("is-loading");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      state.lat = latitude;
      state.lng = longitude;

      setLocToStorage({ lat: latitude, lng: longitude });

      const rev = await reverseGeocode(latitude, longitude);
      if (rev?.city) state.city = rev.city;
      if (rev?.bairro) state.bairro = rev.bairro;
      setLocToStorage({ city: state.city, bairro: state.bairro });

      updateLocUI();

      if (state.map) {
        state.map.setView([latitude, longitude], 14);
        if (state.userMarker) state.userMarker.remove();
        state.userMarker = window.L.marker([latitude, longitude]).addTo(state.map).bindPopup("Você está aqui");
        els.mapNote.style.display = "none";
      }

      // se o usuário ativar a localização, refaz os destaques e a busca
      await loadDestaques();
      await runSearch();
      els.geoBtn?.classList.remove("is-loading");
    }, (err) => {
      console.warn(err);
      alert("Não consegui obter sua localização. Verifique as permissões do navegador.");
      els.geoBtn?.classList.remove("is-loading");
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  function initLoc() {
    const loc = getLocFromStorage();
    state.city = loc.city;
    state.bairro = loc.bairro;
    state.lat = loc.lat;
    state.lng = loc.lng;
    updateLocUI();
  }

  function bindEvents() {
    if (els.geoBtn) els.geoBtn.addEventListener("click", useGeolocation);

    // Chips
    els.chips.forEach(btn => {
      btn.addEventListener("click", () => setChip(btn.dataset.chip || "Tudo"));
    });

    // Intercepta possível listener global do index
    const clickCapture = (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      runSearch();
    };
    els.btnGo?.addEventListener("click", clickCapture, true);
    els.btnCircle?.addEventListener("click", clickCapture, true);

    // Enter no input
    els.q?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runSearch();
      }
    });

    // Busca ao digitar (debounce)
    const onInput = debounce(() => {
      const v = safeText(els.q?.value, "");
      if (v.length === 0) {
        els.resultados.innerHTML = "";
        setEmpty(els.resultadosEmpty, true);
        updateMapMarkers([]);
        if (els.resultadosMeta) els.resultadosMeta.textContent = "Digite pelo menos 2 letras.";
        return;
      }
      if (v.length >= 2) runSearch();
    }, 320);
    els.q?.addEventListener("input", onInput);

    setupCarousel(els.catTrack, els.catPrev, els.catNext, 360);
    setupCarousel(els.vidTrack, els.vidPrev, els.vidNext, 380);
  }

  async function init() {
    initLoc();
    initMap();
    bindEvents();

    await loadCategories();
    await loadVideos();
    await loadDestaques();

    // estado inicial
    setEmpty(els.resultadosEmpty, true);
  }

  // Wait for supabase init if needed
  const boot = () => init().catch(console.error);
  if (hasSB()) boot();
  else {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (hasSB() || tries > 40) {
        clearInterval(t);
        boot();
      }
    }, 150);
  }
})();



