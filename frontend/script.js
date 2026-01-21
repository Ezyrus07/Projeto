// ============================================================
// 1. IMPORTAÇÕES E CONFIGURAÇÃO
// ============================================================
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

// Inicializa o Firebase (com fallback quando SDKs nÇœo estiverem disponÇðveis)
const app = initializeApp(firebaseConfig);
const analytics = (typeof getAnalytics === "function") ? getAnalytics(app) : null;
const db = getFirestore(app);
const auth = getAuth(app);
const storage = (typeof getStorage === "function") ? getStorage(app) : null;

// Garante acesso global das funções
window.db = db;
window.auth = auth;
window.storage = storage;
window.collection = collection;
window.query = query;
window.getDocs = getDocs;
window.orderBy = orderBy;
window.where = where;
window.limit = limit;
window.deleteDoc = deleteDoc;
window.updateDoc = updateDoc;
window.addDoc = addDoc;
window.setDoc = setDoc;
window.getDoc = getDoc;
window.doc = doc;

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
        '#modalStoryViewer',
        '#modalStoryViewerPerfil',
        '#modalOrcamento',
        '#modalDetalhesPedido',
        '#dokeModalOverlay',
        '#dokeGlobalModal',
        '.modal-overlay',
        '.doke-overlay',
        '.notif-settings-modal',
        '#dpModalOverlay'
    ];
    const aberto = selectors.some((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
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

        snapshot.forEach(doc => {
            const data = doc.data();
            const linkPerfil = `onclick="event.stopPropagation(); window.location.href='perfil-profissional.html?uid=${data.uid}'"`;
            
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
                <div class="badge-status">${data.categoria || "Portfólio"}</div>
                <input type="hidden" class="video-src-hidden" value="${data.videoUrl}">
                <img src="${data.capa}" class="video-bg">
                <div class="play-icon"><i class='bx bx-play'></i></div>
                <div class="video-ui-layer">
                    <div class="video-bottom-info">
                        <div class="provider-info">
                            <span class="provider-name" ${linkPerfil} style="cursor:pointer; text-decoration:underline;">${data.autorNome}</span>
                        </div>
                    </div>
                </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
    } catch (e) { console.error(e); }
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
    document.getElementById('reelAvatar').src = foto;
    document.getElementById('reelUsername').innerText = user;

    // Legenda (Topo do corpo)
    document.getElementById('reelAvatarCap').src = foto;
    document.getElementById('reelUsernameCap').innerText = user;
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
        
        await addDoc(collection(db, "pedidos"), {
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
            visualizado: false,
            
            // ADICIONE ESTES CAMPOS: Garante que nasce não lido
            notificacaoLidaProfissional: false, 
            notificacaoLidaCliente: true // Eu (cliente) já li o que acabei de enviar
        });

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
        link: buildSocialNotifLink(postTipo, postFonte, postId, comentarioId, acao)
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
    let contadorExtra = fotos.length - 3;

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
        let overlayHtml = (fotos.length > 3) ? `<div class="overlay-count">+${contadorExtra}</div>` : '';
        htmlFotos = `
        <div class="grid-fotos-doke">
            <div class="foto-main"><img src="${fotos[0]}" class="img-cover" loading="lazy" decoding="async" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 0)"></div>
            <div class="foto-sub"><img src="${fotos[1]}" class="img-cover" loading="lazy" decoding="async" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 1)"></div>
            <div class="foto-sub"><img src="${fotos[2]}" class="img-cover" loading="lazy" decoding="async" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 2)">${overlayHtml}</div>
        </div>`;
    }

    const linkPerfil = `onclick="event.stopPropagation(); window.irParaPerfilComContagem('${anuncio.uid}')"`;
    const estiloLink = `style="cursor: pointer;"`;

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
                <img src="${fotoAutor}" class="cp-avatar" loading="lazy" decoding="async" ${linkPerfil} ${estiloLink}> 
                <div class="cp-info-user">
                    <div class="cp-nome-row">
                        <h4 class="cp-nome-clean" ${linkPerfil} ${estiloLink}>${nomeParaExibir}</h4>
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
            <div style="margin-right:auto;">
                <small style="display:block; color:#999; font-size:0.7rem;">A partir de</small>
                <strong style="color:var(--cor0); font-size:1.1rem;">${preco}</strong>
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

window.carregarAnunciosDoFirebase = async function(termoBusca = "") {
    const feed = document.getElementById('feedAnuncios');
    const tituloSecao = document.getElementById('categorias-title'); 
    if (!feed) return; 

    window.dokeRenderAnunciosSkeleton(feed);

    try {
        const q = query(collection(window.db, "anuncios"));
        const querySnapshot = await getDocs(q);
        
        let listaAnuncios = [];
        querySnapshot.forEach((docSnap) => {
            let dados = docSnap.data();
            dados.id = docSnap.id; 
            listaAnuncios.push(dados);
        });

        // Não mostrar anúncios desativados no feed público
        // (anúncios antigos sem o campo 'ativo' continuam aparecendo)
        listaAnuncios = listaAnuncios.filter(a => a.ativo !== false);

        window.__dokeAnunciosCacheFull = listaAnuncios.slice();

        if (termoBusca && termoBusca.trim() !== "") {
            const termo = termoBusca.toLowerCase().trim();
            if(tituloSecao) tituloSecao.innerHTML = `Resultados para: <span style="color:var(--cor2)">"${termoBusca}"</span>`;
            listaAnuncios = listaAnuncios.filter(anuncio => {
                const titulo = (anuncio.titulo || "").toLowerCase();
                const desc = (anuncio.descricao || "").toLowerCase();
                return titulo.includes(termo) || desc.includes(termo);
            });
        } else {
            if(tituloSecao) tituloSecao.innerText = "Categorias em alta:";
        }

        feed.innerHTML = ""; 

        if (listaAnuncios.length === 0) {
            feed.innerHTML = `<p style="text-align:center; padding:20px; color:#666;">Nenhum anúncio encontrado.</p>`;
            return;
        }

        listaAnuncios.forEach((anuncio) => {
            const card = window.dokeBuildCardPremium(anuncio);
            feed.appendChild(card);
        });
    } catch (erro) {
        console.error("Erro no carregamento:", erro);
        feed.innerHTML = `<p style="text-align:center; padding:20px;">Erro ao carregar anúncios.</p>`;
    }
}

// ============================================================
// 8. FUNÇÕES GERAIS (CARREGAMENTO, AUTH, ETC) - MANTIDAS
// ============================================================
// ============================================================
// CATEGORIAS (carrossel em círculo, ícone + nome, hover glow)
// ============================================================
function __dokeIconForCategory(nome){
    const n = String(nome || '').toLowerCase();
    if (n.includes('reforma') || n.includes('constru')) return 'bx-home';
    if (n.includes('pint')) return 'bx-paint';
    if (n.includes('eletric')) return 'bx-bulb';
    if (n.includes('encan') || n.includes('hidra')) return 'bx-water';
    if (n.includes('assist') || n.includes('técn') || n.includes('tecnic')) return 'bx-wrench';
    if (n.includes('aula') || n.includes('curso') || n.includes('particular')) return 'bx-book';
    if (n.includes('beleza') || n.includes('estetic') || n.includes('cabelo')) return 'bx-cut';
    if (n.includes('limpeza')) return 'bx-broom';
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

    container.innerHTML = `
        <div style="padding: 18px; color:#777; display:flex; align-items:center; gap:10px;">
            <i class='bx bx-loader-alt bx-spin' style="font-size:1.1rem; color:var(--cor0,#0b7768);"></i>
            <span>Carregando categorias...</span>
        </div>
    `;

    try {
        // IMPORTANTE: não depende da tabela "categorias".
        // Gera as categorias com base nos anúncios existentes.
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

        if (freq.size === 0) {
            container.innerHTML = `<div style="padding:0 20px; color:#999;">Categorias indisponíveis</div>`;
            return;
        }

        const lista = [...freq.entries()]
            .sort((a,b) => b[1] - a[1])
            .slice(0, 20)
            .map(([nome, count]) => ({ nome, count, icon: __dokeIconForCategory(nome) }));

        container.innerHTML = '';
        lista.forEach((cat) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cat-card';
            btn.setAttribute('data-cat', cat.nome);
            btn.innerHTML = `
                <span class="cat-ico"><i class='bx ${cat.icon}'></i></span>
                <span class="cat-label">${cat.nome}</span>
                <span class="cat-count">${cat.count}</span>
            `;
            btn.addEventListener('click', () => {
                try { window.filtrarPorCategoria(cat.nome); } catch { /* noop */ }
            });
            container.appendChild(btn);
        });

        __dokeSetupCatCarousel();
    } catch (e) {
        console.error('Erro categorias:', e);
        container.innerHTML = `<div style="padding:0 20px; color:#999;">Categorias indisponíveis</div>`;
    }
};

window.sincronizarSessaoSupabase = async function() {
    if (!window.sb?.auth?.getSession) return null;
    try {
        const { data, error } = await window.sb.auth.getSession();
        if (error) return null;
        const user = data?.session?.user || null;
        if (!user) return null;
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
                <span class="pro-name" style="color:var(--cor2);">${userHandle}</span>
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
                            ${perfil.user || 'Usuário'}
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


window.alternarConta = function() {
    window.auth.signOut().then(() => {
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'login.html'; 
    }).catch((error) => {
        console.error("Erro ao alternar conta:", error);
    });
}

window.toggleDropdown = function(event) {
    if(event) event.stopPropagation();
    const drop = document.getElementById('dropdownPerfil');
    if(drop) drop.classList.toggle('show');
}

window.irParaMeuPerfil = function(event) {
    if(event) event.preventDefault();
    const perfilLocal = JSON.parse(localStorage.getItem('doke_usuario_perfil'));
    if (!perfilLocal) { window.location.href = "login.html"; return; }
    if (perfilLocal.isProfissional === true) window.location.href = "meuperfil.html"; 
    else window.location.href = "perfil-usuario.html";
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
window.salvarCep = function() {
    const i = document.getElementById('inputCep');
    if(!i) return;
    const cepLimpo = i.value.replace(/\D/g, ''); 
    if(cepLimpo.length === 8) {
        const cepFormatado = cepLimpo.substring(0, 5) + "-" + cepLimpo.substring(5, 8);
        localStorage.setItem('meu_cep_doke', cepFormatado); 
        window.atualizarTelaCep(cepFormatado);
        document.getElementById('boxCep').style.display = 'none';
    } else { alert("CEP inválido! Digite 8 números."); i.focus(); }
}
window.atualizarTelaCep = function(cep) {
    const s = document.getElementById('textoCepSpan');
    const i = document.getElementById('inputCep');
    if (s) { s.innerText = "Alterar CEP"; s.style.fontWeight = "600"; s.style.color = "var(--cor0)"; }
    if (i) i.value = cep;
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
    if (area.classList.contains("aberto")) {
        area.classList.remove("aberto");
        btn.style.background = "transparent"; btn.style.color = "var(--cor0)";
    } else {
        area.classList.add("aberto");
        btn.style.background = "var(--cor0)"; btn.style.color = "white";
    }
}
window.ativarChip = function(el) {
    el.parentElement.querySelectorAll('.chip-tag').forEach(c => c.classList.remove('ativo'));
    el.classList.add('ativo');
}

function salvarBusca(termo) {
    let h = JSON.parse(localStorage.getItem('doke_historico_busca') || '[]');
    h = h.filter(i => i.toLowerCase() !== termo.toLowerCase());
    h.unshift(termo); if (h.length > 5) h.pop();
    localStorage.setItem('doke_historico_busca', JSON.stringify(h));
    atualizarListaHistorico();
}
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

    const scrollers = [
        document.getElementById('listaCategorias'),
        document.getElementById('galeria-dinamica'),
        document.querySelector('.stories-scroll'),
        document.querySelector('.filtros-chips-scroll')
    ].filter(Boolean);

    scrollers.forEach(enableDragScroll);

    scrollers.forEach(el => {
        el.addEventListener('wheel', (ev) => {
            if (el.id === 'galeria-dinamica') return;
            if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) {
                el.scrollLeft += ev.deltaY;
                ev.preventDefault();
            }
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
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        container.style.cursor = 'grab';

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
    }
}

window.onclick = function(e) {
    if (!e.target.matches('.profile-img-btn') && !e.target.matches('img')) {
        const ds = document.getElementsByClassName("dropdown-profile");
        for (let i = 0; i < ds.length; i++) { if (ds[i].classList.contains('show')) ds[i].classList.remove('show'); }
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

            if (locaisMap[ufSel]) {
                Object.keys(locaisMap[ufSel]).sort().forEach(cidade => {
                    selCidade.innerHTML += `<option value="${cidade}">${cidade}</option>`;
                });
            }
        };

        selCidade.onchange = function() {
            const ufSel = selEstado.value;
            const cidSel = this.value;
            selBairro.innerHTML = '<option value="" disabled selected>Bairro</option>';
            selBairro.disabled = false;

            if (locaisMap[ufSel] && locaisMap[ufSel][cidSel]) {
                const bairros = Array.from(locaisMap[ufSel][cidSel]).sort();
                bairros.forEach(bairro => {
                    selBairro.innerHTML += `<option value="${bairro}">${bairro}</option>`;
                });
            }
            filtrarAnunciosPorLocal(ufSel, cidSel, null);
        };

        selBairro.onchange = function() {
            filtrarAnunciosPorLocal(selEstado.value, selCidade.value, this.value);
        };

    } catch (e) { console.error("Erro ao carregar filtros de local:", e); }
}

window.filtrarAnunciosPorLocal = function(uf, cidade, bairro) {
    console.log("Filtrando por:", uf, cidade, bairro);
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

    container.innerHTML = `<div style="text-align:center; padding:40px; color:#777;"><i class='bx bx-loader-alt bx-spin' style="font-size:2rem;"></i></div>`;

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
        return;
    }

    feedItems.forEach((entry) => {
        if (entry.source === "firebase") {
            const post = entry.data;
            const idPost = entry.id;
            const dataPost = formatFeedDate(post.data);
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
                        <img src="${post.autorFoto || 'https://placehold.co/50'}" alt="User" ${linkPerfil} ${cursorStyle}>
                        <div class="feed-user-info">
                            <h4 ${linkPerfil} ${cursorStyle}>${post.autorUser || post.autorNome}</h4>
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
        const dataPost = formatFeedDate(item.created_at);
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
                    <img src="${autor.foto || 'https://placehold.co/50'}" alt="User">
                    <div class="feed-user-info">
                        <h4>${escapeHtml(autorNome)}</h4>
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
}

// Funções extras para perfil
window.carregarFeedGlobal = async function() {
    const container = document.getElementById('feed-global-container');
    if (!container) return;

    container.classList.add("feed-publicacoes-grid");
    container.innerHTML = `<div style="text-align:center; padding:40px; color:#777;"><i class='bx bx-loader-alt bx-spin' style="font-size:2rem;"></i></div>`;

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

            const titulo = normalizeHandle(post.autorUser || post.autorNome || "usuario");
            const descricao = post.texto || "";

            const html = `
                <div class="feed-publicacao-card dp-item dp-item--clickable" role="button" tabindex="0" onclick="abrirModalPost('${idPost}', 'posts')" onkeydown="if(event.key==='Enter'||event.key===' ') this.click()">
                    <div class="dp-itemMedia">${mediaHtml}</div>
                    <div class="dp-itemBody">
                        <b>${escapeHtml(titulo)}</b>
                        <p>${escapeHtml(descricao)}</p>
                    </div>
                </div>`;
            container.insertAdjacentHTML('beforeend', html);
            return;
        }

        const item = entry.data || {};
        if (!item.media_url) return;
        const autor = item.usuarios || (supaUserRow && item.user_id === supaUserRow.id ? supaUserRow : {});
        const autorNome = normalizeHandle(autor.user || autor.nome || "usuario");
        const titulo = item.titulo || autorNome;
        const descricao = item.descricao || item.legenda || "";
        const mediaHtml = item.tipo === "video"
            ? `<video src="${item.media_url}"${item.thumb_url ? ` poster="${item.thumb_url}"` : ""} preload="metadata" muted playsinline></video>`
            : `<img src="${item.media_url}" loading="lazy" alt="">`;

        const html = `
            <div class="feed-publicacao-card dp-item dp-item--clickable" role="button" tabindex="0" onclick="abrirModalPublicacao('${entry.id}')" onkeydown="if(event.key==='Enter'||event.key===' ') this.click()">
                <div class="dp-itemMedia">${mediaHtml}</div>
                <div class="dp-itemBody">
                    <b>${escapeHtml(titulo)}</b>
                    <p>${escapeHtml(descricao)}</p>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });

    setupFeedVideoPreview(container);
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
            const imgHtml = post.imagem ? `<div class="midia-post"><img src="${post.imagem}"></div>` : '';
            const html = `<div class="post-feed-card"><div class="header-post"><div class="user-post"><img src="${post.autorFoto}"><div><h4>${post.autorUser}</h4></div></div></div><p class="legenda-post">${post.texto}</p>${imgHtml}</div>`;
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
        inputCep.addEventListener('input', formatarCepInput);
        inputCep.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') window.salvarCep();
        });
    }
    
    if(document.getElementById('galeria-dinamica')) {
        carregarReelsHome();
        enableVideosCurtosPageScroll();
    }

    const cepSalvo = localStorage.getItem('meu_cep_doke');
    if (cepSalvo) window.atualizarTelaCep(cepSalvo);

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
        const frases = ["Chefes de cozinha próximos", "Eletricistas na pituba", "Aulas de Inglês Online", "Manutenção de Ar condicionado"];
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
        await addDoc(collection(db, "pedidos"), {
            deUid: user.uid,
            paraUid: idPrestador,
            paraNome: nomePrestador,
            clienteNome: perfil.nome || "Cliente",
            clienteFoto: perfil.foto || "",
            servicoReferencia: servico,
            formularioRespostas: formularioRespondido, // ARRAY DE OBJETOS [{pergunta, resposta}]
            status: "pendente",
            dataPedido: new Date().toISOString()
        });
        alert("✅ Solicitação enviada com sucesso!");
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar no Firestore.");
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
                <img src="${foto}" class="pro-avatar-lg">
                <span class="pro-name">${nomeExibicao}</span>
                <span class="pro-job">${profissao}</span>
                ${htmlAvaliacao}
                <button class="btn-pro-action" onclick="alert('Perfil de ${nomeExibicao}')">Ver Perfil</button>
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
        let capaUrl = "https://placehold.co/600x200?text=Comunidade"; // Imagem padrão

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

// 2. LISTAR TODAS AS COMUNIDADES (GERAL)
async function carregarComunidadesGerais() {
    const container = document.getElementById('listaComunidadesGeral');
    if(!container) return;

    try {
        // ATENÇÃO: Removi o orderBy("dataCriacao") para evitar travamento se não houver índice
        const q = query(collection(db, "comunidades"), limit(20));
        const snapshot = await getDocs(q);

        container.innerHTML = "";

        if (snapshot.empty) {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:40px; background:white; border-radius:16px; border:1px dashed #ddd;">
                    <i class='bx bx-group' style="font-size:3rem; color:#ddd; margin-bottom:10px;"></i>
                    <h4 style="color:#555;">Nenhum grupo encontrado</h4>
                    <p style="color:#888; font-size:0.9rem;">Seja o primeiro a criar uma comunidade!</p>
                </div>`;
            return;
        }

        snapshot.forEach(doc => {
            const comm = doc.data();
            
            // Define a cor da tag baseado no tipo
            let tagClass = "tag-pro"; 
            if(comm.tipo === "Condomínio") tagClass = "tag-condo";
            if(comm.tipo === "Hobby") tagClass = "tag-hobby";

            const html = `
            <div class="card-comm" data-tipo="${comm.tipo}" onclick="alert('Você clicou no grupo: ${comm.nome}')">
                <div class="card-cover" style="background-image: url('${comm.capa}');">
                    <span class="card-tag ${tagClass}">${comm.tipo}</span>
                </div>
                <div class="card-body">
                    <div class="card-icon">
                        <img src="${comm.capa}" style="object-fit:cover;">
                    </div>
                    <h3 class="card-title">${comm.nome}</h3>
                    <p class="card-desc">${comm.descricao}</p>
                    
                    <div class="members-preview">
                        <div class="mem-avatar" style="background:#eee;"></div>
                        <div class="mem-avatar" style="background:#ddd;"></div>
                        <span class="mem-count">+${comm.membrosCount} membros</span>
                    </div>

                    <div class="card-footer">
                        <button class="btn-entrar">Ver Grupo</button>
                    </div>
                </div>
            </div>`;
            
            container.insertAdjacentHTML('beforeend', html);
        });

    } catch (e) {
        console.error("Erro ao listar geral:", e);
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#999;">Erro ao carregar lista.</div>`;
    }
}

// 3. LISTAR MEUS GRUPOS (Onde sou membro)
async function carregarMeusGrupos() {
    const container = document.getElementById('listaMeusGrupos');
    if(!container) return;

    const user = auth.currentUser;
    if(!user) {
        container.innerHTML = `<div style="color:rgba(255,255,255,0.7); padding:10px; font-size:0.9rem;">Faça login para ver.</div>`;
        return;
    }

    try {
        const q = query(collection(db, "comunidades"), where("membros", "array-contains", user.uid));
        const snapshot = await getDocs(q);

        container.innerHTML = "";

        if (snapshot.empty) {
            container.innerHTML = `<div style="color:rgba(255,255,255,0.6); padding:15px; font-size:0.9rem;">Você não participa de nenhum grupo.</div>`;
            return;
        }

        snapshot.forEach(doc => {
            const comm = doc.data();
            const html = `
            <div class="my-group-item" onclick="alert('Abrir chat: ${comm.nome}')">
                <div class="group-img-ring">
                    <img src="${comm.capa}">
                </div>
                <span>${comm.nome}</span>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });

    } catch (e) {
        console.error("Erro meus grupos:", e);
        // Fallback visual silencioso
        container.innerHTML = `<div style="color:rgba(255,255,255,0.6); padding:10px;">Sem grupos.</div>`;
    }
}

// ============================================================
// LÓGICA DE ESTATÍSTICAS DO PERFIL
// ============================================================

window.carregarEstatisticasReais = async function() {
    // Só roda se estiver na página de perfil
    const elPedidos = document.getElementById('stat-pedidos');
    const elNota = document.getElementById('stat-nota');
    const elServicos = document.getElementById('stat-servicos');

    if (!elPedidos || !elNota || !elServicos) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
        // 1. CONTA MEUS ANÚNCIOS ATIVOS
        // Busca todos os anúncios onde donoUid sou eu
        const qAnuncios = query(collection(db, "anuncios"), where("donoUid", "==", user.uid));
        const snapAnuncios = await getDocs(qAnuncios);
        elServicos.innerText = snapAnuncios.size; // .size dá a quantidade exata

        // 2. CONTA PEDIDOS RECEBIDOS
        // Busca todos os pedidos enviados para mim (paraUid == eu)
        const qPedidos = query(collection(db, "pedidos"), where("paraUid", "==", user.uid));
        const snapPedidos = await getDocs(qPedidos);
        elPedidos.innerText = snapPedidos.size;

        // 3. PEGA A NOTA MÉDIA (Do perfil do usuário)
        const perfilLocal = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
        
        // Se já tiver a nota salva no perfil local, usa ela
        if (perfilLocal.stats && perfilLocal.stats.media) {
            elNota.innerText = perfilLocal.stats.media;
        } else {
            // Se não, busca do banco para garantir
            const docUser = await getDoc(doc(db, "usuarios", user.uid));
            if(docUser.exists()) {
                const dados = docUser.data();
                const media = (dados.stats && dados.stats.media) ? dados.stats.media : "5.0"; // Padrão 5.0 se for novo
                elNota.innerText = media;
            } else {
                elNota.innerText = "Novo";
            }
        }

    } catch (e) {
        console.error("Erro ao carregar estatísticas:", e);
    }
}

// ============================================================
// NOVO: SISTEMA DE CHAT DIRETO E ÁUDIO
// ============================================================

// Variáveis de Controle
window.chatIdAtual = null;
window.chatUnsubscribe = null;
window.mediaRecorder = null;
window.audioChunks = [];
window.timerInterval = null;
window.targetUserUid = null; // Armazena com quem estamos falando

// 1. Função para abrir chat direto (sem pedido atrelado)
// Exemplo de uso no HTML: onclick="iniciarChatDireto('uid123', 'Maria', 'foto.jpg')"
window.iniciarChatDireto = async function(targetUid, targetName, targetPhoto) {
    const user = auth.currentUser;
    if (!user) {
        alert("Faça login para enviar mensagens.");
        window.location.href = "login.html";
        return;
    }

    if (user.uid === targetUid) {
        alert("Você não pode enviar mensagem para si mesmo.");
        return;
    }

    // Cria um ID único para a conversa entre esses dois usuários
    // Ordena os UIDs para garantir que userA+userB seja igual a userB+userA
    const ids = [user.uid, targetUid].sort();
    const chatId = `${ids[0]}_${ids[1]}`;

    // Verifica se a conversa já existe, se não, cria
    try {
        const chatRef = doc(db, "conversas", chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
            // Cria a estrutura básica da conversa
            await setDoc(chatRef, {
                participantes: [user.uid, targetUid],
                dadosUsuarios: {
                    [user.uid]: { nome: user.displayName || "Eu", foto: user.photoURL || "" },
                    [targetUid]: { nome: targetName, foto: targetPhoto }
                },
                ultimaMensagem: "",
                tipoUltimaMsg: "texto",
                dataAtualizacao: new Date().toISOString(),
                tipo: "direta" // Diferencia de "pedido"
            });
        }
        
        // Redireciona para o chat.html carregando esse chat
        // Se já estivermos no chat.html, apenas abre
        if (window.location.pathname.includes("chat.html")) {
            abrirTelaChat(chatId, targetName, targetPhoto, targetUid);
        } else {
            // Salva dados temporários para abrir ao carregar a página
            localStorage.setItem('doke_abrir_chat_id', chatId);
            localStorage.setItem('doke_abrir_chat_nome', targetName);
            localStorage.setItem('doke_abrir_chat_foto', targetPhoto);
            localStorage.setItem('doke_abrir_chat_uid', targetUid);
            window.location.href = "chat.html";
        }

    } catch (e) {
        console.error("Erro ao iniciar chat:", e);
        alert("Erro ao iniciar conversa.");
    }
}

// ATUALIZAÇÃO PARA script.js

window.abrirTelaChat = function(chatId, nome, foto, targetUid) {
    window.chatIdAtual = chatId;
    window.targetUserUid = targetUid;

    document.getElementById('view-lista').style.display = 'none';
    document.getElementById('view-chat').style.display = 'flex';
    document.getElementById('chatNome').innerText = nome;
    document.getElementById('chatAvatar').src = foto || "https://i.pravatar.cc/150";

    // --- CORREÇÃO: MENSAGEM DE AGUARDE ---
    
    // 1. Remove banner antigo se existir (para não duplicar)
    const bannerAntigo = document.querySelector('.chat-info-banner');
    if(bannerAntigo) bannerAntigo.remove();

    // 2. Verifica se acabou de ser enviado (Lê o sinal do orcamento.html)
    if (localStorage.getItem('doke_pedido_enviado') === 'true') {
        
        localStorage.removeItem('doke_pedido_enviado'); // Limpa para não aparecer de novo ao recarregar
        
        const viewChat = document.getElementById('view-chat');
        const toolbar = viewChat.querySelector('.chat-toolbar'); // Pega o cabeçalho do chat
        
        // Cria o aviso
        const banner = document.createElement('div');
        banner.className = 'chat-info-banner';
        banner.innerHTML = `
            <i class='bx bx-time-five'></i>
            <div>
                <strong>Solicitação Enviada com Sucesso!</strong>
                <p>O profissional já foi notificado. Por favor, aguarde ele aceitar o pedido para iniciar a conversa.</p>
            </div>
        `;
        
        // Insere o banner LOGO ABAIXO do cabeçalho
        if(toolbar) {
            toolbar.insertAdjacentElement('afterend', banner);
        }
    }
    // -----------------------------------------

    const containerMsgs = document.getElementById('areaMensagens');
    containerMsgs.innerHTML = '<div style="padding:20px; text-align:center;">Carregando...</div>';

    // Determina qual coleção usar (se é um ID antigo de pedido ou novo de conversa)
    carregarMensagensFirestore("conversas", chatId, containerMsgs);
    
    // Ajuste mobile
    if(window.innerWidth <= 768) {
        const bottomNav = document.querySelector('.bottom-nav');
        const navbarMobile = document.querySelector('.navbar-mobile');
        if(bottomNav) bottomNav.style.display = 'none';
        if(navbarMobile) navbarMobile.style.display = 'none';
    }
}

function carregarMensagensFirestore(collectionName, docId, container) {
    if (window.chatUnsubscribe) window.chatUnsubscribe();

    const q = query(collection(db, collectionName, docId, "mensagens"), orderBy("timestamp", "asc"));
    
    window.chatUnsubscribe = onSnapshot(q, (snapshot) => {
        container.innerHTML = "";
        
        if(snapshot.empty) {
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#ccc;">Comece a conversa!</div>';
        }

        snapshot.forEach(doc => {
            renderizarMensagemNaTela(doc.data(), container);
        });
        
        container.scrollTop = container.scrollHeight;
    }, (error) => {
        // Se der erro, pode ser que seja a coleção antiga "pedidos"
        if(collectionName === "conversas") {
            carregarMensagensFirestore("pedidos", docId, container);
        }
    });
}

function renderizarMensagemNaTela(msg, container) {
    const user = auth.currentUser;
    const ehMinha = msg.senderUid === user.uid;
    const classe = ehMinha ? 'msg-enviada' : 'msg-recebida';
    
    let conteudoHtml = "";

    if (msg.tipo === 'audio') {
        conteudoHtml = `
            <div class="audio-bubble">
                <button class="btn-play-audio" onclick="tocarAudio(this, '${msg.url}')">
                    <i class='bx bx-play'></i>
                </button>
                <div class="audio-wave"></div>
                <span style="font-size:0.7rem;">Áudio</span>
            </div>
        `;
    } else {
        conteudoHtml = msg.texto;
    }

    const html = `
        <div class="msg-bubble ${classe}">
            ${conteudoHtml}
            <span class="msg-time">${msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '...'}</span>
        </div>`;
    
    container.insertAdjacentHTML('beforeend', html);
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

window.iniciarPreview = function(card) {
    const videoSrc = card.querySelector('.video-src-hidden').value;
    
    // Se não tiver link de vídeo, não faz nada
    if (!videoSrc || videoSrc === "undefined") return;

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
        card.insertBefore(video, playIcon);
    }

    // Tenta reproduzir
    const playPromise = video.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log('Autoplay prevenido pelo navegador (interaja com a página primeiro)');
        });
    }
}

window.pararPreview = function(card) {
    const video = card.querySelector('.video-preview-hover');
    if (video) {
        video.pause();
        video.currentTime = 0; // Volta para o início
        video.remove(); // Remove o elemento para economizar memória do navegador
    }
}

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
        window.clearTimeout(timer);
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
        await updateDoc(doc(db, "pedidos", idPedido), { status: "aceito", dataAtualizacao: new Date().toISOString() });
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
    if (document.getElementById('modalPostDetalhe')) return;
    const modalHtml = `
    <div id="modalPostDetalhe" class="modal-overlay" onclick="fecharModalPost(event)">
        <div class="modal-content" onclick="event.stopPropagation()">
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
        document.getElementById('modalAvatar').src = data.autorFoto || "https://placehold.co/50";
        document.getElementById('modalUsername').innerText = data.autorUser || data.autorNome;
        document.getElementById('modalDate').innerText = data.data ? new Date(data.data).toLocaleDateString() : 'Data';
        labelLike.innerText = `${data.likes || 0} curtidas`;

        // Legenda
        const captionDiv = document.getElementById('modalCaption');
        if(data.texto || data.descricao) {
            captionDiv.innerHTML = `<strong>${data.autorUser}</strong> ${data.texto || data.descricao}`;
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
                    <img src="${c.foto}" class="comment-avatar" alt="">
                    <div style="flex:1;">
                        <div class="comment-header-row">
                            <div class="comment-header-left">
                                <span class="comment-user-name">${c.user}</span> ${badgeCriador} ${badgeFixado}
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
        const dataLabel = c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : "";
        const isCreator = window.currentSupaPublicacaoAuthorId && c.user_id === window.currentSupaPublicacaoAuthorId;
        const creatorBadge = isCreator ? `<span class="badge-criador">Criador</span>` : "";

        const html = `
        <div class="comment-block" style="margin-top:15px;">
            <div style="display:flex; gap:10px; font-size:0.9rem; align-items:flex-start;">
                <img src="${foto}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between;">
                        <div><span style="font-weight:700;">${escapeHtml(nome)}</span> ${creatorBadge}</div>
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

    document.getElementById('modalAvatar').src = autorFoto;
    document.getElementById('modalUsername').innerText = autorNome;

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
            captionDiv.innerHTML = `<strong>${escapeHtml(autorNome)}</strong> ${escapeHtml(captionText)}`;
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
                    <img src="${data.autorFoto || 'https://placehold.co/30'}" class="profile-img">
                    <span class="username">${data.autorUser || 'Usuario'}</span>
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
                    <img src="${data.autorFoto || 'https://placehold.co/50'}" class="profile-img">
                    <span class="username">${data.autorUser || 'Profissional'}</span>
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
    document.getElementById('reelUsername').innerText = user;
    document.getElementById('reelAvatar').src = avatar;
    document.getElementById('reelUsernameCap').innerText = user;
    document.getElementById('reelAvatarCap').src = avatar;
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

window.fecharModalVideoForce = function() {
    const v = document.getElementById('playerPrincipal');
    if(v) { v.pause(); v.src = ""; }
    document.getElementById('modalPlayerVideo').style.display = 'none';
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
                <img src="${c.foto}" style="width:32px; height:32px; border-radius:50%;">
                <div style="font-size:0.9rem;">
                    <strong>${c.user}</strong> ${c.texto}
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
    mediaArea.innerHTML = `<video src="${dados.videoUrl || dados.video}" controls autoplay style="width:100%;height:100%;object-fit:cover;"></video>`;
  } else if (dados.imagem) {
    mediaArea.innerHTML = `<img src="${dados.imagem}" style="width:100%;height:100%;object-fit:cover;">`;
  }

  if (document.getElementById('modalUsername')) document.getElementById('modalUsername').innerText = dados.autorUser || '@usuario';
  if (document.getElementById('modalCaption')) document.getElementById('modalCaption').innerText = dados.descricao || '';

  const btnOrcar = document.getElementById('btnSolicitarOrcamento');
  if (btnOrcar) {
    btnOrcar.onclick = () => {
      window.location.href = `orcamento.html?uid=${window.currentReelUid || ''}&aid=${window.currentPostId || ''}`;
    };
  }

  modal.style.display = 'flex';
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

    if (document.getElementById('reelUsername')) document.getElementById('reelUsername').innerText = userName;
    if (document.getElementById('reelAvatar')) document.getElementById('reelAvatar').src = avatar;
    if (document.getElementById('reelUsernameCap')) document.getElementById('reelUsernameCap').innerText = userName;
    if (document.getElementById('reelAvatarCap')) document.getElementById('reelAvatarCap').src = avatar;
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
                <img src="${foto}" class="comment-avatar" alt="">
                <div style="flex:1;">
                    <div class="comment-header-row">
                        <div class="comment-header-left">
                            <span class="comment-user-name">${escapeHtml(nome)}</span> ${badgeCriador} ${badgeFixado}
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
                    <img src="${c.foto || "https://placehold.co/50"}" class="comment-avatar" alt="">
                    <div style="flex:1;">
                        <div class="comment-header-row">
                            <div class="comment-header-left">
                                <span class="comment-user-name">${escapeHtml(c.user || "Usuario")}</span> ${badgeCriador} ${badgeFixado}
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
                <img src="${foto}" class="comment-avatar" alt="">
                <div style="flex:1;">
                    <div class="comment-header-row">
                            <div class="comment-header-left">
                                <span class="comment-user-name">${escapeHtml(nome)}</span> ${badgeCriador} ${badgeFixado}
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

  // Filtros da home (max preco + ordenacao) - sem mexer no UX do card
  function parsePreco(value){
    if(value === null || value === undefined) return null;
    const s = String(value).toLowerCase();
    if(s.includes('orc') || s.includes('combinar')) return null;
    const cleaned = s.replace(/[^0-9,\.]/g, '');
    // formato BR: 1.234,56
    const normalized = cleaned.replace(/\.(?=.*\.)/g, '').replace(',', '.');
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : null;
  }

  window.dokeApplyHomeFilters = function(){
    const full = Array.isArray(window.__dokeAnunciosCacheFull) ? window.__dokeAnunciosCacheFull.slice() : [];
    const termo = (byId('inputBusca')?.value || '').trim().toLowerCase();

    let lista = full;
    if(termo){
      lista = lista.filter(a => {
        const hay = ((a.titulo||'') + ' ' + (a.descricao||'') + ' ' + (a.categorias||'')).toLowerCase();
        return hay.includes(termo);
      });
    }

    const maxStr = (byId('maxPreco')?.value || '').trim();
    const max = parseFloat(maxStr.replace(',', '.'));
    if(Number.isFinite(max)){
      lista = lista.filter(a => {
        const p = parsePreco(a.preco);
        return p === null ? true : p <= max;
      });
    }

    const ord = byId('ordenacao')?.value || 'relevancia';
    if(ord === 'preco_menor'){
      lista.sort((a,b) => (parsePreco(a.preco) ?? 1e12) - (parsePreco(b.preco) ?? 1e12));
    } else if(ord === 'preco_maior'){
      lista.sort((a,b) => (parsePreco(b.preco) ?? -1) - (parsePreco(a.preco) ?? -1));
    } else if(ord === 'mais_recente'){
      lista.sort((a,b) => {
        const da = new Date(a.dataCriacao || a.dataAtualizacao || 0).getTime();
        const db = new Date(b.dataCriacao || b.dataAtualizacao || 0).getTime();
        return db - da;
      });
    }

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
        feed.innerHTML = '<div class="empty-state"><i class="bx bx-search-alt"></i><p>Nenhum anuncio encontrado com esses filtros.</p></div>';
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
    const count = window.innerWidth < 600 ? 2 : 4;
    const cards = Array.from({length: count}).map(()=>
      '<div class="cp-card cp-card-v2" style="position:relative;">'
      + '<div class="cp-header-clean">'
      + '  <div class="cp-avatar skeleton" style="width:46px;height:46px;border-radius:14px;"></div>'
      + '  <div style="flex:1">'
      + '    <div class="skeleton" style="height:14px;width:48%;margin-bottom:10px;"></div>'
      + '    <div class="skeleton" style="height:12px;width:32%;"></div>'
      + '  </div>'
      + '</div>'
      + '<div class="cp-body">'
      + '  <div class="skeleton" style="height:14px;width:70%;margin-bottom:10px;"></div>'
      + '  <div class="skeleton" style="height:12px;width:90%;margin-bottom:8px;"></div>'
      + '  <div class="skeleton" style="height:12px;width:80%;"></div>'
      + '</div>'
      + '<div class="cp-actions">'
      + '  <div class="skeleton" style="height:44px;width:100%;border-radius:14px;"></div>'
      + '</div>'
      + '</div>'
    ).join('');
    feed.innerHTML = '<div class="skeleton-grid">' + cards + '</div>';
  };

  window.dokeRenderTrabalhosSkeleton = function(container){
    if (!container) return;
    const count = window.innerWidth < 600 ? 4 : 7;
    const items = Array.from({length: count}).map(()=>
      '<div class="video-card" style="width:160px;">'
      + '<div class="video-thumb skeleton" style="width:160px;height:90px;border-radius:14px;"></div>'
      + '<div class="skeleton" style="height:12px;width:90%;margin-top:10px;"></div>'
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

  function renderCategorySkeleton(carousel, count = 6) {
    if (!carousel) return;
    carousel.innerHTML = '';
    carousel.classList.add('is-loading');
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = 'cat-item';
      item.innerHTML = `
        <div class="cat-card cat-skel" aria-hidden="true">
          <div class="cat-icon-wrap cat-skel-circle"></div>
          <div class="cat-name cat-skel-line"></div>
        </div>
      `;
      carousel.appendChild(item);
    }
  }

  function renderCategories(carousel, lista) {
    carousel.classList.remove('is-loading');
    carousel.innerHTML = '';

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
    renderCategorySkeleton(carousel, 6);
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
    el.__dragReady = true;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

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

  // ----------------------------
  // PARA VOCE + CTA CONTEXTUAL
  // ----------------------------
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

    const sugeridos = [...new Set([
      ...clicks.slice(0, 6),
      ...historico.slice(0, 6),
      ...(window.__dokeTopCats || []).slice(0, 6),
    ].filter(Boolean))].slice(0, 10);

    const logado = getLogado();
    const perfil = getPerfilLocal();
    const eProf = perfil?.isProfissional === true;

    let ctaTitle = 'Encontre o serviço ideal';
    let ctaSub = 'Use as categorias e a busca para achar exatamente o que precisa.';
    let ctaHref = 'busca.html';
    let ctaLabel = 'Procurar agora';

    if (!logado) {
      ctaTitle = 'Entre para aproveitar melhor a Doke';
      ctaSub = 'Salve buscas, veja recomendações e tenha uma experiência mais rápida.';
      ctaHref = 'login.html';
      ctaLabel = 'Entrar / Criar conta';
    } else if (eProf) {
      ctaTitle = 'Pronto para vender mais?';
      ctaSub = 'Publique seu primeiro serviço e apareça no topo para clientes próximos.';
      ctaHref = 'anunciar.html';
      ctaLabel = 'Publicar serviço';
    } else {
      ctaTitle = 'Peça orçamento em 1 clique';
      ctaSub = 'Entre em contato com profissionais e acompanhe tudo com segurança.';
      ctaHref = 'explorar.html';
      ctaLabel = 'Explorar profissionais';
    }

    sec.innerHTML = `
      <div class="para-voce-inner">
        <div class="pv-head">
          <h2>Para você</h2>
          <div class="pv-sub">Sugestões com base nas suas interações recentes</div>
        </div>

        <div class="pv-chips" id="pvChips">
          ${sugeridos.length ? sugeridos.map(t => `<button type="button" class="pv-chip" data-q="${esc(t)}">${esc(t)}</button>`).join('') : `<div class="pv-empty">Sem histórico ainda. Clique em uma categoria para começar.</div>`}
        </div>

        <div class="pv-cta">
          <div class="pv-cta-text">
            <div class="pv-cta-title">${esc(ctaTitle)}</div>
            <div class="pv-cta-sub">${esc(ctaSub)}</div>
          </div>
          <a class="pv-cta-btn" href="${ctaHref}">${esc(ctaLabel)}</a>
        </div>
      </div>
    `;

    anchor.parentNode.insertBefore(sec, anchor);

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
                <button class="sug-pin" type="button" aria-label="Fixar" data-pin="${pinned ? '1' : '0'}">${pinned ? 'Fixado' : 'Fixar'}</button>
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

    input.addEventListener('input', () => buildSuggestions(input.value));
    input.addEventListener('focus', () => buildSuggestions(input.value));
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
  localStorage.setItem("perfilPublicoId", uid);
  window.location.href = "perfil-publico.html";
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
      <img src="${foto}" class="pro-avatar" alt="${nome}">
      <div class="pro-name">${nome}</div>
      <div class="pro-role">${profissao}</div>
      ${ratingHtml}
      <button class="btn-ver-perfil">Ver Perfil</button>
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
      <div class="pro-avatar skel"></div>
      <div class="pro-name skel"></div>
      <div class="pro-role skel"></div>
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
    : `<div class="pros-empty">Nenhum profissional em destaque no momento.</div>`;

  novosEl.innerHTML = novos.length
    ? novos.map(cardPro).join("")
    : `<div class="pros-empty">Ainda não há profissionais novos cadastrados.</div>`;
}

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", carregarProfissionaisIndex);
