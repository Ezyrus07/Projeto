(function(){
  const body = document.body;
  if (!body || body.dataset.page !== 'comunidade') return;

  function setStyles(el, styles){
    if (!el) return;
    Object.entries(styles).forEach(([k,v])=>{ el.style.setProperty(k, v, 'important'); });
  }

  function clampText(el, lines){
    if (!el) return;
    setStyles(el, {
      display:'-webkit-box',
      '-webkit-box-orient':'vertical',
      '-webkit-line-clamp': String(lines),
      overflow:'hidden'
    });
  }

  function compactHero(){
    const hero = document.querySelector('.comm-hero-container');
    const header = document.querySelector('.comm-header');
    const title = document.querySelector('.comm-title');
    const actions = document.querySelector('.header-actions');
    const search = document.querySelector('.search-bar-comm');
    const createBtn = document.querySelector('.btn-create-comm');
    const groups = document.querySelector('.my-groups-section');
    const scroll = document.querySelector('.groups-scroll');
    if (!hero || !header) return;

    const w = window.innerWidth;
    if (w > 980){
      setStyles(hero, {
        display:'grid',
        'grid-template-columns':'minmax(0,1fr) 220px',
        gap:'16px',
        padding:'16px 18px',
        'border-radius':'24px',
        'min-height':'0'
      });
      setStyles(header, {
        display:'flex',
        'flex-direction':'column',
        'align-items':'flex-start',
        gap:'10px',
        margin:'0'
      });
      setStyles(title, { 'max-width':'640px' });
      const h1 = title?.querySelector('h1');
      const p = title?.querySelector('p');
      setStyles(h1, { 'font-size':'54px', 'line-height':'0.98', margin:'0 0 6px' });
      setStyles(p, { 'font-size':'16px', 'line-height':'1.35', margin:'0' });
      setStyles(actions, {
        display:'flex',
        'align-items':'center',
        gap:'10px',
        width:'100%',
        'max-width':'520px',
        'flex-wrap':'nowrap'
      });
      setStyles(search, {
        flex:'1 1 auto',
        width:'auto',
        'min-width':'0',
        'max-width':'none',
        height:'42px',
        padding:'0 14px'
      });
      setStyles(createBtn, {
        height:'42px',
        padding:'0 16px',
        'white-space':'nowrap'
      });
      setStyles(groups, {
        margin:'0',
        padding:'12px',
        background:'rgba(255,255,255,.08)',
        border:'1px solid rgba(255,255,255,.18)',
        'border-radius':'18px',
        'align-self':'stretch'
      });
      setStyles(scroll, {
        display:'grid',
        'grid-template-columns':'repeat(2,minmax(0,1fr))',
        gap:'10px'
      });
      document.querySelectorAll('.my-group-item').forEach(item=>setStyles(item, { width:'100%', 'min-width':'0', 'max-width':'none' }));
    } else {
      setStyles(hero, { display:'block', padding:'16px', 'grid-template-columns':'none' });
      setStyles(actions, { display:'grid', 'grid-template-columns':'1fr', gap:'10px', width:'100%', 'max-width':'none' });
      setStyles(search, { width:'100%', height:'42px', 'max-width':'none' });
      setStyles(createBtn, { width:'fit-content', height:'42px' });
      setStyles(groups, { padding:'0', background:'transparent', border:'none' });
      setStyles(scroll, { display:'flex', gap:'10px' });
    }
  }

  function compactFilters(){
    setStyles(document.querySelector('.comm-filter-nav'), { padding:'8px 10px', 'border-radius':'18px', 'margin-bottom':'12px' });
    setStyles(document.querySelector('.filter-tabs'), { gap:'8px', padding:'0 36px' });
    document.querySelectorAll('.tab-btn').forEach(btn=>setStyles(btn, { height:'38px', padding:'0 14px', 'font-size':'15px' }));
    document.querySelectorAll('.chips-arrow.comm-filter-arrow').forEach(btn=>setStyles(btn, { width:'34px', height:'34px', 'border-radius':'10px' }));
  }

  function compactCards(){
    const list = document.getElementById('listaComunidades');
    if (!list) return;
    const cols = window.innerWidth > 1220 ? 'repeat(3,minmax(0,1fr))' : (window.innerWidth > 760 ? 'repeat(2,minmax(0,1fr))' : '1fr');
    setStyles(list, { display:'grid', 'grid-template-columns': cols, gap:'14px', 'align-items':'start' });

    list.querySelectorAll('.com-card').forEach(card => {
      setStyles(card, { 'min-height':'176px', 'border-radius':'18px', overflow:'hidden' });
      setStyles(card.querySelector('.com-cover'), { height:'60px', 'background-size':'cover', 'background-position':'center' });
      setStyles(card.querySelector('.com-body'), {
        display:'grid',
        'grid-template-columns':'44px minmax(0,1fr)',
        'column-gap':'10px',
        padding:'0 12px 12px',
        'margin-top':'-12px'
      });
      setStyles(card.querySelector('.com-avatar'), { width:'40px', height:'40px', 'border-radius':'13px' });
      setStyles(card.querySelector('.com-info'), { 'padding-top':'4px' });
      setStyles(card.querySelector('.com-title-row'), { display:'flex', gap:'6px', 'align-items':'center', 'flex-wrap':'wrap', 'margin-bottom':'4px' });
      setStyles(card.querySelector('.com-title'), { 'font-size':'15px', 'line-height':'1.08', margin:'0' });
      setStyles(card.querySelector('.community-fallback-badge'), { 'font-size':'12px', padding:'4px 8px' });
      setStyles(card.querySelector('.com-desc'), { 'font-size':'13px', 'line-height':'1.25', margin:'0 0 8px', color:'#5f7086' });
      clampText(card.querySelector('.com-desc'), 2);
      setStyles(card.querySelector('.com-meta'), { display:'flex', gap:'6px', 'align-items':'center', 'flex-wrap':'wrap', margin:'0' });
      card.querySelectorAll('.pill').forEach(p=>setStyles(p, { height:'26px', padding:'0 10px', 'font-size':'12px' }));
      card.querySelectorAll('.meta-small').forEach(p=>setStyles(p, { 'font-size':'12px', 'font-weight':'700' }));
      setStyles(card.querySelector('.btn-ver-grupo'), { width:'auto', 'min-width':'78px', height:'30px', 'margin-top':'8px', padding:'0 12px', 'font-size':'12px', 'border-radius':'10px' });
    });
  }

  function applyAll(){
    compactHero();
    compactFilters();
    compactCards();
  }

  let raf = null;
  function schedule(){
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(applyAll);
  }

  document.addEventListener('DOMContentLoaded', schedule);
  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  setTimeout(schedule, 150);
  setTimeout(schedule, 600);
  setTimeout(schedule, 1400);

  const mo = new MutationObserver(schedule);
  mo.observe(document.documentElement, { childList:true, subtree:true });
})();
