// doke-alerts.js
// Padroniza alertas/toasts, notifica falhas comuns e corrige textos com encoding quebrado.
(() => {
  const safeStr = (value) => (value == null ? "" : String(value));
  const clamp = (text, size = 240) => (text.length > size ? `${text.slice(0, size - 3)}...` : text);
  const notifyMem = new Map();
  const BROKEN_RE = /Ãƒ|Ã‚|Ã¢|Ã£|ï¿½|�/;
  const ATTRS_TO_FIX = ["placeholder", "title", "aria-label", "alt"];
  const WORD_FIXES = [
    [/\bIn[ií]?cio\b/gi, "Início"],
    [/\bNotifica[cç][oõ]es\b/gi, "Notificações"],
    [/\bPublica[cç][oõ]es\b/gi, "Publicações"],
    [/\bpublica[cç][aã]o\b/gi, "publicação"],
    [/\bAn[uú]ncio\b/gi, "Anúncio"],
    [/\bV[ií]deos?\b/gi, "Vídeos"],
    [/\bUsu[aá]rio\b/gi, "Usuário"],
    [/\bServi[cç]o\b/gi, "Serviço"],
    [/\bDescri[cç][aã]o\b/gi, "Descrição"],
    [/\bAvalia[cç][aã]o\b/gi, "Avaliação"],
    [/\bAvalia[cç][oõ]es\b/gi, "Avaliações"],
    [/\bN[aã]o\b/gi, "Não"],
    [/\bFa[cç]a\b/gi, "Faça"],
    [/\binv[aá]lido\b/gi, "inválido"],
    [/\bindispon[ií]vel\b/gi, "indisponível"],
    [/crit�rios/gi, "critérios"],
    [/Crit�rios/g, "Critérios"],
    [/considera��es/gi, "considerações"],
    [/Considera��es/g, "Considerações"],
    [/configura��es/gi, "configurações"],
    [/Configura��es/g, "Configurações"],
    [/informa��es/gi, "informações"],
    [/Informa��es/g, "Informações"],
    [/solicita��o/gi, "solicitação"],
    [/Solicita��o/g, "Solicitação"],
    [/finaliza��o/gi, "finalização"],
    [/Finaliza��o/g, "Finalização"],
    [/cancela��o/gi, "cancelação"],
    [/Cancela��o/g, "Cancelação"],
    [/permiss�o/gi, "permissão"],
    [/Permiss�o/g, "Permissão"],
    [/conex�o/gi, "conexão"],
    [/Conex�o/g, "Conexão"],
    [/op��es/gi, "opções"],
    [/Op��es/g, "Opções"],
    [/opera��es/gi, "operações"],
    [/Opera��es/g, "Operações"],
    [/experi�ncia/gi, "experiência"],
    [/aparecer�o/gi, "aparecerão"],
    [/colabora��o/gi, "colaboração"],
    [/observa��o/gi, "observação"],
    [/an�nimo/gi, "anônimo"],
    [/p�gina/gi, "página"],
    [/inser��o/gi, "inserção"],
    [/tamb�m/gi, "também"],
    [/atualiza��o/gi, "atualização"],
    [/m�tricas/gi, "métricas"],
    [/fun��o/gi, "função"]
  ];

  window.__DOKE_DISABLE_TOAST_GLOBAL_HANDLERS__ = true;
  window.__DOKE_ALERTS_HANDLERS_ACTIVE = true;

  function shouldNotify(key, cooldownMs = 12000) {
    const now = Date.now();
    const last = Number(notifyMem.get(key) || 0);
    if (now - last < cooldownMs) return false;
    notifyMem.set(key, now);
    return true;
  }

  function normalizeType(type) {
    if (type === "warning") return "warn";
    if (type === "erro") return "error";
    return type || "info";
  }

  function fallbackToast(message, opts = {}) {
    const type = normalizeType(opts.type || "info");
    const title = safeStr(opts.title || "");
    let stack = document.querySelector(".doke-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "doke-toast-stack";
      stack.style.position = "fixed";
      stack.style.right = "14px";
      stack.style.bottom = "14px";
      stack.style.zIndex = "99999";
      stack.style.display = "grid";
      stack.style.gap = "10px";
      document.body.appendChild(stack);
    }
    const toast = document.createElement("div");
    toast.style.background = "#fff";
    toast.style.border = "1px solid rgba(0,0,0,.08)";
    toast.style.borderLeft = "5px solid " + (
      type === "success" ? "#0b7768" :
      type === "error" ? "#dc3545" :
      type === "warn" ? "#f0ad4e" : "#0b5ed7"
    );
    toast.style.borderRadius = "14px";
    toast.style.boxShadow = "0 12px 30px rgba(0,0,0,.10)";
    toast.style.padding = "12px";
    toast.style.maxWidth = "420px";
    toast.innerHTML =
      (title ? `<div style="font-weight:700;margin-bottom:4px">${title}</div>` : "") +
      `<div style="color:#4b5563;font-size:13.5px;line-height:1.25">${clamp(safeStr(message), 520)}</div>`;
    stack.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(6px)";
      toast.style.transition = "all .25s ease";
    }, 3800);
    setTimeout(() => toast.remove(), 4500);
  }

  function toast(message, opts = {}) {
    const payload = (typeof message === "object" && message)
      ? message
      : { message: safeStr(message), ...(opts || {}) };
    payload.type = normalizeType(payload.type || "info");
    payload.message = safeStr(payload.message || "");
    payload.title = safeStr(payload.title || "");
    if (typeof window.dokeToast === "function") {
      try { return window.dokeToast(payload); } catch (_) {}
      try { return window.dokeToast(payload.message, payload); } catch (_) {}
    }
    return fallbackToast(payload.message, payload);
  }

  function notifyOnce(key, payload, cooldownMs) {
    if (!shouldNotify(key, cooldownMs)) return;
    toast(payload);
  }

  if (typeof window.mostrarToast !== "function") {
    window.mostrarToast = (msg, tipo = "info", titulo = "") => toast(msg, { type: tipo, title: titulo });
  }
  if (typeof window.mostrarSucesso !== "function") {
    window.mostrarSucesso = (msg, titulo = "Sucesso") => toast(msg, { type: "success", title: titulo });
  }
  if (typeof window.mostrarErro !== "function") {
    window.mostrarErro = (msg, titulo = "Erro") => toast(msg, { type: "error", title: titulo });
  }

  function ensureOfflineBar() {
    let bar = document.querySelector(".doke-offlineBar");
    if (bar) return bar;
    bar = document.createElement("div");
    bar.className = "doke-offlineBar";
    bar.textContent = "Você está sem conexão. Algumas ações podem falhar.";
    document.body.appendChild(bar);
    return bar;
  }

  function updateOnlineUI() {
    const bar = ensureOfflineBar();
    if (navigator.onLine) bar.classList.remove("is-on");
    else bar.classList.add("is-on");
  }

  function isNoiseMessage(msg) {
    const text = String(msg || "");
    return text.includes("ResizeObserver loop") ||
      text.includes("Script error.") ||
      text.includes("Non-Error promise rejection captured");
  }

  function formatStatusMessage(status) {
    const code = Number(status || 0);
    if (code === 400) return "Consulta inválida (400). Verifique colunas e filtros.";
    if (code === 401 || code === 403) return "Sem permissão de leitura no banco (policy RLS).";
    if (code === 404) return "Recurso/rota não encontrado (404).";
    if (code === 429) return "Muitas requisições. Aguarde alguns segundos.";
    if (code === 520 || code >= 500) return "Servidor indisponível no momento (5xx/520).";
    if (code === 0) return "Falha de rede ao consultar o banco.";
    return `Falha de carregamento (HTTP ${code || "?"}).`;
  }

  function isApiUrl(url) {
    return /\/rest\/v1\/|\/auth\/v1\/|\/storage\/v1\//i.test(String(url || ""));
  }

  function makeEndpointKey(url) {
    try {
      const u = new URL(String(url || ""), location.origin);
      const keys = Array.from(new Set(Array.from(u.searchParams.keys()))).sort().join("&");
      return `${u.pathname}?${keys}`;
    } catch (_) {
      return String(url || "").split("?")[0];
    }
  }

  function notifyHttpFailure(meta) {
    const status = Number(meta?.status || 0);
    const method = String(meta?.method || "GET").toUpperCase();
    const url = String(meta?.url || "");
    if (!isApiUrl(url)) return;
    const key = `http:${status}:${method}:${makeEndpointKey(url)}`;
    notifyOnce(key, {
      type: status >= 500 || status === 0 ? "error" : "warn",
      title: "Falha ao carregar dados",
      message: formatStatusMessage(status),
      details: {
        status,
        statusText: safeStr(meta?.statusText || ""),
        method,
        url,
        source: "fetch",
        at: new Date().toISOString()
      }
    }, 12000);
  }

  function patchFetchNotifications() {
    if (window.__DOKE_ALERTS_FETCH_PATCHED__) return;
    if (typeof window.fetch !== "function") return;
    const nativeFetch = window.fetch.bind(window);
    window.__DOKE_ALERTS_FETCH_PATCHED__ = true;
    window.fetch = async function dokeFetch(input, init) {
      const method = String((init && init.method) || "GET").toUpperCase();
      const url = (typeof input === "string") ? input : (input && input.url ? String(input.url) : "");
      try {
        const resp = await nativeFetch(input, init);
        if (resp && !resp.ok) {
          notifyHttpFailure({ status: resp.status, statusText: resp.statusText, method, url });
        }
        return resp;
      } catch (err) {
        notifyHttpFailure({
          status: 0,
          statusText: safeStr(err && err.message ? err.message : "network_error"),
          method,
          url
        });
        throw err;
      }
    };
  }

  function decodeLatin1AsUtf8(text) {
    try {
      const input = safeStr(text);
      const bytes = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i += 1) bytes[i] = input.charCodeAt(i) & 0xff;
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    } catch (_) {
      return safeStr(text);
    }
  }

  function brokenScore(text) {
    const input = safeStr(text);
    let score = 0;
    score += (input.match(/Ãƒ/g) || []).length * 2;
    score += (input.match(/Ã‚/g) || []).length * 2;
    score += (input.match(/Ã¢/g) || []).length * 2;
    score += (input.match(/Ã£/g) || []).length * 2;
    score += (input.match(/ï¿½/g) || []).length * 3;
    score += (input.match(/�/g) || []).length * 4;
    return score;
  }

  function applyWordFixes(text) {
    let out = safeStr(text);
    WORD_FIXES.forEach(([regex, replacement]) => {
      out = out.replace(regex, replacement);
    });
    return out;
  }

  function normalizeText(text) {
    let out = safeStr(text);
    if (BROKEN_RE.test(out)) {
      let best = out;
      let bestScore = brokenScore(out);
      let current = out;
      for (let i = 0; i < 3; i += 1) {
        const decoded = decodeLatin1AsUtf8(current);
        if (!decoded || decoded === current) break;
        const score = brokenScore(decoded);
        if (score <= bestScore) {
          best = decoded;
          bestScore = score;
        }
        current = decoded;
        if (score === 0) break;
      }
      out = best;
    }
    out = applyWordFixes(out);
    return out;
  }

  function shouldSkipTextNode(node) {
    const parent = node && node.parentElement;
    if (!parent) return false;
    return /^(SCRIPT|STYLE|NOSCRIPT|CODE|PRE|TEXTAREA|OPTION)$/i.test(parent.tagName);
  }

  function fixNodeText(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;
    if (shouldSkipTextNode(node)) return false;
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return false;
    const fixed = normalizeText(raw);
    if (fixed !== raw) {
      node.nodeValue = fixed;
      return true;
    }
    return false;
  }

  function fixAttributes(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    let changed = false;
    for (const attr of ATTRS_TO_FIX) {
      if (!el.hasAttribute(attr)) continue;
      const raw = el.getAttribute(attr);
      const fixed = normalizeText(raw);
      if (fixed !== raw) {
        el.setAttribute(attr, fixed);
        changed = true;
      }
    }
    return changed;
  }

  function repairTextTree(root) {
    if (!root) return 0;
    let changes = 0;
    if (root.nodeType === Node.TEXT_NODE) {
      if (fixNodeText(root)) changes += 1;
      return changes;
    }
    if (root.nodeType === Node.ELEMENT_NODE) {
      if (fixAttributes(root)) changes += 1;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      let node = walker.nextNode();
      while (node) {
        if (fixNodeText(node)) changes += 1;
        node = walker.nextNode();
      }
      root.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach((el) => {
        if (fixAttributes(el)) changes += 1;
      });
    }
    return changes;
  }

  let repairPending = false;
  function scheduleRepair(root) {
    if (repairPending) return;
    repairPending = true;
    const target = root || document.body || document.documentElement;
    const exec = () => {
      repairPending = false;
      try { repairTextTree(target); } catch (_) {}
    };
    if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(exec);
    else setTimeout(exec, 0);
  }

  function patchNativeDialogs() {
    if (window.__DOKE_DIALOGS_PATCHED__) return;
    window.__DOKE_DIALOGS_PATCHED__ = true;
    if (typeof window.alert === "function") {
      const rawAlert = window.alert.bind(window);
      window.alert = (msg) => rawAlert(normalizeText(safeStr(msg)));
    }
    if (typeof window.confirm === "function") {
      const rawConfirm = window.confirm.bind(window);
      window.confirm = (msg) => rawConfirm(normalizeText(safeStr(msg)));
    }
  }

  function upgradeInline(el) {
    if (!el || (el.dataset && el.dataset.dokeUpgraded)) return;
    try {
      if (el.dataset) el.dataset.dokeUpgraded = "1";
      el.classList.add("doke-alert");
      const txt = normalizeText(el.textContent || "").toLowerCase();
      const cls = txt.includes("sucesso") || txt.includes("feito") || txt.includes("enviado")
        ? "doke-alert--success"
        : txt.includes("erro") || txt.includes("falha") || txt.includes("inválid") || txt.includes("inval")
          ? "doke-alert--error"
          : txt.includes("atenção") || txt.includes("atencao") || txt.includes("aviso")
            ? "doke-alert--warning"
            : "doke-alert--info";
      el.classList.add(cls);
      if (!el.querySelector(".doke-alert__title")) {
        const raw = (el.innerHTML || "").trim();
        if (raw && raw.length < 220 && !raw.includes("<div") && !raw.includes("<p") && !raw.includes("<ul")) {
          const title = cls === "doke-alert--error"
            ? "Erro"
            : cls === "doke-alert--success"
              ? "Sucesso"
              : cls === "doke-alert--warning"
                ? "Atenção"
                : "Aviso";
          el.innerHTML = `<div class="doke-alert__title">${title}</div><div class="doke-alert__text">${normalizeText(raw)}</div>`;
        }
      }
    } catch (_) {}
  }

  function scanInline() {
    const selectors = [
      "#msg", "#mensagem", "[role='alert']",
      ".alert", ".msg", ".mensagem", ".message",
      ".error", ".success", ".warning", ".info"
    ];
    document.querySelectorAll(selectors.join(",")).forEach(upgradeInline);
  }

  function boot() {
    updateOnlineUI();
    patchNativeDialogs();
    patchFetchNotifications();
    scanInline();
    scheduleRepair(document.body || document.documentElement);
    window.dokeRepairText = () => scheduleRepair(document.body || document.documentElement);
    window.dokeNotifyLoadError = (payload) => notifyHttpFailure(payload || {});

    const obs = new MutationObserver((entries) => {
      scanInline();
      for (const entry of entries) {
        if (entry.type === "characterData" && entry.target) {
          scheduleRepair(entry.target);
          continue;
        }
        if (entry.addedNodes && entry.addedNodes.length) {
          entry.addedNodes.forEach((node) => scheduleRepair(node));
        }
      }
    });
    obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  }

  window.addEventListener("error", (event) => {
    const msg = event && (event.message || (event.error && event.error.message))
      ? String(event.message || event.error.message)
      : "Erro inesperado.";
    if (isNoiseMessage(msg)) return;
    const key = `error:${msg}`;
    notifyOnce(key, {
      type: "error",
      title: "Erro de carregamento",
      message: clamp(normalizeText(msg), 260),
      details: {
        file: event && event.filename ? event.filename : "",
        line: event && event.lineno ? event.lineno : 0,
        col: event && event.colno ? event.colno : 0
      }
    }, 10000);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event && event.reason ? (event.reason.message || safeStr(event.reason)) : "Falha inesperada.";
    if (isNoiseMessage(reason)) return;
    const key = `promise:${reason}`;
    notifyOnce(key, {
      type: "error",
      title: "Falha em segundo plano",
      message: clamp(normalizeText(reason), 260),
      details: (typeof event.reason === "object" && event.reason) ? event.reason : { reason: safeStr(reason) }
    }, 10000);
  });

  window.addEventListener("online", () => {
    updateOnlineUI();
    notifyOnce("net:online", { type: "success", title: "Online", message: "Conexão restaurada." }, 3000);
  });

  window.addEventListener("offline", () => {
    updateOnlineUI();
    notifyOnce("net:offline", { type: "warn", title: "Offline", message: "Sem conexão no momento." }, 3000);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
