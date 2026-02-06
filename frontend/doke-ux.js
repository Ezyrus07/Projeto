
(function(){
  "use strict";

  // ---------------------------
  // Helpers
  // ---------------------------
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const onReady = (fn) => (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn());

  function toast(msg, type="info"){
    if (typeof window.dokeToast === "function") return window.dokeToast(msg, type);
    if (typeof window.mostrarToast === "function") return window.mostrarToast(msg, type);
    // fallback leve
    try { console[type === "error" ? "error" : "log"](msg); } catch(e){}
    if (!window.__DOKE_SILENT_ALERTS__) { /* último fallback */ try{ alert(msg); }catch(e){} }
  }

  // ---------------------------
  // Config
  // ---------------------------
  window.DOKE_CONFIG = window.DOKE_CONFIG || {
    whatsappSupport: "",
    supportEmail: "",
    supportChatUrl: "chat.html"
  };

  // ---------------------------
  // 1) Máscaras (CPF / CEP / Telefone)
  // ---------------------------
  function onlyDigits(v){ return (v||"").replace(/\D/g,""); }
  function maskCPF(v){
    v = onlyDigits(v).slice(0,11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v;
  }
  function maskCEP(v){
    v = onlyDigits(v).slice(0,8);
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
    return v;
  }
  function maskTelefone(v){
    v = onlyDigits(v).slice(0,11);
    if(v.length <= 10){
      return v.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (m,a,b,c)=>{
        if(!a) return "";
        if(!b) return `(${a}`;
        if(!c) return `(${a}) ${b}`;
        return `(${a}) ${b}-${c}`;
      });
    }
    return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
  }

  function attachMasks(){
    const inputs = $$("input, textarea, select").filter(el => !el.dataset.dokeMaskBound);
    inputs.forEach(el=>{
      const id = (el.id||"").toLowerCase();
      const nm = (el.name||"").toLowerCase();
      const key = id+" "+nm+" "+(el.placeholder||"").toLowerCase();

      let kind = null;
      if (/(^|\b)(cpf)(\b|$)/.test(key)) kind = "cpf";
      else if (/(^|\b)(cep)(\b|$)/.test(key)) kind = "cep";
      else if (/(telefone|celular|whats|wpp|phone|tel)/.test(key)) kind = "tel";

      if(!kind) return;

      el.dataset.dokeMaskBound = "1";
      el.addEventListener("input", ()=>{
        const pos = el.selectionStart;
        const old = el.value;
        if(kind==="cpf") el.value = maskCPF(el.value);
        if(kind==="cep") el.value = maskCEP(el.value);
        if(kind==="tel") el.value = maskTelefone(el.value);
        try{
          // tentativa simples de não "pular" o cursor
          const delta = el.value.length - old.length;
          el.setSelectionRange(pos + delta, pos + delta);
        }catch(e){}
      }, {passive:true});
    });
  }

  // ---------------------------
  // 2) Form helpers: foco no primeiro erro + autosave + anti-duplo envio
  // ---------------------------
  function focusFirstInvalid(form){
    const first = form.querySelector(":invalid");
    if(first){
      first.classList.add("doke-invalid");
      first.focus({preventScroll:true});
      first.scrollIntoView({behavior:"smooth", block:"center"});
      setTimeout(()=>first.classList.remove("doke-invalid"), 1800);
      return true;
    }
    return false;
  }

  function bindValidationFocus(){
    document.addEventListener("submit", (e)=>{
      const form = e.target;
      if(!(form instanceof HTMLFormElement)) return;
      // respeita forms com novalidate
      if(form.hasAttribute("novalidate")) return;

      if(!form.checkValidity()){
        e.preventDefault();
        e.stopPropagation();
        focusFirstInvalid(form);
        toast("Confira os campos obrigatórios.", "warning");
      }
    }, true);
  }

  function bindGuardSubmit(){
    document.addEventListener("submit", (e)=>{
      const form = e.target;
      if(!(form instanceof HTMLFormElement)) return;
      if(!form.hasAttribute("data-guard-submit")) return;
      // se foi prevenido por outra lógica, não trava
      if(e.defaultPrevented) return;

      const btns = $$("button[type=submit], input[type=submit]", form);
      btns.forEach(b=>{
        b.disabled = true;
        b.classList.add("doke-submit-lock");
        b.dataset.__dokeOldText = b.tagName === "BUTTON" ? b.textContent : b.value;
        if(b.tagName === "BUTTON") b.textContent = "Enviando...";
        else b.value = "Enviando...";
      });

      // fallback de segurança: reabilita depois de um tempo
      window.setTimeout(()=>{
        btns.forEach(b=>{
          b.disabled = false;
          b.classList.remove("doke-submit-lock");
          const old = b.dataset.__dokeOldText || "";
          if(b.tagName === "BUTTON" && old) b.textContent = old;
          if(b.tagName !== "BUTTON" && old) b.value = old;
        });
      }, 6500);
    }, true);
  }

  function serializeForm(form){
    const data = {};
    const els = $$("input, textarea, select", form);
    els.forEach(el=>{
      const key = el.name || el.id;
      if(!key) return;
      if(el.type === "password") return; // não salva senha
      if(el.type === "file") return;
      if(el.type === "checkbox") data[key] = !!el.checked;
      else if(el.type === "radio"){
        if(el.checked) data[key] = el.value;
        else if(data[key] === undefined) data[key] = null;
      } else data[key] = el.value;
    });
    return data;
  }
  function applyForm(form, data){
    if(!data) return;
    const els = $$("input, textarea, select", form);
    els.forEach(el=>{
      const key = el.name || el.id;
      if(!key || !(key in data)) return;
      if(el.type === "file") return;
      if(el.type === "checkbox") el.checked = !!data[key];
      else if(el.type === "radio"){
        el.checked = (data[key] !== null && el.value === data[key]);
      } else {
        el.value = data[key] ?? "";
      }
      el.dispatchEvent(new Event("input", {bubbles:true}));
    });
  }

  function bindAutosave(){
    const forms = $$("form[data-autosave]");
    forms.forEach(form=>{
      const key = form.getAttribute("data-autosave") || ("doke_draft_"+location.pathname);
      // restore
      try{
        const raw = localStorage.getItem(key);
        if(raw){
          const data = JSON.parse(raw);
          applyForm(form, data);
        }
      }catch(e){}
      // save
      let t = null;
      const save = ()=>{
        try{
          const data = serializeForm(form);
          localStorage.setItem(key, JSON.stringify(data));
        }catch(e){}
      };
      form.addEventListener("input", ()=>{
        if(t) clearTimeout(t);
        t = setTimeout(save, 250);
      }, {passive:true});
      form.addEventListener("change", ()=>{
        if(t) clearTimeout(t);
        t = setTimeout(save, 100);
      }, {passive:true});
    });
  }

  
  // ---------------------------
  // 2.5) File inputs: contador de arquivos (prévia simples)
  // ---------------------------
  function bindFileCounts(){
    const inputs = $$('input[type="file"]')
      .filter(el => !el.dataset.dokeFileCountBound)
      // ignora inputs escondidos (evita "Nenhum arquivo selecionado" em botões customizados)
      .filter(el => !(el.hidden || el.hasAttribute('hidden')))
      .filter(el => {
        try{
          const cs = getComputedStyle(el);
          if(cs.display === 'none' || cs.visibility === 'hidden') return false;
          if(el.offsetWidth < 12 && el.offsetHeight < 12) return false;
        }catch(e){}
        return true;
      });
    inputs.forEach(input=>{
      input.dataset.dokeFileCountBound = "1";

      // encontra um lugar bom para colocar a info
      const host = input.closest('.field') || input.parentElement || input;
      const info = document.createElement('div');
      info.className = 'doke-filecount';
      info.textContent = '';
      info.style.display = 'none';

      // insere depois do input (ou no final do host)
      if (input.parentElement) {
        input.insertAdjacentElement('afterend', info);
      } else {
        host.appendChild(info);
      }

      const update = ()=>{
        const n = (input.files && input.files.length) ? input.files.length : 0;
        if(n){
          info.textContent = `${n} arquivo${n>1?'s':''} selecionado${n>1?'s':''}`;
          info.style.display = '';
        } else {
          info.textContent = '';
          info.style.display = 'none';
        }
      };
      input.addEventListener('change', update);
      update();
    });
  }

  // ---------------------------
  // 3) Password strength
  // ---------------------------
  function scorePassword(pw){
    pw = pw || "";
    let score = 0;
    if(pw.length >= 8) score++;
    if(pw.length >= 12) score++;
    if(/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if(/\d/.test(pw)) score++;
    if(/[^A-Za-z0-9]/.test(pw)) score++;
    // 0..5
    return Math.min(5, score);
  }
  function statusFromScore(s){
    if(s <= 1) return {t:"fraca", w:18};
    if(s === 2) return {t:"ok", w:35};
    if(s === 3) return {t:"boa", w:60};
    if(s === 4) return {t:"forte", w:82};
    return {t:"muito forte", w:100};
  }
  function ensureMeter(input){
    if(!input || input.dataset.dokePwBound) return;
    input.dataset.dokePwBound = "1";

    // cria meter se não existir
    let meter = input.parentElement && input.parentElement.querySelector(".doke-pw-meter");
    if(!meter){
      meter = document.createElement("div");
      meter.className = "doke-pw-meter";
      meter.innerHTML = `
        <div class="row"><span class="label">Força da senha</span><span class="status">—</span></div>
        <div class="bar"><i></i></div>
      `;
      (input.parentElement || input).insertAdjacentElement("afterend", meter);
    }
    const statusEl = $(".status", meter);
    const bar = $(".bar > i", meter);

    const update = ()=>{
      const s = scorePassword(input.value);
      const st = statusFromScore(s);
      if(statusEl) statusEl.textContent = st.t;
      if(bar) bar.style.width = st.w + "%";
    };
    input.addEventListener("input", update, {passive:true});
    update();
  }
  function bindPasswordMeters(){
    // Ativa medidor apenas na criação de conta (cadastro)
    const file = ((location.pathname.split('/').pop() || '').split('?')[0] || '').toLowerCase();
    const enabled = (document.body && document.body.getAttribute('data-password-meter') === '1')
      || !!document.querySelector('[data-password-meter="1"]')
      || file === 'cadastro.html';
    if(!enabled) return;
    const pwInputs = $$("input[type=password], input[id*=senha i], input[name*=senha i]");
    pwInputs.forEach(ensureMeter);
  }

  // ---------------------------
  // 4) Empty state observer
  // ---------------------------
  function renderEmpty(el){
    const title = el.getAttribute("data-empty-title") || "Nada encontrado";
    const desc  = el.getAttribute("data-empty-state") || "Tente ajustar sua busca, filtros ou voltar mais tarde.";
    const icon  = el.getAttribute("data-empty-icon") || "bx bx-search-alt";
    // remove loader(s) se existirem
    const loaders = $$(".doke-empty, .doke-empty-state", el);
    loaders.forEach(n=>n.remove());
    const wrap = document.createElement("div");
    wrap.className = "doke-empty doke-soft-card doke-empty-state";
    wrap.innerHTML = `
      <div class="ico"><i class='${icon}'></i></div>
      <h3>${title}</h3>
      <p>${desc}</p>
    `;
    el.appendChild(wrap);
  }
  function hasMeaningfulChildren(el){
    const kids = Array.from(el.children || []);
    if(kids.length === 0) return false;
    // se só tem um loader/spinner simples, considera vazio
    if(kids.length === 1){
      const k = kids[0];
      const txt = (k.textContent||"").trim();
      const cls = (k.className||"").toString();
      if(/loader|spin|bx-spin/i.test(cls) || /carregando|loading/i.test(txt)) return false;
    }
    // se tem cards
    return true;
  }
  function bindEmptyStates(){
    $$("[data-empty-state]").forEach(el=>{
      const check = ()=>{
        if(!hasMeaningfulChildren(el)){
          renderEmpty(el);
        } else {
          // remove empty state se já existe
          $$(".doke-empty-state", el).forEach(n=>n.remove());
        }
      };
      check();
      const obs = new MutationObserver(()=>check());
      obs.observe(el, {childList:true, subtree:false});
    });
  }

  // ---------------------------
  // 5) Sticky CTA (mobile)
  // ---------------------------
  function bindStickyCTA(){
    const targets = $$("[data-sticky-cta]");
    if(!targets.length) return;

    // cria barra única
    let bar = $(".doke-sticky-cta");
    if(!bar){
      bar = document.createElement("div");
      bar.className = "doke-sticky-cta";
      bar.innerHTML = `<div class="inner"></div>`;
      document.body.appendChild(bar);
    }
    const inner = $(".inner", bar);

    targets.forEach((el, idx)=>{
      const label = el.getAttribute("data-sticky-cta-label") || (el.textContent||"").trim() || "Continuar";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cta-btn";
      // tenta reaproveitar classes do botão original
      const cls = (el.className || "").toString();
      if(cls) btn.className = ("cta-btn " + cls).trim();
      btn.textContent = label;
      btn.addEventListener("click", ()=>{
        try{ el.click(); }catch(e){}
      });
      inner.appendChild(btn);
    });
  }

  // ---------------------------
  
  // ---------------------------
  // 5.5) Links de suporte (botões existentes)
  // ---------------------------
  function bindSupportLinks(){
    const cfg = window.DOKE_CONFIG || {};
    $$("[data-support-link]").forEach(a=>{
      const kind = a.getAttribute("data-support-link");
      a.addEventListener("click", (e)=>{
        // só intercepta se o href for vazio/# ou javascript:void
        const href = (a.getAttribute("href")||"").trim();
        if(href && href !== "#" && !href.startsWith("javascript")) return;
        e.preventDefault();
        if(kind === "chat"){
          location.href = cfg.supportChatUrl || "chat.html";
          return;
        }
        if(kind === "wpp"){
          const link = cfg.whatsappSupport || "";
          if(!link){ toast("Configure o WhatsApp de suporte em doke-config.js", "info"); return; }
          window.open(link, "_blank", "noopener,noreferrer");
          return;
        }
        if(kind === "mail"){
          const mail = cfg.supportEmail || "";
          if(!mail){ toast("Configure o e-mail de suporte em doke-config.js", "info"); return; }
          location.href = "mailto:" + mail;
        }
      });
    });
  }

// 6) Support FAB (apenas páginas que pedirem)
  // ---------------------------
  function bindSupportFAB(){
    const enabled = document.body && document.body.getAttribute("data-support-fab") === "1";
    if(!enabled) return;

    const fab = document.createElement("div");
    fab.className = "doke-fab";
    fab.innerHTML = `
      <button class="main" type="button" aria-label="Suporte"><i class='bx bx-support'></i></button>
      <div class="panel">
        <a class="opt" href="#" data-act="chat">
          <span class="badge"><i class='bx bx-chat'></i></span>
          <span><b>Chat</b><small>Fale com a equipe</small></span>
        </a>
        <a class="opt" href="#" data-act="wpp">
          <span class="badge"><i class='bx bxl-whatsapp'></i></span>
          <span><b>WhatsApp</b><small>Resposta rápida</small></span>
        </a>
        <a class="opt" href="#" data-act="mail">
          <span class="badge"><i class='bx bx-envelope'></i></span>
          <span><b>E-mail</b><small>Envie detalhes</small></span>
        </a>
      </div>
    `;
    document.body.appendChild(fab);

    const toggle = ()=> fab.classList.toggle("open");
    $(".main", fab).addEventListener("click", toggle);
    document.addEventListener("click", (e)=>{
      if(!fab.contains(e.target)) fab.classList.remove("open");
    });

    fab.addEventListener("click", (e)=>{
      const a = e.target.closest("[data-act]");
      if(!a) return;
      e.preventDefault();
      const act = a.getAttribute("data-act");
      const cfg = window.DOKE_CONFIG || {};
      if(act === "chat"){
        location.href = cfg.supportChatUrl || "chat.html";
        return;
      }
      if(act === "wpp"){
        const link = cfg.whatsappSupport || "";
        if(!link){ toast("Configure o WhatsApp de suporte em doke-config.js", "info"); return; }
        window.open(link, "_blank", "noopener,noreferrer");
        return;
      }
      if(act === "mail"){
        const mail = cfg.supportEmail || "";
        if(!mail){ toast("Configure o e-mail de suporte em doke-config.js", "info"); return; }
        location.href = "mailto:" + mail;
      }
    });
  }


  // ---------------------------
  // Sidebar: item ativo (desktop)
  // ---------------------------
  function markActiveSidebar(){
    const sidebar = document.querySelector("aside.sidebar-icones");
    if(!sidebar) return;
    const file = (location.pathname.split("/").pop() || "index.html").split("?")[0];
    const links = Array.from(sidebar.querySelectorAll("a[href]"));
    links.forEach(a=>{
      const href = (a.getAttribute("href") || "").split("?")[0];
      if(!href || href === "#") return;
      if(href === file){
        const item = a.closest(".item");
        if(item) item.classList.add("active");
      }
    });

    // marca "Pesquisar" como ativo em páginas de busca/resultado/explorar
    if(["busca.html","resultado.html","busca.html"].includes(file)){
      const it = sidebar.querySelector("#pvSearchSidebarItem");
      if(it) it.classList.add("active");
    }
  }

  // ---------------------------
  // Init
  // ---------------------------
  onReady(()=>{
    markActiveSidebar();
    attachMasks();
    bindValidationFocus();
    bindGuardSubmit();
    bindAutosave();
    bindFileCounts();
    bindPasswordMeters();
    bindEmptyStates();
    bindStickyCTA();
    bindSupportLinks();
    bindSupportFAB();
  });

  // caso carregue conteúdo depois
  window.addEventListener("pageshow", ()=>attachMasks());
})();
