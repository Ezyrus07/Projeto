(function () {
  const NAV_PREBOOT_KEY = "doke_nav_preboot_target_v1";
  const ENTER_CLASS = "doke-nav-enter";
  const READY_CLASS = "doke-nav-enter-ready";
  const currentPath = `${location.pathname || ""}${location.search || ""}`;
  const currentFileName = String((location.pathname || "").split("/").pop() || "").toLowerCase();
  const isHomePage = currentFileName === "" || currentFileName === "index.html";

  function installStyle() {
    try {
      if (document.getElementById("dokeNavBootStyle")) return;
      const style = document.createElement("style");
      style.id = "dokeNavBootStyle";
      style.textContent = `
        html.${ENTER_CLASS},
        html.${ENTER_CLASS} body{
          background:#ffffff !important;
        }
        html.${ENTER_CLASS}::before{
          content:"";
          position:fixed;
          inset:0;
          z-index:2147483646;
          background:#ffffff;
          opacity:1;
          pointer-events:none;
          transition:opacity .22s ease;
        }
        html.${ENTER_CLASS}::after{
          content:"";
          position:fixed;
          left:50%;
          top:50%;
          width:112px;
          height:112px;
          transform:translate(-50%,-50%);
          z-index:2147483647;
          background:url("assets/Imagens/doke-logo.png") center/contain no-repeat;
          opacity:1;
          pointer-events:none;
          animation:dokeNavBootPulse 1s ease-in-out infinite;
          transition:opacity .18s ease;
        }
        html.${ENTER_CLASS}.${READY_CLASS}::before,
        html.${ENTER_CLASS}.${READY_CLASS}::after{
          opacity:0;
        }
        @keyframes dokeNavBootPulse{
          0%,100%{ transform:translate(-50%,-50%) scale(1); opacity:1; }
          50%{ transform:translate(-50%,-50%) scale(.965); opacity:.82; }
        }
      `;
      document.head.appendChild(style);
    } catch (_e) {}
  }

  function shouldBootTransition() {
    try {
      const targetPath = sessionStorage.getItem(NAV_PREBOOT_KEY) || "";
      if (targetPath && targetPath === currentPath) return true;
      try {
        const nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
        if (nav && (nav.type === "reload" || nav.type === "navigate")) return true;
      } catch (_e) {}
      return false;
    } catch (_e) {
      return false;
    }
  }

  function activateOverlay() {
    try {
      if (!shouldBootTransition()) return;
      installStyle();
      document.documentElement.classList.add(ENTER_CLASS);
    } catch (_e) {}
  }

  function clearOverlay() {
    try {
      sessionStorage.removeItem(NAV_PREBOOT_KEY);
      document.documentElement.classList.remove(ENTER_CLASS, READY_CLASS);
    } catch (_e) {}
  }

  function finishOverlay() {
    try {
      if (!document.documentElement.classList.contains(ENTER_CLASS)) return;
      document.documentElement.classList.add(READY_CLASS);
      setTimeout(clearOverlay, 220);
    } catch (_e) {}
  }

  function forceHomeTop() {
    if (!isHomePage) return;
    try {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    } catch (_e) {}
    try {
      window.scrollTo(0, 0);
    } catch (_e) {}
  }

  activateOverlay();
  forceHomeTop();

  document.addEventListener("DOMContentLoaded", function () {
    requestAnimationFrame(forceHomeTop);
  }, { once: true });

  window.addEventListener("pageshow", function (ev) {
    requestAnimationFrame(forceHomeTop);
    if (ev && ev.persisted) finishOverlay();
  });

  window.addEventListener("load", function () {
    requestAnimationFrame(forceHomeTop);
    finishOverlay();
  }, { once: true });

  setTimeout(finishOverlay, 1800);
})();
