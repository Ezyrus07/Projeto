/* ==================== POPUP DE LOGIN ==================== */
function abrirPopup() {
    const popup = document.getElementById("popup");
    if(popup) popup.style.display = "block";
}

function fecharPopup() {
    const popup = document.getElementById("popup");
    if(popup) popup.style.display = "none";
}

/* Executa ao carregar a página */
window.onload = function() {
    // 1. Popup de Login (uma vez por dia)
    var dataHoje = new Date().toDateString();
    var dataSalva = localStorage.getItem("popupVistoData");

    if (dataSalva !== dataHoje) {
        abrirPopup();
        localStorage.setItem("popupVistoData", dataHoje);
    }

    // 2. Carregar CEP salvo se existir (Fallback)
    const cepSalvo = localStorage.getItem('meu_cep_doke');
    if (cepSalvo) {
        atualizarTelaCep(cepSalvo);
    }
}

/* ==================== COOKIES & CEP & TYPEWRITER ==================== */
document.addEventListener("DOMContentLoaded", function() {
    
    // --- 1. BANNER DE COOKIES ---
    const banner = document.getElementById('cookieBanner');
    const btn = document.getElementById('acceptBtn');

    if (banner && btn) {
        if (localStorage.getItem('cookiesAceitos') === 'true') {
            banner.style.display = 'none';
        }

        btn.addEventListener('click', function() {
            banner.style.opacity = '0';
            setTimeout(() => {
                banner.style.display = 'none';
            }, 500);
            localStorage.setItem('cookiesAceitos', 'true');
        });
    }

    // --- 2. EFEITO DE DIGITAÇÃO (TYPEWRITER) ---
    const elementoTexto = document.getElementById('typewriter');
    
    if (elementoTexto) {
        const frases = [
            "Chefes de cozinha próximos",
            "Eletricistas na pituba",
            "Aulas de Inglês Online",
            "Manutenção de Ar condicionado",
            "Designers Freelancers"
        ];
        
        let fraseIndex = 0;
        let charIndex = 0;
        let isDeleting = false;

        function typeEffect() {
            const currentPhrase = frases[fraseIndex];
            
            if (isDeleting) {
                // Apagando
                elementoTexto.textContent = currentPhrase.substring(0, charIndex - 1);
                charIndex--;
            } else {
                // Escrevendo
                elementoTexto.textContent = currentPhrase.substring(0, charIndex + 1);
                charIndex++;
            }

            // Velocidade
            let typeSpeed = isDeleting ? 50 : 100;

            if (!isDeleting && charIndex === currentPhrase.length) {
                // Terminou de escrever: pausa longa
                typeSpeed = 2000;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                // Terminou de apagar: passa para a próxima frase
                isDeleting = false;
                fraseIndex = (fraseIndex + 1) % frases.length;
                typeSpeed = 500;
            }

            setTimeout(typeEffect, typeSpeed);
        }

        // Inicia o efeito
        typeEffect();
    }
});


/* ==================== FUNÇÕES DO CEP ==================== */

// Função auxiliar para atualizar visualmente (usada no onload e no salvar)
function atualizarTelaCep(cep) {
    const span = document.getElementById('textoCepSpan');
    const input = document.getElementById('inputCep');
    
    if (span) {
        span.innerText = "Alterar CEP";
        span.style.fontWeight = "600";
        span.style.color = "var(--cor0)";
    }
    
    if (input) {
        input.value = cep;
    }
}

// 1. Abre e fecha o popup
function toggleCep(event) {
    event.preventDefault(); 
    const popup = document.getElementById('boxCep');
    const input = document.getElementById('inputCep');
    
    if (popup.style.display === 'block') {
        popup.style.display = 'none';
    } else {
        popup.style.display = 'block';
        if(input) input.focus();
    }
}

// 2. Salva no Computador
function salvarCep() {
    const input = document.getElementById('inputCep');
    if(!input) return;

    const val = input.value;
    
    if(val.length >= 9) {
        localStorage.setItem('meu_cep_doke', val); 
        atualizarTelaCep(val);
        
        const popup = document.getElementById('boxCep');
        if(popup) popup.style.display = 'none';
    } else {
        alert("CEP incompleto!");
    }
}

// 3. Máscara (00000-000) e Fechar ao clicar fora
document.addEventListener("DOMContentLoaded", function() {
    const inputElement = document.getElementById('inputCep');
    
    if(inputElement) {
        inputElement.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 5) {
                value = value.substring(0, 5) + '-' + value.substring(5, 8);
            }
            e.target.value = value;
        });
    }

    window.addEventListener('click', function(e) {
        const wrapper = document.querySelector('.cep-wrapper');
        const popup = document.getElementById('boxCep');
        // Só fecha se o clique não for dentro do wrapper
        if (popup && wrapper && !wrapper.contains(e.target)) {
            popup.style.display = 'none';
        }
    });
});

/* ==================== SISTEMA DE BUSCA INTELIGENTE ==================== */

document.addEventListener("DOMContentLoaded", function() {
    const wrapper = document.getElementById('buscaWrapper');
    const input = document.getElementById('inputBusca');
    const listaRecentes = document.getElementById('listaRecentes');
    const containerHistorico = document.getElementById('containerHistorico');
    
    // Configuração
    const MAX_ITENS = 5; // Quantos itens salvar no histórico

    // 1. Carregar histórico ao iniciar
    atualizarListaHistorico();

    // 2. Evento: Focar no input (Abre o dropdown)
    input.addEventListener('focus', function() {
        wrapper.classList.add('active');
    });

    // 3. Evento: Clicar fora (Fecha o dropdown)
    document.addEventListener('click', function(e) {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('active');
        }
    });

    // 4. Evento: Tecla ENTER para salvar e buscar
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const termo = input.value.trim();
            if (termo) {
                salvarBusca(termo);
                wrapper.classList.remove('active'); // Fecha dropdown
                alert("Buscando por: " + termo); // AQUI VOCÊ COLOCA A LÓGICA DE IR PARA PÁGINA DE BUSCA
            }
        }
    });

    // --- FUNÇÕES ---

    // Salva o termo na memória do navegador
    function salvarBusca(termo) {
        // Pega o histórico atual (ou cria array vazio)
        let historico = JSON.parse(localStorage.getItem('doke_historico_busca') || '[]');

        // Remove o termo se já existir (para mover ele pro topo)
        historico = historico.filter(item => item.toLowerCase() !== termo.toLowerCase());

        // Adiciona no começo
        historico.unshift(termo);

        // Limita ao máximo de itens
        if (historico.length > MAX_ITENS) historico.pop();

        // Salva de volta
        localStorage.setItem('doke_historico_busca', JSON.stringify(historico));

        // Atualiza a tela
        atualizarListaHistorico();
    }

    // Lê a memória e desenha o HTML
    function atualizarListaHistorico() {
        const historico = JSON.parse(localStorage.getItem('doke_historico_busca') || '[]');
        
        // Se vazio, esconde a seção
        if (historico.length === 0) {
            containerHistorico.style.display = 'none';
            return;
        }

        containerHistorico.style.display = 'block';
        listaRecentes.innerHTML = ''; // Limpa lista atual

        // Cria os itens
        historico.forEach(termo => {
            const div = document.createElement('div');
            div.className = 'recent-item';
            div.innerHTML = `<span class="history-icon">↺</span> ${termo}`;
            
            // Ao clicar no item, joga o texto no input e busca
            div.onclick = function() {
                input.value = termo;
                salvarBusca(termo); // Renova ele no topo
                wrapper.classList.remove('active');
                // Lógica de busca aqui também, ex: window.location.href = ...
            };

            listaRecentes.appendChild(div);
        });
    }

    // Torna a função global para usar no onclick do HTML
    window.limparHistorico = function(e) {
        e.stopPropagation(); // Não fecha o dropdown
        localStorage.removeItem('doke_historico_busca');
        atualizarListaHistorico();
    };
});

/* ==================== LÓGICA NOVO CARD PREMIUM ==================== */

// 1. Alternar Filtros Avançados
function toggleFiltrosExtras() {
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

// 2. Ativar Chip de Filtro
function ativarChip(elemento) {
    // Remove ativo de todos os irmãos
    const parent = elemento.parentElement;
    const chips = parent.querySelectorAll('.chip-tag');
    chips.forEach(c => c.classList.remove('ativo'));
    
    // Ativa o clicado
    elemento.classList.add('ativo');
}

// 3. Lógica do Carrossel de Imagens
function moverSlide(idCarousel, direcao) {
    const carousel = document.getElementById(idCarousel);
    if (!carousel) return;

    const track = carousel.querySelector('.cp-track');
    const slides = carousel.querySelectorAll('.cp-slide');
    const badge = carousel.querySelector('.cp-badge-count');
    const total = slides.length;

    // Calcula índice atual baseado na translação CSS
    // Se style.transform for "translateX(-100%)", o índice é 1.
    let currentTransform = track.style.transform.match(/-?(\d+)/);
    let indexAtual = currentTransform ? parseInt(currentTransform[0]) / 100 : 0;
    
    // Ajusta para números positivos se o match vier negativo
    if (track.style.transform.includes('-')) indexAtual = Math.abs(indexAtual);

    let novoIndex = indexAtual + direcao;

    // Loop infinito
    if (novoIndex < 0) novoIndex = total - 1;
    if (novoIndex >= total) novoIndex = 0;

    // Aplica movimento
    track.style.transform = `translateX(-${novoIndex * 100}%)`;

    // Atualiza contador (1/3)
    if (badge) badge.innerText = `${novoIndex + 1}/${total}`;
}

/* ==================== SISTEMA DE LOGIN (SIMULAÇÃO) ==================== */

// 1. Função para verificar se deve mostrar os Stories
function verificarLoginUsuario() {
    const stories = document.getElementById('secaoStories');
    // Verifica se existe um item salvo como "logado" no navegador
    const usuarioEstaLogado = localStorage.getItem('usuarioLogado');

    if (usuarioEstaLogado === 'true') {
        // Se estiver logado, mostra os stories (usamos flex para manter o layout)
        if(stories) stories.style.display = 'flex'; 
        
        // Opcional: Esconde o botão de "Entrar" no topo se já estiver logado
        const btnEntrar = document.querySelector('.entrar');
        if(btnEntrar) btnEntrar.style.display = 'none';
    } else {
        // Se não, garante que está escondido
        if(stories) stories.style.display = 'none';
    }
}

function verificarLoginUsuario() {
    const stories = document.getElementById('secaoStories');
    const usuarioEstaLogado = localStorage.getItem('usuarioLogado');

    if (usuarioEstaLogado === 'true') {
        // Se logado, força aparecer sobrepondo o CSS
        if(stories) stories.style.setProperty('display', 'flex', 'important');
        
        // Esconde botão entrar se quiser
        const btnEntrar = document.querySelector('.entrar');
        if(btnEntrar) btnEntrar.style.display = 'none';
    } else {
        // Se não logado, garante que suma
        if(stories) stories.style.setProperty('display', 'none', 'important');
    }
}

// Executa ao carregar
window.addEventListener('load', verificarLoginUsuario);

/* ==================== SISTEMA DE LOGIN (FUNCIONAL) ==================== */

// 1. Função de Login
function realizarLogin(event) {
    if(event) event.preventDefault(); 

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    if(email && senha) {
        localStorage.setItem('usuarioLogado', 'true');
        
        // Cria um perfil padrão se não existir, para não ficar sem foto
        if (!localStorage.getItem('doke_usuario_perfil')) {
            const perfilPadrao = {
                nome: email.split('@')[0],
                foto: 'https://i.pravatar.cc/150?img=11' // Foto inicial padrão
            };
            localStorage.setItem('doke_usuario_perfil', JSON.stringify(perfilPadrao));
        }

        alert("Login realizado com sucesso!");
        window.location.href = "index.html"; 
    } else {
        alert("Preencha todos os campos!");
    }
}

// 2. Função de Cadastro
function realizarCadastro(event) {
    if(event) event.preventDefault();

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;

    if(nome && email) {
        localStorage.setItem('usuarioLogado', 'true');
        
        // Já salva o perfil inicial com o nome do cadastro
        const perfilInicial = {
            nome: nome,
            bio: "Novo usuário na Doke.",
            local: "Não informado",
            foto: "https://i.pravatar.cc/150?img=11" // Foto padrão inicial
        };
        localStorage.setItem('doke_usuario_perfil', JSON.stringify(perfilInicial));

        alert("Conta criada! Bem-vindo(a).");
        window.location.href = "index.html";
    }
}

// --- FUNÇÃO PRINCIPAL: HEADER E AVATAR ---
function verificarEstadoLogin() {
    const logado = localStorage.getItem('usuarioLogado') === 'true';
    const containerBotoes = document.querySelector('.botoes-direita');
    const areaStories = document.getElementById('secaoStories'); 

    if (logado) {
        // >>> USUÁRIO LOGADO <<<

        if (containerBotoes) {
            containerBotoes.innerHTML = ''; // Limpa o botão "Entrar"

            // 1. TENTA PEGAR A FOTO SALVA NO PERFIL
            const perfilSalvo = JSON.parse(localStorage.getItem('doke_usuario_perfil'));
            
            // Se tiver foto salva (Base64 ou URL), usa ela. Se não, usa a padrão.
            const fotoUsuario = (perfilSalvo && perfilSalvo.foto) ? perfilSalvo.foto : 'https://i.pravatar.cc/150?img=11';

            // 2. Cria o HTML com a FOTO CERTA
            const divPerfil = document.createElement('div');
            divPerfil.style.display = 'flex';
            divPerfil.style.alignItems = 'center';
            divPerfil.style.gap = '15px';

            divPerfil.innerHTML = `
                <a href="meuperfil.html" style="text-decoration:none;" title="Ir para meu perfil">
                    <img src="${fotoUsuario}" alt="Perfil" 
                         style="width:40px; height:40px; border-radius:50%; border:2px solid #eee; object-fit:cover;">
                </a>
            `;

            containerBotoes.appendChild(divPerfil);
        }

        if (areaStories) areaStories.style.display = 'flex';

    } else {
        // >>> USUÁRIO DESLOGADO <<<
        if (containerBotoes) {
            containerBotoes.innerHTML = `<a href="login.html" class="entrar">Entrar</a>`;
        }
        if (areaStories) areaStories.style.display = 'none';
    }
}

// 4. Função de Sair
function fazerLogout() {
    if(confirm("Tem certeza que deseja sair?")) {
        localStorage.removeItem('usuarioLogado');
        // Opcional: localStorage.removeItem('doke_usuario_perfil'); // Se quiser limpar os dados ao sair
        alert("Você saiu da conta.");
        window.location.href = 'index.html';
    }
}

window.addEventListener('load', verificarEstadoLogin);

/* ==========================================================================
   FUNCIONALIDADE: BUSCA EM TEMPO REAL
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function() {
    // Pega o input de busca da Home (hero section)
    const inputBusca = document.querySelector('.hero-search-box input');
    
    if (inputBusca) {
        inputBusca.addEventListener('input', function() {
            const termo = this.value.toLowerCase();
            filtrarCards(termo);
        });
    }
});

function filtrarCards(termo) {
    // Seleciona todos os cards de inspiração e profissionais
    const cardsInspiracao = document.querySelectorAll('.inspiration-card');
    const cardsPros = document.querySelectorAll('.pro-card');

    // Filtra Inspirações
    cardsInspiracao.forEach(card => {
        const titulo = card.querySelector('.card-title')?.innerText.toLowerCase() || "";
        const categoria = card.querySelector('.card-cat-badge')?.innerText.toLowerCase() || "";
        const usuario = card.querySelector('.card-user')?.innerText.toLowerCase() || "";

        if (titulo.includes(termo) || categoria.includes(termo) || usuario.includes(termo)) {
            card.style.display = "block"; // Mostra
        } else {
            card.style.display = "none"; // Esconde
        }
    });

    // Filtra Profissionais (Top Pros)
    cardsPros.forEach(card => {
        const nome = card.querySelector('.pro-name')?.innerText.toLowerCase() || "";
        const profissao = card.querySelector('.pro-job')?.innerText.toLowerCase() || "";

        if (nome.includes(termo) || profissao.includes(termo)) {
            card.style.display = "flex"; // Profissionais usam flexbox geralmente
        } else {
            card.style.display = "none";
        }
    });
}

// Carregar anúncios do Backend
async function carregarAnuncios() {
    const container = document.querySelector('.inspiration-grid'); // Ou onde você quer mostrar
    if (!container) return;

    try {
        const response = await fetch('http://localhost:3000/api/anuncios');
        const anuncios = await response.json();

        if (anuncios.length > 0) {
            container.innerHTML = ""; // Limpa os exemplos estáticos
            
            anuncios.forEach(anuncio => {
                const card = `
                <div class="inspiration-card">
                    <div class="like-btn"><i class='bx bx-heart'></i></div>
                    <img src="https://source.unsplash.com/random/500x500/?${anuncio.categoria}" class="card-img">
                    <div class="card-overlay">
                        <span class="card-cat-badge">${anuncio.categoria}</span>
                        <div class="card-title">${anuncio.titulo}</div>
                        <div class="card-user">R$ ${anuncio.preco}</div>
                    </div>
                </div>`;
                container.innerHTML += card;
            });
        }
    } catch (erro) {
        console.log("Erro ao buscar anúncios:", erro);
    }
}

// Chama quando a página carrega
window.addEventListener('load', carregarAnuncios);

/* ==========================================================================
   CARREGAR FEED PREMIUM (HOME)
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    carregarFeedPremium();
});

async function carregarFeedPremium() {
    const container = document.getElementById('feedAnuncios');
    if (!container) return; // Se não achar a div, para.

    try {
        const response = await fetch('http://localhost:3000/api/anuncios');
        const anuncios = await response.json();

        if (!anuncios || anuncios.length === 0) return;

        // Limpa o conteúdo atual (remove o exemplo do Carlos Elétrica)
        // Se quiser manter o exemplo, apague a linha abaixo:
        container.innerHTML = ""; 

        anuncios.forEach(anuncio => {
            // Pega a primeira categoria para a imagem
            let categoriaPrincipal = "servico";
            if (anuncio.categorias && anuncio.categorias !== "[]") {
                try {
                    // Tenta ler se for array JSON ou string direta
                    const cats = JSON.parse(anuncio.categorias);
                    if(Array.isArray(cats)) categoriaPrincipal = cats[0];
                } catch(e) { 
                    categoriaPrincipal = anuncio.categorias; // Fallback se for string simples
                }
            }

            // Gera imagens aleatórias baseadas na categoria
            const imgMain = `https://source.unsplash.com/random/800x600/?${categoriaPrincipal},work`;
            const imgSub1 = `https://source.unsplash.com/random/800x600/?${categoriaPrincipal},detail`;
            const imgSub2 = `https://source.unsplash.com/random/800x600/?${categoriaPrincipal},tool`;

            // Formata preço
            let preco = anuncio.valor;
            if(!preco.includes('R$') && !isNaN(preco)) preco = `R$ ${preco}`;

            const cardHTML = `
            <div class="card-premium">
        <div class="cp-header">
            <div class="cp-perfil">
                <img src="${fotoAutor}" class="cp-avatar" alt="Foto" style="object-fit:cover;">
                <div>
                    <h4 class="cp-nome">${nomeAutor} <i class='bx bxs-badge-check' style="color:#0095f6;"></i></h4>
                    <span class="cp-user">${userHandle}</span>
                    <div class="cp-badges">
                        <span class="cp-stars">★★★★★</span>
                        <span class="cp-cifrao" style="color:#2ecc71; font-weight:bold;">${anuncio.preco || anuncio.valor || 'A combinar'}</span>
                    </div>
                </div>
            </div>
            <i class='bx bx-dots-horizontal-rounded' style="font-size:1.5rem; color:#ccc; cursor:pointer;"></i>
        </div>

                <div class="cp-body">
                    <h3 class="cp-titulo">${anuncio.titulo}</h3>
                    <p class="cp-desc">${anuncio.descricao}</p>
                </div>

                <div class="cp-media-grid">
                    <div class="cp-item-main">
                        <img src="${imgMain}" alt="Principal" onerror="this.src='assets/Imagens/doke-logo.png'">
                    </div>
                    <div class="cp-item-sub">
                        <img src="${imgSub1}" alt="Detalhe 1">
                    </div>
                    <div class="cp-item-sub">
                        <img src="${imgSub2}" alt="Detalhe 2">
                        <div class="cp-overlay-count">+Fotos</div>
                    </div>
                </div>

                <div class="cp-footer">
                    <div class="cp-loc"><i class='bx bx-map'></i> ${anuncio.cep || "Localização"}</div>
                    <a href="orcamento.html"><button class="btn-premium">Solicitar Orçamento</button></a>
                </div>
            </div>
            `;
            
            container.innerHTML += cardHTML;
        });

    } catch (erro) {
        console.error("Erro ao carregar feed:", erro);
    }
}

        // ===============================================
        // LÓGICA PARA CARREGAR ANÚNCIOS NO FEED
        // ===============================================
        document.addEventListener("DOMContentLoaded", () => {
            const feed = document.getElementById('feedAnuncios');
            
            // 1. Tenta pegar do LocalStorage
            let anuncios = JSON.parse(localStorage.getItem('doke_anuncios')) || [];
            // [NOVO] Carrega o Perfil do Usuário para usar o nome e foto dele
const perfilUsuario = JSON.parse(localStorage.getItem('doke_usuario_perfil'));

// 3. Renderiza os Cards
// 3. Renderiza os Cards
            if (anuncios.length > 0) {
                feed.innerHTML = ''; 
                
                // MAPA DE ÍCONES (Adicione mais se precisar)
                const iconesCategoria = {
                    'Eletricista': 'bx-plug',
                    'Encanador': 'bx-wrench',
                    'Pintor': 'bx-paint-roll',
                    'Pedreiro': 'bx-hard-hat',
                    'Montador': 'bx-cabinet',
                    'Limpeza': 'bx-spray-can',
                    'Tecnologia': 'bx-laptop',
                    'Outros': 'bx-briefcase-alt-2'
                };

                anuncios.forEach(anuncio => {
                    if(anuncio.status === 'pausado') return; 

                    // --- LÓGICA DE PERFIL (Foto e Nome reais) ---
                    let nomeAutor = anuncio.categoria || 'Profissional';
                    let fotoAutor = 'https://i.pravatar.cc/150?u=' + anuncio.id; 
                    let userHandle = '@profissional';

                    if (perfilUsuario) {
                        nomeAutor = perfilUsuario.nome;
                        fotoAutor = perfilUsuario.foto || fotoAutor;
                        userHandle = '@' + perfilUsuario.nome.split(' ')[0].toLowerCase();
                    }

                    // 1. Ícone da Categoria
                    let catChave = anuncio.categoria ? anuncio.categoria.split(' ')[0] : 'Outros';
                    let iconeClass = iconesCategoria[catChave] || 'bx-briefcase-alt-2';

                    // 2. Estrelas (Cinza se for novo)
                    let classeEstrela = anuncio.views > 100 ? '' : 'gray'; 

                    // 3. Imagens
                    let fotos = anuncio.fotos && anuncio.fotos.length > 0 ? anuncio.fotos : (anuncio.img ? [anuncio.img] : []);
                    if (fotos.length === 0) fotos = ['https://placehold.co/600x400?text=Sem+Foto'];

                    let imagensHTML = '';
                    if (fotos.length === 1) {
                        imagensHTML = `<div class="cp-item-main" style="grid-column: span 2; height: 300px;"><img src="${fotos[0]}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;"></div>`;
                    } else if (fotos.length >= 3) {
                        imagensHTML = `
                            <div class="cp-item-main"><img src="${fotos[0]}"></div>
                            <div class="cp-item-sub"><img src="${fotos[1]}"></div>
                            <div class="cp-item-sub">
                                <img src="${fotos[2]}">
                                ${fotos.length > 3 ? `<div class="cp-overlay-count">+${fotos.length - 3}</div>` : ''}
                            </div>
                        `;
                    } else { 
                        imagensHTML = `<div class="cp-item-main"><img src="${fotos[0]}"></div><div class="cp-item-sub"><img src="${fotos[1]}"></div>`;
                    }

                    // --- HTML DO CARD CORRIGIDO ---
                    const card = document.createElement('div');
                    card.className = 'card-premium';
                    card.innerHTML = `
<div class="cp-header">
                            <div class="cp-perfil">
                                <img src="${fotoAutor}" class="cp-avatar" alt="Foto" style="object-fit:cover;">
                                <div>
                                    <h4 class="cp-nome">
                                        ${nomeAutor} 
                                        <i class='bx ${iconeClass}' style="color:var(--cor0); font-size:1.1rem; margin-left:5px;" title="${anuncio.categoria}"></i>
                                    </h4>
                                    <span class="cp-user">${userHandle}</span>
                                    <div class="cp-badges">
                                        <span class="cp-stars ${classeEstrela}">★★★★★</span>
                                    </div>
                                </div>
                            </div>
                            <i class='bx bx-dots-horizontal-rounded' style="font-size:1.5rem; color:#ccc; cursor:pointer;"></i>
                        </div>

                        <div class="cp-body">
                            <h3 class="cp-titulo">${anuncio.titulo}</h3>
                            <p class="cp-desc">${anuncio.descricao || 'Sem descrição.'}</p>
                        </div>

                        <div class="cp-mid-actions">
                            
                            <div class="cp-mid-left">
                                <button class="btn-mid-chamativo" onclick="location.href='meuperfil.html'">Ver Perfil</button>
                                <button class="btn-mid-chamativo" onclick="location.href='avaliacoes.html'">Avaliação</button>
                            </div>

                            <div class="cp-mid-right">
                                <i class='bx bx-heart icon-action-card' title="Salvar"></i>
                                <i class='bx bx-share-alt icon-action-card' title="Compartilhar"></i>
                            </div>

                        </div>

                        <div class="cp-media-grid" onclick="abrirGaleria()">
                            ${imagensHTML}
                        </div>
                        
                        <div class="cp-footer-right">
                            <a href="orcamento.html">
                                <button class="btn-orcamento-chamativo">Solicitar Orçamento</button>
                            </a>
                        </div>
                    `;
                    feed.appendChild(card);
                });
            } else {
                feed.innerHTML = '<p style="padding:20px; text-align:center;">Nenhum anúncio disponível no momento.</p>';
            }

        });