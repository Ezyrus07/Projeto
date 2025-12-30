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

// Garante acesso global (para console ou scripts inline)
window.db = db;
window.auth = auth;
window.collection = collection;
window.query = query;
window.getDocs = getDocs;
window.orderBy = orderBy; // <--- ADICIONE ISSO (Obrigatório para o feed)
window.where = where;     // <--- ADICIONE ISSO (Bom para garantir filtros futuros)

// ============================================================
// 2. FUNÇÃO DE PUBLICAR ANÚNCIO (FINAL: LÊ CAMPOS DA TELA)
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

        // PEGA OS DADOS DOS CAMPOS VISUAIS (Se existirem)
        // Se o usuário não preencheu e os campos não existem, usa padrão
        const cidadeInput = document.getElementById('cidade');
        const ufInput = document.getElementById('uf');
        const bairroInput = document.getElementById('bairro');

        let cidadeFinal = cidadeInput ? cidadeInput.value : "Indefinido";
        let ufFinal = ufInput ? ufInput.value : "BR";
        let bairroFinal = bairroInput ? bairroInput.value : "Geral";

        // Se os campos estiverem vazios (caso o usuário não tenha clicado fora do CEP), tenta buscar agora
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
            
            // SALVA OS DADOS CORRETOS PARA O FILTRO
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
            
            // --- NOME (@USUARIO) ---
            let nomeParaExibir = anuncio.userHandle || "@usuario"; 
            if(!nomeParaExibir.startsWith('@')) nomeParaExibir = '@' + nomeParaExibir;

            // --- ESTRELAS (Se for 0, mostra "Novo") ---
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
        // 2. Se banco vazio, usa lista padrão (Isso resolve o problema da tela branca)
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

        // CORREÇÃO: Remove o "5.0" se for novo e usa dados reais
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
// 7. UTILITÁRIOS GLOBAIS (CEP CORRIGIDO)
// ============================================================

// Formata o CEP enquanto digita (12345-678)
function formatarCepInput(e) {
    let valor = e.target.value.replace(/\D/g, ""); 
    if (valor.length > 5) {
        valor = valor.substring(0, 5) + "-" + valor.substring(5, 8);
    }
    e.target.value = valor;
}

// Salva o CEP aceitando 8 dígitos sem traço ou 9 com traço
window.salvarCep = function() {
    const i = document.getElementById('inputCep');
    if(!i) return;
    
    // Remove traço para validar
    const cepLimpo = i.value.replace(/\D/g, ''); 

    if(cepLimpo.length === 8) {
        const cepFormatado = cepLimpo.substring(0, 5) + "-" + cepLimpo.substring(5, 8);
        localStorage.setItem('meu_cep_doke', cepFormatado); 
        window.atualizarTelaCep(cepFormatado);
        document.getElementById('boxCep').style.display = 'none';
    } else { 
        alert("CEP inválido! Digite 8 números."); 
        i.focus();
    }
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
// 9. FUNÇÃO PARA CARREGAR FILTROS DE LOCALIZAÇÃO (NOVO)
// ============================================================
window.carregarFiltrosLocalizacao = async function() {
    const selEstado = document.getElementById('selectEstado');
    const selCidade = document.getElementById('selectCidade');
    const selBairro = document.getElementById('selectBairro');

    if (!selEstado || !selCidade || !selBairro) return;

    try {
        // Busca todos os anúncios para saber onde tem serviço
        const q = query(collection(window.db, "anuncios"));
        const snapshot = await getDocs(q);
        
        const locaisMap = {}; // { SP: { Santos: [Gonzaga], ... } }

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

    } catch (e) {
        console.error("Erro ao carregar filtros de local:", e);
    }
}

window.filtrarAnunciosPorLocal = function(uf, cidade, bairro) {
    console.log("Filtrando por:", uf, cidade, bairro);
    // Aqui você pode implementar a lógica de recarregar o feed com os filtros
}

// ============================================================
// 10. INICIALIZAÇÃO
// ============================================================
document.addEventListener("DOMContentLoaded", function() {

    
    
    // 1. Proteção e Header
    protegerPaginasRestritas();
    verificarEstadoLogin();
    
    // 2. CARREGAMENTOS DINÂMICOS (Categorias + Destaque)
    carregarCategorias(); // AGORA TEM FALLBACK SE VAZIO
    carregarProfissionais(); // MOSTRA DADOS REAIS (@usuario e Novo)
    carregarFiltrosLocalizacao(); // Filtros de Local

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

// ============================================================
// 11. FEED GLOBAL (Para Index.html)
// ============================================================
window.carregarFeedGlobal = async function() {
    const container = document.getElementById('feed-global-container');
    if (!container) return;

    // Loading state
    container.innerHTML = `
        <div style="text-align:center; padding:40px; color:#777;">
            <i class='bx bx-loader-alt bx-spin' style="font-size:2rem;"></i>
            <p>Carregando atualizações da comunidade...</p>
        </div>`;

    try {
        // Busca os últimos 20 posts de todos os usuários
        const q = window.query(
            window.collection(window.db, "posts"), 
            window.orderBy("data", "desc"), 
            // window.limit(20) // Opcional: limitar a 20 posts
        );

        const snapshot = await window.getDocs(q);

        container.innerHTML = ""; // Limpa loading

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
            
            // Verifica se tem imagem
            const imgHtml = post.imagem 
                ? `<div class="feed-img-wrapper"><img src="${post.imagem}" loading="lazy"></div>` 
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

// Adicione esta chamada no DOMContentLoaded existente no final do script.js:
// document.addEventListener("DOMContentLoaded", function() {
//    ... código existente ...
//    carregarFeedGlobal(); // <--- ADICIONE ISSO
// });

// ============================================================
// 12. FEED GLOBAL (Para Index.html)
// ============================================================
window.carregarFeedGlobal = async function() {
    const container = document.getElementById('feed-global-container');
    if (!container) return; // Se não estiver na home, não faz nada

    // Limpa e mostra carregando
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#999;"><i class='bx bx-loader-alt bx-spin'></i> Carregando feed...</div>`;

    try {
        // Busca TODOS os posts, ordenados por data (mais recentes primeiro)
        // Nota: Removi o "where uid" para mostrar posts de todos
        const q = window.query(
            window.collection(window.db, "posts"), 
            window.orderBy("data", "desc")
        );

        const snapshot = await window.getDocs(q);

        container.innerHTML = ""; // Limpa o loading

        if (snapshot.empty) {
            container.innerHTML = `<div style="text-align:center; padding:20px;">Nenhuma publicação na comunidade ainda.</div>`;
            return;
        }

        snapshot.forEach((doc) => {
            const post = doc.data();
            const dataPost = new Date(post.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
            
            // Lógica da Imagem (Usa a mesma classe midia-post do perfil)
            const imgHtml = post.imagem 
                ? `<div class="midia-post"><img src="${post.imagem}"></div>` 
                : '';

            const html = `
                <div class="card-feed-global">
                    <div class="header-post" style="padding:15px; display:flex; align-items:center; gap:10px;">
                        <img src="${post.autorFoto || 'https://placehold.co/50'}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                        <div>
                            <h4 style="margin:0; font-size:0.95rem; color:#333;">${post.autorUser || post.autorNome}</h4>
                            <span style="font-size:0.75rem; color:#888;">${dataPost}</span>
                        </div>
                    </div>
                    
                    <p style="padding:0 15px 15px 15px; margin:0; color:#444;">${post.texto}</p>
                    
                    ${imgHtml}

                    <div style="padding:10px 15px; border-top:1px solid #eee; display:flex; gap:20px; color:#666;">
                        <span><i class='bx bx-heart'></i> ${post.likes || 0}</span>
                        <span><i class='bx bx-comment'></i> Comentar</span>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });

    } catch (e) {
        console.error("Erro feed global:", e);
        container.innerHTML = `<p style="text-align:center;">Erro ao carregar feed.</p>`;
    }
}