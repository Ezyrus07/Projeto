(() => {
  const key = "__DOKE_V2_PAGE_NEWS__";
  if (window[key]) return;

  function readNews() {
    const fallback = [
      {
        tag: "Produto",
        date: "Agora",
        title: "App-v2 com navegação mais estável",
        body: "As telas nativas estão sendo portadas para reduzir salto de layout, melhorar a responsividade e manter a experiência mais consistente entre páginas."
      },
      {
        tag: "UX",
        date: "Recente",
        title: "Cards, estados vazios e feedbacks mais uniformes",
        body: "A nova camada visual prioriza leitura rápida, hierarquia clara e transições discretas sem esconder conteúdo importante atrás de placeholders genéricos."
      },
      {
        tag: "Conta",
        date: "Em breve",
        title: "Mais áreas do menu Mais em migração",
        body: "Preferências, ajuda e carteira estão entrando no fluxo nativo do app-v2 para reduzir dependência de legacy-html nas rotas secundárias."
      }
    ];
    const keys = ["doke_news_feed", "novidadesFeed", "newsFeed", "doke_updates"];
    for (const storageKey of keys) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.length) continue;
        return parsed.map((item) => ({
          tag: String(item?.tag || item?.categoria || item?.type || "Atualização").trim(),
          date: String(item?.date || item?.data || item?.createdAt || "Recente").trim(),
          title: String(item?.title || item?.titulo || item?.name || "Novidade").trim(),
          body: String(item?.body || item?.descricao || item?.text || item?.conteudo || "").trim()
        })).filter((item) => item.title);
      } catch (_e) {}
    }
    return fallback;
  }

  function mountNews(ctx) {
    const items = readNews();
    const page = document.createElement("section");
    page.className = "doke-v2-page doke-v2-page-news";
    page.innerHTML = `
      <section class="doke-v2-hero doke-v2-page-hero doke-v2-news-hero">
        <div>
          <span class="doke-v2-hero-kicker">Novidades</span>
          <h1>Atualizações do produto sem ruído visual</h1>
          <p>Uma timeline limpa para avisos, melhorias e mudanças importantes do app, com a mesma linguagem visual das outras páginas nativas.</p>
        </div>
        <div class="doke-v2-hero-stats">
          <article><small>Itens</small><strong>${items.length}</strong></article>
          <article><small>Status</small><strong>Ativo</strong></article>
        </div>
      </section>
      <section class="doke-v2-section-card doke-v2-news-list" aria-label="Lista de novidades">
        ${items.map((item) => `
          <article class="doke-v2-news-card">
            <div class="doke-v2-news-card-head">
              <span class="badge">${item.tag}</span>
              <time>${item.date}</time>
            </div>
            <h2>${item.title}</h2>
            <p>${item.body || "Sem descrição adicional."}</p>
          </article>`).join("")}
      </section>`;
    ctx.root.appendChild(page);
    return { unmount() { try { page.remove(); } catch (_e) {} } };
  }

  window[key] = { mountNews };
})();
