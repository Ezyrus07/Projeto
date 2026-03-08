(() => {
  const key = "__DOKE_V2_ROUTER__";
  if (window[key]) return;

  function parseTarget(target) {
    const raw = String(target || "");
    const noHash = raw.split("#")[0];
    const queryIndex = noHash.indexOf("?");
    const pathPart = queryIndex >= 0 ? noHash.slice(0, queryIndex) : noHash;
    const search = queryIndex >= 0 ? noHash.slice(queryIndex) : "";
    const file = String(pathPart || "")
      .toLowerCase()
      .split("/")
      .pop() || "index.html";
    return { file, search };
  }

  function createRouter(opts) {
    const routes = new Map();
    let current = null;
    let mounted = null;
    const root = opts && opts.root;
    const onAfterNavigate = opts && typeof opts.onAfterNavigate === "function" ? opts.onAfterNavigate : null;

    function register(path, factory) {
      const parsed = parseTarget(path);
      routes.set(parsed.file, factory);
    }

    async function mountPath(path, mode) {
      const parsed = parseTarget(path);
      const keyPath = parsed.file;
      const keyFull = `${parsed.file}${parsed.search}`;
      const factory = routes.get(parsed.file) || routes.get("index.html");
      if (!factory) return;
      const prevMounted = mounted;
      const prevNodes = Array.from(root.children || []);
      prevNodes.forEach((node) => {
        if (node instanceof HTMLElement) node.classList.add("doke-v2-route-leave");
      });

      const mountRoot = document.createElement("div");
      mountRoot.className = "doke-v2-route doke-v2-route-enter";
      root.appendChild(mountRoot);

      mounted = await factory({ root: mountRoot, path: keyPath, search: parsed.search });
      current = keyFull;
      if (onAfterNavigate) {
        try { onAfterNavigate(keyPath); } catch (_e) {}
      }

      try {
        window.requestAnimationFrame(() => {
          mountRoot.classList.add("is-visible");
        });
      } catch (_e) {
        mountRoot.classList.add("is-visible");
      }

      window.setTimeout(() => {
        if (prevMounted && typeof prevMounted.unmount === "function") {
          try { prevMounted.unmount(); } catch (_e) {}
        }
        prevNodes.forEach((node) => {
          try { node.remove(); } catch (_e) {}
        });
        try { mountRoot.classList.remove("doke-v2-route-enter"); } catch (_e) {}
      }, 170);

      const nextHref = `${keyPath === "index.html" ? "index.html" : keyPath}${parsed.search || ""}`;
      if (mode === "push") {
        history.pushState({ dokeV2: 1, path: nextHref }, "", nextHref);
      } else if (mode === "replace") {
        history.replaceState({ dokeV2: 1, path: nextHref }, "", nextHref);
      }
    }

    async function navigate(path) {
      const parsed = parseTarget(path);
      const to = `${parsed.file}${parsed.search}`;
      if (to === current) return;
      await mountPath(to, "push");
    }

    function bindLinks() {
      document.addEventListener("click", (ev) => {
        const target = ev.target;
        if (!(target instanceof Element)) return;
        const anchor = target.closest("[data-v2-link]");
        if (!(anchor instanceof HTMLAnchorElement)) return;
        const href = String(anchor.getAttribute("href") || "").trim();
        if (!href) return;
        ev.preventDefault();
        navigate(href);
      }, true);
    }

    function bindPopState() {
      window.addEventListener("popstate", () => {
        mountPath(`${location.pathname}${location.search || ""}`, "replace");
      });
    }

    async function start() {
      bindLinks();
      bindPopState();
      await mountPath(`${location.pathname}${location.search || ""}`, "replace");
    }

    return { register, start, navigate };
  }

  window[key] = { createRouter };
})();
