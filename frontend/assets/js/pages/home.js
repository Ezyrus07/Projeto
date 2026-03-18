(function () {
  "use strict";

  const PAGE = document.body && document.body.dataset ? document.body.dataset.page : "";
  if (PAGE !== "home") return;

  const el = {
    q: document.getElementById("homeQuery"),
    go: document.getElementById("homeSearchBtn"),
    featured: document.getElementById("homeFeatured"),
    empty: document.getElementById("homeEmpty"),
    loading: document.getElementById("homeLoading")
  };

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[m]));
  }

  function formatNum(n) {
    try {
      return new Intl.NumberFormat("pt-BR").format(Number(n) || 0);
    } catch (_e) {
      return String(Number(n) || 0);
    }
  }

  function getClient() {
    const client = window.sb || window.supabaseClient || window.sbClient || window.__supabaseClient;
    if (client && typeof client.from === "function") return client;
    return null;
  }

  function resolveAvatarUrl(client, foto) {
    const f = String(foto || "").trim();
    if (!f) return "";
    if (/^https?:\/\//i.test(f)) return f;
    if (f.includes("/storage/v1/object/public/")) return f;
    try {
      const pub = client && client.storage && client.storage.from && client.storage.from("perfil")?.getPublicUrl?.(f);
      const url = pub && pub.data ? pub.data.publicUrl : "";
      return String(url || "").trim();
    } catch (_e) {
      return "";
    }
  }

  function proCard(client, p) {
    const uid = String(p.id || p.uid || "").trim();
    const nome = String(p.nome || p.name || p.full_name || "").trim() || "Profissional";
    const categoria = String(p.categoria || p.profissao || p.ocupacao || "").trim();
    const cidade = String(p.cidade || "").trim();
    const estado = String(p.estado || p.uf || "").trim();
    const pontos = Number(p.pontos || p.points || 0) || 0;
    const nivel = Number(p.nivel || p.level || 0) || 0;
    const foto = p.avatar_url || p.avatarUrl || p.foto || p.fotoPerfil || p.profile_picture;
    const avatarUrl = resolveAvatarUrl(client, foto);

    const loc = [cidade, estado].filter(Boolean).join(" · ");
    const badges = [];
    if (categoria) badges.push(`<span class="doke-chip">${esc(categoria)}</span>`);
    if (nivel) badges.push(`<span class="doke-chip">Nível ${esc(nivel)}</span>`);
    if (pontos) badges.push(`<span class="doke-chip">${esc(formatNum(pontos))} pts</span>`);

    const letter = (nome || "U").trim().charAt(0).toUpperCase();
    const href = uid ? `perfil-profissional.html?uid=${encodeURIComponent(uid)}` : "perfil-profissional.html";

    return `
      <article class="home-proCard">
        <div class="home-proTop">
          <div class="home-avatar" aria-hidden="true">
            ${avatarUrl ? `<img alt="" loading="lazy" decoding="async" src="${esc(avatarUrl)}"/>` : esc(letter)}
          </div>
          <div>
            <h3 class="home-proName">${esc(nome)}</h3>
            <p class="home-proMeta">${esc(loc || "Brasil")}</p>
          </div>
        </div>
        ${badges.length ? `<div class="home-proBadges">${badges.join("")}</div>` : ""}
        <div class="home-proActions">
          <a class="doke-btn" href="${esc(href)}">Ver perfil</a>
          <a class="doke-btn doke-btn--secondary" href="busca.html?q=${encodeURIComponent(categoria || nome)}">Buscar similares</a>
        </div>
      </article>
    `;
  }

  function showLoading(on) {
    if (el.loading) el.loading.style.display = on ? "" : "none";
  }

  function showEmpty(on) {
    if (el.empty) el.empty.hidden = !on;
  }

  function renderFeatured(client, list) {
    if (!el.featured) return;
    el.featured.innerHTML = (list || []).map((p) => proCard(client, p)).join("");
  }

  async function loadFeatured() {
    const client = getClient();
    showLoading(true);
    showEmpty(false);

    if (!client) {
      showLoading(false);
      showEmpty(true);
      return;
    }

    try {
      const res = await client
        .from("usuarios")
        .select("id,uid,nome,categoria,profissao,ocupacao,cidade,estado,uf,pontos,nivel,avatar_url,foto,fotoPerfil,profile_picture,created_at")
        .limit(12);

      const data = res && Array.isArray(res.data) ? res.data : [];
      renderFeatured(client, data);
      showLoading(false);
      showEmpty(data.length === 0);
    } catch (_e) {
      showLoading(false);
      showEmpty(true);
    }
  }

  function goSearch() {
    const q = String(el.q && el.q.value ? el.q.value : "").trim();
    const target = q ? `busca.html?q=${encodeURIComponent(q)}` : "busca.html";
    window.location.href = target;
  }

  function init() {
    if (el.go) el.go.addEventListener("click", function (e) { e.preventDefault(); goSearch(); });
    if (el.q) el.q.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); goSearch(); } });
    loadFeatured();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();

