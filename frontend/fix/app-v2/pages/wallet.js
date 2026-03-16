(() => {
  const key = "__DOKE_V2_PAGE_WALLET__";
  if (window[key]) return;

  function readMoney(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function brl(value) {
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(readMoney(value)); }
    catch (_e) { return `R$ ${readMoney(value).toFixed(2)}`; }
  }

  function readWallet() {
    const fallback = {
      balance: 0,
      pending: 0,
      received: 0,
      entries: [
        { title: 'Pagamento recebido', meta: 'Histórico local indisponível', amount: '+ R$ 0,00' },
        { title: 'Saque', meta: 'Sem movimentações recentes', amount: 'R$ 0,00' }
      ]
    };
    const keys = ['doke_wallet', 'walletState', 'doke_payments_store'];
    for (const storageKey of keys) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const entriesRaw = Array.isArray(parsed?.entries) ? parsed.entries : Array.isArray(parsed?.transactions) ? parsed.transactions : [];
        return {
          balance: readMoney(parsed?.balance || parsed?.saldo),
          pending: readMoney(parsed?.pending || parsed?.pendente),
          received: readMoney(parsed?.received || parsed?.recebido),
          entries: entriesRaw.slice(0, 6).map((item) => ({
            title: String(item?.title || item?.descricao || item?.type || 'Movimentação').trim(),
            meta: String(item?.meta || item?.data || item?.date || 'Recente').trim(),
            amount: String(item?.amountLabel || item?.valorFormatado || item?.amount || 'R$ 0,00').trim()
          }))
        };
      } catch (_e) {}
    }
    return fallback;
  }

  function mountWallet(ctx) {
    const wallet = readWallet();
    const page = document.createElement('section');
    page.className = 'doke-v2-page doke-v2-page-wallet';
    page.innerHTML = `
      <section class="doke-v2-hero doke-v2-page-hero doke-v2-wallet-hero">
        <div>
          <span class="doke-v2-hero-kicker">Carteira</span>
          <h1>Saldo, recebimentos e histórico em um só painel</h1>
          <p>Versão nativa inicial da carteira para reduzir placeholder e alinhar a experiência com as demais páginas do app-v2.</p>
        </div>
        <div class="doke-v2-hero-stats">
          <article><small>Saldo</small><strong>${brl(wallet.balance)}</strong></article>
          <article><small>Pendente</small><strong>${brl(wallet.pending)}</strong></article>
          <article><small>Recebido</small><strong>${brl(wallet.received)}</strong></article>
        </div>
      </section>
      <section class="doke-v2-wallet-grid">
        <article class="doke-v2-section-card doke-v2-wallet-balance-card">
          <small>Saldo disponível</small>
          <strong>${brl(wallet.balance)}</strong>
          <p>Use esta área como base para acompanhar entradas e saídas sem cair em placeholder genérico.</p>
          <div class="doke-v2-wallet-actions">
            <a href="pagamentos.html">Gerenciar pagamentos</a>
            <a href="pedidos.html">Ver pedidos</a>
          </div>
        </article>
        <article class="doke-v2-section-card doke-v2-wallet-history-card">
          <h2>Últimas movimentações</h2>
          <div class="doke-v2-wallet-history">
            ${wallet.entries.map((entry) => `
              <article>
                <div>
                  <strong>${entry.title}</strong>
                  <span>${entry.meta}</span>
                </div>
                <b>${entry.amount}</b>
              </article>`).join('')}
          </div>
        </article>
      </section>`;
    ctx.root.appendChild(page);
    return { unmount() { try { page.remove(); } catch (_e) {} } };
  }

  window[key] = { mountWallet };
})();
