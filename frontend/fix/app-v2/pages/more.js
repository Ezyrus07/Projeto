(() => {
  const key = "__DOKE_V2_PAGE_MORE__";
  if (window[key]) return;

  function item(href, icon, title, desc, tag = "Abrir") {
    return `
      <a class="doke-v2-more-link" href="${href}">
        <span class="icon"><i class="bx ${icon}" aria-hidden="true"></i></span>
        <span class="text"><strong>${title}</strong><span>${desc}</span></span>
        <span class="meta">${tag}</span>
        <i class="bx bx-chevron-right arrow" aria-hidden="true"></i>
      </a>`;
  }

  function getProfileSnapshot() {
    const fallback = { name: "Sua conta", email: "Ajuste seus dados e preferências", initials: "DK" };
    const candidates = [
      "usuarioLogado",
      "doke_user",
      "userProfile",
      "usuario",
      "perfilUsuario"
    ];
    for (const key of candidates) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const name = String(parsed?.nome || parsed?.name || parsed?.displayName || parsed?.full_name || "").trim();
        const email = String(parsed?.email || parsed?.mail || "").trim();
        const initials = name
          ? name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
          : fallback.initials;
        return {
          name: name || fallback.name,
          email: email || fallback.email,
          initials
        };
      } catch (_e) {}
    }
    return fallback;
  }

  async function mountMore(ctx) {
    const profile = getProfileSnapshot();
    const page = document.createElement("section");
    page.className = "doke-v2-page doke-v2-page-more";
    page.innerHTML = `
      <section class="doke-v2-more-hero doke-v2-hero doke-v2-page-hero">
        <div class="doke-v2-more-hero-main">
          <div class="doke-v2-more-user">
            <div>
              <h1>Conta e preferências</h1>
              <p>Conta, preferências, pagamentos e ajuda em um só lugar.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="doke-v2-more-grid">
        <div class="doke-v2-more-section">
          <h2>Minha conta</h2>
          <div class="doke-v2-more-list">
            ${item('dadospessoais.html','bx-user','Dados pessoais','Nome, contato e informações principais')}
            ${item('enderecos.html','bx-map','Endereços','Casa, trabalho e locais salvos')}
            ${item('senha.html','bx-lock-alt','Segurança e senha','Acesso, senha e proteção da conta')}
            ${item('pagamentos.html','bx-credit-card','Pagamentos','Cartões, cobrança e histórico financeiro')}
          </div>
        </div>

        <div class="doke-v2-more-section">
          <h2>Preferências</h2>
          <div class="doke-v2-more-list">
            ${item('preferencia-notif.html','bx-bell','Notificações','Canais, alertas e preferências de aviso')}
            ${item('idioma.html','bx-world','Idioma','Idioma e regionalização da experiência')}
            ${item('privacidade.html','bx-shield-quarter','Privacidade','Permissões, visibilidade e controle da conta')}
            ${item('ajuda.html','bx-help-circle','Ajuda','Suporte, dúvidas frequentes e orientações')}
          </div>
        </div>
      </section>

      <section class="doke-v2-more-section doke-v2-more-section-wide">
        <div class="doke-v2-more-section-head">
          <div>
            <h2>Acessos rápidos</h2>
            <p>Entradas mais usadas para navegação curta no app.</p>
          </div>
        </div>
        <div class="doke-v2-more-shortcuts">
          ${item('notificacoes.html','bx-bell-ring','Notificações','Veja alertas e atualizações recentes','Ir')}
          ${item('mensagens.html','bx-message-rounded-detail','Mensagens','Abra conversas e responda clientes','Ir')}
          ${item('pedidos.html','bx-package','Pedidos','Acompanhe solicitações e andamento','Ir')}
          ${item('admin-validacoes.html','bx-badge-check','Painel de validações','Área administrativa e conferências','Abrir')}
        </div>
      </section>`;

    ctx.root.appendChild(page);
    return {
      unmount() {
        try { page.remove(); } catch (_e) {}
      }
    };
  }

  window[key] = { mountMore };
})();
