(() => {
  const key = "__DOKE_V2_PAGE_HELP__";
  if (window[key]) return;

  function faq(q, a) {
    return `<details class="doke-v2-help-faq-item"><summary>${q}</summary><p>${a}</p></details>`;
  }

  function mountHelp(ctx) {
    const page = document.createElement("section");
    page.className = "doke-v2-page doke-v2-page-help";
    page.innerHTML = `
      <section class="doke-v2-hero doke-v2-page-hero doke-v2-help-hero">
        <div>
          <span class="doke-v2-hero-kicker">Ajuda</span>
          <h1>Central de suporte com leitura simples</h1>
          <p>Atalhos rápidos para dúvidas frequentes, segurança, pedidos, mensagens e orientação de conta, sem depender do layout legado.</p>
        </div>
        <div class="doke-v2-hero-stats">
          <article><small>FAQ</small><strong>4 tópicos</strong></article>
          <article><small>Canal</small><strong>Autoatendimento</strong></article>
        </div>
      </section>

      <section class="doke-v2-help-grid">
        <article class="doke-v2-section-card doke-v2-help-actions">
          <h2>Atalhos de suporte</h2>
          <div class="doke-v2-help-links">
            <a href="pedidos.html"><i class="bx bx-package"></i><span>Problemas com pedidos</span></a>
            <a href="mensagens.html"><i class="bx bx-message-rounded-detail"></i><span>Conversas e respostas</span></a>
            <a href="notificacoes.html"><i class="bx bx-bell-ring"></i><span>Alertas e notificações</span></a>
            <a href="mais.html"><i class="bx bx-cog"></i><span>Conta e preferências</span></a>
          </div>
        </article>
        <article class="doke-v2-section-card doke-v2-help-faq">
          <h2>Dúvidas frequentes</h2>
          ${faq('Como alterar meus dados?', 'Use a área Mais para abrir Dados pessoais, endereços e preferências. A migração dessas telas segue sendo priorizada em módulos nativos.')}
          ${faq('Por que algumas páginas ainda parecem diferentes?', 'Parte do produto ainda roda em legacy-html. A prioridade atual é portar páginas com maior uso e menor risco para estabilizar o app-v2.')}
          ${faq('Como abrir um chat a partir de um pedido?', 'Na tela de pedidos, use a ação Abrir chat. No app-v2 esse fluxo já foi preparado para manter shell fixa e estados de loading mais previsíveis.')}
          ${faq('Onde vejo atualizações do sistema?', 'Na página Novidades você encontra um feed dedicado para mudanças do produto e ajustes importantes.')}
        </article>
      </section>`;
    ctx.root.appendChild(page);
    return { unmount() { try { page.remove(); } catch (_e) {} } };
  }

  window[key] = { mountHelp };
})();
