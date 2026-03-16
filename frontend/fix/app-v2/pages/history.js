(() => {
  const key = "__DOKE_V2_PAGE_HISTORY__";
  if (window[key]) return;

  function readArray(keys) {
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch (_e) {}
    }
    return [];
  }

  function readHistory() {
    const direct = readArray(["doke_history", "historico", "activityHistory"]);
    if (direct.length) return direct;

    const orders = readArray(["pedidos", "doke_orders", "user_orders"]).slice(0, 8).map((item, index) => ({
      type: "pedido",
      title: String(item?.titulo || item?.title || item?.servico || `Pedido ${index + 1}`),
      meta: String(item?.status || item?.date || item?.data || "Atualizado"),
      when: String(item?.date || item?.data || "Recente")
    }));
    const wallet = (() => {
      try {
        const raw = localStorage.getItem("doke_wallet") || localStorage.getItem("walletState") || localStorage.getItem("doke_payments_store");
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed?.entries) ? parsed.entries : Array.isArray(parsed?.transactions) ? parsed.transactions : [];
        return arr.slice(0, 8).map((item, index) => ({
          type: "financeiro",
          title: String(item?.title || item?.descricao || item?.type || `Movimentação ${index + 1}`),
          meta: String(item?.amountLabel || item?.valorFormatado || item?.amount || "Sem valor"),
          when: String(item?.meta || item?.data || item?.date || "Recente")
        }));
      } catch (_e) {
        return [];
      }
    })();
    return [...orders, ...wallet].slice(0, 10);
  }

  function groupLabel(type) {
    if (type === "pedido") return "Pedidos";
    if (type === "financeiro") return "Financeiro";
    if (type === "mensagem") return "Mensagens";
    return "Atividade";
  }

  function mountHistory(ctx) {
    const items = readHistory();
    const groups = items.reduce((acc, item) => {
      const key = groupLabel(String(item?.type || "atividade"));
      (acc[key] ||= []).push(item);
      return acc;
    }, {});

    const page = document.createElement("section");
    page.className = "doke-v2-page doke-v2-page-history";
    page.innerHTML = `
      <section class="doke-v2-hero doke-v2-page-hero doke-v2-history-hero">
        <div>
          <span class="doke-v2-hero-kicker">Histórico</span>
          <h1>Atividade recente em um painel nativo e mais legível</h1>
          <p>Versão inicial do histórico dentro do app-v2, com leitura tolerante do storage atual e layout uniforme com conta, pedidos e carteira.</p>
        </div>
        <div class="doke-v2-hero-stats">
          <article><small>Entradas</small><strong>${items.length}</strong></article>
          <article><small>Origem</small><strong>${Object.keys(groups).length || 1} blocos</strong></article>
          <article><small>Estado</small><strong>${items.length ? "Ativo" : "Vazio"}</strong></article>
        </div>
      </section>
      <section class="doke-v2-history-grid">
        ${items.length ? Object.entries(groups).map(([label, arr]) => `
          <article class="doke-v2-section-card doke-v2-history-card">
            <header class="doke-v2-history-head">
              <h2>${label}</h2>
              <span>${arr.length} item(ns)</span>
            </header>
            <div class="doke-v2-history-list">
              ${arr.map((item) => `
                <article class="doke-v2-history-item">
                  <div class="dot"></div>
                  <div class="copy">
                    <strong>${item.title}</strong>
                    <p>${item.meta}</p>
                  </div>
                  <small>${item.when}</small>
                </article>
              `).join("")}
            </div>
          </article>
        `).join("") : `
          <article class="doke-v2-section-card doke-v2-empty-state-card">
            <div class="doke-v2-empty-state compact">
              <i class="bx bx-time-five"></i>
              <h3>Nenhuma atividade encontrada</h3>
              <p>Assim que pedidos, pagamentos ou interações forem registrados, o histórico aparece aqui com a mesma shell do app-v2.</p>
            </div>
          </article>
        `}
      </section>`;
    ctx.root.appendChild(page);
    return { unmount() { try { page.remove(); } catch (_e) {} } };
  }

  window[key] = { mountHistory };
})();
