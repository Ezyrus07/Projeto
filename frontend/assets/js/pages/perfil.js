(function () {
  "use strict";

  const PAGE = document.body && document.body.dataset ? document.body.dataset.page : "";
  if (PAGE !== "perfil") return;

  const el = {
    name: document.getElementById("dpName"),
    handle: document.getElementById("dpHandle"),
    bio: document.getElementById("dpBio"),
    chips: document.getElementById("dpChips"),
    followers: document.getElementById("dpFollowers"),
    following: document.getElementById("dpFollowing"),
    reviews: document.getElementById("dpReviews"),
    avatarImg: document.getElementById("dpAvatarImg"),
    avatarLetter: document.getElementById("dpAvatarLetter"),
    about: document.getElementById("dpAboutText")
  };

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[m]));
  }

  function setText(node, value, fallback) {
    if (!node) return;
    const out = String(value ?? "").trim() || String(fallback ?? "");
    node.textContent = out;
  }

  function formatNum(n) {
    try {
      return new Intl.NumberFormat("pt-BR").format(Number(n) || 0);
    } catch (_e) {
      return String(Number(n) || 0);
    }
  }

  function readLocalProfile() {
    const KEYS = ["doke_usuario_perfil", "perfil_usuario", "usuario_logado", "doke_usuario_logado", "userLogado", "doke_profile_v1"];
    const merged = {};
    for (const key of KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") Object.assign(merged, parsed);
      } catch (_e) {}
    }
    return merged;
  }

  function resolveHandle(p) {
    const raw = String(p.user || p.usuario || p.username || p.handle || p.arroba || "").trim();
    if (!raw) return "@usuario";
    return raw.startsWith("@") ? raw : `@${raw}`;
  }

  function computeProgress(p) {
    const points = Number(p.pontos || p.points || p.score || p.xpTotal || p.xp_total || 0) || 0;
    const level = Math.max(1, Number(p.nivel || p.level || p.lv || (points ? (Math.floor(points / 520) + 1) : 1)));
    const currentXp = Math.max(0, Number(p.xpAtual || p.currentXp || p.xp_atual || (points % 1000)));
    const nextXp = Math.max(1000, Number(p.proximoNivelXp || p.nextLevelXp || p.xp_proximo_nivel || 1000));
    return { points, level, currentXp, nextXp };
  }

  async function getClient() {
    const client = window.sb || window.supabaseClient || window.sbClient || window.__supabaseClient;
    if (client && typeof client.from === "function") return client;
    return null;
  }

  async function fetchUsuario(client, uid) {
    try {
      const { data, error } = await client
        .from("usuarios")
        .select("*")
        .or(`id.eq.${uid},uid.eq.${uid}`)
        .limit(1)
        .maybeSingle?.();
      if (!error && data) return data;
    } catch (_e) {}
    // fallback sem maybeSingle
    try {
      const res = await client.from("usuarios").select("*").or(`id.eq.${uid},uid.eq.${uid}`).limit(1);
      const data = res && res.data && Array.isArray(res.data) ? res.data[0] : null;
      return data || null;
    } catch (_e) {
      return null;
    }
  }

  async function fetchReviewCount(client, uid) {
    try {
      const res = await client.from("avaliacoes").select("id", { count: "exact", head: true }).eq("profUid", uid);
      if (res && typeof res.count === "number") return res.count;
    } catch (_e) {}
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

  function applyProfile(p) {
    const nome = String(p.nome || p.name || p.full_name || p.fullName || "").trim() || "Meu perfil";
    const handle = resolveHandle(p);
    const bio = String(p.bio || p.descricao || p.headline || "").trim();
    const about = String(p.sobre || p.about || p.descricao_longa || "").trim();
    const cidade = String(p.cidade || p.local || p.location || "").trim();
    const estado = String(p.estado || p.uf || "").trim();
    const pais = String(p.pais || p.country || "").trim();
    const membroDesde = String(p.created_at || p.createdAt || p.membro_desde || "").trim();
    const seguidores = Number(p.seguidores || p.followers || 0) || 0;
    const seguindo = Number(p.seguindo || p.following || 0) || 0;
    const { points, level, currentXp, nextXp } = computeProgress(p);

    setText(el.name, nome);
    setText(el.handle, handle);
    if (el.bio) el.bio.textContent = bio;
    if (el.about && about) el.about.textContent = about;
    if (el.followers) el.followers.textContent = formatNum(seguidores);
    if (el.following) el.following.textContent = formatNum(seguindo);

    const chips = [];
    const prof = String(p.categoria || p.profissao || p.ocupacao || "").trim();
    if (prof) chips.push(`<span class="dp-chip">${esc(prof)}</span>`);
    const locParts = [cidade, estado, pais].filter(Boolean);
    if (locParts.length) chips.push(`<span class="dp-chip">${esc(locParts.join(" · "))}</span>`);
    chips.push(`<span class="dp-chip">Nível ${esc(level)} · ${esc(formatNum(points))} pts</span>`);
    chips.push(`<span class="dp-chip">${esc(formatNum(currentXp))} / ${esc(formatNum(nextXp))} XP</span>`);
    if (membroDesde) chips.push(`<span class="dp-chip">Membro desde ${esc(String(membroDesde).slice(0, 10))}</span>`);
    if (el.chips) el.chips.innerHTML = chips.join("");

    // Remover card de progress da página (shell já mostra pontos/nível)
    try { document.getElementById("dpProgressCard")?.remove(); } catch (_e) {}
    try {
      document.querySelectorAll(".dp-progressCard").forEach((node, idx) => {
        if (idx === 0) node.remove();
      });
    } catch (_e) {}

    // Avatar
    const letter = (nome || "U").trim().charAt(0).toUpperCase();
    if (el.avatarLetter) el.avatarLetter.textContent = letter;
  }

  async function init() {
    const uid = await (window.DokeAuth && window.DokeAuth.getUid ? window.DokeAuth.getUid({ liveTimeoutMs: 2200 }) : Promise.resolve(""));
    const local = readLocalProfile();

    const client = await getClient();
    const base = { ...local };

    if (uid && client) {
      const u = await fetchUsuario(client, uid);
      if (u) Object.assign(base, u);
      const count = await fetchReviewCount(client, uid);
      if (typeof count === "number") base.avaliacoes = count;

      const foto = base.foto || base.avatar_url || base.avatarUrl || base.fotoPerfil || base.profile_picture;
      const url = resolveAvatarUrl(client, foto);
      if (url) base.avatar_url = url;
    }

    applyProfile(base);

    // Avatar final (com URL resolvida)
    const avatarUrl = String(base.avatar_url || base.avatarUrl || base.foto || base.fotoPerfil || "").trim();
    if (el.avatarImg && avatarUrl) {
      el.avatarImg.src = avatarUrl;
      el.avatarImg.style.display = "block";
      if (el.avatarLetter) el.avatarLetter.style.display = "none";
    }

    // Tabs (mínimo necessário para não quebrar navegação interna do perfil)
    try {
      const tabs = Array.from(document.querySelectorAll(".dp-tab[data-tab]"));
      const sections = Array.from(document.querySelectorAll(".dp-section[data-tab]"));
      const show = (key) => {
        tabs.forEach((t) => t.classList.toggle("active", t.getAttribute("data-tab") === key));
        sections.forEach((s) => {
          const on = s.getAttribute("data-tab") === key;
          s.style.display = on ? "" : "none";
        });
      };
      tabs.forEach((t) => t.addEventListener("click", () => show(String(t.getAttribute("data-tab") || ""))));
      const current = tabs.find((t) => t.classList.contains("active"))?.getAttribute("data-tab") || tabs[0]?.getAttribute("data-tab") || "";
      if (current) show(String(current));
    } catch (_e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();

