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
    let navQueue = Promise.resolve();
    const ENTER_MS = 320;
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
      const shouldAnimate = prevNodes.length > 0 && mode !== "replace";
      let minHeightPx = 0;
      if (shouldAnimate) {
        try {
          const hRoot = Math.ceil(root.getBoundingClientRect().height || 0);
          const hPrev = Math.ceil(
            prevNodes.reduce((max, node) => {
              if (!(node instanceof HTMLElement)) return max;
              return Math.max(max, Math.ceil(node.getBoundingClientRect().height || 0));
            }, 0)
          );
          minHeightPx = Math.max(hRoot, hPrev, 320);
          root.classList.add("is-routing");
          if (minHeightPx > 0) root.style.minHeight = `${minHeightPx}px`;
        } catch (_e) {}
      }
      if (shouldAnimate) {
        prevNodes.forEach((node) => {
          if (node instanceof HTMLElement) node.classList.add("doke-v2-route-leave");
        });
      }

      const mountRoot = document.createElement("div");
      mountRoot.className = shouldAnimate ? "doke-v2-route doke-v2-route-enter" : "doke-v2-route";
      root.appendChild(mountRoot);

      mounted = await factory({ root: mountRoot, path: keyPath, search: parsed.search });
      current = keyFull;
      if (onAfterNavigate) {
        try { onAfterNavigate(keyPath); } catch (_e) {}
      }

      if (shouldAnimate) {
        try {
          window.requestAnimationFrame(() => {
            mountRoot.classList.add("is-visible");
          });
        } catch (_e) {
          mountRoot.classList.add("is-visible");
        }
        await new Promise((resolve) => window.setTimeout(resolve, ENTER_MS));
      }
      if (prevMounted && typeof prevMounted.unmount === "function") {
        try { prevMounted.unmount(); } catch (_e) {}
      }
      prevNodes.forEach((node) => {
        try { node.remove(); } catch (_e) {}
      });
      if (shouldAnimate) {
        try { mountRoot.classList.remove("doke-v2-route-enter"); } catch (_e) {}
        try {
          root.classList.remove("is-routing");
          root.style.minHeight = "";
        } catch (_e) {}
      }

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
      navQueue = navQueue
        .catch(() => {})
        .then(() => mountPath(to, "push"));
      await navQueue;
    }

    function resolveInternalHref(anchor, ev) {
      if (!(anchor instanceof HTMLAnchorElement)) return null;
      if (ev.defaultPrevented) return null;
      if (typeof ev.button === "number" && ev.button !== 0) return null;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return null;
      if (anchor.hasAttribute("download")) return null;
      if (anchor.hasAttribute("data-v2-native")) return null;

      const target = String(anchor.getAttribute("target") || "").toLowerCase();
      if (target && target !== "_self") return null;

      const rawHref = String(anchor.getAttribute("href") || "").trim();
      if (!rawHref) return null;
      const lower = rawHref.toLowerCase();
      if (lower.startsWith("#") || lower.startsWith("javascript:") || lower.startsWith("mailto:") || lower.startsWith("tel:")) return null;

      let url = null;
      try { url = new URL(rawHref, location.href); } catch (_e) { return null; }
      if (!url || url.origin !== location.origin) return null;
      if (url.hash && url.pathname === location.pathname && url.search === location.search) return null;

      const parsed = parseTarget(`${url.pathname}${url.search || ""}`);
      if (!routes.has(parsed.file)) return null;
      return `${parsed.file}${parsed.search || ""}`;
    }

    function bindLinks() {
      document.addEventListener("click", (ev) => {
        const target = ev.target;
        if (!(target instanceof Element)) return;
        const anchor = target.closest("a[href]");
        if (!(anchor instanceof HTMLAnchorElement)) return;
        const to = resolveInternalHref(anchor, ev);
        if (!to) return;
        ev.preventDefault();
        navigate(to);
      }, true);
    }

    function bindPopState() {
      window.addEventListener("popstate", () => {
        navQueue = navQueue
          .catch(() => {})
          .then(() => mountPath(`${location.pathname}${location.search || ""}`, "replace"));
      });
    }

    async function start(initialPath) {
      bindLinks();
      bindPopState();
      const first = String(initialPath || `${location.pathname}${location.search || ""}`);
      navQueue = navQueue
        .catch(() => {})
        .then(() => mountPath(first, "replace"));
      await navQueue;
    }

    return { register, start, navigate };
  }

  window[key] = { createRouter };
})();
