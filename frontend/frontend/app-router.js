(function(){
  // Doke App Router (hash-based) - App Shell persistent like X/Twitter
  window.__DOKE_USE_APP_ROUTER__ = true;

  const APP_VIEW_ID = "app-view";
  const APP_HEAD_ID = "app-route-head";

  const CORE_ASSETS = new Set([
    "style.css",
    "doke-a11y.css",
    "doke-layout-fix.css",
    "doke-fixes.css",
    "doke-beforeafter.css",
    "doke-toast.css",
    "doke-alerts.css",
    "doke-ux.css",
    "doke-feedpatch.css",
    "doke-shell.css",
    "doke-responsive.css",
    "doke-skeleton.css",
    "doke-tablet-fix.css",
    "doke-router.css"
  ]);

  const CORE_SCRIPTS = new Set([
    "supabase-init.js",
    "firebase-compat-supabase.js",
    "firebase-auth-compat-supabase.js",
    "script.js",
    "doke-beforeafter.js",
    "doke-reco.js",
    "doke-toast.js",
    "doke-alerts.js",
    "doke-config.js",
    "doke-ux.js",
    "doke-feedpatch.js",
    "doke-shell.js",
    "app-router.js"
  ]);

  const ROUTES = {
    "": "index.html",
    "#": "index.html",
    "#/": "index.html",
    "#/home": "index.html",
    "#/search": "busca.html",
    "#/comunidades": "comunidade.html",
    "#/negocios": "negocios.html",
    "#/pedidos": "pedidos.html",
    "#/notificacoes": "notificacoes.html",
    "#/mensagens": "mensagens.html",
    "#/perfil": "meuperfil.html",
    "#/mais": "mais.html"
  };

  function routeToFile(path){
    // Primary known routes
    if(ROUTES[path]) return ROUTES[path];

    // Generic route: #/p/<file>.html (used to cover the rest of the site)
    // Examples:
    //   app.html#/p/ajuda.html
    //   app.html#/p/minha-conta.html
    const m = String(path||"").match(/^#\/p\/([^?#]+)$/i);
    if(m && m[1]){
      const raw = decodeURIComponent(m[1]);
      // Prevent path traversal
      const file = raw.replace(/\\/g, "/").split("/").pop();
      if(!file) return null;
      const clean = file.replace(/[^a-z0-9_.-]/gi, "");
      if(!clean.toLowerCase().endsWith(".html")) return null;
      return clean;
    }
    return null;
  }

  function safeURL(href){
    try{ return new URL(href, location.href); }catch(_e){ return null; }
  }

  function splitHash(){
    const raw = String(location.hash || "");
    // allow: #/search?q=x  OR  #/search?x=y
    const idx = raw.indexOf("?");
    const path = idx>=0 ? raw.slice(0, idx) : raw;
    const qs = idx>=0 ? raw.slice(idx+1) : "";
    const params = new URLSearchParams(qs);
    return { raw, path, params };
  }

  function setActiveNav(path){
    // Desktop sidebar active
    document.querySelectorAll(".sidebar-icones .item").forEach(it => it.classList.remove("active"));
    const map = {
      "#/home":"home",
      "#/search":"search",
      "#/comunidades":"comunidades",
      "#/negocios":"negocios",
      "#/pedidos":"pedidos",
      "#/notificacoes":"notificacoes",
      "#/mensagens":"mensagens",
      "#/perfil":"perfil",
      "#/mais":"mais"
    };
    const key = map[path] || "home";
    const target = document.querySelector(`.sidebar-icones .item[data-nav="${key}"]`);
    if(target) target.classList.add("active");
  }

  function cleanupRouteAssets(){
    document.querySelectorAll('link[data-route="1"]').forEach(el => el.remove());
    document.querySelectorAll('style[data-route="1"]').forEach(el => el.remove());
    document.querySelectorAll('script[data-route="1"]').forEach(el => el.remove());
  }

  function isCoreAssetHref(href, set){
    if(!href) return false;
    const u = safeURL(href);
    if(!u) return false;
    const file = u.pathname.split("/").pop();
    if(!file) return false;
    // Normalize (remove ?v=...)
    const base = file.split("?")[0];
    for (const s of set){
      if (base.startsWith(s)) return true;
    }
    return false;
  }

  function adoptStyles(doc){
    const head = document.head;
    const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]'));
    links.forEach(l => {
      const href = l.getAttribute("href");
      if(isCoreAssetHref(href, CORE_ASSETS)) return;
      // avoid duplicates
      const u = safeURL(href);
      if(!u) return;
      const key = u.pathname.split("/").pop().split("?")[0];
      if(document.querySelector(`link[data-route="1"][data-key="${key}"]`)) return;
      const clone = document.createElement("link");
      clone.rel = "stylesheet";
      clone.href = href;
      clone.setAttribute("data-route","1");
      clone.setAttribute("data-key", key);
      head.appendChild(clone);
    });

    // Nota: NÃO importar <style> inline das páginas.
    // Muitos HTMLs antigos têm CSS global (body/:root) inline e isso quebra o app shell.
    // Páginas que dependem de CSS inline devem migrar para um .css externo (link),
    // que é carregado acima de forma segura/cached.
  }

  function setRouteClass(routeName){
    const prev = document.body.getAttribute('data-route') || '';
    if(prev){
      try{ document.body.classList.remove('route-' + prev); }catch(_e){}
    }
    document.body.setAttribute('data-route', routeName);
    try{ document.body.classList.add('route-' + routeName); }catch(_e){}
  }

  async function runRouteScripts(scripts){
    for(const s of scripts){
      const el = document.createElement("script");
      el.setAttribute("data-route","1");
      if (s.src){
        el.src = s.src;
        el.async = false;
        await new Promise((res, rej)=>{
          el.onload = ()=>res();
          el.onerror = ()=>res(); // don't block
          document.body.appendChild(el);
        });
      } else {
        el.textContent = s.textContent || "";
        document.body.appendChild(el);
      }
    }
  }

  function collectRouteScripts(doc){
    const scripts = Array.from(doc.querySelectorAll("script"));
    const out = [];
    for(const s of scripts){
      const src = s.getAttribute("src");
      if(src){
        if(isCoreAssetHref(src, CORE_SCRIPTS)) continue;
        out.push({ src });
      } else {
        // IMPORTANT:
        // Do NOT execute inline scripts from legacy pages inside the app shell.
        // Inline blocks frequently contain redirects, duplicated bootstraps,
        // or global DOM writes that cause flicker/loops. Page-specific logic
        // must live in external .js files (script src=...).
        continue;
      }
    }
    return out;
  }

  function extractMain(doc){
    // Prefer <main>, else common containers, else body
    return doc.querySelector("main") ||
           doc.querySelector("#main") ||
           doc.querySelector(".main") ||
           doc.querySelector(".conteudo") ||
           doc.body;
  }

  function normalizeAnchors(container){
    // Rewrite internal anchors to hash routes to avoid full reload.
    container.querySelectorAll('a[href]').forEach(a=>{
      const href = (a.getAttribute("href")||"").trim();
      if(!href) return;
      if(href.startsWith("#")) return;
      if(href.startsWith("mailto:") || href.startsWith("tel:")) return;

      // External full URLs keep
      if(/^https?:\/\//i.test(href)){
        try{
          const u = new URL(href, location.href);
          if(u.origin !== location.origin) return;
        }catch(_e){ return; }
      }

      // Normalize to basename (handles ./page.html, /frontend/page.html, etc)
      const raw = href.split("#")[0].split("?")[0];
      const file = raw.toLowerCase().split("/").pop().replace(/^\.\/+/, "");
      const map = {
        // Never route the shell through itself (prevents #/p/app.html loops)
        "app.html":"#/home",
        "index.html":"#/home",
        "busca.html":"#/search",
        "comunidade.html":"#/comunidades",
        "negocios.html":"#/negocios",
        "pedidos.html":"#/pedidos",
        "notificacoes.html":"#/notificacoes",
        "mensagens.html":"#/mensagens",
        "meuperfil.html":"#/perfil",
        "mais.html":"#/mais"
      };
      if(map[file]){
        // keep querystring if any
        const qidx = href.indexOf("?");
        const qs = qidx>=0 ? href.slice(qidx) : "";
        a.setAttribute("href", map[file] + qs.replace("?", "?"));
      } else if(file.endsWith(".html")) {
        // Generic pages -> route through app shell
        const qidx = href.indexOf("?");
        const qs = qidx>=0 ? href.slice(qidx) : "";
        a.setAttribute("href", "#/p/" + encodeURIComponent(file) + (qs ? qs.replace("?","?") : ""));
      }
    });
  }

  function stripDuplicateShell(container){
    // Remove duplicated nav/header elements coming from legacy pages.
    // We keep ONLY the shell header/sidebar/bottom-nav.
    const selectors = [
      'header.navbar',
      'header#header',
      'header.header',
      '.navbar',
      '.navbar-mobile',
      '.topbar',
      '.topbar-container',
      '.menu-topo',
      '.sidebar',
      '.sidebar-icones',
      '.bottom-nav',
      '.mobile-bottom-nav'
    ];
    selectors.forEach(sel => {
      container.querySelectorAll(sel).forEach(el => {
        // avoid nuking legitimate in-page headers (e.g. section headers) by only removing large containers
        const tag = (el.tagName||"").toLowerCase();
        const cls = (el.className||"").toString();
        if(tag === 'header' || cls.includes('navbar') || cls.includes('topbar') || cls.includes('sidebar') || cls.includes('bottom')){
          el.remove();
        }
      });
    });
  }

  async function loadRoute(){
    const view = document.getElementById(APP_VIEW_ID);
    if(!view) return;

    const { path, params } = splitHash();
    let normalizedPath = path || "#/home";

    // Guard rails: never allow routing to the shell itself.
    // This happens when something generates #/p/app.html (blank screen / loop).
    if(/^#\/p\/app\.html$/i.test(normalizedPath)){
      normalizedPath = "#/home";
      if(location.hash !== normalizedPath) location.hash = normalizedPath;
      // Stop here to avoid rendering twice during a correction.
      return;
    }

    const targetFile = routeToFile(normalizedPath) || ROUTES["#/home"];

    // Extra safety: if route resolution still points to app.html, fallback.
    if(String(targetFile).toLowerCase() === "app.html"){
      if(location.hash !== "#/home") location.hash = "#/home";
      return;
    }

    // route name used for body class (route-home, route-pedidos, ...)
    const routeName = (normalizedPath || "#/home")
      .replace(/^#\/?/, "")
      .replace(/\?.*$/, "")
      .replace(/[^a-z0-9_-]/gi, "")
      .toLowerCase() || "home";

    setActiveNav(normalizedPath);

    // show lightweight loading (no skeleton)
    view.setAttribute("aria-busy","true");
    view.classList.add("doke-route-loading");

    cleanupRouteAssets();

    let html = "";
    try{
      // Use normal caching (avoid aggressive re-fetch that can amplify flicker)
      const res = await fetch(targetFile, { cache: "no-cache" });
      html = await res.text();
    }catch(e){
      view.innerHTML = `<div style="padding:26px"><h2 style="margin:0 0 8px">Falha ao carregar</h2><p style="margin:0;color:#64748b">Não consegui abrir ${targetFile}. Verifique sua conexão.</p></div>`;
      view.classList.remove("doke-route-loading");
      view.setAttribute("aria-busy","false");
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const title = doc.querySelector("title")?.textContent?.trim();
    if(title) document.title = title;

    adoptStyles(doc);
    setRouteClass(routeName);

    const main = extractMain(doc);
    // IMPORTANT: Inject the full <main> (outerHTML) so page CSS selectors targeting main.* keep working.
    const htmlToInject = main ? main.outerHTML : doc.body.innerHTML;

    // Replace view content
    view.innerHTML = htmlToInject;

    // Remove legacy duplicated header/sidebar/bottom-nav inside injected content
    stripDuplicateShell(view);

    // Normalize any internal links inside injected view
    normalizeAnchors(view);

    // Apply search query param if route is search
    if(normalizedPath === "#/search" && params && params.get("q")){
      try{
        const q = params.get("q");
        const input = view.querySelector('input[type="search"], input#searchInput, input[name="q"], input[placeholder*="Buscar"]');
        if(input && !input.value) input.value = q;
      }catch(_e){}
    }

    // Fire a route event (pages can hook)
    try{
      window.dispatchEvent(new CustomEvent("doke:route", { detail: { path: normalizedPath, route: routeName, file: targetFile }}));
    }catch(_e){}

    // Execute page scripts AFTER DOM injection
    const routeScripts = collectRouteScripts(doc);
    await runRouteScripts(routeScripts);

    // allow any legacy scripts that check DOMContentLoaded by re-dispatching
    try{
      document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true }));
    }catch(_e){}

    // Scroll to top like X (content area)
    try{ window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }catch(_e){ try{ window.scrollTo(0,0);}catch(__){} }

    view.classList.remove("doke-route-loading");
    view.setAttribute("aria-busy","false");
  }

  function interceptLinkClicks(){
    document.addEventListener("click", (ev)=>{
      const a = ev.target?.closest?.("a");
      if(!a) return;
      const href = (a.getAttribute("href")||"").trim();
      if(!href) return;
      // already a hash route
      if(href.startsWith("#/")){
        ev.preventDefault();
        if(location.hash === href) return;
        location.hash = href;
        return;
      }

      // internal html navigation -> route through shell
      const rawFile = href.split("#")[0].split("?")[0].toLowerCase();
      const baseFile = rawFile.replace(/\\/g,"/").split("/").pop().replace(/^\.\/+/,'');
      if(baseFile.endsWith(".html")){
        // ignore external
        if(/^https?:\/\//i.test(href)){
          try{ const u = new URL(href, location.href); if(u.origin !== location.origin) return; }catch(_e){ return; }
        }
        const qidx = href.indexOf("?");
        const qs = qidx>=0 ? href.slice(qidx) : "";
        ev.preventDefault();
        const mapped = {
          "app.html":"#/home",
          "index.html":"#/home",
          "busca.html":"#/search",
          "comunidade.html":"#/comunidades",
          "negocios.html":"#/negocios",
          "pedidos.html":"#/pedidos",
          "notificacoes.html":"#/notificacoes",
          "mensagens.html":"#/mensagens",
          "meuperfil.html":"#/perfil",
          "mais.html":"#/mais"
        };
        const route = mapped[baseFile] || ("#/p/" + encodeURIComponent(baseFile));
        const full = route + (qs ? qs.replace("?","?") : "");
        if(location.hash === full) return;
        location.hash = full;
      }
    }, { capture: true });
  }

  function boot(){
    interceptLinkClicks();
    window.addEventListener("hashchange", loadRoute);
    // If the shell is opened directly (no hash), default to home.
    // Avoid deriving a route from pathname (which would be app.html).
    if(!location.hash || location.hash === "#" || location.hash === "#/"){
      location.hash = "#/home";
      // Setting hash triggers hashchange -> loadRoute
      return;
    }
    loadRoute();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();