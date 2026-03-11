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
          <h1>Escolha como deseja anunciar</h1>
          <p>Escolha o formato certo e continue para um fluxo mais direto, leve e previsível.</p>
        </div>
      </section>
      <section class="doke-v2-ad-choice-grid" aria-label="Escolha o tipo de anúncio">
        ${card('anunciar.html','bx-store-alt','Anunciar produto ou serviço','Ideal para divulgar serviços, ofertas e anúncios que precisam gerar contato rápido.','Mais usado','tone-blue')}
        ${card('anunciar-negocio.html','bx-buildings','Anunciar negócio','Melhor para apresentar empresa, marca e portfólio com posicionamento mais institucional.','Marca','tone-green')}
      </section>`;
    ctx.root.appendChild(page);
    return { unmount() { try { page.remove(); } catch (_e) {} } };
  }

  window[key] = { mountAdChoice };
})();
