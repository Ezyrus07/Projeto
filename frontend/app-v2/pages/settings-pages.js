(() => {
  const key = "__DOKE_V2_PAGE_SETTINGS_PAGES__";
  if (window[key]) return;

  function safeRead(keys, fallback = null) {
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_e) {}
    }
    return fallback;
  }

  function getUser() {
    const parsed = safeRead(["usuarioLogado", "doke_user", "userProfile", "usuario", "perfilUsuario"], {});
    const nome = String(parsed?.nome || parsed?.name || parsed?.displayName || parsed?.full_name || "Seu perfil").trim() || "Seu perfil";
    const email = String(parsed?.email || parsed?.mail || "Sem e-mail definido").trim() || "Sem e-mail definido";
    const telefone = String(parsed?.telefone || parsed?.phone || parsed?.celular || "Não informado").trim() || "Não informado";
    const nascimento = String(parsed?.dataNascimento || parsed?.birthdate || parsed?.nascimento || "Não informado").trim() || "Não informado";
    return { nome, email, telefone, nascimento };
  }

  function getAddresses() {
    const buckets = ["enderecosUsuario", "enderecos", "doke_addresses"];
    for (const k of buckets) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch (_e) {}
    }
    return [
      { titulo: "Casa", rua: "Adicione seu endereço principal", cidade: "Cidade", estado: "Estado", cep: "00000-000" }
    ];
  }



  function saveUserProfile(data) {
    const next = data && typeof data === "object" ? data : {};
    ["usuarioLogado", "doke_user", "userProfile"].forEach((k) => {
      try { localStorage.setItem(k, JSON.stringify(next)); } catch (_e) {}
    });
  }

  function saveAddresses(items) {
    const next = Array.isArray(items) ? items : [];
    ["enderecosUsuario", "enderecos", "doke_addresses"].forEach((k) => {
      try { localStorage.setItem(k, JSON.stringify(next)); } catch (_e) {}
    });
  }

  function savePaymentCards(cards) {
    const next = Array.isArray(cards) ? cards : [];
    ["doke_payment_cards", "paymentCards", "cartoes", "cartoesUsuario"].forEach((k) => {
      try { localStorage.setItem(k, JSON.stringify(next)); } catch (_e) {}
    });
  }

  function setButtonSavedState(button, label = "Salvo") {
    if (!(button instanceof HTMLButtonElement)) return;
    const old = button.textContent || "Salvar";
    button.textContent = label;
    button.disabled = true;
    window.setTimeout(() => {
      button.textContent = old;
      button.disabled = false;
    }, 1200);
  }

  function getPaymentCards() {
    const buckets = ["doke_payment_cards", "paymentCards", "cartoes", "cartoesUsuario"];
    for (const k of buckets) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch (_e) {}
    }
    return [];
  }

  function getNotificationPrefs() {
    const defaults = {
      push: true,
      email: true,
      pedidos: true,
      mensagens: true,
      novidades: false,
      marketing: false
    };
    try {
      const raw = localStorage.getItem("doke_notification_preferences");
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return { ...defaults, ...(parsed || {}) };
    } catch (_e) {
      return defaults;
    }
  }

  function saveNotificationPrefs(prefs) {
    try { localStorage.setItem("doke_notification_preferences", JSON.stringify(prefs || {})); } catch (_e) {}
  }

  function getLanguagePrefs() {
    const defaults = { language: "pt-BR", region: "Brasil", currency: "BRL" };
    try {
      const raw = localStorage.getItem("doke_language_preferences");
      if (!raw) return defaults;
      return { ...defaults, ...(JSON.parse(raw) || {}) };
    } catch (_e) { return defaults; }
  }

  function saveLanguagePrefs(prefs) {
    try { localStorage.setItem("doke_language_preferences", JSON.stringify(prefs || {})); } catch (_e) {}
  }

  function getPrivacyPrefs() {
    const defaults = {
      perfilPublico: true,
      mostrarCidade: true,
      mostrarTelefone: false,
      indexarBusca: true,
      atividade: true
    };
    try {
      const raw = localStorage.getItem("doke_privacy_preferences");
      if (!raw) return defaults;
      return { ...defaults, ...(JSON.parse(raw) || {}) };
    } catch (_e) { return defaults; }
  }

  function savePrivacyPrefs(prefs) {
    try { localStorage.setItem("doke_privacy_preferences", JSON.stringify(prefs || {})); } catch (_e) {}
  }

  function statCard(label, value) {
    return `<article class="doke-v2-settings-stat"><small>${label}</small><strong>${value}</strong></article>`;
  }

  function createBasePage({ pageClass, kicker, title, desc, statsHtml, contentHtml }) {
    const page = document.createElement("section");
    page.className = `doke-v2-page doke-v2-settings-page ${pageClass}`;
    page.innerHTML = `
      <section class="doke-v2-hero doke-v2-page-hero doke-v2-settings-hero">
        <div class="doke-v2-settings-hero-copy">
          <span class="doke-v2-settings-kicker">${kicker}</span>
          <h1>${title}</h1>
          <p>${desc}</p>
        </div>
        <div class="doke-v2-settings-stats">${statsHtml}</div>
      </section>
      <section class="doke-v2-settings-grid">${contentHtml}</section>`;
    return page;
  }

  function sectionCard(title, subtitle, bodyHtml) {
    return `
      <article class="doke-v2-settings-card">
        <header class="doke-v2-settings-card-head">
          <div>
            <h2>${title}</h2>
            <p>${subtitle}</p>
          </div>
        </header>
        <div class="doke-v2-settings-card-body">${bodyHtml}</div>
      </article>`;
  }

  function field(label, value, meta = "Editar") {
    return `
      <div class="doke-v2-settings-field">
        <span>${label}</span>
        <strong>${value}</strong>
        <button type="button">${meta}</button>
      </div>`;
  }

  function toggleRow(key, label, desc, checked) {
    return `
      <label class="doke-v2-settings-toggle">
        <span class="copy"><strong>${label}</strong><small>${desc}</small></span>
        <input type="checkbox" data-pref-key="${key}" ${checked ? "checked" : ""}>
        <span class="track" aria-hidden="true"></span>
      </label>`;
  }

  async function mountPersonalData(ctx) {
    let user = getUser();
    const profileStore = safeRead(["usuarioLogado", "doke_user", "userProfile", "usuario", "perfilUsuario"], {});
    const page = createBasePage({
      pageClass: "doke-v2-page-personal-data",
      kicker: "Minha conta",
      title: "Dados pessoais em um layout mais claro e editável",
      desc: "Agora a rota já permite editar e persistir nome, e-mail, telefone e nascimento sem voltar para o HTML legado.",
      statsHtml: [
        statCard("Campos principais", "4 dados"),
        statCard("Status", user.email !== "Sem e-mail definido" ? "Preenchido" : "Parcial"),
        statCard("Edição", "Nativa")
      ].join(""),
      contentHtml: [
        sectionCard("Informações principais", "Edite os dados básicos e salve no storage local atual.", `
          <form class="doke-v2-settings-form" data-form="personal">
            <label><span>Nome</span><input type="text" name="nome" value="${user.nome}"></label>
            <label><span>E-mail</span><input type="email" name="email" value="${user.email === "Sem e-mail definido" ? "" : user.email}"></label>
            <label><span>Telefone</span><input type="text" name="telefone" value="${user.telefone === "Não informado" ? "" : user.telefone}"></label>
            <label><span>Nascimento</span><input type="text" name="dataNascimento" value="${user.nascimento === "Não informado" ? "" : user.nascimento}" placeholder="DD/MM/AAAA"></label>
            <button type="submit" class="doke-v2-settings-primary">Salvar dados</button>
          </form>`),
        sectionCard("Leitura atual", "Resumo do que está salvo hoje no app.", [
          field("Nome", user.nome, "Atual"),
          field("E-mail", user.email, "Atual"),
          field("Telefone", user.telefone, "Atual"),
          field("Nascimento", user.nascimento, "Atual")
        ].join(""))
      ].join("")
    });

    page.addEventListener('submit', (ev) => {
      const form = ev.target;
      if (!(form instanceof HTMLFormElement) || form.dataset.form !== 'personal') return;
      ev.preventDefault();
      const fd = new FormData(form);
      const next = {
        ...profileStore,
        nome: String(fd.get('nome') || '').trim(),
        name: String(fd.get('nome') || '').trim(),
        displayName: String(fd.get('nome') || '').trim(),
        email: String(fd.get('email') || '').trim(),
        telefone: String(fd.get('telefone') || '').trim(),
        phone: String(fd.get('telefone') || '').trim(),
        dataNascimento: String(fd.get('dataNascimento') || '').trim(),
        birthdate: String(fd.get('dataNascimento') || '').trim()
      };
      saveUserProfile(next);
      user = getUser();
      const values = page.querySelectorAll('.doke-v2-settings-field strong');
      if (values[0]) values[0].textContent = user.nome;
      if (values[1]) values[1].textContent = user.email;
      if (values[2]) values[2].textContent = user.telefone;
      if (values[3]) values[3].textContent = user.nascimento;
      setButtonSavedState(form.querySelector('button[type="submit"]'), 'Dados salvos');
    });

    ctx.root.appendChild(page);
    return { unmount() { page.remove(); } };
  }

  async function mountAddresses(ctx) {
    let items = getAddresses();
    const renderCards = () => items.map((addr, index) => `
      <article class="doke-v2-address-card">
        <div class="doke-v2-address-card-head">
          <strong>${String(addr?.titulo || addr?.label || `Endereço ${index + 1}`)}</strong>
          <button type="button" data-remove-address="${index}">Remover</button>
        </div>
        <p>${String(addr?.rua || addr?.logradouro || "Sem rua cadastrada")}</p>
        <span>${String(addr?.cidade || "Cidade")} • ${String(addr?.estado || "Estado")}</span>
        <small>CEP: ${String(addr?.cep || "00000-000")}</small>
      </article>`).join("");

    const page = createBasePage({
      pageClass: "doke-v2-page-addresses",
      kicker: "Minha conta",
      title: "Endereços salvos com leitura rápida e prioridade mobile",
      desc: "A rota já lista, adiciona e remove endereços sem depender do HTML legado.",
      statsHtml: [
        statCard("Endereços", String(items.length)),
        statCard("Principal", String(items[0]?.titulo || items[0]?.label || "Casa")),
        statCard("Entrega", "Ativa")
      ].join(""),
      contentHtml: [
        sectionCard("Locais salvos", "Resumo tolerante ao storage local atual.", `<div class="doke-v2-address-grid" data-address-grid>${renderCards()}</div>`),
        sectionCard("Adicionar endereço", "Cadastro leve para continuar a migração funcional.", `
          <form class="doke-v2-settings-form" data-form="address">
            <label><span>Título</span><input type="text" name="titulo" placeholder="Casa, trabalho..."></label>
            <label><span>Rua</span><input type="text" name="rua" placeholder="Rua e número"></label>
            <label><span>Cidade</span><input type="text" name="cidade" placeholder="Cidade"></label>
            <label><span>Estado</span><input type="text" name="estado" placeholder="UF"></label>
            <label><span>CEP</span><input type="text" name="cep" placeholder="00000-000"></label>
            <button type="submit" class="doke-v2-settings-primary">Salvar endereço</button>
          </form>`)
      ].join("")
    });

    const refresh = () => {
      const grid = page.querySelector('[data-address-grid]');
      if (grid) grid.innerHTML = renderCards();
      const stats = page.querySelectorAll('.doke-v2-settings-stat strong');
      if (stats[0]) stats[0].textContent = String(items.length);
      if (stats[1]) stats[1].textContent = String(items[0]?.titulo || items[0]?.label || 'Casa');
    };

    page.addEventListener('submit', (ev) => {
      const form = ev.target;
      if (!(form instanceof HTMLFormElement) || form.dataset.form !== 'address') return;
      ev.preventDefault();
      const fd = new FormData(form);
      const next = {
        titulo: String(fd.get('titulo') || '').trim() || `Endereço ${items.length + 1}`,
        rua: String(fd.get('rua') || '').trim() || 'Rua não informada',
        cidade: String(fd.get('cidade') || '').trim() || 'Cidade',
        estado: String(fd.get('estado') || '').trim() || 'Estado',
        cep: String(fd.get('cep') || '').trim() || '00000-000'
      };
      items = [next, ...items];
      saveAddresses(items);
      refresh();
      form.reset();
      setButtonSavedState(form.querySelector('button[type="submit"]'), 'Endereço salvo');
    });

    page.addEventListener('click', (ev) => {
      const button = ev.target instanceof HTMLElement ? ev.target.closest('[data-remove-address]') : null;
      if (!(button instanceof HTMLElement)) return;
      const index = Number(button.getAttribute('data-remove-address'));
      if (!Number.isFinite(index)) return;
      items = items.filter((_, i) => i !== index);
      saveAddresses(items);
      refresh();
    });

    ctx.root.appendChild(page);
    return { unmount() { page.remove(); } };
  }

  async function mountNotificationPreferences(ctx) {
    let prefs = getNotificationPrefs();
    const page = createBasePage({
      pageClass: "doke-v2-page-notification-prefs",
      kicker: "Preferências",
      title: "Notificações organizadas por canal e tipo de alerta",
      desc: "Toggles reais no módulo nativo, com persistência local imediata e layout uniforme com o restante do app-v2.",
      statsHtml: [
        statCard("Push", prefs.push ? "Ativo" : "Desligado"),
        statCard("Mensagens", prefs.mensagens ? "Ativo" : "Desligado"),
        statCard("Pedidos", prefs.pedidos ? "Ativo" : "Desligado")
      ].join(""),
      contentHtml: [
        sectionCard("Canais", "Defina como o app pode avisar você.", [
          toggleRow("push", "Push no app", "Alertas rápidos durante o uso", prefs.push),
          toggleRow("email", "E-mail", "Resumo e avisos importantes", prefs.email)
        ].join("")),
        sectionCard("Tipos de aviso", "Personalize o que realmente importa para o dia a dia.", [
          toggleRow("pedidos", "Pedidos", "Mudanças de status e novas solicitações", prefs.pedidos),
          toggleRow("mensagens", "Mensagens", "Novas conversas e respostas", prefs.mensagens),
          toggleRow("novidades", "Novidades", "Atualizações de produto e recursos", prefs.novidades),
          toggleRow("marketing", "Comunicações promocionais", "Campanhas e destaques", prefs.marketing)
        ].join(""))
      ].join("")
    });

    page.addEventListener("change", (ev) => {
      const target = ev.target;
      if (!(target instanceof HTMLInputElement)) return;
      const prefKey = String(target.dataset.prefKey || "");
      if (!prefKey) return;
      prefs = { ...prefs, [prefKey]: !!target.checked };
      saveNotificationPrefs(prefs);
    });
    ctx.root.appendChild(page);
    return { unmount() { page.remove(); } };
  }

  async function mountLanguage(ctx) {
    let prefs = getLanguagePrefs();
    const page = createBasePage({
      pageClass: "doke-v2-page-language",
      kicker: "Preferências",
      title: "Idioma e regionalização com base única de configuração",
      desc: "Versão nativa inicial para idioma, região e moeda, com persistência local para navegar sem recarga completa.",
      statsHtml: [
        statCard("Idioma", prefs.language),
        statCard("Região", prefs.region),
        statCard("Moeda", prefs.currency)
      ].join(""),
      contentHtml: sectionCard("Regionalização", "Selecione como a experiência deve se comportar.", `
        <form class="doke-v2-settings-form" data-form="language">
          <label><span>Idioma</span>
            <select name="language">
              <option value="pt-BR" ${prefs.language === 'pt-BR' ? 'selected' : ''}>Português (Brasil)</option>
              <option value="en" ${prefs.language === 'en' ? 'selected' : ''}>English</option>
              <option value="es" ${prefs.language === 'es' ? 'selected' : ''}>Español</option>
            </select>
          </label>
          <label><span>Região</span>
            <input type="text" name="region" value="${prefs.region}">
          </label>
          <label><span>Moeda</span>
            <select name="currency">
              <option value="BRL" ${prefs.currency === 'BRL' ? 'selected' : ''}>BRL</option>
              <option value="USD" ${prefs.currency === 'USD' ? 'selected' : ''}>USD</option>
              <option value="EUR" ${prefs.currency === 'EUR' ? 'selected' : ''}>EUR</option>
            </select>
          </label>
          <button type="submit" class="doke-v2-settings-primary">Salvar preferências</button>
        </form>`)
    });

    page.addEventListener('submit', (ev) => {
      const form = ev.target;
      if (!(form instanceof HTMLFormElement) || form.dataset.form !== 'language') return;
      ev.preventDefault();
      const fd = new FormData(form);
      prefs = {
        language: String(fd.get('language') || prefs.language),
        region: String(fd.get('region') || prefs.region),
        currency: String(fd.get('currency') || prefs.currency)
      };
      saveLanguagePrefs(prefs);
      const note = form.querySelector('button[type="submit"]');
      if (note instanceof HTMLButtonElement) {
        const old = note.textContent;
        note.textContent = 'Salvo';
        window.setTimeout(() => { note.textContent = old || 'Salvar preferências'; }, 1200);
      }
    });
    ctx.root.appendChild(page);
    return { unmount() { page.remove(); } };
  }

  async function mountPrivacy(ctx) {
    let prefs = getPrivacyPrefs();
    const page = createBasePage({
      pageClass: "doke-v2-page-privacy",
      kicker: "Preferências",
      title: "Privacidade com controles claros e comportamento previsível",
      desc: "Estrutura nativa para visibilidade de perfil, indexação e compartilhamento de atividade, já pronta para persistência local.",
      statsHtml: [
        statCard("Perfil", prefs.perfilPublico ? "Público" : "Privado"),
        statCard("Busca", prefs.indexarBusca ? "Indexado" : "Oculto"),
        statCard("Atividade", prefs.atividade ? "Visível" : "Oculta")
      ].join(""),
      contentHtml: [
        sectionCard("Visibilidade", "Escolha quem pode encontrar e ver seu perfil.", [
          toggleRow("perfilPublico", "Perfil público", "Permite visualização ampla do perfil", prefs.perfilPublico),
          toggleRow("mostrarCidade", "Mostrar cidade", "Exibe sua localização resumida", prefs.mostrarCidade),
          toggleRow("mostrarTelefone", "Mostrar telefone", "Mostra telefone no perfil público", prefs.mostrarTelefone)
        ].join("")),
        sectionCard("Descoberta e atividade", "Controles para busca e sinais de atividade.", [
          toggleRow("indexarBusca", "Aparecer na busca", "Permite ser encontrado em resultados públicos", prefs.indexarBusca),
          toggleRow("atividade", "Mostrar atividade", "Exibe sinais recentes no app", prefs.atividade)
        ].join(""))
      ].join("")
    });
    page.addEventListener("change", (ev) => {
      const target = ev.target;
      if (!(target instanceof HTMLInputElement)) return;
      const prefKey = String(target.dataset.prefKey || "");
      if (!prefKey) return;
      prefs = { ...prefs, [prefKey]: !!target.checked };
      savePrivacyPrefs(prefs);
    });
    ctx.root.appendChild(page);
    return { unmount() { page.remove(); } };
  }

  async function mountSecurity(ctx) {
    const page = createBasePage({
      pageClass: "doke-v2-page-security",
      kicker: "Minha conta",
      title: "Segurança e senha com próxima etapa já delimitada",
      desc: "Versão nativa inicial para tirar a rota do legado, mantendo leitura clara e CTA para a migração completa do fluxo de segurança.",
      statsHtml: [
        statCard("Senha", "Oculta"),
        statCard("Sessões", "1 ativa"),
        statCard("Proteção", "Base pronta")
      ].join(""),
      contentHtml: [
        sectionCard("Acesso", "Troca básica de senha com feedback visual local.", `
          <form class="doke-v2-settings-form" data-form="security">
            <label><span>Senha atual</span><input type="password" name="currentPassword" placeholder="••••••••"></label>
            <label><span>Nova senha</span><input type="password" name="newPassword" placeholder="Mínimo de 6 caracteres"></label>
            <label><span>Confirmar senha</span><input type="password" name="confirmPassword" placeholder="Repita a nova senha"></label>
            <div class="doke-v2-settings-actions">
              <button type="submit" class="doke-v2-settings-primary">Atualizar senha</button>
              <button type="button" class="doke-v2-settings-secondary" data-clear-security>Limpar</button>
            </div>
          </form>
          <div class="doke-v2-empty-note" data-security-note>Use esta etapa para validar a UX antes de conectar o backend.</div>`),
        sectionCard("Escopo da migração", "Itens ainda pendentes para fechar essa rota.", `
          <ul class="doke-v2-settings-list">
            <li>Validar senha atual e nova senha</li>
            <li>Conectar fluxo de recuperação</li>
            <li>Integrar confirmação visual e feedback de erro</li>
          </ul>`)
      ].join("")
    });
    page.addEventListener('submit', (ev) => {
      const form = ev.target;
      if (!(form instanceof HTMLFormElement) || form.dataset.form !== 'security') return;
      ev.preventDefault();
      const fd = new FormData(form);
      const nextPassword = String(fd.get('newPassword') || '');
      const confirm = String(fd.get('confirmPassword') || '');
      const note = page.querySelector('[data-security-note]');
      if (note) note.textContent = nextPassword && nextPassword === confirm && nextPassword.length >= 6 ? 'Senha validada localmente. Próxima etapa: integrar backend.' : 'Confira a nova senha. Ela precisa coincidir e ter pelo menos 6 caracteres.';
      if (nextPassword && nextPassword === confirm && nextPassword.length >= 6) setButtonSavedState(form.querySelector('button[type="submit"]'), 'Senha validada');
    });
    page.addEventListener('click', (ev) => {
      const btn = ev.target instanceof HTMLElement ? ev.target.closest('[data-clear-security]') : null;
      if (!(btn instanceof HTMLElement)) return;
      const form = page.querySelector('form[data-form="security"]');
      if (form instanceof HTMLFormElement) form.reset();
    });
    ctx.root.appendChild(page);
    return { unmount() { page.remove(); } };
  }

  async function mountPayments(ctx) {
    let cards = getPaymentCards();
    const renderList = () => cards.length
      ? `<div class="doke-v2-payment-list">${cards.map((card, index) => `
          <article class="doke-v2-payment-card">
            <strong>${String(card?.brand || 'Cartão')} •••• ${String(card?.last4 || card?.ultimos4 || '0000')}</strong>
            <span>${String(card?.name || card?.holder || `Cartão ${index + 1}`)}</span>
          </article>`).join('')}</div>`
      : `<div class="doke-v2-empty-note">Nenhum cartão salvo no storage atual. A rota já está nativa e pronta para receber a integração completa.</div>`;

    const page = createBasePage({
      pageClass: "doke-v2-page-payments",
      kicker: "Minha conta",
      title: "Pagamentos com estrutura nativa e sem depender do HTML legado",
      desc: "Agora a rota já aceita cadastro local básico de cartões para validar fluxo e layout dentro da shell.",
      statsHtml: [
        statCard("Cartões", String(cards.length)),
        statCard("Cobrança", "Preparada"),
        statCard("Wallet", "Integrável")
      ].join(""),
      contentHtml: [
        sectionCard("Métodos salvos", "Leitura tolerante a storage local já existente.", `<div data-payment-list>${renderList()}</div>`),
        sectionCard("Adicionar cartão", "Cadastro leve para validar a experiência sem sair da shell.", `
          <form class="doke-v2-settings-form" data-form="payment">
            <label><span>Bandeira</span><input type="text" name="brand" placeholder="Visa, Master..." /></label>
            <label><span>Nome no cartão</span><input type="text" name="name" placeholder="Como está impresso" /></label>
            <label><span>Últimos 4 dígitos</span><input type="text" name="last4" maxlength="4" placeholder="1234" /></label>
            <button type="submit" class="doke-v2-settings-primary">Salvar cartão</button>
          </form>`)
      ].join("")
    });

    const refresh = () => {
      const slot = page.querySelector('[data-payment-list]');
      if (slot) slot.innerHTML = renderList();
      const stat = page.querySelector('.doke-v2-settings-stat strong');
      if (stat) stat.textContent = String(cards.length);
    };

    page.addEventListener('submit', (ev) => {
      const form = ev.target;
      if (!(form instanceof HTMLFormElement) || form.dataset.form !== 'payment') return;
      ev.preventDefault();
      const fd = new FormData(form);
      const next = {
        brand: String(fd.get('brand') || '').trim() || 'Cartão',
        name: String(fd.get('name') || '').trim() || `Cartão ${cards.length + 1}` ,
        last4: String(fd.get('last4') || '').replace(/\D+/g, '').slice(-4) || '0000'
      };
      cards = [next, ...cards];
      savePaymentCards(cards);
      refresh();
      form.reset();
      setButtonSavedState(form.querySelector('button[type="submit"]'), 'Cartão salvo');
    });

    ctx.root.appendChild(page);
    return { unmount() { page.remove(); } };
  }

  window[key] = {
    mountPersonalData,
    mountAddresses,
    mountNotificationPreferences,
    mountLanguage,
    mountPrivacy,
    mountSecurity,
    mountPayments
  };
})();
