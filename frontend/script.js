// ============================================================
// 1. IMPORTAÇÕES E CONFIGURAÇÃO
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getFirestore, collection, getDocs, addDoc, setDoc, getDoc, query, where, orderBy, limit, doc, updateDoc, increment, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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
const storage = getStorage(app); 

// Garante acesso global
window.db = db;
window.auth = auth;
window.storage = storage;
window.collection = collection;
window.query = query;
window.getDocs = getDocs;
window.orderBy = orderBy;
window.where = where;
window.limit = limit;

// Variáveis Globais
window.arquivoFotoSelecionado = null;
window.arquivoVideoSelecionado = null;
window.fotosAtuais = [];
window.indiceAtual = 0;


// ============================================================
// 2. FUNÇÃO DE PUBLICAR ANÚNCIO (SEM WHATSAPP OBRIGATÓRIO)
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
        const perguntasFormulario = document.getElementById('perguntas-formulario')?.value || "";
        const temFormulario = perguntasFormulario.trim().length > 0;
        const categoriasString = document.getElementById('categorias-validacao').value; 
        const categoriaFinal = categoriasString ? categoriasString.split(',')[0] : "Geral";
        
        const tipoPreco = document.querySelector('input[name="tipo_preco"]:checked')?.value || "A combinar";
        let precoFinal = tipoPreco;
        if (tipoPreco === 'Preço Fixo') {
            const valorInput = document.getElementById('valor').value;
            if (valorInput) precoFinal = valorInput;
        }

        const cep = document.getElementById('cep').value.replace(/\D/g, ''); 
        
        // Removemos a obrigatoriedade do telefone no anúncio, já que será chat interno
        const telefone = document.getElementById('telefone')?.value || "";

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

        if(!titulo || !descricao) throw new Error("Preencha o título e a descrição.");

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
            temFormulario: temFormulario,
            perguntasFormulario: perguntasFormulario,
            categoria: categoriaFinal,
            categorias: categoriasString,
            preco: precoFinal,
            cep: cep,
            uf: ufFinal,
            cidade: cidadeFinal,
            bairro: bairroFinal,
            whatsapp: telefone, // Mantido apenas como dado secundário
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
        
        alert("Anúncio publicado com sucesso!");
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
// 3. SISTEMA UNIFICADO DE UPLOAD (VÍDEO E FOTO)
// ============================================================

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

        if (window.arquivoFotoSelecionado) {
            const refImg = ref(storage, `posts/${user.uid}/img_${Date.now()}_${window.arquivoFotoSelecionado.name}`);
            const snapImg = await uploadBytes(refImg, window.arquivoFotoSelecionado);
            urlImagem = await getDownloadURL(snapImg.ref);
        }

        if (tipo === 'trabalho' && window.arquivoVideoSelecionado) {
            btn.innerText = "Enviando Vídeo...";
            const refVid = ref(storage, `trabalhos/${user.uid}/vid_${Date.now()}_${window.arquivoVideoSelecionado.name}`);
            const snapVid = await uploadBytes(refVid, window.arquivoVideoSelecionado);
            urlVideo = await getDownloadURL(snapVid.ref);
        }

        btn.innerText = "Salvando...";

        if (tipo === 'trabalho') {
            const tag = document.getElementById('inputTagVideo').value || "Trabalho";
            await addDoc(collection(db, "trabalhos"), {
                uid: user.uid,
                autorNome: perfilLocal.user || perfilLocal.nome,
                categoria: tag,
                tag: tag.toUpperCase(),
                descricao: texto,
                videoUrl: urlVideo,
                capa: urlImagem,
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
                imagem: urlImagem,
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
    }
}


// ============================================================
// 5. CARREGAR VÍDEOS NA HOME
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

window.tocarVideoDoCard = function(card) {
    const src = card.querySelector('.video-src-hidden').value;
    const modal = document.getElementById('modalPlayerVideo');
    const player = document.getElementById('playerPrincipal');
    if(src && modal && player) {
        player.src = src; 
        modal.style.display = 'flex'; 
        player.play();
    }
}

window.fecharPlayerVideo = function() {
    const modal = document.getElementById('modalPlayerVideo');
    const player = document.getElementById('playerPrincipal');
    if(player) { player.pause(); player.src = ""; }
    if(modal) modal.style.display = 'none';
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
            mensagemInicial: msg, // Descrição obrigatória
            respostasDoFormulario: respostasFormulario, // Respostas das questões do prestador
            status: "pendente",
            dataPedido: new Date().toISOString(),
            visualizado: false
        });

        alert(`✅ Solicitação enviada! Aguarde o retorno no chat.`);
        
    } catch (e) {
        console.error("Erro ao enviar pedido:", e);
        alert("Erro técnico ao enviar. Tente novamente.");
    }
}

// Lista os pedidos no chat.html
// ============================================================
// ATUALIZAÇÃO: CARREGAR PEDIDOS COM TRATAMENTO DE ERRO/VAZIO
// ============================================================
window.carregarMeusPedidos = async function() {
    const container = document.getElementById('container-pedidos');
    const contador = document.getElementById('contadorPedidos');
    
    if (!container) return; // Só roda na página chat.html

    // 1. Verifica login
    const user = auth.currentUser;
    if (!user) {
        container.innerHTML = `
            <div class="empty-chat">
                <i class='bx bx-user-x'></i>
                <p>Faça login para ver suas mensagens.</p>
            </div>`;
        return;
    }

    try {
        // 2. Tenta fazer a busca
        // OBS: Se der erro de "Index", remova o orderBy temporariamente para testar
        const q = query(
            collection(db, "pedidos"), 
            where("paraUid", "==", user.uid), 
            orderBy("dataPedido", "desc") 
        );
        
        // 3. Listener em tempo real com tratamento de erro (O SEGREDO ESTÁ AQUI)
        onSnapshot(q, (snapshot) => {
            container.innerHTML = ""; // Limpa o spinner "Carregando..."
            let novos = 0;

            // CASO 1: Não tem nenhum pedido
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-chat">
                        <i class='bx bx-message-rounded-dots' style="color: #ccc; font-size: 4rem;"></i>
                        <h4 style="color: #666; margin-top: 10px;">Nenhum pedido recebido</h4>
                        <p style="color: #999;">Quando alguém solicitar um orçamento, aparecerá aqui.</p>
                    </div>`;
                if(contador) contador.innerText = "0 novos";
                return;
            }

            // CASO 2: Tem pedidos (Renderiza a lista)
            snapshot.forEach((doc) => {
                const p = doc.data();
                const id = doc.id;
                
                let classeStatus = 'pendente';
                if(p.status === 'aceito') classeStatus = 'aceito';
                if(p.status === 'recusado') classeStatus = 'recusado';

                if(p.status === 'pendente') novos++;

                // Lógica dos botões
                let botoesArea = '';
                if (p.status === 'pendente') {
                    botoesArea = `
                        <div class="acoes-pedido">
                            <button class="btn-acao btn-recusar" onclick="atualizarStatusPedido('${id}', 'recusado')">Recusar</button>
                            <button class="btn-acao btn-aceitar" onclick="atualizarStatusPedido('${id}', 'aceito')">Aceitar Orçamento</button>
                        </div>
                    `;
                } else if (p.status === 'aceito') {
                    botoesArea = `
                        <div class="contato-liberado" style="display:block; background:#e8f5e9; padding:15px; border-radius:8px; text-align:center; margin-top:10px;">
                            <span style="color:#2e7d32; font-weight:bold; font-size:0.9rem;">Pedido Aceito!</span>
                            <p style="font-size:0.8rem; color:#555; margin:5px 0;">Inicie a conversa pelo nosso chat seguro.</p>
                            <button onclick="abrirChatInterno('${p.deUid}', '${id}', '${p.clienteNome}', '${p.clienteFoto}')" style="margin-top:5px; color:white; padding:10px 20px; border:none; border-radius:30px; font-weight:bold; cursor:pointer; background-color:#009688;">
                                <i class='bx bx-chat'></i> Abrir Chat
                            </button>
                        </div>
                    `;
                } else {
                    botoesArea = `<div style="text-align:right; color:#e74c3c; font-weight:bold; margin-top:10px;">Pedido Recusado</div>`;
                }

                const html = `
                <div class="card-pedido ${classeStatus}">
                    <div class="avatar-pedido">
                        <img src="${p.clienteFoto || 'https://cdn-icons-png.flaticon.com/512/847/847969.png'}" alt="Cliente">
                    </div>
                    <div class="info-pedido" style="width:100%;">
                        <div class="header-card">
                            <h4>${p.clienteNome}</h4>
                            <span class="data-pedido">${new Date(p.dataPedido).toLocaleDateString()}</span>
                        </div>
                        <span class="servico-tag">Interesse: ${p.servicoReferencia}</span>
                        <div class="msg-inicial">"${p.mensagemInicial}"</div>
                        ${botoesArea}
                    </div>
                </div>`;

                container.insertAdjacentHTML('beforeend', html);
            });

            if(contador) contador.innerText = `${novos} pendentes`;

        }, (error) => {
            // CASO 3: Deu erro no Firebase (ex: Falta de Índice)
            console.error("Erro no Snapshot:", error);
            
            // Remove o spinner e mostra mensagem de erro amigável
            container.innerHTML = `
                <div class="empty-chat">
                    <i class='bx bx-error-circle' style="color: #e74c3c;"></i>
                    <p>Não foi possível carregar os pedidos.</p>
                    <small style="color:#999;">Verifique sua conexão ou o Console (F12) para erros de índice.</small>
                </div>`;
        });

    } catch (e) {
        console.error("Erro geral:", e);
        container.innerHTML = `<div class="empty-chat"><p>Erro técnico ao buscar.</p></div>`;
    }
}

// Função Placeholder para o Chat Interno (Passo Futuro)


// 1. Função para abrir a tela de conversa e carregar dados
window.abrirChatInterno = async function(uidCliente, idPedido, nomeCliente, fotoCliente) {
    const viewLista = document.getElementById('view-lista');
    const viewChat = document.getElementById('view-chat');
    
    // Troca de telas (Esconde lista, mostra chat)
    if(viewLista) viewLista.style.display = 'none';
    if(viewChat) {
        viewChat.style.display = 'flex';
        // Ajuste Mobile: Esconde menu inferior e topo para focar no chat
        if(window.innerWidth <= 768) {
            const bottomNav = document.querySelector('.bottom-nav');
            const navbarMobile = document.querySelector('.navbar-mobile');
            if(bottomNav) bottomNav.style.display = 'none';
            if(navbarMobile) navbarMobile.style.display = 'none';
        }
    }

    // Preenche cabeçalho do chat
    const nomeEl = document.getElementById('chatNome');
    const imgEl = document.getElementById('chatAvatar');
    if(nomeEl) nomeEl.innerText = nomeCliente || "Cliente";
    if(imgEl) imgEl.src = fotoCliente || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    
    chatAtualId = idPedido;
    const containerMsgs = document.getElementById('areaMensagens');
    containerMsgs.innerHTML = '<div style="text-align:center; padding:20px; color:#999;"><i class="bx bx-loader-alt bx-spin"></i> Carregando conversa...</div>';

    try {
        // A) Busca detalhes do pedido para exibir o RESUMO DO QUIZ (Dados Reais)
        const docPedido = await getDoc(doc(db, "pedidos", idPedido));
        containerMsgs.innerHTML = ""; // Limpa loader

        if (docPedido.exists()) {
            const dados = docPedido.data();
            
            // Verifica se tem respostas do formulário salvas
            if (dados.formularioRespostas && Array.isArray(dados.formularioRespostas) && dados.formularioRespostas.length > 0) {
                let htmlQuiz = `
                    <div class="quiz-summary-card">
                        <div class="quiz-header"><i class='bx bx-list-check'></i> Detalhes do Serviço</div>
                `;
                
                // Transforma cada resposta em item visual
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
                // Fallback: Se não tiver quiz, mostra a descrição inicial
                containerMsgs.insertAdjacentHTML('beforeend', `
                    <div class="quiz-summary-card">
                        <div class="quiz-header"><i class='bx bx-info-circle'></i> Solicitação do Cliente</div>
                        <div style="font-style:italic; color:#555; padding:10px;">"${dados.mensagemInicial}"</div>
                    </div>
                `);
            }
        }

        // B) Listener em Tempo Real para as Mensagens
        const qMsgs = query(collection(db, "pedidos", idPedido, "mensagens"), orderBy("timestamp", "asc"));
        
        if(chatUnsubscribe) chatUnsubscribe(); // Limpa listener anterior se houver

        chatUnsubscribe = onSnapshot(qMsgs, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    renderizarMensagem(change.doc.data(), containerMsgs);
                }
            });
            // Rola para a última mensagem
            setTimeout(() => {
                containerMsgs.scrollTop = containerMsgs.scrollHeight;
            }, 100);
        });

    } catch (e) {
        console.error("Erro ao abrir chat:", e);
        containerMsgs.innerHTML = '<div style="text-align:center; padding:20px; color:red;">Erro ao carregar mensagens.</div>';
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


// ============================================================
// 7. CARREGAMENTO DE ANÚNCIOS (FEED) - (MANTIDO E INTEGRADO)
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
            const jsonFotos = JSON.stringify(fotos).replace(/"/g, '&quot;');

            let htmlFotos = '';
            let contadorExtra = fotos.length - 3;

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
                    <div class="foto-main"><img src="${fotos[0]}" class="img-cover" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 0)"></div>
                    <div class="foto-sub full-height"><img src="${fotos[1]}" class="img-cover" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 1)"></div>
                </div>`;
            } else {
                let overlayHtml = (fotos.length > 3) ? `<div class="overlay-count">+${contadorExtra}</div>` : '';
                htmlFotos = `
                <div class="grid-fotos-doke">
                    <div class="foto-main"><img src="${fotos[0]}" class="img-cover" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 0)"></div>
                    <div class="foto-sub"><img src="${fotos[1]}" class="img-cover" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 1)"></div>
                    <div class="foto-sub"><img src="${fotos[2]}" class="img-cover" style="cursor:pointer;" onclick="abrirGaleria(${jsonFotos}, 2)">${overlayHtml}</div>
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
// 8. FUNÇÕES GERAIS (CARREGAMENTO, AUTH, ETC) - MANTIDAS
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
    const estaLogado = localStorage.getItem('usuarioLogado') === 'true';
    if (paginasRestritas.includes(paginaAtual) && !estaLogado) { window.location.href = "login.html"; }
}

window.verificarEstadoLogin = function() {
    // 1. Pega os dados com segurança
    const logado = localStorage.getItem('usuarioLogado') === 'true';
    let perfil = {};
    
    try {
        perfil = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
    } catch (e) {
        console.log("Erro ao ler perfil", e);
        perfil = {};
    }

    // Define foto padrão se não tiver
    const fotoUsuario = perfil.foto || 'https://i.pravatar.cc/150?img=12'; 
    const eProfissional = perfil.isProfissional === true;

    // --- A. CONTROLE DOS STORIES ---
const containers = document.querySelectorAll('.botoes-direita');
    
    containers.forEach(container => {
        if (logado) {
            const linkAnunciar = eProfissional ? "anunciar.html" : "tornar-profissional.html";
            const textoAnunciar = eProfissional ? "Anunciar" : "Seja Profissional";

            container.innerHTML = `
                <div class="profile-container">
                    <img src="${fotoUsuario}" class="profile-img-btn" onclick="toggleDropdown(event)" alt="Perfil" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; cursor: pointer; border: 2px solid #ddd;">
                    <div id="dropdownPerfil" class="dropdown-profile">
                        <div style="padding: 10px 15px; border-bottom: 1px solid #eee; font-weight: bold; color: var(--cor2);">
                            ${perfil.user || 'Usuário'}
                        </div>
                        <a href="meuperfil.html" class="dropdown-item"><i class='bx bx-user-circle'></i> Ver Perfil</a>
                        <a href="#" onclick="alternarConta()" class="dropdown-item"><i class='bx bx-user-pin'></i> Alternar Conta</a>
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

window.fazerLogout = async function() {
    if(confirm("Sair da conta?")) {
        try {
            // 1. Faz o logout no Firebase
            await window.auth.signOut(); 
            
            // 2. Limpa os dados do navegador
            localStorage.removeItem('usuarioLogado');
            localStorage.removeItem('doke_usuario_perfil');
            localStorage.removeItem('doke_uid');
            
            // 3. Redireciona para a home
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Erro ao sair:", error);
            alert("Erro ao encerrar sessão. Tente novamente.");
        }
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

// Funções extras para perfil
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

    // 8. AUTENTICAÇÃO PERSISTENTE E NOTIFICAÇÕES
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const docRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                localStorage.setItem('doke_usuario_perfil', JSON.stringify(docSnap.data()));
                localStorage.setItem('usuarioLogado', 'true');
            }
            
            // Ativa notificações de pedidos novos
            verificarNotificacoes(user.uid);

            if(window.location.pathname.includes('perfil')) {
                carregarPerfil();
                carregarPosts(user.uid);
            }
            if(window.location.pathname.includes('chat')) {
                carregarMeusPedidos();
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
window.voltarParaPedidos = function() {
    document.getElementById('view-chat').style.display = 'none';
    document.getElementById('view-lista').style.display = 'block';
    
    // Restaura menus no mobile
    const bottomNav = document.querySelector('.bottom-nav');
    const navbarMobile = document.querySelector('.navbar-mobile');
    if(bottomNav) bottomNav.style.display = 'flex';
    if(navbarMobile) navbarMobile.style.display = 'flex';

    if(chatUnsubscribe) chatUnsubscribe();
    chatAtualId = null;
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