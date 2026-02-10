// ============================================================
// 1. IMPORTAÇÕES E CONFIGURAÇÃO
// ============================================================

// [DOKE PATCH] Guards globais para evitar quebra em páginas diferentes + navegação de grupos
window.carregarProfissionaisDestaque ||= function(){};
window.carregarProfissionaisNovos ||= function(){};
window.carregarDestaques ||= function(){};
window.carregarConteudoHome ||= function(){};
window.abrirGrupo = function(grupoId){
  try{
    if(!grupoId) return;
    window.location.href = "grupo.html?id=" + encodeURIComponent(grupoId);
  }catch(e){}
};

// [PATCH] import ESM removido; usar Supabase global (supabase-init.js)
// [PATCH] import ESM removido; usar Supabase global (supabase-init.js)
// [PATCH] import ESM removido; usar Supabase global (supabase-init.js)
// [PATCH] import ESM removido; usar Supabase global (supabase-init.js)
// [PATCH] import ESM removido; usar Supabase global (supabase-init.js)

// SUAS CHAVES DO PROJETO
const firebaseConfig = {
    apiKey: "AIzaSyDbUwwj-joyhJ3aJ-tP4WJhGC1wLrwYh60",
    authDomain: "doke-site.firebaseapp.com",
    projectId: "doke-site",
    storageBucket: "doke-site.firebasestorage.app",
    messagingSenderId: "997098339190",
    appId: "1:997098339190:web:a865b696278be21f069857"
};

// Inicializa o Firebase (safe). Se o SDK não estiver presente, mantém compat/Supabase sem quebrar a página.
let app = null;
let analytics = null;
let db = (window.db || null);
let auth = (window.auth || null);
let storage = (window.storage || null);

// [DOKE] Shim: onAuthStateChanged (evita crash quando Firebase não existe)
if (typeof window.onAuthStateChanged !== "function") {
  window.onAuthStateChanged = function(_ignoredAuth, callback){
    const sb = window.sb || window.supabaseClient;
    if (sb && sb.auth && sb.auth.onAuthStateChange){
      // dispara estado atual
      if (sb.auth.getUser){
        sb.auth.getUser().then(({data})=>{
          const u = data && data.user ? data.user : null;
          try{ callback(u ? { uid: u.id, email: u.email } : null); }catch(_e){}
        }).catch(()=>{});
      }
      const sub = sb.auth.onAuthStateChange((_event, session)=>{
        const u = session && session.user ? session.user : null;
        try{ callback(u ? { uid: u.id, email: u.email } : null); }catch(_e){}
      });
      return sub && sub.data ? sub.data.subscription : null;
    }
    try{ callback(null); }catch(_e){}
    return null;
  }
}

try {
  if (typeof initializeApp === "function") {
    app = initializeApp(firebaseConfig);
    if (typeof getAnalytics === "function") {
      try { analytics = getAnalytics(app); } catch (_e) { analytics = null; }
    }
    if (typeof getFirestore === "function") db = getFirestore(app);
    if (typeof getAuth === "function") auth = getAuth(app);
    if (typeof getStorage === "function") storage = getStorage(app);
  } else {
    console.warn("[DOKE] Firebase SDK não encontrado; usando compat/Supabase (window.auth/db).");
  }
} catch (e) {
  console.warn("[DOKE] Falha ao inicializar Firebase. Usando compat/Supabase.", e);
}

window.db = db;
window.auth = auth;
window.storage = storage;

// Protege export helpers caso o SDK não exista
if (typeof collection === "function") window.collection = collection;
if (typeof addDoc === "function") window.addDoc = addDoc;
if (typeof getDocs === "function") window.getDocs = getDocs;
if (typeof query === "function") window.query = query;
if (typeof where === "function") window.where = where;
if (typeof orderBy === "function") window.orderBy = orderBy;
if (typeof doc === "function") window.doc = doc;

// Reforça globals compat caso tenham sido sobrescritos por IDs no DOM
if (typeof window.__dokeEnsureFirestoreCompat === "function") window.__dokeEnsureFirestoreCompat();
if (typeof window.__dokeEnsureAuthCompat === "function") window.__dokeEnsureAuthCompat();

// Variáveis Globais
window.arquivoFotoSelecionado = null;
window.arquivoVideoSelecionado = null;
window.fotosAtuais = [];
window.indiceAtual = 0;
window.chatIdAtual = null;
window.chatUnsubscribe = null;
window.mediaRecorder = null;
window.audioChunks = [];
window.timerInterval = null;
window.targetUserUid = null;
window.listaReelsAtual = [];
window.indiceReelAtual = 0;
window.isScrollingReel = false;

// 🔥 DESATIVA QUALQUER LÓGICA OFFLINE / PWA (DEV E PROD)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
}


// ============================================================
// 2. FUNÇÃO DE PUBLICAR ANÚNCIO (SEM WHATSAPP OBRIGATÓRIO)
// ============================================================
// Dentro de script.js

// ATUALIZAÇÃO NO SCRIPT.JS - FUNÇÃO PUBLICAR ANÚNCIO
if (typeof window.publicarAnuncio !== "function") {
window.publicarAnuncio = async function(event) {
    if(event) event.preventDefault();

    const btn = document.getElementById('btn-submit');
    const textoOriginal = btn ? btn.innerText : "Publicar";
    if(btn) { btn.innerText = "Publicando..."; btn.disabled = true; }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Você precisa estar logado.");

        const titulo = document.getElementById('titulo').value;
        const descricao = document.getElementById('descricao').value;
        
        // 1. PEGA O QUESTIONÁRIO CORRETAMENTE
        const perguntasFormulario = document.getElementById('perguntas-formulario-json')?.value || "";
        const temFormulario = perguntasFormulario.trim().length > 0;
        
        // 2. PEGA O MODO DE ATENDIMENTO (Online/Presencial)
        const modoAtend = document.querySelector('input[name="modo_atend"]:checked')?.value || "Presencial";
        
        const categoriasString = document.getElementById('categorias-validacao').value; 
        const categoriaFinal = categoriasString ? categoriasString.split(',')[0] : "Geral";
        const tipoPreco = document.querySelector('input[name="tipo_preco"]:checked')?.value || "A combinar";
        let precoFinal = tipoPreco === 'Preço Fixo' ? document.getElementById('valor').value : tipoPreco;
        
        const cep = document.getElementById('cep').value.replace(/\D/g, ''); 
        const telefone = document.getElementById('telefone')?.value || "";

        let cidadeFinal = document.getElementById('cidade')?.value || "Indefinido";
        let ufFinal = document.getElementById('uf')?.value || "BR";
        let bairroFinal = document.getElementById('bairro')?.value || "Geral";

        if(!titulo || !descricao) throw new Error("Preencha título e descrição.");

        let fotos = window.fotosParaEnviar && window.fotosParaEnviar.length > 0 ? window.fotosParaEnviar : ["https://placehold.co/600x400?text=Sem+Foto"];

        const perfilLocal = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
        const nomeAutor = perfilLocal.nome || "Você";
        const fotoAutor = perfilLocal.foto || "https://i.pravatar.cc/150";
        let userHandle = perfilLocal.user || ("@" + nomeAutor.split(' ')[0].toLowerCase());

        const novoAnuncio = {
            uid: user.uid, // <--- SALVA O DONO (IMPORTANTE)
            titulo: titulo,
            descricao: descricao,
            temFormulario: temFormulario,
            perguntasFormularioJson: perguntasFormulario, // <--- SALVA AS PERGUNTAS
            modo_atend: modoAtend, // <--- SALVA SE É ONLINE OU PRESENCIAL
            categoria: categoriaFinal,
            categorias: categoriasString,
            preco: precoFinal,
            cep: cep,
            uf: ufFinal,
            cidade: cidadeFinal,
            bairro: bairroFinal,
            whatsapp: telefone,
            fotos: fotos,
            img: fotos[0],
            dataCriacao: new Date().toISOString(),
            nomeAutor: nomeAutor,
            fotoAutor: fotoAutor,
            userHandle: userHandle,
            views: 0,
            cliques: 0,
            mediaAvaliacao: 0,
            numAvaliacoes: 0,
            // Controle de visibilidade do anúncio
            // (se false, não aparece no feed público, mas aparece no perfil do dono)
            ativo: true
        };

        await addDoc(collection(window.db, "anuncios"), novoAnuncio);
        
        alert("Anúncio publicado com sucesso!");
        window.location.href = "index.html";

    } catch (erro) {
        console.error("Erro:", erro);
        alert("Erro: " + erro.message);
        if(btn) { btn.innerText = textoOriginal; btn.disabled = false; }
    }
}
}

window.previewImagemPost = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        window.arquivoFotoSelecionado = file; 
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('base64PostImage').value = "imagem_ok"; 
            document.getElementById('imgPreviewPost').src = e.target.result;
            document.getElementById('previewPostArea').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

window.processarVideoUpload = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.size > 100 * 1024 * 1024) { alert("Vídeo muito grande (max 100MB)."); input.value = ""; return; }
        window.arquivoVideoSelecionado = file; 
        document.getElementById('nomeVideoSelecionado').innerText = "Vídeo: " + file.name;
        document.getElementById('base64VideoFile').value = "video_ok";
    }
}

window.removerImagemPost = function() {
    window.arquivoFotoSelecionado = null;
    window.arquivoVideoSelecionado = null;
    document.getElementById('base64PostImage').value = "";
    document.getElementById('base64VideoFile').value = "";
    document.getElementById('previewPostArea').style.display = 'none';
    document.getElementById('file-post-upload').value = "";
    if(document.getElementById('inputVideoFile')) document.getElementById('inputVideoFile').value = "";
    if(document.getElementById('nomeVideoSelecionado')) document.getElementById('nomeVideoSelecionado').innerText = "";
}

window.publicarConteudoUnificado = async function(event) {
    const btn = event.target || document.querySelector('.btn-publicar');
    const user = auth.currentUser;
    if (!user) return alert("Faça login.");

    const tipo = document.getElementById('tipoPostagemAtual').value;
    const texto = document.getElementById('textoPost').value;
    const perfilLocal = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};

    // Validação de Vínculo Obrigatório para Reels
    if (tipo === 'video-curto') {
        const selectAnuncio = document.getElementById('selectAnuncioVinculado');
        if (!selectAnuncio || !selectAnuncio.value) {
            alert("⚠️ É OBRIGATÓRIO vincular este vídeo a um dos seus serviços.");
            return;
        }
    }

    btn.innerText = "Publicando...";
    btn.disabled = true;

    try {
        let urlImagem = "";
        let urlVideo = "";

        // Lógica de Upload (Storage)
        if (window.arquivoFotoSelecionado) {
            const refImg = ref(storage, `posts/${user.uid}/img_${Date.now()}`);
            const snapImg = await uploadBytes(refImg, window.arquivoFotoSelecionado);
            urlImagem = await getDownloadURL(snapImg.ref);
        }

        if (window.arquivoVideoSelecionado) {
            const folder = tipo === 'video-curto' ? 'reels' : 'trabalhos';
            const refVid = ref(storage, `${folder}/${user.uid}/vid_${Date.now()}`);
            const snapVid = await uploadBytes(refVid, window.arquivoVideoSelecionado);
            urlVideo = await getDownloadURL(snapVid.ref);
        }

        let colecao = tipo === 'video-curto' ? 'reels' : (tipo === 'video' ? 'trabalhos' : 'posts');
        
        let dados = {
            uid: user.uid,
            autorNome: perfilLocal.nome || "Usuário",
            autorUser: perfilLocal.user || "@usuario",
            autorFoto: perfilLocal.foto || "https://placehold.co/150",
            data: new Date().toISOString(),
            likes: 0
        };

        if (tipo === 'video-curto') {
            const selectAnuncio = document.getElementById('selectAnuncioVinculado');
            const opt = selectAnuncio.options[selectAnuncio.selectedIndex];
            dados.videoUrl = urlVideo;
            dados.capa = urlImagem;
            dados.descricao = texto;
            dados.anuncioId = selectAnuncio.value; // ID DO SERVIÇO PARA O BOTÃO
            dados.categoria = opt.getAttribute('data-cat') || "Geral"; // TAG VERDE
            dados.tag = (document.getElementById('inputTagVideo').value || "NOVO").toUpperCase(); // TAG TOPO
        } else {
            dados.texto = texto;
            dados.imagem = urlImagem;
            dados.videoUrl = urlVideo;
        }

        await addDoc(collection(db, colecao), dados);
        alert("Publicado com sucesso!");
        window.location.reload();

    } catch (e) {
        console.error(e);
        btn.innerText = "Publicar";
        btn.disabled = false;
    }
}

function setScrollLock(locked) {
    const root = document.documentElement;
    if (root) root.classList.toggle('no-scroll', locked);
    if (document.body) document.body.classList.toggle('no-scroll', locked);
}

function updateScrollLock() {
    const selectors = [
        '#modalGaleria',
        '#modalPlayerVideo',
        '#modalPostDetalhe',
        '#modalSolicitacao',
        '#modalStoryViewer',
        '#modalStoryViewerPerfil',
        '#modalOrcamento',
        '#modalDetalhesPedido',
        '#dokeModalOverlay',
        '#dokeGlobalModal',
        '#dpModalOverlay'
    ];
    const aberto = selectors.some((sel) => {
        const els = Array.from(document.querySelectorAll(sel));
        return els.some((el) => {
            if (!el) return false;
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });
    });
    setScrollLock(aberto);
}

window.setScrollLock = setScrollLock;
window.updateScrollLock = updateScrollLock;

let scrollLockRaf = null;
function scheduleScrollLockUpdate() {
    if (scrollLockRaf) return;
    scrollLockRaf = requestAnimationFrame(() => {
        scrollLockRaf = null;
        updateScrollLock();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateScrollLock();
    if (document.body) {
        const observer = new MutationObserver(() => scheduleScrollLockUpdate());
        observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
        window._dokeScrollLockObserver = observer;
    }
});

// ============================================================
// 4. GALERIA LIGHTBOX (COM MINIATURAS E ZOOM)
// ============================================================
window.abrirGaleria = function(listaFotos, index) {
    window.fotosAtuais = listaFotos;
    window.indiceAtual = index;
    
    const containerThumbs = document.getElementById('areaThumbnails');
    if(containerThumbs) {
        containerThumbs.innerHTML = ""; 
        listaFotos.forEach((foto, i) => {
            const img = document.createElement('img');
            img.src = foto;
            img.classList.add('thumb-item');
            img.id = `thumb-${i}`; 
            img.onclick = function(e) {
                e.stopPropagation(); 
                window.indiceAtual = i;
                atualizarImagemModal();
            };
            containerThumbs.appendChild(img);
        });
    }

    atualizarImagemModal();
    document.getElementById('modalGaleria').style.display = 'flex';
    updateScrollLock();
}

window.mudarImagem = function(direcao) {
    if(!window.fotosAtuais || window.fotosAtuais.length === 0) return;
    window.indiceAtual += direcao;
    if (window.indiceAtual >= window.fotosAtuais.length) window.indiceAtual = 0;
    if (window.indiceAtual < 0) window.indiceAtual = window.fotosAtuais.length - 1;
    atualizarImagemModal();
}

function atualizarImagemModal() {
    const img = document.getElementById('imgExpandida');
    if(img) img.src = window.fotosAtuais[window.indiceAtual];
    
    document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('ativo'));
    const thumbAtual = document.getElementById(`thumb-${window.indiceAtual}`);
    if(thumbAtual) {
        thumbAtual.classList.add('ativo');
        thumbAtual.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

window.fecharGaleria = function(event) {
    if (!event || event.target.id === 'modalGaleria' || event.target.classList.contains('btn-fechar-galeria')) {
        document.getElementById('modalGaleria').style.display = 'none';
        document.getElementById('imgExpandida').src = "";
        updateScrollLock();
    }
}


window.carregarTrabalhosHome = async function() {
    const container = document.getElementById('galeria-dinamica') || document.querySelector('.tiktok-scroll-wrapper');
    if (!container) return;

    // Skeleton enquanto carrega os trabalhos
    window.dokeRenderTrabalhosSkeleton?.(container);

    try {
        const q = query(collection(db, "trabalhos"), orderBy("data", "desc"), limit(10));
        const snapshot = await getDocs(q);
        container.innerHTML = ""; 

        if (snapshot.empty) return;

        const escapeHtmlLocal = (value) => String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

        const formatShortDuration = (raw) => {
            if (raw == null || raw === "") return "0:30";
            if (typeof raw === "number" && Number.isFinite(raw)) {
                const total = Math.max(0, Math.floor(raw));
                const min = Math.floor(total / 60);
                const sec = String(total % 60).padStart(2, "0");
                return `${min}:${sec}`;
            }
            const str = String(raw).trim();
            if (/^\d+:\d{2}$/.test(str)) return str;
            return "0:30";
        };

        snapshot.forEach(doc => {
            const data = doc.data();
            const linkPerfil = `onclick="event.stopPropagation(); window.location.href='perfil-profissional.html?uid=${data.uid}'"`;
            const titulo = (data.titulo || data.descricao || data.categoria || "Vídeo curto").toString();
            const tituloCurto = titulo.length > 56 ? `${titulo.slice(0, 56)}...` : titulo;
            const categoria = (data.categoria || "Vídeo curto").toString();
            const duracao = formatShortDuration(data.duracao || data.duracaoSegundos || data.tempo);
            const capa = data.capa || "https://placehold.co/540x960?text=Video";
            const fotoAutor = data.autorFoto || "https://placehold.co/120x120?text=User";
            const autorNome = (data.autorNome || "@profissional").toString();
            
            // ... (código do dadosModal igual) ...
            const dadosModal = JSON.stringify({
                id: doc.id, video: data.videoUrl, img: data.capa, user: data.autorNome,
                desc: data.descricao, uid: data.uid, autorFoto: data.autorFoto, likes: data.likes
            }).replace(/"/g, '&quot;');

            const html = `
            <div class="tiktok-card" 
                 onmouseenter="iniciarPreview(this)" 
                 onmouseleave="pararPreview(this)"
                 onclick="abrirPlayerTikTok(${dadosModal})">
                <div class="yt-chip-row">
                    <span class="yt-chip">Vídeo-curto</span>
                    <span class="yt-duration">${escapeHtmlLocal(duracao)}</span>
                </div>
                <input type="hidden" class="video-src-hidden" value="${data.videoUrl}">
                <img src="${escapeHtmlLocal(capa)}" class="video-bg" loading="lazy" decoding="async" alt="${escapeHtmlLocal(tituloCurto)}">
                <div class="play-icon yt-play-fab"><i class='bx bx-play'></i></div>
                <div class="video-ui-layer">
                    <div class="provider-info">
                        <img src="${escapeHtmlLocal(fotoAutor)}" alt="${escapeHtmlLocal(autorNome)}">
                        <div class="info-col">
                            <span class="provider-name js-user-link" data-uid="${data.uid}" ${linkPerfil}>${escapeHtmlLocal(autorNome)}</span>
                            <span class="video-desc-mini">${escapeHtmlLocal(categoria)}</span>
                        </div>
                    </div>
                    <p class="yt-short-title">${escapeHtmlLocal(tituloCurto)}</p>
                    <div class="yt-short-meta">
                        <span><i class='bx bx-play-circle'></i> Preview</span>
                        <span>Toque para assistir</span>
                    </div>
                </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
    } catch (e) { console.error(e); }
    finally { container.setAttribute('aria-busy', 'false'); }
}
// ============================================================
// ABRIR PLAYER TIKTOK (CORRIGIDO: RECEBE FOTO E LINK)
// ============================================================
window.abrirPlayerTikTok = function(dadosRecebidos) {
    // Tratamento caso venha string ou objeto
    const dados = (typeof dadosRecebidos === 'string') ? JSON.parse(dadosRecebidos) : dadosRecebidos;
    const modal = document.getElementById('modalPlayerVideo');
    if(!modal) return;

    // Globais
    window.currentReelId = dados.id;
    window.currentReelUid = dados.uid;
    window.currentReelAnuncioId = dados.anuncioId || dados.aid;

    // 1. Mostrar
    modal.style.display = 'flex';
    updateScrollLock();

    // 2. Preencher Vídeo
    const player = document.getElementById('playerPrincipal');
    const blur = document.getElementById('videoBlur');
    player.src = dados.video;
    player.play().catch(() => {}); // Autoplay
    
    // Fundo Blur
    if(blur) {
        const capa = dados.img || dados.capa || "";
        blur.style.backgroundImage = `url('${capa}')`;
    }

    // 3. Preencher Header e Legenda
    const foto = dados.autorFoto || "https://placehold.co/50";
    const user = dados.autorUser || "@usuario";
    const desc = dados.desc || "";

    // Header
    const reelAvatar = document.getElementById('reelAvatar');
    if (reelAvatar) {
        reelAvatar.src = foto;
        reelAvatar.classList.add('js-user-link');
        reelAvatar.dataset.uid = dados.uid || '';
        reelAvatar.dataset.user = user || '';
    }
    const reelUserEl = document.getElementById('reelUsername');
    if (reelUserEl) {
        reelUserEl.innerText = user;
        reelUserEl.dataset.uid = dados.uid || '';
        reelUserEl.classList.add('js-user-link');
    }

    // Legenda (Topo do corpo)
    const reelAvatarCap = document.getElementById('reelAvatarCap');
    if (reelAvatarCap) {
        reelAvatarCap.src = foto;
        reelAvatarCap.classList.add('js-user-link');
        reelAvatarCap.dataset.uid = dados.uid || '';
        reelAvatarCap.dataset.user = user || '';
    }
    const reelUserCapEl = document.getElementById('reelUsernameCap');
    if (reelUserCapEl) {
        reelUserCapEl.innerText = user;
        reelUserCapEl.dataset.uid = dados.uid || '';
        reelUserCapEl.classList.add('js-user-link');
    }
    document.getElementById('reelDesc').innerText = desc;
    document.getElementById('reelData').innerText = "Ver tradução"; // Simulado

    // 4. Rodapé
    document.getElementById('reelLikesCount').innerText = `${dados.likes || 0} curtidas`;
    document.getElementById('reelDateSmall').innerText = "HÁ 2 DIAS"; // Simulado

    // 5. Resetar Ícone Like
    const icon = document.getElementById('btnLikeReel');
    icon.className = 'bx bx-heart';
    icon.style.color = '';

    // Verifica like no banco
    if(auth.currentUser) verificarLikeReel(dados.id, auth.currentUser.uid);

    // Carrega Comentários
    carregarComentariosReel(dados.id);
}

// Função de curtir visual (apenas efeito)
window.toggleLikeTikTok = function(btn) {
    // Procura o elemento dentro do botão (adaptado para o novo HTML)
    const icon = btn.querySelector('i');
    const countSpan = btn.querySelector('.action-count');
    
    // Alterna a classe visual no botão pai
    btn.classList.toggle('liked');

    if (btn.classList.contains('liked')) {
        // Virou Like
        icon.className = 'bx bxs-heart'; // Ícone preenchido
        // Simulação de contagem (+1)
        if(countSpan) {
            let val = parseInt(countSpan.innerText.replace(/\D/g,'')) || 0;
            countSpan.innerText = val + 1;
        }
        // Animaçãozinha
        icon.style.transform = "scale(1.2)";
        setTimeout(() => icon.style.transform = "scale(1)", 200);
        
    } else {
        // Removeu Like
        icon.className = 'bx bx-heart'; // Ícone contorno
        if(countSpan) {
            let val = parseInt(countSpan.innerText.replace(/\D/g,'')) || 0;
            countSpan.innerText = Math.max(0, val - 1);
        }
    }
}

window.abrirComentarios = function() {
    // Como você ainda não tem backend de comentários, vamos simular
    // Futuramente aqui abriria uma gaveta de comentários
    
    const user = auth.currentUser;
    if(!user) {
        alert("Faça login para comentar!");
        return;
    }
    
    const msg = prompt("Escreva seu comentário:");
    if(msg && msg.trim() !== "") {
        alert("Comentário enviado! (Simulação)");
        // Aqui você salvaria no Firebase futuramente
    }
}



window.tocarVideoDoCard = function(card) {
    const src = card.querySelector('.video-src-hidden').value;
    const modal = document.getElementById('modalPlayerVideo');
    const player = document.getElementById('playerPrincipal');
    if(src && modal && player) {
        player.src = src; 
        modal.style.display = 'flex'; 
        updateScrollLock();
        player.play();
    }
}

window.fecharPlayerVideo = function() {
    const modal = document.getElementById('modalPlayerVideo');
    const player = document.getElementById('playerPrincipal');
    if(player) { player.pause(); player.src = ""; }
    if(modal) modal.style.display = 'none';
    updateScrollLock();
}


// ============================================================
// 6. SISTEMA DE PEDIDOS E CHAT INTERNO (SEM WHATSAPP)
// ============================================================

// Botão "Solicitar Orçamento"
// Botão "Solicitar Orçamento" - VERSÃO COM FORMULÁRIO E DESCRIÇÃO OBRIGATÓRIA
window.solicitarOrcamento = async function(idPrestador, nomePrestador, descricaoServico, temForm, perguntas) {
    const user = auth.currentUser;
    if (!user) {
        alert("Você precisa fazer login para continuar.");
        window.location.href = "login.html";
        return;
    }

    if (user.uid === idPrestador) {
        alert("Você não pode solicitar para si mesmo.");
        return;
    }

    let respostasFormulario = "";

    // 1. Se o prestador criou um formulário, ele aparece primeiro (Opcional para o prestador ter, mas se tiver, o cliente responde)
    if (temForm && perguntas) {
        respostasFormulario = prompt(`O prestador solicita que você responda:\n\n${perguntas}`);
        if (respostasFormulario === null) return; // Cancelou
    }

    // 2. DESCRIÇÃO OBRIGATÓRIA (Toda vez que apertar em solicitar/comprar)
    const msg = prompt(`DESCREVA SEU PEDIDO (Obrigatório):\nDetalhe o que você precisa para ${nomePrestador}:`);
    
    // Validação de obrigatoriedade
    if (!msg || msg.trim() === "") {
        alert("A descrição do pedido é obrigatória para enviar a solicitação!");
        return; 
    }

try {
        const perfil = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};

        const pedidoExistente = await encontrarPedidoExistenteBase(user.uid, idPrestador, null);
        const pedidoPayload = {
            deUid: user.uid,
            paraUid: idPrestador,
            paraNome: nomePrestador,
            clienteNome: perfil.nome || "Cliente Doke",
            clienteFoto: perfil.foto || "https://cdn-icons-png.flaticon.com/512/847/847969.png",
            servicoReferencia: descricaoServico,
            mensagemInicial: msg, 
            respostasDoFormulario: respostasFormulario,
            status: "pendente",
            dataPedido: new Date().toISOString(),
            dataAtualizacao: new Date().toISOString(),
            ultimaMensagem: msg || "Novo pedido enviado",
            visualizado: false,
            
            // ADICIONE ESTES CAMPOS: Garante que nasce não lido
            notificacaoLidaProfissional: false, 
            notificacaoLidaCliente: true // Eu (cliente) já li o que acabei de enviar
        };

        if (pedidoExistente && pedidoExistente.id) {
            const statusAtual = String(pedidoExistente.data?.status || "").toLowerCase();
            const reabrir = ['recusado','cancelado','finalizado'];
            if (!reabrir.includes(statusAtual)) {
                pedidoPayload.status = pedidoExistente.data?.status || pedidoPayload.status;
            }
            await updateDoc(doc(db, "pedidos", pedidoExistente.id), pedidoPayload);
        } else {
            await addDoc(collection(db, "pedidos"), pedidoPayload);
        }

        alert(`✅ Solicitação enviada! Aguarde o retorno no chat.`);
        
    } catch (e) {
        console.error("Erro ao enviar pedido:", e);
        alert("Erro técnico ao enviar. Tente novamente.");
    }
}


// Notificações Globais
window.verificarNotificacoes = function(uid) {
    const q = query(collection(db, "pedidos"), where("paraUid", "==", uid), where("status", "==", "pendente"));
    onSnapshot(q, (snap) => {
        const qtd = snap.size;
        document.querySelectorAll('a[href="chat.html"]').forEach(link => {
            const existing = link.querySelector('.badge-notificacao');
            if(existing) existing.remove();
            if (qtd > 0) {
                link.style.position = "relative";
                const badge = document.createElement('span');
                badge.className = "badge-notificacao";
                badge.innerText = qtd;
                badge.style.cssText = "position:absolute; top:-5px; right:-5px; background:#e74c3c; color:white; font-size:10px; font-weight:bold; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; z-index:100;";
                link.appendChild(badge);
            }
        });
    });
}

const _dokeSupabaseUidCache = new Map();

function buildSocialNotifLink(postTipo, postFonte, postId, comentarioId, acao) {
    let extra = "";
    if (comentarioId) extra += `&comment=${encodeURIComponent(comentarioId)}`;
    if (acao === "resposta_comentario") extra += "&reply=1";
    if (postTipo === "reel" && postId) {
        const prefix = postFonte === "supabase" ? "sb" : "fb";
        return `feed.html?start=${prefix}-${postId}${extra}`;
    }
    if (postTipo === "post" && postId) {
        const prefix = postFonte === "supabase" ? "sb" : "fb";
        return `index.html?post=${prefix}-${postId}${extra}`;
    }
    return "index.html";
}

function isUuid(value) {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

function getActorPerfil() {
    const perfil = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
    const nome = perfil.nome || "";
    const rawUser = perfil.user || "";
    const handle = rawUser
        ? (rawUser.startsWith("@") ? rawUser : `@${rawUser}`)
        : (nome ? `@${nome.split(" ")[0].toLowerCase()}` : "@usuario");
    return {
        nome: nome || handle.replace("@", "") || "Usuario",
        user: handle,
        foto: perfil.foto || "https://placehold.co/50"
    };
}

async function getSupabaseUidByUserId(userId) {
    if (!userId) return null;
    if (_dokeSupabaseUidCache.has(userId)) return _dokeSupabaseUidCache.get(userId);
    const client = getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
        .from("usuarios")
        .select("uid")
        .eq("id", userId)
        .maybeSingle();
    if (error && !isMissingTableError(error)) console.error(error);
    const uid = data?.uid || null;
    if (uid) _dokeSupabaseUidCache.set(userId, uid);
    return uid;
}

async function resolverDonoComentarioUid(commentId, parentId, isReply) {
    const btn = getCommentButton("comment-like-btn", commentId, parentId, isReply);
    const ownerUid = btn?.dataset?.ownerUid || "";
    if (ownerUid) return ownerUid;
    const ownerId = btn?.dataset?.ownerId || "";

    if (window.currentPostSource === "supabase") {
        if (ownerId) return await getSupabaseUidByUserId(ownerId);
        const client = getSupabaseClient();
        if (!client) return null;
        const cfg = getSupabasePostConfig();
        let { data, error } = await client
            .from(cfg.commentsTable)
            .select("user_id, usuarios (uid)")
            .eq("id", commentId)
            .maybeSingle();
        if (error) {
            const retry = await client
                .from(cfg.commentsTable)
                .select("user_id")
                .eq("id", commentId)
                .maybeSingle();
            data = retry.data || null;
            error = retry.error || null;
        }
        if (error && !isMissingTableError(error)) console.error(error);
        const uid = data?.usuarios?.uid || (data?.user_id ? await getSupabaseUidByUserId(data.user_id) : null);
        return uid || null;
    }

    if (!window.currentCollection || !window.currentPostId) return null;
    try {
        const ref = isReply
            ? doc(db, window.currentCollection, window.currentPostId, "comentarios", parentId, "respostas", commentId)
            : doc(db, window.currentCollection, window.currentPostId, "comentarios", commentId);
        const snap = await getDoc(ref);
        return snap.exists() ? (snap.data().uid || null) : null;
    } catch (e) {
        console.error(e);
        return null;
    }
}

async function criarNotificacaoSocial({ acao, paraUid, postId, postTipo, postFonte, comentarioId, comentarioTexto }) {
    const user = auth?.currentUser;
    if (!user || !paraUid || user.uid === paraUid) return;
    const perfil = getActorPerfil();
    const baseLink = (acao === "seguir_usuario" || acao === "pedido_amizade")
        ? `perfil-cliente.html?id=${encodeURIComponent(user.uid)}`
        : buildSocialNotifLink(postTipo, postFonte, postId, comentarioId, acao);
    const payload = {
        parauid: paraUid,
        deuid: user.uid,
        denome: perfil.nome,
        deuser: perfil.user,
        defoto: perfil.foto,
        acao,
        postid: postId || null,
        posttipo: postTipo || null,
        postfonte: postFonte || null,
        comentarioid: comentarioId || null,
        comentariotexto: comentarioTexto || null,
        lida: false,
        createdat: new Date().toISOString(),
        link: baseLink
    };

    try {
        if (acao && acao.startsWith("curtida")) {
            const chave = `like_${acao}_${postId || "x"}_${comentarioId || "x"}_${user.uid}`;
            if (isUuid(chave)) {
                await setDoc(doc(db, "notificacoes", chave), payload, { merge: true });
                return;
            }
        }

        await addDoc(collection(db, "notificacoes"), payload);
    } catch (e) {
        console.warn("Notificacao social ignorada:", e);
    }
}


// ============================================================
// 7. CARREGAMENTO DE ANÚNCIOS (FEED) - (MANTIDO E INTEGRADO)
// ============================================================

// Builder global do card do anúncio (reutilizado no perfil para ficar 100% igual ao feed)
window.dokeBuildCardPremium = function(anuncio) {
    const titulo = anuncio.titulo || "Sem título";
    const preco = anuncio.preco || "A combinar";
    const __precoLabel = (() => {
        const raw = String(preco || "").toLowerCase();
        // Normaliza acentos ("orçamento" -> "orcamento") para evitar falsos negativos
        const p = raw.normalize ? raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : raw;
        // Se for "Sob orçamento" ou "A combinar", não faz sentido exibir "A partir de"
        if (p.includes("sob") && p.includes("orcamento")) return "";
        if (p.includes("a combinar")) return "";
        return "A partir de";
    })();
    const fotoAutor = anuncio.fotoAutor || "https://i.pravatar.cc/150";
    const descricao = anuncio.descricao || "";

    let nomeParaExibir = anuncio.userHandle || "@usuario";
    if(!nomeParaExibir.startsWith('@')) nomeParaExibir = '@' + nomeParaExibir;

    const nota = anuncio.mediaAvaliacao || 0;
    const qtdAvaliacoes = anuncio.numAvaliacoes || 0;

    let htmlAvaliacaoDisplay = qtdAvaliacoes === 0 
        ? `<span style="background:#e0f2f1; color:#00695c; padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700;">Novo</span>`
        : `<div class="cp-stars-dynamic" style="color:#f1c40f;"><i class='bx bxs-star'></i> ${nota} <span style="color:#999; font-size:0.75rem;">(${qtdAvaliacoes})</span></div>`;

    let fotos = anuncio.fotos && anuncio.fotos.length > 0 ? anuncio.fotos : [anuncio.img || "https://placehold.co/600x400"];
    const jsonFotos = JSON.stringify(fotos).replace(/"/g, '&quot;');

    let htmlFotos = '';

    if (fotos.length === 1) {
        htmlFotos = `
        <div class="grid-fotos-doke" style="grid-template-columns: 1fr;">
            <div class="foto-main" style="grid-column: 1; grid-row: 1/3;">
                <img src="${fotos[0]}" class="img-cover" loading="lazy" decoding="async" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 0)">
            </div>
        </div>`;
    } else if (fotos.length === 2) {
        htmlFotos = `
        <div class="grid-fotos-doke">
            <div class="foto-main"><img src="${fotos[0]}" class="img-cover" loading="lazy" decoding="async" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 0)"></div>
            <div class="foto-sub full-height"><img src="${fotos[1]}" class="img-cover" loading="lazy" decoding="async" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 1)"></div>
        </div>`;
    } else {
        const contadorExtra = Math.max(0, fotos.length - 2);
        const overlayHtml = contadorExtra > 0
            ? `<div class="overlay-count" onclick="abrirGaleria(${jsonFotos}, 1)">+${contadorExtra}</div>`
            : '';
        htmlFotos = `
        <div class="grid-fotos-doke">
            <div class="foto-main"><img src="${fotos[0]}" class="img-cover" loading="lazy" decoding="async" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 0)"></div>
            <div class="foto-sub full-height"><img src="${fotos[1]}" class="img-cover" loading="lazy" decoding="async" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 1)">${overlayHtml}</div>
        </div>`;
    }

    const linkPerfil = `onclick="event.stopPropagation(); window.irParaPerfilComContagem('${anuncio.uid}')"`;
    const estiloLink = `style="cursor: pointer;"`;
    const userDataAttr = anuncio.uid ? `data-uid="${anuncio.uid}"` : "";

    const card = document.createElement('div');
    card.className = 'card-premium';
    card.onmousedown = function() {
        if (typeof window.registrarVisualizacao === "function") {
            window.registrarVisualizacao(anuncio.id, anuncio.uid);
        }
    };

    card.innerHTML = `
        <button class="btn-topo-avaliacao" onclick="window.location.href='detalhes.html?id=${anuncio.id}'">
            <i class='bx bx-info-circle'></i> Mais Informações
        </button>
        <div class="cp-header-clean">
            <div style="display:flex; gap:12px; align-items:center;">
                <img src="${fotoAutor}" class="cp-avatar js-user-link" loading="lazy" decoding="async" ${userDataAttr} ${linkPerfil} ${estiloLink}> 
                <div class="cp-info-user">
                    <div class="cp-nome-row">
                        <h4 class="cp-nome-clean js-user-link" ${userDataAttr} ${linkPerfil} ${estiloLink}>${nomeParaExibir}</h4>
                        ${htmlAvaliacaoDisplay}
                    </div>
                    <div class="cp-tempo-online">
                        <div class="status-dot online"></div> Online
                    </div>
                </div>
            </div>
        </div>
        <div class="cp-body">
            <h3 class="cp-titulo">${titulo}</h3>
            <p class="cp-desc-clean">${descricao}</p>
        </div>
        ${htmlFotos}
        <div class="cp-footer-right">
            <div style="margin-right:auto; min-width:0;">
                ${__precoLabel ? `<small style="display:block; color:#999; font-size:0.7rem;">${__precoLabel}</small>` : ``}
                <strong style="color:var(--cor0); font-size:1.1rem;">${preco}</strong>
                <div class="cp-avg-price" data-anuncio-id="${anuncio.id || ''}" style="display:none; margin-top:6px; font-size:0.72rem; color:#64748b;">
                    Preço médio (5+ serviços): <b style="color:#0f172a;"></b>
                </div>
            </div>
            
            <button class="btn-solicitar" onclick="window.location.href='orcamento.html?uid=${anuncio.uid}&aid=${anuncio.id}'">
                Solicitar Orçamento
            </button>
        </div>
    `;

    

        // Favoritos (coração) + estado inicial
        try {
            card.dataset.anuncioId = anuncio.id || '';
            const favBtn = document.createElement('button');
            favBtn.className = 'cp-fav-btn';
            favBtn.type = 'button';
            favBtn.setAttribute('aria-label', 'Favoritar');
            favBtn.setAttribute('aria-pressed', 'false');
            if (anuncio.id) favBtn.dataset.favId = anuncio.id;
            favBtn.innerHTML = "<i class='bx bx-heart'></i>";
            card.appendChild(favBtn);
        } catch(e) {}

        // Preço médio (5+ serviços) - calculado a partir de cobranças pagas
        try {
            if (anuncio.id) {
                window.__dokeUpdatePrecoMedioCard?.(card, anuncio.id);
            }
        } catch (_) {}

        try {
            const menuWrap = document.createElement('div');
            menuWrap.className = 'cp-more';
            menuWrap.innerHTML = `
                <button class="cp-more-btn" type="button" aria-label="Mais opcoes">
                    <i class='bx bx-dots-vertical-rounded'></i>
                </button>
                <div class="cp-more-menu" role="menu">
                    <button type="button" data-action="like" role="menuitem"><i class='bx bx-heart'></i> Curtir</button>
                    <button type="button" data-action="share" role="menuitem"><i class='bx bx-share-alt'></i> Compartilhar</button>
                    <button type="button" data-action="report" role="menuitem"><i class='bx bx-flag'></i> Denunciar</button>
                </div>
            `;
            card.appendChild(menuWrap);

            const menuBtn = menuWrap.querySelector('.cp-more-btn');
            const menu = menuWrap.querySelector('.cp-more-menu');
            menuWrap.addEventListener('mousedown', (e) => e.stopPropagation());

            const handleMenuAction = (action) => {
                if (action === "like") {
                    menuBtn.classList.toggle('liked');
                    if (window.dokeDelight?.toast) window.dokeDelight.toast('Curtido');
                    return;
                }
                if (action === "share") {
                    const url = `detalhes.html?id=${anuncio.id || ''}`;
                    if (navigator.share) {
                        navigator.share({ title: anuncio.titulo || 'Servico', url });
                    } else if (navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(url);
                        if (window.dokeDelight?.toast) window.dokeDelight.toast('Link copiado');
                    } else {
                        window.prompt('Copie o link:', url);
                    }
                    return;
                }
                if (action === "report") {
                    window.alert('Denuncia enviada. Obrigado!');
                }
            };

            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('open');
            });

            menu.addEventListener('click', (e) => {
                e.stopPropagation();
                const btn = e.target.closest('button');
                if (!btn) return;
                menu.classList.remove('open');
                handleMenuAction(btn.dataset.action);
            });

            if (!window.__dokeAnuncioMenuCloseBound) {
                window.__dokeAnuncioMenuCloseBound = true;
                document.addEventListener('click', () => {
                    document.querySelectorAll('.cp-more-menu.open').forEach((el) => {
                        el.classList.remove('open');
                    });
                });
            }
        } catch(e) {}

        // Online real-time (melhor esforço: usa flags/timestamps se existirem)
        try {
            const dot = card.querySelector('.status-dot');
            const label = card.querySelector('.status-text');
            if (dot && label) {
                const isOnlineFlag = !!(anuncio.statusOnline || anuncio.online || anuncio.isOnline);
                const last = anuncio.lastActive || anuncio.ultimoOnline || anuncio.last_seen || null;
                let lastMs = null;
                if (typeof last === 'number') lastMs = (last > 1e12 ? last : last * 1000);
                if (typeof last === 'string') {
                    const d = Date.parse(last);
                    if (!Number.isNaN(d)) lastMs = d;
                }
                const recently = lastMs ? (Date.now() - lastMs) <= 15 * 60 * 1000 : false;
                const isOnline = isOnlineFlag || recently;
                dot.classList.toggle('online', isOnline);
                dot.classList.toggle('offline', !isOnline);
                label.textContent = isOnline ? 'Online' : 'Offline';
                dot.title = isOnline ? 'Online agora' : (lastMs ? ('Visto recentemente') : 'Offline');
            }
        } catch(e) {}
return card;
};

function __dokeNormalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function __dokeTokenize(term) {
    const base = __dokeNormalizeText(term);
    if (!base) return [];
    const rawTokens = base.split(/[\s,;:.|/\\]+/).filter(Boolean);
    const tokens = new Set();
    rawTokens.forEach(t => {
        tokens.add(t);
        if (t.endsWith('s') && t.length > 3) tokens.add(t.slice(0, -1));
    });
    return Array.from(tokens);
}

function __dokeBuildSearchText(anuncio) {
    if (!anuncio) return '';
    if (anuncio.__searchText) return anuncio.__searchText;
    const parts = [
        anuncio.titulo,
        anuncio.descricao,
        anuncio.categoria,
        anuncio.categorias,
        anuncio.tags,
        anuncio.palavrasChave,
        anuncio.palavras_chave,
        anuncio.servico,
        anuncio.servicos,
        anuncio.nomeAutor,
        anuncio.userHandle,
        anuncio.cidade,
        anuncio.bairro,
        anuncio.uf
    ];
    const text = __dokeNormalizeText(parts.filter(Boolean).join(' '));
    anuncio.__searchText = text;
    return text;
}

function __dokeScoreAnuncio(anuncio, tokens) {
    if (!tokens.length) return 0;
    const titulo = __dokeNormalizeText(anuncio.titulo || '');
    const desc = __dokeNormalizeText(anuncio.descricao || '');
    const cat = __dokeNormalizeText(`${anuncio.categoria || ''} ${anuncio.categorias || ''}`);
    const loc = __dokeNormalizeText(`${anuncio.cidade || ''} ${anuncio.bairro || ''} ${anuncio.uf || ''}`);

    let score = 0;
    tokens.forEach(t => {
        if (titulo.includes(t)) score += 6;
        if (cat.includes(t)) score += 4;
        if (desc.includes(t)) score += 3;
        if (loc.includes(t)) score += 2;
    });

    const full = __dokeBuildSearchText(anuncio);
    const fullTerm = tokens.join(' ');
    if (full.includes(fullTerm)) score += 5;

    return score;
}

function __dokeFilterByTerm(lista, term) {
    const tokens = __dokeTokenize(term);
    if (!tokens.length) return lista.slice();
    const ranked = lista.map(a => {
        const hay = __dokeBuildSearchText(a);
        const okAll = tokens.every(t => hay.includes(t));
        const okAny = tokens.some(t => hay.includes(t));
        const score = okAll || okAny ? __dokeScoreAnuncio(a, tokens) : 0;
        return { anuncio: a, score, okAll, okAny };
    });

    let filtered = ranked.filter(x => x.okAll);
    if (!filtered.length) filtered = ranked.filter(x => x.okAny);

    return filtered
        .sort((a, b) => b.score - a.score)
        .map(x => x.anuncio);
}

function __dokeParsePreco(value) {
    if (value === null || value === undefined) return null;
    const s = String(value).toLowerCase();
    if (s.includes('orc') || s.includes('combinar')) return null;
    const cleaned = s.replace(/[^0-9,\.]/g, '');
    const normalized = cleaned.replace(/\.(?=.*\.)/g, '').replace(',', '.');
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : null;
}

function __dokeGetStoredLoc(){
    const lat = parseFloat(localStorage.getItem('doke_loc_lat') || '');
    const lng = parseFloat(localStorage.getItem('doke_loc_lng') || '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
}
function __dokeSetStoredLoc(lat, lng){
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    localStorage.setItem('doke_loc_lat', String(lat));
    localStorage.setItem('doke_loc_lng', String(lng));
}
function __dokeDistanceKm(a, b){
    if (!a || !b) return null;
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s1 = Math.sin(dLat / 2) ** 2;
    const s2 = Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(s1 + s2), Math.sqrt(1 - (s1 + s2)));
    return R * c;
}
function __dokeGetAnuncioLatLng(a){
    if (!a) return null;
    let loc = a.localizacao || a.localizacao_json || a.location || null;
    if (typeof loc === 'string') {
        try { loc = JSON.parse(loc); } catch (_) {}
    }
    const lat = a.lat || a.latitude || loc?.lat || loc?.latitude || null;
    const lng = a.lng || a.lon || a.longitude || loc?.lng || loc?.longitude || null;
    if (!Number.isFinite(parseFloat(lat)) || !Number.isFinite(parseFloat(lng))) return null;
    return { lat: parseFloat(lat), lng: parseFloat(lng) };
}
function __dokeScoreQualidade(a){
    const nota = Number(a.mediaAvaliacao || a.rating || 0);
    const reviews = Number(a.numAvaliacoes || a.reviews || 0);
    let taxa = Number(a.taxaResposta || a.responseRate || a.taxa_resposta || 0);
    let conversao = Number(a.conversao || a.conversionRate || a.taxaConversao || 0);
    const tempoMs = Number(a.tempoMedioResposta || a.avgResponseTimeMs || a.tempo_resposta_ms || 0);
    if (taxa > 1) taxa = taxa / 100;
    if (conversao > 1) conversao = conversao / 100;
    const score = (nota * 20)
        + (Math.log10(reviews + 1) * 8)
        + (taxa * 20)
        + (conversao * 12)
        - (tempoMs ? Math.min(tempoMs / 60000, 240) * 0.03 : 0);
    return score;
}

function __dokeApplyFilters(lista, opts = {}) {
    let out = lista.slice();
    const term = opts.term ? String(opts.term).trim() : '';
    if (term) out = __dokeFilterByTerm(out, term);

    const tipoAtend = (opts.tipoAtend || '').toLowerCase();
    if (tipoAtend && tipoAtend !== 'todos') {
        out = out.filter(a => {
            const modo = __dokeNormalizeText(a.modo_atend || a.modoAtend || a.atendimento || a.tipoAtendimento || '');
            if (tipoAtend === 'online') return modo.includes('online') || modo.includes('ambos');
            if (tipoAtend === 'presencial') return modo.includes('presencial') || modo.includes('ambos');
            if (tipoAtend === 'ambos') return modo.includes('ambos');
            return modo.includes(__dokeNormalizeText(tipoAtend));
        });
    }

    const categoria = __dokeNormalizeText(opts.categoria || '');
    if (categoria && categoria !== 'todas') {
        out = out.filter(a => {
            const cat = __dokeNormalizeText(a.categoria || '');
            const cats = __dokeNormalizeText(a.categorias || '');
            return cat === categoria || cats.split(',').some(c => __dokeNormalizeText(c) === categoria);
        });
    }

    const tipoPreco = __dokeNormalizeText(opts.tipoPreco || '');
    if (tipoPreco && tipoPreco !== 'todos') {
        out = out.filter(a => {
            const tipoRaw = __dokeNormalizeText(a.tipoPreco || a.tipo_preco || '');
            const precoRaw = String(a.preco || '');
            const precoNorm = __dokeNormalizeText(precoRaw);
            const isOrc = tipoRaw.includes('sob orcamento') || precoNorm.includes('orcamento');
            const isFixo = tipoRaw.includes('preco fixo') || (!isOrc && __dokeParsePreco(precoRaw) !== null);
            if (tipoPreco === 'sob_orcamento') return isOrc;
            if (tipoPreco === 'preco_fixo') return isFixo;
            return true;
        });
    }

    let uf = __dokeNormalizeText(opts.uf || '');
    let cidade = __dokeNormalizeText(opts.cidade || '');
    let bairro = __dokeNormalizeText(opts.bairro || '');

    const chip = __dokeNormalizeText(opts.chip || '');
    if (chip === 'perto' && !uf && !cidade && !bairro) {
        uf = __dokeNormalizeText(localStorage.getItem('doke_loc_uf') || '');
        cidade = __dokeNormalizeText(localStorage.getItem('doke_loc_cidade') || '');
        bairro = __dokeNormalizeText(localStorage.getItem('doke_loc_bairro') || '');
    }

    if (uf) out = out.filter(a => __dokeNormalizeText(a.uf || '') === uf);
    if (cidade) out = out.filter(a => __dokeNormalizeText(a.cidade || '') === cidade);
    if (bairro) out = out.filter(a => __dokeNormalizeText(a.bairro || '') === bairro);

    const raioKm = Number.isFinite(opts.raioKm) ? opts.raioKm : null;
    const userLoc = opts.userLoc || __dokeGetStoredLoc();
    if (raioKm && userLoc) {
        out = out.filter(a => {
            const loc = __dokeGetAnuncioLatLng(a);
            if (!loc) return false;
            const dist = __dokeDistanceKm(userLoc, loc);
            return Number.isFinite(dist) ? dist <= raioKm : false;
        });
    }

    const pagamentos = opts.pagamentos || {};
    if (pagamentos.pix || pagamentos.credito || pagamentos.debito) {
        out = out.filter(a => {
            const raw = Array.isArray(a.pagamentosAceitos) ? a.pagamentosAceitos : (a.pagamentos_aceitos || []);
            const list = Array.isArray(raw)
                ? raw.map(p => __dokeNormalizeText(p))
                : __dokeNormalizeText(raw).split(',').map(p => p.trim()).filter(Boolean);
            if (pagamentos.pix && !list.some(p => p.includes('pix'))) return false;
            if (pagamentos.credito && !list.some(p => p.includes('credito'))) return false;
            if (pagamentos.debito && !list.some(p => p.includes('debito'))) return false;
            return true;
        });
    }

    const extras = opts.extras || {};
    if (extras.garantia) {
        out = out.filter(a => String(a.garantia || '').trim().length > 0);
    }
    if (extras.emergencia) {
        out = out.filter(a => a.atendeEmergencia === true || a.emergencia === true);
    }
    if (extras.formulario) {
        out = out.filter(a => a.temFormulario === true || (Array.isArray(a.perguntasFormularioJson) && a.perguntasFormularioJson.length > 0));
    }

    if (Number.isFinite(opts.maxPrice)) {
        out = out.filter(a => {
            const p = __dokeParsePreco(a.preco);
            return p === null ? true : p <= opts.maxPrice;
        });
    }

    if (chip === 'super') {
        out = out.filter(a => (a.mediaAvaliacao || 0) >= 4.5 || (a.numAvaliacoes || 0) >= 5);
    } else if (chip === 'recem') {
        const now = Date.now();
        out = out.filter(a => {
            const d = new Date(a.dataCriacao || a.dataAtualizacao || 0).getTime();
            return d && (now - d) <= 30 * 24 * 60 * 60 * 1000;
        });
    } else if (chip === 'verificados') {
        out = out.filter(a => a.verificado === true || a.verified === true || a.isVerified === true);
    }

    const ord = opts.order || '';
    if (ord === 'preco_menor' || ord === 'menor_preco') {
        out.sort((a, b) => (__dokeParsePreco(a.preco) ?? 1e12) - (__dokeParsePreco(b.preco) ?? 1e12));
    } else if (ord === 'preco_maior') {
        out.sort((a, b) => (__dokeParsePreco(b.preco) ?? -1) - (__dokeParsePreco(a.preco) ?? -1));
    } else if (ord === 'qualidade' || ord === 'melhor_qualidade') {
        out.sort((a, b) => __dokeScoreQualidade(b) - __dokeScoreQualidade(a));
    } else if (ord === 'melhor_avaliacao') {
        out.sort((a, b) => (b.mediaAvaliacao || 0) - (a.mediaAvaliacao || 0));
    } else if (ord === 'mais_recente' || ord === 'recente') {
        out.sort((a, b) => {
            const da = new Date(a.dataCriacao || a.dataAtualizacao || 0).getTime();
            const db = new Date(b.dataCriacao || b.dataAtualizacao || 0).getTime();
            return db - da;
        });
    }

    if (chip === 'tendencias') {
        out = out
            .map(a => ({ a, s: (a.views || 0) + (a.cliques || 0) }))
            .sort((x, y) => y.s - x.s)
            .map(x => x.a);
        if (out.length > 24) out = out.slice(0, 24);
    }

    return out;
}

window.dokePopulateCategoryFilters = function() {
    const selects = document.querySelectorAll('#filtroCategoria');
    if (!selects.length) return;
    const full = Array.isArray(window.__dokeAnunciosCacheFull) ? window.__dokeAnunciosCacheFull : [];
    const set = new Set();
    full.forEach(a => {
        const cat = String(a.categoria || '').trim();
        if (cat) set.add(cat);
        const cats = String(a.categorias || '').split(',').map(s => s.trim()).filter(Boolean);
        cats.forEach(c => set.add(c));
    });
    const list = Array.from(set).sort((a, b) => a.localeCompare(b));
    selects.forEach(sel => {
        const current = sel.value || 'todas';
        sel.innerHTML = '<option value="todas">Todas</option>' + list.map(c => `<option value="${c}">${c}</option>`).join('');
        sel.value = list.includes(current) ? current : 'todas';
    });
};

async function __dokeFetchAnunciosFallback() {
    const client = (typeof getSupabaseClient === "function")
        ? getSupabaseClient()
        : (window.sb || window.supabaseClient || window.sbClient || window.supabase || null);
    if (!client?.from) return { ok: false, data: [] };

    const tableCandidates = ["anuncios", "servicos"];
    for (const table of tableCandidates) {
        try {
            const res = await client
                .from(table)
                .select("*")
                .limit(300);
            if (res.error) continue;
            if (!Array.isArray(res.data)) continue;
            const normalized = res.data.map((row, idx) => ({
                ...row,
                id: row?.id || row?.anuncioId || row?.anuncio_id || row?.anuncioid || row?.servico_id || row?.servicoId || row?.servico || `${table}-${idx}`
            }));
            return { ok: true, data: normalized };
        } catch (_) {}
    }

    return { ok: false, data: [] };
}

window.carregarAnunciosDoFirebase = async function(termoBusca = "") {
    const feed = document.getElementById('feedAnuncios');
    const tituloSecao = document.getElementById('categorias-title'); 
    if (!feed) return; 

    window.dokeRenderAnunciosSkeleton(feed);

    try {
        let listaAnuncios = [];
        let fetched = false;
        let lastLoadError = null;

        const hasCompatDb = !!window.db
            && typeof query === "function"
            && typeof collection === "function"
            && typeof getDocs === "function";

        if (hasCompatDb) {
            try {
                const q = query(collection(window.db, "anuncios"));
                const querySnapshot = await Promise.race([
                    getDocs(q),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout_firestore_anuncios")), 12000))
                ]);

                querySnapshot.forEach((docSnap) => {
                    let dados = docSnap.data();
                    dados.id = docSnap.id;
                    listaAnuncios.push(dados);
                });
                fetched = true;
            } catch (fireErr) {
                lastLoadError = fireErr;
                console.warn("Falha ao carregar anúncios via compat:", fireErr);
            }
        }

        if (!fetched) {
            const fallback = await __dokeFetchAnunciosFallback();
            if (fallback.ok) {
                listaAnuncios = Array.isArray(fallback.data) ? fallback.data : [];
                fetched = true;
            }
        }

        if (!fetched) {
            throw (lastLoadError || new Error("Nao foi possivel carregar anuncios no momento."));
        }

        // Não mostrar anúncios desativados no feed público
        // (anúncios antigos sem o campo 'ativo' continuam aparecendo)
        listaAnuncios = listaAnuncios.filter(a => a.ativo !== false);

        window.__dokeAnunciosCacheFull = listaAnuncios.slice();
        if (typeof window.dokePopulateCategoryFilters === 'function') {
            window.dokePopulateCategoryFilters();
        }

        const isBuscaPage = !!document.getElementById('filtroOrdenacao');
        if (isBuscaPage) {
            window.__dokeBuscaTermoAtual = termoBusca || '';
            if (typeof window.aplicarFiltrosBusca === 'function') {
                window.aplicarFiltrosBusca();
                return;
            }
        }

        let listaFinal = listaAnuncios;
        if (termoBusca && termoBusca.trim() !== "") {
            if(tituloSecao) tituloSecao.innerHTML = `Resultados para: <span style="color:var(--cor2)">"${termoBusca}"</span>`;
            listaFinal = __dokeApplyFilters(listaAnuncios, { term: termoBusca });
        } else {
            if(tituloSecao) tituloSecao.innerText = "Categorias em alta:";
        }

        feed.innerHTML = ""; 

        function appendAnuncioCard(target, card) {
            if (!target || !card) return;
            if (typeof card === 'string') target.insertAdjacentHTML('beforeend', card);
            else target.appendChild(card);
        }

        if (listaFinal.length === 0) {
            // Nada encontrado: sugere alguns anúncios embaixo (quando houver termo de busca)
            if (termoBusca && termoBusca.trim() !== "" && listaAnuncios.length) {
                const sugest = listaAnuncios.slice(0, 8);
                feed.innerHTML = `
                  <div class="doke-empty">
                    <div class="doke-empty__icon">🔎</div>
                    <div class="doke-empty__title">Nenhum anúncio encontrado</div>
                    <div class="doke-empty__subtitle">Não achamos resultados para <b>${escapeHtml(termoBusca)}</b>. Tente ajustar seus filtros ou buscar por outro termo.</div>
                    <div class="doke-empty__actions">
                      <button class="doke-empty__btn" type="button" onclick="try{document.querySelector(\'#buscaInput\')?.focus()}catch(e){}">Nova busca</button>
                      <button class="doke-empty__btn doke-empty__btn--primary" type="button" onclick="try{window.location.href=\'busca.html\'}catch(e){}">Explorar</button>
                    </div>
                  </div>
                  <div style="padding:6px 0 10px; font-weight:800; color:#0b7768;">Sugestões para você</div>
                `;
                sugest.forEach((a) => {
                    const card = window.dokeBuildCardPremium(a);
                    appendAnuncioCard(feed, card);
                });
            } else {
                feed.innerHTML = `<p style="text-align:center; padding:20px; color:#666;">Nenhum anúncio encontrado.</p>`;
            }
            feed.setAttribute('aria-busy', 'false');
            return;
        }

        // Paginação simples (home/header) — carrega por lotes
        window.__dokeAnunciosListaAtual = listaFinal;
        window.__dokeAnunciosCursor = 0;

        function renderMais(qtd = 8){
            const list = window.__dokeAnunciosListaAtual || [];
            const start = window.__dokeAnunciosCursor || 0;
            const end = Math.min(start + qtd, list.length);
            for (let i = start; i < end; i++){
                const anuncio = list[i];
                const card = window.dokeBuildCardPremium(anuncio);
                appendAnuncioCard(feed, card);
            }
            window.__dokeAnunciosCursor = end;
            const btn = document.getElementById('btnVerMaisAnuncios');
            if (btn) btn.style.display = (end < list.length) ? '' : 'none';
        }

        // limpa e renderiza o primeiro lote
        feed.innerHTML = "";
        renderMais(8);

        // botão Ver mais
        if (!document.getElementById('btnVerMaisAnuncios')) {
            const wrap = document.createElement('div');
            wrap.style.textAlign = 'center';
            wrap.style.padding = '14px 0 6px';
            wrap.innerHTML = `<button id="btnVerMaisAnuncios" class="btn-pro-action" type="button" style="min-width:220px;">Ver mais</button>`;
            feed.parentNode && feed.parentNode.insertBefore(wrap, feed.nextSibling);
            const btnEl = wrap.querySelector('#btnVerMaisAnuncios');
            btnEl?.addEventListener('click', ()=> renderMais(8));
            if (btnEl) {
                btnEl.style.display = (window.__dokeAnunciosCursor < (window.__dokeAnunciosListaAtual||[]).length) ? '' : 'none';
            }
        } else {
            const btn = document.getElementById('btnVerMaisAnuncios');
            if (btn) {
                btn.onclick = ()=> renderMais(8);
                btn.style.display = (window.__dokeAnunciosCursor < (window.__dokeAnunciosListaAtual||[]).length) ? '' : 'none';
            }
        }

        feed.setAttribute('aria-busy', 'false');
        return;
    } catch (erro) {
        console.error("Erro no carregamento:", erro);
        feed.innerHTML = `<p style="text-align:center; padding:20px;">Erro ao carregar anúncios.</p>`;
        feed.setAttribute('aria-busy', 'false');
    }
}


// Reset rápido dos filtros da busca (usado no estado vazio)
window.__dokeResetBuscaFiltros = function(){
    try{
        const idsText = ['inputBusca','filtroPreco','filtroTipoPreco','filtroCategoria','filtroRaio','selectEstado','selectCidade','selectBairro'];
        idsText.forEach(id=>{
            const el = document.getElementById(id);
            if(!el) return;
            if(el.tagName === 'SELECT') el.selectedIndex = 0;
            else el.value = '';
            el.dispatchEvent(new Event('change', {bubbles:true}));
            el.dispatchEvent(new Event('input', {bubbles:true}));
        });
        const ord = document.getElementById('filtroOrdenacao');
        if(ord) { ord.value = 'relevancia'; ord.dispatchEvent(new Event('change', {bubbles:true})); }

        // chips
        window.__dokeChipFiltro = 'todos';
        document.querySelectorAll('.chip-tag.ativo').forEach(c=>c.classList.remove('ativo'));
        const first = document.querySelector('.chip-tag[data-chip="todos"]');
        if(first) first.classList.add('ativo');

        // url
        const url = new URL(window.location.href);
        url.searchParams.delete('q');
        window.history.replaceState({}, '', url.toString());
    }catch(e){}
};

window.aplicarFiltrosBusca = function() {
    const feed = document.getElementById('feedAnuncios');
    if (!feed) return;

    const full = Array.isArray(window.__dokeAnunciosCacheFull) ? window.__dokeAnunciosCacheFull.slice() : [];
    const inputBusca = document.getElementById('inputBusca');
    const termo = (inputBusca?.value || window.__dokeBuscaTermoAtual || '').trim();

    const maxRaw = (document.getElementById('filtroPreco')?.value || '').trim();
    const maxPrice = maxRaw ? parseFloat(maxRaw.replace(',', '.')) : null;

    const order = document.getElementById('filtroOrdenacao')?.value || 'recente';
    const tipoAtend = document.querySelector('input[name="tipoAtend"]:checked')?.value || 'todos';
    const tipoPreco = document.getElementById('filtroTipoPreco')?.value || 'todos';
    const categoria = document.getElementById('filtroCategoria')?.value || 'todas';
    const chip = window.__dokeChipFiltro || 'todos';
    const pagamentos = {
        pix: !!document.getElementById('filtroPgPix')?.checked,
        credito: !!document.getElementById('filtroPgCredito')?.checked,
        debito: !!document.getElementById('filtroPgDebito')?.checked
    };
    const extras = {
        garantia: !!document.getElementById('filtroGarantia')?.checked,
        emergencia: !!document.getElementById('filtroEmergencia')?.checked,
        formulario: !!document.getElementById('filtroFormulario')?.checked
    };

    const uf = document.getElementById('selectEstado')?.value || '';
    const cidade = document.getElementById('selectCidade')?.value || '';
    const bairro = document.getElementById('selectBairro')?.value || '';
    const raioRaw = (document.getElementById('filtroRaio')?.value || '').trim();
    const raioKm = raioRaw ? parseFloat(raioRaw.replace(',', '.')) : null;
    const userLoc = window.__dokeUserLoc || __dokeGetStoredLoc();
    const radiusStatus = document.getElementById('radiusStatus');
    if (radiusStatus) {
        if (raioKm && !userLoc) radiusStatus.textContent = 'Ative a localizacao para usar o raio.';
        else if (raioKm && userLoc) radiusStatus.textContent = `Raio ativo: ${raioKm} km.`;
        else radiusStatus.textContent = '';
    }

    const lista = __dokeApplyFilters(full, {
        term: termo,
        maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
        order,
        tipoPreco,
        categoria,
        pagamentos,
        extras,
        chip,
        tipoAtend,
        uf,
        cidade,
        bairro,
        raioKm: Number.isFinite(raioKm) ? raioKm : null,
        userLoc
    });

    feed.innerHTML = '';
    if (!lista.length) {
        feed.innerHTML = `
          <div class="doke-empty doke-soft-card doke-empty-state">
            <div class="ico"><i class='bx bx-search-alt'></i></div>
            <h3>Nenhum anúncio encontrado</h3>
            <p>Tente ajustar os filtros, ampliar o raio ou buscar por outro termo.</p>
            <div class="actions">
              <button class="doke-btn primary" type="button" onclick="window.__dokeResetBuscaFiltros(); if(window.aplicarFiltrosBusca) window.aplicarFiltrosBusca();">Limpar filtros</button>
              <button class="doke-btn ghost" type="button" onclick="const i=document.getElementById('inputBusca'); if(i){ i.focus(); i.select(); }">Nova busca</button>
            </div>
          </div>`;
    } else {
        const frag = document.createDocumentFragment();
        lista.forEach(anuncio => {
            const card = window.dokeBuildCardPremium(anuncio);
            frag.appendChild(card);
        });
        feed.appendChild(frag);
    }

    const titulo = document.getElementById('categorias-title');
    if (titulo) {
        titulo.innerHTML = termo ? `Resultados para: <span style="color:var(--cor2)">"${termo}"</span>` : 'Resultados da busca';
    }
    const contador = document.getElementById('contador-resultados');
    if (contador) {
        contador.textContent = `Mostrando ${lista.length} resultados`;
    }
};

window.usarMinhaLocalizacao = function() {
    const statusEl = document.getElementById('radiusStatus');
    if (!navigator.geolocation) {
        if (statusEl) statusEl.textContent = 'Geolocalizacao indisponivel no navegador.';
        return;
    }
    if (statusEl) statusEl.textContent = 'Obtendo localizacao...';
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            window.__dokeUserLoc = { lat, lng };
            __dokeSetStoredLoc(lat, lng);
            if (statusEl) statusEl.textContent = 'Localizacao atualizada.';
            if (window.aplicarFiltrosBusca) window.aplicarFiltrosBusca();
        },
        () => {
            if (statusEl) statusEl.textContent = 'Nao foi possivel obter a localizacao.';
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
};

window.novaBusca = function() {
    const input = document.getElementById('inputBusca');
    const termo = (input?.value || '').trim();
    if (termo) {
        try { salvarBusca(termo); } catch (_) {}
    }
    const url = new URL(window.location.href);
    if (termo) url.searchParams.set('q', termo);
    else url.searchParams.delete('q');
    window.history.replaceState({}, '', url.toString());
    window.__dokeBuscaTermoAtual = termo;
    window.carregarAnunciosDoFirebase(termo);
};

// ============================================================
// 8. FUNÇÕES GERAIS (CARREGAMENTO, AUTH, ETC) - MANTIDAS
// ============================================================
// ============================================================
// CATEGORIAS (carrossel em círculo, ícone + nome, hover glow)
// ============================================================
const __DOKE_ANUNCIAR_CATEGORIAS = [
    "Eletricista",
    "Encanador",
    "Pintura",
    "Limpeza",
    "Frete",
    "Tecnologia",
    "Aulas",
    "Beleza",
    "Reforma"
];

function __dokeGetAnunciarCategorias(){
    return [...__DOKE_ANUNCIAR_CATEGORIAS];
}

function __dokeEnsureCategoryIconGlyph(container){
    if (!container) return;
    const icons = container.querySelectorAll('.cat-ico i');
    icons.forEach((el) => {
        try {
            const content = window.getComputedStyle(el, '::before').getPropertyValue('content');
            if (!content || content === 'none' || content === '""' || content === "''") {
                el.className = 'bx bx-category';
            }
        } catch (_) {
            el.className = 'bx bx-category';
        }
    });
}

function __dokeIconForCategory(nome){
    const n = String(nome || '').toLowerCase();
    if (n.includes('reforma') || n.includes('constru')) return 'bx-home';
    if (n.includes('pint')) return 'bx-paint';
    if (n.includes('eletric')) return 'bx-bulb';
    if (n.includes('encan') || n.includes('hidra')) return 'bx-wrench';
    if (n.includes('assist') || n.includes('técn') || n.includes('tecnic')) return 'bx-wrench';
    if (n.includes('aula') || n.includes('curso') || n.includes('particular')) return 'bx-book';
    if (n.includes('beleza') || n.includes('estetic') || n.includes('cabelo')) return 'bx-cut';
    if (n.includes('limpeza')) return 'bx-water';
    if (n.includes('mudan') || n.includes('frete') || n.includes('entreg')) return 'bx-package';
    if (n.includes('jardin') || n.includes('paisag') || n.includes('grama')) return 'bx-leaf';
    if (n.includes('pet') || n.includes('animal') || n.includes('dog') || n.includes('gato')) return 'bx-dog';
    if (n.includes('foto') || n.includes('film') || n.includes('video')) return 'bx-camera';
    if (n.includes('design')) return 'bx-palette';
    return 'bx-category';
}

function __dokeSetupCatCarousel(){
    const track = document.getElementById('listaCategorias');
    if (!track || track.dataset.carouselReady === '1') return;
    track.dataset.carouselReady = '1';

    const prev = document.querySelector('.cat-prev');
    const next = document.querySelector('.cat-next');
    const dots = document.getElementById('catDots');

    const scrollByPage = (dir) => {
        const amount = Math.max(220, Math.floor(track.clientWidth * 0.85));
        track.scrollBy({ left: dir * amount, behavior: 'smooth' });
    };

    prev?.addEventListener('click', () => scrollByPage(-1));
    next?.addEventListener('click', () => scrollByPage(1));

    const rebuildDots = () => {
        if (!dots) return;
        const pages = Math.max(1, Math.ceil(track.scrollWidth / Math.max(1, track.clientWidth)));
        dots.innerHTML = '';
        for (let i = 0; i < pages; i++) {
            const d = document.createElement('span');
            d.className = 'cat-dot';
            d.addEventListener('click', () => {
                const targetLeft = i * track.clientWidth;
                track.scrollTo({ left: targetLeft, behavior: 'smooth' });
            });
            dots.appendChild(d);
        }
        updateDots();
    };

    const updateDots = () => {
        if (!dots) return;
        const children = Array.from(dots.children);
        if (!children.length) return;
        const page = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        children.forEach((el, idx) => el.classList.toggle('ativo', idx === page));
    };

    const updateArrows = () => {
        const maxLeft = Math.max(0, track.scrollWidth - track.clientWidth);
        if (prev) prev.disabled = track.scrollLeft <= 2;
        if (next) next.disabled = track.scrollLeft >= maxLeft - 2;
    };

    const onScroll = () => { updateDots(); updateArrows(); };
    track.addEventListener('scroll', onScroll, { passive: true });

    // Recalcula quando layout muda
    const ro = new ResizeObserver(() => {
        rebuildDots();
        updateArrows();
    });
    ro.observe(track);

    // Init
    setTimeout(() => {
        rebuildDots();
        updateArrows();
    }, 50);
}

window.carregarCategorias = async function() {
    const container = document.getElementById('listaCategorias');
    if (!container) return;

    const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    const skelCount = vw <= 520 ? 5 : (vw <= 1024 ? 6 : 8);
    container.classList.add('is-loading');
    container.setAttribute('aria-busy', 'true');
    container.innerHTML = Array.from({ length: skelCount }).map(() => `
        <div class="cat-card cat-skel" aria-hidden="true">
            <span class="cat-ico cat-skel-circle skeleton"></span>
            <span class="cat-label cat-skel-line skeleton"></span>
            <span class="cat-count cat-skel-badge skeleton"></span>
        </div>
    `).join('');

    try {
        const categoriasBase = __dokeGetAnunciarCategorias();
        const baseLower = new Set(categoriasBase.map((c) => String(c || "").toLowerCase().trim()));

        const q = query(collection(window.db, "anuncios"));
        const snap = await getDocs(q);

        const freq = new Map();
        snap.forEach((docSnap) => {
            const d = docSnap.data() || {};
            let cats = d.categorias ?? d.categoria ?? '';
            if (Array.isArray(cats)) cats = cats.join(',');
            if (typeof cats !== 'string') cats = String(cats || '');
            cats.split(',').map(s => s.trim()).filter(Boolean).forEach((nome) => {
                freq.set(nome, (freq.get(nome) || 0) + 1);
            });
        });

        categoriasBase.forEach((nome) => {
            if (!freq.has(nome)) freq.set(nome, 0);
        });

        const listaBase = categoriasBase.map((nome) => ({
            nome,
            count: Number(freq.get(nome) || 0),
            icon: __dokeIconForCategory(nome)
        }));

        const listaExtras = [...freq.entries()]
            .filter(([nome]) => !baseLower.has(String(nome || "").toLowerCase().trim()))
            .sort((a,b) => b[1] - a[1])
            .slice(0, 24)
            .map(([nome, count]) => ({
                nome,
                count,
                icon: __dokeIconForCategory(nome)
            }));

        const lista = [...listaBase, ...listaExtras];

        if (!lista.length) {
            container.classList.remove('is-loading');
            container.setAttribute('aria-busy', 'false');
            container.innerHTML = `<div style="padding:0 20px; color:#999;">Categorias indisponiveis</div>`;
            return;
        }

        container.classList.remove('is-loading');
        container.innerHTML = '';
        lista.forEach((cat, idx) => {
            const tone = `cat-tone-${(idx % 4) + 1}`;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cat-card';
            btn.setAttribute('data-cat', cat.nome);
            btn.innerHTML = `
                <span class="cat-ico ${tone}">
                    <i class='bx ${cat.icon}' aria-hidden="true"></i>
                </span>
                <span class="cat-label">${escapeHtml(cat.nome)}</span>
                ${cat.count > 0 ? `<span class="cat-count">${cat.count}</span>` : ''}
            `;
            btn.addEventListener('click', () => {
                try { window.filtrarPorCategoria(cat.nome); } catch { }
            });
            container.appendChild(btn);
        });

        container.setAttribute('aria-busy', 'false');
        __dokeEnsureCategoryIconGlyph(container);
        __dokeSetupCatCarousel();
    } catch (e) {
        console.error('Erro categorias:', e);
        const listaFallback = __dokeGetAnunciarCategorias();
        container.classList.remove('is-loading');
        container.innerHTML = '';
        listaFallback.forEach((nome, idx) => {
            const tone = `cat-tone-${(idx % 4) + 1}`;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cat-card';
            btn.setAttribute('data-cat', nome);
            btn.innerHTML = `
                <span class="cat-ico ${tone}">
                    <i class='bx ${__dokeIconForCategory(nome)}' aria-hidden="true"></i>
                </span>
                <span class="cat-label">${escapeHtml(nome)}</span>
            `;
            btn.addEventListener('click', () => {
                try { window.filtrarPorCategoria(nome); } catch { }
            });
            container.appendChild(btn);
        });
        container.setAttribute('aria-busy', 'false');
        __dokeEnsureCategoryIconGlyph(container);
        __dokeSetupCatCarousel();
    }
};
window.sincronizarSessaoSupabase = async function() {
    const clearAuthCache = () => {
        try {
            [
                'usuarioLogado',
                'usuario_logado',
                'userLogado',
                'doke_usuario_logado',
                'doke_usuario_perfil',
                'perfil_usuario'
            ].forEach((k) => localStorage.removeItem(k));
        } catch (_) {}
    };
    if (!window.sb?.auth?.getSession) return null;
    try {
        const { data, error } = await window.sb.auth.getSession();
        if (error) return null;
        const user = data?.session?.user || null;
        if (!user) {
            clearAuthCache();
            return null;
        }
        if (!localStorage.getItem('doke_usuario_perfil')) {
            const nomeFallback = user.user_metadata?.nome || (user.email ? user.email.split('@')[0] : "Usuario");
            localStorage.setItem('doke_usuario_perfil', JSON.stringify({
                nome: nomeFallback,
                user: user.user_metadata?.user || nomeFallback,
                foto: user.user_metadata?.foto || ""
            }));
        }
        localStorage.setItem('usuarioLogado', 'true');
        return user;
    } catch (e) {
        console.log("Erro ao sincronizar sessao:", e);
        return null;
    }
}

window.carregarProfissionais = async function() {
    const container = document.getElementById('listaProfissionais');
    if (!container) return;
    container.innerHTML = "";
    const perfilSalvo = localStorage.getItem('doke_usuario_perfil');
    
    if (perfilSalvo) {
        const p = JSON.parse(perfilSalvo);
        const foto = p.foto || "https://i.pravatar.cc/150";
        let userHandle = p.user;
        if(!userHandle) { userHandle = "@" + (p.nome ? p.nome.split(' ')[0].toLowerCase() : "usuario"); }
        if(!userHandle.startsWith('@')) userHandle = '@' + userHandle;
        const job = p.bio ? (p.bio.length > 25 ? p.bio.substring(0, 25) + "..." : p.bio) : "Membro Doke";
        
        let avaliacaoHTML = "";
        let numReviews = (p.stats && p.stats.avaliacoes) ? p.stats.avaliacoes : 0;
        if (numReviews === 0) {
            avaliacaoHTML = `<span class="pro-rating" style="background:#e0f7fa; color:#006064;">Novo</span>`;
        } else {
            let media = (p.stats && p.stats.media) ? p.stats.media : 0; 
            avaliacaoHTML = `<span class="pro-rating">★ ${media} (${numReviews})</span>`;
        }

        const html = `
            <div class="pro-card">
                <i class='bx bxs-badge-check verified-badge'></i>
                <img src="${foto}" class="pro-avatar-lg">
                <span class="pro-name js-user-link" data-user="${userHandle}" style="color:var(--cor2); cursor:pointer;">${userHandle}</span>
                <span class="pro-job">${job}</span>
                ${avaliacaoHTML}
                <button class="btn-pro-action" onclick="window.location.href='meuperfil.html'">Ver Perfil</button>
            </div>
        `;
        container.innerHTML = html;
    } else {
        container.innerHTML = `<div style="padding: 20px; color: #888; white-space: nowrap;"><a href="login.html" style="color:var(--cor0); font-weight:bold;">Faça login</a> para ver seu destaque.</div>`;
    }
}

// ============================================================
// 9. HEADER, AUTH, UTILITÁRIOS E BUSCA (MANTIDOS)
// ============================================================

function protegerPaginasRestritas() {
    const paginasRestritas = ['meuperfil.html', 'chat.html', 'comunidade.html', 'notificacoes.html', 'mais.html', 'anunciar.html', 'orcamento.html', 'tornar-profissional.html'];
    const caminhoAtual = window.location.pathname;
    const paginaAtual = caminhoAtual.substring(caminhoAtual.lastIndexOf('/') + 1);
    const perfilSalvo = localStorage.getItem('doke_usuario_perfil');
    const estaLogado = localStorage.getItem('usuarioLogado') === 'true' || !!perfilSalvo;
    if (paginasRestritas.includes(paginaAtual) && !estaLogado) { window.location.href = "login.html"; }
}

window.verificarEstadoLogin = async function() {
    // 1. Pega os dados com segurança
    const perfilSalvo = localStorage.getItem('doke_usuario_perfil');
    const authUser = window.auth?.currentUser;
    let logado = localStorage.getItem('usuarioLogado') === 'true' || !!perfilSalvo || !!authUser;
    let perfil = {};
    let sessionUser = null;
    
    try {
        perfil = JSON.parse(perfilSalvo) || {};
    } catch (e) {
        console.log("Erro ao ler perfil", e);
        perfil = {};
    }

    // Corrige cache antigo com HTML indevido no nome de usuário.
    const nomeSeguroPerfil = sanitizePlainText(perfil.user || perfil.nome || "");
    if (nomeSeguroPerfil) {
        perfil.user = nomeSeguroPerfil;
        if (!perfil.nome) perfil.nome = nomeSeguroPerfil;
        try { localStorage.setItem('doke_usuario_perfil', JSON.stringify(perfil)); } catch(_) {}
    }

    // Define foto padrão se não tiver
    if (!perfilSalvo && authUser) {
        const nomeFallback = authUser.displayName || (authUser.email ? authUser.email.split('@')[0] : "Usuario");
        perfil = {
            nome: nomeFallback,
            user: authUser.displayName || nomeFallback,
            foto: authUser.photoURL || ""
        };
        localStorage.setItem('doke_usuario_perfil', JSON.stringify(perfil));
        localStorage.setItem('usuarioLogado', 'true');
        logado = true;
    }

    if (!logado && window.sb?.auth?.getSession) {
        try {
            const { data, error } = await window.sb.auth.getSession();
            if (!error) {
                sessionUser = data?.session?.user || null;
                if (sessionUser) {
                    const nomeFallback = sessionUser.user_metadata?.nome || (sessionUser.email ? sessionUser.email.split('@')[0] : "Usuario");
                    perfil = {
                        nome: nomeFallback,
                        user: sessionUser.user_metadata?.user || nomeFallback,
                        foto: sessionUser.user_metadata?.foto || ""
                    };
                    localStorage.setItem('doke_usuario_perfil', JSON.stringify(perfil));
                    localStorage.setItem('usuarioLogado', 'true');
                    logado = true;
                }
            }
        } catch (e) {
            console.log("Erro ao buscar sessao:", e);
        }
    }

    const fotoUsuario = perfil.foto || authUser?.photoURL || sessionUser?.user_metadata?.foto || 'https://i.pravatar.cc/150?img=12'; 
    const eProfissional = perfil.isProfissional === true;

    // --- A. CONTROLE DOS MENUS ---
    const containers = document.querySelectorAll('.botoes-direita');
    
    containers.forEach(container => {
        if (logado) {
            const linkAnunciar = eProfissional ? "anunciar.html" : "tornar-profissional.html";
            const textoAnunciar = eProfissional ? "Anunciar" : "Seja Profissional";

            // --- NOVO: LÓGICA DO BOTÃO CARTEIRA ---
            // Só aparece se for profissional
            const itemCarteira = eProfissional 
                ? `<a href="carteira.html" class="dropdown-item"><i class='bx bx-wallet'></i> Carteira</a>` 
                : "";

            container.innerHTML = `
                <div class="profile-container">
                    <img src="${fotoUsuario}" class="profile-img-btn" onclick="toggleDropdown(event)" alt="Perfil" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; cursor: pointer; border: 2px solid #ddd;">
                    <div id="dropdownPerfil" class="dropdown-profile">
                        <div style="padding: 10px 15px; border-bottom: 1px solid #eee; font-weight: bold; color: var(--cor2);">
                            ${escapeHtml(sanitizePlainText(perfil.user || perfil.nome || 'Usuário'))}
                        </div>
                        <a href="meuperfil.html" class="dropdown-item"><i class='bx bx-user-circle'></i> Ver Perfil</a>
                        
                        ${itemCarteira} <a href="#" onclick="alternarConta()" class="dropdown-item"><i class='bx bx-user-pin'></i> Alternar Conta</a>
                        <a href="${linkAnunciar}" class="dropdown-item"><i class='bx bx-plus-circle'></i> ${textoAnunciar}</a>
                        <a href="#" onclick="fazerLogout()" class="dropdown-item item-sair"><i class='bx bx-log-out'></i> Sair</a>
                    </div>
                </div>`;
        } else {
            container.innerHTML = `<a href="login.html" class="entrar">Entrar</a>`;
        }
    });

    const imgBottom = document.getElementById('imgPerfilMobile');
    if (imgBottom) {
        if (logado) {
            imgBottom.src = fotoUsuario;
            imgBottom.style.width = "26px"; 
            imgBottom.style.height = "26px";
            imgBottom.style.borderRadius = "50%";
            imgBottom.style.objectFit = "cover";
            imgBottom.style.border = "2px solid var(--cor0)";
            imgBottom.style.padding = "1px";
            imgBottom.classList.remove('icon', 'verde', 'azul'); 
        } else {
            imgBottom.src = "https://cdn-icons-png.flaticon.com/512/1077/1077114.png";
            imgBottom.style = ""; 
            imgBottom.classList.add('icon', 'verde');
        }
    }
}


window.alternarConta = async function() {
    // Mostra contas salvas (desktop). Não salva senha; só e-mail/uid/foto.
    const saved = (() => {
        try { return JSON.parse(localStorage.getItem('doke_saved_accounts') || '[]') || []; } catch { return []; }
    })();

    // fallback: se não houver contas salvas, apenas sair e ir para login
    async function doSignOut(){
        try { window.sb?.auth?.signOut && await window.sb.auth.signOut(); } catch(e){}
        try { window.auth?.signOut && await window.auth.signOut(); } catch(e){}
        localStorage.removeItem('usuarioLogado');
    }

    if (!saved.length || window.innerWidth < 768) {
        await doSignOut();
        window.location.href = 'login.html';
        return;
    }

    // Modal simples
    let modal = document.getElementById('dokeSwitchModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'dokeSwitchModal';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.background = 'rgba(0,0,0,.45)';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <div style="max-width:520px; margin:7vh auto; background:#fff; border-radius:18px; padding:18px; box-shadow:0 20px 50px rgba(0,0,0,.25);">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="font-size:1.2rem; font-weight:900;">Alternar conta</div>
          <button id="dokeSwitchClose" type="button" style="width:40px;height:40px;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:#fff;cursor:pointer;">✕</button>
        </div>
        <div style="margin-top:10px; color:rgba(0,0,0,.65);">Escolha uma conta salva</div>
        <div id="dokeSwitchList" style="margin-top:14px; display:flex; flex-direction:column; gap:10px;"></div>
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px;">
          <button id="dokeSwitchOther" type="button" class="btn-pro-action" style="background:#fff;color:#0b7768;border:1px solid rgba(0,0,0,.12);">Outra conta</button>
          <button id="dokeSwitchLogout" type="button" class="btn-pro-action">Sair</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const list = modal.querySelector('#dokeSwitchList');
    saved.slice(0,6).forEach(acc => {
        const foto = acc.foto || `https://i.pravatar.cc/80?u=${encodeURIComponent(String(acc.uid||acc.email||'u'))}`;
        const nome = acc.user || acc.nome || acc.email || 'Conta';
        const email = acc.email || '';
        const row = document.createElement('button');
        row.type = 'button';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '12px';
        row.style.padding = '12px';
        row.style.border = '1px solid rgba(0,0,0,.12)';
        row.style.borderRadius = '14px';
        row.style.background = '#fff';
        row.style.cursor = 'pointer';
        row.innerHTML = `
          <img src="${foto}" alt="" style="width:46px;height:46px;border-radius:50%;object-fit:cover;border:2px solid rgba(0,0,0,.10);" />
          <div style="text-align:left; min-width:0;">
            <div style="font-weight:900; color:#102a28; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(nome)}</div>
            <div style="color:rgba(0,0,0,.6); font-size:.92rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(email)}</div>
          </div>
        `;
        row.addEventListener('click', async ()=>{
            await doSignOut();
            window.location.href = `login.html?email=${encodeURIComponent(email)}`;
        });
        list.appendChild(row);
    });

    function close(){ modal.remove(); }
    modal.querySelector('#dokeSwitchClose')?.addEventListener('click', close);
    modal.addEventListener('click', (e)=>{ if(e.target === modal) close(); });
    modal.querySelector('#dokeSwitchOther')?.addEventListener('click', async ()=>{
        await doSignOut();
        window.location.href = 'login.html';
    });
    modal.querySelector('#dokeSwitchLogout')?.addEventListener('click', async ()=>{
        await doSignOut();
        window.location.href = 'login.html';
    });
}

function clearProfileDropdownInline(drop) {
    if (!drop) return;
    [
        'position', 'top', 'left', 'right', 'z-index',
        'max-height', 'max-width', 'overflow-y', 'overflow', 'min-width'
    ].forEach((prop) => drop.style.removeProperty(prop));
}

function closeAllProfileDropdowns(except = null) {
    document.querySelectorAll('.dropdown-profile.show').forEach((el) => {
        if (el !== except) {
            el.classList.remove('show');
            clearProfileDropdownInline(el);
        }
    });
    if (!except || !except.classList.contains('show')) {
        window.__dokeProfileDropdownState = null;
    }
}

function positionProfileDropdown(drop, anchor) {
    if (!drop || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const margin = 10;

    // Garante medida real antes de posicionar.
    const width = Math.max(220, Math.round(drop.offsetWidth || 240));
    let left = Math.round(rect.right - width);
    if (left < margin) left = margin;
    if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - margin - width);
    }

    const top = Math.round(rect.bottom + 10);
    const available = Math.max(180, window.innerHeight - top - margin);

    drop.style.position = 'fixed';
    drop.style.top = `${top}px`;
    drop.style.left = `${left}px`;
    drop.style.right = 'auto';
    drop.style.zIndex = '2147483646';
    drop.style.minWidth = `${width}px`;
    drop.style.maxWidth = `calc(100vw - ${margin * 2}px)`;
    drop.style.maxHeight = `${available}px`;
    drop.style.overflowY = 'auto';
}

function syncOpenProfileDropdown() {
    const state = window.__dokeProfileDropdownState;
    if (!state?.drop || !state?.anchor) return;
    if (!state.drop.classList.contains('show')) return;
    positionProfileDropdown(state.drop, state.anchor);
}

if (!window.__dokeProfileDropdownViewportBound) {
    window.__dokeProfileDropdownViewportBound = true;
    window.addEventListener('resize', syncOpenProfileDropdown, { passive: true });
    window.addEventListener('scroll', syncOpenProfileDropdown, true);
}

window.toggleDropdown = function(event) {
    if (event) event.stopPropagation();
    const target = event?.currentTarget || event?.target;
    const container = target ? target.closest('.profile-container') : null;
    const drop = (container && container.querySelector('.dropdown-profile')) || document.getElementById('dropdownPerfil');
    if (!drop) return;

    const anchor = (container && container.querySelector('.profile-img-btn')) || target;
    const willOpen = !drop.classList.contains('show');

    closeAllProfileDropdowns(drop);

    if (!willOpen) {
        drop.classList.remove('show');
        clearProfileDropdownInline(drop);
        window.__dokeProfileDropdownState = null;
        return;
    }

    drop.classList.add('show');
    window.__dokeProfileDropdownState = { drop, anchor };
    positionProfileDropdown(drop, anchor);
}

function sanitizePlainText(value) {
    return String(value ?? "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function ensureDokeLoadingOverlay() {
    let overlay = document.getElementById('dokeLoadingOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'dokeLoadingOverlay';
    overlay.className = 'doke-loading-overlay';
    overlay.innerHTML = `
        <div class="doke-loading-card">
            <div class="doke-loader" aria-hidden="true"></div>
            <div class="doke-loading-texts">
                <div class="doke-loading-title">Carregando...</div>
                <div class="doke-loading-sub">Aguarde um instante</div>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    return overlay;
}

window.dokeShowLoading = function(opts = {}) {
    const overlay = ensureDokeLoadingOverlay();
    const title = overlay.querySelector('.doke-loading-title');
    const sub = overlay.querySelector('.doke-loading-sub');
    if (title) title.textContent = opts.title || 'Carregando...';
    if (sub) sub.textContent = opts.subtitle || 'Aguarde um instante';
    overlay.classList.add('show');
};

window.dokeHideLoading = function() {
    const overlay = document.getElementById('dokeLoadingOverlay');
    if (overlay) overlay.classList.remove('show');
};

if (!window.__dokeDropdownBound) {
    window.__dokeDropdownBound = true;
    document.addEventListener('click', () => {
        closeAllProfileDropdowns();
    });
}

window.irParaMeuPerfil = function(event) {
    const go = async () => {
        let sessionUser = null;
        try {
            if (window.sb?.auth?.getSession) {
                const { data, error } = await window.sb.auth.getSession();
                if (!error) sessionUser = data?.session?.user || null;
            }
        } catch (_) {}

        if (!sessionUser) {
            try {
                [
                    'usuarioLogado',
                    'usuario_logado',
                    'userLogado',
                    'doke_usuario_logado',
                    'doke_usuario_perfil',
                    'perfil_usuario'
                ].forEach((k) => localStorage.removeItem(k));
            } catch (_) {}
            window.location.href = "login.html";
            return;
        }

        let perfilLocal = null;
        try { perfilLocal = JSON.parse(localStorage.getItem('doke_usuario_perfil') || 'null'); } catch (_) { perfilLocal = null; }
        if (perfilLocal?.isProfissional === true) window.location.href = "meuperfil.html";
        else window.location.href = "perfil-usuario.html";
    };
    if(event) event.preventDefault();
    go();
}

window.filtrarPorCategoria = function(categoria) {
    const input = document.getElementById('inputBusca');
    if(input) {
        input.value = categoria;
        const btn = document.querySelector('.btn-procurar');
        if(btn) btn.click();
    }
}

function formatarCepInput(e) {
    let valor = e.target.value.replace(/\D/g, ""); 
    if (valor.length > 5) valor = valor.substring(0, 5) + "-" + valor.substring(5, 8);
    e.target.value = valor;
}

window.buscarEnderecoPorCep = async function(cepLimpo) {
    const cep = String(cepLimpo || '').replace(/\D/g, '');
    if (cep.length !== 8) return null;
    try {
        const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { method: 'GET', cache: 'no-store' });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!data || data.erro) return null;
        return {
            cep: `${cep.substring(0, 5)}-${cep.substring(5, 8)}`,
            cidade: (data.localidade || '').trim(),
            bairro: (data.bairro || '').trim(),
            uf: (data.uf || '').trim()
        };
    } catch (_e) {
        return null;
    }
}

window.salvarCep = async function() {
    const i = document.getElementById('inputCep');
    if(!i) return;
    const cepLimpo = i.value.replace(/\D/g, ''); 
    if(cepLimpo.length === 8) {
        const cepFormatado = cepLimpo.substring(0, 5) + "-" + cepLimpo.substring(5, 8);
        localStorage.setItem('meu_cep_doke', cepFormatado);
        window.preencherTodosCeps(cepFormatado);
        window.atualizarTelaCep(cepFormatado);
        const boxCep = document.getElementById('boxCep');
        if (boxCep) boxCep.style.display = 'none';

        const payload = await window.buscarEnderecoPorCep(cepLimpo);
        if (payload) {
            localStorage.setItem('doke_localizacao', JSON.stringify(payload));
            window.atualizarTelaCep(payload);
        } else {
            // Mantém consistência mesmo sem retorno da API de CEP.
            try { localStorage.setItem('doke_localizacao', JSON.stringify({ cep: cepFormatado, cidade: '', bairro: '', uf: '' })); } catch (_e) {}
        }
    } else { alert("CEP inválido! Digite 8 números."); i.focus(); }
}
window.preencherTodosCeps = function(cep) {
    if (!cep) return;
    // Preencher todos os inputs com ID 'inputCep' na página
    const todosInputsCep = document.querySelectorAll('input[id="inputCep"]');
    todosInputsCep.forEach(input => {
        input.value = cep;
    });
    // Preencher também inputs com outros IDs de CEP comuns
    const outrosIds = ['cepOrcamento', 'cepEndereco', 'cepBusca'];
    outrosIds.forEach(id => {
        const input = document.getElementById(id);
        if (input && input.type === 'text') {
            input.value = cep;
        }
    });
}
window.atualizarTelaCep = function(payload) {
    const s = document.getElementById('textoCepSpan');
    const i = document.getElementById('inputCep');

    // payload can be string CEP or object { cep, cidade, bairro, uf }
    let cep = '';
    let cidade = '';
    let bairro = '';
    let uf = '';
    try {
        if (typeof payload === 'object' && payload) {
            cep = payload.cep || '';
            cidade = payload.cidade || '';
            bairro = payload.bairro || '';
            uf = payload.uf || '';
            localStorage.setItem('doke_localizacao', JSON.stringify({ cep, cidade, bairro, uf }));
        } else {
            cep = payload || '';
            const saved = JSON.parse(localStorage.getItem('doke_localizacao') || 'null');
            if (saved) {
                cidade = saved.cidade || '';
                bairro = saved.bairro || '';
                uf = saved.uf || '';
                if (!cep) cep = saved.cep || '';
            }
        }
    } catch (_) {}

    if (s) {
        let txt = 'Inserir CEP';
        if (bairro && cidade) txt = `${bairro}, ${cidade}`;
        else if (cidade && uf) txt = `${cidade} - ${uf}`;
        else if (cidade) txt = cidade;
        else if (cep) txt = `CEP: ${cep}`;
        s.innerText = txt;
        s.style.fontWeight = '700';
        s.style.color = 'var(--cor0)';
    }
    if (i) i.value = cep || '';
}
window.toggleCep = function(e) {
    if(e) e.preventDefault(); 
    const p = document.getElementById('boxCep');
    const i = document.getElementById('inputCep');
    if (p.style.display === 'block') { p.style.display = 'none'; } else { p.style.display = 'block'; if(i) i.focus(); }
}
window.abrirMenuMobile = function() {
    const menu = document.querySelector('.sidebar-icones');
    if (menu) menu.classList.add('menu-aberto');
    document.body.classList.add('menu-ativo');
    const overlay = document.getElementById('overlay-menu');
    if(overlay) overlay.style.display = 'block';
}
window.fecharMenuMobile = function() {
    const menu = document.querySelector('.sidebar-icones');
    if (menu) menu.classList.remove('menu-aberto');
    document.body.classList.remove('menu-ativo');
    const overlay = document.getElementById('overlay-menu');
    if(overlay) overlay.style.display = 'none';
}
window.abrirPopup = function() { const p = document.getElementById("popup"); if(p) p.style.display = "block"; }
window.fecharPopup = function() { const p = document.getElementById("popup"); if(p) p.style.display = "none"; }

window.toggleFiltrosExtras = function() {
    const area = document.getElementById("filtrosExtras");
    const btn = document.querySelector(".btn-toggle-filtros");
    if(!area || !btn) return;
    btn.setAttribute('aria-controls', 'filtrosExtras');
    if (area.classList.contains("aberto")) {
        area.classList.remove("aberto");
        btn.style.background = "transparent"; btn.style.color = "var(--cor0)";
        btn.setAttribute('aria-expanded', 'false');
    } else {
        area.classList.add("aberto");
        btn.style.background = "var(--cor0)"; btn.style.color = "white";
        btn.setAttribute('aria-expanded', 'true');
    }
}

// Garante estado inicial (filtros avançados fechados) em F5 / carregamento
document.addEventListener('DOMContentLoaded', () => {
  const area = document.getElementById('filtrosExtras');
  const btn = document.querySelector('.btn-toggle-filtros');
  if(!area || !btn) return;
  area.classList.remove('aberto');
  btn.setAttribute('aria-controls', 'filtrosExtras');
  btn.setAttribute('aria-expanded', 'false');
  btn.style.background = 'transparent';
  btn.style.color = 'var(--cor0)';
});
window.__dokeChipFiltro = window.__dokeChipFiltro || 'todos';
window.ativarChip = function(el) {
    if (!el) return;
    const wrap = el.parentElement;
    if (wrap) wrap.querySelectorAll('.chip-tag').forEach(c => c.classList.remove('ativo'));
    el.classList.add('ativo');
    const chip = el.getAttribute('data-chip') || 'todos';
    window.__dokeChipFiltro = chip;
    if (document.getElementById('filtroOrdenacao')) {
        if (window.aplicarFiltrosBusca) window.aplicarFiltrosBusca();
    } else {
        if (window.dokeApplyHomeFilters) window.dokeApplyHomeFilters();
    }
}

window.scrollChips = function(btn) {
    if (!btn) return;
    const wrapper = btn.closest('.filtros-rapidos');
    const container = wrapper?.querySelector('[data-chips]') || btn.parentElement?.nextElementSibling;
    if (!container) return;
    const amount = Math.max(160, Math.floor(container.clientWidth * 0.7));
    container.scrollBy({ left: amount, behavior: 'smooth' });
}

function salvarBusca(termo) {
    let h = JSON.parse(localStorage.getItem('doke_historico_busca') || '[]');
    h = h.filter(i => i.toLowerCase() !== termo.toLowerCase());
    h.unshift(termo);
    h = h.slice(0, 12);
    localStorage.setItem('doke_historico_busca', JSON.stringify(h));
    atualizarListaHistorico();
}
window.salvarBusca = salvarBusca;

function atualizarListaHistorico() {
    const l = document.getElementById('listaRecentes');
    const c = document.getElementById('containerHistorico');
    if(!c || !l) return;
    const h = JSON.parse(localStorage.getItem('doke_historico_busca') || '[]');
    if (h.length === 0) { c.style.display = 'none'; return; }
    c.style.display = 'block'; l.innerHTML = '';
    h.forEach(t => {
        const d = document.createElement('div');
        d.className = 'recent-item'; d.innerHTML = `<i class='bx bx-time-five history-icon'></i><span class='recent-text'>${t}</span>`;
        d.onclick = () => { 
            const inp = document.getElementById('inputBusca');
            if(inp) { inp.value = t; salvarBusca(t); window.location.href = `busca.html?q=${encodeURIComponent(t)}`; }
        };
        l.appendChild(d);
    });
}
window.atualizarListaHistorico = atualizarListaHistorico;
window.limparHistorico = function(e) {
    if(e) e.stopPropagation();
    localStorage.removeItem('doke_historico_busca');
    atualizarListaHistorico();
};

function initHomeEnhancements() {
    if (!document.body || document.body.dataset.page !== "home") return;

    const revealEls = Array.from(document.querySelectorAll(
        '.secao-busca, .categorias-container, .videos-container, .fotos-container, .anuncio-container, .rodape-container, .rodape-container2'
    ));
    const isMobileHome = window.matchMedia("(max-width: 1024px)").matches;
    if (isMobileHome) {
        // No mobile, priorizamos estabilidade: evita telas "vazias" por animação/reflow.
        const stableEls = Array.from(document.querySelectorAll(
            '.secao-busca, .categorias-container, .videos-container, .fotos-container, .anuncio-container, .pros-section, .para-voce-section'
        ));
        stableEls.forEach(el => {
            try {
                el.classList.remove('reveal', 'is-visible');
                if (window.getComputedStyle(el).display === 'none') el.style.display = 'block';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
                el.style.transform = 'none';
                el.style.contentVisibility = 'visible';
                el.style.containIntrinsicSize = 'auto';
            } catch (_) {}
        });
        const footer = document.querySelector('footer.main-footer');
        if (footer) {
            footer.style.marginLeft = '0';
            footer.style.width = '100%';
        }
    } else {
        // Ativa animação "reveal" só quando o JS estiver rodando (desktop/tablet grande)
        document.body.classList.add("reveal-enabled");
        revealEls.forEach(el => el.classList.add('reveal'));

        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        io.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12 });
            revealEls.forEach(el => io.observe(el));
        } else {
            revealEls.forEach(el => el.classList.add('is-visible'));
        }

        setTimeout(() => {
            try {
                revealEls.forEach(el => el.classList.add('is-visible'));
            } catch (e) {}
        }, 900);
    }

    const scrollers = [
        document.getElementById('galeria-dinamica'),
        document.querySelector('.stories-scroll')
    ].filter(Boolean);

    scrollers.forEach(enableDragScroll);

    scrollers.forEach(el => {
        el.addEventListener('wheel', (ev) => {
            if (el.id === 'galeria-dinamica') return;
            if (!ev.shiftKey) return;
            const delta = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
            el.scrollLeft += delta;
            ev.preventDefault();
        }, { passive: false });
    });

    const reelsScroller = document.getElementById('galeria-dinamica');
    if (reelsScroller && reelsScroller.dataset.wheelFix !== "true") {
        reelsScroller.dataset.wheelFix = "true";
        reelsScroller.addEventListener('wheel', (ev) => {
            const absX = Math.abs(ev.deltaX);
            const absY = Math.abs(ev.deltaY);

            if (ev.shiftKey || absX > absY) {
                const delta = absX > absY ? ev.deltaX : ev.deltaY;
                reelsScroller.scrollLeft += delta;
                ev.preventDefault();
            }
        }, { passive: false });
    }

    function enableDragScroll(container) {
        const isCategorias = container?.id === 'listaCategorias' || container?.id === 'categoriesCarousel';
        const isFiltrosRapidos = container?.classList?.contains('filtros-chips-scroll');
        if (isCategorias || isFiltrosRapidos) return;

        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchScrollLeft = 0;
        let touchMode = null; // 'x' | 'y' | null

        container.style.cursor = 'grab';
        container.style.touchAction = 'pan-y';

        container.addEventListener('mousedown', (e) => {
            isDown = true;
            container.classList.add('is-dragging');
            container.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        });

        window.addEventListener('mouseup', () => {
            isDown = false;
            container.classList.remove('is-dragging');
            container.style.cursor = 'grab';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 1.2;
            container.scrollLeft = scrollLeft - walk;
        });

        container.addEventListener('touchstart', (e) => {
            const t = e.touches && e.touches[0];
            if (!t) return;
            touchStartX = t.clientX;
            touchStartY = t.clientY;
            touchScrollLeft = container.scrollLeft;
            touchMode = null;
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            const t = e.touches && e.touches[0];
            if (!t) return;
            const dx = t.clientX - touchStartX;
            const dy = t.clientY - touchStartY;

            if (touchMode === null) {
                const ax = Math.abs(dx);
                const ay = Math.abs(dy);
                if (ax < 8 && ay < 8) return;
                touchMode = ax > ay ? 'x' : 'y';
            }

            if (touchMode !== 'x') return;
            container.scrollLeft = touchScrollLeft - (dx * 1.15);
        }, { passive: true });

        container.addEventListener('touchend', () => {
            touchMode = null;
        }, { passive: true });
    }
}

window.onclick = function(e) {
    if (!e.target.matches('.profile-img-btn') && !e.target.matches('img')) {
        closeAllProfileDropdowns();
    }
    const p = document.getElementById('boxCep');
    const w = document.querySelector('.cep-wrapper');
    if (p && w && !w.contains(e.target)) p.style.display = 'none';
}

window.registrarVisualizacao = async function(idAnuncio, idDonoAnuncio) {
    if (!idAnuncio) return;

    const user = auth.currentUser;
    
    // TRAVA 1: O dono não gera visualização no próprio anúncio
    if (user && idDonoAnuncio && user.uid === idDonoAnuncio) {
        console.log("Dono visualizando o próprio anúncio (View ignorada).");
        return; 
    }

    // TRAVA 2: Verifica se já visualizou nesta sessão (Anti-F5)
    const chaveStorage = `view_anuncio_${idAnuncio}`;
    if (sessionStorage.getItem(chaveStorage)) {
        console.log("Visualização já contabilizada nesta sessão.");
        return;
    }

    try {
        const anuncioRef = doc(window.db, "anuncios", idAnuncio);
        await updateDoc(anuncioRef, { 
            views: increment(1) 
        });
        
        // Marca que já viu para não contar de novo até fechar o navegador
        sessionStorage.setItem(chaveStorage, "true");
        console.log("View contabilizada +1");

    } catch (error) { 
        console.error("Erro ao registrar view:", error); 
    }
}

// 2. REGISTRAR CLIQUE NO PERFIL (Novo)
window.registrarCliquePerfil = async function(uidDestino) {
    if (!uidDestino) return;

    const user = auth.currentUser;

    // TRAVA 1: Não conta clique no próprio perfil
    if (user && user.uid === uidDestino) return;

    // TRAVA 2: Anti-spam de sessão para cliques no perfil
    const chaveStorage = `click_profile_${uidDestino}`;
    if (sessionStorage.getItem(chaveStorage)) return;

    try {
        // Redireciona o usuário imediatamente para não travar a navegação
        // A contagem acontece em segundo plano
        const userRef = doc(window.db, "usuarios", uidDestino);
        
        // Atualiza estatística no documento do usuário (campo: stats.cliques_perfil)
        // Usamos notação de ponto "stats.cliques_perfil" para atualizar campo aninhado
        await updateDoc(userRef, { 
            "stats.cliques_perfil": increment(1) 
        });

        sessionStorage.setItem(chaveStorage, "true");

    } catch (error) {
        // Se o campo stats não existir, o update pode falhar. 
        // Nesse caso, usamos setDoc com merge para criar.
        try {
            const userRef = doc(window.db, "usuarios", uidDestino);
            await setDoc(userRef, { stats: { cliques_perfil: 1 } }, { merge: true });
        } catch(e) { console.error(e); }
    }
}

// 3. FUNÇÃO AUXILIAR PARA REDIRECIONAR E CONTAR (Use isso nos botões)
window.irParaPerfilComContagem = function(uid) {
    registrarCliquePerfil(uid); // Dispara contagem
    window.location.href = `perfil-profissional.html?uid=${uid}`; // Vai para a página
}

// Delegação: clicar em @user abre perfil correto
if (!window.__dokeUserLinkBound) {
    window.__dokeUserLinkBound = true;
    document.addEventListener('click', (e) => {
        const el = e.target && e.target.closest ? e.target.closest('.js-user-link') : null;
        if (!el) return;
        const uid = el.getAttribute('data-uid') || '';
        const user = el.getAttribute('data-user') || '';
        if (!uid && !user) return;
        e.preventDefault();
        e.stopPropagation();
        if (uid) {
            if (typeof window.irParaPerfilComContagem === 'function') {
                window.irParaPerfilComContagem(uid);
            } else {
                window.location.href = `perfil-profissional.html?uid=${encodeURIComponent(uid)}`;
            }
            return;
        }
        const clean = String(user || '').replace(/^@/, '');
        if (!clean) return;
        window.location.href = `perfil-profissional.html?user=${encodeURIComponent(clean)}`;
    });
}

window.mostrarToast = function(mensagem, tipo = 'sucesso') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    let icone = '';
    if (tipo === 'sucesso') icone = "<i class='bx bxs-check-circle'></i>";
    else if (tipo === 'erro') icone = "<i class='bx bxs-error-circle'></i>";
    else icone = "<i class='bx bxs-info-circle'></i>";

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `${icone} <span>${mensagem}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// ============================================================
// 10. FUNÇÕES DE LOGIN (AUXILIARES)
// ============================================================
window.realizarLogin = async function(e) {
    if(e) e.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const btn = e.target.querySelector('button');
    if(btn) { btn.innerText = "Entrando..."; btn.disabled = true; }

    try {
        const userCredential = await signInWithEmailAndPassword(window.auth, email, senha);
        const user = userCredential.user;
        const docRef = doc(window.db, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);
        let dadosUsuario = docSnap.exists() ? docSnap.data() : { nome: "Usuário", email: email };

        localStorage.setItem('usuarioLogado', 'true');
        localStorage.setItem('doke_usuario_perfil', JSON.stringify(dadosUsuario));
        localStorage.setItem('doke_uid', user.uid);

        if(window.mostrarToast) window.mostrarToast("Login realizado!", "sucesso");
        setTimeout(() => { window.location.href = "index.html"; }, 1000);
    } catch (error) {
        console.error("Erro Auth:", error);
        if(window.mostrarToast) window.mostrarToast("Erro ao entrar. Verifique seus dados.", "erro");
        if(btn) { btn.innerText = "Entrar na Conta"; btn.disabled = false; }
    }
}

// ============================================================
// 11. FUNÇÃO PARA CARREGAR FILTROS DE LOCALIZAÇÃO
// ============================================================
window.carregarFiltrosLocalizacao = async function() {
    const selEstado = document.getElementById('selectEstado');
    const selCidade = document.getElementById('selectCidade');
    const selBairro = document.getElementById('selectBairro');

    if (!selEstado || !selCidade || !selBairro) return;

    try {
        const q = query(collection(window.db, "anuncios"));
        const snapshot = await getDocs(q);
        const locaisMap = {}; 

        snapshot.forEach(doc => {
            const data = doc.data();
            const uf = data.uf || "Outros";
            const cidade = data.cidade || "Indefinido";
            const bairro = data.bairro || "Geral";

            if (!locaisMap[uf]) locaisMap[uf] = {};
            if (!locaisMap[uf][cidade]) locaisMap[uf][cidade] = new Set();
            locaisMap[uf][cidade].add(bairro);
        });

        selEstado.innerHTML = '<option value="" disabled selected>Selecionar UF</option>';
        Object.keys(locaisMap).sort().forEach(uf => {
            selEstado.innerHTML += `<option value="${uf}">${uf}</option>`;
        });

        selEstado.onchange = function() {
            const ufSel = this.value;
            selCidade.innerHTML = '<option value="" disabled selected>Cidade</option>';
            selBairro.innerHTML = '<option value="" disabled selected>Bairro</option>';
            selCidade.disabled = false;
            selBairro.disabled = true;
            try { localStorage.setItem('doke_loc_uf', ufSel || ''); } catch (e) {}

            if (locaisMap[ufSel]) {
                Object.keys(locaisMap[ufSel]).sort().forEach(cidade => {
                    selCidade.innerHTML += `<option value="${cidade}">${cidade}</option>`;
                });
            }
            filtrarAnunciosPorLocal(ufSel, '', '');
        };

        selCidade.onchange = function() {
            const ufSel = selEstado.value;
            const cidSel = this.value;
            selBairro.innerHTML = '<option value="" disabled selected>Bairro</option>';
            selBairro.disabled = false;
            try {
                localStorage.setItem('doke_loc_uf', ufSel || '');
                localStorage.setItem('doke_loc_cidade', cidSel || '');
            } catch (e) {}

            if (locaisMap[ufSel] && locaisMap[ufSel][cidSel]) {
                const bairros = Array.from(locaisMap[ufSel][cidSel]).sort();
                bairros.forEach(bairro => {
                    selBairro.innerHTML += `<option value="${bairro}">${bairro}</option>`;
                });
            }
            filtrarAnunciosPorLocal(ufSel, cidSel, null);
        };

        selBairro.onchange = function() {
            try { localStorage.setItem('doke_loc_bairro', this.value || ''); } catch (e) {}
            filtrarAnunciosPorLocal(selEstado.value, selCidade.value, this.value);
        };

    } catch (e) { console.error("Erro ao carregar filtros de local:", e); }
}

window.filtrarAnunciosPorLocal = function(uf, cidade, bairro) {
    window.__dokeFiltroLocal = { uf, cidade, bairro };
    if (document.getElementById('filtroOrdenacao')) {
        if (window.aplicarFiltrosBusca) window.aplicarFiltrosBusca();
    } else {
        if (window.dokeApplyHomeFilters) window.dokeApplyHomeFilters();
    }
}

// ============================================================
// 12. FEED GLOBAL (Para Index.html)
// ============================================================
function getSupabaseClient() {
    return window.sb || window.supabaseClient || window.sbClient || window.supabase || null;
}

if (window._dokePublicacoesJoinStatus === undefined) {
    window._dokePublicacoesJoinStatus = null;
}
if (window._dokePublicacoesSocialStatus === undefined) {
    window._dokePublicacoesSocialStatus = null;
}
if (window._dokePublicacoesColStatus === undefined) {
    window._dokePublicacoesColStatus = {
        titulo: null,
        descricao: null,
        legenda: null,
        thumb_url: null
    };
}

function isMissingTableError(err) {
    if (!err) return false;
    const msg = (err.message || "") + " " + (err.hint || "") + " " + (err.details || "");
    return err.code === "PGRST205" || err.status === 404 || /could not find the table/i.test(msg) || /not found/i.test(msg);
}

function isMissingColumnError(err) {
    if (!err) return false;
    const msg = (err.message || "") + " " + (err.hint || "") + " " + (err.details || "");
    return err.code === "PGRST204" || /could not find the .* column/i.test(msg) || /column .* does not exist/i.test(msg);
}

function isSchemaCacheError(err) {
    return isMissingTableError(err) || isMissingColumnError(err);
}

function markPublicacoesSelectError(err) {
    if (!err) return;
    const msg = ((err.message || "") + " " + (err.hint || "") + " " + (err.details || "")).toLowerCase();
    if (msg.includes("publicacoes_curtidas") || msg.includes("publicacoes_comentarios")) {
        window._dokePublicacoesSocialStatus = false;
    }
    if (msg.includes("usuarios") || msg.includes("relationship") || msg.includes("foreign key")) {
        window._dokePublicacoesJoinStatus = false;
    }
    const cacheMatch = msg.match(/'([^']+)'/);
    if (cacheMatch && cacheMatch[1]) {
        const col = cacheMatch[1].trim();
        if (window._dokePublicacoesColStatus[col] !== undefined) {
            window._dokePublicacoesColStatus[col] = false;
        }
    }
    const colMatch = msg.match(/publicacoes\.([a-z0-9_]+)/);
    if (colMatch && colMatch[1]) {
        const col = colMatch[1].trim();
        if (window._dokePublicacoesColStatus[col] !== undefined) {
            window._dokePublicacoesColStatus[col] = false;
        }
    }
}

function buildPublicacoesSelect({ withJoin, withSocial }) {
    const cols = ["id", "tipo", "media_url", "created_at", "user_id"];
    const optional = window._dokePublicacoesColStatus || {};
    Object.keys(optional).forEach((col) => {
        if (optional[col] !== false) cols.push(col);
    });
    const base = cols.join(", ");
    const join = withJoin ? ", usuarios (id, uid, nome, user, foto)" : "";
    const social = withSocial ? ", publicacoes_curtidas(count), publicacoes_comentarios(count)" : "";
    return `${base}${join}${social}`;
}

function publicacoesStatusKey() {
    return JSON.stringify({
        join: window._dokePublicacoesJoinStatus,
        social: window._dokePublicacoesSocialStatus,
        cols: window._dokePublicacoesColStatus
    });
}

function escapeHtml(texto) {
    return (texto ?? "").toString()
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizeHandle(valor) {
    if (!valor) return "@usuario";
    const handle = valor.toString().trim();
    return handle.startsWith("@") ? handle : `@${handle}`;
}

function formatFeedDate(data) {
    const d = new Date(data);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
}

function formatFeedDateShort(data) {
    const d = new Date(data);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString('pt-BR');
}

async function getSupabaseUserRow() {
    const client = getSupabaseClient();
    const authUser = auth?.currentUser;
    if (!client || !authUser?.uid) return null;
    if (window._dokeSupabaseUserRow && window._dokeSupabaseUserRow.uid === authUser.uid) {
        return window._dokeSupabaseUserRow;
    }
    const { data, error } = await client
        .from("usuarios")
        .select("id, uid, nome, user, foto")
        .eq("uid", authUser.uid)
        .maybeSingle();
    if (error) {
        console.error("Erro ao carregar usuario supabase:", error);
        return null;
    }
    window._dokeSupabaseUserRow = data || null;
    return window._dokeSupabaseUserRow;
}

async function attachSupabaseUsersById(items) {
    const client = getSupabaseClient();
    if (!client || !Array.isArray(items) || items.length === 0) return items;

    const missing = Array.from(new Set(items.map((item) => item?.user_id).filter(Boolean)));
    if (!missing.length) return items;

    const { data, error } = await client
        .from("usuarios")
        .select("id, uid, nome, user, foto")
        .in("id", missing);

    if (error || !Array.isArray(data)) {
        if (error && !isMissingTableError(error)) console.error("Erro ao carregar usuarios:", error);
        return items;
    }

    const map = new Map(data.map((row) => [row.id, row]));
    return items.map((item) => {
        if (!item || item.usuarios) return item;
        const usuario = map.get(item.user_id);
        return usuario ? { ...item, usuarios: usuario } : item;
    });
}

async function fetchSupabasePublicacoesFeed() {
    const client = getSupabaseClient();
    if (!client) return [];
    let lastError = null;
    let attempts = 0;
    let lastStatusKey = null;
    while (attempts < 6) {
        const joinAllowed = window._dokePublicacoesJoinStatus !== false;
        const socialAllowed = window._dokePublicacoesSocialStatus !== false;
        const combos = [];
        if (joinAllowed && socialAllowed) combos.push({ withJoin: true, withSocial: true });
        if (joinAllowed) combos.push({ withJoin: true, withSocial: false });
        if (socialAllowed) combos.push({ withJoin: false, withSocial: true });
        combos.push({ withJoin: false, withSocial: false });

        let statusChanged = false;
        for (const combo of combos) {
            const select = buildPublicacoesSelect(combo);
            const { data, error } = await client
                .from("publicacoes")
                .select(select)
                .order("created_at", { ascending: false })
                .limit(40);
            if (!error) {
                if (select.includes("usuarios")) window._dokePublicacoesJoinStatus = true;
                if (select.includes("publicacoes_curtidas")) window._dokePublicacoesSocialStatus = true;
                return data || [];
            }
            lastError = error;
            const beforeKey = publicacoesStatusKey();
            markPublicacoesSelectError(error);
            statusChanged = publicacoesStatusKey() !== beforeKey;
            if (statusChanged) break;
        }

        const currentKey = publicacoesStatusKey();
        if (!statusChanged && currentKey === lastStatusKey) break;
        lastStatusKey = currentKey;
        attempts += 1;
    }
    if (lastError) console.error("Erro ao carregar publicacoes supabase:", lastError);
    return [];
}

window.carregarFeedGlobal = async function() {
    const container = document.getElementById('feed-global-container');
    if (!container) return;

    if (typeof window.dokeRenderPublicacoesSkeleton === 'function') {
        window.dokeRenderPublicacoesSkeleton(container);
    } else {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#777;"><i class='bx bx-loader-alt bx-spin' style="font-size:2rem;"></i></div>`;
    }

    const feedItems = [];

    try {
        const q = window.query(window.collection(window.db, "posts"), window.orderBy("data", "desc"));
        const snapshot = await window.getDocs(q);
        snapshot.forEach((docSnap) => {
            const post = docSnap.data();
            feedItems.push({
                source: "firebase",
                id: docSnap.id,
                createdAt: post.data,
                data: post
            });
        });
    } catch (e) {
        console.error(e);
    }

    let supaUserRow = null;
    try {
        supaUserRow = await getSupabaseUserRow();
    } catch (e) {
        console.error(e);
    }

    try {
        const publicacoes = await fetchSupabasePublicacoesFeed();
        publicacoes.forEach((item) => {
            feedItems.push({
                source: "supabase",
                id: item.id,
                createdAt: item.created_at,
                data: item
            });
        });
    } catch (e) {
        console.error(e);
    }

    feedItems.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return (bTime || 0) - (aTime || 0);
    });

    container.innerHTML = "";

    if (feedItems.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding:20px;'>Nenhuma publicação ainda.</p>";
        container.setAttribute('aria-busy', 'false');
        return;
    }

    feedItems.forEach((entry) => {
        if (entry.source === "firebase") {
            const post = entry.data;
            const idPost = entry.id;
            const dataPost = formatFeedDateShort(post.data);
            const imgHtml = post.imagem 
                ? `<div class="midia-post" style="cursor:pointer;" onclick="abrirModalPost('${idPost}', 'posts')">
                     <img src="${post.imagem}" loading="lazy" style="width:100%; height:auto; display:block;">
                   </div>` 
                : '';

            const uidDestino = post.uid || ""; 
            const linkPerfil = `onclick="event.stopPropagation(); window.location.href='perfil-profissional.html?uid=${uidDestino}'"`;
            const cursorStyle = `style="cursor: pointer;"`;

            const html = `
                <div class="card-feed-global">
                <div class="feed-header">
                    <img src="${post.autorFoto || 'https://placehold.co/50'}" alt="User" width="40" height="40" loading="lazy" decoding="async" class="js-user-link" data-uid="${uidDestino}" ${linkPerfil} ${cursorStyle}>
                        <div class="feed-user-info">
                            <h4 class="js-user-link" data-uid="${uidDestino}" ${linkPerfil} ${cursorStyle}>${post.autorUser || post.autorNome}</h4>
                            <span>${dataPost}</span>
                        </div>
                    </div>
                    <div class="feed-body" onclick="abrirModalPost('${idPost}', 'posts')" style="cursor:pointer;">
                        <p>${escapeHtml(post.texto || '')}</p>
                    </div>
                    ${imgHtml}
                    <div class="feed-footer">
                        <div class="feed-action" onclick="abrirModalPost('${idPost}', 'posts')">
                            <i class='bx bx-heart'></i> ${post.likes || 0}
                        </div>
                        <div class="feed-action" onclick="abrirModalPost('${idPost}', 'posts')">
                            <i class='bx bx-comment'></i> Comentar
                        </div>
                        <div class="feed-action" onclick="compartilharUrlPost('${idPost}')">
                            <i class='bx bx-share-alt'></i> Compartilhar
                        </div>
                    </div>
                </div>`;
            container.insertAdjacentHTML('beforeend', html);
            return;
        }

        const item = entry.data || {};
        const autor = item.usuarios || (supaUserRow && item.user_id === supaUserRow.id ? supaUserRow : {});
        const autorNome = normalizeHandle(autor.user || autor.nome || "usuario");
        const autorUid = autor.uid || "";
        const autorUser = autor.user || autor.nome || "";
        const uidAttr = autorUid ? `data-uid="${autorUid}"` : "";
        const userAttr = !autorUid && autorUser ? `data-user="${autorUser}"` : "";
        const dataPost = formatFeedDateShort(item.created_at);
        const textoResumo = [item.titulo, item.descricao || item.legenda].filter(Boolean).join(" - ");
        const likesCount = (Array.isArray(item.publicacoes_curtidas) ? item.publicacoes_curtidas[0]?.count : item.publicacoes_curtidas?.count) || 0;

        const mediaHtml = item.tipo === "video"
            ? `<div class="midia-post" style="cursor:pointer;" onclick="abrirModalPublicacao('${entry.id}')">
                   <video src="${item.media_url}" poster="${item.thumb_url || ""}" preload="metadata" muted playsinline style="width:100%; height:auto; display:block;"></video>
               </div>`
            : `<div class="midia-post" style="cursor:pointer;" onclick="abrirModalPublicacao('${entry.id}')">
                   <img src="${item.media_url}" loading="lazy" style="width:100%; height:auto; display:block;">
               </div>`;

        const html = `
            <div class="card-feed-global">
                <div class="feed-header">
                    <img src="${autor.foto || 'https://placehold.co/50'}" alt="User" width="40" height="40" loading="lazy" decoding="async" class="js-user-link" ${uidAttr} ${userAttr}>
                    <div class="feed-user-info">
                        <h4 class="js-user-link" ${uidAttr} ${userAttr}>${escapeHtml(autorNome)}</h4>
                        <span>${dataPost}</span>
                    </div>
                </div>
                <div class="feed-body" onclick="abrirModalPublicacao('${entry.id}')" style="cursor:pointer;">
                    <p>${escapeHtml(textoResumo)}</p>
                </div>
                ${mediaHtml}
                <div class="feed-footer">
                    <div class="feed-action" onclick="abrirModalPublicacao('${entry.id}')">
                        <i class='bx bx-heart'></i> ${likesCount}
                    </div>
                    <div class="feed-action" onclick="abrirModalPublicacao('${entry.id}')">
                        <i class='bx bx-comment'></i> Comentar
                    </div>
                    <div class="feed-action" onclick="compartilharUrlPost('${entry.id}')">
                        <i class='bx bx-share-alt'></i> Compartilhar
                    </div>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
    container.setAttribute('aria-busy', 'false');
}

// Funções extras para perfil
window.carregarFeedGlobal = async function() {
    const container = document.getElementById('feed-global-container');
    if (!container) return;

    container.classList.add("feed-publicacoes-grid");
    if (typeof window.dokeRenderPublicacoesSkeleton === 'function') {
        window.dokeRenderPublicacoesSkeleton(container);
    } else {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#777;"><i class='bx bx-loader-alt bx-spin' style="font-size:2rem;"></i></div>`;
    }

    const feedItems = [];

    try {
        const q = window.query(window.collection(window.db, "posts"), window.orderBy("data", "desc"));
        const snapshot = await window.getDocs(q);
        snapshot.forEach((docSnap) => {
            const post = docSnap.data();
            feedItems.push({
                source: "firebase",
                id: docSnap.id,
                createdAt: post.data,
                data: post
            });
        });
    } catch (e) {
        console.error(e);
    }

    let supaUserRow = null;
    try {
        supaUserRow = await getSupabaseUserRow();
    } catch (e) {
        console.error(e);
    }

    try {
        const publicacoes = await fetchSupabasePublicacoesFeed();
        publicacoes.forEach((item) => {
            feedItems.push({
                source: "supabase",
                id: item.id,
                createdAt: item.created_at,
                data: item
            });
        });
    } catch (e) {
        console.error(e);
    }

    feedItems.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return (bTime || 0) - (aTime || 0);
    });

    container.innerHTML = "";

    if (feedItems.length === 0) {
        container.innerHTML = "<div class='dp-empty'>Nenhuma publicacao ainda.</div>";
        container.setAttribute('aria-busy', 'false');
        return;
    }

    feedItems.forEach((entry) => {
        if (entry.source === "firebase") {
            const post = entry.data || {};
            const idPost = entry.id;
            const mediaHtml = post.videoUrl
                ? `<video src="${post.videoUrl}" preload="metadata" muted playsinline></video>`
                : (post.imagem ? `<img src="${post.imagem}" loading="lazy" alt="">` : "");
            if (!mediaHtml) return;

            
            const uidDestino = post.uid || "";
            const autorHandle = normalizeHandle(post.autorUser || post.autorNome || "usuario");
            const autorFoto = post.autorFoto || `https://i.pravatar.cc/80?u=${encodeURIComponent(String(uidDestino||idPost||"u"))}`;
            const when = formatFeedDateShort(post.data || entry.createdAt || "");
            const authorHtml = `
                <div class="dp-itemAuthor">
                <img class="dp-itemAvatar" src="${autorFoto}" alt="" width="34" height="34" loading="lazy" decoding="async">
                <div>
                  <div class="dp-itemUser">${escapeHtml(autorHandle)}</div>
                  ${when ? `<span class="dp-itemMeta">${escapeHtml(when)}</span>` : ``}
                </div>
              </div>
            `;
            // título/descrição: evita duplicar @user
            const rawTitle = (post.titulo && post.titulo !== post.autorUser && post.titulo !== post.autorNome) ? post.titulo : "";
            const rawText = post.texto || post.descricao || "";
            const title = rawTitle || (rawText ? String(rawText).split("\n")[0].slice(0, 80) : "Publicação");
            const desc = rawTitle ? rawText : (rawText && rawText.length > 90 ? rawText : "");


            const html = `
                <div class="feed-publicacao-card dp-item dp-item--clickable" role="button" tabindex="0" onclick="abrirModalPost('${idPost}', 'posts')" onkeydown="if(event.key==='Enter'||event.key===' ') this.click()">
                    <div class="dp-itemMedia">${mediaHtml}</div>
                    <div class="dp-itemBody">
                        ${authorHtml}
                        <b class="dp-itemTitle">${escapeHtml(title)}</b>
                        ${desc ? `<p class="dp-itemDesc">${escapeHtml(desc)}</p>` : ``}
                    </div>
                </div>`;
            container.insertAdjacentHTML('beforeend', html);
            return;
        }
        const item = entry.data || {};
        if (!item.media_url) return;
        const autor = item.usuarios || (supaUserRow && item.user_id === supaUserRow.id ? supaUserRow : {});
        const autorHandle = normalizeHandle(autor.user || autor.nome || "usuario");
        const autorFoto = autor.foto || `https://i.pravatar.cc/80?u=${encodeURIComponent(String(autor.uid||autor.id||item.user_id||entry.id||"u"))}`;
        const when = formatFeedDateShort(item.created_at || item.data || entry.createdAt || "");
        const authorHtml = `
          <div class="dp-itemAuthor">
            <img class="dp-itemAvatar" src="${autorFoto}" alt="" width="34" height="34" loading="lazy" decoding="async">
            <div>
              <div class="dp-itemUser">${escapeHtml(autorHandle)}</div>
              ${when ? `<span class="dp-itemMeta">${escapeHtml(when)}</span>` : ``}
            </div>
          </div>
        `;

        const title = (item.titulo || item.legenda || "Publicação");
        const desc = item.descricao || (item.titulo ? (item.legenda || "") : "") || "";

        const mediaHtml = item.tipo === "video"
            ? `<video src="${item.media_url}"${item.thumb_url ? ` poster="${item.thumb_url}"` : ""} preload="metadata" muted playsinline></video>`
            : (item.tipo === "antes_depois" && item.thumb_url
                ? `<div class="dp-ba js-antes-depois" data-before="${item.media_url}" data-after="${item.thumb_url}"><img src="${item.media_url}" loading="lazy" alt=""><span class="dp-ba-badge">Antes</span></div>`
                : `<img src="${item.media_url}" loading="lazy" alt="">`);

        const html = `
            <div class="feed-publicacao-card dp-item dp-item--clickable" role="button" tabindex="0" onclick="abrirModalPublicacao('${entry.id}')" onkeydown="if(event.key==='Enter'||event.key===' ') this.click()">
                <div class="dp-itemMedia">${mediaHtml}</div>
                <div class="dp-itemBody">
                    ${authorHtml}
                    <b class="dp-itemTitle">${escapeHtml(title)}</b>
                    ${desc ? `<p class="dp-itemDesc">${escapeHtml(desc)}</p>` : ``}
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });

    container.setAttribute('aria-busy', 'false');
    setupFeedVideoPreview(container);
    setupAntesDepois(container);
}

function setupAntesDepois(container){
    if(!container) return;
    // Se o módulo dedicado (doke-beforeafter.js) estiver carregado,
    // delega para ele (mais suave, com controles e sem "piscando" imagens).
    if (window.DokeAntesDepois && typeof window.DokeAntesDepois.refresh === 'function') {
        window.DokeAntesDepois.refresh(container);
        return;
    }

    // Fallback MUITO simples (caso a página não tenha carregado doke-beforeafter.js)
    // - aumenta o tempo para ficar mais confortável
    const els = container.querySelectorAll(".js-antes-depois");
    els.forEach((el)=>{
        if(el.dataset.bound === "1") return;
        el.dataset.bound = "1";
        const before = el.dataset.before;
        const after = el.dataset.after;
        const img = el.querySelector("img");
        const badge = el.querySelector(".dp-ba-badge");
        if(!img || !before || !after) return;
        let state = "before";
        window.setInterval(()=>{
            state = (state === "before") ? "after" : "before";
            img.src = (state === "before") ? before : after;
            if(badge) badge.textContent = (state === "before") ? "Antes" : "Depois";
        }, 8000);
    });
}


function setupFeedVideoPreview(container) {
    if (!container) return;
    const cards = container.querySelectorAll(".feed-publicacao-card");
    cards.forEach((card) => {
        if (card.dataset.previewBound === "true") return;
        card.dataset.previewBound = "true";
        const video = card.querySelector("video");
        if (!video) return;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.controls = false;
        video.controlsList = 'nodownload noplaybackrate noremoteplayback';
        video.disablePictureInPicture = true;
        video.disableRemotePlayback = true;
        video.preload = "metadata";
        let hoverTimer = null;
        const playPreview = () => {
            if (hoverTimer) return;
            hoverTimer = window.setTimeout(() => {
                hoverTimer = null;
                video.currentTime = 0;
                const playPromise = video.play();
                if (playPromise && typeof playPromise.catch === "function") {
                    playPromise.catch(() => {});
                }
            }, 1500);
        };
        const stopPreview = () => {
            if (hoverTimer) {
                window.clearTimeout(hoverTimer);
                hoverTimer = null;
            }
            video.pause();
            video.currentTime = 0;
            if (video.getAttribute("poster")) {
                video.load();
            }
        };
        card.addEventListener("mouseenter", playPreview);
        card.addEventListener("mouseleave", stopPreview);
        card.addEventListener("focusin", playPreview);
        card.addEventListener("focusout", stopPreview);
        card.addEventListener("click", stopPreview);
    });
}

window.carregarPerfil = function() {
    const usuario = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || { nome: "Novo Usuário", user: "@usuario", bio: "Edite seu perfil.", local: "Brasil", foto: "https://placehold.co/150", membroDesde: "2024" };
    if(document.getElementById('nomePerfilDisplay')) document.getElementById('nomePerfilDisplay').innerText = usuario.nome;
    if(document.getElementById('bioPerfilDisplay')) document.getElementById('bioPerfilDisplay').innerText = usuario.bio;
    if(document.getElementById('fotoPerfilDisplay')) document.getElementById('fotoPerfilDisplay').src = usuario.foto;
    if(document.getElementById('locPerfilDisplay')) document.getElementById('locPerfilDisplay').innerHTML = `<i class='bx bx-map'></i> ${usuario.local || "Brasil"}`;
    if(document.getElementById('dataMembroDisplay')) document.getElementById('dataMembroDisplay').innerHTML = `<i class='bx bx-calendar'></i> Membro desde ${usuario.membroDesde || "2024"}`;
}

window.carregarPosts = function(uid) {
    const container = document.getElementById('container-feed-posts');
    if (!container) return;
    const q = query(collection(db, "posts"), where("uid", "==", uid), orderBy("data", "desc"));
    onSnapshot(q, (snapshot) => {
        container.innerHTML = "";
        if (snapshot.empty) { container.innerHTML = `<div class="empty-state"><h4>Sem posts</h4></div>`; return; }
        snapshot.forEach((doc) => {
            const post = doc.data();
            const uidPost = post.uid || "";
            const uidAttr = uidPost ? `data-uid="${uidPost}"` : "";
            const userAttr = (!uidPost && post.autorUser) ? `data-user="${post.autorUser}"` : "";
            const imgHtml = post.imagem ? `<div class="midia-post"><img src="${post.imagem}"></div>` : '';
            const html = `<div class="post-feed-card"><div class="header-post"><div class="user-post"><img src="${post.autorFoto}" class="js-user-link" ${uidAttr} ${userAttr}><div><h4 class="js-user-link" ${uidAttr} ${userAttr}>${post.autorUser}</h4></div></div></div><p class="legenda-post">${post.texto}</p>${imgHtml}</div>`;
            container.innerHTML += html;
        });
    });
}



// ============================================================
// 13. INICIALIZAÇÃO E EVENT LISTENERS
// ============================================================
document.addEventListener("DOMContentLoaded", async function() {
    
    // 1. Proteção e Header
    await window.sincronizarSessaoSupabase();
    protegerPaginasRestritas();
    verificarEstadoLogin();
    
    // 2. CARREGAMENTOS DINÂMICOS
    carregarReelsNoIndex();
    carregarStoriesGlobal();
    carregarCategorias(); 
    carregarProfissionais(); 
    carregarFiltrosLocalizacao(); 

    // NOVO: CARREGA VIDEOS SE ESTIVER NA HOME
    if(document.querySelector('.tiktok-scroll-wrapper') && !document.getElementById('galeria-dinamica')) {
        carregarTrabalhosHome();
    }

    // 3. CEP Input Logic
    const inputCep = document.getElementById('inputCep');
    if (inputCep) {
        inputCep.addEventListener('input', function(e) {
            formatarCepInput(e);
            // Sincronizar com os outros inputs de CEP enquanto digita
            const cepAtual = e.target.value;
            if (cepAtual.length >= 5) {
                window.preencherTodosCeps(cepAtual);
            }
        });
        inputCep.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') window.salvarCep();
        });
    }
    
    if(document.getElementById('galeria-dinamica')) {
        carregarReelsHome();
        enableVideosCurtosPageScroll();
    }

    const cepSalvo = localStorage.getItem('meu_cep_doke');
    if (cepSalvo) {
        window.atualizarTelaCep(cepSalvo);
        window.preencherTodosCeps(cepSalvo);
        try {
            const locSalva = JSON.parse(localStorage.getItem('doke_localizacao') || 'null');
            const semEndereco = !locSalva || (!locSalva.cidade && !locSalva.bairro);
            if (semEndereco) {
                const cepLimpo = String(cepSalvo).replace(/\D/g, '');
                if (cepLimpo.length === 8) {
                    window.buscarEnderecoPorCep(cepLimpo).then((payload) => {
                        if (!payload) return;
                        localStorage.setItem('doke_localizacao', JSON.stringify(payload));
                        window.atualizarTelaCep(payload);
                    }).catch(() => {});
                }
            }
        } catch (_e) {}
    }

    // Adicionar listener a todos os inputs de CEP para sincronizar automaticamente
    document.querySelectorAll('input[id="inputCep"], input[id="cepOrcamento"], input[id="cepEndereco"], input[id="cepBusca"]').forEach(input => {
        // Preencher com o CEP salvo ao carregar
        if (cepSalvo && !input.value) {
            input.value = cepSalvo;
        }
        // Sincronizar quando digitar
        input.addEventListener('input', function(e) {
            const cepDigitado = e.target.value;
            if (cepDigitado.length >= 5) {
                window.preencherTodosCeps(cepDigitado);
            }
        });
    });

    // 4. Lógica de Busca e Anúncios
    const params = new URLSearchParams(window.location.search);
    const termoUrl = params.get('q');
    const inputBusca = document.getElementById('inputBusca');

    if (termoUrl) {
        if(inputBusca) inputBusca.value = termoUrl;
        carregarAnunciosDoFirebase(termoUrl);
    } else {
        if(document.getElementById('feedAnuncios')) {
            carregarAnunciosDoFirebase();
        }
    }

    if(document.getElementById('feed-global-container')) {
        carregarFeedGlobal();
    }

    if(document.getElementById('boxStories')) {
        carregarStoriesGlobal();
    }

    // 5. Efeitos de Busca (Histórico)
    const wrapper = document.getElementById('buscaWrapper');
    if(inputBusca) {
        atualizarListaHistorico();
        const limparBtn = document.getElementById('limparHistoricoBtn');
        if (limparBtn) {
            limparBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.limparHistorico(e);
            });
        }
        inputBusca.addEventListener('focus', () => { if(wrapper) wrapper.classList.add('active'); });
        
        document.addEventListener('click', (e) => { 
            if (wrapper && !wrapper.contains(e.target)) wrapper.classList.remove('active'); 
        });

        const executarBusca = () => {
            const termo = inputBusca.value.trim();
            if (termo) { 
                salvarBusca(termo); 
                window.location.href = `busca.html?q=${encodeURIComponent(termo)}`;
            }
        };

        inputBusca.addEventListener('keypress', (e) => { if (e.key === 'Enter') executarBusca(); });
        
        const btnLupa = document.querySelector('.btn-search-circle');
        if(btnLupa) btnLupa.onclick = (e) => { e.preventDefault(); executarBusca(); };

        const btnProcurarMain = document.querySelector('.btn-procurar');
        if(btnProcurarMain) btnProcurarMain.onclick = (e) => { e.preventDefault(); executarBusca(); };
    }

    initHomeEnhancements();

    const postParam = params.get('post');
    const commentParam = params.get('comment');
    const openReplies = params.get('reply') === '1';
    if (postParam) {
        window._dokePendingModalCommentId = commentParam || null;
        window._dokePendingModalOpenReplies = openReplies;
        if (postParam.startsWith('sb-')) {
            await abrirModalPublicacao(postParam.slice(3));
        } else if (postParam.startsWith('fb-')) {
            await abrirModalPost(postParam.slice(3), 'posts');
        }
    }

    // 6. Cookies e Popups
    const banner = document.getElementById('cookieBanner');
    const btnCookie = document.getElementById('acceptBtn');
    if (banner && btnCookie) {
        if (localStorage.getItem('cookiesAceitos') === 'true') banner.style.display = 'none';
        else {
            banner.style.display = 'flex';
            btnCookie.onclick = function() { banner.style.display = 'none'; localStorage.setItem('cookiesAceitos', 'true'); };
        }
    }

// CÓDIGO NOVO (COM VERIFICAÇÃO DE LOGIN)
    var dataHoje = new Date().toDateString();
    
    // Verifica se o usuário JÁ está logado
    const estaLogado = localStorage.getItem('usuarioLogado') === 'true'; 

    // Só abre o popup se a data for nova E se NÃO estiver logado
    if (localStorage.getItem("popupVistoData") !== dataHoje && !estaLogado) {
        window.abrirPopup();
        localStorage.setItem("popupVistoData", dataHoje);
    }
    // 7. Efeito Typewriter
    const elementoTexto = document.getElementById('typewriter');
    if (elementoTexto) {
        const kind = document.body?.dataset?.kind;
        const frases = kind === "negocios"
          ? [
              "Restaurantes proximos",
              "Mercados abertos agora",
              "Cafes e padarias",
              "Farmacias 24h",
              "Lojas na sua regiao",
              "Delivery na sua rua"
            ]
          : [
              "Chefs de cozinha proximos",
              "Eletricistas na pituba",
              "Aulas de ingles online",
              "Manutencao de ar-condicionado",
              "Personal trainers",
              "Advogados"
            ];
        let fraseIndex = 0, charIndex = 0, isDeleting = false;
        function typeEffect() {
            const currentPhrase = frases[fraseIndex];
            if (isDeleting) { elementoTexto.textContent = currentPhrase.substring(0, charIndex - 1); charIndex--; } 
            else { elementoTexto.textContent = currentPhrase.substring(0, charIndex + 1); charIndex++; }
            let typeSpeed = isDeleting ? 50 : 100;
            if (!isDeleting && charIndex === currentPhrase.length) { typeSpeed = 2000; isDeleting = true; }
            else if (isDeleting && charIndex === 0) { isDeleting = false; fraseIndex = (fraseIndex + 1) % frases.length; typeSpeed = 500; }
            setTimeout(typeEffect, typeSpeed);
        }
        typeEffect();
    }

    

    // 8. AUTENTICAÇÃO PERSISTENTE E NOTIFICAÇÕES
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const docRef = doc(db, "usuarios", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    localStorage.setItem('doke_usuario_perfil', JSON.stringify(docSnap.data()));
                    localStorage.setItem('usuarioLogado', 'true');
                } else if (!localStorage.getItem('doke_usuario_perfil')) {
                    const nomeFallback = user.displayName || (user.email ? user.email.split('@')[0] : "Usuario");
                    localStorage.setItem('doke_usuario_perfil', JSON.stringify({
                        nome: nomeFallback,
                        user: user.displayName || nomeFallback,
                        foto: user.photoURL || ""
                    }));
                    localStorage.setItem('usuarioLogado', 'true');
                }
            } catch (error) {
                console.error("Erro ao carregar perfil:", error);
                if (!localStorage.getItem('doke_usuario_perfil')) {
                    const nomeFallback = user.displayName || (user.email ? user.email.split('@')[0] : "Usuario");
                    localStorage.setItem('doke_usuario_perfil', JSON.stringify({
                        nome: nomeFallback,
                        user: user.displayName || nomeFallback,
                        foto: user.photoURL || ""
                    }));
                    localStorage.setItem('usuarioLogado', 'true');
                }
            }
            
            // Ativa notificações de pedidos novos
            window.monitorarNotificacoesGlobal(user.uid);

            if(window.location.pathname.includes('perfil')) {
                carregarPerfil();
                carregarPosts(user.uid);
                if (typeof carregarMeusStories === "function") {
                    carregarMeusStories(user.uid);
                }
            }
            if(window.location.pathname.includes('chat')) {
                carregarMeusPedidos();
            }

            if (user) {
                // Quando o usuário está autenticado, marca como online
                const userRef = doc(db, "usuarios", user.uid);
                updateDoc(userRef, { status: "Online" });
            }

            const chatIdAuto = localStorage.getItem('doke_abrir_chat_id');
                if (chatIdAuto) {
                    const nomeAuto = localStorage.getItem('doke_abrir_chat_nome');
                    const fotoAuto = localStorage.getItem('doke_abrir_chat_foto');
                    const uidAuto = localStorage.getItem('doke_abrir_chat_uid');
                    
                    // Limpa para não abrir sempre que recarregar a página
                    localStorage.removeItem('doke_abrir_chat_id');
                    localStorage.removeItem('doke_abrir_chat_nome');
                    localStorage.removeItem('doke_abrir_chat_foto');
                    localStorage.removeItem('doke_abrir_chat_uid');
                    
                    // Pequeno delay para garantir que o DOM carregou
                    setTimeout(() => {
                        if(window.abrirTelaChat) {
                            window.abrirTelaChat(chatIdAuto, nomeAuto, fotoAuto, uidAuto);
                        }
                    }, 500);
                }
            
        } else {
            localStorage.removeItem('usuarioLogado');
            if(window.location.pathname.includes('perfil') || window.location.pathname.includes('chat')) {
                window.location.href = 'login.html';
            }
        }
        verificarEstadoLogin();
    });
});

async function finalizarPedidoComQuiz(idPrestador, nomePrestador, servico, formularioRespondido) {
    const user = auth.currentUser;
    const perfil = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};

    try {
        const pedidoExistente = await encontrarPedidoExistenteBase(user.uid, idPrestador, null);
        const pedidoPayload = {
            deUid: user.uid,
            paraUid: idPrestador,
            paraNome: nomePrestador,
            clienteNome: perfil.nome || "Cliente",
            clienteFoto: perfil.foto || "",
            servicoReferencia: servico,
            formularioRespostas: formularioRespondido, // ARRAY DE OBJETOS [{pergunta, resposta}]
            status: "pendente",
            dataPedido: new Date().toISOString(),
            dataAtualizacao: new Date().toISOString(),
            ultimaMensagem: servico || "Novo pedido enviado"
        };
        if (pedidoExistente && pedidoExistente.id) {
            const statusAtual = String(pedidoExistente.data?.status || "").toLowerCase();
            const reabrir = ['recusado','cancelado','finalizado'];
            if (!reabrir.includes(statusAtual)) {
                pedidoPayload.status = pedidoExistente.data?.status || pedidoPayload.status;
            }
            await updateDoc(doc(db, "pedidos", pedidoExistente.id), pedidoPayload);
        } else {
            await addDoc(collection(db, "pedidos"), pedidoPayload);
        }
        alert("✅ Solicitação enviada com sucesso!");
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar no Firestore.");
    }
}

async function encontrarPedidoExistenteBase(deUid, paraUid, anuncioId) {
    try {
        if (!db || !deUid || !paraUid) return null;
        const q = query(collection(db, "pedidos"), where("deUid", "==", deUid), where("paraUid", "==", paraUid));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const candidatos = [];
        snap.forEach((d) => {
            const data = d.data() || {};
            if (anuncioId && data.anuncioId && data.anuncioId !== anuncioId) return;
            candidatos.push({ id: d.id, data });
        });
        if (!candidatos.length) return null;
        candidatos.sort((a, b) => {
            const ta = Date.parse(a.data.dataAtualizacao || a.data.dataPedido || 0) || 0;
            const tb = Date.parse(b.data.dataAtualizacao || b.data.dataPedido || 0) || 0;
            return tb - ta;
        });
        return candidatos[0];
    } catch (e) {
        console.warn("find pedido existente falhou:", e);
        return null;
    }
}

// ============================================================
// LÓGICA DO CHAT (ADICIONAR AO SCRIPT.JS)
// ============================================================

let chatAtualId = null;
let chatUnsubscribe = null;

// Função chamada pelo botão "Abrir Chat" na lista de pedidos
window.abrirChatInterno = async function(uidCliente, idPedido, nomeCliente, fotoCliente) {
    const viewLista = document.getElementById('view-lista');
    const viewChat = document.getElementById('view-chat');
    
    // 1. Troca a visualização
    if(viewLista) viewLista.style.display = 'none';
    if(viewChat) {
        viewChat.style.display = 'flex';
        // Ajuste para mobile (cobre a tela toda)
        if(window.innerWidth <= 768) {
            document.querySelector('.bottom-nav').style.display = 'none';
            document.querySelector('.navbar-mobile').style.display = 'none';
        }
    }

    // 2. Configura o Header do Chat
    document.getElementById('chatNome').innerText = nomeCliente || "Cliente";
    document.getElementById('chatAvatar').src = fotoCliente || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    
    chatAtualId = idPedido;
    const containerMsgs = document.getElementById('areaMensagens');
    containerMsgs.innerHTML = '<div style="text-align:center; padding:20px; color:#999;"><i class="bx bx-loader-alt bx-spin"></i> Carregando conversa...</div>';

    try {
        // 3. Busca os dados do Pedido (incluindo o QUIZ)
        const docPedido = await getDoc(doc(db, "pedidos", idPedido));
        containerMsgs.innerHTML = ""; // Limpa loader

        if (docPedido.exists()) {
            const dados = docPedido.data();
            
            // RENDERIZA O CARD DO QUIZ (Se houver respostas)
            if (dados.formularioRespostas && Array.isArray(dados.formularioRespostas) && dados.formularioRespostas.length > 0) {
                let htmlQuiz = `
                    <div class="quiz-summary-card">
                        <div class="quiz-header"><i class='bx bx-list-check'></i> Respostas do Formulário</div>
                `;
                
                dados.formularioRespostas.forEach(item => {
                    htmlQuiz += `
                        <div class="quiz-item">
                            <div class="quiz-q">${item.pergunta}</div>
                            <div class="quiz-a">${item.resposta}</div>
                        </div>
                    `;
                });
                
                htmlQuiz += `</div>`;
                containerMsgs.insertAdjacentHTML('beforeend', htmlQuiz);
            } else if (dados.mensagemInicial) {
                // Se não tiver quiz, mostra a mensagem inicial do pedido
                containerMsgs.insertAdjacentHTML('beforeend', `
                    <div class="quiz-summary-card">
                        <div class="quiz-header"><i class='bx bx-info-circle'></i> Pedido Inicial</div>
                        <div style="font-style:italic; color:#555;">"${dados.mensagemInicial}"</div>
                    </div>
                `);
            }
        }

        // 4. Carrega as mensagens em tempo real (Subcoleção)
        const qMsgs = query(collection(db, "pedidos", idPedido, "mensagens"), orderBy("timestamp", "asc"));
        
        // Se já existir um listener anterior, cancela ele para não duplicar
        if(chatUnsubscribe) chatUnsubscribe();

        chatUnsubscribe = onSnapshot(qMsgs, (snapshot) => {
            // Apenas adiciona as novas mensagens (ou renderiza tudo se for a primeira vez)
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    renderizarMensagem(change.doc.data(), containerMsgs);
                }
            });
            // Rola para o final
            containerMsgs.scrollTop = containerMsgs.scrollHeight;
        });

    } catch (e) {
        console.error("Erro ao abrir chat:", e);
        alert("Erro ao carregar conversa.");
    }
}

function renderizarMensagem(msg, container) {
    const user = auth.currentUser;
    if (!user) return;

    const ehMinha = msg.senderUid === user.uid;
    const classe = ehMinha ? 'msg-enviada' : 'msg-recebida';
    
    // Formata hora (ex: 14:30)
    let hora = "--:--";
    if (msg.timestamp) {
        const dataObj = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
        hora = dataObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    const html = `
        <div class="msg-bubble ${classe}">
            ${msg.texto}
            <span class="msg-time">${hora}</span>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

window.enviarMensagem = async function(e) {
    e.preventDefault();
    const input = document.getElementById('inputMsg');
    const texto = input.value.trim();
    const user = auth.currentUser;

    if (!texto || !chatAtualId || !user) return;

    input.value = ""; // Limpa input imediatamente

    try {
        await addDoc(collection(db, "pedidos", chatAtualId, "mensagens"), {
            texto: texto,
            senderUid: user.uid,
            timestamp: new Date(),
            lido: false
        });
} catch (erro) {
        console.error("Erro ao enviar:", erro);
        alert("Falha no envio. Verifique sua conexão.");
    }
}




// ============================================================
// FUNÇÃO VOLTAR (Faltava definir essa função)
// ============================================================
window.voltarParaPedidos = function() {
    document.getElementById('view-chat').style.display = 'none';
    document.getElementById('view-status').style.display = 'none';
    document.getElementById('view-lista').style.display = 'block';
    
    const bottomNav = document.querySelector('.bottom-nav');
    if(bottomNav) bottomNav.style.display = 'flex';

    if(window.chatUnsubscribe) window.chatUnsubscribe();
    window.chatIdAtual = null;
    
    const novaUrl = window.location.href.split('?')[0];
    window.history.pushState({path: novaUrl}, '', novaUrl);
}

// ATUALIZAR A FUNÇÃO CARREGAR MEUS PEDIDOS PARA PASSAR OS DADOS CERTOS
window.carregarMeusPedidos = async function() {
    const container = document.getElementById('container-pedidos');
    const contador = document.getElementById('contadorPedidos');
    if (!container) return;

    const user = auth.currentUser;
    if (!user) {
        container.innerHTML = `<div class="empty-chat"><p>Faça login para ver pedidos.</p></div>`;
        return;
    }

    // OBS: Se der erro de índice no console, o Firebase fornecerá um link para criar.
    const q = query(
        collection(db, "pedidos"), 
        where("paraUid", "==", user.uid), 
        orderBy("dataPedido", "desc")
    );
    
    onSnapshot(q, (snapshot) => {
        container.innerHTML = "";
        let novos = 0;

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-chat">
                    <i class='bx bx-message-rounded-dots'></i>
                    <p>Você ainda não recebeu pedidos.</p>
                </div>`;
            if(contador) contador.innerText = "0 novos";
            return;
        }

        snapshot.forEach((doc) => {
            const p = doc.data();
            const id = doc.id;
            let statusClass = p.status; // pendente, aceito, recusado
            
            if(p.status === 'pendente') novos++;

            // Define quais botões aparecem baseado no status
            let botoesHtml = '';
            
            if (p.status === 'pendente') {
                botoesHtml = `
                    <div class="acoes-pedido">
                        <button class="btn-acao btn-recusar" onclick="atualizarStatusPedido('${id}', 'recusado')">Recusar</button>
                        <button class="btn-acao btn-aceitar" onclick="atualizarStatusPedido('${id}', 'aceito')">Aceitar</button>
                    </div>`;
            } else if (p.status === 'aceito') {
                // DADOS REAIS SENDO PASSADOS AQUI NA CHAMADA DO CHAT
                botoesHtml = `
                    <div class="contato-liberado" style="display:block; margin-top:10px; text-align:center;">
                        <button onclick="abrirChatInterno('${p.deUid}', '${id}', '${p.clienteNome}', '${p.clienteFoto}')" style="background:#009688; color:white; padding:10px 20px; border:none; border-radius:30px; font-weight:bold; cursor:pointer; width:100%;">
                            <i class='bx bx-chat'></i> Conversar com Cliente
                        </button>
                    </div>`;
            } else {
                botoesHtml = `<div style="text-align:right; color:#e74c3c; font-size:0.8rem; margin-top:10px;">Recusado</div>`;
            }

            const card = `
            <div class="card-pedido ${statusClass}">
                <div class="avatar-pedido">
                    <img src="${p.clienteFoto || 'https://cdn-icons-png.flaticon.com/512/847/847969.png'}">
                </div>
                <div class="info-pedido">
                    <div class="header-card">
                        <h4>${p.clienteNome}</h4>
                        <span class="data-pedido">${new Date(p.dataPedido).toLocaleDateString()}</span>
                    </div>
                    <span class="servico-tag">${p.servicoReferencia}</span>
                    <div class="msg-inicial">"${p.mensagemInicial}"</div>
                    ${botoesHtml}
                </div>
            </div>`;
            
            container.insertAdjacentHTML('beforeend', card);
        });
        
        if(contador) contador.innerText = `${novos} novos`;
    });
}

// ============================================================
// ATUALIZAÇÃO: CORREÇÃO DO CARREGAMENTO EXPLORAR
// ============================================================

window.carregarDadosExplorar = function() {
    console.log("Iniciando carregamento do Explorar...");
    
    // 1. Carrega Categorias
    if(window.carregarCategorias) window.carregarCategorias();

    // 2. Carrega Inspirações (Com Fallback para Anúncios)
    carregarInspiracoes();

    // 3. Carrega Profissionais
    carregarListaProfissionaisReal();
}

async function carregarInspiracoes() {
    const container = document.getElementById('gridInspiracao');
    if (!container) return;

    try {
        // Tenta buscar na coleção 'trabalhos' (Portfolio)
        // OBS: Removi o 'orderBy' temporariamente para evitar erro de índice se a coleção for nova
        let q = query(collection(db, "trabalhos"), limit(8));
        let snapshot = await getDocs(q);
        
        let listaParaMostrar = [];
        let tipoCard = 'trabalho';

        // Se não tiver trabalhos (portfólio), busca anúncios normais para preencher
        if (snapshot.empty) {
            console.log("Sem trabalhos, buscando anúncios...");
            q = query(collection(db, "anuncios"), limit(8));
            snapshot = await getDocs(q);
            tipoCard = 'anuncio';
        }

        container.innerHTML = ""; // Limpa o spinner "Carregando..."

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="loading-msg">
                    <i class='bx bx-image-alt' style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Ainda não há publicações de inspiração.</p>
                </div>`;
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Lógica para pegar a imagem correta dependendo se é Trabalho ou Anúncio
            let imagem = "https://placehold.co/400x300?text=Sem+Imagem";
            if (data.capa) imagem = data.capa;
            else if (data.img) imagem = data.img;
            else if (data.fotos && data.fotos.length > 0) imagem = data.fotos[0];

            const categoria = data.categoria || data.tag || "Geral";
            const titulo = data.titulo || (data.descricao ? data.descricao.substring(0, 30) : "Serviço");
            const autor = data.autorNome || data.nomeAutor || "Profissional";

            const html = `
            <div class="inspiration-card" onclick="window.location.href='index.html'">
                <div class="like-btn"><i class='bx bx-heart'></i></div>
                <img src="${imagem}" class="card-img" alt="Inspiração">
                <div class="card-overlay">
                    <span class="card-cat-badge">${categoria}</span>
                    <div class="card-title">${titulo}</div>
                    <div class="card-user">
                        <i class='bx bxs-user-circle'></i> ${autor}
                    </div>
                </div>
            </div>`;
            
            container.insertAdjacentHTML('beforeend', html);
        });

    } catch (e) {
        console.error("Erro ao carregar inspirações:", e);
        container.innerHTML = `
            <div class="error-msg">
                <p>Não foi possível carregar as inspirações.</p>
                <small>${e.message}</small>
            </div>`;
    }
}

async function carregarListaProfissionaisReal() {
    const container = document.getElementById('listaProfissionaisReal');
    if (!container) return;

    try {
        // Busca usuários onde isProfissional é true
        const q = query(collection(db, "usuarios"), where("isProfissional", "==", true), limit(10));
        const snapshot = await getDocs(q);

        container.innerHTML = ""; // Limpa spinner

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="pro-card">
                    <i class='bx bxs-badge-check verified-badge'></i>
                    <img src="https://i.pravatar.cc/150?img=33" class="pro-avatar-lg">
                    <span class="pro-name">Seja o Primeiro</span>
                    <span class="pro-job">Cadastre-se Pro</span>
                    <button class="btn-pro-action" onclick="window.location.href='tornar-profissional.html'">Começar</button>
                </div>`;
            return;
        }

        snapshot.forEach(doc => {
            const user = doc.data();
            const foto = user.foto || "https://i.pravatar.cc/150";
            
            // Lógica do Nome: Prioriza o @usuario, senão pega o primeiro nome
            let nomeExibicao = user.user || (user.nome ? user.nome.split(' ')[0] : "Usuário");
            if (!nomeExibicao.startsWith('@') && user.user) {
                nomeExibicao = user.user; // Garante que usa o handle se existir
            }

            const profissao = user.categoria_profissional || "Profissional";
            
            // LÓGICA DE AVALIAÇÃO CORRIGIDA
            // Se tiver avaliações > 0, mostra estrelas. Senão, mostra "Novo".
            let htmlAvaliacao;
            if (user.stats && user.stats.avaliacoes > 0) {
                htmlAvaliacao = `<span class="pro-rating">★ ${user.stats.media}</span>`;
            } else {
                htmlAvaliacao = `<span class="badge-novo-pro">Novo</span>`;
            }

            const html = `
            <div class="pro-card">
                <i class='bx bxs-badge-check verified-badge'></i>
                <img src="${foto}" class="pro-avatar-lg js-user-link" data-uid="${doc.id}">
                <span class="pro-name js-user-link" data-uid="${doc.id}" style="cursor:pointer;">${nomeExibicao}</span>
                <span class="pro-job">${profissao}</span>
                ${htmlAvaliacao}
                <button class="btn-pro-action js-user-link" data-uid="${doc.id}" type="button">Ver Perfil</button>
            </div>`;
            
            container.insertAdjacentHTML('beforeend', html);
        });

    } catch (e) {
        console.error("Erro ao carregar profissionais:", e);
        container.innerHTML = `
            <div style="padding:15px; color:#e74c3c; text-align:center;">
                Erro ao listar pros. Tente recarregar.
            </div>`;
    }
}

// ============================================================
// 9. LÓGICA DE COMUNIDADES (ATUALIZADO)
// ============================================================

// Função principal chamada ao abrir a página
window.carregarDadosComunidade = function() {
    carregarComunidadesGerais();
    carregarMeusGrupos();
}

// 1. CRIAR NOVA COMUNIDADE
window.criarNovaComunidade = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const user = auth.currentUser;

    if(!user) { alert("Faça login para criar um grupo."); return; }

    const nome = document.getElementById('commNome').value;
    const desc = document.getElementById('commDesc').value;
    const tipo = document.getElementById('commTipo').value;
    const fileInput = document.getElementById('commFoto');

    btn.innerText = "Criando..."; 
    btn.disabled = true;

    try {
        let capaUrl = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%221200%22%20height%3D%22400%22%20viewBox%3D%220%200%201200%20400%22%3E%0A%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20x2%3D%221%22%20y1%3D%220%22%20y2%3D%221%22%3E%0A%3Cstop%20offset%3D%220%22%20stop-color%3D%22%232a5f90%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%237b2cbf%22/%3E%0A%3C/linearGradient%3E%3C/defs%3E%0A%3Crect%20width%3D%221200%22%20height%3D%22400%22%20fill%3D%22url%28%23g%29%22/%3E%0A%3C/svg%3E"; // Capa padrão (gradiente Doke, sem depender de links externos)

        // Se o usuário selecionou foto, converte para Base64
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            capaUrl = await new Promise((resolve) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }

        // Salva no Firestore
        await addDoc(collection(db, "comunidades"), {
            donoUid: user.uid,
            nome: nome,
            descricao: desc,
            tipo: tipo,
            capa: capaUrl,
            membrosCount: 1,
            membros: [user.uid], // Você entra automaticamente no grupo
            dataCriacao: new Date().toISOString()
        });

        alert("Grupo criado com sucesso!");
        if(window.fecharModalCriarComm) window.fecharModalCriarComm();
        
        // Recarrega as listas
        carregarComunidadesGerais();
        carregarMeusGrupos();

    } catch (erro) {
        console.error("Erro ao criar:", erro);
        alert("Erro ao criar grupo. Tente novamente.");
    } finally {
        btn.innerText = "Criar Comunidade"; 
        btn.disabled = false;
    }
}

let __dokeCommMembersSchemaCache = null;

function dokeCommToast(msg) {
    if (typeof window.mostrarToast === "function") {
        window.mostrarToast(msg);
        return;
    }
    if (typeof window.showToast === "function") {
        window.showToast(msg);
        return;
    }
    alert(msg);
}

async function dokeCommGetUid() {
    try {
        if (window.auth?.currentUser?.uid) return String(window.auth.currentUser.uid);
    } catch (_e) {}

    try {
        const sb = window.supabase || window.supabaseClient || window.sb || null;
        if (sb?.auth?.getUser) {
            const { data } = await sb.auth.getUser();
            if (data?.user?.id) return String(data.user.id);
        }
    } catch (_e) {}

    try {
        const perfil = JSON.parse(localStorage.getItem('doke_usuario_perfil') || '{}') || {};
        const uid = perfil.uid || perfil.id || perfil.user_uid || perfil.userId || perfil.username || perfil.user;
        if (uid) return String(uid).replace(/^@/, "");
    } catch (_e) {}

    return "";
}

function dokeCommEscapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function dokeCommNormalizePrivacidade(comm) {
    const boolPrivate = [comm?.privado, comm?.is_private, comm?.private].find(v => typeof v === "boolean");
    if (typeof boolPrivate === "boolean") {
        return { isPrivate: boolPrivate, label: boolPrivate ? "Privado" : "Público" };
    }

    if (typeof comm?.publico === "boolean") {
        return { isPrivate: !comm.publico, label: comm.publico ? "Público" : "Privado" };
    }
    if (typeof comm?.publica === "boolean") {
        return { isPrivate: !comm.publica, label: comm.publica ? "Público" : "Privado" };
    }

    const raw = String(comm?.privacidade || comm?.privacy || "").trim();
    if (raw) {
        const s = raw.toLowerCase();
        if (s.includes("priv")) return { isPrivate: true, label: raw };
        if (s.includes("pub")) return { isPrivate: false, label: raw };
        return { isPrivate: false, label: raw };
    }
    return { isPrivate: false, label: "Público" };
}

async function dokeCommHasColumn(client, table, col) {
    try {
        const { error } = await client.from(table).select(col).limit(1);
        if (!error) return true;
        const msg = String(error.message || "").toLowerCase();
        if (
            msg.includes("does not exist") ||
            msg.includes("could not find") ||
            msg.includes("relation") && msg.includes("does not exist")
        ) {
            return false;
        }
        return true;
    } catch (_e) {
        return false;
    }
}

async function dokeCommDetectMembersSchema(client) {
    if (__dokeCommMembersSchemaCache) return __dokeCommMembersSchemaCache;

    const pick = async (candidates, fallback = null) => {
        for (const col of candidates) {
            if (await dokeCommHasColumn(client, "comunidade_membros", col)) return col;
        }
        return fallback;
    };

    __dokeCommMembersSchemaCache = {
        communityCol: await pick(['comunidade_id', 'comunidadeId', 'community_id', 'communityId', 'grupo_id', 'grupoId'], 'comunidade_id'),
        userCol: await pick(['user_uid', 'userUid', 'user_id', 'userId', 'uid', 'usuario_id', 'autor_uid', 'autorUid'], 'user_uid'),
        statusCol: await pick(['status', 'situacao', 'estado'], null)
    };

    return __dokeCommMembersSchemaCache;
}

async function dokeCommCarregarStatusMembro(list, uid) {
    const statusByGroupId = new Map();
    if (!uid || !Array.isArray(list) || !list.length) return statusByGroupId;

    // Fallback local pela coluna "membros" dentro da comunidade.
    list.forEach((comm) => {
        const id = comm.id || comm.comunidade_id || comm.uuid || comm._id;
        if (!id) return;
        const membrosArr = Array.isArray(comm.membros) ? comm.membros : [];
        const isMember = membrosArr.some((m) => String(m) === String(uid));
        if (isMember) statusByGroupId.set(String(id), "active");
    });

    const client = window.supabase || window.supabaseClient || window.sb || null;
    if (!client || typeof client.from !== "function") return statusByGroupId;

    const ids = list
        .map((comm) => comm.id || comm.comunidade_id || comm.uuid || comm._id)
        .filter(Boolean)
        .map((id) => String(id));
    if (!ids.length) return statusByGroupId;

    try {
        const schema = await dokeCommDetectMembersSchema(client);
        if (!schema.communityCol || !schema.userCol) return statusByGroupId;

        const cols = [schema.communityCol];
        if (schema.statusCol) cols.push(schema.statusCol);

        const { data, error } = await client
            .from('comunidade_membros')
            .select(cols.join(','))
            .eq(schema.userCol, uid)
            .in(schema.communityCol, ids);

        if (error) throw error;

        (data || []).forEach((row) => {
            const gid = String(row[schema.communityCol] || "");
            if (!gid) return;

            const rawStatus = schema.statusCol ? String(row[schema.statusCol] || "").toLowerCase() : "ativo";
            if (rawStatus.includes("pend")) {
                if (!statusByGroupId.has(gid)) statusByGroupId.set(gid, "pending");
                return;
            }
            statusByGroupId.set(gid, "active");
        });
    } catch (e) {
        console.warn("[DOKE] Falha ao ler comunidade_membros:", e);
    }

    return statusByGroupId;
}

window.acaoComunidadeGrupo = async function(grupoIdEncoded, isPrivate, isMember) {
    let grupoId = "";
    try {
        grupoId = decodeURIComponent(String(grupoIdEncoded || ""));
    } catch (_e) {
        grupoId = String(grupoIdEncoded || "");
    }
    grupoId = grupoId.trim();
    if (!grupoId) return;

    if (isMember) {
        abrirGrupo(grupoId);
        return;
    }

    const uid = await dokeCommGetUid();
    if (!uid) {
        dokeCommToast("Faça login para continuar.");
        return;
    }

    const client = window.supabase || window.supabaseClient || window.sb || null;
    if (!client || typeof client.from !== "function") {
        if (isPrivate) dokeCommToast("Não foi possível solicitar entrada agora.");
        else abrirGrupo(grupoId);
        return;
    }

    try {
        const schema = await dokeCommDetectMembersSchema(client);
        if (!schema.communityCol || !schema.userCol) throw new Error("Schema de membros não detectado.");

        const payload = {};
        payload[schema.communityCol] = grupoId;
        payload[schema.userCol] = uid;
        if (schema.statusCol) {
            payload[schema.statusCol] = isPrivate ? "pendente" : "ativo";
        }

        const selectCols = ['id'];
        if (schema.statusCol) selectCols.push(schema.statusCol);

        const { data: existing, error: findError } = await client
            .from('comunidade_membros')
            .select(selectCols.join(','))
            .eq(schema.communityCol, grupoId)
            .eq(schema.userCol, uid)
            .limit(1);

        if (findError) throw findError;

        if (Array.isArray(existing) && existing.length) {
            const rowId = existing[0].id;
            if (rowId) {
                const updatePayload = { ...payload };
                if (schema.statusCol) {
                    const oldStatus = String(existing[0][schema.statusCol] || "").toLowerCase();
                    if (oldStatus.includes("ativ")) updatePayload[schema.statusCol] = "ativo";
                }
                const { error: updError } = await client
                    .from('comunidade_membros')
                    .update(updatePayload)
                    .eq('id', rowId);
                if (updError) throw updError;
            }
        } else {
            const { error: insError } = await client
                .from('comunidade_membros')
                .insert(payload);
            if (insError) throw insError;
        }

        if (isPrivate) {
            dokeCommToast("Solicitação de entrada enviada.");
            await carregarComunidadesGerais();
            return;
        }

        dokeCommToast("Você entrou no grupo.");
        await carregarComunidadesGerais();
        if (window.carregarMeusGrupos) await window.carregarMeusGrupos();
        abrirGrupo(grupoId);
    } catch (e) {
        console.error("[DOKE] Erro ao entrar/solicitar grupo:", e);
        if (isPrivate) dokeCommToast("Não foi possível solicitar entrada agora.");
        else abrirGrupo(grupoId);
    }
};

// 2. LISTAR TODAS AS COMUNIDADES (GERAL)
async function carregarComunidadesGerais() {
    const container = document.getElementById('listaComunidades');
    if (!container) return;

    container.innerHTML = `<div style="padding:18px; color:#666;">Carregando comunidades...</div>`;

    const fallbackCover = () => `linear-gradient(120deg, var(--cor2), #7b3fa0)`;

    const renderCard = (comm, uid, statusByGroupId) => {
        const id = comm.id || comm.comunidade_id || comm.uuid || comm._id;
        const nome = dokeCommEscapeHtml(comm.nome || comm.titulo || "Comunidade");
        const descricao = dokeCommEscapeHtml(comm.descricao || "");
        const tipo = dokeCommEscapeHtml(comm.tipo || comm.tipo_comunidade || "Grupo");
        const { isPrivate, label: privacidadeLabel } = dokeCommNormalizePrivacidade(comm);
        const capa = comm.capa_url || comm.capa || comm.imagem_capa || "";
        const thumb = comm.thumb_url || comm.icone_url || "";
        const membrosArr = Array.isArray(comm.membros) ? comm.membros : null;
        const membrosCount = (typeof comm.membrosCount === "number" ? comm.membrosCount :
                             typeof comm.membros_count === "number" ? comm.membros_count :
                             membrosArr ? membrosArr.length : (comm.membros_total || 0));

        const idStr = String(id || "");
        const status = statusByGroupId?.get(idStr) || "none";
        const isMember = status === "active";
        const btnLabel = isMember ? "Entrou" : (isPrivate ? "Solicitar entrada" : "Entrar");
        const btnState = isMember ? "entered" : (isPrivate ? "request" : "join");

        const safeCapa = String(capa || "").replace(/'/g, "\\'");
        const capaStyle = capa ? `background-image:url('${safeCapa}')` : `background-image:${fallbackCover()}`;
        const safeId = idStr.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        const safeIdEncoded = encodeURIComponent(idStr);
        const safePriv = dokeCommEscapeHtml(privacidadeLabel);

        return `
          <div class="com-card" onclick="abrirGrupo('${safeId}')">
            <div class="com-cover" style="${capaStyle}"></div>
            <div class="com-body">
              <div class="com-avatar">${thumb ? `<img src="${dokeCommEscapeHtml(thumb)}" alt="">` : `<i class='bx bx-group'></i>`}</div>
              <div class="com-info">
                <div class="com-title">${nome}</div>
                <div class="com-desc">${descricao}</div>
                <div class="com-meta">
                  <span class="pill">${tipo}</span>
                  <span class="pill">${safePriv}</span>
                  <span class="meta-small">${membrosCount ? `+${membrosCount} membros` : `0 membros`}</span>
                </div>
              </div>
              <button class="btn-ver-grupo" data-state="${btnState}" onclick="event.stopPropagation(); window.acaoComunidadeGrupo('${safeIdEncoded}', ${isPrivate ? "true" : "false"}, ${isMember ? "true" : "false"})">${btnLabel}</button>
            </div>
          </div>
        `;
    };

    try {
        const uid = await dokeCommGetUid();

        // Preferir Supabase (dados reais)
        if (window.supabase) {
            // tentar ordenar, mas fazer fallback se a coluna não existir
            let res = await window.supabase
                .from('comunidades')
                .select('*')
                .order('dataCriacao', { ascending: false })
                .limit(40);

            if (res.error) {
                res = await window.supabase
                    .from('comunidades')
                    .select('*')
                    .limit(40);
            }

            if (res.error) throw res.error;

            const list = (res.data || []).map(c => ({ ...c, id: c.id || c.comunidade_id || c.uuid }));
            if (!list.length) {
                container.innerHTML = `<div style="padding:18px; color:#777;">Nenhuma comunidade encontrada.</div>`;
                return;
            }

            const statusByGroupId = await dokeCommCarregarStatusMembro(list, uid);
            container.innerHTML = list.map((c) => renderCard(c, uid, statusByGroupId)).join('');
            return;
        }

        // Fallback Firestore
        const snap = await getDocs(collection(db, "comunidades"));
        if (!snap || snap.empty) {
            container.innerHTML = `<div style="padding:18px; color:#777;">Nenhuma comunidade encontrada.</div>`;
            return;
        }

        const list = [];
        snap.forEach((doc) => {
            const comm = doc.data();
            comm.id = doc.id;
            list.push(comm);
        });

        const statusByGroupId = await dokeCommCarregarStatusMembro(list, uid);
        container.innerHTML = list.map((c) => renderCard(c, uid, statusByGroupId)).join('');

    } catch (e) {
        console.error("Erro ao listar comunidades:", e);
        container.innerHTML = `<div style="padding:18px; color:#999;">Erro ao carregar lista.</div>`;
    }
}
// 3. LISTAR MEUS GRUPOS (Onde sou membro)
async function carregarMeusGrupos() {
    const container = document.getElementById('listaMeusGrupos');
    if (!container) return;

    container.innerHTML = `<div style="padding:18px; color:#666;">Carregando seus grupos...</div>`;

    try {
        const uid = (window.auth && window.auth.currentUser && window.auth.currentUser.uid) ? window.auth.currentUser.uid : null;
        if (!uid) {
            container.innerHTML = `<div style="padding:18px; color:#777;">Faça login para ver seus grupos.</div>`;
            return;
        }

        const fallbackCover = () => `linear-gradient(120deg, var(--cor2), #7b3fa0)`;

        const renderItem = (comm) => {
            const id = comm.id || comm.comunidade_id || comm.uuid || comm._id;
            const nome = comm.nome || comm.titulo || "Comunidade";
            const tipo = comm.tipo || comm.tipo_comunidade || "Grupo";
            const capa = comm.capa_url || comm.capa || "";
            const membrosArr = Array.isArray(comm.membros) ? comm.membros : null;
            const membrosCount = (typeof comm.membrosCount === "number" ? comm.membrosCount :
                                 typeof comm.membros_count === "number" ? comm.membros_count :
                                 membrosArr ? membrosArr.length : (comm.membros_total || 0));
            const capaStyle = capa ? `background-image:url('${capa}')` : `background-image:${fallbackCover()}`;

            return `
              <div class="my-group-item" onclick="abrirGrupo('${id || ""}')">
                <div class="my-group-cover" style="${capaStyle}"></div>
                <div class="my-group-info">
                  <div class="my-group-title">${nome}</div>
                  <div class="my-group-sub">${tipo} • ${membrosCount ? `${membrosCount} membros` : `0 membros`}</div>
                </div>
                <button class="btn-abrir-grupo" onclick="event.stopPropagation(); abrirGrupo('${id || ""}')">Abrir</button>
              </div>
            `;
        };

        // Preferir Supabase
        if (window.supabase) {
            // 1) tentar contains (json/array)
            let res = await window.supabase
                .from('comunidades')
                .select('*')
                .contains('membros', [uid]);

            // 2) fallback caso seja array literal
            if (res.error) {
                const literal = `{"${uid}"}`;
                res = await window.supabase
                    .from('comunidades')
                    .select('*')
                    .filter('membros', 'cs', literal);
            }

            if (res.error) throw res.error;

            const list = (res.data || []).map(c => ({ ...c, id: c.id || c.comunidade_id || c.uuid }));
            if (!list.length) {
                container.innerHTML = `<div style="padding:18px; color:#777;">Você ainda não participa de nenhum grupo.</div>`;
                return;
            }
            container.innerHTML = list.map(renderItem).join('');
            return;
        }

        // Fallback Firestore
        const q = query(collection(db, "comunidades"), where("membros", "array-contains", uid));
        const snap = await getDocs(q);

        if (!snap || snap.empty) {
            container.innerHTML = `<div style="padding:18px; color:#777;">Você ainda não participa de nenhum grupo.</div>`;
            return;
        }

        let html = "";
        snap.forEach((doc) => {
            const comm = doc.data();
            comm.id = doc.id;
            html += renderItem(comm);
        });
        container.innerHTML = html;

    } catch (e) {
        console.error("Erro meus grupos:", e);
        container.innerHTML = `<div style="padding:18px; color:#999;">Erro ao carregar seus grupos.</div>`;
    }
}
// 4. Envio de Texto
window.enviarMensagemTexto = async function() {
    const input = document.getElementById('inputMsg');
    const texto = input.value.trim();
    if (!texto) return;

    input.value = "";
    enviarParaFirestore({ texto: texto, tipo: 'texto' });
}

window.verificarEnter = function(e) {
    if (e.key === 'Enter') window.enviarMensagemTexto();
}

// 5. Lógica de Gravação de Áudio
window.iniciarGravacao = async function() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        window.mediaRecorder = new MediaRecorder(stream);
        window.audioChunks = [];

        window.mediaRecorder.ondataavailable = event => {
            window.audioChunks.push(event.data);
        };

        window.mediaRecorder.start();
        
        // UI
        document.getElementById('uiGravando').style.display = 'flex';
        let segundos = 0;
        document.getElementById('timerGravacao').innerText = "00:00";
        window.timerInterval = setInterval(() => {
            segundos++;
            const mins = Math.floor(segundos / 60).toString().padStart(2, '0');
            const secs = (segundos % 60).toString().padStart(2, '0');
            document.getElementById('timerGravacao').innerText = `${mins}:${secs}`;
        }, 1000);

    } catch (err) {
        console.error("Erro mic:", err);
        alert("Permita o uso do microfone para gravar.");
    }
}

window.cancelarGravacao = function() {
    if (window.mediaRecorder) {
        window.mediaRecorder.stop();
        window.mediaRecorder.stream.getTracks().forEach(track => track.stop()); // Libera mic
    }
    clearInterval(window.timerInterval);
    document.getElementById('uiGravando').style.display = 'none';
    window.audioChunks = [];
}

window.enviarAudio = function() {
    if (!window.mediaRecorder) return;

    window.mediaRecorder.stop();
    window.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    clearInterval(window.timerInterval);
    document.getElementById('uiGravando').style.display = 'none';

    window.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(window.audioChunks, { type: 'audio/mp3' });
        
        // Upload para Firebase Storage
        const user = auth.currentUser;
        const filename = `audios/${user.uid}/${Date.now()}.mp3`;
        const storageRef = ref(storage, filename);
        
        try {
            // Toast de "Enviando..."
            const btnEnviar = document.querySelector('.btn-enviar-msg');
            const originalIcon = btnEnviar.innerHTML;
            btnEnviar.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i>";

            const snapshot = await uploadBytes(storageRef, audioBlob);
            const downloadUrl = await getDownloadURL(snapshot.ref);

            await enviarParaFirestore({
                tipo: 'audio',
                url: downloadUrl,
                texto: "Mensagem de áudio"
            });

            btnEnviar.innerHTML = originalIcon;

        } catch (e) {
            console.error("Erro upload audio:", e);
            alert("Erro ao enviar áudio.");
        }
    };
}

// 6. Função Genérica de Envio ao Firestore
async function enviarParaFirestore(dadosMsg) {
    const user = auth.currentUser;
    if (!user || !window.chatIdAtual) return;

    const msgData = {
        ...dadosMsg,
        senderUid: user.uid,
        timestamp: new Date(),
        lido: false
    };

    try {
        // Tenta salvar na coleção 'conversas'
        // Se o chat for do tipo 'pedido' (legado), precisamos tratar diferente ou migrar.
        // Por simplicidade, tentamos salvar onde a gente leu (seja conversa ou pedido)
        
        // Mas a forma correta é saber qual coleção estamos usando.
        // Vamos tentar 'conversas' primeiro.
        const chatRef = doc(db, "conversas", window.chatIdAtual);
        
        // Verifica se existe em conversas
        const docSnap = await getDoc(chatRef);
        
        let collectionName = "conversas";
        if (!docSnap.exists()) {
            // Se não existe em conversas, deve ser um pedido legado
            collectionName = "pedidos";
        }

        await addDoc(collection(db, collectionName, window.chatIdAtual, "mensagens"), msgData);

        // Atualiza 'ultimaMensagem' para a lista ficar atualizada
        if (collectionName === "conversas") {
            await updateDoc(chatRef, {
                ultimaMensagem: dadosMsg.texto || "Áudio",
                tipoUltimaMsg: dadosMsg.tipo,
                dataAtualizacao: new Date().toISOString()
            });
        }

    } catch (e) {
        console.error("Erro ao enviar msg:", e);
    }
}

// 7. Player de Áudio Simples
window.tocarAudio = function(btn, url) {
    const audio = new Audio(url);
    const icon = btn.querySelector('i');
    
    if (btn.classList.contains('playing')) {
        // Se já está tocando, não faz nada ou pausa (impl. simples toca do zero)
        return; 
    }

    icon.classList.remove('bx-play');
    icon.classList.add('bx-stop');
    btn.classList.add('playing');

    audio.play();

    audio.onended = () => {
        icon.classList.add('bx-play');
        icon.classList.remove('bx-stop');
        btn.classList.remove('playing');
    };
}

// 8. Apagar Conversa
window.toggleChatMenu = function() {
    const menu = document.getElementById('menuChatOptions');
    menu.classList.toggle('active');
}

window.apagarConversaAtual = async function() {
    if(!confirm("Tem certeza que deseja apagar esta conversa? Isso não apaga para a outra pessoa.")) return;
    
    // Firestore não deleta subcoleções automaticamente. 
    // Para simplificar: Vamos remover o usuário da lista de 'participantes' ou marcar como deletado.
    // Ou simplesmente deletar o documento pai (as mensagens ficam órfãs no banco, mas somem da UI).
    
    try {
        await deleteDoc(doc(db, "conversas", window.chatIdAtual));
        // Se for pedido:
        await deleteDoc(doc(db, "pedidos", window.chatIdAtual));
        
        alert("Conversa apagada.");
        voltarParaPedidos();
        carregarMeusPedidos();
    } catch (e) {
        console.error(e);
        alert("Erro ao apagar.");
    }
}

window.verPerfilAtual = function() {
    if(window.targetUserUid) {
        window.location.href = `ver-perfil.html?uid=${window.targetUserUid}`;
    }
}

window.validarCPF = function(cpf) {
    // Remove tudo que não é dígito
    cpf = cpf.replace(/[^\d]+/g,'');

    if(cpf == '') return false;

    // Elimina CPFs invalidos conhecidos (ex: 111.111.111-11)
    if (cpf.length != 11 || 
        cpf == "00000000000" || 
        cpf == "11111111111" || 
        cpf == "22222222222" || 
        cpf == "33333333333" || 
        cpf == "44444444444" || 
        cpf == "55555555555" || 
        cpf == "66666666666" || 
        cpf == "77777777777" || 
        cpf == "88888888888" || 
        cpf == "99999999999")
            return false;

    // Valida 1o digito
    let add = 0;
    for (let i=0; i < 9; i ++)       
        add += parseInt(cpf.charAt(i)) * (10 - i);  
    let rev = 11 - (add % 11);  
    if (rev == 10 || rev == 11)     
        rev = 0;    
    if (rev != parseInt(cpf.charAt(9)))     
        return false;       

    // Valida 2o digito
    add = 0;
    for (let i = 0; i < 10; i ++)        
        add += parseInt(cpf.charAt(i)) * (11 - i);  
    rev = 11 - (add % 11);  
    if (rev == 10 || rev == 11) 
        rev = 0;    
    if (rev != parseInt(cpf.charAt(10)))
        return false;       

    return true;   
}

window.validarTelefoneBR = function(telefone) {
    // Remove tudo que não for número
    let cleanPhone = telefone.replace(/\D/g, '');

    // Verifica se tem 10 ou 11 dígitos (Fixo ou Celular)
    // DD + Número
    if (cleanPhone.length < 10 || cleanPhone.length > 11) return false;

    // Verifica se o DDD é válido (existem de 11 a 99)
    const ddd = parseInt(cleanPhone.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;

    // Se for celular (11 dígitos), deve começar com 9
    if (cleanPhone.length === 11 && cleanPhone[2] !== '9') {
        return false;
    }

    return true;
}

// ============================================================
// FUNÇÕES DE PREVIEW DE VÍDEO (HOVER)
// ============================================================
const hoverPreviewTimers = new WeakMap();
const HOVER_PREVIEW_DELAY_MS = 900;

window.iniciarPreview = function(card) {
    if (!card) return;
    const srcInput = card.querySelector('.video-src-hidden');
    if (!srcInput) return;
    const videoSrc = srcInput.value;

    // Se não tiver link de vídeo, não faz nada
    if (!videoSrc || videoSrc === "undefined") return;
    if (hoverPreviewTimers.has(card)) return;

    // Garante apenas 1 preview por vez na tela.
    document.querySelectorAll('.tiktok-card').forEach((otherCard) => {
        if (otherCard !== card) {
            window.pararPreview(otherCard);
        }
    });

    const timer = window.setTimeout(() => {
        hoverPreviewTimers.delete(card);

        // Verifica se o vídeo já existe para não criar duplicado
        let video = card.querySelector('.video-preview-hover');

        if (!video) {
            // Cria o elemento de vídeo dinamicamente
            video = document.createElement('video');
            video.src = videoSrc;
            video.className = 'video-preview-hover';
            video.muted = true; // OBRIGATÓRIO: Navegadores só dão autoplay se estiver mudo
            video.loop = true;
            video.playsInline = true;
            
            // Insere o vídeo antes do ícone de play (para ficar embaixo da UI layer)
            const playIcon = card.querySelector('.play-icon');
            if (playIcon) {
                card.insertBefore(video, playIcon);
            } else {
                card.appendChild(video);
            }
        }

        card.classList.add('preview-active');

        // Tenta reproduzir
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // Silencia erro de autoplay bloqueado
            });
        }
    }, HOVER_PREVIEW_DELAY_MS);

    hoverPreviewTimers.set(card, timer);
};

window.pararPreview = function(card) {
    if (!card) return;
    const timer = hoverPreviewTimers.get(card);
    if (timer) {
        clearTimeout(timer);
        hoverPreviewTimers.delete(card);
    }
    card.classList.remove('preview-active');

    const video = card.querySelector('.video-preview-hover');
    if (video) {
        video.pause();
        video.currentTime = 0; // Volta para o início
        video.remove(); // Remove o elemento para economizar memória do navegador
    }
};

// Função para alternar a visibilidade dos campos de endereço
const reelPreviewTimers = new WeakMap();

window.playReelPreview = function(card) {
    const video = card && card.querySelector('video');
    if (!video) return;
    if (reelPreviewTimers.has(video)) return;

    const timer = window.setTimeout(() => {
        reelPreviewTimers.delete(video);
        video.currentTime = 0;
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function(){});
        }
    }, 700);

    reelPreviewTimers.set(video, timer);
}

window.stopReelPreview = function(card) {
    const video = card && card.querySelector('video');
    if (!video) return;
    const timer = reelPreviewTimers.get(video);
    if (timer) {
        window.syncClear();
      clearTimeout(timer);
        reelPreviewTimers.delete(video);
    }
    video.pause();
    video.currentTime = 0;
    if (video.getAttribute("poster") && typeof video.load === "function") {
        video.load();
    }
}

    window.toggleAddressFields = function() {
        const modoAtend = document.querySelector('input[name="modo_atend"]:checked').value;
        const addressContainer = document.getElementById('address-fields-container');
        
        // Se for "Online", esconde. Se for "Presencial" ou "Ambos", mostra.
        if (modoAtend === 'Online') {
            addressContainer.style.display = 'none';
            // Opcional: Limpar os campos ao esconder para não enviar lixo
            // document.getElementById('cep').value = '';
            // document.getElementById('cidade').value = ''; 
            // etc...
        } else {
            addressContainer.style.display = 'block';
        }
    }



    document.addEventListener("DOMContentLoaded", function() {

const paramsChat = new URLSearchParams(window.location.search);
    const idChatUrl = paramsChat.get('chatId');
    
    if (idChatUrl) {
        setTimeout(async () => {
            if(window.abrirChatInterno) {
                // Passamos null no nome/foto pois a função vai buscar no banco
                window.abrirChatInterno(null, idChatUrl, "Carregando...", ""); 
            }
        }, 800);
    }  
        // Adicione isso no final do DOMContentLoaded ou na função de carregarDadosParaEdicao
        if(document.querySelector('input[name="modo_atend"]:checked')) {
             toggleAddressFields();
        }
    });

// EM SCRIPT.JS

window.abrirModalAnalise = async function(idPedido) {
    const modal = document.getElementById('modalOrcamento'); // ID do seu modal
    const corpoModal = document.getElementById('mdBody'); // ID do corpo do modal
    
    if(!modal || !corpoModal) return;
    
    modal.style.display = 'flex';
    corpoModal.innerHTML = "<p>Carregando...</p>";

    try {
        const docSnap = await getDoc(doc(db, "pedidos", idPedido));
        if(!docSnap.exists()) return;
        const dados = docSnap.data();

        // GERA HTML DAS FOTOS
        let htmlFotos = "";
        if(dados.anexos && dados.anexos.length > 0) {
            htmlFotos = `
            <div style="margin-top:15px;">
                <strong style="font-size:0.9rem; color:#666;">Anexos:</strong>
                <div style="display:flex; gap:10px; overflow-x:auto; margin-top:5px;">
                    ${dados.anexos.map(url => `
                        <img src="${url}" onclick="window.open('${url}')" 
                        style="width:60px; height:60px; border-radius:8px; object-fit:cover; cursor:pointer; border:1px solid #ddd;">
                    `).join('')}
                </div>
            </div>`;
        }

        // MONTA O MODAL COMPLETO
        corpoModal.innerHTML = `
            <h3>${dados.servicoReferencia}</h3>
            <p style="color:#555;">${dados.mensagemInicial}</p>
            ${htmlFotos} <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
            
            <div style="display:flex; gap:10px;">
                <button onclick="processarRecusa('${idPedido}')" style="flex:1; padding:10px; background:#fce4ec; color:#c2185b; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">Recusar</button>
                <button onclick="processarAceite('${idPedido}', '${dados.deUid}', '${dados.clienteNome}', '${dados.clienteFoto}')" style="flex:1; padding:10px; background:var(--cor0); color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">Aceitar</button>
            </div>
        `;
    } catch (e) {
        console.error(e);
        corpoModal.innerText = "Erro ao carregar.";
    }
}
window.fecharModalDetalhes = function() {
    document.getElementById('modalDetalhesPedido').style.display = 'none';
}

async function processarAceite(idPedido, dados) {
    if(!await window.dokeConfirm("Aceitar este serviço e liberar o chat?")) return;
    try {
        await updateDoc(doc(db, "pedidos", idPedido), {
            status: "aceito",
            dataAceite: new Date().toISOString(),
            dataAtualizacao: new Date().toISOString()
        });
        fecharModalDetalhes();
        abrirChatInterno(dados.deUid, idPedido, dados.clienteNome, dados.clienteFoto);
    } catch (e) { window.dokeAlert("Erro ao aceitar."); }
}

async function processarRecusa(idPedido) {
    if(!await window.dokeConfirm("Recusar este pedido?", "Atenção")) return;
    try {
        await updateDoc(doc(db, "pedidos", idPedido), { status: "recusado", dataAtualizacao: new Date().toISOString() });
        fecharModalDetalhes();
    } catch (e) { window.dokeAlert("Erro ao recusar."); }
}

window.addEventListener('beforeunload', () => {
    if (auth.currentUser) {
        const userRef = doc(db, "usuarios", auth.currentUser.uid);
        updateDoc(userRef, { status: "Offline" });
    }
});

window.addEventListener('beforeunload', () => {
    const user = window.auth.currentUser;
    if (user) {
        const userRef = doc(window.db, "usuarios", user.uid);
        // Usamos updateDoc aqui, mas em fechamento de aba nem sempre funciona 100% 
        // devido à velocidade do navegador, por isso o botão Sair é o método mais seguro.
        updateDoc(userRef, { status: "Offline" });
    }
});

// ============================================================
// MONITORAMENTO GLOBAL DE NOTIFICAÇÕES (SIDEBAR E MOBILE)
// ============================================================
window.monitorarNotificacoesGlobal = function(uid) {
    if (!uid) return;
    const qRecebidos = query(collection(db, "pedidos"), where("paraUid", "==", uid));
    const qEnviados = query(collection(db, "pedidos"), where("deUid", "==", uid));
    const qSociais = query(collection(db, "notificacoes"), where("parauid", "==", uid), where("lida", "==", false));

    const atualizarBadges = (docsRecebidos, docsEnviados, docsSociais) => {
        let totalNotif = 0;
        let totalChat = 0;

        // ... (lógica de contagem permanece igual) ...
        docsRecebidos.forEach(doc => {
            const data = doc.data();
            const st = data.status;
            if ((st === 'pendente' || st === 'pago' || st === 'finalizado') && !data.notificacaoLidaProfissional) totalNotif++;
            if (st === 'aceito') totalChat++; 
        });
        docsEnviados.forEach(doc => {
            const data = doc.data();
            const st = data.status;
            if ((st === 'aceito' || st === 'recusado') && !data.notificacaoLidaCliente) totalNotif++;
            if (st === 'aceito') totalChat++;
        });
        totalNotif += docsSociais.length;

        // ESTILO UNIFICADO (Vermelho padrão #ff2e63)
        const estiloBadge = `
            position: absolute; top: 5px; right: 5px;
            background: #ff2e63; color: white;
            font-size: 10px; font-weight: bold;
            min-width: 18px; height: 18px;
            border-radius: 50%; display: none;
            align-items: center; justify-content: center;
            border: 2px solid white; z-index: 100;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        // --- ATUALIZA O MENU LATERAL E MOBILE ---
        
        // 1. Badge de NOTIFICAÇÕES (Sininho)
document.querySelectorAll('a[href="notificacoes.html"]').forEach(link => {
            let badge = link.parentNode.querySelector('.badge-sidebar');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge-sidebar';
                badge.style.cssText = estiloBadge;
                // Ajuste para mobile vs desktop
                const parent = link.parentNode.classList.contains('item') ? link.parentNode : link;
                parent.style.position = 'relative';
                parent.appendChild(badge);
            }
            if (totalNotif > 0) { badge.innerText = totalNotif; badge.style.display = 'flex'; } 
            else { badge.style.display = 'none'; }
        });

        
        // 2. Badge de CHAT (Envelope) - Mantém lógica original
document.querySelectorAll('a[href="chat.html"]').forEach(link => {
            let badge = link.parentNode.querySelector('.badge-chat-sidebar');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge-chat-sidebar';
                badge.style.cssText = estiloBadge; // Usa a mesma variável de estilo
                const parent = link.parentNode.classList.contains('item') ? link.parentNode : link;
                parent.style.position = 'relative';
                parent.appendChild(badge);
            }
            if (totalChat > 0) { badge.innerText = totalChat; badge.style.display = 'flex'; } 
            else { badge.style.display = 'none'; }
        });
    };
// ... (restante dos snapshots igual) ...
    let cacheRecebidos = [];
    let cacheEnviados = [];
    let cacheSociais = [];
    onSnapshot(qRecebidos, (snap) => { cacheRecebidos = snap.docs; atualizarBadges(cacheRecebidos, cacheEnviados, cacheSociais); });
    onSnapshot(qEnviados, (snap) => { cacheEnviados = snap.docs; atualizarBadges(cacheRecebidos, cacheEnviados, cacheSociais); });
    onSnapshot(qSociais, (snap) => { cacheSociais = snap.docs; atualizarBadges(cacheRecebidos, cacheEnviados, cacheSociais); });
}

const styleModal = document.createElement('style');
styleModal.innerHTML = `
    .doke-overlay {
        display: none; position: fixed; z-index: 99999; left: 0; top: 0;
        width: 100%; height: 100%; background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px); justify-content: center; align-items: center;
        animation: fadeIn 0.2s;
    }
    .doke-modal {
        background: white; width: 90%; max-width: 400px; border-radius: 16px;
        padding: 25px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        transform: scale(0.9); transition: transform 0.2s;
    }
    .doke-modal.active { transform: scale(1); }
    .doke-modal h3 { margin: 0 0 10px 0; color: #333; font-size: 1.3rem; }
    .doke-modal p { color: #666; margin-bottom: 25px; line-height: 1.5; }
    .doke-btns { display: flex; gap: 10px; justify-content: center; }
    .btn-doke { flex: 1; padding: 12px; border-radius: 8px; border: none; font-weight: 700; cursor: pointer; font-size: 1rem; }
    .btn-doke-ok { background: var(--cor0, #0b7768); color: white; }
    .btn-doke-cancel { background: #f0f0f0; color: #555; }
    
    /* Input customizado para o Prompt */
    .doke-input {
        width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 8px;
        font-size: 1.1rem; margin-bottom: 20px; outline: none; text-align: center;
    }
    .doke-input:focus { border-color: var(--cor0, #0b7768); }

    /* ======================================================
   ESTILO DO MODAL DOKE (Prompt, Alert, Confirm)
   ====================================================== */

/* Fundo escuro com Blur */
.doke-overlay {
    background: rgba(0, 0, 0, 0.6) !important;
    backdrop-filter: blur(8px);
    transition: opacity 0.3s ease;
}

/* A Caixa do Modal */
.doke-modal-box {
    border-radius: 20px !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
    border: 1px solid rgba(255,255,255,0.1);
    font-family: 'Poppins', sans-serif;
    transform: scale(0.95);
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.doke-modal-box.active {
    transform: scale(1);
}

/* Título */
#dmTitle {
    background: white !important;
    color: var(--cor2) !important; /* Azul Doke */
    font-size: 1.2rem;
    padding-top: 25px !important;
    padding-bottom: 10px !important;
    border: none !important;
}

/* Texto do Corpo */
.dm-body {
    padding: 0 25px 20px 25px !important;
    color: #555;
    font-size: 0.95rem;
}

/* O Campo de Input (Onde digita o valor) */
.dm-input {
    background: #f8f9fa;
    border: 2px solid #e0e0e0 !important;
    border-radius: 12px !important;
    padding: 15px !important;
    font-size: 1.5rem !important; /* Letra grande para dinheiro */
    color: var(--cor0) !important; /* Verde Doke */
    font-weight: 700;
    text-align: center;
    transition: all 0.2s;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.03);
}

.dm-input:focus {
    border-color: var(--cor0) !important;
    background: #fff;
    box-shadow: 0 0 0 4px rgba(11, 119, 104, 0.1) !important;
}

.dm-input::placeholder {
    color: #ccc;
    font-weight: 400;
    font-size: 1.1rem;
}

/* Botões */
#btnDmCancel {
    border: none !important;
    background: #f1f3f5 !important;
    color: #777 !important;
    font-weight: 600;
    transition: 0.2s;
}
#btnDmCancel:hover { background: #e9ecef !important; color: #333 !important; }

#btnDmConfirm {
    background: var(--cor0) !important;
    box-shadow: 0 4px 15px rgba(11, 119, 104, 0.3);
    transition: 0.2s;
}
#btnDmConfirm:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(11, 119, 104, 0.4);
}
`;
document.head.appendChild(styleModal);

// Cria o HTML do modal na página
const modalHTML = `
<div id="dokeModalOverlay" class="doke-overlay">
    <div class="doke-modal" id="dokeModalBox">
        <h3 id="dokeTitle">Aviso</h3>
        <p id="dokeMsg">Mensagem</p>
        <div id="dokeInputArea" style="display:none;">
            <input type="text" id="dokeInput" class="doke-input" placeholder="">
        </div>
        <div class="doke-btns">
            <button id="dokeBtnCancel" class="btn-doke btn-doke-cancel">Cancelar</button>
            <button id="dokeBtnOk" class="btn-doke btn-doke-ok">OK</button>
        </div>
    </div>
</div>`;
document.body.insertAdjacentHTML('beforeend', modalHTML);

// ============================================================
// SISTEMA CORRIGIDO: MODAIS, MÁSCARAS E LOGOUT (COPIE TUDO)
// ============================================================

// 1. LOGOUT SEGURO (NÃO APAGA COOKIES)
// ============================================================
// SISTEMA CORRIGIDO: MODAIS, MÁSCARAS E LOGOUT
// ============================================================

// 1. LOGOUT SEGURO
window.fazerLogout = async function() {
    if(await window.dokeConfirm("Tem certeza que deseja sair?", "Sair")) {
        try {
            const user = window.auth.currentUser;
            if (user) {
                // Tenta marcar como offline
                try {
                    const userRef = doc(window.db, "usuarios", user.uid);
                    await updateDoc(userRef, { status: "Offline" });
                } catch(e) { console.log("Offline update skipped"); }
            }
            await window.auth.signOut(); 
            localStorage.removeItem('usuarioLogado');
            localStorage.removeItem('doke_usuario_perfil');
            localStorage.removeItem('doke_uid');
            window.location.href = 'index.html';
        } catch (error) {
            localStorage.removeItem('usuarioLogado');
            window.location.href = 'index.html';
        }
    }
}

// 2. FUNÇÕES GLOBAIS DE PROMISE
window.dokeAlert = (msg, title="Aviso") => new Promise(r => setupDokeModal(title, msg, 'alert', r));
window.dokeConfirm = (msg, title="Confirmação", type="normal") => new Promise(r => setupDokeModal(title, msg, type === 'danger' ? 'confirm-danger' : 'confirm', r));
window.dokePrompt = (msg, placeholder="", title="Informação") => new Promise(r => setupDokeModal(title, msg, 'prompt', r, placeholder));

// 3. LÓGICA UNIFICADA DO MODAL
function setupDokeModal(title, msg, type, resolve, placeholder="") {
    // Garante que o HTML existe
    injetarHtmlModal();

    const overlay = document.getElementById('dokeGlobalModal');
    const box = overlay.querySelector('.doke-modal-box');
    const elTitle = document.getElementById('dmTitle');
    const elMsg = document.getElementById('dmText');
    const inputContainer = document.querySelector('.dm-body');
    const btnCancel = document.getElementById('btnDmCancel');
    const btnConfirm = document.getElementById('btnDmConfirm');

    // Reset Visual
    elTitle.innerText = title;
    elMsg.innerText = msg;
    btnCancel.style.display = (type === 'alert') ? 'none' : 'block';
    
    // Estilo do botão de confirmação
    if (type === 'confirm-danger') {
        btnConfirm.style.background = '#e74c3c';
        btnConfirm.innerText = "Sim, remover";
    } else {
        btnConfirm.style.background = '#0b7768';
        btnConfirm.innerText = (type === 'prompt' || type === 'alert') ? "OK" : "Sim";
    }

    // --- RECRIA O INPUT (Para limpar máscaras antigas) ---
    const oldInput = inputContainer.querySelector('input');
    if(oldInput) oldInput.remove();

    const input = document.createElement('input');
    input.type = 'text'; // Mantém text para permitir "R$"
    input.className = 'dm-input'; // Usa a classe CSS injetada
    input.style.display = (type === 'prompt') ? 'block' : 'none';
    input.style.width = "100%";
    input.style.marginTop = "15px";
    input.style.padding = "10px";
    input.style.fontSize = "1.2rem";
    input.style.fontWeight = "bold";
    input.style.textAlign = "center";
    input.style.border = "1px solid #ddd";
    input.style.borderRadius = "8px";
    input.autocomplete = "off";
    inputContainer.appendChild(input);

    // --- MÁSCARA DE DINHEIRO INTELIGENTE ---
    if(type === 'prompt') {
        input.placeholder = placeholder;
        
        // Se for valor monetário (detectado pelo título ou placeholder)
        const isMoney = placeholder.includes("R$") || title.toLowerCase().includes("valor") || title.toLowerCase().includes("cobranca") || title.toLowerCase().includes("cobrança");
        const isParcela = title.toLowerCase().includes("parcela");

        if (isMoney) {
            input.setAttribute('inputmode', 'numeric');
            
            // Função de formatação (Estilo ATM: digita 23 vira 0,23)
            const formatarMoeda = (val) => {
                let v = val.replace(/\D/g, ""); // Remove tudo que não é número
                if (v === "") return "";
                v = (parseInt(v) / 100).toFixed(2) + "";
                v = v.replace(".", ",");
                v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
                return "R$ " + v;
            };

            input.addEventListener('input', function(e) {
                this.value = formatarMoeda(this.value);
            });
        } else if (isParcela) {
            input.setAttribute('inputmode', 'numeric');
            input.addEventListener('input', function() {
                this.value = this.value.replace(/\D/g, "");
            });
        }
    }

    // Exibe o modal
    overlay.style.display = 'flex';
    if(type === 'prompt') setTimeout(() => input.focus(), 100);

    // --- HANDLERS DOS BOTÕES (Clonagem para remover listeners antigos) ---
    const newConfirm = btnConfirm.cloneNode(true);
    const newCancel = btnCancel.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newConfirm, btnConfirm);
    btnCancel.parentNode.replaceChild(newCancel, btnCancel);

    newConfirm.onclick = () => {
        overlay.style.display = 'none';
        resolve(type === 'prompt' ? input.value : true);
    };

    newCancel.onclick = () => {
        overlay.style.display = 'none';
        resolve(type === 'prompt' ? null : false);
    };
}

// Garante que o HTML base do modal exista na página
function injetarHtmlModal() {
    if (document.getElementById('dokeGlobalModal')) return;
    
    // Injeta CSS se necessário
    if (!document.getElementById('modal-styles-injected')) {
        const style = document.createElement('style');
        style.id = 'modal-styles-injected';
        style.innerHTML = `
            .doke-input:focus { border-color: #0b7768; outline: none; background: #f9f9f9; }
        `;
        document.head.appendChild(style);
    }

    const html = `
    <div id="dokeGlobalModal" class="doke-overlay" style="display:none; position:fixed; z-index:99999; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); backdrop-filter:blur(3px); align-items:center; justify-content:center;">
        <div class="doke-modal-box" style="background:#fff; width:90%; max-width:400px; border-radius:15px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.3); animation: zoomIn 0.2s;">
            <div style="padding:15px 20px; background:#f8f9fa; border-bottom:1px solid #eee; font-weight:bold; color:#333; font-size:1.1rem;" id="dmTitle">Aviso</div>
            <div class="dm-body" style="padding:25px; color:#555;">
                <p id="dmText" style="margin:0; margin-bottom:10px; font-size:1rem;">Mensagem</p>
                </div>
            <div style="padding:15px; background:#fff; display:flex; gap:10px; justify-content:flex-end; border-top:1px solid #f0f0f0;">
                <button id="btnDmCancel" style="padding:10px 20px; border:1px solid #ddd; background:white; border-radius:8px; cursor:pointer; font-weight:600; color:#666;">Cancelar</button>
                <button id="btnDmConfirm" style="padding:10px 20px; border:none; background:#0b7768; color:white; border-radius:8px; cursor:pointer; font-weight:bold;">OK</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}
// ============================================================
// 14. SISTEMA DE STATUS ONLINE/OFFLINE (Adicione/Substitua no final do script.js)
// ============================================================

// Função para marcar como Online
window.marcarComoOnline = async function(uid) {
    try {
        const userRef = doc(db, "usuarios", uid);
        await updateDoc(userRef, { 
            status: "Online",
            ultimaVezOnline: new Date().toISOString()
        });
    } catch (e) { console.error("Erro status online:", e); }
};

// Função para marcar como Offline
window.marcarComoOffline = async function(uid) {
    try {
        const userRef = doc(db, "usuarios", uid);
        await updateDoc(userRef, { 
            status: "Offline",
            ultimaVezOnline: new Date().toISOString()
        });
    } catch (e) { console.error("Erro status offline:", e); }
};

document.addEventListener("DOMContentLoaded", function() {
    // ... seus outros códigos de inicialização ...

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // 1. Assim que detecta login, marca como Online
            window.marcarComoOnline(user.uid);

            // 2. Se a aba ficar visível novamente, reforça o Online
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === 'visible') {
                    window.marcarComoOnline(user.uid);
                }
            });

            // 3. Ao fechar a aba ou atualizar, marca como Offline
            window.addEventListener('beforeunload', () => {
                // O navigator.sendBeacon é mais confiável para fechamento de aba
                // Mas como estamos usando Firestore SDK, tentamos o update padrão:
                window.marcarComoOffline(user.uid);
            });

            // Restante da sua lógica de login...
            localStorage.setItem('usuarioLogado', 'true');
            // ...
        }
    });
});


window.gerarPagamento = async function() {
    const idParaSalvar = chatIdAtual; 
    if (!idParaSalvar) { alert("Erro: Nenhuma conversa aberta."); return; }

    let valorStr = await window.dokePrompt("Qual o valor do serviço?", "R$ 0,00", "Gerar Cobrança");
    if(!valorStr) return;

    let descricao = await window.dokePrompt("Descrição do serviço:", "Ex: Mão de obra", "Descrição");
    if(!descricao) return;

    let maxParcelas = await window.dokePrompt("Máx. parcelas sem juros (1-12):", "1", "Parcelamento");
    if(!maxParcelas) maxParcelas = "1";

    const perfil = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};

    try {
        // Salva a mensagem no chat
        await addDoc(collection(db, "pedidos", idParaSalvar, "mensagens"), { 
            tipo: 'pagamento', 
            valor: valorStr, 
            descricao: descricao,
            maxParcelas: parseInt(maxParcelas.replace(/\D/g, "")) || 1, 
            usernameProfissional: perfil.user, 
            senderUid: auth.currentUser.uid, 
            timestamp: new Date() 
        });

        // --- ADICIONE ESTA LINHA ABAIXO PARA A CARTEIRA FUNCIONAR ---
        // Salva o valor no pedido principal para a carteira conseguir ler
        await updateDoc(doc(db, "pedidos", idParaSalvar), { 
            valorFinal: valorStr 
        });
        // -----------------------------------------------------------

    } catch(e) {
        console.error(e);
        alert("Erro ao criar cobrança.");
    }
};

// ============================================================
// FUNÇÕES ATUALIZADAS (Seguir + Foto Perfil)
// ============================================================

window.togglePlayVideo = function(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const video = document.getElementById('playerPrincipal');
    const icon = document.getElementById('iconPlayPause');
    const frame = document.querySelector('.video-frame');
    
    // ATUALIZA A FOTO DO BOTÃO PERFIL IGUAL A DO VÍDEO
    const avatarVideo = document.getElementById('tiktokAvatarImg');
    const btnProfile = document.getElementById('btnProfileImg');
    if(avatarVideo && btnProfile) {
        btnProfile.src = avatarVideo.src;
    }

    if (!video) return;

    if (video.paused) {
        video.play().then(() => {
            if(frame) frame.classList.remove('paused');
            if(icon) icon.style.opacity = '0';
        }).catch(err => console.log(err));
    } else {
        video.pause();
        if(frame) frame.classList.add('paused');
        if(icon) icon.style.opacity = '1';
    }
}

// NOVA FUNÇÃO: SEGUIR
window.toggleFollow = function(event, btn) {
    if(event) {
        event.stopPropagation(); // Não clica no perfil, só no seguir
    }
    
    // Lógica simples de alternar
    if (btn.innerText.includes("Seguir")) {
        btn.innerText = "• Seguindo";
        btn.classList.add("seguindo");
        btn.style.opacity = "0.7";
    } else {
        btn.innerText = "• Seguir";
        btn.classList.remove("seguindo");
        btn.style.opacity = "1";
    }
}

// (Mantenha as outras funções fecharPlayerVideo, etc.)
window.fecharPlayerVideo = function() {
    const modal = document.getElementById('modalPlayerVideo');
    const video = document.getElementById('playerPrincipal');
    
    if(video) {
        video.pause();
        video.currentTime = 0;
    }
    
    if(modal) {
        modal.style.display = 'none';
    }
}

window.handleDoubleClick = function(event) {
    if(event) event.stopPropagation();
    // (Lógica do coração igual a anterior...)
    const wrapper = event.currentTarget;
    const heart = document.createElement('i');
    heart.className = 'bx bxs-heart';
    heart.style.position = 'absolute';
    heart.style.color = '#fe2c55';
    heart.style.left = event.offsetX + 'px';
    heart.style.top = event.offsetY + 'px';
    heart.style.fontSize = '80px';
    heart.style.transform = 'translate(-50%, -50%) rotate(-15deg)';
    heart.style.zIndex = '100';
    heart.style.pointerEvents = 'none';
    heart.style.transition = 'all 0.8s ease-out';
    wrapper.appendChild(heart);
    requestAnimationFrame(() => {
        heart.style.top = (event.offsetY - 150) + 'px';
        heart.style.opacity = '0';
    });
    setTimeout(() => heart.remove(), 800);
    const btnLike = document.querySelector('.actions-column .action-btn'); 
    if(btnLike && window.toggleLikeTikTok) window.toggleLikeTikTok(btnLike);
}

// ============================================================
// LÓGICA DE COMENTÁRIOS (NOVO)
// ============================================================

// 1. Abrir/Fechar a Caixa
window.toggleComentarios = function() {
    const box = document.getElementById('boxComentarios');
    // Se estiver visível, esconde. Se invisível, mostra (flex)
    if (box.style.display === 'none' || box.style.display === '') {
        box.style.display = 'flex';
        // Tenta focar no input
        setTimeout(() => document.getElementById('inputNovoComentario').focus(), 100);
    } else {
        box.style.display = 'none';
    }
}

// 2. Atualize a função antiga do botão para chamar essa nova
window.abrirComentarios = function() {
    toggleComentarios(); 
}

// 3. Postar Comentário (Adiciona na lista visualmente)
window.postarComentario = function() {
    const input = document.getElementById('inputNovoComentario');
    const texto = input.value;
    const lista = document.getElementById('listaComentariosReais');

    if (texto.trim() === "") return;

    // Cria o HTML do novo comentário
    const novoHTML = `
        <div class="comment-item" style="animation: slideUpFade 0.3s ease;">
            <img src="https://placehold.co/40" class="comment-avatar">
            <div class="comment-content">
                <span class="comment-user">voce</span>
                <p class="comment-text">${texto}</p>
                <div class="comment-meta">
                    <span>agora</span>
                    <span>Excluir</span>
                </div>
            </div>
            <i class='bx bx-heart comment-like'></i>
        </div>
    `;

    // Adiciona no topo da lista
    lista.insertAdjacentHTML('afterbegin', novoHTML);
    
    // Limpa o input
    input.value = "";
    
    // Rola para o topo
    lista.scrollTop = 0;
}

// 4. Permitir postar com ENTER
window.checarEnter = function(event) {
    if (event.key === 'Enter') {
        postarComentario();
    }
}

// ============================================================
// FUNÇÃO PARA COPIAR A FOTO DO CRIADOR PARA O BOTÃO
// ============================================================

function sincronizarFotoPerfil() {
    // 1. Pega a foto do criador (lá embaixo, no rodapé do vídeo)
    const imgCriador = document.getElementById('tiktokAvatarImg');
    
    // 2. Pega a imagem do botão lateral
    const imgBotao = document.getElementById('btnProfileImg');

    // 3. Se as duas existirem, copia o link de uma para a outra
    if (imgCriador && imgBotao) {
        imgBotao.src = imgCriador.src;
    }
}

// Atualize a função togglePlayVideo para chamar essa sincronização
window.togglePlayVideo = function(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    // --- CHAMA A SINCRONIZAÇÃO AQUI ---
    sincronizarFotoPerfil(); 
    // ----------------------------------

    const video = document.getElementById('playerPrincipal');
    const icon = document.getElementById('iconPlayPause');
    const frame = document.querySelector('.video-frame');

    if (!video) return;

    if (video.paused) {
        video.play().then(() => {
            if(frame) frame.classList.remove('paused');
            if(icon) icon.style.opacity = '0';
        }).catch(err => console.log(err));
    } else {
        video.pause();
        if(frame) frame.classList.add('paused');
        if(icon) icon.style.opacity = '1';
    }
}

// ============================================================
// CARREGAR DADOS DO USUÁRIO LOGADO (APENAS PARA COMENTÁRIOS)
// ============================================================

function carregarDadosUsuarioNoPlayer() {
    // 1. Pega os dados do seu login salvo
    const dadosLocal = localStorage.getItem('doke_usuario_perfil');
    
    if (dadosLocal) {
        const usuario = JSON.parse(dadosLocal);
        const fotoReal = usuario.foto || "https://placehold.co/150";

        // 2. Atualiza APENAS a foto do input de comentários (Essa sim é você)
        const imgInputComent = document.querySelector('.my-avatar-mini');
        if (imgInputComent) {
            imgInputComent.src = fotoReal;
        }

        // OBS: Não alteramos mais #tiktokAvatarImg ou #btnProfileImg aqui.
        // Quem define a foto do vídeo é a função que cria o Feed (criarHTMLVideo).
    }
}

// Executa assim que a página carregar
document.addEventListener('DOMContentLoaded', () => {
    carregarDadosUsuarioNoPlayer();
    // Se existir a função antiga sincronizarFotoPerfil, evitamos erros se ela não estiver definida
    if (typeof sincronizarFotoPerfil === "function") {
        sincronizarFotoPerfil();
    }
});

// ============================================================
// CONTROLE DE PLAY/PAUSE
// ============================================================

window.togglePlayVideo = function(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    // Garante que sua foto esteja certa no input de comentários
    carregarDadosUsuarioNoPlayer();

    const video = document.getElementById('playerPrincipal');
    const icon = document.getElementById('iconPlayPause');
    const frame = document.querySelector('.video-frame');

    if (!video) return;

    if (video.paused) {
        video.play().then(() => {
            if(frame) frame.classList.remove('paused');
            if(icon) icon.style.opacity = '0';
        }).catch(err => console.log("Erro ao dar play:", err));
    } else {
        video.pause();
        if(frame) frame.classList.add('paused');
        if(icon) icon.style.opacity = '1';
    }
}
// ============================================================
// LÓGICA DE FEED (SCROLL INFINITO)
// ============================================================

let videosNoFeed = []; // Guarda os dados dos vídeos carregados
let observerFeed = null; // Observador de scroll

// ============================================================
// 1. CARREGA O FEED (COM PROTEÇÃO CONTRA VÍDEOS ANTIGOS)
// ============================================================

window.abrirFeedVideos = async function(idInicial) {
    const modal = document.getElementById('modalPlayerVideo');
    const container = document.getElementById('containerFeedScroll');
    
    if(!modal || !container) return;
    
    modal.style.display = 'flex';
    container.innerHTML = '<div style="color:white; display:flex; height:100vh; align-items:center; justify-content:center;"><i class="bx bx-loader-alt bx-spin" style="font-size:2rem;"></i></div>';

    try {
        const q = query(collection(db, "trabalhos"), orderBy("data", "desc"));
        const snapshot = await getDocs(q);
        
        const promessasVideos = snapshot.docs.map(async (docSnap) => {
            const dataVideo = docSnap.data();
            const videoId = docSnap.id;
            let criadorUid = dataVideo.uid; 

            // Dados Padrão (Fallback)
            let fotoFinal = "https://placehold.co/150"; 
            let nomeFinal = "Usuário Doke";
            let userFinal = "@usuario";

            // Se tiver UID, busca dados frescos do usuário
            if (criadorUid) {
                try {
                    const docRefUser = doc(db, "usuarios", criadorUid);
                    const docUserSnap = await getDoc(docRefUser);
                    if (docUserSnap.exists()) {
                        const dadosUser = docUserSnap.data();
                        if (dadosUser.foto) fotoFinal = dadosUser.foto;
                        if (dadosUser.nome) nomeFinal = dadosUser.nome;
                        if (dadosUser.user) userFinal = dadosUser.user;
                    }
                } catch (err) { console.error("Erro user:", err); }
            } else {
                // Tenta salvar vídeos antigos que não têm UID (opcional)
                // console.log("Vídeo antigo sem UID:", videoId);
            }

            return {
                id: videoId,
                ...dataVideo,
                autorFoto: fotoFinal,
                autorNome: nomeFinal,
                autorUser: userFinal,
                uid: criadorUid // Pode ser undefined em vídeos antigos
            };
        });

        videosNoFeed = await Promise.all(promessasVideos);

        if (videosNoFeed.length === 0) {
            container.innerHTML = '<div style="color:white; display:flex; height:100vh; align-items:center; justify-content:center;">Nenhum vídeo encontrado.</div>';
            return;
        }

        container.innerHTML = '';
        videosNoFeed.forEach(video => {
            const htmlItem = criarHTMLVideo(video);
            container.insertAdjacentHTML('beforeend', htmlItem);
        });

        if (idInicial) {
            setTimeout(() => {
                const elInicial = document.getElementById(`feed-item-${idInicial}`);
                if (elInicial) elInicial.scrollIntoView();
            }, 100);
        }

        iniciarObservadorScroll();

    } catch (e) {
        console.error("Erro feed:", e);
        container.innerHTML = '<div style="color:white; text-align:center; margin-top:50vh;">Erro ao carregar.</div>';
    }
}
// ============================================================
// 2. GERA HTML (COM FUNÇÃO SEGURA DE NAVEGAÇÃO)
// ============================================================

function criarHTMLVideo(dados) {
    // Esconde botão seguir se for o próprio dono
    const userLogado = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
    const meuUser = (userLogado.user || "").trim().toLowerCase();
    const donoVideo = (dados.autorUser || "").trim().toLowerCase(); 
    const displaySeguir = (meuUser === donoVideo) ? 'none' : 'inline-block';

    // Garante uma imagem válida
    const imagemSegura = dados.autorFoto && dados.autorFoto.trim() !== "" ? dados.autorFoto : "https://placehold.co/150";

    // UID seguro (se não tiver, passa string vazia)
    const uidSeguro = dados.uid || "";

    return `
    <div class="reels-item" id="feed-item-${dados.id}">
        <div class="reels-layout">
            
            <div class="video-frame">
                <video class="video-player-feed" loop playsinline src="${dados.videoUrl}"></video>
                
                <div class="video-info-overlay">
                    <div class="author-row" onclick="irParaPerfil('${uidSeguro}')" style="cursor: pointer;">
                        <img src="${imagemSegura}" class="author-avatar" onerror="this.src='https://placehold.co/150'">
                        <span class="author-name">${dados.autorNome}</span>
                        <span class="btn-follow-text" style="display:${displaySeguir}" onclick="toggleFollow(event, this)">• Seguir</span>
                    </div>
                    <div class="video-caption">${dados.descricao || ''}</div>
                </div>
            </div>

            <div class="actions-column">
                
                <button class="action-btn" onclick="irParaPerfil('${uidSeguro}')">
                    <div class="icon-circle-img">
                        <img src="${imagemSegura}" onerror="this.src='https://placehold.co/150'">
                    </div>
                    <span class="action-label">Perfil</span>
                </button>

                <button class="action-btn" onclick="toggleLikeTikTok(this)">
                    <div class="icon-circle"><i class='bx bx-heart'></i></div>
                    <span class="action-label">Curtir</span>
                    <span class="action-count">${dados.likes || 0}</span>
                </button>

                <button class="action-btn" onclick="toggleComentarios()">
                    <div class="icon-circle"><i class='bx bx-message-rounded-dots'></i></div>
                    <span class="action-label">Comentar</span>
                </button>

                <button class="action-btn" onclick="compartilharVideo()">
                    <div class="icon-circle"><i class='bx bx-share-alt'></i></div>
                    <span class="action-label">Enviar</span>
                </button>

                <button class="action-btn" onclick="irParaOrcamento('${uidSeguro}')">
                    <div class="icon-circle circle-green"><i class='bx bx-dollar'></i></div>
                    <span class="action-label">Orçar</span>
                </button>
            </div>
        </div>
    </div>
    `;
}

window.irParaPerfil = function(uid) {
    if (!uid || uid === "undefined" || uid === "null") {
        alert("Perfil indisponível ou vídeo antigo.");
        return;
    }
    // Redireciona corretamente
    window.location.href = `perfil-profissional.html?uid=${uid}`;
}

window.irParaOrcamento = function(uid) {
    if (!uid || uid === "undefined") {
        alert("Não é possível solicitar orçamento para este vídeo.");
        return;
    }
    window.location.href = `orcamento.html?uid=${uid}`;
}

// 3. O Segredo do Scroll: IntersectionObserver
function iniciarObservadorScroll() {
    if (observerFeed) observerFeed.disconnect();

    const opcoes = {
        root: document.getElementById('containerFeedScroll'),
        threshold: 0.6 // Dispara quando 60% do vídeo estiver visível
    };

    observerFeed = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (!video) return;

            if (entry.isIntersecting) {
                // Vídeo apareceu na tela: PLAY
                video.play().catch(e => console.log("Autoplay bloqueado pelo browser"));
            } else {
                // Vídeo saiu da tela: PAUSE e RESET
                video.pause();
                video.currentTime = 0;
            }
        });
    }, opcoes);

    // Observa todos os itens gerados
    document.querySelectorAll('.reels-item').forEach(item => {
        observerFeed.observe(item);
    });
}

// 4. Atualizar a função de fechar
window.fecharPlayerVideo = function() {
    const modal = document.getElementById('modalPlayerVideo');
    if(modal) modal.style.display = 'none';
    
    // Pausa tudo
    document.querySelectorAll('video').forEach(v => v.pause());
    
    // Desliga o observador para economizar memória
    if (observerFeed) observerFeed.disconnect();
}

// Variáveis Globais de Controle
window.currentPostId = null;
window.currentCollection = null;
window.currentPostAuthorUid = null; // <--- NOVO: Para identificar o criador
window.currentPostSource = "firebase";
window.currentSupaPublicacaoId = null;
window.currentSupaPublicacaoAuthorId = null;
window.currentSupaPublicacaoAuthorUid = null;
let processandoLike = false; // Trava para evitar cliques rápidos

function ensureModalPostDetalhe() {
    const modalExistente = document.getElementById('modalPostDetalhe');
    if (modalExistente) {
        const jaTemBotao = modalExistente.querySelector('.btn-close-modal-fixed');
        const modalContent = modalExistente.querySelector('.modal-content');
        if (!jaTemBotao && modalContent) {
            modalContent.insertAdjacentHTML('afterbegin', '<button type="button" class="btn-close-modal btn-close-modal-fixed" aria-label="Fechar publicacao" onclick="fecharModalPostForce()">×</button>');
        }
        return;
    }
    const modalHtml = `
    <div id="modalPostDetalhe" class="modal-overlay" onclick="fecharModalPost(event)">
        <div class="modal-content" onclick="event.stopPropagation()">
            <button type="button" class="btn-close-modal btn-close-modal-fixed" aria-label="Fechar publicacao" onclick="fecharModalPostForce()">×</button>
            <div class="modal-media-area" id="modalMediaContainer"></div>
            <div class="modal-info-area">
                <div class="modal-header">
                    <div class="modal-author-info" style="display: flex; align-items: center; gap: 10px;">
                        <img id="modalAvatar" src="" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                        <div style="font-weight: bold; font-size: 0.95rem;" id="modalUsername">User</div>
                    </div>
                </div>
                <div class="modal-comments-section" id="modalCommentsList">
                    <div id="modalCaption" style="font-size: 0.9rem; margin-bottom: 20px;"></div>
                </div>
                <div class="modal-footer-actions">
                    <div class="modal-actions-bar" style="display: flex; gap: 15px; font-size: 1.6rem; margin-bottom: 10px;">
                        <i class='bx bx-heart' id="btnLikeModalIcon" onclick="darLikeModal()" style="cursor:pointer;"></i>
                        <i class='bx bx-message-rounded' onclick="document.getElementById('inputComentarioModal').focus()" style="cursor:pointer;"></i>
                        <i class='bx bx-paper-plane' onclick="compartilharPostAtual()" style="cursor:pointer;"></i>
                    </div>
                    <span id="modalLikesCount" style="display: block; font-weight: bold; font-size: 0.9rem; margin-bottom: 10px;">0 curtidas</span>
                    <div style="display: flex; gap: 10px; border-top: 1px solid #efefef; padding-top: 15px; margin-top: 10px;">
                        <input type="text" id="inputComentarioModal" placeholder="Adicione um comentário..." style="flex:1; border:none; outline:none; font-size:0.9rem;">
                        <button onclick="postarComentarioModal()" style="background:none; border:none; color:#0b7768; font-weight:bold; cursor:pointer;">Publicar</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function getRelatedCount(value) {
    return (Array.isArray(value) ? value[0]?.count : value?.count) || 0;
}

async function fetchSupabasePublicacaoById(publicacaoId) {
    const client = getSupabaseClient();
    if (!client) return null;
    let lastError = null;
    let attempts = 0;
    let lastStatusKey = null;
    while (attempts < 6) {
        const joinAllowed = window._dokePublicacoesJoinStatus !== false;
        const socialAllowed = window._dokePublicacoesSocialStatus !== false;
        const combos = [];
        if (joinAllowed && socialAllowed) combos.push({ withJoin: true, withSocial: true });
        if (joinAllowed) combos.push({ withJoin: true, withSocial: false });
        if (socialAllowed) combos.push({ withJoin: false, withSocial: true });
        combos.push({ withJoin: false, withSocial: false });

        let statusChanged = false;
        for (const combo of combos) {
            const select = buildPublicacoesSelect(combo);
            const { data, error } = await client
                .from("publicacoes")
                .select(select)
                .eq("id", publicacaoId)
                .maybeSingle();
            if (!error) {
                if (select.includes("usuarios")) window._dokePublicacoesJoinStatus = true;
                if (select.includes("publicacoes_curtidas")) window._dokePublicacoesSocialStatus = true;
                return data;
            }
            lastError = error;
            const beforeKey = publicacoesStatusKey();
            markPublicacoesSelectError(error);
            statusChanged = publicacoesStatusKey() !== beforeKey;
            if (statusChanged) break;
        }

        const currentKey = publicacoesStatusKey();
        if (!statusChanged && currentKey === lastStatusKey) break;
        lastStatusKey = currentKey;
        attempts += 1;
    }
    if (lastError) console.error("Erro ao carregar publicacao:", lastError);
    return null;
}

window.abrirModalPost = async function(id, colecao) {
    ensureModalPostDetalhe();
    window.currentPostSource = "firebase";
    window.currentSupaPublicacaoId = null;
    window.currentSupaPublicacaoAuthorId = null;
    window.currentSupaPublicacaoAuthorUid = null;
    const modal = document.getElementById('modalPostDetalhe');
    const user = auth.currentUser;
    
    if(!modal) return;
    
    // 1. Reset Visual e Exibição
    modal.style.display = 'flex'; 
    window.currentPostId = id;
    window.currentCollection = colecao;
    window.currentPostAuthorUid = null; // Reseta

    // Limpa conteúdos anteriores
    document.getElementById('modalMediaContainer').innerHTML = '<div style="height:100%; display:flex; align-items:center; justify-content:center;"><i class="bx bx-loader-alt bx-spin" style="color:white; font-size:3rem;"></i></div>';
    document.getElementById('modalCommentsList').innerHTML = "";
    
    // Trava o botão de like enquanto carrega
    const iconLike = document.getElementById('btnLikeModalIcon');
    const labelLike = document.getElementById('modalLikesCount');
    iconLike.className = 'bx bx-heart'; // Reseta para vazio
    iconLike.style.color = '';
    iconLike.style.pointerEvents = 'none'; 
    iconLike.style.opacity = '0.5';
    labelLike.innerText = "...";

    try {
        const docRef = doc(db, colecao, id);
        const docSnap = await getDoc(docRef);
        
        if(!docSnap.exists()) {
            console.error("Post não encontrado!");
            fecharModalPostForce();
            return;
        }
        
        const data = docSnap.data();
        window.currentPostAuthorUid = data.uid; // Salva o ID do dono do post

        // --- PREENCHE DADOS NA TELA ---
        
        // Mídia (Foto ou Vídeo)
        const mediaBox = document.getElementById('modalMediaContainer');
        if(data.videoUrl) {
            mediaBox.innerHTML = `<video src="${data.videoUrl}" controls autoplay style="max-width:100%; max-height:100%; object-fit:contain;"></video>`;
        } else {
            mediaBox.innerHTML = `<img src="${data.imagem}" style="max-width:100%; max-height:100%; object-fit:contain;">`;
        }

        // Info Autor
        const modalAvatar = document.getElementById('modalAvatar');
        const modalUsername = document.getElementById('modalUsername');
        const autorHandle = data.autorUser || data.autorNome || "";
        if (modalAvatar) {
            modalAvatar.src = data.autorFoto || "https://placehold.co/50";
            modalAvatar.classList.add('js-user-link');
            modalAvatar.dataset.uid = data.uid || '';
            modalAvatar.dataset.user = autorHandle || '';
        }
        if (modalUsername) {
            modalUsername.innerText = autorHandle;
            modalUsername.classList.add('js-user-link');
            modalUsername.dataset.uid = data.uid || '';
            modalUsername.dataset.user = autorHandle || '';
        }
        labelLike.innerText = `${data.likes || 0} curtidas`;

        // Legenda
        const captionDiv = document.getElementById('modalCaption');
        if(data.texto || data.descricao) {
            const safeUser = (typeof escapeHtml === "function") ? escapeHtml(autorHandle) : autorHandle;
            const safeText = (typeof escapeHtml === "function") ? escapeHtml(data.texto || data.descricao) : (data.texto || data.descricao);
            captionDiv.innerHTML = `<strong class="js-user-link" data-uid="${data.uid || ''}" data-user="${autorHandle || ''}">${safeUser}</strong> ${safeText}`;
            captionDiv.style.display = 'block';
        } else {
            captionDiv.style.display = 'none';
        }

        // Botão Excluir (Só aparece se eu for o dono)
        const btnDel = document.getElementById('btnExcluirModal');
        if (user && data.uid === user.uid) btnDel.style.display = 'block';
        else btnDel.style.display = 'none';

        // --- VERIFICAÇÃO DE LIKE ---
        if (user) {
            await verificarStatusLike(id, colecao, user.uid);
        } else {
            // Se não estiver logado, libera o botão (para pedir login ao clicar)
            iconLike.style.pointerEvents = 'auto';
            iconLike.style.opacity = '1';
        }

        // --- CARREGA COMENTÁRIOS ---
        carregarComentariosNoModal(id, colecao);

    } catch(e) { console.error("Erro modal:", e); }
}
async function carregarComentariosNoModal(id, colecao) {
    const list = document.getElementById('modalCommentsList');
    const user = auth.currentUser;

    const legendaDiv = document.getElementById('modalCaption');
    let legendaHTML = "";
    if (legendaDiv && legendaDiv.style.display !== 'none') {
        legendaHTML = `<div id="modalCaption" style="margin-bottom: 15px; font-size: 0.9rem; color: #333; line-height: 1.4;">${legendaDiv.innerHTML}</div>`;
    }

    list.innerHTML = `${legendaHTML}<div style="padding:10px; text-align:center; color:#999;"><i class="bx bx-loader-alt bx-spin"></i></div>`;

    try {
        const q = query(collection(db, colecao, id, "comentarios"), orderBy("data", "asc"));
        const snapshot = await getDocs(q);

        list.innerHTML = legendaHTML;

        if (snapshot.empty) {
            list.insertAdjacentHTML('beforeend', '<p style="color:#999; font-size:0.8rem; margin-top:10px; text-align:center;">Nenhum comentario.</p>');
            return;
        }

        const comments = [];
        snapshot.forEach(docSnap => {
            comments.push({ id: docSnap.id, ...docSnap.data() });
        });

        comments.sort((a, b) => {
            const ap = a.pinned === true ? 1 : 0;
            const bp = b.pinned === true ? 1 : 0;
            if (ap !== bp) return bp - ap;
            return new Date(a.data || 0) - new Date(b.data || 0);
        });

        const checks = [];

        comments.forEach(c => {
            const cid = c.id;
            const dataLabel = c.data ? new Date(c.data).toLocaleDateString('pt-BR') : "";
            const isCreator = window.currentPostAuthorUid && c.uid === window.currentPostAuthorUid;
            const isPinned = c.pinned === true;
            const likeCount = c.likeCount || 0;

            const badgeCriador = isCreator ? `<span class="badge-criador">Criador</span>` : "";
            const badgeFixado = isPinned ? `<span class="badge-fixado">Fixado</span>` : "";

            const canPin = user && window.currentPostAuthorUid && user.uid === window.currentPostAuthorUid;
            const btnPin = canPin
                ? `<button class="btn-pin-comment" onclick="alternarFixarComentario('${cid}')">${isPinned ? 'Desafixar' : 'Fixar'}</button>`
                : "";

            const btnExcluir = (user && c.uid === user.uid)
                ? `<button class="btn-delete-comment" onclick="deletarComentario('${cid}')"><i class='bx bx-trash'></i></button>`
                : "";

            const btnReport = (user && c.uid !== user.uid)
                ? `<button class="comment-report-btn" data-comment-id="${cid}" data-parent-id="" data-reply="false" data-comment-uid="${c.uid}" onclick="denunciarComentario('${cid}', '', false)">Denunciar</button>`
                : "";

            const btnLike = `
                <button class="comment-like-btn" data-comment-id="${cid}" data-parent-id="" data-reply="false" onclick="toggleLikeComentario('${cid}', '', false)">
                    <i class='bx bx-heart'></i><span>${likeCount}</span>
                </button>`;

            const uidAttr = c.uid ? `data-uid="${c.uid}"` : "";
            const userAttr = c.user ? `data-user="${c.user}"` : "";

            let btnVerRespostas = "";
            if (c.replyCount && c.replyCount > 0) {
                btnVerRespostas = `
                <div class="toggle-replies-link" onclick="toggleVerRespostas('${cid}', this)">
                    Ver ${c.replyCount} respostas
                </div>`;
            }

            const html = `
            <div class="comment-block ${isPinned ? "comment-pinned" : ""}" id="comm-${cid}" data-comment-id="${cid}">
                <div class="comment-row">
                    <img src="${c.foto}" class="comment-avatar js-user-link" ${uidAttr} ${userAttr} alt="">
                    <div style="flex:1;">
                        <div class="comment-header-row">
                            <div class="comment-header-left">
                                <span class="comment-user-name js-user-link" ${uidAttr} ${userAttr}>${c.user}</span> ${badgeCriador} ${badgeFixado}
                            </div>
                            <div class="comment-header-actions">
                                ${btnPin}
                                ${btnExcluir}
                            </div>
                        </div>
                        <div class="comment-text-content">${c.texto}</div>
                        <div class="comment-meta-row">
                            <span class="comment-date">${dataLabel}</span>
                            <button class="btn-reply-action" onclick="toggleInputResposta('${cid}')">Responder</button>
                            ${btnLike}
                            ${btnReport}
                        </div>
                    </div>
                </div>

                ${btnVerRespostas}

                <div id="replies-${cid}" class="replies-container"></div>

                <div id="input-box-${cid}" class="reply-input-box">
                    <input type="text" id="input-reply-${cid}" placeholder="Sua resposta...">
                    <button onclick="enviarResposta('${cid}')">Enviar</button>
                </div>
            </div>`;
            list.insertAdjacentHTML('beforeend', html);

            if (user) {
                checks.push(verificarLikeComentario(cid, "", false));
                if (c.uid !== user.uid) checks.push(verificarDenunciaComentario(cid, "", false));
            }
        });

        if (checks.length) await Promise.all(checks);
        maybeScrollToModalComment();

    } catch(e) { console.error(e); }
}

function maybeScrollToModalComment() {
    const commentId = window._dokePendingModalCommentId;
    if (!commentId) return;
    const alvo = document.getElementById(`comm-${commentId}`);
    if (!alvo) return;
    if (window._dokePendingModalOpenReplies) {
        const container = document.getElementById(`replies-${commentId}`);
        if (container) {
            container.style.display = "block";
            carregarRespostas(commentId);
        }
    }
    alvo.scrollIntoView({ block: "center" });
    window._dokePendingModalCommentId = null;
    window._dokePendingModalOpenReplies = false;
}

async function carregarComentariosSupabase(publicacaoId) {
    const list = document.getElementById('modalCommentsList');
    if (!list) return;

    const captionDiv = document.getElementById('modalCaption');
    let captionHTML = "";
    if (captionDiv && captionDiv.style.display !== 'none') {
        captionHTML = `<div id="modalCaption" style="margin-bottom: 15px; font-size: 0.9rem; color: #333; line-height: 1.4;">${captionDiv.innerHTML}</div>`;
    }

    list.innerHTML = `${captionHTML}<div style="padding:10px; text-align:center; color:#999;"><i class="bx bx-loader-alt bx-spin"></i></div>`;

    const client = getSupabaseClient();
    if (!client) {
        list.innerHTML = `${captionHTML}<p style="color:#999; font-size:0.8rem; margin-top:10px; text-align:center;">Comentarios indisponiveis.</p>`;
        return;
    }

    let { data, error } = await client
        .from("publicacoes_comentarios")
        .select("id, texto, created_at, user_id, usuarios (id, nome, user, foto)")
        .eq("publicacao_id", publicacaoId)
        .order("created_at", { ascending: true });

    if (error) {
        if (isMissingTableError(error)) {
            window._dokePublicacoesSocialStatus = false;
            list.innerHTML = `${captionHTML}<p style="color:#999; font-size:0.8rem; margin-top:10px; text-align:center;">Comentarios indisponiveis.</p>`;
            return;
        }
        const retry = await client
            .from("publicacoes_comentarios")
            .select("id, texto, created_at, user_id")
            .eq("publicacao_id", publicacaoId)
            .order("created_at", { ascending: true });
        data = retry.data || [];
        error = retry.error || null;
    }

    if (error) {
        console.error("Erro comentarios supabase:", error);
        list.innerHTML = `${captionHTML}<p style="color:#999; font-size:0.8rem; margin-top:10px; text-align:center;">Nenhum comentario.</p>`;
        return;
    }

    list.innerHTML = captionHTML;

    if (!data || data.length === 0) {
        list.insertAdjacentHTML('beforeend', '<p style="color:#999; font-size:0.8rem; margin-top:10px; text-align:center;">Nenhum comentario.</p>');
        return;
    }

    data.forEach((c) => {
        const userInfo = c.usuarios || {};
        const nome = normalizeHandle(userInfo.user || userInfo.nome || "usuario");
        const foto = userInfo.foto || "https://placehold.co/50";
        const uidAttr = userInfo.uid ? `data-uid="${userInfo.uid}"` : "";
        const userAttr = (userInfo.user || userInfo.nome) ? `data-user="${userInfo.user || userInfo.nome}"` : "";
        const dataLabel = c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : "";
        const isCreator = window.currentSupaPublicacaoAuthorId && c.user_id === window.currentSupaPublicacaoAuthorId;
        const creatorBadge = isCreator ? `<span class="badge-criador">Criador</span>` : "";

        const html = `
        <div class="comment-block" style="margin-top:15px;">
            <div style="display:flex; gap:10px; font-size:0.9rem; align-items:flex-start;">
                <img src="${foto}" class="js-user-link" ${uidAttr} ${userAttr} style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between;">
                        <div><span class="js-user-link" ${uidAttr} ${userAttr} style="font-weight:700;">${escapeHtml(nome)}</span> ${creatorBadge}</div>
                    </div>
                    <div style="color:#333; margin-top:2px;">${escapeHtml(c.texto || "")}</div>
                    <div style="display:flex; align-items:center; margin-top:4px; gap:15px;">
                        <span style="font-size:0.75rem; color:#999;">${dataLabel}</span>
                    </div>
                </div>
            </div>
        </div>`;
        list.insertAdjacentHTML('beforeend', html);
    });
}

async function verificarStatusLikeSupabase(publicacaoId) {
    const icon = document.getElementById('btnLikeModalIcon');
    if (!icon) return;

    const client = getSupabaseClient();
    const userRow = await getSupabaseUserRow();

    if (!client || !userRow) {
        icon.className = 'bx bx-heart';
        icon.dataset.liked = "false";
        icon.style.pointerEvents = 'auto';
        icon.style.opacity = '1';
        return;
    }

    const { data, error } = await client
        .from("publicacoes_curtidas")
        .select("id")
        .eq("publicacao_id", publicacaoId)
        .eq("user_id", userRow.id)
        .maybeSingle();

    if (error && isMissingTableError(error)) {
        window._dokePublicacoesSocialStatus = false;
    }
    if (error && !isMissingTableError(error)) {
        console.error("Erro like supabase:", error);
    }

    if (data) {
        icon.className = 'bx bxs-heart';
        icon.dataset.liked = "true";
    } else {
        icon.className = 'bx bx-heart';
        icon.dataset.liked = "false";
    }

    icon.style.pointerEvents = 'auto';
    icon.style.opacity = '1';
}

async function darLikeModalSupabase() {
    const client = getSupabaseClient();
    if (!client) return alert("Supabase nao configurado.");

    const userRow = await getSupabaseUserRow();
    if (!userRow) return alert("Faça login para curtir.");

    if (!window.currentSupaPublicacaoId) return;
    if (processandoLike) return;

    processandoLike = true;

    const icon = document.getElementById('btnLikeModalIcon');
    const label = document.getElementById('modalLikesCount');
    const jaCurtiu = icon.dataset.liked === "true";
    const likesAtuais = parseInt(label.innerText.replace(/\D/g, '')) || 0;

    try {
        if (jaCurtiu) {
            icon.className = 'bx bx-heart';
            icon.dataset.liked = "false";
            label.innerText = `${Math.max(0, likesAtuais - 1)} curtidas`;

            const { error } = await client
                .from("publicacoes_curtidas")
                .delete()
                .eq("publicacao_id", window.currentSupaPublicacaoId)
                .eq("user_id", userRow.id);
            if (error && isMissingTableError(error)) {
                window._dokePublicacoesSocialStatus = false;
                throw error;
            }
            if (error && !isMissingTableError(error)) throw error;
        } else {
            icon.className = 'bx bxs-heart';
            icon.dataset.liked = "true";
            label.innerText = `${likesAtuais + 1} curtidas`;

            const { error } = await client
                .from("publicacoes_curtidas")
                .upsert({ publicacao_id: window.currentSupaPublicacaoId, user_id: userRow.id }, { onConflict: "publicacao_id,user_id" });
            if (error && isMissingTableError(error)) {
                window._dokePublicacoesSocialStatus = false;
                throw error;
            }
            if (error && !isMissingTableError(error)) throw error;
            await criarNotificacaoSocial({
                acao: "curtida_post",
                paraUid: window.currentSupaPublicacaoAuthorUid,
                postId: window.currentSupaPublicacaoId,
                postTipo: "post",
                postFonte: "supabase"
            });
        }
    } catch (e) {
        console.error("Erro ao curtir supabase:", e);
        icon.className = jaCurtiu ? 'bx bxs-heart' : 'bx bx-heart';
        icon.dataset.liked = jaCurtiu ? "true" : "false";
        label.innerText = `${likesAtuais} curtidas`;
    } finally {
        processandoLike = false;
    }
}

async function postarComentarioSupabase() {
    const input = document.getElementById('inputComentarioModal');
    const texto = input?.value?.trim();
    if (!texto) return;

    const client = getSupabaseClient();
    if (!client) return alert("Supabase nao configurado.");

    const userRow = await getSupabaseUserRow();
    if (!userRow) return alert("Faça login para comentar.");
    if (!window.currentSupaPublicacaoId) return;

    const btnEnviar = event?.target;
    const textoOriginal = btnEnviar ? btnEnviar.innerText : "Publicar";
    if (btnEnviar) {
        btnEnviar.innerText = "...";
        btnEnviar.disabled = true;
    }

    try {
        const { data: insertedRow, error } = await client
            .from("publicacoes_comentarios")
            .insert({
                publicacao_id: window.currentSupaPublicacaoId,
                user_id: userRow.id,
                texto: texto
            })
            .select("id")
            .maybeSingle();
        if (error && isMissingTableError(error)) {
            window._dokePublicacoesSocialStatus = false;
            throw error;
        }
        if (error && !isMissingTableError(error)) throw error;
        if (input) input.value = "";
        const comentarioId = insertedRow?.id || null;
        await criarNotificacaoSocial({
            acao: "comentario_post",
            paraUid: window.currentSupaPublicacaoAuthorUid,
            postId: window.currentSupaPublicacaoId,
            postTipo: "post",
            postFonte: "supabase",
            comentarioId: comentarioId,
            comentarioTexto: texto
        });
        await carregarComentariosSupabase(window.currentSupaPublicacaoId);
    } catch (e) {
        console.error("Erro ao comentar supabase:", e);
        alert("Erro ao enviar comentario.");
    } finally {
        if (btnEnviar) {
            btnEnviar.innerText = textoOriginal;
            btnEnviar.disabled = false;
        }
    }
}

window.deletarComentario = async function(commentId) {
    const pode = window.dokeConfirm
        ? await window.dokeConfirm("Deseja apagar esta mensagem?", "Confirmacao", "danger")
        : confirm("Deseja apagar esta mensagem?");
    if (!pode) return;

    // Pega as variáveis globais do post aberto
    const postId = window.currentPostId;
    const colecao = window.currentCollection;

    if(!postId || !colecao || !commentId) return;

    try {
        // Deleta o documento da subcoleção 'comentarios'
        await deleteDoc(doc(db, colecao, postId, "comentarios", commentId));
        
        // Recarrega a lista para sumir com o comentário deletado
        await carregarComentariosNoModal(postId, colecao);
        
    } catch (e) {
        console.error("Erro ao deletar comentário:", e);
        alert("Erro ao apagar. Tente novamente.");
    }
}

window.abrirModalPublicacao = async function(publicacaoId) {
    ensureModalPostDetalhe();
    const modal = document.getElementById('modalPostDetalhe');
    const mediaContainer = document.getElementById('modalMediaContainer');
    const commentsList = document.getElementById('modalCommentsList');
    if (!modal || !mediaContainer || !commentsList) return;

    modal.style.display = 'flex';
    window.currentPostSource = "supabase";
    window.currentSupaPublicacaoId = publicacaoId;
    window.currentSupaPublicacaoAuthorId = null;
    window.currentSupaPublicacaoAuthorUid = null;
    window.currentPostId = null;
    window.currentCollection = null;
    window.currentPostAuthorUid = null;

    mediaContainer.innerHTML = '<div style="height:100%; display:flex; align-items:center; justify-content:center;"><i class="bx bx-loader-alt bx-spin" style="color:white; font-size:3rem;"></i></div>';
    commentsList.innerHTML = "";

    const iconLike = document.getElementById('btnLikeModalIcon');
    const labelLike = document.getElementById('modalLikesCount');
    iconLike.className = 'bx bx-heart';
    iconLike.dataset.liked = "false";
    iconLike.style.color = '';
    iconLike.style.pointerEvents = 'none';
    iconLike.style.opacity = '0.5';
    labelLike.innerText = "...";

    const item = await fetchSupabasePublicacaoById(publicacaoId);
    if (!item) {
        document.getElementById('modalMediaContainer').innerHTML = "<div style=\"color:white; text-align:center; padding:40px;\">Publicacao indisponivel.</div>";
        document.getElementById('modalCommentsList').innerHTML = "<p style=\"color:#999; font-size:0.85rem; text-align:center;\">Nao foi possivel carregar esta publicacao.</p>";
        iconLike.style.pointerEvents = 'auto';
        iconLike.style.opacity = '1';
        return;
    }

    const autorFallback = await getSupabaseUserRow();
    const autor = item.usuarios || (autorFallback && item.user_id === autorFallback.id ? autorFallback : {});
    const autorNome = normalizeHandle(autor.user || autor.nome || "usuario");
    const autorFoto = autor.foto || "https://placehold.co/50";
    window.currentSupaPublicacaoAuthorUid = autor.uid || null;

    const modalAvatar = document.getElementById('modalAvatar');
    const modalUsername = document.getElementById('modalUsername');
    if (modalAvatar) {
        modalAvatar.src = autorFoto;
        modalAvatar.classList.add('js-user-link');
        modalAvatar.dataset.uid = autor.uid || '';
        modalAvatar.dataset.user = autor.user || autor.nome || '';
    }
    if (modalUsername) {
        modalUsername.innerText = autorNome;
        modalUsername.classList.add('js-user-link');
        modalUsername.dataset.uid = autor.uid || '';
        modalUsername.dataset.user = autor.user || autor.nome || '';
    }

    const mediaBox = document.getElementById('modalMediaContainer');
    if (item.tipo === "video") {
        mediaBox.innerHTML = `<video src="${item.media_url}" poster="${item.thumb_url || ""}" controls autoplay style="max-width:100%; max-height:100%; object-fit:contain;"></video>`;
    } else {
        mediaBox.innerHTML = `<img src="${item.media_url}" style="max-width:100%; max-height:100%; object-fit:contain;">`;
    }

    const captionText = [item.titulo, item.descricao || item.legenda].filter(Boolean).join(" - ");
    const captionDiv = document.getElementById('modalCaption');
    if (captionDiv) {
        if (captionText) {
            const safeUser = escapeHtml(autorNome);
            const safeText = escapeHtml(captionText);
            captionDiv.innerHTML = `<strong class="js-user-link" data-uid="${autor.uid || ''}" data-user="${autor.user || autor.nome || ''}">${safeUser}</strong> ${safeText}`;
            captionDiv.style.display = 'block';
        } else {
            captionDiv.style.display = 'none';
        }
    }

    const likesCount = getRelatedCount(item.publicacoes_curtidas);
    labelLike.innerText = `${likesCount} curtidas`;
    window.currentSupaPublicacaoAuthorId = item.user_id;

    await verificarStatusLikeSupabase(publicacaoId);
    carregarComentariosSupabase(publicacaoId);
}
// Função para fechar clicando fora
window.fecharModalPost = function(e) {
    // Se o clique foi no overlay (fundo escuro) ou no botão X, fecha.
    // Se foi dentro do card (modal-content), o event.stopPropagation no HTML impede de chegar aqui.
    if (!e || e.target.classList.contains('modal-overlay') || e.target.classList.contains('btn-close-modal')) {
        document.getElementById('modalPostDetalhe').style.display = 'none';
        document.getElementById('modalMediaContainer').innerHTML = "";
    }
}
// 3. POSTAR COMENTÁRIO
window.postarComentarioModal = async function() {
    if (window.currentPostSource === "supabase") {
        await postarComentarioSupabase();
        return;
    }
    const input = document.getElementById('inputComentarioModal');
    const texto = input.value.trim();
    if(!texto) return;

    const user = auth.currentUser;
    if(!user) return alert("Faça login para comentar.");
    
    const perfilLocal = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
    
    // Efeito visual de "Enviando..."
    const btnEnviar = event.target; // O botão que foi clicado
    const textoOriginal = btnEnviar.innerText;
    btnEnviar.innerText = "...";
    btnEnviar.disabled = true;

    try {
        // Salva na subcoleção 'comentarios'
        const novoComentario = await addDoc(collection(db, window.currentCollection, window.currentPostId, "comentarios"), {
            uid: user.uid,
            user: perfilLocal.user || "Usuario",
            foto: perfilLocal.foto || "https://placehold.co/50",
            texto: texto,
            data: new Date().toISOString(),
            likeCount: 0,
            replyCount: 0,
            pinned: false
        });

        input.value = ""; // Limpa input

        await criarNotificacaoSocial({
            acao: "comentario_post",
            paraUid: window.currentPostAuthorUid,
            postId: window.currentPostId,
            postTipo: "post",
            postFonte: "firebase",
            comentarioId: novoComentario?.id || null,
            comentarioTexto: texto
        });
        
        // Recarrega a lista para mostrar o novo comentário (e aplicar a tag Criador se necessário)
        await carregarComentariosNoModal(window.currentPostId, window.currentCollection);

    } catch(e) { 
        console.error("Erro ao comentar:", e); 
        alert("Erro ao enviar comentário.");
    } finally {
        btnEnviar.innerText = textoOriginal;
        btnEnviar.disabled = false;
    }
}
async function carregarReelsIndex() {
    const container = document.querySelector('.video-container'); // Certifique-se que essa classe existe no HTML do index
    if(!container) return;

    try {
        // Busca os últimos 10 reels de todos os usuários
        const q = query(collection(db, "reels"), orderBy("data", "desc"), limit(10));
        const snapshot = await getDocs(q);

        container.innerHTML = ""; // Limpa os placeholdes

        if(snapshot.empty) {
            container.innerHTML = "<p style='color:white; padding:10px;'>Sem reels no momento.</p>";
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // HTML DO CARD DE REEL NO INDEX
            const html = `
            <div class="video-card" style="background-image: url('${data.capa || ''}'); position: relative; overflow: hidden;">
                <video src="${data.videoUrl}" class="video-feed" 
                       style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; z-index:0;" 
                       loop muted onmouseover="this.play()" onmouseout="this.pause()">
                </video>
                
                <div class="video-info" style="z-index:1; position:absolute; bottom:10px; left:10px; color:white;">
                    <img src="${data.autorFoto || 'https://placehold.co/30'}" class="profile-img js-user-link" data-uid="${data.uid || ''}" data-user="${data.autorUser || ''}">
                    <span class="username js-user-link" data-uid="${data.uid || ''}" data-user="${data.autorUser || ''}">${data.autorUser || 'Usuario'}</span>
                </div>
            </div>`;
            
            container.insertAdjacentHTML('beforeend', html);
        });

    } catch(e) {
        console.error("Erro ao carregar reels no index:", e);
    }
}

// Chame a função ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    // ... suas outras inicializações ...
    carregarReelsIndex();
    carregarProfissionaisDestaque();
    carregarProfissionaisNovos();

});

async function carregarReelsNoIndex() {
    const container = document.querySelector('.video-container');
    if(!container) return;

    try {
        // Busca os últimos 10 Reels REAIS do banco de dados
        const q = query(collection(db, "reels"), orderBy("data", "desc"), limit(15));
        const snapshot = await getDocs(q);

        container.innerHTML = ""; // Limpa os vídeos de exemplo

        if(snapshot.empty) {
            // Se não tiver nenhum, mantém o visual limpo
            return; 
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // HTML EXATO PARA ENCAIXAR NO SEU CARROSSEL
            const html = `
            <div class="video-card">
                <video src="${data.videoUrl}" 
                       class="video-feed" 
                       muted loop 
                       onmouseover="this.play()" 
                       onmouseout="this.pause(); this.currentTime=0;"
                       onclick="window.location.href='perfil-profissional.html?uid=${data.uid}'"
                       style="width:100%; height:100%; object-fit:cover;">
                </video>
                
                <div class="video-info">
                    <img src="${data.autorFoto || 'https://placehold.co/50'}" class="profile-img js-user-link" data-uid="${data.uid || ''}" data-user="${data.autorUser || ''}">
                    <span class="username js-user-link" data-uid="${data.uid || ''}" data-user="${data.autorUser || ''}">${data.autorUser || 'Profissional'}</span>
                </div>
            </div>`;
            
            container.insertAdjacentHTML('beforeend', html);
        });

    } catch(e) {
        console.error("Erro ao carregar Reels no Index:", e);
    }
}

async function fetchSupabaseReelsHome() {
    const client = getSupabaseClient();
    if (!client) return [];
    const withJoin = "id, user_id, video_url, created_at, titulo, descricao, thumb_url, usuarios (id, uid, nome, user, foto), videos_curtos_curtidas(count)";
    let { data, error } = await client
        .from("videos_curtos")
        .select(withJoin)
        .order("created_at", { ascending: false })
        .limit(20);
    if (error) {
        const joinOnly = "id, user_id, video_url, created_at, titulo, descricao, thumb_url, usuarios (id, uid, nome, user, foto)";
        const retryJoin = await client
            .from("videos_curtos")
            .select(joinOnly)
            .order("created_at", { ascending: false })
            .limit(20);
        if (retryJoin.error) {
            const fallback = "id, user_id, video_url, created_at, titulo, descricao, thumb_url";
            const retry = await client
                .from("videos_curtos")
                .select(fallback)
                .order("created_at", { ascending: false })
                .limit(20);
            if (retry.error) {
                console.error("Erro ao carregar videos curtos supabase:", retry.error);
                return [];
            }
            return await attachSupabaseUsersById(retry.data || []);
        }
        return await attachSupabaseUsersById(retryJoin.data || []);
    }
    return await attachSupabaseUsersById(data || []);
}

window.carregarReelsHome = async function() {
    const container = document.getElementById('galeria-dinamica');
    if (!container) return;

    try {
        const feedItems = [];

        try {
            const q = query(collection(db, "reels"), orderBy("data", "desc"), limit(20));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                const data = doc.data();
                feedItems.push({
                    source: "firebase",
                    id: doc.id,
                    createdAt: data.data,
                    data
                });
            });
        } catch (e) {
            console.error(e);
        }

        try {
            const supaReels = await fetchSupabaseReelsHome();
            supaReels.forEach(item => {
                feedItems.push({
                    source: "supabase",
                    id: item.id,
                    createdAt: item.created_at,
                    data: item
                });
            });
        } catch (e) {
            console.error(e);
        }

        feedItems.sort((a, b) => {
            const aTime = new Date(a.createdAt).getTime();
            const bTime = new Date(b.createdAt).getTime();
            return (bTime || 0) - (aTime || 0);
        });

        container.innerHTML = "";
        window.listaReelsAtual = [];

        if (feedItems.length === 0) {
            container.innerHTML = "<p style='color:white; padding:20px;'>Sem videos.</p>";
            return;
        }

        feedItems.forEach(entry => {
            const source = entry.source;
            const item = entry.data || {};
            let videoUrl = "";
            let capaUrl = "";
            let autorUser = "@usuario";
            let tag = "NOVO";

            if (source === "firebase") {
                videoUrl = item.videoUrl || "";
                capaUrl = item.capa || item.img || "https://placehold.co/240x400";
                autorUser = item.autorUser || "@user";
                tag = item.tag || "NOVO";
            } else {
                const autor = item.usuarios || {};
                videoUrl = item.video_url || "";
                capaUrl = item.thumb_url || "https://placehold.co/240x400";
                autorUser = autor.user || autor.nome || "@usuario";
            }

            if (!videoUrl) return;
            const startId = `${source === "supabase" ? "sb" : "fb"}-${entry.id}`;
            const tituloReel = (item.titulo || autorUser || "Video curto");
            const descReel = (item.descricao || item.legenda || tag || "");
            const html = `
            <div class="dp-reelCard dp-item--clickable" onclick="window.location.href='feed.html?start=${startId}'" onmouseenter="playReelPreview(this)" onmouseleave="stopReelPreview(this)">
                <div class="dp-reelMedia">
                    <video src="${videoUrl}" poster="${capaUrl}" muted loop playsinline preload="metadata" disablepictureinpicture disableremoteplayback controlslist="nodownload noplaybackrate noremoteplayback"></video>
                    <div class="dp-reelOverlay">
                        <b>${escapeHtml(tituloReel)}</b>
                        <p>${escapeHtml(descReel)}</p>
                    </div>
                    <div class="dp-reelPlay"><i class='bx bx-play'></i></div>
                </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });

    } catch (e) { console.error(e); }
}

function enableVideosCurtosPageScroll() {
    const wrapper = document.getElementById('galeria-dinamica');
    if (!wrapper || wrapper.dataset.scrollFix === "true") return;
    wrapper.dataset.scrollFix = "true";
}

// LÓGICA DO DELAY DE 3 SEGUNDOS
// LÓGICA DO DELAY DE 3 SEGUNDOS COM RESET DE CAPA
let timerVideo;

window.agendarPlay = function(card) {
    const video = card.querySelector('video');
    if (!video) return;

    // Agenda o play para daqui a 3 segundos
    timerVideo = setTimeout(() => {
        video.play().catch(e => console.log("Autoplay bloqueado"));
    }, 3000);
}

window.cancelarPlay = function(card) {
    const video = card.querySelector('video');
    
    // 1. Cancela o agendamento se o mouse sair antes de começar
    clearTimeout(timerVideo);
    
    if (video) {
        // 2. Pausa o vídeo
        video.pause();
        
        // 3. O TRUQUE: Ao definir o tempo para 0 e chamar load(), 
        // o navegador é forçado a exibir o atributo 'poster' (a capa) novamente.
        video.currentTime = 0;
        video.load(); 
    }
}


window.ativarModo = function(modo) {
    const areaVideo = document.getElementById('campos-video-extra');
    const inputTipo = document.getElementById('tipoPostagemAtual');
    const inputFoto = document.getElementById('file-post-upload');

    areaVideo.style.display = 'none'; // Reseta
    
    if (modo === 'video' || modo === 'video-curto') {
        areaVideo.style.display = 'block';
        inputTipo.value = modo; 
        
        if(modo === 'video-curto') {
            document.querySelector('#campos-video-extra small b').innerText = "Trabalhos (Vídeos Curtos)";
            document.getElementById('inputTagVideo').placeholder = "Legenda do Reel...";
            window.carregarMeusAnunciosSelect(); // CARREGA SERVIÇOS
        } else {
            document.querySelector('#campos-video-extra small b').innerText = "Trabalhos (Feed)";
            document.getElementById('inputTagVideo').placeholder = "Título do Serviço...";
        }
    } else {
        inputTipo.value = 'foto';
        inputFoto.click();
    }
}

// --- NOVO: Função para buscar seus serviços e preencher o select ---
window.carregarMeusAnunciosSelect = async function() {
    const select = document.getElementById('selectAnuncioVinculado');
    if (!select || !auth.currentUser) return;

    select.innerHTML = '<option selected disabled>↻ Buscando seus serviços...</option>';

    try {
        const q = query(collection(db, "anuncios"), where("uid", "==", auth.currentUser.uid));
        const snapshot = await getDocs(q);
        select.innerHTML = '<option value="" selected disabled>Selecione um Serviço (Obrigatório)</option>';

        if (snapshot.empty) {
            select.innerHTML = '<option disabled>❌ Nenhum anúncio encontrado.</option>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.innerText = data.titulo;
            option.setAttribute('data-cat', data.categoria || "Geral");
            select.appendChild(option);
        });
    } catch (e) { console.error(e); }
}

// ============================================================
// SISTEMA DE STORIES (COM DURAÇÃO DE 24H)
// ============================================================

let storyTimer = null;
let currentStoryId = null;

// 1. UPLOAD DO STORY
window.uploadStory = async function(input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const user = auth.currentUser;
    if (!user) return alert("Faça login.");

    // Animação de carregando no botão Novo
    const btnUI = document.getElementById('btnNovoStoryUI');
    const iconeOriginal = btnUI.innerHTML;
    btnUI.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i>";

    try {
        // Salva a imagem/vídeo no Storage
        const refStory = ref(storage, `stories/${user.uid}/${Date.now()}`);
        const snap = await uploadBytes(refStory, file);
        const url = await getDownloadURL(snap.ref);

        const perfil = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
        const isVideo = file.type.startsWith('video');

        // Salva no Banco de Dados
        await addDoc(collection(db, "stories"), {
            uid: user.uid,
            autorNome: perfil.user || "Usuario",
            autorFoto: perfil.foto || "https://placehold.co/50",
            midiaUrl: url,
            tipo: isVideo ? 'video' : 'foto',
            dataCriacao: new Date().toISOString()
        });

        alert("Story publicado!");
        if (typeof window.carregarMeusStories === "function") {
            window.carregarMeusStories(user.uid); // Atualiza a lista na hora
        }

    } catch (e) {
        console.error(e);
        alert("Erro ao postar story.");
    } finally {
        btnUI.innerHTML = iconeOriginal;
        input.value = ""; 
    }
}

// ============================================================
// SISTEMA DE STORIES GLOBAL (INDEX.HTML)
// ============================================================

window.carregarStoriesGlobal = async function() {
    const container = document.getElementById('boxStories');
    const secao = document.getElementById('secStories');
    
    if (!container || !secao) return;

    // 1. Data limite (24 horas atrás)
    const ontem = new Date();
    ontem.setHours(ontem.getHours() - 24);
    const dataLimite = ontem.toISOString();

    try {
        // 2. Busca Stories recentes
        const q = query(
            collection(db, "stories"), 
            where("dataCriacao", ">", dataLimite),
            orderBy("dataCriacao", "asc") // Mais antigos primeiro (cronológico)
        );

        const snapshot = await getDocs(q);
        
        // Se não tiver stories E o usuário não estiver logado, esconde a seção
        const user = auth.currentUser;
        if (snapshot.empty && !user) {
            secao.style.display = 'none';
            return;
        }

        secao.style.display = 'block';
        container.innerHTML = "";

        // 3. Adiciona botão "Meu Story" (Se logado)
        if (user) {
            const perfilLocal = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
            const htmlMeuStory = `
                <div class="story-item" onclick="window.location.href='meuperfil.html'">
                    <div class="story-ring add-story">
                        <img src="${perfilLocal.foto || 'https://placehold.co/150'}" alt="Eu">
                        <span class="plus-icon"><i class='bx bx-plus'></i></span>
                    </div>
                    <span class="story-name">Seu story</span>
                </div>`;
            container.insertAdjacentHTML('beforeend', htmlMeuStory);
        }

        if (snapshot.empty) return;

        // 4. Agrupa stories por Usuário (UID)
        const storiesPorUsuario = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            const uid = data.uid;

            if (!storiesPorUsuario[uid]) {
                storiesPorUsuario[uid] = {
                    infoUser: { nome: data.autorNome, foto: data.autorFoto, uid: uid },
                    listaStories: []
                };
            }
            // Adiciona o ID do documento para poder apagar/manipular depois se precisar
            storiesPorUsuario[uid].listaStories.push({ ...data, id: doc.id });
        });

        // 5. Renderiza as bolinhas (Um por usuário)
        Object.values(storiesPorUsuario).forEach(grupo => {
            // Ignora o próprio usuário no feed global (já tem o botão "Seu Story")
            if (user && grupo.infoUser.uid === user.uid) return;

            // Pega o story mais recente para a borda ou lógica de "visto"
            // (Aqui simplificado: sempre colorido)
            
            // Serializa para passar no onclick
            // Passamos a LISTA inteira de stories desse usuário para o player
            const dadosPlayer = JSON.stringify(grupo.listaStories).replace(/"/g, '&quot;');
            const primeiroNome = grupo.infoUser.nome.split(' ')[0];

            const html = `
            <div class="story-item" onclick="abrirPlayerStoriesGrupo(${dadosPlayer})">
                <div class="story-ring unseen">
                    <img src="${grupo.infoUser.foto}" alt="${primeiroNome}">
                </div>
                <span class="story-name">${primeiroNome}</span>
            </div>`;
            
            container.insertAdjacentHTML('beforeend', html);
        });

    } catch (e) {
        console.error("Erro ao carregar stories feed:", e);
    }
}

// ============================================================
// PLAYER DE STORIES SEQUENCIAL (NOVA VERSÃO)
// ============================================================

let storyQueue = []; // Lista de stories do usuário atual
let currentStoryIndex = 0;
let storyTimerGlobal = null;

window.abrirPlayerStoriesGrupo = function(listaStories) {
    if (!listaStories || listaStories.length === 0) return;

    storyQueue = listaStories;
    currentStoryIndex = 0; // Começa do primeiro

    const modal = document.getElementById('modalStoryViewer');
    if(modal) modal.style.display = 'flex';

    tocarStoryAtual();
}

function tocarStoryAtual() {
    if (currentStoryIndex >= storyQueue.length) {
        fecharStory(); // Acabaram os stories desse user
        return;
    }

    const story = storyQueue[currentStoryIndex];
    const containerMedia = document.getElementById('storyMediaContainer');
    const headerImg = document.getElementById('storyUserImg');
    const headerName = document.getElementById('storyUserName');
    const headerTime = document.getElementById('storyTime');

    // Atualiza Header
    if(headerImg) headerImg.src = story.autorFoto;
    if(headerName) headerName.innerText = story.autorNome;
    if(headerTime) headerTime.innerText = calcularTempoAtras(story.dataCriacao);

    // Limpa anterior
    containerMedia.innerHTML = "";
    clearTimeout(storyTimerGlobal);

    // Barra de progresso (Reset)
    const progress = document.getElementById('storyProgress');
    if(progress) {
        progress.style.transition = 'none';
        progress.style.width = '0%';
    }

    // Renderiza Mídia
    let duracao = 5000; // Padrão foto: 5s

    if (story.tipo === 'video') {
        const video = document.createElement('video');
        video.src = story.midiaUrl;
        video.autoplay = true;
        video.playsInline = true;
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "contain";
        
        video.onloadedmetadata = () => {
            duracao = video.duration * 1000;
            animarBarra(duracao);
        };
        video.onended = () => proximoStory();
        containerMedia.appendChild(video);
    } else {
        const img = document.createElement('img');
        img.src = story.midiaUrl;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        containerMedia.appendChild(img);
        animarBarra(duracao);
        
        storyTimerGlobal = setTimeout(proximoStory, duracao);
    }

    // Áreas de toque para navegar
    criarAreasToque(containerMedia);
}

function proximoStory() {
    currentStoryIndex++;
    tocarStoryAtual();
}

function storyAnterior() {
    if(currentStoryIndex > 0) {
        currentStoryIndex--;
        tocarStoryAtual();
    }
}

function animarBarra(ms) {
    const progress = document.getElementById('storyProgress');
    if(!progress) return;
    
    // Pequeno delay para permitir o reset visual
    setTimeout(() => {
            progress.style.transition = `width ${ms}ms linear`;
            progress.style.width = '100%';
        }, 50);
    }

    function criarAreasToque(container) {
        // Remove áreas antigas se houver
        const oldLeft = document.getElementById('touchLeft');
        const oldRight = document.getElementById('touchRight');
        if(oldLeft) oldLeft.remove();
        if(oldRight) oldRight.remove();

        const left = document.createElement('div');
        left.id = 'touchLeft';
        left.style.cssText = "position:absolute; top:0; left:0; width:30%; height:100%; z-index:90;";
        left.onclick = (e) => { e.stopPropagation(); storyAnterior(); };

        const right = document.createElement('div');
        right.id = 'touchRight';
        right.style.cssText = "position:absolute; top:0; right:0; width:70%; height:100%; z-index:90;";
        right.onclick = (e) => { e.stopPropagation(); proximoStory(); };

        container.appendChild(left);
        container.appendChild(right);
    }

    // Atualize a função fecharStory existente
    window.fecharStory = function() {
        const modal = document.getElementById('modalStoryViewer'); // ID do index
        const modalPerfil = document.getElementById('modalStoryViewerPerfil'); // Caso use IDs diferentes
        
        if(modal) modal.style.display = 'none';
        if(modalPerfil) modalPerfil.style.display = 'none';

        const media = document.getElementById('storyMediaContainer');
        if(media) {
            media.innerHTML = "";
        }
        
        if (storyTimerGlobal) clearTimeout(storyTimerGlobal);
        currentStoryIndex = 0;
        storyQueue = [];
    }

window.darLikeModal = async function() {
    if (window.currentPostSource === "supabase") {
        await darLikeModalSupabase();
        return;
    }
    const user = auth.currentUser;
    if (!user) return alert("Faça login para curtir.");
    
    if (!window.currentPostId || !window.currentCollection) return;
    if (processandoLike) return; // Evita clique duplo rápido

    processandoLike = true; // Trava

    const icon = document.getElementById('btnLikeModalIcon');
    const label = document.getElementById('modalLikesCount');
    
    const postId = window.currentPostId;
    const colecao = window.currentCollection;
    
    // Lê o estado atual (Definido pela verificação)
    const jaCurtiu = icon.dataset.liked === "true";
    let likesAtuais = parseInt(label.innerText.replace(/\D/g, '')) || 0;

    const likeDocRef = doc(db, colecao, postId, "likes", user.uid);
    const postRef = doc(db, colecao, postId);

    try {
        if (jaCurtiu) {
            // --- AÇÃO: DESCURTIR (Remover Like) ---
            
            // 1. Atualiza Visual Imediatamente
            icon.className = 'bx bx-heart'; // Coração vazio
            icon.dataset.liked = "false";
            label.innerText = `${Math.max(0, likesAtuais - 1)} curtidas`;

            // 2. Atualiza Banco
            await deleteDoc(likeDocRef); // Deleta o doc do like
            await updateDoc(postRef, { likes: increment(-1) }); // Diminui contador

        } else {
            // --- AÇÃO: CURTIR (Adicionar Like) ---
            
            // 1. Atualiza Visual Imediatamente
            icon.className = 'bx bxs-heart'; // Coração cheio
            icon.dataset.liked = "true";
            label.innerText = `${likesAtuais + 1} curtidas`;

            // 2. Atualiza Banco
            await setDoc(likeDocRef, { uid: user.uid, data: new Date().toISOString() }); // Cria doc
            await updateDoc(postRef, { likes: increment(1) }); // Aumenta contador
            await criarNotificacaoSocial({
                acao: "curtida_post",
                paraUid: window.currentPostAuthorUid,
                postId: postId,
                postTipo: "post",
                postFonte: "firebase"
            });
        }

    } catch(e) { 
        console.error("Erro ao dar like:", e);
        // Reverte visual em caso de erro
        if (jaCurtiu) {
            icon.className = 'bx bxs-heart'; icon.dataset.liked = "true";
            label.innerText = `${likesAtuais} curtidas`;
        } else {
            icon.className = 'bx bx-heart'; icon.dataset.liked = "false";
            label.innerText = `${likesAtuais} curtidas`;
        }
    } finally {
        processandoLike = false; // Destrava
    }
}
window.compartilharPostAtual = function() {
    const url = window.location.href; // Ou gere um link específico se tiver
    
    if (navigator.share) {
        navigator.share({
            title: 'Veja este post na Doke!',
            text: 'Olha que incrível este trabalho que encontrei na Doke.',
            url: url
        }).catch(console.error);
    } else {
        // Fallback para copiar link
        navigator.clipboard.writeText(url).then(() => {
            alert("Link copiado para a área de transferência!");
        });
    }
}

// Atalho para o botão do feed
window.compartilharUrlPost = function(id) {
    // Se quiser, pode implementar lógica para abrir o modal direto
    alert("Link copiado! (Simulação)");
}

async function verificarStatusLike(postId, colecao, uid) {
    const icon = document.getElementById('btnLikeModalIcon');
    
    try {
        // Verifica se existe o documento com meu ID na subcoleção 'likes'
        const docLikeRef = doc(db, colecao, postId, "likes", uid);
        const docLikeSnap = await getDoc(docLikeRef);
        
        if (docLikeSnap.exists()) {
            // JÁ CURTIU: Coração cheio e vermelho
            icon.className = 'bx bxs-heart';
            icon.dataset.liked = "true"; // Marca como curtido
        } else {
            // NÃO CURTIU: Coração vazio
            icon.className = 'bx bx-heart';
            icon.dataset.liked = "false"; // Marca como não curtido
        }
    } catch (e) {
        console.error("Erro like check:", e);
    } finally {
        // Libera o botão para clique
        icon.style.pointerEvents = 'auto';
        icon.style.opacity = '1';
    }
}
// Função de fechamento forçado para o botão X
window.fecharModalPostForce = function() {
    const modal = document.getElementById('modalPostDetalhe');
    if (modal) {
        modal.style.display = 'none';
        
        // Limpa vídeo/imagem para parar som
        const mediaBox = document.getElementById('modalMediaContainer');
        if(mediaBox) mediaBox.innerHTML = "";
    }
    try{ if (typeof updateScrollLock === 'function') updateScrollLock(); }catch(e){}
    window.currentPostSource = "firebase";
    window.currentSupaPublicacaoId = null;
    window.currentSupaPublicacaoAuthorId = null;
    window.currentSupaPublicacaoAuthorUid = null;
}

// Atualiza a função antiga para usar a mesma lógica
window.fecharModalPost = function(e) {
    if (!e || e.target.id === 'modalPostDetalhe') {
        fecharModalPostForce();
    }
}

// 1. Mostrar/Esconder o Input de resposta
window.toggleInputResposta = function(commentId) {
    const box = document.getElementById(`input-box-${commentId}`);
    const input = document.getElementById(`input-reply-${commentId}`);
    
    if (box.style.display === 'flex') {
        box.style.display = 'none';
    } else {
        // Fecha outros inputs abertos (opcional, para limpar visual)
        document.querySelectorAll('.reply-input-box').forEach(el => el.style.display = 'none');
        
        box.style.display = 'flex';
        input.focus();
    }
}

// 2. Enviar a Resposta
window.enviarResposta = async function(parentId) {
    if (window.currentPostSource === "supabase") {
        await enviarRespostaSupabase(parentId);
        return;
    }

    const input = document.getElementById(`input-reply-${parentId}`);
    const texto = input.value.trim();
    const user = auth.currentUser;

    if (!texto || !user) return;

    // Visual de carregando
    const btn = input.nextElementSibling;
    const txtOriginal = btn.innerText;
    btn.innerText = "..."; 
    btn.disabled = true;

    try {
        const perfil = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
        
        // Caminho: posts -> {idPost} -> comentarios -> {idComentarioPai} -> respostas -> {novoDoc}
        const respostasRef = collection(db, window.currentCollection, window.currentPostId, "comentarios", parentId, "respostas");
        const parentRef = doc(db, window.currentCollection, window.currentPostId, "comentarios", parentId);

        // Salva a resposta
        await addDoc(respostasRef, {
            uid: user.uid,
            user: perfil.user || "Usuario",
            foto: perfil.foto || "https://placehold.co/50",
            texto: texto,
            data: new Date().toISOString(),
            likeCount: 0
        });

        // Atualiza o contador de respostas no comentário pai (para mostrar "Ver 1 resposta")
        await updateDoc(parentRef, {
            replyCount: increment(1)
        });

        const ownerUid = await resolverDonoComentarioUid(parentId, "", false);
        await criarNotificacaoSocial({
            acao: "resposta_comentario",
            paraUid: ownerUid,
            postId: window.currentPostId,
            postTipo: window.currentCollection === "reels" ? "reel" : "post",
            postFonte: "firebase",
            comentarioId: parentId,
            comentarioTexto: texto
        });

        // Limpa e fecha input
        input.value = "";
        toggleInputResposta(parentId);

        // Força a abertura das respostas para mostrar a nova
        const container = document.getElementById(`replies-${parentId}`);
        container.style.display = 'block';
        carregarRespostas(parentId); // Recarrega a lista de respostas

    } catch(e) {
        console.error("Erro ao responder:", e);
        alert("Erro ao enviar resposta.");
    } finally {
        btn.innerText = txtOriginal;
        btn.disabled = false;
    }
}

// 3. Expandir/Esconder Respostas (Toggle)
window.toggleVerRespostas = function(parentId, btnElement) {
    const container = document.getElementById(`replies-${parentId}`);
    
    if (container.style.display === 'block') {
        // Se já está aberto, esconde
        container.style.display = 'none';
        btnElement.innerHTML = btnElement.innerHTML.replace("Esconder", "Ver");
    } else {
        // Se está fechado, carrega e mostra
        container.style.display = 'block';
        btnElement.innerHTML = `Esconder respostas`; // Muda texto para Esconder
        carregarRespostas(parentId);
    }
}

// 4. Carregar as Respostas do Banco
async function carregarRespostas(parentId) {
    if (window.currentPostSource === "supabase") {
        await carregarRespostasSupabase(parentId);
        return;
    }

    const container = document.getElementById(`replies-${parentId}`);
    const user = auth.currentUser;
    const userRow = user ? await getSupabaseUserRow() : null;
    container.innerHTML = `<div style="font-size:0.7rem; color:#999; padding:5px;">Carregando...</div>`;

    try {
        const q = query(
            collection(db, window.currentCollection, window.currentPostId, "comentarios", parentId, "respostas"),
            orderBy("data", "asc")
        );
        const snapshot = await getDocs(q);

        container.innerHTML = "";

        const checks = [];

        snapshot.forEach(docSnap => {
            const r = docSnap.data();
            const rid = docSnap.id;
            const dataLabel = r.data ? new Date(r.data).toLocaleDateString('pt-BR') : "";
            const isCreator = window.currentPostAuthorUid && r.uid === window.currentPostAuthorUid;
            const badgeCriador = isCreator ? `<span class="badge-criador">Criador</span>` : "";
            const likeCount = r.likeCount || 0;

            const btnDel = (user && r.uid === user.uid)
                ? `<i class='bx bx-trash' onclick="deletarResposta('${parentId}', '${rid}')" style="cursor:pointer; color:#e74c3c; font-size:0.8rem;"></i>`
                : "";

            const btnReport = (user && r.uid !== user.uid)
                ? `<button class="comment-report-btn" data-comment-id="${rid}" data-parent-id="${parentId}" data-reply="true" data-comment-uid="${r.uid}" onclick="denunciarComentario('${rid}', '${parentId}', true)">Denunciar</button>`
                : "";

            const btnLike = `
                <button class="comment-like-btn" data-comment-id="${rid}" data-parent-id="${parentId}" data-reply="true" onclick="toggleLikeComentario('${rid}', '${parentId}', true)">
                    <i class='bx bx-heart'></i><span>${likeCount}</span>
                </button>`;

            const html = `
            <div class="reply-item" style="display:flex; gap:8px; margin-bottom:10px; align-items:flex-start; animation: fadeIn 0.3s;">
                <img src="${r.foto}" style="width:24px; height:24px; border-radius:50%;">
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size:0.8rem;">
                            <span style="font-weight:700;">${r.user}</span> ${badgeCriador}
                            <span style="color:#333; margin-left:5px;">${r.texto}</span>
                        </div>
                        ${btnDel}
                    </div>
                    <div class="comment-meta-row" style="margin-top:4px;">
                        <span class="comment-date">${dataLabel}</span>
                        ${btnLike}
                        ${btnReport}
                    </div>
                </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);

            if (user) {
                checks.push(verificarLikeComentario(rid, parentId, true));
                if (r.uid !== user.uid) checks.push(verificarDenunciaComentario(rid, parentId, true));
            }
        });

        if (checks.length) await Promise.all(checks);

    } catch(e) { console.error(e); }
}

// 5. Deletar Resposta
window.deletarResposta = async function(parentId, replyId) {
    const pode = window.dokeConfirm
        ? await window.dokeConfirm("Deseja apagar esta mensagem?", "Confirmacao", "danger")
        : confirm("Deseja apagar esta mensagem?");
    if (!pode) return;

    try {
        // Deleta doc da resposta
        await deleteDoc(doc(db, window.currentCollection, window.currentPostId, "comentarios", parentId, "respostas", replyId));
        
        // Decrementa contador no pai
        await updateDoc(doc(db, window.currentCollection, window.currentPostId, "comentarios", parentId), {
            replyCount: increment(-1)
        });

        // Recarrega lista
        carregarRespostas(parentId);

    } catch(e) { alert("Erro ao deletar."); }
}

window.deletarComentarioSupabase = async function(commentId, parentId) {
    if (!commentId) return;
    const pode = window.dokeConfirm
        ? await window.dokeConfirm("Deseja apagar esta mensagem?", "Confirmacao", "danger")
        : confirm("Deseja apagar esta mensagem?");
    if (!pode) return;

    const client = getSupabaseClient();
    const userRow = await getSupabaseUserRow();
    if (!client || !userRow) return;
    const cfg = getSupabasePostConfig();
    if (!cfg.postId) return;

    try {
        const { error } = await client
            .from(cfg.commentsTable)
            .delete()
            .eq("id", commentId)
            .eq("user_id", userRow.id);
        if (error && !isSchemaCacheError(error)) throw error;

        if (parentId) {
            const { data: parentRow, error: parentError } = await client
                .from(cfg.commentsTable)
                .select("reply_count")
                .eq("id", parentId)
                .maybeSingle();
            if (!parentError && parentRow) {
                const nextCount = Math.max(0, (parentRow.reply_count || 0) - 1);
                const { error: updateError } = await client
                    .from(cfg.commentsTable)
                    .update({ reply_count: nextCount })
                    .eq("id", parentId);
                if (updateError && !isSchemaCacheError(updateError)) console.error(updateError);
            } else if (parentError && !isSchemaCacheError(parentError)) {
                console.error(parentError);
            }
        }

        if (cfg.isReel) {
            if (parentId) {
                carregarRespostasSupabase(parentId);
            } else {
                carregarComentariosReelSupabase(cfg.postId);
            }
        } else {
            if (parentId) {
                carregarRespostasSupabase(parentId);
            } else {
                carregarComentariosSupabase(cfg.postId);
            }
        }
    } catch (e) {
        console.error("Erro ao apagar comentario supabase:", e);
        alert("Erro ao apagar mensagem.");
    }
}

window.abrirPlayerTikTok = function(indexOuDados) {

  let dados = {};

  // se vier índice (reels)
  if (typeof indexOuDados === 'number' && window.listaReelsAtual) {
    dados = window.listaReelsAtual[indexOuDados] || {};
  } 
  // se vier objeto ou JSON
  else {
    dados = typeof indexOuDados === 'string'
      ? JSON.parse(indexOuDados)
      : indexOuDados;
  }

  // 🔥 AQUI ESTÁ A CHAVE
  abrirModalUnificado(dados, 'video', 'reels');
};


// Renderiza os dados na tela sem fechar o modal
async function renderizarReelNoModal(index) {
    const dados = window.listaReelsAtual[index];
    if(!dados) return;

    window.currentReelId = dados.id;
    window.currentReelUid = dados.uid;
    window.currentReelAnuncioId = dados.anuncioId;

    const player = document.getElementById('playerPrincipal');
    const blur = document.getElementById('reelBlurBg');
    player.src = dados.videoUrl;
    player.play().catch(() => {});
    if(blur) blur.style.backgroundImage = `url('${dados.capa || dados.img || ''}')`;

    const avatar = dados.autorFoto || "https://placehold.co/50";
    const user = dados.autorUser || "@usuario";
    
    // Preenche todos os campos
    const reelUsername = document.getElementById('reelUsername');
    const reelAvatar = document.getElementById('reelAvatar');
    const reelUsernameCap = document.getElementById('reelUsernameCap');
    const reelAvatarCap = document.getElementById('reelAvatarCap');
    if (reelUsername) {
        reelUsername.innerText = user;
        reelUsername.classList.add('js-user-link');
        reelUsername.dataset.uid = dados.uid || '';
        reelUsername.dataset.user = user || '';
    }
    if (reelAvatar) {
        reelAvatar.src = avatar;
        reelAvatar.classList.add('js-user-link');
        reelAvatar.dataset.uid = dados.uid || '';
        reelAvatar.dataset.user = user || '';
    }
    if (reelUsernameCap) {
        reelUsernameCap.innerText = user;
        reelUsernameCap.classList.add('js-user-link');
        reelUsernameCap.dataset.uid = dados.uid || '';
        reelUsernameCap.dataset.user = user || '';
    }
    if (reelAvatarCap) {
        reelAvatarCap.src = avatar;
        reelAvatarCap.classList.add('js-user-link');
        reelAvatarCap.dataset.uid = dados.uid || '';
        reelAvatarCap.dataset.user = user || '';
    }
    document.getElementById('reelDesc').innerText = dados.descricao || "";
    document.getElementById('reelLikesCount').innerText = `${dados.likes || 0} curtidas`;
    document.getElementById('reelData').innerText = dados.data ? new Date(dados.data).toLocaleDateString() : "Recente";

    // Reset Like
    const icon = document.getElementById('btnLikeReel');
    icon.className = 'bx bx-heart';
    icon.style.color = '';

    if(auth.currentUser) verificarLikeReel(dados.id, auth.currentUser.uid);
    carregarComentariosReel(dados.id);
}
window.handleReelScroll = function(event) {
    event.preventDefault();
    if (window.isScrollingReel) return;
    const delta = Math.sign(event.deltaY);
    if (delta > 0) navegarReel(1);
    else navegarReel(-1);
}

window.navegarReel = function(direcao) {
    if (window.isScrollingReel) return;
    const novoIndice = window.indiceReelAtual + direcao;

    if (novoIndice >= 0 && novoIndice < window.listaReelsAtual.length) {
        window.isScrollingReel = true;
        window.indiceReelAtual = novoIndice;
        
        // Efeito visual de troca
        const mediaArea = document.getElementById('reelVideoArea');
        mediaArea.style.opacity = '0.5';
        
        renderizarReelNoModal(novoIndice).then(() => {
            setTimeout(() => {
                mediaArea.style.opacity = '1';
                window.isScrollingReel = false;
            }, 300);
        });
    }
}

// ============================================================
// Preço médio (5+ serviços) por anúncio
// ============================================================
window.__dokeAvgPrecoCache = window.__dokeAvgPrecoCache || new Map();

function __dokeParseMoeda(valor) {
  if (valor == null) return null;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  const raw = String(valor).trim();
  if (!raw) return null;
  let s = raw.replace(/[^\d,.-]/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) {
    // assume pt-BR: '.' milhar, ',' decimal
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function __dokeFmtMoeda(n) {
  if (!Number.isFinite(n)) return "";
  try {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch (_) {
    return `R$ ${n.toFixed(2)}`;
  }
}

async function __dokeFetchPrecoMedio(anuncioId) {
  if (!anuncioId) return null;
  const cache = window.__dokeAvgPrecoCache;
  if (cache.has(anuncioId)) return cache.get(anuncioId);

  const statuses = ["pago", "finalizado"];
  const base = collection(db, "pedidos");
  const snaps = [];
  try {
    snaps.push(await getDocs(query(base, where("anuncioId", "==", anuncioId), where("status", "in", statuses))));
  } catch (_) {}
  try {
    snaps.push(await getDocs(query(base, where("anuncio_id", "==", anuncioId), where("status", "in", statuses))));
  } catch (_) {}

  const map = new Map();
  snaps.forEach((s) => (s?.docs || []).forEach((d) => map.set(d.id, d)));
  const values = [];
  map.forEach((docSnap) => {
    const p = docSnap.data() || {};
    const v = __dokeParseMoeda(p.valorFinal || p.valor_final || p.valor || p.total || null);
    if (Number.isFinite(v) && v > 0) values.push(v);
  });

  if (!values.length) {
    cache.set(anuncioId, { count: 0, avg: null });
    return cache.get(anuncioId);
  }
  const count = values.length;
  const avg = values.reduce((a, b) => a + b, 0) / count;
  const result = { count, avg };
  cache.set(anuncioId, result);
  return result;
}

window.__dokeUpdatePrecoMedioCard = async function(cardEl, anuncioId) {
  if (!cardEl || !anuncioId) return;
  const el = cardEl.querySelector('.cp-avg-price');
  if (!el) return;
  const data = await __dokeFetchPrecoMedio(anuncioId);
  if (!data || !Number.isFinite(data.avg) || data.count < 5) return;
  const valueEl = el.querySelector('b');
  if (valueEl) valueEl.textContent = __dokeFmtMoeda(data.avg);
  el.style.display = 'block';
};

window.fecharModalVideoForce = function() {
    const v = document.getElementById('playerPrincipal');
    if(v) { v.pause(); v.src = ""; }
    document.getElementById('modalPlayerVideo').style.display = 'none';
    try{ if (typeof updateScrollLock === 'function') updateScrollLock(); }catch(e){}
}
window.fecharModalVideo = function(e) {
    if(e.target.id === 'modalPlayerVideo') fecharModalVideoForce();
}

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const modalPost = document.getElementById("modalPostDetalhe");
    if (modalPost && modalPost.style.display === "flex") {
        fecharModalPostForce();
        return;
    }
    const modalVideo = document.getElementById("modalPlayerVideo");
    if (modalVideo && modalVideo.style.display === "flex") {
        fecharModalVideoForce();
    }
});

// PLAY/PAUSE
window.togglePlayVideo = function(e) {
    const v = e.target;
    const icon = document.getElementById('iconPlayOverlay');
    if(v.paused) {
        v.play();
        icon.style.opacity = '0';
    } else {
        v.pause();
        icon.style.opacity = '1';
    }
}

// REDIRECIONAR ORÇAMENTO
window.irOrcamentoReel = function() {
    if(window.currentReelUid) {
        let url = `orcamento.html?uid=${window.currentReelUid}`;
        if(window.currentReelAnuncioId) url += `&aid=${window.currentReelAnuncioId}`;
        window.location.href = url;
    } else {
        alert("Erro: Profissional não identificado.");
    }
}

async function carregarComentariosReel(reelId) {
    const lista = document.getElementById('listaComentariosReel');
    lista.innerHTML = "";
    
    try {
        const q = query(collection(db, "reels", reelId, "comentarios"), orderBy("data", "desc"));
        const snap = await getDocs(q);
        
        if(snap.empty) {
            lista.innerHTML = "<div style='text-align:center; padding:20px; color:#999;'>Sem comentários.</div>";
            return;
        }

        snap.forEach(doc => {
            const c = doc.data();
            const html = `
            <div class="comm-item">
                <img src="${c.foto}" class="js-user-link" data-uid="${c.uid || ''}" data-user="${c.user || ''}" style="width:32px; height:32px; border-radius:50%;">
                <div style="font-size:0.9rem;">
                    <strong class="js-user-link" data-uid="${c.uid || ''}" data-user="${c.user || ''}">${c.user}</strong> ${c.texto}
                </div>
            </div>`;
            lista.insertAdjacentHTML('beforeend', html);
        });
    } catch(e) { console.error(e); }
}


/* ================= MODAL UNIFICADO (GERADO PELO CHATGPT) ================= */


window.abrirModalUnificado = function(dadosRecebidos, tipo = 'video', colecao = 'reels') {
  const dados = (typeof dadosRecebidos === 'string') ? JSON.parse(dadosRecebidos) : (dadosRecebidos || {});
  window.currentCollection = colecao;
  window.currentPostId = dados.id || dados.postId || dados.aid || null;
  window.currentReelUid = dados.uid || dados.autorUid || null;

  const modal = document.getElementById('modalPostDetalhe');
  const mediaArea = document.getElementById('modalMediaContainer');
  if (!modal || !mediaArea) return;

  mediaArea.innerHTML = '';
  if (dados.videoUrl || dados.video || tipo === 'video') {
    mediaArea.innerHTML = `<video src="${dados.videoUrl || dados.video}" controls autoplay playsinline style="width:100%;height:100%;object-fit:contain;background:#000;"></video>`;
  } else if (dados.imagem) {
    mediaArea.innerHTML = `<img src="${dados.imagem}" style="width:100%;height:100%;object-fit:contain;background:#000;">`;
  }

  const modalUsername = document.getElementById('modalUsername');
  const modalAvatar = document.getElementById('modalAvatar');
  const modalCaption = document.getElementById('modalCaption');
  const modalUser = dados.autorUser || dados.autor_user || dados.usuarios?.user || '@usuario';
  const modalUid = dados.uid || dados.autorUid || dados.usuarios?.uid || '';
  if (modalUsername) {
    modalUsername.innerText = modalUser;
    modalUsername.classList.add('js-user-link');
    modalUsername.dataset.uid = modalUid || '';
    modalUsername.dataset.user = modalUser || '';
  }
  if (modalAvatar) {
    modalAvatar.src = dados.autorFoto || dados.autor_foto || dados.usuarios?.foto || "https://placehold.co/50";
    modalAvatar.classList.add('js-user-link');
    modalAvatar.dataset.uid = modalUid || '';
    modalAvatar.dataset.user = modalUser || '';
  }
  if (modalCaption) modalCaption.innerText = dados.descricao || '';

  const btnOrcar = document.getElementById('btnSolicitarOrcamento');
  if (btnOrcar) {
    btnOrcar.onclick = () => {
      window.location.href = `orcamento.html?uid=${window.currentReelUid || ''}&aid=${window.currentPostId || ''}`;
    };
  }

  modal.style.display = 'flex';
  try{ if (typeof updateScrollLock === 'function') updateScrollLock(); }catch(e){}
};

// ================== SOCIAL ACTIONS (COMMENTS/REPORT/PIN) ==================

if (window.currentSupaPostType === undefined) window.currentSupaPostType = null;
if (window.currentSupaReelId === undefined) window.currentSupaReelId = null;
if (window.currentSupaReelAuthorId === undefined) window.currentSupaReelAuthorId = null;
if (window.currentSupaReelAuthorUid === undefined) window.currentSupaReelAuthorUid = null;
if (window.currentReelSource === undefined) window.currentReelSource = "firebase";

function getSupabasePostConfig() {
    const isReel = window.currentSupaPostType === "videos_curtos";
    return {
        isReel,
        postId: isReel ? window.currentSupaReelId : window.currentSupaPublicacaoId,
        postAuthorId: isReel ? window.currentSupaReelAuthorId : window.currentSupaPublicacaoAuthorId,
        postIdField: isReel ? "video_curto_id" : "publicacao_id",
        commentsTable: isReel ? "videos_curtos_comentarios" : "publicacoes_comentarios",
        commentLikesTable: isReel ? "videos_curtos_comentarios_curtidas" : "publicacoes_comentarios_curtidas",
        commentReportsTable: isReel ? "videos_curtos_comentarios_denuncias" : "publicacoes_comentarios_denuncias",
        postReportsTable: isReel ? "videos_curtos_denuncias" : "publicacoes_denuncias",
        postLikesTable: isReel ? "videos_curtos_curtidas" : "publicacoes_curtidas"
    };
}

function getCommentButton(className, commentId, parentId, isReply) {
    const selector = `.${className}[data-comment-id="${commentId}"][data-parent-id="${parentId || ""}"][data-reply="${isReply ? "true" : "false"}"]`;
    return document.querySelector(selector);
}

function setReportIconState(btn) {
    if (!btn) return;
    btn.classList.add("is-reported");
    btn.setAttribute("title", "Denunciado");
    btn.style.pointerEvents = "none";
    if ("disabled" in btn) btn.disabled = true;
}

function setReportButtonVisibility(btns, visible) {
    btns.forEach(btn => {
        btn.style.display = visible ? "" : "none";
        if (visible) {
            btn.style.pointerEvents = "auto";
            if ("disabled" in btn) btn.disabled = false;
            btn.classList.remove("is-reported");
            btn.setAttribute("title", "Denunciar");
        }
    });
}

function ensureReportButtons() {
    const postActions = document.querySelector("#modalPostDetalhe .modal-actions-bar");
    if (postActions && !postActions.querySelector(".btn-report-post")) {
        const icon = document.createElement("i");
        icon.className = "bx bx-flag btn-report-post";
        icon.title = "Denunciar";
        icon.style.cursor = "pointer";
        icon.addEventListener("click", () => denunciarPostAtual());
        postActions.appendChild(icon);
    }
    const reelActions = document.querySelector("#modalPlayerVideo .modal-footer-actions > div");
    if (reelActions && !reelActions.querySelector(".btn-report-post")) {
        const icon = document.createElement("i");
        icon.className = "bx bx-flag btn-report-post";
        icon.title = "Denunciar";
        icon.style.cursor = "pointer";
        icon.addEventListener("click", () => denunciarPostAtual());
        reelActions.appendChild(icon);
    }
}

window.enviarComentarioReel = async function() {
    const input = document.getElementById('inputComentarioReel');
    const texto = input?.value?.trim();
    if (!texto) return;

    if (window.currentPostSource === "supabase") {
        const client = getSupabaseClient();
        const userRow = await getSupabaseUserRow();
        if (!client || !userRow) return alert("Faca login para comentar.");
        const cfg = getSupabasePostConfig();
        if (!cfg.postId) return;
        let { data: insertedRow, error } = await client
            .from(cfg.commentsTable)
            .insert({
                [cfg.postIdField]: cfg.postId,
                user_id: userRow.id,
                texto: texto,
                parent_id: null,
                like_count: 0,
                reply_count: 0,
                pinned: false
            })
            .select("id")
            .maybeSingle();
        if (error && isSchemaCacheError(error)) {
            const retry = await client
                .from(cfg.commentsTable)
                .insert({
                    [cfg.postIdField]: cfg.postId,
                    user_id: userRow.id,
                    texto: texto
                })
                .select("id")
                .maybeSingle();
            insertedRow = retry.data || null;
            error = retry.error || null;
        }
        if (error && !isSchemaCacheError(error)) {
            console.error(error);
            alert("Erro ao comentar.");
            return;
        }
        if (input) input.value = "";
        const comentarioId = insertedRow?.id || null;
        await criarNotificacaoSocial({
            acao: "comentario_reel",
            paraUid: window.currentSupaReelAuthorUid,
            postId: cfg.postId,
            postTipo: "reel",
            postFonte: "supabase",
            comentarioId,
            comentarioTexto: texto
        });
        carregarComentariosReelSupabase(cfg.postId);
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        alert("Faca login para comentar.");
        return;
    }
    const perfilLocal = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
    try {
        const novoComentario = await addDoc(collection(db, "reels", window.currentPostId, "comentarios"), {
            uid: user.uid,
            user: perfilLocal.user || "Usuario",
            foto: perfilLocal.foto || "https://placehold.co/50",
            texto: texto,
            data: new Date().toISOString(),
            likeCount: 0,
            replyCount: 0,
            pinned: false
        });
        if (input) input.value = "";
        await criarNotificacaoSocial({
            acao: "comentario_reel",
            paraUid: window.currentPostAuthorUid || window.currentReelUid,
            postId: window.currentPostId,
            postTipo: "reel",
            postFonte: "firebase",
            comentarioId: novoComentario?.id || null,
            comentarioTexto: texto
        });
        carregarComentariosReel(window.currentPostId);
    } catch (e) {
        console.error(e);
        alert("Erro ao comentar.");
    }
}

let processandoLikeReel = false;

window.darLikeReel = async function() {
    const icon = document.getElementById('btnLikeReel');
    const label = document.getElementById('reelLikesCount');
    if (!icon || !label) return;

    const user = auth.currentUser;
    if (!user) return alert("Faca login para curtir.");

    if (processandoLikeReel) return;
    processandoLikeReel = true;

    const liked = icon.dataset.liked === "true";
    const likesAtuais = parseInt(label.innerText.replace(/\D/g, "")) || 0;

    try {
        if (window.currentPostSource === "supabase") {
            const client = getSupabaseClient();
            const userRow = await getSupabaseUserRow();
            if (!client || !userRow) return;
            const cfg = getSupabasePostConfig();
            if (!cfg.postId) return;
            if (liked) {
                icon.className = "bx bx-heart";
                icon.dataset.liked = "false";
                label.innerText = `${Math.max(0, likesAtuais - 1)} curtidas`;
                await client
                    .from(cfg.postLikesTable)
                    .delete()
                    .eq(cfg.postIdField, cfg.postId)
                    .eq("user_id", userRow.id);
            } else {
                icon.className = "bx bxs-heart";
                icon.dataset.liked = "true";
                label.innerText = `${likesAtuais + 1} curtidas`;
                await client
                    .from(cfg.postLikesTable)
                    .upsert({ [cfg.postIdField]: cfg.postId, user_id: userRow.id }, { onConflict: `${cfg.postIdField},user_id` });
                await criarNotificacaoSocial({
                    acao: "curtida_reel",
                    paraUid: window.currentSupaReelAuthorUid,
                    postId: cfg.postId,
                    postTipo: "reel",
                    postFonte: "supabase"
                });
            }
            return;
        }

        const likeDocRef = doc(db, "reels", window.currentPostId, "likes", user.uid);
        const postRef = doc(db, "reels", window.currentPostId);

        if (liked) {
            icon.className = "bx bx-heart";
            icon.dataset.liked = "false";
            label.innerText = `${Math.max(0, likesAtuais - 1)} curtidas`;
            await deleteDoc(likeDocRef);
            await updateDoc(postRef, { likes: increment(-1) });
        } else {
            icon.className = "bx bxs-heart";
            icon.dataset.liked = "true";
            label.innerText = `${likesAtuais + 1} curtidas`;
            await setDoc(likeDocRef, { uid: user.uid, data: new Date().toISOString() });
            await updateDoc(postRef, { likes: increment(1) });
            await criarNotificacaoSocial({
                acao: "curtida_reel",
                paraUid: window.currentPostAuthorUid || window.currentReelUid,
                postId: window.currentPostId,
                postTipo: "reel",
                postFonte: "firebase"
            });
        }
    } catch (e) {
        console.error("Erro ao curtir reel:", e);
        icon.className = liked ? "bx bxs-heart" : "bx bx-heart";
        icon.dataset.liked = liked ? "true" : "false";
        label.innerText = `${likesAtuais} curtidas`;
    } finally {
        processandoLikeReel = false;
    }
}

async function verificarLikeReel(reelId, uid) {
    const icon = document.getElementById('btnLikeReel');
    if (!icon) return;

    if (window.currentPostSource === "supabase") {
        const client = getSupabaseClient();
        const userRow = await getSupabaseUserRow();
        if (!client || !userRow) return;
        const cfg = getSupabasePostConfig();
        if (!cfg.postId) return;
        const { data, error } = await client
            .from(cfg.postLikesTable)
            .select("id")
            .eq(cfg.postIdField, cfg.postId)
            .eq("user_id", userRow.id)
            .maybeSingle();
        if (error && !isMissingTableError(error)) console.error(error);
        if (data) {
            icon.className = "bx bxs-heart";
            icon.dataset.liked = "true";
        } else {
            icon.className = "bx bx-heart";
            icon.dataset.liked = "false";
        }
        return;
    }

    try {
        const docLikeRef = doc(db, "reels", reelId, "likes", uid);
        const snap = await getDoc(docLikeRef);
        if (snap.exists()) {
            icon.className = "bx bxs-heart";
            icon.dataset.liked = "true";
        } else {
            icon.className = "bx bx-heart";
            icon.dataset.liked = "false";
        }
    } catch (e) {
        console.error("Erro like reel:", e);
    }
}

async function renderizarReelNoModal(index) {
    const dados = window.listaReelsAtual[index];
    if (!dados) return;

    const isSupabase = !!dados.video_url || !!dados.user_id || !!dados.usuarios;
    window.currentPostSource = isSupabase ? "supabase" : "firebase";
    window.currentSupaPostType = isSupabase ? "videos_curtos" : null;
    window.currentSupaReelId = isSupabase ? dados.id : null;
    window.currentSupaReelAuthorId = isSupabase ? (dados.user_id || dados.usuarios?.id || null) : null;
    window.currentSupaReelAuthorUid = isSupabase ? (dados.usuarios?.uid || null) : null;
    window.currentCollection = isSupabase ? null : "reels";
    window.currentPostId = dados.id || null;
    window.currentPostAuthorUid = isSupabase ? null : (dados.uid || dados.autorUid || null);

    window.currentReelId = dados.id;
    window.currentReelUid = isSupabase ? (dados.usuarios?.uid || dados.autorUid || dados.uid || null) : (dados.uid || null);
    window.currentReelAnuncioId = dados.anuncioId || dados.aid || dados.anuncio_id || null;

    const player = document.getElementById('playerPrincipal');
    const blur = document.getElementById('reelBlurBg');
    const videoUrl = dados.videoUrl || dados.video_url || dados.video;
    if (player) {
        player.src = videoUrl || "";
        player.play().catch(() => {});
    }
    if (blur) blur.style.backgroundImage = `url('${dados.capa || dados.img || dados.thumb_url || ''}')`;

    const avatar = dados.autorFoto || dados.autor_foto || dados.usuarios?.foto || "https://placehold.co/50";
    const userName = dados.autorUser || dados.autor_user || dados.usuarios?.user || "@usuario";
    const descricao = dados.descricao || dados.titulo || "";
    const likesCount = dados.likes || (Array.isArray(dados.videos_curtos_curtidas) ? dados.videos_curtos_curtidas[0]?.count : dados.videos_curtos_curtidas?.count) || 0;

    const reelUsername = document.getElementById('reelUsername');
    const reelAvatar = document.getElementById('reelAvatar');
    const reelUsernameCap = document.getElementById('reelUsernameCap');
    const reelAvatarCap = document.getElementById('reelAvatarCap');
    const reelUid = window.currentReelUid || dados.uid || dados.autorUid || '';
    if (reelUsername) {
        reelUsername.innerText = userName;
        reelUsername.classList.add('js-user-link');
        reelUsername.dataset.uid = reelUid || '';
        reelUsername.dataset.user = userName || '';
    }
    if (reelAvatar) {
        reelAvatar.src = avatar;
        reelAvatar.classList.add('js-user-link');
        reelAvatar.dataset.uid = reelUid || '';
        reelAvatar.dataset.user = userName || '';
    }
    if (reelUsernameCap) {
        reelUsernameCap.innerText = userName;
        reelUsernameCap.classList.add('js-user-link');
        reelUsernameCap.dataset.uid = reelUid || '';
        reelUsernameCap.dataset.user = userName || '';
    }
    if (reelAvatarCap) {
        reelAvatarCap.src = avatar;
        reelAvatarCap.classList.add('js-user-link');
        reelAvatarCap.dataset.uid = reelUid || '';
        reelAvatarCap.dataset.user = userName || '';
    }
    if (document.getElementById('reelDesc')) document.getElementById('reelDesc').innerText = descricao;
    if (document.getElementById('reelLikesCount')) document.getElementById('reelLikesCount').innerText = `${likesCount} curtidas`;
    if (document.getElementById('reelData')) document.getElementById('reelData').innerText = dados.data ? new Date(dados.data).toLocaleDateString() : "Recente";

    const icon = document.getElementById('btnLikeReel');
    if (icon) {
        icon.className = 'bx bx-heart';
        icon.dataset.liked = "false";
    }

    if (auth.currentUser) verificarLikeReel(dados.id, auth.currentUser.uid);
    carregarComentariosReel(dados.id);
    atualizarBotaoDenunciaPost();
}

const _abrirModalUnificadoOriginal = window.abrirModalUnificado;
window.abrirModalUnificado = function(dadosRecebidos, tipo = 'video', colecao = 'reels') {
    const dados = (typeof dadosRecebidos === 'string') ? JSON.parse(dadosRecebidos) : (dadosRecebidos || {});
    window.currentPostSource = "firebase";
    window.currentSupaPostType = null;
    window.currentSupaReelId = null;
    window.currentSupaReelAuthorId = null;
    window.currentSupaReelAuthorUid = null;
    window.currentCollection = colecao;
    window.currentPostId = dados.id || dados.postId || dados.aid || null;
    window.currentPostAuthorUid = dados.uid || dados.autorUid || null;

    if (typeof _abrirModalUnificadoOriginal === "function") {
        _abrirModalUnificadoOriginal(dadosRecebidos, tipo, colecao);
    }

    if (window.currentPostId && window.currentCollection) {
        carregarComentariosNoModal(window.currentPostId, window.currentCollection);
        if (auth.currentUser) verificarStatusLike(window.currentPostId, window.currentCollection, auth.currentUser.uid);
    }
    atualizarBotaoDenunciaPost();
};

const _abrirModalPostOriginal = window.abrirModalPost;
window.abrirModalPost = async function(id, colecao) {
    if (typeof _abrirModalPostOriginal === "function") {
        await _abrirModalPostOriginal(id, colecao);
    }
    window.currentSupaPostType = null;
    window.currentSupaReelId = null;
    window.currentSupaReelAuthorId = null;
    window.currentSupaReelAuthorUid = null;
    atualizarBotaoDenunciaPost();
};

const _abrirModalPublicacaoOriginal = window.abrirModalPublicacao;
window.abrirModalPublicacao = async function(publicacaoId) {
    window.currentSupaPostType = "publicacoes";
    window.currentSupaReelId = null;
    window.currentSupaReelAuthorId = null;
    window.currentSupaReelAuthorUid = null;
    if (typeof _abrirModalPublicacaoOriginal === "function") {
        await _abrirModalPublicacaoOriginal(publicacaoId);
    }
    atualizarBotaoDenunciaPost();
};

window.verificarLikeComentario = async function(commentId, parentId, isReply) {
    const btn = getCommentButton("comment-like-btn", commentId, parentId, isReply);
    if (!btn) return;
    const icon = btn.querySelector("i");
    const user = auth.currentUser;
    if (!user) {
        if (icon) icon.className = "bx bx-heart";
        btn.classList.remove("liked");
        return;
    }

    if (window.currentPostSource === "supabase") {
        const client = getSupabaseClient();
        const userRow = await getSupabaseUserRow();
        if (!client || !userRow) return;
        const cfg = getSupabasePostConfig();
        const { data, error } = await client
            .from(cfg.commentLikesTable)
            .select("id")
            .eq("comentario_id", commentId)
            .eq("user_id", userRow.id)
            .maybeSingle();
        if (error && !isMissingTableError(error)) console.error(error);
        const liked = !!data;
        if (icon) icon.className = liked ? "bx bxs-heart" : "bx bx-heart";
        btn.classList.toggle("liked", liked);
        return;
    }

    try {
        const likeRef = isReply
            ? doc(db, window.currentCollection, window.currentPostId, "comentarios", parentId, "respostas", commentId, "likes", user.uid)
            : doc(db, window.currentCollection, window.currentPostId, "comentarios", commentId, "likes", user.uid);
        const snap = await getDoc(likeRef);
        const liked = snap.exists();
        if (icon) icon.className = liked ? "bx bxs-heart" : "bx bx-heart";
        btn.classList.toggle("liked", liked);
    } catch (e) {
        console.error(e);
    }
}

window.toggleLikeComentario = async function(commentId, parentId, isReply) {
    const btn = getCommentButton("comment-like-btn", commentId, parentId, isReply);
    if (!btn) return;
    const icon = btn.querySelector("i");
    const countSpan = btn.querySelector("span");
    const user = auth.currentUser;
    if (!user) {
        alert("Faca login para curtir.");
        return;
    }

    const wasLiked = btn.classList.contains("liked");
    const currentCount = parseInt(countSpan?.innerText || "0", 10) || 0;
    const liked = !wasLiked;
    const nextCount = liked ? currentCount + 1 : Math.max(0, currentCount - 1);

    btn.classList.toggle("liked", liked);
    if (icon) icon.className = liked ? "bx bxs-heart" : "bx bx-heart";
    if (countSpan) countSpan.innerText = nextCount;

    try {
        if (window.currentPostSource === "supabase") {
            const client = getSupabaseClient();
            const userRow = await getSupabaseUserRow();
            if (!client || !userRow) return;
            const cfg = getSupabasePostConfig();
            if (liked) {
                const { error } = await client
                    .from(cfg.commentLikesTable)
                    .upsert({ comentario_id: commentId, user_id: userRow.id }, { onConflict: "comentario_id,user_id" });
                if (error && !isMissingTableError(error)) throw error;
            } else {
                const { error } = await client
                    .from(cfg.commentLikesTable)
                    .delete()
                    .eq("comentario_id", commentId)
                    .eq("user_id", userRow.id);
                if (error && !isMissingTableError(error)) throw error;
            }
            const { error: countError } = await client
                .from(cfg.commentsTable)
                .update({ like_count: nextCount })
                .eq("id", commentId);
            if (countError && !isSchemaCacheError(countError)) throw countError;
            if (liked) {
                const ownerUid = await resolverDonoComentarioUid(commentId, parentId, isReply);
                await criarNotificacaoSocial({
                    acao: "curtida_comentario",
                    paraUid: ownerUid,
                    postId: cfg.postId,
                    postTipo: cfg.isReel ? "reel" : "post",
                    postFonte: "supabase",
                    comentarioId: commentId
                });
            }
            return;
        }

        const commentRef = isReply
            ? doc(db, window.currentCollection, window.currentPostId, "comentarios", parentId, "respostas", commentId)
            : doc(db, window.currentCollection, window.currentPostId, "comentarios", commentId);
        const likeRef = isReply
            ? doc(db, window.currentCollection, window.currentPostId, "comentarios", parentId, "respostas", commentId, "likes", user.uid)
            : doc(db, window.currentCollection, window.currentPostId, "comentarios", commentId, "likes", user.uid);

        if (liked) {
            await setDoc(likeRef, { uid: user.uid, data: new Date().toISOString() });
            await updateDoc(commentRef, { likeCount: increment(1) });
            const ownerUid = await resolverDonoComentarioUid(commentId, parentId, isReply);
            await criarNotificacaoSocial({
                acao: "curtida_comentario",
                paraUid: ownerUid,
                postId: window.currentPostId,
                postTipo: window.currentCollection === "reels" ? "reel" : "post",
                postFonte: "firebase",
                comentarioId: commentId
            });
        } else {
            await deleteDoc(likeRef);
            await updateDoc(commentRef, { likeCount: increment(-1) });
        }
    } catch (e) {
        console.error(e);
        btn.classList.toggle("liked", wasLiked);
        if (icon) icon.className = wasLiked ? "bx bxs-heart" : "bx bx-heart";
        if (countSpan) countSpan.innerText = currentCount;
    }
}

window.verificarDenunciaComentario = async function(commentId, parentId, isReply) {
    const btn = getCommentButton("comment-report-btn", commentId, parentId, isReply);
    if (!btn) return;
    const user = auth.currentUser;
    if (!user) return;

    if (window.currentPostSource === "supabase") {
        const client = getSupabaseClient();
        const userRow = await getSupabaseUserRow();
        if (!client || !userRow) return;
        const cfg = getSupabasePostConfig();
        const { data, error } = await client
            .from(cfg.commentReportsTable)
            .select("id")
            .eq("comentario_id", commentId)
            .eq("user_id", userRow.id)
            .maybeSingle();
        if (error && !isMissingTableError(error)) console.error(error);
        if (data) setReportIconState(btn);
        return;
    }

    try {
        const reportRef = isReply
            ? doc(db, window.currentCollection, window.currentPostId, "comentarios", parentId, "respostas", commentId, "denuncias", user.uid)
            : doc(db, window.currentCollection, window.currentPostId, "comentarios", commentId, "denuncias", user.uid);
        const snap = await getDoc(reportRef);
        if (snap.exists()) setReportIconState(btn);
    } catch (e) {
        console.error(e);
    }
}

window.denunciarComentario = async function(commentId, parentId, isReply) {
    const btn = getCommentButton("comment-report-btn", commentId, parentId, isReply);
    if (!btn) return;
    const user = auth.currentUser;
    if (!user) {
        alert("Faca login para denunciar.");
        return;
    }
    if (btn.classList.contains("is-reported")) return;

    const ownerUid = btn.dataset.commentUid || "";
    if (window.currentPostSource !== "supabase" && ownerUid && ownerUid === user.uid) {
        alert("Nao pode denunciar o proprio comentario.");
        return;
    }

    if (window.currentPostSource === "supabase") {
        const client = getSupabaseClient();
        const userRow = await getSupabaseUserRow();
        if (!client || !userRow) return;
        if (ownerUid && ownerUid === userRow.id) {
            alert("Nao pode denunciar o proprio comentario.");
            return;
        }
        const cfg = getSupabasePostConfig();
        const { data, error } = await client
            .from(cfg.commentReportsTable)
            .select("id")
            .eq("comentario_id", commentId)
            .eq("user_id", userRow.id)
            .maybeSingle();
        if (error && !isMissingTableError(error)) {
            console.error(error);
            return;
        }
        if (data) {
            setReportIconState(btn);
            return;
        }
        const { error: insertError } = await client
            .from(cfg.commentReportsTable)
            .insert({ comentario_id: commentId, user_id: userRow.id });
        if (insertError && !isMissingTableError(insertError)) {
            console.error(insertError);
            return;
        }
        setReportIconState(btn);
        return;
    }

    try {
        const reportRef = isReply
            ? doc(db, window.currentCollection, window.currentPostId, "comentarios", parentId, "respostas", commentId, "denuncias", user.uid)
            : doc(db, window.currentCollection, window.currentPostId, "comentarios", commentId, "denuncias", user.uid);
        const snap = await getDoc(reportRef);
        if (snap.exists()) {
            setReportIconState(btn);
            return;
        }
        await setDoc(reportRef, { uid: user.uid, data: new Date().toISOString() });
        setReportIconState(btn);
    } catch (e) {
        console.error(e);
    }
}

window.alternarFixarComentario = async function(commentId) {
    const user = auth.currentUser;
    if (!user) return;

    if (window.currentPostSource === "supabase") {
        const client = getSupabaseClient();
        const userRow = await getSupabaseUserRow();
        if (!client || !userRow) return;
        const cfg = getSupabasePostConfig();
        if (!cfg.postAuthorId || cfg.postAuthorId !== userRow.id) return;
        const { data, error } = await client
            .from(cfg.commentsTable)
            .select("id, pinned")
            .eq("id", commentId)
            .maybeSingle();
        if (error) {
            if (!isSchemaCacheError(error)) console.error(error);
            return;
        }
        const isPinned = data?.pinned === true;
        if (!isPinned) {
            const { error: unpinError } = await client
                .from(cfg.commentsTable)
                .update({ pinned: false })
                .eq(cfg.postIdField, cfg.postId)
                .eq("pinned", true);
            if (unpinError && !isSchemaCacheError(unpinError)) console.error(unpinError);
        }
        const { error: pinError } = await client
            .from(cfg.commentsTable)
            .update({ pinned: !isPinned })
            .eq("id", commentId);
        if (pinError && !isSchemaCacheError(pinError)) console.error(pinError);
        if (cfg.isReel) {
            carregarComentariosReelSupabase(cfg.postId);
        } else {
            carregarComentariosSupabase(cfg.postId);
        }
        return;
    }

    if (!window.currentPostAuthorUid || window.currentPostAuthorUid !== user.uid) return;
    const commentsRef = collection(db, window.currentCollection, window.currentPostId, "comentarios");
    const commentRef = doc(db, window.currentCollection, window.currentPostId, "comentarios", commentId);
    const snap = await getDoc(commentRef);
    const isPinned = snap.exists() && snap.data().pinned === true;

    if (!isPinned) {
        const pinnedSnap = await getDocs(query(commentsRef, where("pinned", "==", true)));
        pinnedSnap.forEach(docSnap => updateDoc(docSnap.ref, { pinned: false }));
    }
    await updateDoc(commentRef, { pinned: !isPinned });
    if (window.currentCollection === "reels") {
        carregarComentariosReel(window.currentPostId);
    } else {
        carregarComentariosNoModal(window.currentPostId, window.currentCollection);
    }
}

window.atualizarBotaoDenunciaPost = async function() {
    ensureReportButtons();
    const btns = document.querySelectorAll(".btn-report-post");
    if (!btns.length) return;

    const user = auth.currentUser;
    if (!user) {
        setReportButtonVisibility(btns, true);
        return;
    }

    if (window.currentPostSource === "supabase") {
        const client = getSupabaseClient();
        const authorUid = window.currentSupaPostType === "videos_curtos"
            ? window.currentSupaReelAuthorUid
            : window.currentSupaPublicacaoAuthorUid;
        if (authorUid && user.uid === authorUid) {
            setReportButtonVisibility(btns, false);
            return;
        }
        const userRow = await getSupabaseUserRow();
        if (!client || !userRow) {
            setReportButtonVisibility(btns, true);
            return;
        }
        const cfg = getSupabasePostConfig();
        if (!cfg.postId) return;
        setReportButtonVisibility(btns, true);
        if (cfg.postAuthorId && cfg.postAuthorId === userRow.id) {
            setReportButtonVisibility(btns, false);
            return;
        }
        const { data, error } = await client
            .from(cfg.postReportsTable)
            .select("id")
            .eq(cfg.postIdField, cfg.postId)
            .eq("user_id", userRow.id)
            .maybeSingle();
        if (error && !isMissingTableError(error)) console.error(error);
        if (data) btns.forEach(btn => setReportIconState(btn));
        return;
    }

    if (window.currentPostAuthorUid && window.currentPostAuthorUid === user.uid) {
        setReportButtonVisibility(btns, false);
        return;
    }
    setReportButtonVisibility(btns, true);
    if (!window.currentCollection || !window.currentPostId) return;
    try {
        const reportRef = doc(db, window.currentCollection, window.currentPostId, "denuncias", user.uid);
        const snap = await getDoc(reportRef);
        if (snap.exists()) btns.forEach(btn => setReportIconState(btn));
    } catch (e) {
        console.error(e);
    }
}

window.denunciarPostAtual = async function() {
    ensureReportButtons();
    const btns = document.querySelectorAll(".btn-report-post");
    const user = auth.currentUser;
    if (!user) {
        alert("Faca login para denunciar.");
        return;
    }

    if (window.currentPostSource === "supabase") {
        const client = getSupabaseClient();
        const authorUid = window.currentSupaPostType === "videos_curtos"
            ? window.currentSupaReelAuthorUid
            : window.currentSupaPublicacaoAuthorUid;
        if (authorUid && authorUid === user.uid) {
            setReportButtonVisibility(btns, false);
            alert("Nao pode denunciar o proprio post.");
            return;
        }
        const userRow = await getSupabaseUserRow();
        if (!client || !userRow) return;
        const cfg = getSupabasePostConfig();
        if (!cfg.postId) return;
        if (cfg.postAuthorId && cfg.postAuthorId === userRow.id) {
            setReportButtonVisibility(btns, false);
            alert("Nao pode denunciar o proprio post.");
            return;
        }
        const { data, error } = await client
            .from(cfg.postReportsTable)
            .select("id")
            .eq(cfg.postIdField, cfg.postId)
            .eq("user_id", userRow.id)
            .maybeSingle();
        if (error && !isMissingTableError(error)) {
            console.error(error);
            return;
        }
        if (data) {
            btns.forEach(btn => setReportIconState(btn));
            return;
        }
        const { error: insertError } = await client
            .from(cfg.postReportsTable)
            .insert({ [cfg.postIdField]: cfg.postId, user_id: userRow.id });
        if (insertError && !isMissingTableError(insertError)) {
            console.error(insertError);
            return;
        }
        btns.forEach(btn => setReportIconState(btn));
        return;
    }

    if (window.currentPostAuthorUid && window.currentPostAuthorUid === user.uid) {
        setReportButtonVisibility(btns, false);
        alert("Nao pode denunciar o proprio post.");
        return;
    }
    if (!window.currentCollection || !window.currentPostId) return;
    try {
        const reportRef = doc(db, window.currentCollection, window.currentPostId, "denuncias", user.uid);
        const snap = await getDoc(reportRef);
        if (snap.exists()) {
            btns.forEach(btn => setReportIconState(btn));
            return;
        }
        await setDoc(reportRef, { uid: user.uid, data: new Date().toISOString() });
        btns.forEach(btn => setReportIconState(btn));
    } catch (e) {
        console.error(e);
    }
}

async function carregarRespostasSupabase(parentId) {
    const container = document.getElementById(`replies-${parentId}`);
    const user = auth.currentUser;
    if (!container) return;
    container.innerHTML = `<div style="font-size:0.7rem; color:#999; padding:5px;">Carregando...</div>`;

    const client = getSupabaseClient();
    if (!client) {
        container.innerHTML = "";
        return;
    }

    const cfg = getSupabasePostConfig();
    if (!cfg.postId) {
        container.innerHTML = "";
        return;
    }

    const userRow = user ? await getSupabaseUserRow() : null;

    let { data, error } = await client
        .from(cfg.commentsTable)
        .select("id, texto, created_at, user_id, like_count, usuarios (id, nome, user, foto)")
        .eq(cfg.postIdField, cfg.postId)
        .eq("parent_id", parentId)
        .order("created_at", { ascending: true });

    if (error) {
        if (isMissingTableError(error)) {
            const retry = await client
                .from(cfg.commentsTable)
                .select("id, texto, created_at, user_id")
                .eq(cfg.postIdField, cfg.postId)
                .eq("parent_id", parentId)
                .order("created_at", { ascending: true });
            data = retry.data || [];
            error = retry.error || null;
        }
        if (error) {
            container.innerHTML = "";
            if (!isMissingTableError(error)) console.error(error);
            return;
        }
    }

    container.innerHTML = "";
    const checks = [];

    data.forEach(r => {
        const dataLabel = r.created_at ? new Date(r.created_at).toLocaleDateString("pt-BR") : "";
        const isCreator = cfg.postAuthorId && r.user_id === cfg.postAuthorId;
        const badgeCriador = isCreator ? `<span class="badge-criador">Criador</span>` : "";
        const likeCount = r.like_count || 0;
        const userInfo = r.usuarios || {};
        const nome = normalizeHandle(userInfo.user || userInfo.nome || "usuario");
        const foto = userInfo.foto || "https://placehold.co/50";
        const btnExcluir = (userRow && r.user_id === userRow.id)
            ? `<button class="btn-delete-comment" onclick="deletarComentarioSupabase('${r.id}', '${parentId}')"><i class='bx bx-trash'></i></button>`
            : "";
        const btnReport = (userRow && r.user_id !== userRow.id)
            ? `<button class="comment-report-btn" data-comment-id="${r.id}" data-parent-id="${parentId}" data-reply="true" data-comment-uid="${r.user_id}" onclick="denunciarComentario('${r.id}', '${parentId}', true)">Denunciar</button>`
            : "";
        const btnLike = `
            <button class="comment-like-btn" data-comment-id="${r.id}" data-parent-id="${parentId}" data-reply="true" onclick="toggleLikeComentario('${r.id}', '${parentId}', true)">
                <i class='bx bx-heart'></i><span>${likeCount}</span>
            </button>`;
        const html = `
        <div class="reply-item" style="display:flex; gap:8px; margin-bottom:10px; align-items:flex-start; animation: fadeIn 0.3s;">
            <img src="${foto}" style="width:24px; height:24px; border-radius:50%;">
            <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:0.8rem;">
                        <span style="font-weight:700;">${escapeHtml(nome)}</span> ${badgeCriador}
                        <span style="color:#333; margin-left:5px;">${escapeHtml(r.texto || "")}</span>
                    </div>
                    ${btnExcluir}
                </div>
                <div class="comment-meta-row" style="margin-top:4px;">
                    <span class="comment-date">${dataLabel}</span>
                    ${btnLike}
                    ${btnReport}
                </div>
            </div>
        </div>`;
        container.insertAdjacentHTML("beforeend", html);
        if (userRow) {
            checks.push(verificarLikeComentario(r.id, parentId, true));
            if (r.user_id !== userRow.id) checks.push(verificarDenunciaComentario(r.id, parentId, true));
        }
    });

    if (checks.length) await Promise.all(checks);
    maybeScrollToModalComment();
}

async function carregarComentariosReelSupabase(reelId) {
    const lista = document.getElementById('listaComentariosReel');
    const user = auth.currentUser;
    const userRow = user ? await getSupabaseUserRow() : null;
    if (!lista) return;
    lista.innerHTML = "<div style='text-align:center; padding:20px; color:#999;'>Carregando...</div>";

    const client = getSupabaseClient();
    if (!client) {
        lista.innerHTML = "<div style='text-align:center; padding:20px; color:#999;'>Comentarios indisponiveis.</div>";
        return;
    }

    window.currentSupaPostType = "videos_curtos";
    window.currentSupaReelId = reelId;
    const cfg = getSupabasePostConfig();

    let { data, error } = await client
        .from(cfg.commentsTable)
        .select("id, texto, created_at, user_id, like_count, reply_count, pinned, parent_id, usuarios (id, nome, user, foto)")
        .eq(cfg.postIdField, reelId)
        .is("parent_id", null)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: true });

    if (error) {
        if (isMissingTableError(error)) {
            const retry = await client
                .from(cfg.commentsTable)
                .select("id, texto, created_at, user_id")
                .eq(cfg.postIdField, reelId)
                .is("parent_id", null)
                .order("created_at", { ascending: true });
            data = retry.data || [];
            error = retry.error || null;
        }
        if (error) {
            lista.innerHTML = "<div style='text-align:center; padding:20px; color:#999;'>Erro ao carregar comentarios.</div>";
            if (!isMissingTableError(error)) console.error(error);
            return;
        }
    }

    lista.innerHTML = "";
    if (!data || data.length === 0) {
        lista.innerHTML = "<div style='text-align:center; padding:20px; color:#999;'>Sem comentarios.</div>";
        return;
    }

    const checks = [];
    data.forEach(c => {
        const dataLabel = c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "";
        const isCreator = cfg.postAuthorId && c.user_id === cfg.postAuthorId;
        const isPinned = c.pinned === true;
        const likeCount = c.like_count || 0;
        const userInfo = c.usuarios || {};
        const nome = normalizeHandle(userInfo.user || userInfo.nome || "usuario");
        const foto = userInfo.foto || "https://placehold.co/50";
        const badgeCriador = isCreator ? `<span class="badge-criador">Criador</span>` : "";
        const badgeFixado = isPinned ? `<span class="badge-fixado">Fixado</span>` : "";
        const canPin = userRow && cfg.postAuthorId && cfg.postAuthorId === userRow.id;
        const btnPin = canPin
            ? `<button class="btn-pin-comment" onclick="alternarFixarComentario('${c.id}')">${isPinned ? "Desafixar" : "Fixar"}</button>`
            : "";
        const btnExcluir = (userRow && c.user_id === userRow.id)
            ? `<button class="btn-delete-comment" onclick="deletarComentarioSupabase('${c.id}', '')"><i class='bx bx-trash'></i></button>`
            : "";
        const btnReport = (userRow && c.user_id !== userRow.id)
            ? `<button class="comment-report-btn" data-comment-id="${c.id}" data-parent-id="" data-reply="false" data-comment-uid="${c.user_id}" onclick="denunciarComentario('${c.id}', '', false)">Denunciar</button>`
            : "";
        const btnLike = `
            <button class="comment-like-btn" data-comment-id="${c.id}" data-parent-id="" data-reply="false" onclick="toggleLikeComentario('${c.id}', '', false)">
                <i class='bx bx-heart'></i><span>${likeCount}</span>
            </button>`;
        let btnVerRespostas = "";
        if (c.reply_count && c.reply_count > 0) {
            btnVerRespostas = `
            <div class="toggle-replies-link" onclick="toggleVerRespostas('${c.id}', this)">
                Ver ${c.reply_count} respostas
            </div>`;
        }
        const html = `
        <div class="comment-block ${isPinned ? "comment-pinned" : ""}" id="comm-${c.id}" data-comment-id="${c.id}">
            <div class="comment-row">
                <img src="${foto}" class="comment-avatar js-user-link" ${uidAttr} ${userAttr} alt="">
                <div style="flex:1;">
                    <div class="comment-header-row">
                        <div class="comment-header-left">
                            <span class="comment-user-name js-user-link" ${uidAttr} ${userAttr}>${escapeHtml(nome)}</span> ${badgeCriador} ${badgeFixado}
                        </div>
                        <div class="comment-header-actions">
                            ${btnPin}
                            ${btnExcluir}
                        </div>
                    </div>
                    <div class="comment-text-content">${escapeHtml(c.texto || "")}</div>
                    <div class="comment-meta-row">
                        <span class="comment-date">${dataLabel}</span>
                        <button class="btn-reply-action" onclick="toggleInputResposta('${c.id}')">Responder</button>
                        ${btnLike}
                        ${btnReport}
                    </div>
                </div>
            </div>
            ${btnVerRespostas}
            <div id="replies-${c.id}" class="replies-container"></div>
            <div id="input-box-${c.id}" class="reply-input-box">
                <input type="text" id="input-reply-${c.id}" placeholder="Sua resposta...">
                <button onclick="enviarResposta('${c.id}')">Enviar</button>
            </div>
        </div>`;
        lista.insertAdjacentHTML("beforeend", html);
        if (userRow) {
            checks.push(verificarLikeComentario(c.id, "", false));
            if (c.user_id !== userRow.id) checks.push(verificarDenunciaComentario(c.id, "", false));
        }
    });
    if (checks.length) await Promise.all(checks);
}

async function carregarComentariosReel(reelId) {
    if (window.currentPostSource === "supabase") {
        await carregarComentariosReelSupabase(reelId);
        return;
    }

    const lista = document.getElementById('listaComentariosReel');
    const user = auth.currentUser;
    if (!lista) return;
    lista.innerHTML = "";

    try {
        const q = query(collection(db, "reels", reelId, "comentarios"), orderBy("data", "asc"));
        const snap = await getDocs(q);

        if (snap.empty) {
            lista.innerHTML = "<div style='text-align:center; padding:20px; color:#999;'>Sem comentarios.</div>";
            return;
        }

        const comments = [];
        snap.forEach(docSnap => {
            comments.push({ id: docSnap.id, ...docSnap.data() });
        });

        comments.sort((a, b) => {
            const ap = a.pinned === true ? 1 : 0;
            const bp = b.pinned === true ? 1 : 0;
            if (ap !== bp) return bp - ap;
            return new Date(a.data || 0) - new Date(b.data || 0);
        });

        const checks = [];

        comments.forEach(c => {
            const cid = c.id;
            const dataLabel = c.data ? new Date(c.data).toLocaleDateString("pt-BR") : "";
            const isCreator = window.currentPostAuthorUid && c.uid === window.currentPostAuthorUid;
            const isPinned = c.pinned === true;
            const likeCount = c.likeCount || 0;
            const badgeCriador = isCreator ? `<span class="badge-criador">Criador</span>` : "";
            const badgeFixado = isPinned ? `<span class="badge-fixado">Fixado</span>` : "";
            const canPin = user && window.currentPostAuthorUid && user.uid === window.currentPostAuthorUid;
            const btnPin = canPin
                ? `<button class="btn-pin-comment" onclick="alternarFixarComentario('${cid}')">${isPinned ? "Desafixar" : "Fixar"}</button>`
                : "";
            const btnReport = (user && c.uid !== user.uid)
                ? `<button class="comment-report-btn" data-comment-id="${cid}" data-parent-id="" data-reply="false" data-comment-uid="${c.uid}" onclick="denunciarComentario('${cid}', '', false)">Denunciar</button>`
                : "";
            const btnLike = `
                <button class="comment-like-btn" data-comment-id="${cid}" data-parent-id="" data-reply="false" onclick="toggleLikeComentario('${cid}', '', false)">
                    <i class='bx bx-heart'></i><span>${likeCount}</span>
                </button>`;
            let btnVerRespostas = "";
            if (c.replyCount && c.replyCount > 0) {
                btnVerRespostas = `
                <div class="toggle-replies-link" onclick="toggleVerRespostas('${cid}', this)">
                    Ver ${c.replyCount} respostas
                </div>`;
            }
            const html = `
            <div class="comment-block ${isPinned ? "comment-pinned" : ""}" id="comm-${cid}" data-comment-id="${cid}">
                <div class="comment-row">
                    <img src="${c.foto || "https://placehold.co/50"}" class="comment-avatar js-user-link" data-uid="${c.uid || ''}" data-user="${c.user || ''}" alt="">
                    <div style="flex:1;">
                        <div class="comment-header-row">
                            <div class="comment-header-left">
                                <span class="comment-user-name js-user-link" data-uid="${c.uid || ''}" data-user="${c.user || ''}">${escapeHtml(c.user || "Usuario")}</span> ${badgeCriador} ${badgeFixado}
                            </div>
                            <div class="comment-header-actions">
                                ${btnPin}
                            </div>
                        </div>
                        <div class="comment-text-content">${escapeHtml(c.texto || "")}</div>
                        <div class="comment-meta-row">
                            <span class="comment-date">${dataLabel}</span>
                            <button class="btn-reply-action" onclick="toggleInputResposta('${cid}')">Responder</button>
                            ${btnLike}
                            ${btnReport}
                        </div>
                    </div>
                </div>
                ${btnVerRespostas}
                <div id="replies-${cid}" class="replies-container"></div>
                <div id="input-box-${cid}" class="reply-input-box">
                    <input type="text" id="input-reply-${cid}" placeholder="Sua resposta...">
                    <button onclick="enviarResposta('${cid}')">Enviar</button>
                </div>
            </div>`;
            lista.insertAdjacentHTML("beforeend", html);
            if (user) {
                checks.push(verificarLikeComentario(cid, "", false));
                if (c.uid !== user.uid) checks.push(verificarDenunciaComentario(cid, "", false));
            }
        });

        if (checks.length) await Promise.all(checks);
    } catch (e) {
        console.error(e);
    }
}

async function enviarRespostaSupabase(parentId) {
    const input = document.getElementById(`input-reply-${parentId}`);
    const texto = input?.value?.trim();
    const user = auth.currentUser;
    if (!texto || !user) return;

    const btn = input.nextElementSibling;
    const txtOriginal = btn?.innerText;
    if (btn) {
        btn.innerText = "...";
        btn.disabled = true;
    }

    try {
        const client = getSupabaseClient();
        const userRow = await getSupabaseUserRow();
        if (!client || !userRow) return;
        const cfg = getSupabasePostConfig();
        if (!cfg.postId) return;

        const insertData = {
            [cfg.postIdField]: cfg.postId,
            user_id: userRow.id,
            texto: texto,
            parent_id: parentId,
            like_count: 0,
            reply_count: 0,
            pinned: false
        };
        let { error } = await client.from(cfg.commentsTable).insert(insertData);
        if (error && isSchemaCacheError(error)) {
            const fallback = {
                [cfg.postIdField]: cfg.postId,
                user_id: userRow.id,
                texto: texto,
                parent_id: parentId
            };
            const retry = await client.from(cfg.commentsTable).insert(fallback);
            error = retry.error || null;
        }
        if (error && !isSchemaCacheError(error)) throw error;

        const { data: parentRow, error: parentError } = await client
            .from(cfg.commentsTable)
            .select("reply_count")
            .eq("id", parentId)
            .maybeSingle();
        if (!parentError && parentRow) {
            const nextCount = (parentRow?.reply_count || 0) + 1;
            const { error: updateError } = await client
                .from(cfg.commentsTable)
                .update({ reply_count: nextCount })
                .eq("id", parentId);
            if (updateError && !isSchemaCacheError(updateError)) console.error(updateError);
        } else if (parentError && !isSchemaCacheError(parentError)) {
            console.error(parentError);
        }

        const ownerUid = await resolverDonoComentarioUid(parentId, "", false);
        await criarNotificacaoSocial({
            acao: "resposta_comentario",
            paraUid: ownerUid,
            postId: cfg.postId,
            postTipo: cfg.isReel ? "reel" : "post",
            postFonte: "supabase",
            comentarioId: parentId,
            comentarioTexto: texto
        });

        input.value = "";
        toggleInputResposta(parentId);
        const container = document.getElementById(`replies-${parentId}`);
        if (container) container.style.display = "block";
        carregarRespostasSupabase(parentId);
    } catch (e) {
        console.error("Erro ao responder supabase:", e);
        alert("Erro ao enviar resposta.");
    } finally {
        if (btn) {
            btn.innerText = txtOriginal;
            btn.disabled = false;
        }
    }
}

async function postarComentarioSupabase() {
    const input = document.getElementById('inputComentarioModal');
    const texto = input?.value?.trim();
    if (!texto) return;

    const client = getSupabaseClient();
    if (!client) return alert("Supabase nao configurado.");

    const userRow = await getSupabaseUserRow();
    if (!userRow) return alert("Faca login para comentar.");

    const cfg = getSupabasePostConfig();
    if (!cfg.postId) return;

    const btnEnviar = event?.target;
    const textoOriginal = btnEnviar ? btnEnviar.innerText : "Publicar";
    if (btnEnviar) {
        btnEnviar.innerText = "...";
        btnEnviar.disabled = true;
    }

    try {
        const insertData = {
            [cfg.postIdField]: cfg.postId,
            user_id: userRow.id,
            texto: texto,
            parent_id: null,
            like_count: 0,
            reply_count: 0,
            pinned: false
        };
        let { data: insertedRow, error } = await client
            .from(cfg.commentsTable)
            .insert(insertData)
            .select("id")
            .maybeSingle();
        if (error && isSchemaCacheError(error)) {
            if (isMissingTableError(error)) window._dokePublicacoesSocialStatus = false;
            const fallback = {
                [cfg.postIdField]: cfg.postId,
                user_id: userRow.id,
                texto: texto
            };
            const retry = await client.from(cfg.commentsTable).insert(fallback).select("id").maybeSingle();
            insertedRow = retry.data || null;
            error = retry.error || null;
        }
        if (error && !isSchemaCacheError(error)) throw error;
        if (input) input.value = "";
        const comentarioId = insertedRow?.id || null;
        await criarNotificacaoSocial({
            acao: cfg.isReel ? "comentario_reel" : "comentario_post",
            paraUid: cfg.isReel ? window.currentSupaReelAuthorUid : window.currentSupaPublicacaoAuthorUid,
            postId: cfg.postId,
            postTipo: cfg.isReel ? "reel" : "post",
            postFonte: "supabase",
            comentarioId,
            comentarioTexto: texto
        });
        if (cfg.isReel) {
            carregarComentariosReelSupabase(cfg.postId);
        } else {
            carregarComentariosSupabase(cfg.postId);
        }
    } catch (e) {
        console.error("Erro ao comentar supabase:", e);
        alert("Erro ao enviar comentario.");
    } finally {
        if (btnEnviar) {
            btnEnviar.innerText = textoOriginal;
            btnEnviar.disabled = false;
        }
    }
}

async function carregarComentariosSupabase(publicacaoId) {
    const list = document.getElementById('modalCommentsList');
    if (!list) return;

    const captionDiv = document.getElementById('modalCaption');
    let captionHTML = "";
    if (captionDiv && captionDiv.style.display !== 'none') {
        captionHTML = `<div id="modalCaption" style="margin-bottom: 15px; font-size: 0.9rem; color: #333; line-height: 1.4;">${captionDiv.innerHTML}</div>`;
    }

    list.innerHTML = `${captionHTML}<div style="padding:10px; text-align:center; color:#999;"><i class="bx bx-loader-alt bx-spin"></i></div>`;

    const client = getSupabaseClient();
    if (!client) {
        list.innerHTML = `${captionHTML}<p style="color:#999; font-size:0.8rem; margin-top:10px; text-align:center;">Comentarios indisponiveis.</p>`;
        return;
    }

    const cfg = getSupabasePostConfig();
    if (!cfg.postId) return;

    let { data, error } = await client
        .from(cfg.commentsTable)
        .select("id, texto, created_at, user_id, like_count, reply_count, pinned, parent_id, usuarios (id, nome, user, foto)")
        .eq(cfg.postIdField, cfg.postId)
        .is("parent_id", null)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: true });

    if (error) {
        if (isMissingTableError(error)) {
            window._dokePublicacoesSocialStatus = false;
        }
        const retry = await client
            .from(cfg.commentsTable)
            .select("id, texto, created_at, user_id")
            .eq(cfg.postIdField, cfg.postId)
            .is("parent_id", null)
            .order("created_at", { ascending: true });
        data = retry.data || [];
        error = retry.error || null;
    }

    if (error) {
        console.error("Erro comentarios supabase:", error);
        list.innerHTML = `${captionHTML}<p style="color:#999; font-size:0.8rem; margin-top:10px; text-align:center;">Nenhum comentario.</p>`;
        return;
    }

    list.innerHTML = captionHTML;

    if (!data || data.length === 0) {
        list.insertAdjacentHTML('beforeend', '<p style="color:#999; font-size:0.8rem; margin-top:10px; text-align:center;">Nenhum comentario.</p>');
        return;
    }

    const user = auth.currentUser;
    const userRow = user ? await getSupabaseUserRow() : null;
    const checks = [];

    data.forEach((c) => {
        const userInfo = c.usuarios || {};
        const nome = normalizeHandle(userInfo.user || userInfo.nome || "usuario");
        const foto = userInfo.foto || "https://placehold.co/50";
        const uidAttr = userInfo.uid ? `data-uid="${userInfo.uid}"` : "";
        const userAttr = (userInfo.user || userInfo.nome) ? `data-user="${userInfo.user || userInfo.nome}"` : "";
        const dataLabel = c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : "";
        const isCreator = cfg.postAuthorId && c.user_id === cfg.postAuthorId;
        const isPinned = c.pinned === true;
        const likeCount = c.like_count || 0;

        const badgeCriador = isCreator ? `<span class="badge-criador">Criador</span>` : "";
        const badgeFixado = isPinned ? `<span class="badge-fixado">Fixado</span>` : "";

        const canPin = userRow && cfg.postAuthorId && cfg.postAuthorId === userRow.id;
        const btnPin = canPin
            ? `<button class="btn-pin-comment" onclick="alternarFixarComentario('${c.id}')">${isPinned ? 'Desafixar' : 'Fixar'}</button>`
            : "";

        const btnExcluir = (userRow && c.user_id === userRow.id)
            ? `<button class="btn-delete-comment" onclick="deletarComentarioSupabase('${c.id}', '')"><i class='bx bx-trash'></i></button>`
            : "";

        const btnReport = (userRow && c.user_id !== userRow.id)
            ? `<button class="comment-report-btn" data-comment-id="${c.id}" data-parent-id="" data-reply="false" data-comment-uid="${c.user_id}" onclick="denunciarComentario('${c.id}', '', false)">Denunciar</button>`
            : "";

        const btnLike = `
            <button class="comment-like-btn" data-comment-id="${c.id}" data-parent-id="" data-reply="false" onclick="toggleLikeComentario('${c.id}', '', false)">
                <i class='bx bx-heart'></i><span>${likeCount}</span>
            </button>`;

        let btnVerRespostas = "";
        if (c.reply_count && c.reply_count > 0) {
            btnVerRespostas = `
            <div class="toggle-replies-link" onclick="toggleVerRespostas('${c.id}', this)">
                Ver ${c.reply_count} respostas
            </div>`;
        }

        const html = `
        <div class="comment-block ${isPinned ? "comment-pinned" : ""}" id="comm-${c.id}" data-comment-id="${c.id}">
            <div class="comment-row">
                <img src="${foto}" class="comment-avatar js-user-link" ${uidAttr} ${userAttr} alt="">
                <div style="flex:1;">
                    <div class="comment-header-row">
                            <div class="comment-header-left">
                                <span class="comment-user-name js-user-link" ${uidAttr} ${userAttr}>${escapeHtml(nome)}</span> ${badgeCriador} ${badgeFixado}
                            </div>
                            <div class="comment-header-actions">
                                ${btnPin}
                                ${btnExcluir}
                            </div>
                        </div>
                    <div class="comment-text-content">${escapeHtml(c.texto || "")}</div>
                    <div class="comment-meta-row">
                        <span class="comment-date">${dataLabel}</span>
                        <button class="btn-reply-action" onclick="toggleInputResposta('${c.id}')">Responder</button>
                        ${btnLike}
                        ${btnReport}
                    </div>
                </div>
            </div>
            ${btnVerRespostas}
            <div id="replies-${c.id}" class="replies-container"></div>
            <div id="input-box-${c.id}" class="reply-input-box">
                <input type="text" id="input-reply-${c.id}" placeholder="Sua resposta...">
                <button onclick="enviarResposta('${c.id}')">Enviar</button>
            </div>
        </div>`;
        list.insertAdjacentHTML('beforeend', html);

        if (userRow) {
            checks.push(verificarLikeComentario(c.id, "", false));
            if (c.user_id !== userRow.id) checks.push(verificarDenunciaComentario(c.id, "", false));
        }
    });

    if (checks.length) await Promise.all(checks);
}








// ============================================================
// DOKE - Delight pack (Home): tema, toast, scroll-top, PWA + filtros
// ============================================================
(function(){
  function byId(id){ return document.getElementById(id); }

  // Toast simples
  window.dokeToast = window.dokeToast || function(message){
    const el = byId('dokeToast');
    if(!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(window.__dokeToastT);
    window.__dokeToastT = setTimeout(() => el.classList.remove('show'), 2300);
  };

  // Tema (claro/escuro)
  function setTheme(theme){
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    try{ localStorage.setItem('doke_theme', theme); }catch(e){}
    const btn = byId('btnThemeToggle');
    if(btn){
      const icon = btn.querySelector('i');
      if(icon){
        icon.className = (theme === 'dark') ? 'bx bx-sun' : 'bx bx-moon';
      }
    }
  }

  function toggleTheme(){
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
    window.dokeToast(current === 'dark' ? 'Modo claro ativado' : 'Modo escuro ativado');
  }

  // Scroll-to-top
  function bindScrollTop(){
    const btn = byId('btnScrollTop');
    if(!btn) return;
    const onScroll = () => {
      if(window.scrollY > 520) btn.classList.add('show');
      else btn.classList.remove('show');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // PWA install
  let deferredPrompt = null;
  function bindPWAInstall(){
    const btn = byId('btnInstallPWA');
    if(!btn) return;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      btn.style.display = 'inline-flex';
    });

    btn.addEventListener('click', async () => {
      if(!deferredPrompt) return;
      deferredPrompt.prompt();
      try{ await deferredPrompt.userChoice; }catch(e){}
      deferredPrompt = null;
      btn.style.display = 'none';
    });
  }

  // Service Worker
  async function registerSW(){
    if(!('serviceWorker' in navigator)) return;
    try{
      await navigator.serviceWorker.register('sw.js');
    }catch(e){}
  }

  window.dokeApplyHomeFilters = function(){
    const full = Array.isArray(window.__dokeAnunciosCacheFull) ? window.__dokeAnunciosCacheFull.slice() : [];
    const termo = (byId('inputBusca')?.value || '').trim();

    const maxStr = (byId('maxPreco')?.value || '').trim();
    const max = maxStr ? parseFloat(maxStr.replace(',', '.')) : null;
    const ord = byId('ordenacao')?.value || 'mais_recente';

    const uf = byId('selectEstado')?.value || '';
    const cidade = byId('selectCidade')?.value || '';
    const bairro = byId('selectBairro')?.value || '';
    const tipoAtend = byId('filtroTipoAtend')?.value || 'todos';
    const tipoPreco = byId('filtroTipoPreco')?.value || 'todos';
    const categoria = byId('filtroCategoria')?.value || 'todas';
    const chip = window.__dokeChipFiltro || 'todos';
    const pagamentos = {
      pix: !!byId('filtroPgPix')?.checked,
      credito: !!byId('filtroPgCredito')?.checked,
      debito: !!byId('filtroPgDebito')?.checked
    };
    const extras = {
      garantia: !!byId('filtroGarantia')?.checked,
      emergencia: !!byId('filtroEmergencia')?.checked,
      formulario: !!byId('filtroFormulario')?.checked
    };

    const lista = (typeof __dokeApplyFilters === 'function')
      ? __dokeApplyFilters(full, {
          term: termo,
          maxPrice: Number.isFinite(max) ? max : null,
          order: ord,
          tipoAtend,
          tipoPreco,
          categoria,
          pagamentos,
          extras,
          chip,
          uf,
          cidade,
          bairro
        })
      : full;

    const feed = byId('feedAnuncios');
    if(feed){
      feed.innerHTML = '';
      const frag = document.createDocumentFragment();
      lista.forEach(anuncio => {
        try{
          const card = window.dokeBuildCardPremium(anuncio);
          // melhorias de performance sem alterar layout
          const img = card.querySelector('img');
          if(img){ img.loading = 'lazy'; img.decoding = 'async'; }
          const video = card.querySelector('video');
          if(video){ video.preload = 'metadata'; }
          frag.appendChild(card);
        }catch(e){}
      });
      if(lista.length){
        feed.appendChild(frag);
      }else{
        feed.innerHTML = `
          <div class="doke-empty doke-soft-card doke-empty-state">
            <div class="ico"><i class='bx bx-search-alt'></i></div>
            <h3>Nenhum anúncio encontrado</h3>
            <p>Tente ajustar os filtros, ampliar o raio ou buscar por outro termo.</p>
            <div class="actions">
              <button class="doke-btn primary" type="button" onclick="window.__dokeResetBuscaFiltros(); if(window.aplicarFiltrosBusca) window.aplicarFiltrosBusca();">Limpar filtros</button>
              <button class="doke-btn ghost" type="button" onclick="const i=document.getElementById('inputBusca'); if(i){ i.focus(); i.select(); }">Nova busca</button>
            </div>
          </div>`;
      }
    }

    const count = byId('resultCount');
    if(count) count.textContent = lista.length ? (lista.length + ' resultados') : '';
  };

  function bindHomeFilters(){
    const btn = byId('btn-aplicar');
    if(btn){
      btn.addEventListener('click', () => {
        window.dokeApplyHomeFilters();
        if(typeof window.toggleFiltrosExtras === 'function') window.toggleFiltrosExtras();
        window.dokeToast('Filtros aplicados');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // tema
    const saved = (function(){ try{ return localStorage.getItem('doke_theme'); }catch(e){ return null; } })();
    setTheme(saved || 'light');
    const btnTheme = byId('btnThemeToggle');
    if(btnTheme) btnTheme.addEventListener('click', toggleTheme);

    bindScrollTop();
    bindPWAInstall();
    bindHomeFilters();

  });
})();


/* ======================= INDEX_UPGRADE_PACK ======================= */
(function(){
  // ---------- Skeletons ----------
  window.dokeRenderAnunciosSkeleton = function(feed){
    if (!feed) return;
    feed.setAttribute('aria-busy', 'true');
    const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    const feedRectW = (typeof feed.getBoundingClientRect === 'function')
      ? Math.round(feed.getBoundingClientRect().width || 0)
      : 0;
    const feedW = Math.max(feed.clientWidth || 0, feedRectW || 0, vw);
    const isBuscaFeed = document.body?.dataset?.page === 'busca' && feed.id === 'feedAnuncios';
    if (isBuscaFeed) {
      const buscaCols = feedW <= 560 ? 1 : 2;
      feed.style.display = 'grid';
      feed.style.gridTemplateColumns = buscaCols === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))';
      feed.style.gap = buscaCols === 1 ? '12px' : '14px';
      feed.style.alignItems = 'stretch';
      feed.style.justifyItems = 'stretch';
    }
    const count = isBuscaFeed
      ? 2
      : (vw <= 600 ? 2 : (vw <= 1024 ? 3 : 4));
    const cards = Array.from({length: count}).map(()=>
      '<article class="skeleton-premium-card skel-anuncio-card" aria-hidden="true">'
      + '  <div class="skel-anuncio-head">'
      + '    <span class="skeleton skel-anuncio-avatar"></span>'
      + '    <span class="skeleton skel-anuncio-user"></span>'
      + '  </div>'
      + '  <div class="skeleton skeleton-premium-cover skel-anuncio-media"></div>'
      + '  <div class="skeleton-premium-body skel-anuncio-body">'
      + '    <div class="skeleton skeleton-line lg"></div>'
      + '    <div class="skeleton skeleton-line md"></div>'
      + '    <div class="skel-anuncio-foot">'
      + '      <div class="skeleton skeleton-line sm"></div>'
      + '      <div class="skeleton skel-anuncio-cta"></div>'
      + '    </div>'
      + '  </div>'
      + '</article>'
    ).join('');
    feed.innerHTML = cards;
  };

  window.dokeRenderTrabalhosSkeleton = function(container){
    if (!container) return;
    container.setAttribute('aria-busy', 'true');
    const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    const count = vw <= 600 ? 2 : (vw <= 1024 ? 3 : 4);
    const items = Array.from({length: count}).map(()=>
      '<div class="tiktok-card is-skeleton" aria-hidden="true">'
      + '  <div class="tiktok-skel-media skeleton"></div>'
      + '  <div class="tiktok-skel-badge skeleton"></div>'
      + '  <div class="tiktok-skel-play skeleton"></div>'
      + '  <div class="video-ui-layer tiktok-skel-overlay">'
      + '    <div class="provider-info tiktok-skel-providerWrap">'
      + '      <span class="provider-name tiktok-skel-provider skeleton"></span>'
      + '    </div>'
      + '    <span class="tiktok-skel-lineMd skeleton"></span>'
      + '  </div>'
      + '</div>'
    ).join('');
    container.innerHTML = items;
  };

  window.dokeRenderPublicacoesSkeleton = function(container){
    if (!container) return;
    container.setAttribute('aria-busy', 'true');
    const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    const count = vw <= 600 ? 3 : (vw <= 1024 ? 4 : 5);
    const items = Array.from({length: count}).map(()=>
      '<div class="feed-publicacao-card dp-item pub-skel" aria-hidden="true">'
      + '  <div class="dp-itemMedia pub-skel-media">'
      + '    <span class="pub-skel-media-fill skeleton"></span>'
      + '  </div>'
      + '  <div class="dp-itemBody pub-skel-body">'
      + '    <div class="dp-itemAuthor pub-skel-author">'
      + '      <span class="skeleton dp-itemAvatar pub-skel-avatar"></span>'
      + '      <span class="pub-skel-authorLines">'
      + '        <span class="skeleton dp-itemUser pub-skel-user"></span>'
      + '        <span class="skeleton dp-itemMeta pub-skel-date"></span>'
      + '      </span>'
      + '    </div>'
      + '    <span class="skeleton dp-itemTitle pub-skel-title"></span>'
      + '    <span class="skeleton dp-itemDesc pub-skel-desc"></span>'
      + '  </div>'
      + '</div>'
    ).join('');
    container.innerHTML = items;
  };

  // ---------- Favoritos ----------
  const FAV_KEY = 'doke:favoritos:anuncios';
  function getFavs(){
    try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); } catch(e){ return new Set(); }
  }
  function saveFavs(set){
    try { localStorage.setItem(FAV_KEY, JSON.stringify([...set])); } catch(e) {}
  }
  function applyFavUI(root=document){
    const favs = getFavs();
    root.querySelectorAll('.cp-fav-btn[data-fav-id], .cp-fav-btn[data-favId]').forEach(btn=>{
      const id = btn.dataset.favId || btn.dataset.fav_id || btn.dataset.favID || btn.dataset.favId;
      const on = id && favs.has(id);
      btn.classList.toggle('is-fav', !!on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.classList.toggle('bx-heart', !on);
        icon.classList.toggle('bxs-heart', !!on);
      }
    });
  }

  document.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('.cp-fav-btn');
    if (!btn) return;
    const id = btn.dataset.favId;
    if (!id) return;
    const favs = getFavs();
    if (favs.has(id)) favs.delete(id); else favs.add(id);
    saveFavs(favs);
    applyFavUI();
  });

  // aplica ao carregar
  document.addEventListener('DOMContentLoaded', ()=>applyFavUI());

  // chips na área de busca removidos (poluía o layout)



  // ---------- Focus trap (acessibilidade) ----------
  function trapFocus(modal){
    if (!modal) return;
    const focusables = modal.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    function onKey(e){
      if (e.key !== 'Tab') return;
      if (focusables.length === 0) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    modal.__dokeTrapHandler = onKey;
    modal.addEventListener('keydown', onKey);
    setTimeout(()=>{ (first || modal).focus?.(); }, 0);
  }
  function untrap(modal){
    if (!modal || !modal.__dokeTrapHandler) return;
    modal.removeEventListener('keydown', modal.__dokeTrapHandler);
    delete modal.__dokeTrapHandler;
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const modals = ['modalGaleria','modalPlayerVideo','modalPostDetalhe'].map(id=>document.getElementById(id)).filter(Boolean);
    modals.forEach(m=>{
      // ensure focusable container
      if (!m.hasAttribute('tabindex')) m.setAttribute('tabindex','-1');
      const obs = new MutationObserver(()=>{
        const visible = (m.style.display && m.style.display !== 'none') || m.classList.contains('active') || m.classList.contains('open');
        if (visible) trapFocus(m); else untrap(m);
      });
      obs.observe(m, {attributes:true, attributeFilter:['style','class']});
    });
  });

})();
/* ===================== END INDEX_UPGRADE_PACK ===================== */


/* ==== DOKE: INDEX ENHANCEMENTS V2 ==== */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const isHome = () => document.body?.dataset?.page === 'home';

  function normCatName(v) {
    return String(v ?? '').trim();
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  function getPerfilLocal() {
    return readJSON('doke_usuario_perfil', {}) || {};
  }

  function getLogado() {
    return localStorage.getItem('usuarioLogado') === 'true' || !!localStorage.getItem('doke_usuario_perfil');
  }

  // ----------------------------
  // CATEGORIAS: skeleton + demanda + ranking
  // ----------------------------
  function catIconSvg(nome) {
    const n = (nome || '').toLowerCase();
    // SVGs simples (sem dependencias)
    if (n.includes('eletric')) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L3 14h7l-1 8 12-14h-7l1-6z" fill="currentColor"/></svg>`;
    }
    if (n.includes('limp') || n.includes('fax')) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10v2H7V2zm2 4h6l1 3h4v3h-2l-2 10H8L6 12H4V9h4l1-3zm1.7 6l1.2 6h.2l1.2-6h-2.6z" fill="currentColor"/></svg>`;
    }
    if (n.includes('aula') || n.includes('prof')) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 6-10 6L2 9l10-6zm0 9l8-4.8V16h-2V8.6L12 12z" fill="currentColor"/></svg>`;
    }
    if (n.includes('reforma') || n.includes('obra') || n.includes('constr')) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 21h20v-2H2v2zm2-4h16V3H4v14zm2-2V5h12v10H6z" fill="currentColor"/></svg>`;
    }
    if (n.includes('design')) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.8 9.95l-3.75-3.75L3 17.25zm18-11.5a1 1 0 0 0 0-1.4l-1.35-1.35a1 1 0 0 0-1.4 0l-1.15 1.15 3.75 3.75L21 5.75z" fill="currentColor"/></svg>`;
    }
    // default: tecnologia/geral
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 12.9 1h-3.8a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L1.7 7.98a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L1.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.64.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54c.04.24.25.42.5.42h3.8c.25 0 .46-.18.5-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.24.1.51.01.64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM11 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="currentColor"/></svg>`;
  }

  function renderCategorySkeleton(carousel, count) {
    if (!carousel) return;
    const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
    const total = Number.isFinite(count) && count > 0
      ? count
      : (vw <= 520 ? 5 : (vw <= 1024 ? 6 : 8));
    carousel.innerHTML = '';
    carousel.classList.add('is-loading');
    for (let i = 0; i < total; i++) {
      const item = document.createElement('div');
      item.className = 'cat-item';
      item.innerHTML = `
        <div class="cat-card cat-skel" aria-hidden="true">
          <div class="cat-icon-wrap cat-skel-circle skeleton"></div>
          <div class="cat-name cat-skel-line skeleton"></div>
          <div class="cat-badge cat-skel-badge skeleton"></div>
        </div>
      `;
      carousel.appendChild(item);
    }
  }

  function renderCategories(carousel, lista) {
    carousel.classList.remove('is-loading');
    carousel.innerHTML = '';
    carousel.scrollLeft = 0;

    if (!lista || !lista.length) {
      carousel.innerHTML = `
        <div class="empty-inline">
          <div class="empty-title">Sem categorias por enquanto</div>
          <div class="empty-sub">Assim que os profissionais forem se cadastrando, as categorias aparecem aqui.</div>
        </div>
      `;
      return;
    }

    lista.forEach((cat, idx) => {
      const nome = cat.nome;
      const item = document.createElement('div');
      item.className = 'cat-item';

      const colorClass = idx % 2 === 0 ? 'cat-green' : 'cat-blue';
      item.innerHTML = `
        <div class="cat-card">
          <button class="cat-icon-wrap ${colorClass}" type="button" aria-label="Categoria ${esc(nome)}">
            <span class="cat-icon">${catIconSvg(nome)}</span>
          </button>
          <div class="cat-name">${esc(nome)}</div>
        </div>
      `;

      const btn = item.querySelector('button');
      btn.addEventListener('click', () => {
        // registra clique
        const clicks = readJSON('doke_categorias_click', []);
        const next = [nome, ...clicks.filter(x => String(x).toLowerCase() !== String(nome).toLowerCase())].slice(0, 12);
        writeJSON('doke_categorias_click', next);

        // salva como busca recente
        try { window.salvarBusca?.(nome); } catch {}

        // redireciona para busca
        window.location.href = `busca.html?q=${encodeURIComponent(nome)}&src=categoria`;
      });

      carousel.appendChild(item);
    });

    // Garante início visual no primeiro item, sem "meio card" na esquerda.
    carousel.scrollLeft = 0;
  }

  async function getCategoriasPorDemanda() {
    // 1) tenta Supabase
    try {
      const sb = await (window.waitForSB ? window.waitForSB(2500) : null);
      if (sb && sb.from) {
        const { data, error } = await sb
          .from('anuncios')
          .select('categoria,categorias')
          .limit(1500);
        if (!error && data) {
          const freq = new Map();
          for (const a of data) {
            let cats = a?.categorias ?? a?.categoria ?? '';
            if (Array.isArray(cats)) {
              for (const c of cats) {
                const name = normCatName(c);
                if (!name) continue;
                freq.set(name, (freq.get(name) || 0) + 1);
              }
            } else {
              const raw = String(cats || '');
              raw.split(',').map(s => s.trim()).filter(Boolean).forEach((name) => {
                freq.set(name, (freq.get(name) || 0) + 1);
              });
            }
          }
          return [...freq.entries()].sort((a,b) => b[1]-a[1]).slice(0, 18).map(([nome,count])=>({nome,count}));
        }
      }
    } catch (e) {
      console.warn('Categorias (supabase) falhou:', e);
    }

    // 2) fallback Firestore (compat)
    try {
      if (window.db && window.getDocs && window.query && window.collection) {
        const q = window.query(window.collection(window.db, 'anuncios'));
        const snap = await window.getDocs(q);
        const freq = new Map();
        snap.forEach((docSnap) => {
          const d = docSnap.data() || {};
          let cats = d.categorias ?? d.categoria ?? '';
          if (Array.isArray(cats)) cats = cats.join(',');
          if (typeof cats !== 'string') cats = String(cats || '');
          cats.split(',').map(s => s.trim()).filter(Boolean).forEach((name) => {
            freq.set(name, (freq.get(name) || 0) + 1);
          });
        });
        return [...freq.entries()].sort((a,b) => b[1]-a[1]).slice(0, 18).map(([nome,count])=>({nome,count}));
      }
    } catch (e) {
      console.warn('Categorias (firestore) falhou:', e);
    }

    // 3) último fallback: sem categorias fixas (somente por demanda)
    return [];
  }

  function setupCatArrows(carousel) {
    const left = $('.cat-arrow.left');
    const right = $('.cat-arrow.right');
    if (left && !left.__dokeBound) {
      left.__dokeBound = true;
      left.addEventListener('click', () => carousel.scrollBy({ left: -260, behavior: 'smooth' }));
    }
    if (right && !right.__dokeBound) {
      right.__dokeBound = true;
      right.addEventListener('click', () => carousel.scrollBy({ left: 260, behavior: 'smooth' }));
    }
  }

  async function initCategoriasHome() {
    if (!isHome()) return;
    const carousel = document.getElementById('categoriesCarousel');
    if (!carousel) return;

    // evita "piscar": skeleton first
    renderCategorySkeleton(carousel);
    setupCatArrows(carousel);

    let lista = await getCategoriasPorDemanda();
    lista = Array.isArray(lista) ? lista : [];

    // guarda para autocomplete
    window.__dokeTopCats = (lista || []).map(x => x.nome);

    renderCategories(carousel, lista);
  }

  // ----------------------------
  // PROFISSIONAIS: setas (desktop) + drag (mobile) + sem corte no hover
  // ----------------------------
  function enableDragScroll(el) {
    if (!el || el.__dragReady) return;
    const isCategorias = el.id === 'listaCategorias' || el.id === 'categoriesCarousel';
    const isFiltrosRapidos = el.classList && el.classList.contains('filtros-chips-scroll');
    if (isCategorias || isFiltrosRapidos) return;
    el.__dragReady = true;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchScrollLeft = 0;
    let touchMode = null; // 'x' | 'y' | null
    el.style.touchAction = 'pan-y';

    el.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      el.classList.add('is-dragging');
    });

    window.addEventListener('mouseup', () => {
      isDown = false;
      el.classList.remove('is-dragging');
    });

    el.addEventListener('mouseleave', () => {
      isDown = false;
      el.classList.remove('is-dragging');
    });

    el.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.4;
      el.scrollLeft = scrollLeft - walk;
    });

    el.addEventListener('touchstart', (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchScrollLeft = el.scrollLeft;
      touchMode = null;
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;

      if (touchMode === null) {
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        if (ax < 8 && ay < 8) return;
        touchMode = ax > ay ? 'x' : 'y';
      }

      if (touchMode !== 'x') return;
      el.scrollLeft = touchScrollLeft - (dx * 1.25);
    }, { passive: true });

    el.addEventListener('touchend', () => {
      touchMode = null;
    }, { passive: true });

    // Wheel: nao travar scroll vertical da pagina.
    // Horizontal via wheel somente com SHIFT (padrao UX).
    el.addEventListener('wheel', (ev) => {
      if (!ev.shiftKey) return; // deixa o site subir/descer normalmente
      const delta = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
      el.scrollLeft += delta;
      ev.preventDefault();
    }, { passive: false });
  }

  function addProsArrows() {
    if (!isHome()) return;
    $$('.pros-section').forEach((sec) => {
      const track = sec.querySelector('.pros-carousel');
      if (!track) return;

      // evita corte no hover
      sec.style.overflow = 'visible';
      sec.style.position = sec.style.position || 'relative';
      track.style.overflowY = 'visible';
      track.style.paddingTop = '14px';
      track.style.paddingBottom = '18px';

      // drag
      enableDragScroll(track);

      // setas (somente desktop)
      if (sec.querySelector('.pro-arrow')) return;

      const left = document.createElement('button');
      left.className = 'pro-arrow left';
      left.type = 'button';
      left.setAttribute('aria-label', 'Anterior');
      left.innerHTML = '❮';

      const right = document.createElement('button');
      right.className = 'pro-arrow right';
      right.type = 'button';
      right.setAttribute('aria-label', 'Próximo');
      right.innerHTML = '❯';

      left.addEventListener('click', () => track.scrollBy({ left: -320, behavior: 'smooth' }));
      right.addEventListener('click', () => track.scrollBy({ left: 320, behavior: 'smooth' }));

      sec.appendChild(left);
      sec.appendChild(right);
    });
  }

  function addVideosArrows() {
    if (!isHome()) return;
    const track = document.getElementById('galeria-dinamica');
    const prev = document.querySelector('.vid-prev');
    const next = document.querySelector('.vid-next');
    if (!track || !prev || !next) return;
    if (track.dataset.videoCarouselReady === '1') return;
    track.dataset.videoCarouselReady = '1';

    enableDragScroll(track);

    const scrollByPage = (dir) => {
      const amount = Math.max(240, Math.floor(track.clientWidth * 0.85));
      track.scrollBy({ left: dir * amount, behavior: 'smooth' });
    };

    prev.addEventListener('click', () => scrollByPage(-1));
    next.addEventListener('click', () => scrollByPage(1));

    const updateArrows = () => {
      const maxLeft = Math.max(0, track.scrollWidth - track.clientWidth);
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= maxLeft - 2;
    };

    track.addEventListener('scroll', updateArrows, { passive: true });

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(updateArrows);
      ro.observe(track);
    }

    if ('MutationObserver' in window) {
      const mo = new MutationObserver(updateArrows);
      mo.observe(track, { childList: true });
    }

    setTimeout(updateArrows, 80);
  }

  function addPublicacoesArrows() {
    if (!isHome()) return;
    const track = document.getElementById('feed-global-container');
    const prev = document.querySelector('.pub-prev');
    const next = document.querySelector('.pub-next');
    if (!track || !prev || !next) return;
    if (track.dataset.pubCarouselReady === '1') return;
    track.dataset.pubCarouselReady = '1';

    // Hardening: em alguns breakpoints havia CSS concorrente (grid/wrap).
    // Forca o comportamento horizontal consistente.
    track.style.display = 'flex';
    track.style.flexWrap = 'nowrap';
    track.style.overflowX = 'auto';
    track.style.overflowY = 'hidden';
    track.style.scrollSnapType = 'x mandatory';
    track.style.scrollBehavior = 'smooth';

    enableDragScroll(track);

    const scrollByPage = (dir) => {
      const amount = Math.max(240, Math.floor(track.clientWidth * 0.85));
      track.scrollBy({ left: dir * amount, behavior: 'smooth' });
    };

    prev.addEventListener('click', () => scrollByPage(-1));
    next.addEventListener('click', () => scrollByPage(1));

    const updateArrows = () => {
      const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
      const cardBasis = vw <= 480
        ? 'clamp(158px, 72vw, 198px)'
        : (vw <= 900 ? 'clamp(164px, 42vw, 212px)' : 'clamp(176px, 31vw, 248px)');
      track.querySelectorAll('.dp-item, .feed-publicacao-card').forEach((card) => {
        card.style.flex = `0 0 ${cardBasis}`;
        card.style.minWidth = cardBasis;
        card.style.scrollSnapAlign = 'start';
      });
      const maxLeft = Math.max(0, track.scrollWidth - track.clientWidth);
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= maxLeft - 2;
    };

    track.addEventListener('scroll', updateArrows, { passive: true });

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(updateArrows);
      ro.observe(track);
    }

    if ('MutationObserver' in window) {
      const mo = new MutationObserver(updateArrows);
      mo.observe(track, { childList: true });
    }

    setTimeout(updateArrows, 80);
  }

  // ----------------------------
  // PARA VOCE + CTA CONTEXTUAL
  // ----------------------------
  
  // ----------------------------
  // BUSCA PEQUENA (USUÁRIOS/PROFISSIONAIS) — após "Para você"
  // ----------------------------
  function isEditableEl(el){
    if(!el) return false;
    const tag = (el.tagName||'').toLowerCase();
    return tag === 'input' || tag === 'textarea' || el.isContentEditable;
  }

  async function sbSearchUsuarios(term){
    const sb = (window.sb && window.sb.from) ? window.sb : (window.getSupabaseClient ? window.getSupabaseClient() : null);
    if(!sb || !term) return [];
    const t = String(term).trim();
    if(t.length < 2) return [];
    const safe = t.replace(/[%_]/g, '\\$&');
    const { data, error } = await sb
      .from('usuarios')
      .select('id, uid, user, nome, foto, isProfissional, categoria_profissional, stats')
      .or(`user.ilike.%${safe}%,nome.ilike.%${safe}%`)
      .limit(12);
    if(error){ console.warn('[DOKE] busca usuarios:', error); return []; }
    return data || [];
  }

    function buildUserCardMini(u){
      const uid = String(u.uid || u.id || '').trim();
      const foto = u.foto || `https://i.pravatar.cc/80?u=${encodeURIComponent(uid || 'u')}`;
      const nomeFull = u.nome || '';
      const handle = normalizeHandle(u.user || (nomeFull ? String(nomeFull).split(' ')[0] : 'usuario'));
      const isProf = u.isProfissional === true;
      const categoria = u.categoria_profissional || 'Profissional';
      const st = (u.stats && typeof u.stats === 'object') ? u.stats : {};
      const n = Number(st.avaliacoes || st.qtd || 0) || 0;
      const m = Number(st.media || st.nota || 0) || 0;
      const meta = isProf ? `★ ${n>0 ? m.toFixed(1) : 'Novo'} (${n})` : '';
      const sub = isProf ? categoria : (nomeFull || '');
      const goto = isProf ? `perfil-profissional.html?uid=${encodeURIComponent(uid)}` : `perfil-usuario.html?uid=${encodeURIComponent(uid)}`;
      return `
        <div class="pv-user-card"
             data-uid="${escapeHtml(uid)}"
             data-handle="${escapeHtml(handle)}"
             data-nome="${escapeHtml(nomeFull)}"
             data-foto="${escapeHtml(foto)}"
             data-isprof="${isProf ? '1' : '0'}"
             data-goto="${escapeHtml(goto)}"
             role="button" tabindex="0"
             onclick="window.location.href='${goto}'"
             onkeydown="if(event.key==='Enter'||event.key===' ') this.click()">
          <img class="pv-user-avatar" src="${foto}" alt="">
          <div class="pv-user-main">
            <div class="pv-user-handle">${escapeHtml(handle)}</div>
            <div class="pv-user-sub">${escapeHtml(sub)}</div>
          </div>
          ${meta ? `<div class="pv-user-meta">${escapeHtml(meta)}</div>` : ``}
        </div>
      `;
    }
  
  // ----------------------------
  // PESQUISA ESTILO INSTAGRAM (NO MENU LATERAL)
  // - Abre dentro do menu lateral (sem navegar)
  // - Recentes separados: Usuários e Anúncios
  // ----------------------------
  function initIgSidebarSearch(){
    const sidebar = document.querySelector('aside.sidebar-icones');
    if(!sidebar || sidebar.dataset.igSearchBound) return;
    sidebar.dataset.igSearchBound = '1';

    const USER_HIST_KEY = 'doke_user_quicksearch_hist_v2';     // já usado na busca inline
    const ADS_HIST_KEY  = 'doke_historico_busca';            // novo: termos de anúncios
    const MODE_KEY      = 'doke_ig_search_mode_v1';

    const readKey = (key, fb=[]) => {
      try{
        const raw = localStorage.getItem(key);
        const v = raw ? JSON.parse(raw) : fb;
        return Array.isArray(v) ? v : fb;
      }catch(e){ return fb; }
    };
    const writeKey = (key, v) => { try{ localStorage.setItem(key, JSON.stringify(v)); }catch(e){} };

    // cria/garante o item no menu
    let item = sidebar.querySelector('#pvSearchSidebarItem');
    if(!item){
      item = document.createElement('div');
      item.className = 'item pv-search-item';
      item.id = 'pvSearchSidebarItem';
      item.innerHTML = `
        <a href="#" class="pv-search-toggle" aria-label="Pesquisar">
          <i class='bx bx-search-alt-2 icon azul'></i>
          <span>Pesquisar</span>
        </a>
      `;
      const logo = sidebar.querySelector('#logo');
      // coloca "Pesquisar" logo abaixo do item "Início" (padrão do menu)
      const links = Array.from(sidebar.querySelectorAll('.item a'));
      const inicioLink = links.find(a => {
        const sp = a.querySelector('span');
        const label = (sp ? sp.textContent : '').trim().toLowerCase();
        const href = (a.getAttribute('href') || '').trim().toLowerCase();
        return label === 'início' || label === 'inicio' || href === 'index.html';
      });
      const inicioItem = inicioLink ? inicioLink.closest('.item') : null;
      if (inicioItem && inicioItem.parentNode === sidebar) {
        sidebar.insertBefore(item, inicioItem.nextSibling);
      } else if (logo && logo.parentNode === sidebar) {
        sidebar.insertBefore(item, logo.nextSibling);
      } else {
        sidebar.insertBefore(item, sidebar.firstChild);
      }
}

    // cria a "tela" de pesquisa dentro do menu
    let screen = sidebar.querySelector('.ig-search-screen');
    if(!screen){
      screen = document.createElement('div');
      screen.className = 'ig-search-screen';
      screen.innerHTML = `
        <div class="ig-search-top">
          <div class="ig-search-title">Pesquisa</div>
          <button class="ig-search-close" type="button" aria-label="Fechar">
            <i class='bx bx-x'></i>
          </button>
        </div>

        <div class="ig-search-inputwrap" role="search">
          <i class='bx bx-search'></i>
          <input class="ig-search-input" type="text" placeholder="Pesquisar usuários" autocomplete="off" />
          <button class="ig-search-clear" type="button" aria-label="Limpar">
            <i class='bx bx-x'></i>
          </button>
        </div>

        <div class="ig-search-tabs" role="tablist" aria-label="Tipo de pesquisa">
          <button type="button" class="ig-tab is-active" data-mode="users" role="tab" aria-selected="true">Usuários</button>
          <button type="button" class="ig-tab" data-mode="ads" role="tab" aria-selected="false">Anúncios</button>
        </div>

        <div class="ig-search-body">
          <div class="ig-recents-head">
            <div class="ig-recents-title">Recentes</div>
            <button class="ig-recents-clearall" type="button">Limpar tudo</button>
          </div>

          <div class="ig-recents-list" role="list"></div>
          <div class="ig-search-results" role="list" aria-live="polite"></div>
        </div>
      `;
      sidebar.appendChild(screen);

      // garante que a tela de pesquisa não cubra o logo da Doke
      try{
        const logoEl = sidebar.querySelector('#logo');
        if(logoEl){
          const h = (logoEl.getBoundingClientRect && logoEl.getBoundingClientRect().height) || logoEl.offsetHeight || 0;
          const top = Math.max(64, Math.round(h + 10));
          sidebar.style.setProperty('--ig-search-top', top + 'px');
        }
      }catch(e){}
    }

    const input     = screen.querySelector('.ig-search-input');
    const inputWrap = screen.querySelector('.ig-search-inputwrap');
    const btnClose  = screen.querySelector('.ig-search-close');
    const btnClear  = screen.querySelector('.ig-search-clear');
    const clearAll  = screen.querySelector('.ig-recents-clearall');
    const recentsEl = screen.querySelector('.ig-recents-list');
    const resultsEl = screen.querySelector('.ig-search-results');
    const tabs      = Array.from(screen.querySelectorAll('.ig-tab'));

    let mode = (readKey(MODE_KEY, ['users'])[0] || 'users');
    if(mode !== 'users' && mode !== 'ads') mode = 'users';

function syncClear(){
  try{
    const has = !!(input && input.value && input.value.trim());
    inputWrap && inputWrap.classList.toggle('has-value', has);
  }catch(e){}
}


    function setMode(next){
      mode = next === 'ads' ? 'ads' : 'users';
      writeKey(MODE_KEY, [mode]);
      tabs.forEach(t=>{
        const on = t.dataset.mode === mode;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      input.placeholder = mode === 'ads' ? 'Pesquisar anúncios' : 'Pesquisar usuários';
      syncClear();
      render();
      input.focus();
      input.select();
    }

    function readUserRecents(){
      const arr = readKey(USER_HIST_KEY, []);
      return arr.filter(x => x && typeof x === 'object' && x.t === 'user');
    }
    function writeUserRecents(list){
      // mantém o formato usado pela busca inline
      const others = readKey(USER_HIST_KEY, []).filter(x => !(x && typeof x === 'object' && x.t === 'user'));
      writeKey(USER_HIST_KEY, [...list, ...others].slice(0, 18));
    }

    function readAdsRecents(){
      const arr = readKey(ADS_HIST_KEY, []);
      // aceita string antiga ou objeto
      return arr.map(x=>{
        if(!x) return null;
        if(typeof x === 'string') return { q:x, ts:0 };
        if(typeof x === 'object') return x;
        return null;
      }).filter(Boolean);
    }
    function writeAdsRecents(list){
      // salva como array de strings (compatível com a busca inline)
      const arr = (list||[]).map(x=>{
        if(!x) return null;
        if(typeof x === 'string') return x;
        if(typeof x === 'object') return (x.q||'');
        return null;
      }).filter(Boolean).map(s=>String(s).trim()).filter(Boolean);
      writeKey(ADS_HIST_KEY, arr.slice(0, 12));
    }

    function rememberAdTerm(term){
      const t = String(term||'').trim();
      if(t.length < 2) return;

      // Mantém em sincronia com o histórico global da busca
      try{ if(typeof window.salvarBusca === 'function') window.salvarBusca(t); }catch(_){}

      let arr = readAdsRecents();
      arr = arr.filter(x => String(x.q||'').toLowerCase() !== t.toLowerCase());
      arr = [{ q:t, ts:Date.now() }, ...arr];
      writeAdsRecents(arr);
    }

    function removeUser(uid){
      const u = String(uid||'').trim();
      if(!u) return;
      const arr = readUserRecents().filter(x => String(x.uid||'') !== u);
      writeUserRecents(arr);
      renderRecents();
    }
    function removeAd(q){
      const t = String(q||'').trim().toLowerCase();
      const arr = readAdsRecents().filter(x => String(x.q||'').trim().toLowerCase() !== t);
      writeAdsRecents(arr);
      renderRecents();
    }

    function clearAllRecents(){
      if(mode === 'users'){
        // remove só os "user"
        const others = readKey(USER_HIST_KEY, []).filter(x => !(x && typeof x === 'object' && x.t === 'user'));
        writeKey(USER_HIST_KEY, others);
      } else {
        writeKey(ADS_HIST_KEY, []);
        try{ if(typeof window.atualizarListaHistorico === 'function') window.atualizarListaHistorico(); }catch(_){}
}
      renderRecents();
      resultsEl.innerHTML = '';
    }

    function rowEmpty(){
      return `
        <div class="ig-empty">
          <i class='bx bx-time-five'></i>
          <div>
            <div class="ig-empty-title">Sem histórico</div>
            <div class="ig-empty-sub">Suas pesquisas recentes aparecem aqui.</div>
          </div>
        </div>
      `;
    }

    function renderRecents(){
      resultsEl.innerHTML = '';
      const term = input.value.trim();

      if(mode === 'users'){
        const users = readUserRecents();
        if(!users.length){
          recentsEl.innerHTML = rowEmpty();
          return;
        }
        recentsEl.innerHTML = users.slice(0, 12).map(u=>{
          const uid = escapeHtml(String(u.uid||''));
          const foto = escapeHtml(u.foto || `https://i.pravatar.cc/88?u=${encodeURIComponent(uid||'u')}`);
          const handle = escapeHtml(u.handle || '@usuario');
          const nome = escapeHtml(u.nome || '');
          const sub = escapeHtml(u.isProf ? (u.nome ? u.nome : 'Profissional') : (u.nome ? u.nome : 'Usuário'));
          const goto = u.isProf ? `perfil-profissional.html?uid=${encodeURIComponent(u.uid||'')}` : `perfil-usuario.html?uid=${encodeURIComponent(u.uid||'')}`;
          return `
            <div class="ig-row" role="listitem" data-uid="${uid}" data-goto="${escapeHtml(goto)}">
              <img class="ig-avatar" src="${foto}" alt="">
              <div class="ig-main">
                <div class="ig-line1"><span class="ig-handle">${handle}</span><span class="ig-badge ${u.isProf ? 'is-prof' : 'is-user'}">${u.isProf ? 'Profissional' : 'Usuário'}</span></div>
                <div class="ig-line2">${nome || (u.isProf ? 'Conta profissional' : 'Conta')}</div>
              </div>
              <button class="ig-remove" type="button" aria-label="Remover"><i class='bx bx-x'></i></button>
            </div>
          `;
        }).join('');

        recentsEl.querySelectorAll('.ig-row').forEach(row=>{
          const goto = row.getAttribute('data-goto') || '';
          const uid  = row.getAttribute('data-uid') || '';
          row.addEventListener('click', (e)=>{
            if(e.target && (e.target.closest('.ig-remove'))) return;
            if(goto) window.location.href = goto;
          });
          const rm = row.querySelector('.ig-remove');
          rm && rm.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); removeUser(uid); });
        });

      } else {
        const ads = readAdsRecents();
        if(!ads.length){
          recentsEl.innerHTML = rowEmpty();
          return;
        }
        recentsEl.innerHTML = ads.slice(0, 12).map(a=>{
          const q = escapeHtml(String(a.q||''));
          return `
            <div class="ig-row ig-row-term" role="listitem" data-q="${q}">
              <div class="ig-ico"><i class='bx bx-search'></i></div>
              <div class="ig-main">
                <div class="ig-line1">${q}</div>
                <div class="ig-line2">Pesquisar anúncios</div>
              </div>
              <button class="ig-remove" type="button" aria-label="Remover"><i class='bx bx-x'></i></button>
            </div>
          `;
        }).join('');

        recentsEl.querySelectorAll('.ig-row-term').forEach(row=>{
          const q = row.getAttribute('data-q') || '';
          row.addEventListener('click', (e)=>{
            if(e.target && (e.target.closest('.ig-remove'))) return;
            input.value = q;
            input.focus();
            showAdSearchAction(q);
          });
          const rm = row.querySelector('.ig-remove');
          rm && rm.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); removeAd(q); });
        });
      }
    }

    function showAdSearchAction(q){
      const term = String(q||'').trim();
      resultsEl.innerHTML = '';
      if(term.length < 2) return;
      resultsEl.innerHTML = `
        <div class="ig-row ig-row-action" role="listitem" data-q="${escapeHtml(term)}">
          <div class="ig-ico"><i class='bx bx-right-arrow-alt'></i></div>
          <div class="ig-main">
            <div class="ig-line1">Pesquisar anúncios por “${escapeHtml(term)}”</div>
            <div class="ig-line2">Abrir resultados</div>
          </div>
        </div>
      `;
      resultsEl.querySelector('.ig-row-action')?.addEventListener('click', ()=>{
        rememberAdTerm(term);
        window.location.href = `busca.html?q=${encodeURIComponent(term)}&src=sidebar`;
      });
    }

    async function runUserSearch(q){
      const term = String(q||'').trim();
      resultsEl.innerHTML = '';
      if(term.length < 2) return;

      resultsEl.innerHTML = `<div class="ig-loading"><span></span><small>Buscando…</small></div>`;
      let list = [];
      try{
        list = await sbSearchUsuarios(term);
      }catch(e){
        console.warn('[DOKE] ig search users error', e);
      }
      if(!list.length){
        resultsEl.innerHTML = `
          <div class="ig-empty">
            <i class='bx bx-search'></i>
            <div>
              <div class="ig-empty-title">Nada encontrado</div>
              <div class="ig-empty-sub">Tente outro nome ou @usuário.</div>
            </div>
          </div>
        `;
        return;
      }

      resultsEl.innerHTML = list.map(u=>{
        const uid = String(u.uid || u.id || '').trim();
        const foto = u.foto || `https://i.pravatar.cc/88?u=${encodeURIComponent(uid||'u')}`;
        const nomeFull = u.nome || '';
        const handle = normalizeHandle(u.user || (nomeFull ? String(nomeFull).split(' ')[0] : 'usuario'));
        const isProf = u.isProfissional === true;
        const categoria = u.categoria_profissional || 'Profissional';
        const sub = isProf ? categoria : (nomeFull || 'Usuário');
        const goto = isProf ? `perfil-profissional.html?uid=${encodeURIComponent(uid)}` : `perfil-usuario.html?uid=${encodeURIComponent(uid)}`;
        return `
          <div class="ig-row ig-row-user" role="listitem"
               data-uid="${escapeHtml(uid)}"
               data-handle="${escapeHtml(handle)}"
               data-nome="${escapeHtml(nomeFull)}"
               data-foto="${escapeHtml(foto)}"
               data-isprof="${isProf ? '1' : '0'}"
               data-goto="${escapeHtml(goto)}">
            <img class="ig-avatar" src="${escapeHtml(foto)}" alt="">
            <div class="ig-main">
              <div class="ig-line1"><span class="ig-handle">${escapeHtml(handle)}</span><span class="ig-badge ${isProf ? 'is-prof' : 'is-user'}">${isProf ? 'Profissional' : 'Usuário'}</span></div>
              <div class="ig-line2">${escapeHtml(nomeFull || (isProf ? categoria : 'Usuário'))}</div>
            </div>
          </div>
        `;
      }).join('');

      resultsEl.querySelectorAll('.ig-row-user').forEach(row=>{
        row.addEventListener('click', ()=>{
          const uid = row.getAttribute('data-uid') || '';
          const handle = row.getAttribute('data-handle') || '';
          const nome = row.getAttribute('data-nome') || '';
          const foto = row.getAttribute('data-foto') || '';
          const isProf = row.getAttribute('data-isprof') === '1';
          const goto = row.getAttribute('data-goto') || '';
          // salva no histórico
          let arr = readUserRecents();
          arr = arr.filter(x => String(x.uid||'') !== String(uid));
          arr = [{
            t:'user', uid, handle, nome, foto, isProf, ts: Date.now()
          }, ...arr];
          writeUserRecents(arr);
          // navega
          if(goto) window.location.href = goto;
        });
      });
    }

    function render(){
      renderRecents();
      // se tiver texto, mostra ação/busca
      const term = input.value.trim();
      if(term.length >= 2){
        if(mode === 'ads') showAdSearchAction(term);
        else runUserSearch(term);
      }
    }

    // open/close
    function open(){
      // garante menu aberto (caso o usuário dispare por atalho)
      try{
        sidebar.classList.add('menu-aberto');
        document.body.classList.add('menu-ativo');
      }catch(e){}
      sidebar.classList.add('ig-search-open');
      setMode(mode); // também renderiza
      setTimeout(()=>{ try{ input.focus(); input.select(); }catch(e){} }, 50);
    }
    function close(){
      sidebar.classList.remove('ig-search-open');
      input.value = '';
      syncClear();
      syncClear();
      resultsEl.innerHTML = '';
      renderRecents();
    }

    // expõe global pra atalho Ctrl/Cmd+K
    window.openDokeSidebarSearch = open;

    // eventos
    item.querySelector('.pv-search-toggle')?.addEventListener('click', (e)=>{ e.preventDefault(); open(); });
    btnClose?.addEventListener('click', close);
    btnClear?.addEventListener('click', ()=>{
      input.value = '';
      resultsEl.innerHTML = '';
      renderRecents();
      input.focus();
    });

    clearAll?.addEventListener('click', clearAllRecents);

    tabs.forEach(t=>{
      t.addEventListener('click', ()=> setMode(t.dataset.mode));
    });

    let timer = null;
    input?.addEventListener('input', ()=>{
      clearTimeout(timer);
      timer = setTimeout(render, 220);
    });

    input?.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape'){ e.preventDefault(); close(); return; }
      if(e.key === 'Enter'){
        const term = input.value.trim();
        if(mode === 'ads' && term.length >= 2){
          rememberAdTerm(term);
          window.location.href = `busca.html?q=${encodeURIComponent(term)}&src=sidebar`;
        }
      }
    });

    document.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape' && sidebar.classList.contains('ig-search-open')) close();
    });

    // estado inicial
    setMode(mode);
  }


  // [DOKE] garante inicialização do painel de Pesquisa no menu lateral em todas as páginas
  // (o menu lateral existe em múltiplos HTMLs, então não pode depender do 'Para você')
  document.addEventListener('DOMContentLoaded', ()=>{ try{ initIgSidebarSearch(); }catch(e){} });

function buildPvQuickSearchSection(anchorSection, mountEl){
      if (!isHome()) return;
      // Busca rápida (dentro do "Para você" por padrão)
      if (document.getElementById('pvQuickSearchSection')) return;

      // ---- Pesquisa estilo Instagram no menu lateral (abre dentro do menu) ----
      try { initIgSidebarSearch(); } catch(e) { /* ignore */ }


      const wrap = document.createElement(mountEl ? 'div' : 'section');
      wrap.id = 'pvQuickSearchSection';
      wrap.className = mountEl ? 'pv-inline-search' : 'pv-inline-search-section pv-inline-search-section--stealth';

      // UI mais "escondida": menor, alinhada à esquerda, abre ao focar
      wrap.innerHTML = `
        <div class="pv-inline-top">
          <div class="pv-inline-title">
            <div class="pv-inline-label"><i class='bx bx-search'></i> Pesquisar</div>
            <div class="pv-inline-help" id="pvQuickHint" aria-live="polite"></div>
          </div>

          <div class="pv-inline-toggles" role="tablist" aria-label="Filtrar busca">
            <button type="button" class="pv-toggle is-active" data-mode="pro" role="tab" aria-selected="true">Profissionais</button>
            <button type="button" class="pv-toggle" data-mode="user" role="tab" aria-selected="false">Usuários</button>
          </div>
        </div>

        <div class="pv-search pv-search--inline pv-search--compact">
          <div class="pv-search-box pv-search-box--blue pv-search-box--compact">
            <i class='bx bx-search'></i>
            <input id="pvQuickSearchInput" type="text" placeholder="Buscar profissionais..." autocomplete="off" />
            <button type="button" class="pv-search-clear" title="Limpar" aria-label="Limpar">
              <i class='bx bx-x-circle'></i>
            </button>
          </div>

          <div class="pv-collapsible">
            <div class="pv-history" id="pvHistoryWrap" style="display:none;">
              <div class="pv-history-title">Histórico</div>
              <div class="quick-chips pv-quick-chips" id="pvQuickChips"></div>
            </div>
            <div class="pv-quick-results" id="pvQuickResults"></div>
          </div>
        </div>
      `;

      // Mount
      if (mountEl) {
        mountEl.appendChild(wrap);
      } else {
        const pv = document.getElementById('paraVoceSection');
        if (pv) pv.insertAdjacentElement('afterend', wrap);
        else if (anchorSection && anchorSection.parentNode) anchorSection.parentNode.insertBefore(wrap, anchorSection);
      }

      const input = wrap.querySelector('#pvQuickSearchInput');
      const results = wrap.querySelector('#pvQuickResults');
      const chipsWrap = wrap.querySelector('#pvHistoryWrap');
      const chips = wrap.querySelector('#pvQuickChips');
      const clearBtn = wrap.querySelector('.pv-search-clear');
      const hint = wrap.querySelector('#pvQuickHint');
      const toggles = wrap.querySelectorAll('.pv-toggle');

      let mode = 'pro'; // 'pro' | 'user'

      const setMode = (m) => {
        mode = (m === 'user') ? 'user' : 'pro';
        toggles.forEach(b=>{
          const on = (b.getAttribute('data-mode') === mode);
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        input.placeholder = mode === 'pro' ? 'Buscar profissionais...' : 'Buscar usuários...';
        results.innerHTML = '';
        renderHistory();
        if (input.value.trim().length >= 2) run();
      };

      toggles.forEach(btn=>{
        btn.addEventListener('click', ()=>{
          setMode(btn.getAttribute('data-mode') || 'pro');
          try{ input.focus(); }catch(e){}
        });
      });

      const open = () => wrap.classList.add('is-open');
      const close = () => {
        // fecha só se vazio (pra não atrapalhar quem está digitando)
        const t = input.value.trim();
        if (t.length < 1) wrap.classList.remove('is-open');
      };

      // ---- Histórico (prioriza perfis clicados; sem sugestões fixas) ----
      const HIST_KEY = 'doke_user_quicksearch_hist_v2';
      const readHist = () => {
        try{
          const raw = localStorage.getItem(HIST_KEY);
          const arr = raw ? JSON.parse(raw) : [];
          if(!Array.isArray(arr)) return [];
          return arr.map(x=>{
            if(!x) return null;
            if(typeof x === 'string') return { t:'term', q:x, ts:0 };
            if(typeof x === 'object') return x;
            return null;
          }).filter(Boolean);
        }catch(e){ return []; }
      };
      const writeHist = (arr) => {
        try{ localStorage.setItem(HIST_KEY, JSON.stringify(arr.slice(0,10))); }catch(e){}
      };
      const rememberTerm = (term) => {
        const t = (term||'').trim();
        if (t.length < 2) return;
        let arr = readHist();
        arr = arr.filter(x => !(x.t === 'term' && String(x.q||'').toLowerCase() === t.toLowerCase()));
        arr = [{ t:'term', q:t, ts: Date.now() }, ...arr];
        writeHist(arr);
      };
      const rememberUser = (obj) => {
        if(!obj) return;
        const uid = String(obj.uid||'').trim();
        if(!uid) return;
        let arr = readHist();
        arr = arr.filter(x => !(x.t === 'user' && String(x.uid||'') === uid));
        arr = [{
          t:'user',
          uid,
          handle: obj.handle || '',
          nome: obj.nome || '',
          foto: obj.foto || '',
          isProf: !!obj.isProf,
          ts: Date.now()
        }, ...arr];
        writeHist(arr);
      };

      function renderHistory(){
        if (!chips || !chipsWrap) return;
        const arr = readHist();
        const users = arr.filter(x => x.t === 'user');
        const terms = arr.filter(x => x.t === 'term');

        // regra: mostrar histórico "de usuários" primeiro; termos só se não houver usuários
        const showUsers = users.length > 0;
        const list = showUsers ? users : terms;

        if (!list.length){
          chipsWrap.style.display = 'none';
          chips.innerHTML = '';
          return;
        }

        chipsWrap.style.display = 'block';

        if (showUsers){
          chips.innerHTML = list.slice(0,7).map(u=>{
            const goto = (u.isProf || mode === 'pro') ? `perfil-profissional.html?uid=${encodeURIComponent(u.uid||'')}` : `perfil-usuario.html?uid=${encodeURIComponent(u.uid||'')}`;
            const foto = u.foto || `https://i.pravatar.cc/60?u=${encodeURIComponent(u.uid||'u')}`;
            const label = u.handle || (u.nome ? '@'+String(u.nome).split(' ')[0] : '@usuario');
            return `<button type="button" class="pv-hist-chip" data-goto="${escapeHtml(goto)}" title="${escapeHtml(u.nome||label)}">
                      <img src="${escapeHtml(foto)}" alt="">
                      <span>${escapeHtml(label)}</span>
                    </button>`;
          }).join('');
          chips.querySelectorAll('.pv-hist-chip').forEach(btn=>{
            btn.addEventListener('click', ()=>{
              const goto = btn.getAttribute('data-goto') || '';
              if(goto) window.location.href = goto;
            });
          });
        } else {
          chips.innerHTML = list.slice(0,7).map(t=>{
            const q = t.q || '';
            return `<button type="button" class="quick-chip" data-q="${escapeHtml(q)}"><i class='bx bx-time-five'></i> ${escapeHtml(q)}</button>`;
          }).join('');
          chips.querySelectorAll('button').forEach(btn=>{
            btn.addEventListener('click', ()=>{
              input.value = btn.getAttribute('data-q') || '';
              input.focus();
              run();
            });
          });
        }
      }

      clearBtn && clearBtn.addEventListener('click', ()=>{
        input.value = '';
        results.innerHTML = '';
        if (hint) hint.textContent = '';
        renderHistory();
        input.focus();
      });

      let timer = null;
      let lastRunTerm = '';

      async function run(){
        const term = input.value.trim();
        results.innerHTML = '';
        if (hint) hint.textContent = '';
        if (term.length < 2){
          renderHistory();
          return;
        }
        lastRunTerm = term;
        results.innerHTML = `<div class="pv-loading">Buscando...</div>`;
        let list = await sbSearchUsuarios(term);
        if (term !== lastRunTerm) return; // stale

        // filtra por modo
        if (mode === 'pro') list = (list||[]).filter(u => u && u.isProfissional === true);
        else list = (list||[]).filter(u => u && u.isProfissional !== true);

        if (!list.length) {
          results.innerHTML = `<div class="pv-empty-mini">${mode === 'pro' ? 'Nenhum profissional encontrado.' : 'Nenhum usuário encontrado.'}</div>`;
          return;
        }

        results.innerHTML = list.map(buildUserCardMini).join('');

        // captura clique pra salvar histórico de perfil antes do redirect
        results.querySelectorAll('.pv-user-card').forEach(card=>{
          card.addEventListener('click', ()=>{
            try{
              const uid = card.getAttribute('data-uid') || '';
              if(uid){
                rememberUser({
                  uid,
                  handle: card.getAttribute('data-handle') || '',
                  nome: card.getAttribute('data-nome') || '',
                  foto: card.getAttribute('data-foto') || '',
                  isProf: card.getAttribute('data-isprof') === '1'
                });
                renderHistory();
              } else {
                rememberTerm(term);
                renderHistory();
              }
            }catch(e){}
          }, { capture:true });
        });
      }

      input.addEventListener('input', ()=>{
        open();
        if(timer) clearTimeout(timer);
        timer = setTimeout(run, 260);
      });

      input.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter'){
          const term = input.value.trim();
          if (term.length < 2){
            try{ window.dokeToast ? window.dokeToast('Digite pelo menos 2 letras para buscar.', 'warning') : (window.mostrarToast ? window.mostrarToast('Digite pelo menos 2 letras para buscar.', 'warning') : null); }catch(_e){}
            wrap.classList.add('pv-shake');
            setTimeout(()=>wrap.classList.remove('pv-shake'), 350);
            if (hint) hint.textContent = 'Digite pelo menos 2 letras.';
            e.preventDefault();
            return;
          }
          rememberTerm(term);
          renderHistory();
        }
      });

      input.addEventListener('focus', ()=>{
        open();
        renderHistory();
      });

      input.addEventListener('blur', ()=>{
        // delay pra permitir clique em chips/resultados
        setTimeout(close, 160);
      });

      const focusInline = () => {
        try{
          const host = document.getElementById('paraVoceSection') || wrap;
          host.scrollIntoView({ behavior:'smooth', block:'start' });
        }catch(_e){}
        setTimeout(()=>{
          try{ input.focus(); input.select(); }catch(_e){}
          try{ open(); renderHistory(); }catch(_e){}
        }, 220);
      };

      // Atalho Ctrl/Cmd + K para focar a busca
      document.addEventListener('keydown', (e)=>{
        if (!isHome()) return;
        if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') {
          if (isEditableEl(e.target)) return;
          e.preventDefault();
          if (typeof window.openDokeSidebarSearch === 'function') window.openDokeSidebarSearch();
          else focusInline();
        }
      });
    }
  function buildParaVoceSection() {
      if (!isHome()) return;
      if (document.getElementById('paraVoceSection')) return;

      // Melhor posicao: antes de "Profissionais em Destaque".
      // Se nao existir (por algum motivo), cai para categorias/videos.
      const anchor = document.querySelector('.pros-section') || document.querySelector('.categories-section') || document.querySelector('.videos-container');
      if (!anchor) return;

      const sec = document.createElement('section');
      sec.className = 'para-voce-section';
      sec.id = 'paraVoceSection';

      const historico = readJSON('doke_historico_busca', []);
      const clicks = readJSON('doke_categorias_click', []);

      let sugeridos = [...new Set([
        ...clicks.slice(0, 6),
        ...historico.slice(0, 6),
        ...(window.__dokeTopCats || []).slice(0, 6),
      ].filter(Boolean))].slice(0, 10);

      const semHist = !sugeridos.length;
      if (semHist) {
        const fallback = (window.__dokeTopCats || []).slice(0, 8);
        const base = fallback.length ? fallback : ['Eletricista','Diarista','Encanador','Pintor','Manicure','Limpeza','Reforma','Aulas'];
        sugeridos = [...new Set(base)].slice(0, 10);
      }

      sec.innerHTML = `
        <div class="para-voce-inner pv-stack">
          <div class="pv-stack-grid">
            <div class="pv-stack-main">
              <div class="pv-head">
                <div class="pv-title-row">
                  <h2>Para você</h2>
                  <span class="pv-badge">${semHist ? 'Comece agora' : 'Personalizado'}</span>
                </div>
                <div class="pv-sub">Sugestões com base nas suas interações recentes</div>
              </div>

              <div class="pv-chips" id="pvChips">
                ${semHist ? `<div class="pv-empty-row"><i class='bx bx-sparkle'></i><div><b>Sem histórico ainda.</b> Clique em uma sugestão para começar.</div></div>` : ``}
                <div class="pv-chips-row">
                  ${sugeridos.map(t => `<button type="button" class="pv-chip" data-q="${esc(t)}">${esc(t)}</button>`).join('')}
                </div>
              </div>

                          </div>
          </div>
        </div>
      `;

      anchor.parentNode.insertBefore(sec, anchor);
      // Insere busca pequena logo após o 'Para você'
sec.querySelectorAll('.pv-chip').forEach((b) => {
        b.addEventListener('click', () => {
          const q = b.getAttribute('data-q') || '';
          if (!q) return;
          try { window.salvarBusca?.(q); } catch {}
          window.location.href = `busca.html?q=${encodeURIComponent(q)}&src=para_voce`;
        });
      });
    }

    // ----------------------------

  // ----------------------------
  // BUSCA MAIS VIVA: autocomplete + pins
  // ----------------------------
  function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  }

  function getPins() {
    return readJSON('doke_busca_pins', []);
  }

  function togglePin(term) {
    const pins = getPins();
    const low = String(term).toLowerCase();
    const exists = pins.some(x => String(x).toLowerCase() == low);
    const next = exists ? pins.filter(x => String(x).toLowerCase() != low) : [term, ...pins];
    writeJSON('doke_busca_pins', next.slice(0, 12));
  }

  function setupSmartSearch() {
    const input = document.getElementById('inputBusca');
    const dropdown = document.getElementById('buscaDropdown');
    const wrapper = document.getElementById('buscaWrapper');
    if (!input || !dropdown) return;

    let box = document.getElementById('dokeSugestoes');
    const histEl = document.getElementById('containerHistorico');
    if (!box) {
      box = document.createElement('div');
      box.id = 'dokeSugestoes';
      dropdown.appendChild(box);
    }
    // ordem: hint -> historico -> sugestoes
    try {
      const hint = dropdown.querySelector('.busca-hint');
      if (histEl && histEl.parentNode === dropdown) {
        // garante historico logo apos o hint
        if (hint && hint.nextElementSibling !== histEl) {
          dropdown.insertBefore(histEl, hint.nextElementSibling);
        }
        // garante sugestoes depois do historico
        if (box.previousElementSibling !== histEl) {
          dropdown.insertBefore(box, histEl.nextElementSibling);
        }
      }
    } catch {}

    const termosPopulares = ['Eletricista', 'Pintor', 'Encanador', 'Diarista', 'Design', 'Aulas'];

    function buildSuggestions(query) {
      const q = String(query || '').trim().toLowerCase();
      const pins = getPins();
      const hist = readJSON('doke_historico_busca', []);
      const cats = (window.__dokeTopCats || []).slice(0, 12);

      const pool = [...new Set([...pins, ...cats, ...termosPopulares])].filter(Boolean);
      let list = pool;
      if (q) list = pool.filter(t => String(t).toLowerCase().includes(q));
      list = list.slice(0, 7);

      if (!list.length) {
        box.innerHTML = '';
        return;
      }

      box.innerHTML = `
        <div class="sug-title">Sugestões</div>
        <div class="sug-list">
          ${list.map(t => {
            const pinned = pins.some(p => String(p).toLowerCase() === String(t).toLowerCase());
            return `
              <div class="sug-item" data-term="${esc(t)}">
                <div class="sug-left">
                  <span class="sug-dot"></span>
                  <span class="sug-text">${esc(t)}</span>
                </div>
                <button class="sug-pin" type="button" aria-label="${pinned ? 'Remover de favoritados' : 'Adicionar aos favoritados'}" data-pin="${pinned ? '1' : '0'}">${pinned ? '★' : '☆'}</button>
              </div>
            `;
          }).join('')}
        </div>
      `;

      box.querySelectorAll('.sug-item').forEach((row) => {
        const term = row.getAttribute('data-term') || '';
        const pinBtn = row.querySelector('.sug-pin');

        row.addEventListener('click', (e) => {
          if (e.target === pinBtn) return;
          try { window.salvarBusca?.(term); } catch {}
          window.location.href = `busca.html?q=${encodeURIComponent(term)}&src=sugestao`;
        });

        pinBtn?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          togglePin(term);
          buildSuggestions(input.value);
        });
      });
    }

    input.addEventListener('input', () => {
      buildSuggestions(input.value);
      // Garante que a classe active seja adicionada
      if (wrapper && !wrapper.classList.contains('active')) {
        wrapper.classList.add('active');
      }
    });
    input.addEventListener('focus', () => {
      buildSuggestions(input.value);
      // Garante que a classe active seja adicionada
      if (wrapper && !wrapper.classList.contains('active')) {
        wrapper.classList.add('active');
      }
    });
  }

  // ----------------------------
  // INIT
  // ----------------------------
  document.addEventListener('DOMContentLoaded', () => {
    // categorias
    initCategoriasHome();

    // para voce + CTA
    buildParaVoceSection();

    // busca viva
    setupSmartSearch();

    // profissionais: setas + drag + sem corte
    addProsArrows();
    addVideosArrows();
    addPublicacoesArrows();

    // drag no carrossel de categorias tb
    const catTrack = document.getElementById('categoriesCarousel');
    if (catTrack) enableDragScroll(catTrack);
  });
})();
/* ==== /DOKE: INDEX ENHANCEMENTS V2 ==== */

/*************************************************
 * SUPABASE HELPER
 *************************************************/
function getSB() {
  return window.sb || window.supabase || window.supabaseClient || null;
}

async function waitForSB(timeout = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const sb = getSB();
    if (sb && typeof sb.from === "function") return sb;
    await new Promise(r => setTimeout(r, 50));
  }
  return null;
}

/*************************************************
 * PERFIL PÚBLICO
 *************************************************/
function abrirPerfil(uid) {
  if (!uid) return;
  if (typeof window.irParaPerfilComContagem === "function") {
    window.irParaPerfilComContagem(uid);
    return;
  }
  window.location.href = `perfil-profissional.html?uid=${encodeURIComponent(uid)}`;
}

/*************************************************
 * CARD DO PROFISSIONAL
 *************************************************/
function cardPro(p) {
  const foto = p.foto || p.fotoAutor || "https://i.pravatar.cc/150";
  const nome = p.userHandle || (p.nomeAutor ? p.nomeAutor.split(" ")[0] : "Profissional");
  const profissao = p.categoria || "Profissional";

  const ratingHtml =
    p.numAvaliacoes > 0
      ? `<div class="pro-rating">★ ${p.mediaAvaliacao.toFixed(1)} (${p.numAvaliacoes})</div>`
      : `<div class="badge-novo">Novo</div>`;

  return `
    <div class="pro-card" onclick="abrirPerfil('${p.uid}')">
      <img src="${foto}" class="pro-avatar js-user-link" data-uid="${p.uid}" alt="${nome}">
      <div class="pro-name js-user-link" data-uid="${p.uid}">${nome}</div>
      <div class="pro-role">${profissao}</div>
      ${ratingHtml}
      <button class="btn-ver-perfil js-user-link" data-uid="${p.uid}" type="button">Ver Perfil</button>
    </div>
  `;
}

/*************************************************
 * AGRUPA ANÚNCIOS → PROFISSIONAIS
 *************************************************/
function agruparProfissionais(anuncios) {
  const map = new Map();

  anuncios.forEach(a => {
    if (!a.uid) return;

    if (!map.has(a.uid)) {
      map.set(a.uid, {
        uid: a.uid,
        nomeAutor: a.nomeAutor || "",
        fotoAutor: a.fotoAutor || "",
        userHandle: a.userHandle || "",
        categoria: a.categoria || "",
        soma: 0,
        qtd: 0,
        dataCriacao: a.dataCriacao || a.created_at || null
      });
    }

    const p = map.get(a.uid);

    const m = Number(a.mediaAvaliacao || 0);
    const n = Number(a.numAvaliacoes || 0);

    if (m > 0 && n > 0) {
      p.soma += m * n;
      p.qtd += n;
    }

    if (a.dataCriacao) {
      const atual = new Date(p.dataCriacao || 0).getTime();
      const nova = new Date(a.dataCriacao).getTime();
      if (nova > atual) p.dataCriacao = a.dataCriacao;
    }
  });

  return Array.from(map.values()).map(p => ({
    ...p,
    mediaAvaliacao: p.qtd > 0 ? p.soma / p.qtd : 0,
    numAvaliacoes: p.qtd,
    foto: p.fotoAutor
  }));
}

/*************************************************
 * CARREGA PROFISSIONAIS NO INDEX
 *************************************************/
async function carregarProfissionaisIndex() {
  const destaqueEl = document.getElementById("prosDestaque");
  const novosEl = document.getElementById("prosNovos");
  if (!destaqueEl || !novosEl) return;

  destaqueEl.innerHTML = "";
  novosEl.innerHTML = "";

  // skeleton (estado vazio bonito)
  const proSkel = () => `
    <div class="pro-card pro-skel" aria-hidden="true">
      <span class="skel pro-skel-topDot"></span>
      <div class="pro-avatar skel"></div>
      <div class="pro-name skel"></div>
      <div class="pro-role skel"></div>
      <div class="skel pro-skel-rating"></div>
      <div class="btn-ver-perfil skel"></div>
    </div>
  `;
  destaqueEl.innerHTML = Array.from({length:6}).map(proSkel).join("");
  novosEl.innerHTML = Array.from({length:6}).map(proSkel).join("");

  const sb = await waitForSB();
  if (!sb) {
    console.warn("Supabase não disponível.");
    return;
  }

  const { data: anuncios, error } = await sb
    .from("anuncios")
    .select("uid,nomeAutor,fotoAutor,userHandle,categoria,mediaAvaliacao,numAvaliacoes,dataCriacao")
    .limit(1000);

  if (error) {
    console.error("Erro ao buscar anúncios:", error);
    return;
  }

  const profs = agruparProfissionais(anuncios || []);

  // ⭐ Destaque = só quem tem avaliação
  const destaque = profs
    .filter(p => p.numAvaliacoes > 0)
    .sort((a, b) => b.mediaAvaliacao - a.mediaAvaliacao)
    .slice(0, 10);

  // 🆕 Novos = sem avaliação
  const novos = profs
    .filter(p => p.numAvaliacoes === 0)
    .sort((a, b) => new Date(b.dataCriacao || 0) - new Date(a.dataCriacao || 0))
    .slice(0, 10);

  destaqueEl.innerHTML = destaque.length
    ? destaque.map(cardPro).join("")
    : `
      <div class="pros-empty">
        <i class='bx bx-award'></i>
        <div class="pros-empty-text">
          <div class="pros-empty-title">Nenhum profissional em destaque no momento.</div>
          <div class="pros-empty-sub">Assim que receberem avaliações, eles aparecem aqui.</div>
        </div>
        <a class="pros-empty-btn" href="busca.html">Explorar</a>
      </div>
    `;

  novosEl.innerHTML = novos.length
    ? novos.map(cardPro).join("")
    : `
      <div class="pros-empty">
        <i class='bx bx-user-plus'></i>
        <div class="pros-empty-text">
          <div class="pros-empty-title">Ainda não há profissionais novos cadastrados.</div>
          <div class="pros-empty-sub">Quer aparecer aqui? Complete seu cadastro profissional.</div>
        </div>
        <a class="pros-empty-btn" href="tornar-profissional.html">Começar</a>
      </div>
    `;
}

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", carregarProfissionaisIndex);


// Atualiza o header com bairro/cidade quando disponível
document.addEventListener('DOMContentLoaded', function(){
  try{ window.atualizarTelaCep(''); }catch(_e){}
});


/*************************************************
 * NEGÓCIOS (negocios.html / perfil-empresa.html / negocio.html)
 * - Sem WhatsApp: CTA sempre leva para chat.html
 * - Localização: usa CEP salvo e botão "Usar localização atual" (geo)
 *************************************************/
(function(){
  const PAGE = document.body?.dataset?.page;
  const sb = () => (window.supabase || null);

  function getLocal(){
    try { return JSON.parse(localStorage.getItem('doke_localizacao')||'null'); } catch { return null; }
  }
  function setGeo(coords){
    try { localStorage.setItem('doke_geo', JSON.stringify({
      lat: coords.latitude,
      lng: coords.longitude,
      acc: coords.accuracy,
      ts: Date.now()
    })); } catch(_){}
  }
  function getGeo(){
    try { return JSON.parse(localStorage.getItem('doke_geo')||'null'); } catch { return null; }
  }

  async function usarLocalizacaoAtual(btn){
    if (!('geolocation' in navigator)) {
      toast('Seu navegador não suporta geolocalização.');
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-loading');
    }
    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        setGeo(pos.coords);
        try{ window.atualizarTelaCep(''); }catch(_e){}
        toast('Localização atual salva (modo beta).');
        if(btn){ btn.disabled=false; btn.classList.remove('is-loading'); }
      },
      (err)=>{
        console.warn('geo error', err);
        toast('Não consegui acessar sua localização. Verifique as permissões do navegador.');
        if(btn){ btn.disabled=false; btn.classList.remove('is-loading'); }
      },
      { enableHighAccuracy:true, timeout: 10000, maximumAge: 30000 }
    );
  }

  function toast(msg){
    // usa o toast já existente no projeto, se tiver
    if (typeof window.mostrarToast === 'function') { window.mostrarToast(msg); return; }
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#0b7768;color:#fff;padding:10px 14px;border-radius:999px;z-index:9999;font-weight:700;box-shadow:0 14px 30px rgba(0,0,0,.22);';
    document.body.appendChild(el);
    setTimeout(()=>{ el.remove(); }, 2600);
  }

  function renderLocal(el){
    if (!el) return;
    const loc = getLocal();
    const geo = getGeo();
    const bairroCidade = (loc && (loc.bairro || loc.cidade))
      ? [loc.bairro, loc.cidade].filter(Boolean).join(', ')
      : 'Informe seu CEP';
    const mode = geo ? ' • local atual' : '';
    el.textContent = bairroCidade + mode;
  }

  function buildNegocioCard(n){
    const foto = n?.foto_capa || n?.logo_url || 'assets/Imagens/doke-logo.png';
    const nome = n?.nome || 'Negócio';
    const cat = n?.categoria || 'Estabelecimento';
    const bairro = n?.bairro || '';
    const cidade = n?.cidade || '';
    const loc = [bairro, cidade].filter(Boolean).join(', ');
    const id = n?.id;
    return `
      <article class="neg-card" data-id="${id||''}">
        <div class="neg-media"><img src="${foto}" alt="${escapeHtml(nome)}" loading="lazy"/></div>
        <div class="neg-body">
          <div class="neg-top">
            <div class="neg-name">${escapeHtml(nome)}</div>
            <div class="neg-cat">${escapeHtml(cat)}</div>
          </div>
          <div class="neg-loc">${escapeHtml(loc||'')}&nbsp;</div>
          <div class="neg-actions">
            <a class="btn btn-primary" href="negocio.html?id=${encodeURIComponent(id||'')}">Ver</a>
            <a class="btn btn-ghost" href="chat.html?negocio_id=${encodeURIComponent(id||'')}">Chat</a>
          </div>
        </div>
      </article>
    `;
  }

  async function fetchNegocios(params){
    const client = sb();
    if (!client) throw new Error('supabase não inicializado');

    // tenta localizar pelo CEP salvo (bairro/cidade). Se não existir, lista geral.
    const loc = getLocal();
    const q = (params?.q || '').trim();
    const cat = params?.cat || 'Tudo';

    let query = client.from('negocios').select('*').order('created_at', { ascending:false }).limit(60);
    if (loc?.cidade) query = query.ilike('cidade', `%${loc.cidade}%`);
    if (cat && cat !== 'Tudo') query = query.ilike('categoria', `%${cat}%`);
    if (q.length >= 2) query = query.or(`nome.ilike.%${q}%,descricao.ilike.%${q}%,categoria.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  function wireChips(root, onChange){
    const chips = Array.from(root.querySelectorAll('[data-chip]'));
    chips.forEach((c)=>{
      c.addEventListener('click', ()=>{
        chips.forEach(x=>x.classList.remove('is-active'));
        c.classList.add('is-active');
        onChange(c.dataset.chip);
      });
    });
    return () => (chips.find(x=>x.classList.contains('is-active'))?.dataset?.chip || 'Tudo');
  }

  async function initNegociosPage(){
    const root = document.querySelector('[data-negocios]');
    if (!root) return;

    const locText = document.querySelector('[data-neg-local]');
    renderLocal(locText);

    const geoBtn = document.querySelector('[data-geo]');
    if (geoBtn) geoBtn.addEventListener('click', ()=>usarLocalizacaoAtual(geoBtn));

    const listEl = document.querySelector('[data-neg-list]');
    const emptyEl = document.querySelector('[data-neg-empty]');
    const input = document.querySelector('[data-neg-q]');
    const limpar = document.querySelector('[data-neg-clear]');
    let activeCat = 'Tudo';

    wireChips(root, (cat)=>{ activeCat = cat; load(); });

    if (limpar) limpar.addEventListener('click', ()=>{
      if (input) input.value = '';
      activeCat = 'Tudo';
      root.querySelectorAll('[data-chip]').forEach((c,i)=>{
        c.classList.toggle('is-active', i===0);
      });
      load();
    });

    let t = null;
    if (input) input.addEventListener('input', ()=>{
      clearTimeout(t);
      t = setTimeout(load, 240);
    });

    async function load(){
      if (!listEl) return;
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'none';

      root.classList.add('is-loading');
      try{
        const data = await fetchNegocios({ q: input?.value || '', cat: activeCat });
        if (!data.length) {
          if (emptyEl) {
            emptyEl.style.display = 'block';
            emptyEl.querySelector('strong').textContent = 'Nenhum negócio encontrado.';
          }
        } else {
          listEl.innerHTML = data.map(buildNegocioCard).join('');
        }
      }catch(err){
        console.warn('negocios fetch error', err);
        if (emptyEl) {
          emptyEl.style.display = 'block';
          emptyEl.querySelector('strong').textContent = 'Ainda não conseguimos listar negócios.';
          const small = emptyEl.querySelector('small');
          if (small) small.textContent = 'Provável motivo: tabela negocios não existe ou RLS bloqueando.';
        }
      }finally{
        root.classList.remove('is-loading');
      }
    }

    load();
  }

  async function initPerfilEmpresaPage(){
    const root = document.querySelector('[data-perfil-empresa]');
    if (!root) return;
    const client = sb();
    if (!client) return;

    const list = root.querySelector('[data-minhas-lojas]');
    const empty = root.querySelector('[data-empty]');

    try{
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        window.location.href = 'login.html';
        return;
      }

      const { data, error } = await client
        .from('negocios')
        .select('*')
        .eq('owner_uid', user.id)
        .order('created_at', { ascending:false });

      if (error) throw error;
      const arr = data || [];
      if (!arr.length) {
        if (empty) empty.style.display='block';
        if (list) list.innerHTML='';
      } else {
        if (empty) empty.style.display='none';
        if (list) list.innerHTML = arr.map((n)=>{
          const cover = n.foto_capa || n.logo_url || 'assets/Imagens/doke-logo.png';
          const nome = escapeHtml(n.nome || 'Meu negócio');
          const cat = escapeHtml(n.categoria || '');
          const id = n.id;
          return `
            <div class="loja-row">
              <div class="loja-thumb"><img src="${cover}" alt="${nome}" loading="lazy"/></div>
              <div class="loja-main">
                <div class="loja-title">${nome}</div>
                <div class="loja-meta">${cat}</div>
              </div>
              <div class="loja-actions">
                <a class="btn btn-ghost" href="negocio.html?id=${encodeURIComponent(id)}">Ver</a>
                <a class="btn btn-primary" href="anunciar-negocio.html?edit=${encodeURIComponent(id)}">Editar</a>
              </div>
            </div>
          `;
        }).join('');
      }
    }catch(err){
      console.warn('perfil empresa error', err);
      if (empty) empty.style.display='block';
    }
  }

  async function initNegocioPage(){
    const root = document.querySelector('[data-negocio-page]');
    if (!root) return;
    const client = sb();
    if (!client) return;

    const id = new URLSearchParams(window.location.search).get('id');
    const title = root.querySelector('[data-title]');
    const cover = root.querySelector('[data-cover]');
    const desc = root.querySelector('[data-desc]');
    const meta = root.querySelector('[data-meta]');

    if (!id) {
      if (title) title.textContent = 'Negócio';
      return;
    }
    try{
      const { data, error } = await client.from('negocios').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('not found');
      if (title) title.textContent = data.nome || 'Negócio';
      if (cover) cover.src = data.foto_capa || data.logo_url || cover.src;
      if (desc) desc.textContent = data.descricao || 'Sem descrição.';
      if (meta) meta.textContent = [data.bairro, data.cidade, data.estado].filter(Boolean).join(', ');
      const chatBtn = root.querySelector('[data-chat]');
      if (chatBtn) chatBtn.href = `chat.html?negocio_id=${encodeURIComponent(id)}`;
    }catch(err){
      console.warn('negocio load error', err);
    }
  }

  // init por página
  document.addEventListener('DOMContentLoaded', ()=>{
    if (PAGE === 'negocios') initNegociosPage();
    if (PAGE === 'perfil-empresa') initPerfilEmpresaPage();
    if (PAGE === 'negocio') initNegocioPage();
  });

  // expõe
  try{ window.DokeNegocios = { usarLocalizacaoAtual }; }catch(_e){}
})();

// IG search no menu lateral (global)
document.addEventListener('DOMContentLoaded', function(){
  try{ initIgSidebarSearch(); }catch(e){}
});
