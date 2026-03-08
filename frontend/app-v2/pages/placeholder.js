(() => {
  const key = "__DOKE_V2_PAGE_PLACEHOLDER__";
  if (window[key]) return;

  function mountPlaceholder(ctx) {
    const path = String(ctx && ctx.path || "").toLowerCase();
    const page = document.createElement("section");
    page.className = "doke-v2-page";
    page.innerHTML = `
      <div class="doke-v2-card">
        <h1>Página em migração</h1>
        <p><strong>${path || "rota"}</strong> ainda será portada para o app v2.</p>
        <p>Home já está puxando o conteúdo real legado dentro do shell novo.</p>
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

