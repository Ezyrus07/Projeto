(() => {
  const key = "__DOKE_V2_PAGE_AD_CHOICE__";
  if (window[key]) return;

  function card(href, icon, title, desc, badge, tone) {
    return `
      <a class="doke-v2-ad-choice-card ${tone}" href="${href}">
        <span class="badge">${badge}</span>
        <i class="bx ${icon}" aria-hidden="true"></i>
        <strong>${title}</strong>
        <p>${desc}</p>
        <span class="cta">Continuar <i class="bx bx-chevron-right"></i></span>
      </a>`;
  }

  function mountAdChoice(ctx) {
    const page = document.createElement("section");
    page.className = "doke-v2-page doke-v2-page-ad-choice";
    page.innerHTML = `
      <section class="doke-v2-hero doke-v2-page-hero doke-v2-ad-choice-hero">
        <div>
          <span class="doke-v2-hero-kicker">Anúncios</span>
          <h1>Escolha o formato antes de publicar</h1>
          <p>Fluxo mais direto para decidir entre anúncio de produto, negócio ou oferta com o mesmo padrão visual do app-v2.</p>
        </div>
      </section>
      <section class="doke-v2-ad-choice-grid" aria-label="Escolha o tipo de anúncio">
        ${card('anunciar.html','bx-store-alt','Anunciar produto ou serviço','Ideal para divulgar uma oferta, captar clientes e abrir conversa rápida dentro da plataforma.','Mais usado','tone-blue')}
        ${card('anunciar-negocio.html','bx-buildings','Anunciar negócio','Melhor para apresentar sua empresa, portfólio e presença local com posicionamento mais institucional.','Marca','tone-green')}
      </section>`;
    ctx.root.appendChild(page);
    return { unmount() { try { page.remove(); } catch (_e) {} } };
  }

  window[key] = { mountAdChoice };
})();
