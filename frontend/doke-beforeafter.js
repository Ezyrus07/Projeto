/* DOKE Antes x Depois (shared enhancer) */
(function () {
  // Flag global para desativar alternâncias antigas (setInterval) e expor enhancer
  try { window.__DOKE_BA = true; } catch (_) {}

  const SELECTOR = ".js-antes-depois,[data-before][data-after],[data-before-url][data-after-url]";

  function makeImg(cls, src, alt) {
    const img = document.createElement("img");
    img.className = cls;
    img.loading = "lazy";
    img.alt = alt || "";
    if (src) img.src = src;
    return img;
  }

  function getAttr(el, nameA, nameB) {
    return el.getAttribute(nameA) || el.getAttribute(nameB) || "";
  }

  function build(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.dataset && el.dataset.baEnhanced === "1") return;

    const before =
      getAttr(el, "data-before", "data-before-url") ||
      (el.dataset ? (el.dataset.before || el.dataset.beforeUrl || "") : "");
    const after =
      getAttr(el, "data-after", "data-after-url") ||
      (el.dataset ? (el.dataset.after || el.dataset.afterUrl || "") : "");

    if (!before || !after) return;

    // marca antes de mexer (evita loops do MutationObserver)
    try { el.dataset.baEnhanced = "1"; } catch (_) {}

    el.classList.add("dp-ba", "js-antes-depois");

    // stack
    let stack = el.querySelector(".dp-ba-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "dp-ba-stack";

      // se já existe uma img “solta”, reaproveita como BEFORE
      const existing = el.querySelector("img");
      if (existing && !existing.closest(".dp-ba-stack")) {
        existing.className = "dp-ba-img dp-ba-img--before";
        existing.alt = existing.alt || "Antes";
        existing.loading = "lazy";
        existing.src = before;
        stack.appendChild(existing);
      } else {
        stack.appendChild(makeImg("dp-ba-img dp-ba-img--before", before, "Antes"));
      }

      stack.appendChild(makeImg("dp-ba-img dp-ba-img--after", after, "Depois"));

      // limpa mídia duplicada (apenas imagens diretas, não remove conteúdo do card)
      Array.from(el.querySelectorAll(":scope > img")).forEach((img) => {
        if (!img.closest(".dp-ba-stack")) img.remove();
      });

      el.appendChild(stack);
    } else {
      // garante imgs
      let b = stack.querySelector(".dp-ba-img--before");
      let a = stack.querySelector(".dp-ba-img--after");
      if (!b) {
        b = makeImg("dp-ba-img dp-ba-img--before", before, "Antes");
        stack.appendChild(b);
      }
      if (!a) {
        a = makeImg("dp-ba-img dp-ba-img--after", after, "Depois");
        stack.appendChild(a);
      }
      if (before) b.src = before;
      if (after) a.src = after;
    }

    // dots
    let dots = el.querySelector(".dp-ba-dots");
    if (!dots) {
      dots = document.createElement("div");
      dots.className = "dp-ba-dots";
      dots.setAttribute("aria-label", "Alternar antes/depois");
      dots.innerHTML = `
        <button type="button" class="dp-dot is-active" data-show="before" aria-label="Mostrar Antes"></button>
        <button type="button" class="dp-dot" data-show="after" aria-label="Mostrar Depois"></button>
      `;
      el.appendChild(dots);
    }

    // badge
    let badge = el.querySelector(".dp-ba-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "dp-ba-badge";
      badge.textContent = "Antes";
      el.appendChild(badge);
    }

    const btnBefore = dots.querySelector('[data-show="before"]');
    const btnAfter = dots.querySelector('[data-show="after"]');

    function setMode(mode) {
      const isAfter = mode === "after";
      el.classList.toggle("is-after", isAfter);
      if (btnBefore) btnBefore.classList.toggle("is-active", !isAfter);
      if (btnAfter) btnAfter.classList.toggle("is-active", isAfter);
      badge.textContent = isAfter ? "Depois" : "Antes";
    }

    // listeners (uma vez)
    if (el.dataset && el.dataset.baBound !== "1") {
      try { el.dataset.baBound = "1"; } catch (_) {}

      dots.addEventListener("click", (ev) => {
        const t = ev.target && ev.target.closest && ev.target.closest(".dp-dot");
        if (!t) return;
        ev.preventDefault();
        ev.stopPropagation();
        setMode(t.getAttribute("data-show") === "after" ? "after" : "before");
      });

      el.addEventListener("click", (ev) => {
        if (ev.target && ev.target.closest && ev.target.closest(".dp-ba-dots")) return;
        setMode(el.classList.contains("is-after") ? "before" : "after");
      });
    }

    
    // AUTOPLAY (suave e lento) — alterna automaticamente, mas pausa quando o usuário interage
    if (el.dataset && el.dataset.baAuto !== "0" && el.dataset.baAutoBound !== "1") {
      try { el.dataset.baAutoBound = "1"; } catch (_) {}
      let t = 0;
      const delay = 5200; // tempo entre trocas
      const schedule = () => {
        clearTimeout(t);
        t = setTimeout(() => {
          setMode(el.classList.contains("is-after") ? "before" : "after");
          schedule();
        }, delay);
      };
      const pause = () => { clearTimeout(t); };
      schedule();

      el.addEventListener("mouseenter", pause, { passive: true });
      el.addEventListener("mouseleave", schedule, { passive: true });

      // Mobile: pausa no toque e volta depois de um tempinho
      el.addEventListener("touchstart", pause, { passive: true });
      el.addEventListener("touchend", () => { setTimeout(schedule, 900); }, { passive: true });

      // Quando interagir, reinicia o timer (pra não trocar “no susto”)
      dots.addEventListener("click", () => { setTimeout(schedule, 900); }, { passive: true });
      el.addEventListener("click", () => { setTimeout(schedule, 900); }, { passive: true });
    }
// modo inicial
    setMode("before");
  }

  function enhanceIn(root) {
    const base = root && root.querySelectorAll ? root : document;
    const els = Array.from(base.querySelectorAll(SELECTOR));
    for (const el of els) build(el);
  }

  // expõe para páginas que renderizam depois
  try { window.__DOKE_BA_ENHANCE = enhanceIn; } catch (_) {}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => enhanceIn(document));
  } else {
    enhanceIn(document);
  }

  // Debounce MutationObserver (evita travar)
  const queue = new Set();
  let raf = 0;

  function flush() {
    raf = 0;
    const nodes = Array.from(queue);
    queue.clear();
    for (const n of nodes) enhanceIn(n);
  }

  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (!m.addedNodes || !m.addedNodes.length) continue;
      m.addedNodes.forEach((n) => {
        if (!n || n.nodeType !== 1) return;
        // ignora nós que são apenas partes internas que nós mesmos criamos
        if (n.classList && (n.classList.contains("dp-ba-dots") || n.classList.contains("dp-ba-badge") || n.classList.contains("dp-ba-stack"))) return;
        queue.add(n);
      });
    }
    if (!raf) raf = requestAnimationFrame(flush);
  });

  try { mo.observe(document.documentElement, { subtree: true, childList: true }); } catch (_) {}
})();
