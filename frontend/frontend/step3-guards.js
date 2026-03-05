
/* Step 3 – Guards de carregamento (sem quebrar layout)
   Objetivo: evitar "Carregando..." infinito em mobile/produção e oferecer retry/CTA clean.
*/
(function () {
  const READY = () => (document.readyState === "complete" || document.readyState === "interactive");
  const onReady = (fn) => (READY() ? fn() : document.addEventListener("DOMContentLoaded", fn));

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function makeNotice(opts) {
    const box = el("div", "doke-empty-guard");
    const title = el("div", "doke-empty-guard__title", opts.title || "Não foi possível carregar");
    const desc = el("div", "doke-empty-guard__desc", opts.desc || "Verifique sua conexão ou faça login novamente.");
    const actions = el("div", "doke-empty-guard__actions");
    const btn1 = el("button", "doke-btn doke-btn--primary", opts.primaryText || "Tentar novamente");
    btn1.type = "button";
    btn1.addEventListener("click", () => location.reload());
    actions.appendChild(btn1);

    if (opts.secondaryText && typeof opts.onSecondary === "function") {
      const btn2 = el("button", "doke-btn doke-btn--ghost", opts.secondaryText);
      btn2.type = "button";
      btn2.addEventListener("click", opts.onSecondary);
      actions.appendChild(btn2);
    }

    box.appendChild(title);
    box.appendChild(desc);
    box.appendChild(actions);
    return box;
  }

  function replaceIfStuck({ container, list, loadingSelectors, minMs = 6500 }) {
    setTimeout(() => {
      try {
        const cont = typeof container === "string" ? document.querySelector(container) : container;
        const listEl = typeof list === "string" ? document.querySelector(list) : list;

        if (!cont || !listEl) return;

        // já tem conteúdo, não mexe
        if (listEl.children && listEl.children.length > 0) return;

        // se não tem loader visível, não mexe
        const loaders = (loadingSelectors || [])
          .map((s) => (typeof s === "string" ? document.querySelector(s) : s))
          .filter(Boolean);

        const hasLoader = loaders.length
          ? loaders.some((n) => n && n.offsetParent !== null)
          : /carregando|buscando/i.test(cont.innerText || "");

        if (!hasLoader) return;

        // substitui por estado "clean"
        cont.innerHTML = "";
        cont.appendChild(
          makeNotice({
            title: "Sem resposta do servidor",
            desc:
              "Isso pode acontecer por instabilidade de rede, sessão expirada ou limite no iPhone/Safari. Tente novamente.",
            primaryText: "Recarregar"
          })
        );
      } catch (e) {
        // silencioso
      }
    }, minMs);
  }

  onReady(() => {
    // Notificações
    if (document.querySelector("#lista-notificacoes")) {
      replaceIfStuck({
        container: "#lista-notificacoes",
        list: "#lista-notificacoes",
        loadingSelectors: [".loading-spinner", ".doke-loading", ".loader", ".spinner"]
      });
    }

    // Mensagens
    if (document.querySelector("#lista-conversas")) {
      replaceIfStuck({
        container: "#lista-conversas",
        list: "#lista-conversas",
        loadingSelectors: [".loading-spinner", ".doke-loading", ".loader", ".spinner"]
      });
    }

    // Guard geral para textos de carregamento longos
    setTimeout(() => {
      const candidates = Array.from(document.querySelectorAll("body *"))
        .filter((n) => n && n.children && n.children.length === 0)
        .filter((n) => /carregando|buscando/i.test(n.textContent || ""))
        .slice(0, 6);

      candidates.forEach((n) => {
        // não mexer em botões/inputs
        if (["BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(n.tagName)) return;
        const parent = n.parentElement;
        if (!parent) return;

        // se já tem conteúdo relevante, não mexe
        if ((parent.innerText || "").length > 250) return;

        // substitui só se continuar igual
        const t0 = (n.textContent || "").trim();
        if (!t0) return;

        const box = makeNotice({
          title: "Carregamento demorando",
          desc: "Se sua internet estiver ok, pode ser sessão expirada. Recarregue a página.",
          primaryText: "Recarregar"
        });
        parent.innerHTML = "";
        parent.appendChild(box);
      });
    }, 11000);
  });
})();
