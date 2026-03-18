(function(){
  const state={all:[],my:[],filter:'todos',query:''};
  const grid=()=>document.getElementById('listaComunidades');
  const myList=()=>document.getElementById('listaMeusGrupos');
  const q=(s,r=document)=>r.querySelector(s);
  const qs=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function skeleton(n=3){return Array.from({length:n},()=>`<article class="comm-skeleton"><div class="sk-cover"></div><div class="sk-body"><div class="sk-top"><div class="sk-box"></div><div><div class="sk-line lg"></div><div class="sk-line sm" style="margin-top:8px"></div></div><div class="sk-btn"></div></div><div class="sk-meta"><div class="sk-pill"></div><div class="sk-pill"></div><div class="sk-pill" style="width:110px"></div></div></div></article>`).join('')}
  function loader(text){return `<div class="doke-inline-loader"><span class="doke-inline-loader__spinner"><i class="bx bx-loader-alt bx-spin"></i></span><span>${esc(text)}</span></div>`}
  function card(c){const members=Number(c.members||c.membros||0);const type=esc(c.type||c.tipo||'Grupo');const cover=esc(c.cover||c.capa||'');const avatar=esc(c.avatar||c.foto||'');return `<article class="comm-card" data-tipo="${type.toLowerCase()}"><div class="comm-cover"${cover?` style="background-image:url('${cover}');background-size:cover;background-position:center"`:''}></div><div class="comm-body"><div class="comm-top"><div class="comm-avatar">${avatar?`<img src="${avatar}" alt="">`:'<i class="bx bx-group"></i>'}</div><div class="comm-info"><h3>${esc(c.title||c.nome||'Comunidade')}</h3><p>${esc(c.desc||c.descricao||'Sem descrição')}</p></div><button class="btn-ver-grupo" type="button">${c.joined?'Entrou':'Entrar'}</button></div><div class="comm-meta"><span class="pill">${type}</span><span class="pill">Público</span><span class="members">+${members} membros</span></div></div></article>`}
  function myCard(c){const members=Number(c.members||c.membros||0);const type=esc(c.type||c.tipo||'Grupo');const avatar=esc(c.avatar||c.foto||'');return `<article class="my-group-item"><div class="my-group-thumb">${avatar?`<img src="${avatar}" alt="">`:'<i class="bx bx-group"></i>'}</div><div class="my-group-body"><h3 class="my-group-title">${esc(c.title||c.nome||'Grupo')}</h3><div class="my-group-meta">${type} · ${members} membros</div></div></article>`}
  function empty(){return `<div class="comm-empty"><h3 style="margin:0 0 8px;color:#193252">Nenhuma comunidade encontrada</h3><p style="margin:0">Tente outro filtro ou crie o seu primeiro grupo.</p></div>`}
  function applyFilter(items){let out=items.slice(); if(state.filter!=='todos'){out=out.filter(c=>String(c.type||c.tipo||'').toLowerCase().includes(state.filter)||String(c.category||'').toLowerCase().includes(state.filter)); if(state.filter==='em-alta') out=items.slice().sort((a,b)=>(b.members||b.membros||0)-(a.members||a.membros||0)); if(state.filter==='novos') out=items.slice().reverse(); if(state.filter==='perto de você') out=items.filter(c=>/condom|bairro|perto|local/i.test(`${c.type||''} ${c.desc||''} ${c.descricao||''}`));}
    if(state.query){const t=state.query.toLowerCase(); out=out.filter(c=>`${c.title||c.nome||''} ${c.desc||c.descricao||''}`.toLowerCase().includes(t));}
    return out;
  }
  function render(){const g=grid(); if(!g) return; const items=applyFilter(state.all); g.innerHTML=items.length?items.map(card).join(''):empty(); const ml=myList(); if(ml) ml.innerHTML=(state.my.length?state.my:state.all.slice(0,2)).map(myCard).join('')}
  function bind(){q('#inputBuscaComm')?.addEventListener('input',e=>{state.query=e.target.value.trim();render()}); qs('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>{qs('.tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active'); state.filter=btn.textContent.trim().toLowerCase(); render();})); window.abrirModalCriarComm=()=>q('#modalCriarComm').style.display='flex'; window.fecharModalCriarComm=()=>q('#modalCriarComm').style.display='none'; }
  async function loadReal(){
    const client=window.supabaseClient||window.sb||window.supabase;
    if(!client||typeof client.from!=='function') return null;
    const tried=['comunidades','communities'];
    for(const table of tried){
      try{const {data,error}=await client.from(table).select('*').limit(24); if(!error && Array.isArray(data) && data.length) return data.map(r=>({title:r.nome||r.name,desc:r.descricao||r.description,type:r.tipo||r.type,members:r.membros||r.members||0,cover:r.capa_url||r.cover_url||r.cover,avatar:r.foto_url||r.avatar_url||r.avatar,joined:!!r.participando}));}catch{}
    }
    return null;
  }
  function loadLocal(){
    const keys=['doke_comunidades','comunidades','doke_communities'];
    for(const k of keys){try{const v=JSON.parse(localStorage.getItem(k)||'null'); if(Array.isArray(v)&&v.length) return v;}catch{}}
    return [
      {title:'Testee',desc:'Teste',type:'Condomínio',members:1,cover:'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',joined:true},
      {title:'Teste',desc:'Teste',type:'Pro',members:2,cover:'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',joined:true},
      {title:'Profissionais Doke',desc:'Networking e oportunidades',type:'Profissionais',members:14,cover:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',joined:false}
    ];
  }
  async function init(){document.body.setAttribute('data-page','comunidade'); const g=grid(); const ml=myList(); if(g) g.innerHTML=skeleton(3); if(ml) ml.innerHTML=loader('Carregando seus grupos...'); bind(); const real=await loadReal(); state.all=(real&&real.length)?real:loadLocal(); state.my=state.all.filter(x=>x.joined).slice(0,3); render();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
