/* DOKE Chat/Grupo UI helpers */
(function(){
  const safe = (s)=> String(s??"").replace(/[&<>"]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const stripAt = (u)=> String(u??"").replace(/^@+/, "").trim();
  const handle = (u)=> "@"+stripAt(u||"usuário");
  const timeHHMM = (d)=>{
    try{
      const dt = (d instanceof Date) ? d : new Date(d);
      if (isNaN(dt.getTime())) return "";
      return dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    }catch(e){ return ""; }
  };

  window.DOKE_UI = {
    safe, stripAt, handle, timeHHMM,
    meProfile(){
      try{ return JSON.parse(localStorage.getItem('doke_usuario_perfil')||"{}")||{}; }catch(e){ return {}; }
    },
    // Build standardized message wrapper (avatar + @ + time + bubbleHtml)
    wrap({me=false, foto="", user="", time="", bubbleHtml=""}){
      const cls = me ? "me" : "other";
      const avatar = foto || "https://i.pravatar.cc/150";
      const u = handle(user);
      const t = safe(time||"");
      return `
        <div class="msg-row ${cls}">
          ${me ? "" : `<img class="msg-avatar" src="${safe(avatar)}" alt="avatar" onerror="this.src='https://i.pravatar.cc/150'">`}
          <div class="msg-stack">
            <div class="msg-topline"><span class="msg-user">${safe(u)}</span><span class="msg-time">${t}</span></div>
            ${bubbleHtml}
          </div>
          ${me ? `<img class="msg-avatar" src="${safe(avatar)}" alt="avatar" onerror="this.src='https://i.pravatar.cc/150'">` : ""}
        </div>
      `;
    }
  };
})();
// Simple unified audio player (one at a time)
(function(){
  let audio = new Audio();
  let currentBtn = null;
  let raf = null;

  function fmt(sec){
    sec = Math.max(0, Math.floor(sec||0));
    const m = String(Math.floor(sec/60)).padStart(1,'0');
    const s = String(sec%60).padStart(2,'0');
    return `${m}:${s}`;
  }
  function stop(){
    try{ audio.pause(); }catch(e){}
    if(currentBtn){
      currentBtn.dataset.state = "paused";
      const icon = currentBtn.querySelector("i");
      if(icon) icon.className = "bx bx-play";
    }
    currentBtn = null;
    if(raf) cancelAnimationFrame(raf);
    raf = null;
  }
  function tick(){
    if(!currentBtn) return;
    const wrap = currentBtn.closest(".msg-row") || document;
    const timeEl = wrap.querySelector(".audio-time");
    const fill = wrap.querySelector(".audio-bar > i");
    const dur = audio.duration || 0;
    const cur = audio.currentTime || 0;
    if(timeEl) timeEl.textContent = `${fmt(cur)} / ${dur ? fmt(dur) : "0:00"}`;
    if(fill) fill.style.width = (dur ? (cur/dur)*100 : 0) + "%";
    raf = requestAnimationFrame(tick);
  }

  window.DOKE_playAudio = function(url, btn){
    if(!url || !btn) return;
    // toggle if same
    if(currentBtn === btn){
      if(audio.paused){ audio.play().catch(()=>{}); btn.dataset.state="playing"; btn.querySelector("i").className="bx bx-pause"; tick(); }
      else { stop(); }
      return;
    }
    stop();
    currentBtn = btn;
    audio.src = url;
    audio.currentTime = 0;
    audio.play().catch(()=>{});
    btn.dataset.state="playing";
    const icon = btn.querySelector("i");
    if(icon) icon.className="bx bx-pause";
    audio.onended = stop;
    audio.onpause = ()=>{ if(currentBtn===btn) stop(); };
    tick();
  };
})();
