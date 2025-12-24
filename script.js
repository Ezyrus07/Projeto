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

/* ==================== LÓGICA DE FILTROS AVANÇADOS ==================== */

// 1. "Banco de Dados" Simulado de Locais
const dadosLocais = {
    "BA": {
        nome: "Bahia",
        cidades: {
            "Salvador": ["Barra", "Rio Vermelho", "Pituba", "Itapuã", "Caminho das Árvores"],
            "Feira de Santana": ["Centro", "Tomba", "Kalilândia"],
            "Lauro de Freitas": ["Vilas do Atlântico", "Buraquinho"]
        }
    },
    "SP": {
        nome: "São Paulo",
        cidades: {
            "São Paulo": ["Centro", "Paulista", "Pinheiros", "Moema"],
            "Campinas": ["Cambuí", "Barão Geraldo"]
        }
    },
    "RJ": {
        nome: "Rio de Janeiro",
        cidades: {
            "Rio de Janeiro": ["Copacabana", "Ipanema", "Barra da Tijuca"],
            "Niterói": ["Icaraí", "Centro"]
        }
    }
};

// Executar ao carregar a página
document.addEventListener("DOMContentLoaded", function() {
    preencherEstados();
});

// 2. Funções de Povoamento
function preencherEstados() {
    const selectEstado = document.getElementById("selectEstado");
    if(!selectEstado) return;

    // Limpa opções antigas (mantendo a primeira)
    selectEstado.innerHTML = '<option value="" disabled selected>Selecionar UF</option>';

    for (let sigla in dadosLocais) {
        let option = document.createElement("option");
        option.value = sigla;
        option.text = dadosLocais[sigla].nome;
        selectEstado.appendChild(option);
    }
}

function carregarCidades() {
    const estadoSigla = document.getElementById("selectEstado").value;
    const selectCidade = document.getElementById("selectCidade");
    const selectBairro = document.getElementById("selectBairro");

    // Resetar Cidades e Bairros
    selectCidade.innerHTML = '<option value="" disabled selected>Selecionar Cidade</option>';
    selectBairro.innerHTML = '<option value="" disabled selected>Selecione a Cidade...</option>';
    selectBairro.disabled = true;

    if (estadoSigla && dadosLocais[estadoSigla]) {
        const cidades = dadosLocais[estadoSigla].cidades;
        
        for (let cidadeNome in cidades) {
            let option = document.createElement("option");
            option.value = cidadeNome;
            option.text = cidadeNome;
            selectCidade.appendChild(option);
        }
        selectCidade.disabled = false;
    }
}

function carregarBairros() {
    const estadoSigla = document.getElementById("selectEstado").value;
    const cidadeNome = document.getElementById("selectCidade").value;
    const selectBairro = document.getElementById("selectBairro");

    // Resetar Bairros
    selectBairro.innerHTML = '<option value="" disabled selected>Selecionar Bairro</option>';

    if (estadoSigla && cidadeNome) {
        const bairros = dadosLocais[estadoSigla].cidades[cidadeNome];
        
        bairros.forEach(bairro => {
            let option = document.createElement("option");
            option.value = bairro;
            option.text = bairro;
            selectBairro.appendChild(option);
        });
        selectBairro.disabled = false;
    }
}

// 3. Abrir/Fechar "Mais Filtros"
function toggleMaisFiltros() {
    const area = document.getElementById("areaMaisFiltros");
    const btn = document.querySelector(".btn-filtros");
    
    // Alterna a classe 'aberto'
    if (area.classList.contains("aberto")) {
        area.classList.remove("aberto");
        btn.style.backgroundColor = "#fff";
        btn.style.color = "var(--cor0)";
    } else {
        area.classList.add("aberto");
        btn.style.backgroundColor = "var(--cor0)";
        btn.style.color = "#fff";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const btnMenu = document.getElementById('btn-menu-mobile');
    const sidebar = document.querySelector('.sidebar-icones');
    const overlay = document.getElementById('overlay-menu');

    // Função para abrir/fechar
    function toggleMenu() {
        sidebar.classList.toggle('menu-aberto');
        document.body.classList.toggle('menu-ativo'); // Para controlar o overlay
    }

    if(btnMenu) {
        btnMenu.addEventListener('click', toggleMenu);
    }
    
    // Fechar ao clicar no fundo escuro (se você adicionou o overlay)
    if(overlay) {
        overlay.addEventListener('click', toggleMenu);
    }
});

