// ============================================================
// 1. IMPORTAÇÕES E CONFIGURAÇÃO
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getFirestore, collection, getDocs, addDoc, setDoc, getDoc, query, where, orderBy, limit, doc, updateDoc, increment, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// --- ADICIONADO: Storage para Upload de Vídeo/Foto ---
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// SUAS CHAVES DO PROJETO 'Doke-Site'
const firebaseConfig = {
    apiKey: "AIzaSyDbUwwj-joyhJ3aJ-tP4WJhGC1wLrwYh60",
    authDomain: "doke-site.firebaseapp.com",
    projectId: "doke-site",
    storageBucket: "doke-site.firebasestorage.app",
    messagingSenderId: "997098339190",
    appId: "1:997098339190:web:a865b696278be21f069857"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app); 
const storage = getStorage(app); // --- ADICIONADO: Inicializa Storage

// Garante acesso global
window.db = db;
window.auth = auth;
window.storage = storage; // --- ADICIONADO
window.collection = collection;
window.query = query;
window.getDocs = getDocs;
window.orderBy = orderBy;
window.where = where;
window.limit = limit;

// --- ADICIONADO: Variáveis globais para segurar os arquivos de upload ---
window.arquivoFotoSelecionado = null;
window.arquivoVideoSelecionado = null;

// ============================================================
// 2. FUNÇÃO DE PUBLICAR ANÚNCIO (MANTIDA ORIGINAL)
// ============================================================
window.publicarAnuncio = async function(event) {
    if(event) event.preventDefault();

    const btn = document.getElementById('btn-submit');
    const textoOriginal = btn ? btn.innerText : "Publicar";

    if(btn) { 
        btn.innerText = "Publicando..."; 
        btn.disabled = true; 
        btn.style.opacity = "0.7"; 
    }

    try {
        const titulo = document.getElementById('titulo').value;
        const descricao = document.getElementById('descricao').value;
        const categoriasString = document.getElementById('categorias-validacao').value; 
        const categoriaFinal = categoriasString ? categoriasString.split(',')[0] : "Geral";
        
        const tipoPreco = document.querySelector('input[name="tipo_preco"]:checked')?.value || "A combinar";
        let precoFinal = tipoPreco;
        if (tipoPreco === 'Preço Fixo') {
            const valorInput = document.getElementById('valor').value;
            if (valorInput) precoFinal = valorInput;
        }

        const cep = document.getElementById('cep').value.replace(/\D/g, ''); 
        const telefone = document.getElementById('telefone').value || "";

        let cidadeInput = document.getElementById('cidade');
        let ufInput = document.getElementById('uf');
        let bairroInput = document.getElementById('bairro');

        let cidadeFinal = cidadeInput ? cidadeInput.value : "Indefinido";
        let ufFinal = ufInput ? ufInput.value : "BR";
        let bairroFinal = bairroInput ? bairroInput.value : "Geral";

        if ((!cidadeFinal || cidadeFinal === "Indefinido") && cep.length === 8) {
            try {
                const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await resp.json();
                if(!data.erro) {
                    cidadeFinal = data.localidade;
                    ufFinal = data.uf;
                    bairroFinal = data.bairro || "Centro";
                }
            } catch(e) { console.log("Erro fallback CEP"); }
        }

        if(!titulo || !descricao) {
            throw new Error("Preencha o título e a descrição.");
        }

        let fotos = [];
        if (window.fotosParaEnviar && window.fotosParaEnviar.length > 0) {
            fotos = window.fotosParaEnviar;
        } else {
            fotos.push("https://placehold.co/600x400?text=Sem+Foto");
        }

        const perfilLocal = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
        const nomeAutor = perfilLocal.nome || "Você";
        const fotoAutor = perfilLocal.foto || "https://i.pravatar.cc/150?img=12";
        
        let userHandle = perfilLocal.user || ("@" + nomeAutor.split(' ')[0].toLowerCase());
        if(!userHandle.startsWith('@')) userHandle = '@' + userHandle;

        const novoAnuncio = {
            titulo: titulo,
            descricao: descricao,
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
            numAvaliacoes: 0
        };

        await addDoc(collection(window.db, "anuncios"), novoAnuncio);
        
        alert(`Anúncio publicado com sucesso em ${cidadeFinal}-${ufFinal}!`);
        window.location.href = "index.html";

    } catch (erro) {
        console.error("Erro ao publicar:", erro);
        alert("Erro: " + erro.message);
        if(btn) { 
            btn.innerText = textoOriginal; 
            btn.disabled = false; 
            btn.style.opacity = "1"; 
        }
    }
}

// ============================================================
// 3. SISTEMA UNIFICADO (VÍDEO/FOTO) + STORAGE - (ADICIONADO)
// ============================================================

// Alterna entre modo Foto e Vídeo na interface
window.ativarModo = function(modo) {
    const areaVideo = document.getElementById('campos-video-extra');
    const inputTipo = document.getElementById('tipoPostagemAtual');
    const avisoCapa = document.getElementById('avisoCapaVideo');
    const inputFoto = document.getElementById('file-post-upload');

    if (modo === 'video') {
        areaVideo.style.display = 'block';
        inputTipo.value = 'trabalho';
        if(avisoCapa) avisoCapa.style.display = 'block';
        window.arquivoFotoSelecionado = null;
        window.arquivoVideoSelecionado = null;
    } else {
        areaVideo.style.display = 'none';
        inputTipo.value = 'feed';
        if(avisoCapa) avisoCapa.style.display = 'none';
        window.arquivoFotoSelecionado = null;
        window.arquivoVideoSelecionado = null;
        inputFoto.click(); 
    }
}

// Processa a FOTO (Capa ou Imagem do Feed)
window.previewImagemPost = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        window.arquivoFotoSelecionado = file; // Guarda o arquivo REAL

        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('base64PostImage').value = "imagem_ok"; 
            document.getElementById('imgPreviewPost').src = e.target.result;
            document.getElementById('previewPostArea').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Processa o VÍDEO (Arquivo Real)
window.processarVideoUpload = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        // Limite de segurança (ex: 100MB)
        if (file.size > 100 * 1024 * 1024) { alert("Vídeo muito grande (max 100MB)."); input.value = ""; return; }
        window.arquivoVideoSelecionado = file; // Guarda o arquivo REAL
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

// FUNÇÃO MESTRA: UPLOAD PARA STORAGE + SALVAR NO BANCO
window.publicarConteudoUnificado = async function(event) {
    const btn = event.target;
    const user = auth.currentUser;
    if (!user) { alert("Faça login para publicar."); return; }

    const texto = document.getElementById('textoPost').value;
    const tipo = document.getElementById('tipoPostagemAtual').value;
    const perfilLocal = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};

    if (tipo === 'feed' && !texto && !window.arquivoFotoSelecionado) { alert("Escreva algo ou adicione uma foto."); return; }
    if (tipo === 'trabalho') {
        if (!window.arquivoFotoSelecionado) { alert("Adicione uma CAPA para o vídeo."); return; }
        if (!window.arquivoVideoSelecionado) { alert("Anexe o arquivo de VÍDEO."); return; }
    }

    btn.innerText = "Enviando Mídia...";
    btn.disabled = true;

    try {
        let urlImagem = "";
        let urlVideo = "";

        // 1. Upload IMAGEM (Capa ou Foto do Feed)
        if (window.arquivoFotoSelecionado) {
            const refImg = ref(storage, `posts/${user.uid}/img_${Date.now()}_${window.arquivoFotoSelecionado.name}`);
            const snapImg = await uploadBytes(refImg, window.arquivoFotoSelecionado);
            urlImagem = await getDownloadURL(snapImg.ref);
        }

        // 2. Upload VÍDEO (Se for Trabalho)
        if (tipo === 'trabalho' && window.arquivoVideoSelecionado) {
            btn.innerText = "Enviando Vídeo...";
            const refVid = ref(storage, `trabalhos/${user.uid}/vid_${Date.now()}_${window.arquivoVideoSelecionado.name}`);
            const snapVid = await uploadBytes(refVid, window.arquivoVideoSelecionado);
            urlVideo = await getDownloadURL(snapVid.ref);
        }

        btn.innerText = "Salvando...";

        // 3. Salvar no Firestore
        if (tipo === 'trabalho') {
            const tag = document.getElementById('inputTagVideo').value || "Trabalho";
            await addDoc(collection(db, "trabalhos"), {
                uid: user.uid,
                autorNome: perfilLocal.user || perfilLocal.nome,
                categoria: tag,
                tag: tag.toUpperCase(),
                descricao: texto,
                videoUrl: urlVideo, // Link do Storage
                capa: urlImagem,    // Link do Storage
                data: new Date().toISOString()
            });
            alert("Vídeo publicado com sucesso!");
            window.location.reload(); 
        } else {
            await addDoc(collection(db, "posts"), {
                uid: user.uid,
                autorNome: perfilLocal.nome || "Usuário",
                autorFoto: perfilLocal.foto || "https://placehold.co/150",
                autorUser: perfilLocal.user || "@usuario",
                texto: texto,
                imagem: urlImagem, // Link do Storage
                data: new Date().toISOString(),
                likes: 0
            });
            document.getElementById('textoPost').value = "";
            window.removerImagemPost();
            btn.innerText = "Publicar";
            btn.disabled = false;
        }
    } catch (e) {
        console.error("Erro no upload:", e);
        alert("Erro ao publicar: " + e.message);
        btn.innerText = "Publicar";
        btn.disabled = false;
    }
}

// ============================================================
// 4. CARREGAR VÍDEOS + PLAYER + ORÇAMENTO - (ATUALIZADO)
// ============================================================

window.carregarTrabalhosHome = async function() {
    const container = document.querySelector('.tiktok-scroll-wrapper');
    if (!container) return;

    container.innerHTML = '<div style="padding:20px; color:white;">Carregando galeria...</div>';

    try {
        const q = query(collection(db, "trabalhos"), orderBy("data", "desc"), limit(10));
        const snapshot = await getDocs(q);

        container.innerHTML = "";

        if (snapshot.empty) {
            container.innerHTML = '<div style="padding:20px; color:white;">Nenhum trabalho recente.</div>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const nomeSeguro = (data.autorNome || "").replace(/'/g, "");
            const descSegura = (data.descricao || "").replace(/'/g, "");

            const html = `
            <div class="tiktok-card" onclick="tocarVideoDoCard(this)">
                <textarea style="display:none;" class="video-src-hidden">${data.videoUrl}</textarea>
                <div class="badge-status">${data.tag}</div>
                <img src="${data.capa}" class="video-bg" alt="Capa" style="object-fit: cover;">
                <div class="play-icon"><svg viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div>
                
                <div class="video-ui-layer">
                    <div class="video-bottom-info">
                        <div class="provider-info"><span class="provider-name" style="font-weight:800; font-size:0.9rem;">${data.autorNome}</span></div>
                        <p class="video-desc">${data.descricao}</p>
                        <button class="btn-video-action" 
                            style="position:relative; z-index:3; width:100%; margin-top:5px; cursor:pointer;"
                            onclick="event.stopPropagation(); solicitarOrcamento('${data.uid}', '${nomeSeguro}', '${descSegura}')">
                            Solicitar Orçamento
                        </button>
                    </div>
                </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
    } catch (e) { console.error(e); }
}

// --- FUNÇÕES DO PLAYER DE VÍDEO ---
window.tocarVideoDoCard = function(cardElement) {
    const videoSrc = cardElement.querySelector('.video-src-hidden').value;
    if(videoSrc) {
        const modal = document.getElementById('modalPlayerVideo');
        const player = document.getElementById('playerPrincipal');
        if(player && modal) {
            player.src = videoSrc;
            modal.style.display = 'flex';
            player.play();
        } else { alert("Player não encontrado no HTML (index.html)."); }
    }
}

window.fecharPlayerVideo = function() {
    const modal = document.getElementById('modalPlayerVideo');
    const player = document.getElementById('playerPrincipal');
    if(player) { player.pause(); player.src = ""; }
    if(modal) modal.style.display = 'none';
}

// --- LÓGICA DE SOLICITAR ORÇAMENTO (PASSO 2) ---
window.solicitarOrcamento = async function(idPrestador, nomePrestador, descricaoServico) {
    const user = auth.currentUser;
    if (!user) {
        alert("Você precisa fazer login para pedir um orçamento.");
        window.location.href = "login.html";
        return;
    }
    if (user.uid === idPrestador) {
        alert("Você não pode pedir orçamento para si mesmo!");
        return;
    }
    const contato = prompt(`Descreva o que você precisa para ${nomePrestador}:`, "Olá, vi seu vídeo e gostaria de um orçamento.");
    if (contato && contato.trim() !== "") {
        try {
            await addDoc(collection(db, "pedidos"), {
                deUid: user.uid,
                paraUid: idPrestador,
                paraNome: nomePrestador,
                servicoReferencia: descricaoServico,
                mensagemInicial: contato,
                status: "pendente",
                dataPedido: new Date().toISOString(),
                visualizado: false
            });
            alert(`✅ Pedido enviado para ${nomePrestador}!`);
        } catch (e) { console.error("Erro:", e); alert("Erro ao enviar pedido."); }
    }
}

// ============================================================
// 5. CARREGAMENTO DE ANÚNCIOS (MANTIDO ORIGINAL)
// ============================================================
window.carregarAnunciosDoFirebase = async function(termoBusca = "") {
    const feed = document.getElementById('feedAnuncios');
    const tituloSecao = document.getElementById('categorias-title'); 
    if (!feed) return; 

    feed.innerHTML = `<div style="padding:40px; text-align:center;"><i class='bx bx-loader-alt bx-spin' style="font-size:2rem; color:var(--cor0);"></i><p style="margin-top:10px; color:#666;">Carregando anúncios...</p></div>`;

    try {
        const q = query(collection(window.db, "anuncios"));
        const querySnapshot = await getDocs(q);
        
        let listaAnuncios = [];
        querySnapshot.forEach((docSnap) => {
            let dados = docSnap.data();
            dados.id = docSnap.id; 
            listaAnuncios.push(dados);
        });

        if (termoBusca && termoBusca.trim() !== "") {
            const termo = termoBusca.toLowerCase().trim();
            if(tituloSecao) tituloSecao.innerHTML = `Resultados para: <span style="color:var(--cor2)">"${termoBusca}"</span>`;
            listaAnuncios = listaAnuncios.filter(anuncio => {
                const titulo = (anuncio.titulo || "").toLowerCase();
                const desc = (anuncio.descricao || "").toLowerCase();
                return titulo.includes(termo) || desc.includes(termo);
            });
        } else {
            if(tituloSecao) tituloSecao.innerText = "NOVOS ANÚNCIOS:";
        }

        feed.innerHTML = ""; 

        if (listaAnuncios.length === 0) {
            feed.innerHTML = `<p style="text-align:center; padding:20px; color:#666;">Nenhum anúncio encontrado.</p>`;
            return;
        }

        listaAnuncios.forEach((anuncio) => {
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
            let htmlFotos = '';
            let contadorExtra = fotos.length - 3;

// Prepara a lista de fotos para passar no onclick (converte array para string segura)
            const jsonFotos = JSON.stringify(fotos).replace(/"/g, '&quot;');

            if (fotos.length === 1) {
                htmlFotos = `
                <div class="grid-fotos-doke" style="grid-template-columns: 1fr;">
                    <div class="foto-main" style="grid-column: 1; grid-row: 1/3;">
                        <img src="${fotos[0]}" class="img-cover" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 0)">
                    </div>
                </div>`;
            } else if (fotos.length === 2) {
                htmlFotos = `
                <div class="grid-fotos-doke">
                    <div class="foto-main">
                        <img src="${fotos[0]}" class="img-cover" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 0)">
                    </div>
                    <div class="foto-sub full-height">
                        <img src="${fotos[1]}" class="img-cover" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 1)">
                    </div>
                </div>`;
            } else {
                let overlayHtml = (fotos.length > 3) ? `<div class="overlay-count">+${contadorExtra}</div>` : '';
                htmlFotos = `
                <div class="grid-fotos-doke">
                    <div class="foto-main">
                        <img src="${fotos[0]}" class="img-cover" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 0)">
                    </div>
                    <div class="foto-sub">
                        <img src="${fotos[1]}" class="img-cover" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 1)">
                    </div>
                    <div class="foto-sub">
                        <img src="${fotos[2]}" class="img-cover" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 2)">
                        ${overlayHtml}
                    </div>
                </div>`;
            }

            const card = document.createElement('div');
            card.className = 'card-premium';
            card.onmousedown = function() { window.registrarVisualizacao(anuncio.id); };

            card.innerHTML = `
                <button class="btn-topo-avaliacao" onclick="window.location.href='detalhes.html?id=${anuncio.id}'">
                    <i class='bx bx-info-circle'></i> Mais Informações
                </button>
                <div class="cp-header-clean">
                    <div style="display:flex; gap:12px; align-items:center;">
                        <img src="${fotoAutor}" class="cp-avatar"> 
                        <div class="cp-info-user">
                            <div class="cp-nome-row">
                                <h4 class="cp-nome-clean">${nomeParaExibir}</h4>
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
                    <a href="orcamento.html">
                        <button class="btn-solicitar">Solicitar Orçamento</button>
                    </a>
                </div>
            `;
            feed.appendChild(card);
        });
    } catch (erro) {
        console.error("Erro no carregamento:", erro);
        feed.innerHTML = `<p style="text-align:center; padding:20px;">Erro ao carregar anúncios.</p>`;
    }
}

// ============================================================
// 6. CARREGAR CATEGORIAS (MANTIDO)
// ============================================================
window.carregarCategorias = async function() {
    const container = document.getElementById('listaCategorias');
    if (!container) return;

    try {
        const q = query(collection(window.db, "categorias"));
        const querySnapshot = await getDocs(q);
        
        let listaCategorias = [];
        if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
                listaCategorias.push(doc.data());
            });
        } else {
            // Fallback se não tiver nada no banco
            listaCategorias = [
                { nome: "Casa", img: "https://cdn-icons-png.flaticon.com/512/10338/10338273.png" },
                { nome: "Tecnologia", img: "https://cdn-icons-png.flaticon.com/512/2920/2920329.png" },
                { nome: "Limpeza", img: "https://cdn-icons-png.flaticon.com/512/995/995053.png" },
                { nome: "Aulas", img: "https://cdn-icons-png.flaticon.com/512/3976/3976625.png" },
                { nome: "Beleza", img: "https://cdn-icons-png.flaticon.com/512/2706/2706950.png" },
                { nome: "Fretes", img: "https://cdn-icons-png.flaticon.com/512/759/759238.png" },
                { nome: "Mecânica", img: "https://cdn-icons-png.flaticon.com/512/3202/3202926.png" }
            ];
        }

        container.innerHTML = ""; 
        listaCategorias.forEach(cat => {
            const html = `
                <div class="categoria-item" onclick="filtrarPorCategoria('${cat.nome}')" style="cursor:pointer;">
                    <div class="categoria-circle">
                        <img src="${cat.img}" alt="${cat.nome}">
                    </div>
                    <p style="text-align:center; font-size:0.8rem; margin-top:8px; color:#666; font-weight:600;">${cat.nome}</p>
                </div>
            `;
            container.innerHTML += html;
        });
    } catch (e) {
        console.error("Erro categorias:", e);
        container.innerHTML = `<div style="padding:0 20px; color:#999;">Categorias indisponíveis</div>`;
    }
}

// ============================================================
// 7. PROFISSIONAIS (MANTIDO)
// ============================================================
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
// 8. HEADER, AUTH, UTILITÁRIOS (MANTIDO)
// ============================================================

function protegerPaginasRestritas() {
    const paginasRestritas = ['meuperfil.html', 'chat.html', 'comunidade.html', 'notificacoes.html', 'mais.html'];
    const caminhoAtual = window.location.pathname;
    const paginaAtual = caminhoAtual.substring(caminhoAtual.lastIndexOf('/') + 1);
    const estaLogado = localStorage.getItem('usuarioLogado') === 'true';
    if (paginasRestritas.includes(paginaAtual) && !estaLogado) { window.location.href = "login.html"; }
}

window.verificarEstadoLogin = function() {
    const logado = localStorage.getItem('usuarioLogado') === 'true';
    const perfil = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
    const fotoUsuario = perfil.foto || 'https://i.pravatar.cc/150?img=12'; 

    const container = document.querySelector('.botoes-direita');
    if (container) {
        if (logado) {
            container.innerHTML = `
                <div class="profile-container">
                    <img src="${fotoUsuario}" class="profile-img-btn" onclick="toggleDropdown(event)" alt="Perfil">
                    <div id="dropdownPerfil" class="dropdown-profile">
                        <a href="#" onclick="irParaMeuPerfil(event)" class="dropdown-item"><i class='bx bx-user-circle'></i> Ver Perfil</a>
                        <a href="#" onclick="alternarConta()" class="dropdown-item"><i class='bx bx-user-pin'></i> Alternar Conta</a>
                        <a href="anunciar.html" class="dropdown-item"><i class='bx bx-plus-circle'></i> Anunciar</a>
                        <a href="#" onclick="fazerLogout()" class="dropdown-item item-sair"><i class='bx bx-log-out'></i> Sair</a>
                    </div>
                </div>`;
        } else {
            container.innerHTML = `<a href="login.html" class="entrar">Entrar</a>`;
        }
    }

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

window.fazerLogout = function() {
    if(confirm("Sair da conta?")) {
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'index.html';
    }
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
        d.className = 'recent-item'; d.innerHTML = `<span>↺</span> ${t}`;
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

window.onclick = function(e) {
    if (!e.target.matches('.profile-img-btn') && !e.target.matches('img')) {
        const ds = document.getElementsByClassName("dropdown-profile");
        for (let i = 0; i < ds.length; i++) { if (ds[i].classList.contains('show')) ds[i].classList.remove('show'); }
    }
    const p = document.getElementById('boxCep');
    const w = document.querySelector('.cep-wrapper');
    if (p && w && !w.contains(e.target)) p.style.display = 'none';
}

window.registrarVisualizacao = async function(idAnuncio) {
    if(!idAnuncio) return;
    try {
        const anuncioRef = doc(db, "anuncios", idAnuncio);
        await updateDoc(anuncioRef, { views: increment(1) });
    } catch (error) { console.error(error); }
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

window.carregarFeedGlobal = async function() {
    const container = document.getElementById('feed-global-container');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align:center; padding:40px; color:#777;">
            <i class='bx bx-loader-alt bx-spin' style="font-size:2rem;"></i>
            <p>Carregando atualizações da comunidade...</p>
        </div>`;

    try {
        const q = window.query(
            window.collection(window.db, "posts"), 
            window.orderBy("data", "desc")
        );

        const snapshot = await window.getDocs(q);

        container.innerHTML = ""; 

        if (snapshot.empty) {
            container.innerHTML = `
                <div style="text-align:center; padding:30px; background:#fff; border-radius:12px;">
                    <i class='bx bx-news' style="font-size:3rem; color:#ddd;"></i>
                    <p style="color:#666;">Ainda não há publicações na comunidade.</p>
                </div>`;
            return;
        }

        snapshot.forEach((doc) => {
            const post = doc.data();
            const dataPost = new Date(post.data).toLocaleDateString('pt-BR', { 
                day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' 
            });
            
            const imgHtml = post.imagem 
                ? `<div class="midia-post"><img src="${post.imagem}" loading="lazy"></div>` 
                : '';

            const html = `
                <div class="card-feed-global">
                    <div class="feed-header">
                        <img src="${post.autorFoto || 'https://placehold.co/50'}" alt="User">
                        <div class="feed-user-info">
                            <h4>${post.autorNome}</h4>
                            <span>${post.autorUser || '@usuario'} • ${dataPost}</span>
                        </div>
                    </div>
                    <div class="feed-body">
                        <p>${post.texto}</p>
                    </div>
                    ${imgHtml}
                    <div class="feed-footer">
                        <div class="feed-action"><i class='bx bx-heart'></i> ${post.likes || 0}</div>
                        <div class="feed-action"><i class='bx bx-comment'></i> Comentar</div>
                        <div class="feed-action"><i class='bx bx-share-alt'></i> Compartilhar</div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });

    } catch (e) {
        console.error("Erro ao carregar feed global:", e);
        container.innerHTML = `<p style="text-align:center; color:red;">Erro ao carregar feed.</p>`;
    }
}

// ============================================================
// 13. CENTRAL DE PEDIDOS (Lógica do chat.html)
// ============================================================

window.carregarMeusPedidos = async function() {
    const container = document.getElementById('container-pedidos');
    const contador = document.getElementById('contadorPedidos');
    
    if (!container) return; // Só roda se estiver na página chat.html

    const user = auth.currentUser;
    if (!user) {
        container.innerHTML = `<div class="empty-chat"><p>Faça login para ver seus pedidos.</p><a href="login.html" class="btn-solid">Entrar</a></div>`;
        return;
    }

    try {
        // Busca pedidos onde o campo 'paraUid' é igual ao MEU ID
        // Ordena pelos mais recentes
        const q = query(collection(db, "pedidos"), where("paraUid", "==", user.uid), orderBy("dataPedido", "desc"));
        
        onSnapshot(q, (snapshot) => {
            container.innerHTML = ""; // Limpa a lista
            
            if (snapshot.empty) {
                container.innerHTML = `<div class="empty-chat"><i class='bx bx-ghost'></i><p>Você ainda não recebeu nenhum pedido.</p></div>`;
                if(contador) contador.innerText = "0 novos";
                return;
            }

            let novos = 0;

            snapshot.forEach((doc) => {
                const pedido = doc.data();
                const idPedido = doc.id;
                const dataFormatada = new Date(pedido.dataPedido).toLocaleDateString('pt-BR');
                
                // Define a classe CSS baseada no status
                let classeStatus = 'pendente';
                if(pedido.status === 'aceito') classeStatus = 'aceito';
                if(pedido.status === 'recusado') classeStatus = 'recusado';

                if(pedido.status === 'pendente') novos++;

                // Lógica dos Botões vs Contato Liberado
                let areaAcoes = '';
                
                if (pedido.status === 'pendente') {
                    areaAcoes = `
                        <div class="acoes-pedido">
                            <button class="btn-acao btn-recusar" onclick="atualizarStatusPedido('${idPedido}', 'recusado')">Recusar</button>
                            <button class="btn-acao btn-aceitar" onclick="atualizarStatusPedido('${idPedido}', 'aceito')"><i class='bx bxl-whatsapp'></i> Aceitar e Conversar</button>
                        </div>
                    `;
                } else if (pedido.status === 'aceito') {
                    areaAcoes = `
                        <div class="contato-liberado" style="display:block;">
                            <i class='bx bxs-check-circle'></i> Você aceitou este pedido!<br>
                            O cliente aguarda seu contato.
                        </div>
                    `;
                } else {
                    areaAcoes = `<div style="text-align:right; color:#e74c3c; font-weight:bold;">Pedido Recusado</div>`;
                }

                const html = `
                <div class="card-pedido ${classeStatus}">
                    <div class="avatar-pedido">
                        <img src="https://cdn-icons-png.flaticon.com/512/847/847969.png" alt="Cliente">
                    </div>
                    <div class="info-pedido">
                        <div class="header-card">
                            <h4>Cliente Interessado</h4>
                            <span class="data-pedido">${dataFormatada}</span>
                        </div>
                        
                        <span class="servico-tag">Interesse: ${pedido.servicoReferencia}</span>
                        
                        <div class="msg-inicial">
                            "${pedido.mensagemInicial}"
                        </div>

                        ${areaAcoes}
                    </div>
                </div>`;

                container.insertAdjacentHTML('beforeend', html);
            });

            if(contador) contador.innerText = `${novos} pendentes`;
        });

    } catch (e) {
        console.error("Erro ao carregar pedidos:", e);
        container.innerHTML = `<p style="text-align:center; color:red;">Erro ao carregar pedidos. (Verifique se o índice composto foi criado no Firebase)</p>`;
    }
}

// Função para Aceitar ou Recusar
window.atualizarStatusPedido = async function(idPedido, novoStatus) {
    const btn = event.target;
    btn.innerText = "...";
    btn.disabled = true;

    try {
        await updateDoc(doc(db, "pedidos", idPedido), {
            status: novoStatus,
            dataAtualizacao: new Date().toISOString()
        });
        // O onSnapshot vai atualizar a tela sozinho automaticamente!
    } catch (e) {
        console.error("Erro ao atualizar:", e);
        alert("Erro ao atualizar status.");
        btn.disabled = false;
    }
}

// ============================================================
// 9. INICIALIZAÇÃO
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    
    // 1. Proteção e Header
    protegerPaginasRestritas();
    verificarEstadoLogin();
    
    // 2. CARREGAMENTOS DINÂMICOS
    carregarCategorias(); 
    carregarProfissionais(); 
    carregarFiltrosLocalizacao(); 

    // NOVO: CARREGA VIDEOS SE ESTIVER NA HOME
    if(document.querySelector('.tiktok-scroll-wrapper')) {
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

    // 5. Efeitos de Busca (Histórico)
    const wrapper = document.getElementById('buscaWrapper');
    if(inputBusca) {
        atualizarListaHistorico();
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

    var dataHoje = new Date().toDateString();
    if (localStorage.getItem("popupVistoData") !== dataHoje) {
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
});

// ==========================================
// LÓGICA DA GALERIA (COM MINIATURAS)
// ==========================================
window.fotosAtuais = [];
window.indiceAtual = 0;

window.abrirGaleria = function(listaFotos, index) {
    window.fotosAtuais = listaFotos;
    window.indiceAtual = index;
    
    // 1. Gera as miniaturas
    const containerThumbs = document.getElementById('areaThumbnails');
    containerThumbs.innerHTML = ""; // Limpa anteriores

    listaFotos.forEach((foto, i) => {
        const img = document.createElement('img');
        img.src = foto;
        img.classList.add('thumb-item');
        img.id = `thumb-${i}`; // ID para achar depois
        img.onclick = function(e) {
            e.stopPropagation(); // Não fechar o modal
            window.indiceAtual = i;
            atualizarImagemModal();
        };
        containerThumbs.appendChild(img);
    });

    atualizarImagemModal();
    document.getElementById('modalGaleria').style.display = 'flex';
}

window.mudarImagem = function(direcao) {
    if(!window.fotosAtuais || window.fotosAtuais.length === 0) return;

    window.indiceAtual += direcao;

    if (window.indiceAtual >= window.fotosAtuais.length) window.indiceAtual = 0;
    if (window.indiceAtual < 0) window.indiceAtual = window.fotosAtuais.length - 1;

    atualizarImagemModal();
}

function atualizarImagemModal() {
    // 1. Muda a imagem grande
    const img = document.getElementById('imgExpandida');
    img.src = window.fotosAtuais[window.indiceAtual];

    // 2. Atualiza a borda branca na miniatura
    // Remove classe 'ativo' de todas
    document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('ativo'));
    
    // Adiciona na atual
    const thumbAtual = document.getElementById(`thumb-${window.indiceAtual}`);
    if(thumbAtual) {
        thumbAtual.classList.add('ativo');
        // Opcional: Rolar a barrinha para mostrar a foto selecionada
        thumbAtual.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

window.fecharGaleria = function(event) {
    if (!event || event.target.id === 'modalGaleria' || event.target.classList.contains('btn-fechar-galeria')) {
        document.getElementById('modalGaleria').style.display = 'none';
        document.getElementById('imgExpandida').src = "";
    }
}