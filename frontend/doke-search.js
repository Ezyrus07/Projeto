(()=>{
  const LS_KEY = 'doke_search_history_v1';
  const MAX = 10;

  const debounce = (fn, ms=220)=>{
    let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
  };

  function getHist(){
    try{ return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }catch(_){ return []; }
  }
  function pushHist(q){
    q = (q||'').trim();
    if(!q) return;
    let h = getHist().filter(x=>x !== q);
    h.unshift(q);
    h = h.slice(0, MAX);
    try{ localStorage.setItem(LS_KEY, JSON.stringify(h)); }catch(_){ }
  }

  function findSearchInputs(){
    const candidates = Array.from(document.querySelectorAll('input[type="search"], input[placeholder*="eletric" i], input[placeholder*="@"], input[data-search], input[name*="search" i]'));
    // prefer visible + within a search hero area
    return candidates.filter(i=>{
      const r=i.getBoundingClientRect();
      return r.width>80 && r.height>24;
    });
  }

  function makeSuggestBox(){
    const box = document.createElement('div');
    box.className='doke-suggest';
    box.innerHTML = `<div class="doke-suggest__head">Sugestões</div><div class="doke-suggest__list"></div>`;
    return box;
  }

  function render(box, items){
    const list = box.querySelector('.doke-suggest__list');
    list.innerHTML='';
    items.forEach(it=>{
      const row = document.createElement('div');
      row.className='doke-suggest__item';
      row.innerHTML = `<span class="doke-suggest__dot"></span><span class="doke-suggest__label"></span><span class="doke-suggest__sub"></span>`;
      row.querySelector('.doke-suggest__label').textContent = it.label;
      row.querySelector('.doke-suggest__sub').textContent = it.sub || '';
      row.addEventListener('click', ()=> it.onPick?.());
      list.appendChild(row);
    });
    box.classList.toggle('open', items.length>0);
  }

  async function supaSuggest(q){
    const sb = window.supabase;
    if(!sb || !q || q.length < 2) return [];

    const attempts = [
      // profiles/users
      { table: 'profiles', cols: ['username','user','nome','name'], sub: 'Perfil' },
      { table: 'usuarios', cols: ['user','nome','username'], sub: 'Usuário' },
      // services/anuncios
      { table: 'anuncios', cols: ['titulo','title','categoria','categoria_profissional'], sub: 'Serviço' },
      { table: 'servicos', cols: ['titulo','title','categoria'], sub: 'Serviço' },
    ];

    const out = [];
    for(const a of attempts){
      for(const c of a.cols){
        try{
          const { data, error } = await sb
            .from(a.table)
            .select(`${c}`)
            .ilike(c, `%${q}%`)
            .limit(5);
          if(error) continue;
          if(Array.isArray(data)){
            data.forEach(row=>{
              const val = row?.[c];
              if(typeof val === 'string' && val.trim()){
                out.push({ label: val.trim(), sub: a.sub });
              }
            });
          }
          if(out.length>=6) return uniq(out).slice(0,6);
        }catch(_){ /* ignore */ }
      }
    }
    return uniq(out).slice(0,6);
  }

  function uniq(items){
    const seen=new Set();
    return items.filter(i=>{ const k=(i.sub||'')+'::'+i.label; if(seen.has(k)) return false; seen.add(k); return true; });
  }

  function attach(input){
    const wrap = input.parentElement;
    if(!wrap) return;
    // ensure relatively positioned
    if(getComputedStyle(wrap).position === 'static') wrap.style.position='relative';

    const box = makeSuggestBox();
    wrap.appendChild(box);

    const close = ()=> box.classList.remove('open');
    document.addEventListener('click', (e)=>{
      if(!wrap.contains(e.target)) close();
    });

    const update = debounce(async ()=>{
      const q = (input.value||'').trim();
      const hist = getHist().filter(h=>h.toLowerCase().includes(q.toLowerCase())).slice(0,6);

      const items = [];
      hist.forEach(h=>items.push({ label: h, sub:'Histórico', onPick: ()=>{ input.value=h; input.dispatchEvent(new Event('input',{bubbles:true})); close(); } }));

      const live = await supaSuggest(q);
      live.forEach(s=>items.push({ label: s.label, sub: s.sub, onPick: ()=>{ input.value=s.label; input.dispatchEvent(new Event('input',{bubbles:true})); close(); } }));

      render(box, items);
    }, 180);

    input.addEventListener('focus', update);
    input.addEventListener('input', update);
    input.addEventListener('keydown', (e)=>{
      if(e.key==='Enter') pushHist(input.value);
      if(e.key==='Escape') close();
    });
  }

  function init(){
    findSearchInputs().forEach(attach);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
