// ============================================================
// 1. IMPORTAÇÕES E CONFIGURAÇÃO
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getFirestore, collection, getDocs, addDoc, setDoc, getDoc, query, where, orderBy, doc, updateDoc, increment, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

// Garante acesso global
window.db = db;
window.auth = auth;
window.collection = collection;
window.query = query;
window.getDocs = getDocs;

// ============================================================
// 2. FUNÇÃO DE PUBLICAR ANÚNCIO
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

        const cep = document.getElementById('cep').value || "Local não informado";
        const telefone = document.getElementById('telefone').value || "";

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
        
        // Garante o @usuario
        let userHandle = perfilLocal.user;
        if (!userHandle) {
            userHandle = "@" + nomeAutor.split(' ')[0].toLowerCase();
        }
        if(!userHandle.startsWith('@')) userHandle = '@' + userHandle;

        const novoAnuncio = {
            titulo: titulo,
            descricao: descricao,
            categoria: categoriaFinal,
            categorias: categoriasString,
            preco: precoFinal,
            cep: cep,
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
// 3. FUNÇÃO DE CARREGAMENTO DE ANÚNCIOS (FEED)
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
            
            // --- CORREÇÃO NOME (@USUARIO) ---
            let nomeParaExibir = anuncio.userHandle || "@usuario"; 
            if(!nomeParaExibir.startsWith('@')) nomeParaExibir = '@' + nomeParaExibir;

            // --- CORREÇÃO ESTRELAS (Se for 0, mostra "Novo") ---
            const nota = anuncio.mediaAvaliacao || 0;
            const qtdAvaliacoes = anuncio.numAvaliacoes || 0;
            
            let htmlAvaliacaoDisplay = '';
            if (qtdAvaliacoes === 0) {
                htmlAvaliacaoDisplay = `<span style="background:#e0f2f1; color:#00695c; padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700;">Novo</span>`;
            } else {
                let estrelasIcones = '';
                for (let i = 1; i <= 5; i++) {
                    if (i <= nota) estrelasIcones += "<i class='bx bxs-star'></i>";
                    else if (i - 0.5 <= nota) estrelasIcones += "<i class='bx bxs-star-half'></i>";
                    else estrelasIcones += "<i class='bx bx-star'></i>";
                }
                htmlAvaliacaoDisplay = `<div class="cp-stars-dynamic" style="color:#f1c40f;">${estrelasIcones} <span style="color:#999; font-size:0.75rem;">(${qtdAvaliacoes})</span></div>`;
            }

            let textoStatus = "Online";
            let classeStatus = "online";

            // Grade de Fotos
            let fotos = anuncio.fotos && anuncio.fotos.length > 0 ? anuncio.fotos : [anuncio.img || "https://placehold.co/600x400"];
            let htmlFotos = '';
            let contadorExtra = fotos.length - 3;

            if (fotos.length === 1) {
                htmlFotos = `<div class="grid-fotos-doke" style="grid-template-columns: 1fr;"><div class="foto-main" style="grid-column: 1; grid-row: 1/3;"><img src="${fotos[0]}" class="img-cover"></div></div>`;
            } else if (fotos.length === 2) {
                htmlFotos = `<div class="grid-fotos-doke"><div class="foto-main"><img src="${fotos[0]}" class="img-cover"></div><div class="foto-sub full-height"><img src="${fotos[1]}" class="img-cover"></div></div>`;
            } else {
                let overlayHtml = (fotos.length > 3) ? `<div class="overlay-count">+${contadorExtra}</div>` : '';
                htmlFotos = `<div class="grid-fotos-doke"><div class="foto-main"><img src="${fotos[0]}" class="img-cover"></div><div class="foto-sub"><img src="${fotos[1]}" class="img-cover"></div><div class="foto-sub"><img src="${fotos[2]}" class="img-cover">${overlayHtml}</div></div>`;
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
                                <div class="status-dot ${classeStatus}"></div> ${textoStatus}
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
// 4. CARREGAR CATEGORIAS (COM BACKUP SE VAZIO)
// ============================================================
window.carregarCategorias = async function() {
    const container = document.getElementById('listaCategorias');
    if (!container) return;

    try {
        const q = query(collection(window.db, "categorias"));
        const querySnapshot = await getDocs(q);
        
        let listaCategorias = [];

        // 1. Tenta pegar do banco
        if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
                listaCategorias.push(doc.data());
            });
        } 
        // 2. Se banco vazio, usa lista padrão (Isso resolve a tela branca)
        else {
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
// 5. PROFISSIONAIS EM DESTAQUE (CORRIGIDO: @USUARIO e NOVO)
// ============================================================
window.carregarProfissionais = async function() {
    const container = document.getElementById('listaProfissionais');
    if (!container) return;

    container.innerHTML = "";

    // Verifica login
    const perfilSalvo = localStorage.getItem('doke_usuario_perfil');
    
    if (perfilSalvo) {
        const p = JSON.parse(perfilSalvo);
        const foto = p.foto || "https://i.pravatar.cc/150";
        
        // CORREÇÃO: Usa o userHandle real do cadastro
        let userHandle = p.user;
        if(!userHandle) {
            userHandle = "@" + (p.nome ? p.nome.split(' ')[0].toLowerCase() : "usuario");
        }
        if(!userHandle.startsWith('@')) userHandle = '@' + userHandle;

        const job = p.bio ? (p.bio.length > 25 ? p.bio.substring(0, 25) + "..." : p.bio) : "Membro Doke";

        // CORREÇÃO: Remove o "5.0" se for novo
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
                <button class="btn-pro-action" onclick="window.location.href='meuperfil.html'">Ver Meu Perfil</button>
            </div>
        `;
        container.innerHTML = html;
    } else {
        container.innerHTML = `
            <div style="padding: 20px; color: #888; white-space: nowrap;">
                <a href="login.html" style="color:var(--cor0); font-weight:bold;">Faça login</a> para ver seu destaque.
            </div>
        `;
    }
}

// ============================================================
// 6. FUNÇÕES DE HEADER E PROTEÇÃO
// ============================================================

function protegerPaginasRestritas() {
    const paginasRestritas = ['meuperfil.html', 'chat.html', 'comunidade.html', 'notificacoes.html', 'mais.html'];
    const caminhoAtual = window.location.pathname;
    const paginaAtual = caminhoAtual.substring(caminhoAtual.lastIndexOf('/') + 1);
    const estaLogado = localStorage.getItem('usuarioLogado') === 'true';

    if (paginasRestritas.includes(paginaAtual) && !estaLogado) {
        window.location.href = "login.html";
    }
}

window.verificarEstadoLogin = function() {
    const logado = localStorage.getItem('usuarioLogado') === 'true';
    const perfilSalvo = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
    const fotoUsuario = perfilSalvo.foto || 'https://i.pravatar.cc/150?img=12'; 

    const container = document.querySelector('.botoes-direita');
    if (container) {
        if (logado) {
            container.innerHTML = `
                <div class="profile-container">
                    <img src="${fotoUsuario}" class="profile-img-btn" onclick="toggleDropdown()" alt="Perfil">
                    <div id="dropdownPerfil" class="dropdown-profile">
                        <a href="#" onclick="irParaMeuPerfil(event)" class="dropdown-item"><i class='bx bx-user'></i> Ver Perfil</a>
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

window.toggleDropdown = function() {
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
    
    if (!perfilLocal) {
        window.location.href = "login.html";
        return;
    }
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

// ============================================================
// 7. UTILITÁRIOS GLOBAIS
// ============================================================
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

window.toggleCep = function(e) {
    if(e) e.preventDefault(); 
    const p = document.getElementById('boxCep');
    const i = document.getElementById('inputCep');
    if (p.style.display === 'block') { p.style.display = 'none'; } else { p.style.display = 'block'; if(i) i.focus(); }
}
window.salvarCep = function() {
    const i = document.getElementById('inputCep');
    if(!i) return;
    if(i.value.length >= 9) {
        localStorage.setItem('meu_cep_doke', i.value); 
        window.atualizarTelaCep(i.value);
        document.getElementById('boxCep').style.display = 'none';
    } else { alert("CEP incompleto!"); }
}
window.atualizarTelaCep = function(cep) {
    const s = document.getElementById('textoCepSpan');
    const i = document.getElementById('inputCep');
    if (s) { s.innerText = "Alterar CEP"; s.style.fontWeight = "600"; s.style.color = "var(--cor0)"; }
    if (i) i.value = cep;
}

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
            if(inp) {
                inp.value = t; 
                salvarBusca(t);
                window.location.href = `busca.html?q=${encodeURIComponent(t)}`;
            }
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
// 8. FUNÇÕES DE LOGIN (AUXILIARES)
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
// 9. INICIALIZAÇÃO
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    
    // 1. Proteção e Header
    protegerPaginasRestritas();
    verificarEstadoLogin();
    
    // 2. CARREGAMENTOS DINÂMICOS (Categorias + Destaque)
    carregarCategorias(); // AGORA TEM FALLBACK SE VAZIO
    carregarProfissionais(); // MOSTRA DADOS REAIS (@usuario e Novo)

    // 3. Lógica de Busca e Anúncios
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

    // 4. Efeitos de Busca (Histórico)
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

    // 5. Cookies e Popups
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

    const cepSalvo = localStorage.getItem('meu_cep_doke');
    if (cepSalvo) window.atualizarTelaCep(cepSalvo);

    // 6. Efeito Typewriter
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