(()=>{
    ctx.fillStyle = "rgba(59,130,246,0.10)";
    ctx.beginPath();
    seriesA.forEach((v,i)=>{
      const x = mapX(i, seriesA.length);
      const y = mapY(v);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.lineTo(mapX(seriesA.length-1, seriesA.length), gridBottom);
    ctx.lineTo(mapX(0, seriesA.length), gridBottom);
    ctx.closePath();
    ctx.fill();

    strokeLine(seriesA, "rgba(59,130,246,0.95)"); // views (azul)
    strokeLine(seriesB, "rgba(11,119,104,0.95)"); // clicks (verde)

    // y labels
    ctx.fillStyle = "rgba(15,23,42,0.55)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "left";
    ctx.fillText("0", gridLeft, gridBottom+14);
    ctx.textAlign = "right";
    ctx.fillText(formatCompact(maxV), gridRight, gridTop+10);
  }

    function renderBars(container, items){
    if(!container) return;
    const arr = Array.isArray(items) ? items : [];
    if(arr.length === 0){
      container.innerHTML = `<div class="dp-emptyMini"><i class="bx bx-bar-chart-alt-2"></i> Sem dados suficientes para categorias no período.</div>`;
      return;
    }
    const max = Math.max(...arr.map(i=>safeNum(i.v)), 1);
    container.innerHTML = arr.map(i=>{
      const v = safeNum(i.v);
      const w = Math.round((v/max)*100);
      return `
        <div class="dp-barRow">
          <div class="dp-barLabel">${escapeHtml(i.k)}</div>
          <div class="dp-barTrack"><div class="dp-barFill" style="width:${w}%"></div></div>
          <div class="dp-barVal">${formatCompact(v)}</div>
        </div>
      `;
    }).join("");
  }

    function renderFunnel(container, views, clicks, leads){
    if(!container) return;
    const v = safeNum(views);
    const c = safeNum(clicks);
    const l = safeNum(leads);

    const cRate = v > 0 ? (c/v) : null;
    const lRate = c > 0 ? (l/c) : null;

    container.innerHTML = `
      <div class="dp-funnelRow">
        <div class="dp-funnelStep dp-funnelStep--views">
          <b>${formatCompact(v)}</b>
          <div class="dp-subtle">Impressões</div>
        </div>
        <div class="dp-funnelArrow">→</div>
        <div class="dp-funnelStep dp-funnelStep--clicks">
          <b>${formatCompact(c)}</b>
          <div class="dp-subtle">Cliques • ${cRate === null ? "—" : pct(cRate)}</div>
        </div>
        <div class="dp-funnelArrow">→</div>
        <div class="dp-funnelStep dp-funnelStep--leads">
          <b>${formatCompact(l)}</b>
          <div class="dp-subtle">Orçamentos • ${lRate === null ? "—" : pct(lRate)}</div>
        </div>
      </div>
    `;
  }

    function renderKpis(container, stats){
    if(!container) return;
    const t = stats?.totals || {};
    const views = safeNum(t.views);
    const clicks = safeNum(t.clicks);
    const leads = safeNum(t.leads);
    const ratingAvg = (t.ratingAvg === null || t.ratingAvg === undefined) ? null : Number(t.ratingAvg);
    const ratingCount = safeNum(t.ratingCount);
    const rr = (t.responseRate === null || t.responseRate === undefined) ? null : Number(t.responseRate);
    const replyMins = (t.medianReplyMins === null || t.medianReplyMins === undefined) ? null : Number(t.medianReplyMins);

    const ctr = views > 0 ? (clicks / views) : null;
    const conv = clicks > 0 ? (leads / clicks) : null;

    const cards = [
      { title: "Visualizações", value: formatCompact(views), sub: views > 0 ? `CTR ${pct(ctr)} • total` : "total" },
      { title: "Cliques", value: formatCompact(clicks), sub: clicks > 0 ? `Conversão ${pct(conv)} • total` : "total" },
      { title: "Orçamentos", value: formatCompact(leads), sub: "no período" },
      { title: "Nota média", value: (ratingAvg ? ratingAvg.toFixed(1) : "—"), sub: ratingCount ? `${ratingCount} avaliações (30d)` : "sem avaliações (30d)" },
      { title: "Taxa de resposta", value: rr === null ? "—" : pct(rr), sub: replyMins ? `mediana ${Math.round(replyMins)}min` : "mensagens/orçamentos" }
    ];

    container.innerHTML = cards.map(c=>`
      <div class="dp-kpi">
        <div class="dp-kpiTitle">${escapeHtml(c.title)}</div>
        <div class="dp-kpiValue">${escapeHtml(c.value)}</div>
        <div class="dp-kpiSub">${escapeHtml(c.sub)}</div>
      </div>
    `).join("");
  }
    if(leads === 0 && views >= 150){
      items.push({ cls:"todo", icon:"bx bx-target-lock", title:"Fortaleça o CTA", text:"Você tem visualizações no período, mas nenhum orçamento. Ajuste preço/descrição e botão de contato." });
    }
    if(rr !== null && leads >= 3 && rr < 0.6){
      items.push({ cls:"todo", icon:"bx bx-message-rounded-dots", title:"Responda mais rápido", text:`Sua taxa de resposta está em ${pct(rr)}. Configure notificações e responda em até 1h.` });
    }
    if(replyMins !== null && replyMins >= 120){
      items.push({ cls:"todo", icon:"bx bx-time-five", title:"Reduza o tempo de resposta", text:`Mediana de ${Math.round(replyMins)} min. Respostas rápidas aumentam fechamentos.` });
    }
    if(ratingAvg !== null && ratingCount){
      if(ratingAvg < 4.5){
        items.push({ cls:"todo", icon:"bx bx-star", title:"Suba sua nota", text:`Sua média (30d) é ${ratingAvg.toFixed(1)}. Peça avaliações após concluir o serviço.` });
      }else{
        items.push({ cls:"ok", icon:"bx bx-star", title:"Boa reputação", text:`Média ${ratingAvg.toFixed(1)} nas últimas avaliações.` });
      }
    }else{
      items.push({ cls:"todo", icon:"bx bx-star", title:"Peça avaliações", text:"Após fechar um serviço, peça para o cliente avaliar. Isso melhora seu ranking." });
    }

    if(items.length === 0){
      items.push({ cls:"ok", icon:"bx bx-check-circle", title:"Perfil bem completo", text:"Seu perfil está com boa base. Continue postando e respondendo rápido." });
      items.push({ cls:"ok", icon:"bx bx-rocket", title:"Próximo passo", text:"Teste um novo título e thumbnail no anúncio com mais visualizações." });
    }

    listEl.innerHTML = items.slice(0,8).map(it=>`
      <li class="dp-insight ${it.cls}">
        <i class="${it.icon}"></i>
        <div>
          <b>${escapeHtml(it.title)}</b>
          <div class="dp-subtle">${escapeHtml(it.text)}</div>
        </div>
      </li>
    `).join("");
  }

  function aiReply(text){
    const t = String(text||"").toLowerCase();
    if(t.includes("titulo") || t.includes("descri")){
      return [
        "Ideias rápidas:",
        "• Título: benefício + urgência (ex: 'Encanador hoje — orçamento grátis')",
        "• Descrição: 1) o que você faz, 2) região atendida, 3) garantia, 4) como chamar",
        "• Use 3–5 fotos reais, e 1 antes/depois quando possível."
      ].join("\n");
    }
    if(t.includes("avali") || t.includes("segu")){
      return [
        "Para ganhar mais avaliações e seguidores:",
        "• Ao finalizar o serviço, peça avaliação com 1 clique (link direto no chat).",
        "• Poste antes/depois e marque 'trabalho concluído'.",
        "• Responda rápido: isso aumenta rank e confiança."
      ].join("\n");
    }
    if(t.includes("perfil") || t.includes("confian")){
      return [
        "Checklist de confiança no perfil:",
        "• Foto nítida + capa com sua área (ex: 'Elétrica / 24h').",
        "• Bio curta com diferencial (garantia, tempo, região).",
        "• 3 trabalhos no portfólio + 1 antes/depois.",
        "• Preço/forma de cobrança clara (a combinar / por hora)."
      ].join("\n");
    }
    // default
    return [
      "Sugestões para vender mais:",
      "• Ajuste o título para 'serviço + cidade + benefício'.",
      "• Coloque fotos reais (antes/depois) e uma prova social (avaliações).",
      "• Responda em menos de 15 min e ofereça orçamento rápido.",
      "Se quiser, me diga seu serviço e bairro/cidade que eu te dou 5 títulos prontos."
    ].join("\n");
  }

  function appendMsg(wrap, who, text){
    if(!wrap) return;
    const div = document.createElement("div");
    div.className = `dp-aiMsg ${who}`;
    const pre = document.createElement("pre");
    pre.textContent = text;
    div.appendChild(pre);
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
  }

    function initAiChat(ctx){
    const card = document.getElementById("dpAiCard") || document.querySelector(".dp-aiCard");
    const toggle = document.getElementById("dpAiToggle");

    const wrap = document.getElementById("dpAiMsgs");
    const input = document.getElementById("dpAiInput");
    const send = document.getElementById("dpAiSend");
    if(!wrap || !input || !send) return;

    // esconder/mostrar
    if(card && toggle && !toggle.dataset.bound){
      toggle.dataset.bound = "1";
      const key = "doke_ai_collapsed";
      const apply = (collapsed)=>{
        card.classList.toggle("dp-aiCollapsed", !!collapsed);
        toggle.innerHTML = collapsed ? '<i class="bx bx-chevron-up"></i>' : '<i class="bx bx-chevron-down"></i>';
        toggle.setAttribute("aria-label", collapsed ? "Mostrar DOKE-AI" : "Ocultar DOKE-AI");
      };
      apply(localStorage.getItem(key) === "1");
      toggle.addEventListener("click", ()=>{
        const next = !card.classList.contains("dp-aiCollapsed");
        apply(next);
        localStorage.setItem(key, next ? "1" : "0");
      });
    }

    // seed welcome
    if(!wrap.dataset.inited){
      wrap.dataset.inited = "1";
      appendMsg(wrap, "bot", "Oi! Eu sou o DOKE-AI (BETA). Posso sugerir melhorias para anúncios e perfil (layout de demonstração).");
      appendMsg(wrap, "bot", "Exemplos: 'melhorar título', 'como conseguir avaliações', 'o que falta no meu perfil'.");
    }

    const doSend = (q)=>{
      const txt = String(q || input.value || "").trim();
      if(!txt) return;
      appendMsg(wrap, "user", txt);
      input.value = "";
      // typing
      const typing = document.createElement("div");
      typing.className = "dp-aiMsg bot dp-aiTyping";
      typing.innerHTML = "<span></span><span></span><span></span>";
      wrap.appendChild(typing);
      wrap.scrollTop = wrap.scrollHeight;

      setTimeout(()=>{
        typing.remove();
        appendMsg(wrap, "bot", aiReply(txt));
      }, 550);
    };

    send.onclick = ()=> doSend();
    input.addEventListener("keydown", (e)=>{
      if(e.key === "Enter"){ e.preventDefault(); doSend(); }
    });

    document.querySelectorAll(".dp-aiChip").forEach(btn=>{
      btn.addEventListener("click", ()=> doSend(btn.dataset.q || btn.textContent));
    });
  }

    async function initProDashboard(ctx){
    // somente profissional DONO
    const isProOwner = !!(ctx?.target?.isProfissional && ctx?.canEdit);
    if(!isProOwner){
      toast("Área restrita ao profissional.");
      return;
    }


    initAiChat(ctx);

    const rangeSel = document.getElementById("dpAnalyticsRange");
    const refreshBtn = document.getElementById("dpAnalyticsRefresh");
    const chart = document.getElementById("dpChartViews");
    const kpiRow = document.getElementById("dpKpiRow");
    const cats = document.getElementById("dpTopCats");
    const funnel = document.getElementById("dpFunnel");
    const subtitle = document.getElementById("dpChartSubtitle");
if(!rangeSel || !refreshBtn) return;

    const setBusy = (on)=>{
      if(on){
        refreshBtn.disabled = true;
        refreshBtn.classList.add("dp-busy");
      }else{
        refreshBtn.disabled = false;
        refreshBtn.classList.remove("dp-busy");
      }
    };

    const render = async ()=>{
      const days = parseInt(rangeSel.value || "14", 10) || 14;
      if(subtitle) subtitle.textContent = `Últimos ${days} dias`;
})();
