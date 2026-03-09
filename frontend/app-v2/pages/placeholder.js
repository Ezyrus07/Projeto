(() => {
  const key = "__DOKE_V2_PAGE_PLACEHOLDER__";
  if (window[key]) return;

  function normalizeRoute(path) {
    return String(path || "").toLowerCase().split("/").pop() || "rota";
  }

  function mountPlaceholder(ctx) {
    const path = normalizeRoute(ctx && ctx.path);
    const page = document.createElement("section");
    page.className = "doke-v2-page doke-v2-page-placeholder";
    page.innerHTML = `
      <div class="doke-v2-card">
        <h1>Página em migração</h1>
        <p><strong>${path}</strong> ainda está sendo portada para o app v2.</p>
        <p>Estamos priorizando consistência visual e responsividade antes de ativar todos os comportamentos.</p>
      </div>
    `;
    ctx.root.appendChild(page);
    return {
      unmount() {
        try { page.remove(); } catch (_e) {}
      }
    };
  }

  window[key] = { mountPlaceholder };
})();
