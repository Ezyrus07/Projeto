// script_profissional.js - modal unificado e interações
// Demo-ready: mantém estado in-memory para curtidas e comentários.
// Inicie com samplePosts presentes no index.

const samplePosts = [
  {
    id: 'r1',
    tipo: 'video-curto',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    autorUser: '@joao',
    descricao: 'Reel demo: transição suave e áudio popular.',
    autorAvatar: 'J'
  },
  {
    id: 'p1',
    tipo: 'foto',
    imagem: 'https://placehold.co/800x600?text=Projeto',
    autorUser: '@maria',
    descricao: 'Projeto entregue com sucesso.',
    autorAvatar: 'M'
  },
  {
    id: 'v1',
    tipo: 'video',
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    autorUser: '@ana',
    descricao: 'Vídeo longo exemplo com maior resolução.',
    autorAvatar: 'A'
  }
];

// estado simples
const state = {
  currentPostId: null,
  likes: {},       // id -> count
  likedByMe: {},   // id -> bool
  comments: {}     // id -> [{user, text, time}]
};

// render feed
function renderFeed(){
  const feed = document.getElementById('feed');
  feed.innerHTML = '';
  samplePosts.forEach((p, idx) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.setAttribute('data-id', p.id);

    const media = document.createElement('div');
    media.className = 'media';
    if (p.tipo === 'foto') {
      media.innerHTML = `<img src="${p.imagem}" alt="imagem">`;
    } else {
      media.innerHTML = `<video src="${p.videoUrl}" muted playsinline></video>`;
    }
    media.onclick = () => {
      // chama abrirPlayerTikTok para compatibilidade com seu HTML antigo
      abrirPlayerTikTok(idx);
    };

    const meta = document.createElement('div');
    meta.className = 'meta';

    meta.innerHTML = `
      <div class="avatar">${p.autorAvatar}</div>
      <div style="flex:1">
        <div class="username">${p.autorUser}</div>
        <div class="muted" style="color:var(--muted);font-size:13px">${p.descricao.slice(0,60)}${p.descricao.length>60?'...':''}</div>
      </div>
      <div><button class="btn-mini" onclick="abrirModalUnificado(samplePosts[${idx}],'${p.tipo}','feed'); event.stopPropagation()">Abrir</button></div>
    `;

    card.appendChild(media);
    card.appendChild(meta);
    feed.appendChild(card);
  });
}

// ======= Modal logic =======
function abrirModalUnificado(dados, tipo='video', colecao='feed'){
  const modal = document.getElementById('modalPostDetalhe');
  const mediaArea = document.getElementById('modalMediaContainer');
  mediaArea.className = 'modal-media';
  const avatar = document.getElementById('modalAvatar');
  const username = document.getElementById('modalUsername');
  const caption = document.getElementById('modalCaption');
  const commentsList = document.getElementById('modalCommentsList');
  const likeCountEl = document.getElementById('btnLikeModalCount');
  const likeIcon = document.getElementById('btnLikeModalIcon');

  // normalize
  const post = dados || samplePosts.find(s=>s.id===dados?.id) || samplePosts[0];
  state.currentPostId = post.id;

  // media
  mediaArea.innerHTML = '';
  if (post.videoUrl) {
    const v = document.createElement('video');
    v.src = post.videoUrl;
    v.controls = true;
    v.autoplay = true;
    v.playsInline = true;
    v.style.width='100%';
    v.style.height='100%';
    v.style.objectFit='cover';
    mediaArea.appendChild(v);
  } else if (post.imagem) {
    const i = document.createElement('img');
    i.src = post.imagem;
    i.alt = 'imagem do post';
    mediaArea.appendChild(i);
  } else {
    mediaArea.innerHTML = '<div style="color:var(--muted);padding:12px">Mídia não disponível</div>';
  }

  // meta
  avatar.innerText = post.autorAvatar || post.autorUser?.[1] || 'U';
  username.innerText = post.autorUser || '@usuario';
  caption.innerText = post.descricao || '';

  // likes
  if (state.likes[post.id] === undefined) state.likes[post.id] = Math.floor(Math.random()*50);
  if (state.likedByMe[post.id] === undefined) state.likedByMe[post.id] = false;
  likeCountEl.innerText = state.likes[post.id];

  likeIcon.className = state.likedByMe[post.id] ? 'bx bxs-heart' : 'bx bx-heart';
  likeIcon.style.color = state.likedByMe[post.id] ? '#ff4d6d' : '';

  // comments
  if (!state.comments[post.id]) state.comments[post.id] = [
    {user:'@sara', text:'Que lindo trabalho!', time:'2h'},
    {user:'@leo', text:'Parabéns 👏', time:'1h'}
  ];
  renderComments(post.id);

  // set up buttons
  const btnOrcar = document.getElementById('btnSolicitarOrcamento');
  btnOrcar.onclick = (ev) => {
    ev.stopPropagation();
    const uid = post.autorUser || '';
    const aid = post.id || '';
    location.href = `orcamento.html?uid=${encodeURIComponent(uid)}&aid=${encodeURIComponent(aid)}`;
  };

  const btnShare = document.getElementById('btnShareModal');
  btnShare.onclick = (ev) => {
    ev.stopPropagation();
    const url = `${location.origin}${location.pathname}?post=${post.id}`;
    if (navigator.clipboard) navigator.clipboard.writeText(url);
    mostrarToast('Link copiado!');
  };

  // open
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharModal(){
  const modal = document.getElementById('modalPostDetalhe');
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

// compatibility function: some HTML may call abrirPlayerTikTok(index)
function abrirPlayerTikTok(indexOuDados){
  let dados = {};
  if (typeof indexOuDados === 'number') {
    dados = samplePosts[indexOuDados] || samplePosts[0];
  } else {
    dados = indexOuDados;
  }
  abrirModalUnificado(dados, dados.tipo || 'video', 'reels');
}

// quick compatibility: card click handler
function tocarVideoDoCard(cardEl){
  const id = cardEl?.dataset?.id;
  const post = samplePosts.find(p=>p.id===id);
  abrirModalUnificado(post || samplePosts[0]);
}

// like visual + state
function darLikeModal(){
  const id = state.currentPostId;
  if (!id) return;
  state.likedByMe[id] = !state.likedByMe[id];
  state.likes[id] += state.likedByMe[id] ? 1 : -1;
  document.getElementById('btnLikeModalCount').innerText = state.likes[id];
  const icon = document.getElementById('btnLikeModalIcon');
  icon.className = state.likedByMe[id] ? 'bx bxs-heart' : 'bx bx-heart';
  icon.style.color = state.likedByMe[id] ? '#ff4d6d' : '';
}

// comments
function renderComments(postId){
  const list = document.getElementById('modalCommentsList');
  list.innerHTML = '';
  const arr = state.comments[postId] || [];
  arr.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'comment';
    el.innerHTML = `<div class="c-av">${c.user?.[1]||'U'}</div><div class="c-body"><strong style="display:block">${c.user}</strong><div style="color:var(--muted);font-size:13px">${c.text}</div></div>`;
    list.appendChild(el);
  });
}

// post comment
function postarComentarioModal(){
  const input = document.getElementById('inputComentarioModal');
  const text = (input.value||'').trim();
  if(!text) return;
  const id = state.currentPostId;
  if(!id) return;
  if(!state.comments[id]) state.comments[id]=[];
  state.comments[id].push({user:'@vc', text, time:'agora'});
  input.value='';
  renderComments(id);
  mostrarToast('Comentário enviado');
}

// share helper
function shareCurrentPost(){
  const id = state.currentPostId;
  const url = `${location.origin}${location.pathname}?post=${id}`;
  if (navigator.clipboard) navigator.clipboard.writeText(url);
  mostrarToast('Link copiado!');
}

// small toast
function mostrarToast(msg){
  const d = document.createElement('div');
  d.style.position='fixed';
  d.style.bottom='22px';
  d.style.left='50%';
  d.style.transform='translateX(-50%)';
  d.style.padding='10px 16px';
  d.style.background='rgba(10,10,10,0.9)';
  d.style.color='#fff';
  d.style.borderRadius='999px';
  d.style.zIndex=99999;
  d.style.fontSize='14px';
  d.innerText = msg;
  document.body.appendChild(d);
  setTimeout(()=>d.style.opacity='0.0',1500);
  setTimeout(()=>d.remove(),2200);
}

// close on ESC or backdrop click
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') fecharModal(); });
document.getElementById('modalPostDetalhe').addEventListener('click', (ev)=>{
  if (ev.target.id === 'modalPostDetalhe') fecharModal();
});

// init
renderFeed();
