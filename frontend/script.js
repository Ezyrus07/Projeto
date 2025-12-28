// ============================================================
// 1. IMPORTAÇÕES E CONFIGURAÇÃO (ATUALIZADO COM 'addDoc')
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Sua configuração do Firebase (Já está certa, mantenha a sua)
const firebaseConfig = {
    apiKey: "AIzaSyCfyLqi-qddMoRFrV0M0dvAO2e_RaV5R-M",
    authDomain: "doke-90cef.firebaseapp.com",
    projectId: "doke-90cef",
    storageBucket: "doke-90cef.firebasestorage.app",
    messagingSenderId: "920439079686",
    appId: "1:920439079686:web:d5fcf009e46eb2e203d487"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
window.db = db;

// ============================================================
// 2. FUNÇÃO DE CARREGAMENTO (FIREBASE -> FEED)
// ============================================================
async function carregarAnunciosDoFirebase() {
    const feed = document.getElementById('feedAnuncios');
    if (!feed) return;

    feed.innerHTML = `
        <div style="padding:40px; text-align:center; color:#777;">
            <i class='bx bx-loader-alt bx-spin' style="font-size: 2rem;"></i>
            <p>Carregando anúncios...</p>
        </div>
    `;

    try {
        const q = query(collection(db, "anuncios"));
        const querySnapshot = await getDocs(q);
        
        feed.innerHTML = "";

        if (querySnapshot.empty) {
            feed.innerHTML = `
                <div style="padding:40px; text-align:center; color:#777;">
                    <i class='bx bx-ghost' style="font-size: 2rem;"></i>
                    <p>Nenhum anúncio encontrado.</p>
                </div>
            `;
            return;
        }

        querySnapshot.forEach((doc) => {
            const anuncio = doc.data();
            
            // Dados com fallback
            const titulo = anuncio.titulo || "Sem título";
            const preco = anuncio.preco || anuncio.valor || "A combinar";
            const descricao = anuncio.descricao || "Sem descrição.";
            const categoria = anuncio.categoria || "Geral";
            
            // Imagem (Pega do array fotos ou do campo img)
            let imagemCapa = "https://placehold.co/600x400?text=Sem+Foto";
            if(anuncio.fotos && anuncio.fotos.length > 0) imagemCapa = anuncio.fotos[0];
            else if(anuncio.img) imagemCapa = anuncio.img;

            // Dados do Autor
            const nomeAutor = anuncio.nomeAutor || "Anunciante Doke";
            const fotoAutor = anuncio.fotoAutor || "https://i.pravatar.cc/150";
            const userHandle = anuncio.userHandle || "@profissional";

            // HTML do Card
            const card = document.createElement('div');
            card.className = 'card-premium';
            card.innerHTML = `
                <div class="cp-header">
                    <div class="cp-perfil">
                        <img src="${fotoAutor}" class="cp-avatar" alt="Foto">
                        <div>
                            <h4 class="cp-nome">${nomeAutor} <i class='bx bxs-badge-check' style="color:#0095f6;"></i></h4>
                            <span class="cp-user">${userHandle}</span>
                            <div class="cp-badges">
                                <span class="cp-stars">★★★★★</span>
                            </div>
                        </div>
                    </div>
                    <i class='bx bx-dots-horizontal-rounded' style="font-size:1.5rem; color:#ccc; cursor:pointer;"></i>
                </div>

                <div class="cp-body">
                    <h3 class="cp-titulo">${titulo}</h3>
                    <p class="cp-desc">${descricao}</p>
                </div>

                <div class="cp-mid-actions">
                    <div class="cp-mid-left">
                        <a href="perfil-publico.html"><button class="btn-mid-chamativo">Ver Perfil</button></a>
                        <a href="avaliacoes.html"><button class="btn-mid-chamativo">Avaliação</button></a>
                    </div>
                    <div class="cp-mid-right">
                        <i class='bx bx-heart icon-action-card'></i>
                        <i class='bx bx-share-alt icon-action-card'></i>
                    </div>
                </div>

                <div class="cp-media-grid" style="height:300px;" onclick="abrirGaleria()">
                     <div class="cp-item-main" style="grid-column: span 2;">
                        <img src="${imagemCapa}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">
                     </div>
                </div>
                
                <div class="cp-footer-right">
                    <strong style="margin-right:auto; color:var(--cor0); font-size:1.1rem;">${preco}</strong>
                    <a href="orcamento.html">
                        <button class="btn-orcamento-chamativo">Solicitar Orçamento</button>
                    </a>
                </div>
            `;
            feed.appendChild(card);
        });

    } catch (erro) {
        console.error("Erro Firebase:", erro);
        feed.innerHTML = `<p style="color:red; text-align:center;">Erro: ${erro.message}</p>`;
    }
}

// ============================================================
// 3. INICIALIZAÇÃO GERAL (QUANDO A PÁGINA CARREGA)
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    
    // --- A. Carregar Anúncios ---
    carregarAnunciosDoFirebase();

    // --- B. Verificar Login (Header) ---
    verificarEstadoLogin();

    // --- C. Carregar CEP Salvo ---
    const cepSalvo = localStorage.getItem('meu_cep_doke');
    if (cepSalvo) window.atualizarTelaCep(cepSalvo);

    // --- D. Popup Diário ---
    var dataHoje = new Date().toDateString();
    if (localStorage.getItem("popupVistoData") !== dataHoje) {
        window.abrirPopup();
        localStorage.setItem("popupVistoData", dataHoje);
    }

    // --- E. BANNER DE COOKIES (CORRIGIDO) ---
    const banner = document.getElementById('cookieBanner');
    const btnCookie = document.getElementById('acceptBtn');

    // 1. Verifica se já aceitou
    if (localStorage.getItem('cookiesAceitos') === 'true') {
        if(banner) banner.style.display = 'none'; // Some imediatamente
    } else {
        if(banner) {
            banner.style.display = 'flex'; // Garante que apareça se não aceitou
            banner.style.opacity = '1';
        }
    }

    // 2. Adiciona o evento de clique
    if (btnCookie && banner) {
        btnCookie.addEventListener('click', function() {
            banner.style.opacity = '0'; // Efeito visual
            setTimeout(() => {
                banner.style.display = 'none'; // Remove da tela
            }, 500);
            localStorage.setItem('cookiesAceitos', 'true'); // Salva a escolha
        });
    }

    // --- F. Efeito Typewriter ---
    const elementoTexto = document.getElementById('typewriter');
    if (elementoTexto) {
        const frases = ["Chefes de cozinha próximos", "Eletricistas na pituba", "Aulas de Inglês Online", "Manutenção de Ar condicionado"];
        let fraseIndex = 0, charIndex = 0, isDeleting = false;

        function typeEffect() {
            const currentPhrase = frases[fraseIndex];
            if (isDeleting) {
                elementoTexto.textContent = currentPhrase.substring(0, charIndex - 1);
                charIndex--;
            } else {
                elementoTexto.textContent = currentPhrase.substring(0, charIndex + 1);
                charIndex++;
            }
            let typeSpeed = isDeleting ? 50 : 100;
            if (!isDeleting && charIndex === currentPhrase.length) {
                typeSpeed = 2000; isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false; fraseIndex = (fraseIndex + 1) % frases.length; typeSpeed = 500;
            }
            setTimeout(typeEffect, typeSpeed);
        }
        typeEffect();
    }

    // --- G. Busca Inteligente ---
    const wrapper = document.getElementById('buscaWrapper');
    const inputBusca = document.getElementById('inputBusca');
    
    if(inputBusca && wrapper) {
        atualizarListaHistorico();
        inputBusca.addEventListener('focus', () => wrapper.classList.add('active'));
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) wrapper.classList.remove('active');
        });
        inputBusca.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const termo = inputBusca.value.trim();
                if (termo) {
                    salvarBusca(termo);
                    wrapper.classList.remove('active');
                    alert("Buscando por: " + termo);
                }
            }
        });
    }
});

// ============================================================
// 4. FUNÇÕES GLOBAIS (INTERAÇÃO NO HTML)
// ============================================================

/* --- POPUP LOGIN --- */
window.abrirPopup = function() {
    const popup = document.getElementById("popup");
    if(popup) popup.style.display = "block";
}

window.fecharPopup = function() {
    const popup = document.getElementById("popup");
    if(popup) popup.style.display = "none";
}

/* --- CEP --- */
window.toggleCep = function(event) {
    if(event) event.preventDefault(); 
    const popup = document.getElementById('boxCep');
    const input = document.getElementById('inputCep');
    if (popup.style.display === 'block') {
        popup.style.display = 'none';
    } else {
        popup.style.display = 'block';
        if(input) input.focus();
    }
}

window.salvarCep = function() {
    const input = document.getElementById('inputCep');
    if(!input) return;
    const val = input.value;
    if(val.length >= 9) {
        localStorage.setItem('meu_cep_doke', val); 
        window.atualizarTelaCep(val);
        document.getElementById('boxCep').style.display = 'none';
    } else {
        alert("CEP incompleto!");
    }
}

window.atualizarTelaCep = function(cep) {
    const span = document.getElementById('textoCepSpan');
    const input = document.getElementById('inputCep');
    if (span) {
        span.innerText = "Alterar CEP";
        span.style.fontWeight = "600";
        span.style.color = "var(--cor0)";
    }
    if (input) input.value = cep;
}

/* --- MENU MOBILE --- */
window.abrirMenuMobile = function() {
    const menu = document.querySelector('.sidebar-icones');
    const overlay = document.getElementById('overlay-menu');
    if (menu) menu.classList.add('menu-aberto');
    if (overlay) overlay.style.display = 'block';
    document.body.classList.add('menu-ativo');
}

window.fecharMenuMobile = function() {
    const menu = document.querySelector('.sidebar-icones');
    const overlay = document.getElementById('overlay-menu');
    if (menu) menu.classList.remove('menu-aberto');
    if (overlay) overlay.style.display = 'none';
    document.body.classList.remove('menu-ativo');
}

/* --- PERFIL E LOGIN --- */
window.toggleProfileMenu = function(event) {
    if(event) event.stopPropagation();
    const menu = document.getElementById("dropdownPerfil");
    if(menu) menu.classList.toggle("show");
}

window.mudarConta = function() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = "login.html";
}

window.fazerLogout = function() {
    if(confirm("Sair da conta?")) {
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'index.html';
    }
}

window.realizarLogin = function(event) {
    if(event) event.preventDefault(); 
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    if(email && senha) {
        localStorage.setItem('usuarioLogado', 'true');
        if (!localStorage.getItem('doke_usuario_perfil')) {
            localStorage.setItem('doke_usuario_perfil', JSON.stringify({
                nome: email.split('@')[0],
                foto: 'https://i.pravatar.cc/150?img=11'
            }));
        }
        alert("Login realizado!");
        window.location.href = "index.html"; 
    } else {
        alert("Preencha tudo!");
    }
}

window.realizarCadastro = function(event) {
    if(event) event.preventDefault();
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    if(nome && email) {
        localStorage.setItem('usuarioLogado', 'true');
        localStorage.setItem('doke_usuario_perfil', JSON.stringify({
            nome: nome, bio: "Novo usuário", local: "Não informado", foto: "https://i.pravatar.cc/150?img=11"
        }));
        alert("Conta criada!");
        window.location.href = "index.html";
    }
}

/* --- FILTROS E UTILITÁRIOS --- */
window.toggleFiltrosExtras = function() {
    const area = document.getElementById("filtrosExtras");
    const btn = document.querySelector(".btn-toggle-filtros");
    if (area.classList.contains("aberto")) {
        area.classList.remove("aberto");
        btn.style.background = "transparent";
        btn.style.color = "var(--cor0)";
    } else {
        area.classList.add("aberto");
        btn.style.background = "var(--cor0)";
        btn.style.color = "white";
    }
}

window.ativarChip = function(elemento) {
    const parent = elemento.parentElement;
    parent.querySelectorAll('.chip-tag').forEach(c => c.classList.remove('ativo'));
    elemento.classList.add('ativo');
}

window.abrirGaleria = function() {
    alert("Galeria em desenvolvimento!");
}

window.limparHistorico = function(e) {
    if(e) e.stopPropagation();
    localStorage.removeItem('doke_historico_busca');
    atualizarListaHistorico();
};

/* --- FUNÇÕES AUXILIARES --- */
function verificarEstadoLogin() {
    const logado = localStorage.getItem('usuarioLogado') === 'true';
    const containerBotoes = document.querySelector('.botoes-direita');
    const areaStories = document.getElementById('secaoStories'); 

    if (logado) {
        if (containerBotoes) {
            containerBotoes.innerHTML = '';
            const perfil = JSON.parse(localStorage.getItem('doke_usuario_perfil')) || {};
            const foto = perfil.foto || 'https://i.pravatar.cc/150?img=11';
            const div = document.createElement('div');
            div.style.position = 'relative'; div.style.display = 'inline-block';
            div.innerHTML = `
                <img src="${foto}" class="profile-img-btn" onclick="toggleProfileMenu(event)"
                     style="width:42px; height:42px; border-radius:50%; border:2px solid #eee; object-fit:cover; cursor:pointer;">
                <div id="dropdownPerfil" class="dropdown-profile">
                    <a href="meuperfil.html" class="dropdown-item"><i class='bx bx-user'></i> Ver Perfil</a>
                    <a href="#" onclick="mudarConta()" class="dropdown-item"><i class='bx bx-refresh'></i> Mudar Conta</a>
                    <a href="#" onclick="fazerLogout()" class="dropdown-item sair"><i class='bx bx-log-out'></i> Sair</a>
                </div>`;
            containerBotoes.appendChild(div);
        }
        if (areaStories) areaStories.style.display = 'flex';
    } else {
        if (containerBotoes) containerBotoes.innerHTML = `<a href="login.html" class="entrar">Entrar</a>`;
        if (areaStories) areaStories.style.display = 'none';
    }
}

function salvarBusca(termo) {
    let historico = JSON.parse(localStorage.getItem('doke_historico_busca') || '[]');
    historico = historico.filter(item => item.toLowerCase() !== termo.toLowerCase());
    historico.unshift(termo);
    if (historico.length > 5) historico.pop();
    localStorage.setItem('doke_historico_busca', JSON.stringify(historico));
    atualizarListaHistorico();
}

function atualizarListaHistorico() {
    const listaRecentes = document.getElementById('listaRecentes');
    const container = document.getElementById('containerHistorico');
    if(!container || !listaRecentes) return;
    const historico = JSON.parse(localStorage.getItem('doke_historico_busca') || '[]');
    if (historico.length === 0) {
        container.style.display = 'none'; return;
    }
    container.style.display = 'block';
    listaRecentes.innerHTML = '';
    historico.forEach(termo => {
        const div = document.createElement('div');
        div.className = 'recent-item';
        div.innerHTML = `<span class="history-icon">↺</span> ${termo}`;
        div.onclick = () => {
            document.getElementById('inputBusca').value = termo;
            salvarBusca(termo);
        };
        listaRecentes.appendChild(div);
    });
}

// Fechar menus globais ao clicar fora
window.addEventListener('click', function(e) {
    const wrapperCep = document.querySelector('.cep-wrapper');
    const popupCep = document.getElementById('boxCep');
    if (popupCep && wrapperCep && !wrapperCep.contains(e.target)) popupCep.style.display = 'none';

    if (!e.target.matches('.profile-img-btn')) {
        const dropdowns = document.getElementsByClassName("dropdown-profile");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('show')) dropdowns[i].classList.remove('show');
        }
    }
});

// ============================================================
// FUNÇÃO: PUBLICAR ANÚNCIO (CORRIGIDA PARA O SEU HTML)
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
        // 1. PEGAR OS DADOS (Usando os IDs corretos do seu HTML)
        const titulo = document.getElementById('titulo').value;
        const descricao = document.getElementById('descricao').value;
        
        // Categoria: Pega do input oculto que o seu HTML preenche
        const categoriasString = document.getElementById('categorias-validacao').value; 
        const categoriaFinal = categoriasString ? categoriasString.split(',')[0] : "Geral"; // Pega a primeira ou Geral

        // Preço: Verifica se é fixo ou orçamento
        const tipoPreco = document.querySelector('input[name="tipo_preco"]:checked')?.value || "A combinar";
        let precoFinal = tipoPreco;
        
        // Se for "Preço Fixo", tenta pegar o valor digitado
        if (tipoPreco === 'Preço Fixo') {
            const valorInput = document.getElementById('valor').value;
            if (valorInput) precoFinal = valorInput;
        }

        // Localização
        const cep = document.getElementById('cep').value || "Local não informado";
        const telefone = document.getElementById('telefone').value || "";

        // Validação Simples
        if(!titulo || !descricao) {
            throw new Error("Preencha o título e a descrição para continuar.");
        }

        // 2. PEGAR AS FOTOS (Do array global ou do input)
        let fotos = [];
        if (window.fotosParaEnviar && window.fotosParaEnviar.length > 0) {
            fotos = window.fotosParaEnviar; // Usa sua galeria múltipla
        } else {
            // Fallback: Tenta pegar 1 foto se o usuário usou o input direto
            const inputGaleria = document.getElementById('upload-galeria');
            if(inputGaleria && inputGaleria.files.length > 0){
                // Se a galeria falhar, tenta pegar direto do input (opcional)
            }
        }
        
        // Se não tiver foto, coloca uma padrão
        if (fotos.length === 0) {
            fotos.push("https://placehold.co/600x400?text=Sem+Foto");
        }

        // 3. MONTAR O OBJETO PARA O FIREBASE
        const novoAnuncio = {
            titulo: titulo,
            descricao: descricao,
            categoria: categoriaFinal, // Agora vai certo!
            categorias: categoriasString, // Salva todas as tags também
            preco: precoFinal,
            cep: cep,
            whatsapp: telefone,
            fotos: fotos, // Array com todas as fotos
            img: fotos[0], // A primeira vira a capa
            dataCriacao: new Date().toISOString(),
            nomeAutor: "Você", // Futuramente pegaremos do login real
            userHandle: "@voce",
            fotoAutor: "https://i.pravatar.cc/150?img=12"
        };

        // 4. ENVIAR PARA O BANCO DE DADOS
        await addDoc(collection(db, "anuncios"), novoAnuncio);
        
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

// Função auxiliar (Mantenha se já tiver)
function lerArquivoComoBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}