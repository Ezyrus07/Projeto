/* Doke Payments Store (cards + transactions)
   - Designed for static front-end demos: uses localStorage.
   - Keys align with pagamentos.html implementation.
*/
(() => {
  'use strict';

  const LS_PAYMENTS_KEY = 'doke_pagamentos_metodos_v1';
  const LS_TX_KEY = 'doke_transacoes_v1';

  const readJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return (parsed ?? fallback);
    } catch (_) {
      return fallback;
    }
  };

  const writeJSON = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  };

  const formatBRL = (value) => {
    const n = Number(value);
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getCards = () => {
    const cards = readJSON(LS_PAYMENTS_KEY, []);
    return Array.isArray(cards) ? cards : [];
  };

  const saveCards = (cards) => {
    writeJSON(LS_PAYMENTS_KEY, Array.isArray(cards) ? cards : []);
  };

  const getTransactions = () => {
    const txs = readJSON(LS_TX_KEY, []);
    return Array.isArray(txs) ? txs : [];
  };

  const addTransaction = (tx) => {
    const now = new Date();
    const base = {
      id: Date.now(),
      dateISO: now.toISOString(),
      title: 'Pagamento',
      subtitle: '',
      amount: 0,
      status: 'paid',
      pedidoId: '',
      method: 'card',
      meta: {}
    };
    const next = { ...base, ...(tx || {}) };

    const list = getTransactions();
    list.unshift(next);

    // keep only latest 40
    const trimmed = list.slice(0, 40);
    saveTransactions(trimmed);

    return next;
  };

  const saveTransactions = (txs) => {
    writeJSON(LS_TX_KEY, Array.isArray(txs) ? txs : []);
  };

  const monthShort = (date) => {
    const m = date.toLocaleString('pt-BR', { month: 'short' }) || '';
    return m.replace('.', '').toUpperCase();
  };

  const escapeHTML = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const renderHistory = (containerEl, opts = {}) => {
    if (!containerEl) return;
    const { limit = 6 } = opts;

    const txs = getTransactions();
    const slice = txs.slice(0, Math.max(0, limit));

    if (!slice.length) {
      containerEl.innerHTML = `
        <div class="history-item">
          <div style="display:flex; align-items:center;">
            <div class="hist-date"><span>--</span><span>--</span></div>
            <div class="hist-desc">
              <h4>Sem histórico recente</h4>
              <span>Suas transações aparecerão aqui.</span>
            </div>
          </div>
          <span class="hist-value negative">-</span>
        </div>`;
      return;
    }

    containerEl.innerHTML = '';
    slice.forEach((tx) => {
      const d = tx.dateISO ? new Date(tx.dateISO) : new Date();
      const day = String(d.getDate()).padStart(2, '0');
      const mon = monthShort(d);
      const amount = Number(tx.amount) || 0;
      const cls = amount >= 0 ? 'positive' : 'negative';
      const valueText = (amount >= 0 ? '' : '-') + formatBRL(Math.abs(amount));

      const title = escapeHTML(tx.title || 'Pagamento');
      const sub = escapeHTML(tx.subtitle || '');

      const html = `
        <div class="history-item">
          <div style="display:flex; align-items:center;">
            <div class="hist-date"><span>${day}</span><span>${mon}</span></div>
            <div class="hist-desc">
              <h4>${title}</h4>
              <span>${sub}</span>
            </div>
          </div>
          <span class="hist-value ${cls}">${valueText}</span>
        </div>`;
      containerEl.insertAdjacentHTML('beforeend', html);
    });
  };

  const renderCardsList = (containerEl, opts = {}) => {
    if (!containerEl) return;
    const {
      selectable = false,
      selectedId = null,
      onSelect = null,
      emptyHTML = '<div style="text-align:center; color:#667; padding:12px 0;">Nenhum cartão cadastrado.</div>'
    } = opts;

    const cards = getCards();
    if (!cards.length) {
      containerEl.innerHTML = emptyHTML;
      return;
    }

    containerEl.innerHTML = '';
    cards.forEach((c) => {
      const id = c.id;
      const icon = c.icon || 'bx-credit-card';
      const brand = c.brand || 'Cartão';
      const last4 = c.last4 || '----';
      const validade = c.validade || '--/--';

      const isChecked = String(selectedId) === String(id);

      const radio = selectable
        ? `<input class="doke-card-radio" type="radio" name="dokeSavedCard" value="${escapeHTML(id)}" ${isChecked ? 'checked' : ''} />`
        : '';

      const html = `
        <div class="doke-card-row" data-card-id="${escapeHTML(id)}">
          ${radio}
          <i class='bx ${escapeHTML(icon)} doke-card-icon'></i>
          <div class="doke-card-meta">
            <div class="doke-card-title">${escapeHTML(brand)} <span style="color:#94a3b8; font-weight:600;">final</span> ${escapeHTML(last4)}</div>
            <div class="doke-card-sub">Validade: ${escapeHTML(validade)}</div>
          </div>
        </div>`;

      containerEl.insertAdjacentHTML('beforeend', html);
    });

    if (selectable && typeof onSelect === 'function') {
      containerEl.querySelectorAll('input.doke-card-radio').forEach((inp) => {
        inp.addEventListener('change', () => {
          const id = inp.value;
          const card = getCards().find((x) => String(x.id) === String(id)) || null;
          onSelect(card);
        });
      });

      // allow clicking the whole row
      containerEl.querySelectorAll('.doke-card-row').forEach((row) => {
        row.addEventListener('click', (e) => {
          const input = row.querySelector('input.doke-card-radio');
          if (!input) return;
          if (e.target === input) return;
          input.checked = true;
          input.dispatchEvent(new Event('change'));
        });
      });
    }
  };

  window.DokePayments = {
    LS_PAYMENTS_KEY,
    LS_TX_KEY,
    getCards,
    saveCards,
    getTransactions,
    addTransaction,
    renderHistory,
    renderCardsList,
    formatBRL
  };
})();
