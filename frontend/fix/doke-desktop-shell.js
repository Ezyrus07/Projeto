(function(){
  // Deprecated shell bootstrap kept only for backward compatibility.
  // Unified desktop/mobile chrome is now handled exclusively by doke-shell.js.
  if (window.__DOKE_SHELL_BUILD__) return;
  if (window.__DOKE_SHELL_BOOTSTRAP__) return;
  window.__DOKE_SHELL_BOOTSTRAP__ = true;
  try{
    const hasUnified = Array.from(document.scripts || []).some((s) =>
      String(s.getAttribute("src") || "").includes("doke-shell.js")
    );
    if (hasUnified) return;
    const script = document.createElement("script");
  script.src = "doke-shell.js?v=20260309v97";
    script.defer = true;
    document.head.appendChild(script);
  }catch(_e){}
})();


