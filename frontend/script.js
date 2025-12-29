// ============================================================
// 1. IMPORTAÇÕES E CONFIGURAÇÃO
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getFirestore, collection, getDocs, addDoc, query, orderBy, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDBubOcA2HkCcPSSIi5RWO-dcduW6MiuMk",
    authDomain: "doke-final.firebaseapp.com",
    projectId: "doke-final",
    storageBucket: "doke-final.firebasestorage.app",
    messagingSenderId: "940604379398",
    appId: "1:940604379398:web:b095bfa5193916aaad4e87",
    measurementId: "G-Z2QECM66Y6"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// GARANTE QUE O DB ESTEJA ACESSÍVEL GLOBALMENTE
window.db = db;

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
            userHandle: "@" + nomeAutor.split(' ')[0].toLowerCase(),
            views: 0,
            cliques: 0
        };

        // Usa window.db para garantir acesso
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
// 3. FUNÇÃO DE CARREGAMENTO (HOME)
// ============================================================
async function carregarAnunciosDoFirebase() {
    const feed = document.getElementById('feedAnuncios');
    if (!feed) return;

    feed.innerHTML = `<div style="padding:40px; text-align:center;"><i class='bx bx-loader-alt bx-spin' style="font-size:2rem;"></i><p>Carregando...</p></div>`;

    try {
        // --- CORREÇÃO AQUI: USANDO window.db ---
        const q = query(collection(window.db, "anuncios"));
        const querySnapshot = await getDocs(q);
        
        feed.innerHTML = "";

        if (querySnapshot.empty) {
            feed.innerHTML = `<div style="padding:40px; text-align:center;"><p>Nenhum anúncio encontrado.</p></div>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const anuncio = docSnap.data();
            const id = docSnap.id; // ID do documento para o clique

            const titulo = anuncio.titulo || "Sem título";
            const preco = anuncio.preco || anuncio.valor || "A combinar";
            const descricao = anuncio.descricao || "Sem descrição.";
            const imagemCapa = (anuncio.fotos && anuncio.fotos.length > 0) ? anuncio.fotos[0] : (anuncio.img || "https://placehold.co/600x400?text=Sem+Foto");
            const fotoAutor = anuncio.fotoAutor || "https://i.pravatar.cc/150";

            const card = document.createElement('div');
            card.className = 'card-premium';
            
            // Adiciona evento de clique para contar visualização
            card.onmousedown = function() {
                window.registrarVisualizacao(id);
            };

            card.innerHTML = `
                <div class="cp-header">
                    <div class="cp-perfil">
                        <img src="${fotoAutor}" class="cp-avatar">
                        <div>
                            <h4 class="cp-nome">${anuncio.nomeAutor || 'Anunciante'} <i class='bx bxs-badge-check' style="color:#0095f6;"></i></h4>
                            <div class="cp-badges"><span class="cp-stars">★★★★★</span></div>
                        </div>
                    </div>
                </div>
                <div class="cp-body">
                    <h3 class="cp-titulo">${titulo}</h3>
                    <p class="cp-desc">${descricao}</p>
                </div>
                <div class="cp-media-grid" style="height:300px;">
                     <div class="cp-item-main" style="grid-column: span 2;">
                        <img src="${imagemCapa}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">
                     </div>
                </div>
                <div class="cp-footer-right">
                    <strong style="margin-right:auto; color:var(--cor0); font-size:1.1rem;">${preco}</strong>
                    <a href="orcamento.html"><button class="btn-orcamento-chamativo">Orçamento</button></a>
                </div>
            `;
            feed.appendChild(card);
        });

    } catch (erro) {
        console.error("Erro Firebase:", erro);
        feed.innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar: ${erro.message}</p>`;
    }
}

// ============================================================
// 4. FUNÇÕES DE PROTEÇÃO E LOGIN
// ============================================================

// --- Função que protege páginas restritas ---
function protegerPaginasRestritas() {
    // Lista de páginas que só podem ser acessadas logado
    const paginasRestritas = [
        'meuperfil.html', 
        'chat.html', 
        'comunidade.html', 
        'notificacoes.html', 
        'mais.html'
    ];

    // Verifica o nome do arquivo atual na URL
    const caminhoAtual = window.location.pathname;
    const paginaAtual = caminhoAtual.substring(caminhoAtual.lastIndexOf('/') + 1);

    // Verifica se o usuário está logado
    const estaLogado = localStorage.getItem('usuarioLogado') === 'true';

    // Se a página atual está na lista E o usuário NÃO está logado
    if (paginasRestritas.includes(paginaAtual) && !estaLogado) {
        
        // 1. Esconde o conteúdo principal (<main>) para não mostrar dados
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.style.display = 'none';
        }

        // 2. Cria a tela de bloqueio
        const bloqueioDiv = document.createElement('div');
        bloqueioDiv.className = 'bloqueio-container';
        bloqueioDiv.innerHTML = `
            <div class="bloqueio-card">
                <div class="bloqueio-icon">
                    <i class='bx bx-lock-alt'></i>
                </div>
                <h2 class="bloqueio-titulo">Acesso Restrito</h2>
                <p class="bloqueio-texto">
                    Esta área é exclusiva para membros da comunidade Doke. 
                    Entre na sua conta ou cadastre-se gratuitamente para acessar.
                </p>
                <a href="login.html" class="btn-bloqueio-entrar">Entrar Agora</a>
                <a href="cadastro.html" class="btn-bloqueio-criar">Criar Conta</a>
            </div>
        `;

        // 3. Adiciona a tela de bloqueio APÓS o header
        const header = document.querySelector('.navbar-desktop') || document.querySelector('.navbar-mobile');
        if (header && header.nextSibling) {
            header.parentNode.insertBefore(bloqueioDiv, header.nextSibling);
        } else {
            document.body.appendChild(bloqueioDiv);
        }
    }
}

// --- Função que controla o Header (Foto ou Botão Entrar) ---
function verificarEstadoLogin() {
    const logado = localStorage.getItem('usuarioLogado') === 'true';
    
    // Seleciona o container dos botões à direita no header
    const container = document.querySelector('.botoes-direita');
    
    if(!container) return; // Se não achar o container, para.
    
    if (logado) {
        // --- MODO LOGADO: MOSTRA A FOTO ---
        const perfilSalvo = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
        const fotoUsuario = perfilSalvo.foto || 'https://i.pravatar.cc/150?img=12'; 

        container.innerHTML = `
            <div class="profile-container">
                <img src="${fotoUsuario}" class="profile-img-btn" onclick="toggleDropdown()" alt="Perfil">
                <div id="dropdownPerfil" class="dropdown-profile">
                    <a href="meuperfil.html" class="dropdown-item"><i class='bx bx-user'></i> Ver Perfil</a>
                    <a href="anunciar.html" class="dropdown-item"><i class='bx bx-plus-circle'></i> Anunciar</a>
                    <a href="#" onclick="fazerLogout()" class="dropdown-item item-sair"><i class='bx bx-log-out'></i> Sair</a>
                </div>
            </div>`;
    } else {
        // --- MODO DESLOGADO: MOSTRA O BOTÃO ENTRAR ---
        container.innerHTML = `<a href="login.html" class="entrar">Entrar</a>`;
    }
}

// Função auxiliar para abrir/fechar o menu da foto
window.toggleDropdown = function() {
    const drop = document.getElementById('dropdownPerfil');
    if(drop) drop.classList.toggle('show');
}

// ============================================================
// 5. INICIALIZAÇÃO (Roda ao carregar a página)
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    
    // 1. Verifica se pode acessar a página
    protegerPaginasRestritas();

    // 2. Ajusta o Header (Foto ou Entrar)
    verificarEstadoLogin();

    // 3. Carrega anúncios (se tiver na home)
    carregarAnunciosDoFirebase();
    
    // Outros scripts de UI
    const banner = document.getElementById('cookieBanner');
    const btnCookie = document.getElementById('acceptBtn');
    if (banner && btnCookie) {
        if (localStorage.getItem('cookiesAceitos') === 'true') {
            banner.style.display = 'none';
        } else {
            banner.style.display = 'flex';
            btnCookie.onclick = function() {
                banner.style.display = 'none';
                localStorage.setItem('cookiesAceitos', 'true');
            };
        }
    }

    // Popup Diário
    var dataHoje = new Date().toDateString();
    if (localStorage.getItem("popupVistoData") !== dataHoje) {
        window.abrirPopup();
        localStorage.setItem("popupVistoData", dataHoje);
    }

    // CEP
    const cepSalvo = localStorage.getItem('meu_cep_doke');
    if (cepSalvo) window.atualizarTelaCep(cepSalvo);

    // Typewriter
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
    
    // Busca
    const wrapper = document.getElementById('buscaWrapper');
    const inputBusca = document.getElementById('inputBusca');
    if(inputBusca && wrapper) {
        atualizarListaHistorico();
        inputBusca.addEventListener('focus', () => wrapper.classList.add('active'));
        document.addEventListener('click', (e) => { if (!wrapper.contains(e.target)) wrapper.classList.remove('active'); });
        inputBusca.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const termo = inputBusca.value.trim();
                if (termo) { salvarBusca(termo); wrapper.classList.remove('active'); alert("Buscando: " + termo); }
            }
        });
    }
});

// --- FUNÇÕES GLOBAIS DE UI ---

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

window.realizarLogin = function(e) {
    if(e) e.preventDefault();
    localStorage.setItem('usuarioLogado', 'true');
    window.location.href = "index.html";
}
window.fazerLogout = function() {
    if(confirm("Sair da conta?")) {
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'index.html';
    }
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
window.abrirGaleria = function() { alert("Galeria em breve!"); }

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
        d.onclick = () => { document.getElementById('inputBusca').value = t; salvarBusca(t); };
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

// --- FUNÇÃO PARA INCREMENTAR VISUALIZAÇÃO NO FIREBASE ---
window.registrarVisualizacao = async function(idAnuncio) {
    if(!idAnuncio) return;

    try {
        // Cria a referência ao documento específico do anúncio
        const anuncioRef = doc(db, "anuncios", idAnuncio);

        // Atualiza apenas o campo 'views' somando 1 Atomicamente
        await updateDoc(anuncioRef, {
            views: increment(1)
        });
        
        console.log("Visualização registrada (+1) para o anúncio: " + idAnuncio);
    } catch (error) {
        console.error("Erro ao registrar visualização:", error);
    }
}