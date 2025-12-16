function abrirPopup() {
    document.getElementById("popup").style.display = "block";
}

function fecharPopup() {
    document.getElementById("popup").style.display = "none";
}

/* Executa ao carregar a página */
window.onload = function() {
    // 1. Pega a data de hoje (ex: "Mon Dec 16 2025")
    var dataHoje = new Date().toDateString();
    
    // 2. Verifica a data que está salva no navegador
    var dataSalva = localStorage.getItem("popupVistoData");

    // 3. Se a data salva for diferente da data de hoje, mostra o popup
    if (dataSalva !== dataHoje) {
        abrirPopup();
        // 4. Salva a nova data para não abrir mais hoje
        localStorage.setItem("popupVistoData", dataHoje);
    }
}
document.addEventListener("DOMContentLoaded", function() {
            const banner = document.getElementById('cookieBanner');
            const btn = document.getElementById('acceptBtn');

            // 1. Verifica se o usuário já aceitou antes
            if (localStorage.getItem('cookiesAceitos') === 'true') {
                banner.style.display = 'none';
            }

            // 2. Ação ao clicar no botão
            btn.addEventListener('click', function() {
                // Animação de saída (opcional, deixa mais suave)
                banner.style.opacity = '0';

                // Espera a transição terminar para remover do display
                setTimeout(() => {
                    banner.style.display = 'none';
                }, 500);

                // Salva a preferência no navegador do usuário
                localStorage.setItem('cookiesAceitos', 'true');
            });
        });

        //ESTADO, CIDADE, BAIRRO 


    // Iniciar
    carregarEstados();

    //CEP

// --- FUNÇÕES ---

    // 1. Abre e fecha o popup
    function toggleCep(event) {
        event.preventDefault(); 
        const popup = document.getElementById('boxCep');
        
        if (popup.style.display === 'block') {
            popup.style.display = 'none';
        } else {
            popup.style.display = 'block';
            document.getElementById('inputCep').focus();
        }
    }

    // 2. Atualiza a tela (Muda o texto para "Alterar CEP")
    function atualizarTela(cep) {
        const span = document.getElementById('textoCepSpan');
        const input = document.getElementById('inputCep');
        
        if (span) {
            span.innerText = "Alterar CEP";
            span.style.fontWeight = "600";
            span.style.color = "var(--cor0)"; // Sua cor verde
        }
        
        // PREENCHE O CAMPO PARA O USUÁRIO NÃO PRECISAR DIGITAR DE NOVO
        if (input) {
            input.value = cep;
        }
    }

    // 3. Salva no Computador
    function salvarCep() {
        const val = document.getElementById('inputCep').value;
        
        if(val.length >= 9) {
            // AQUI É ONDE ELE SALVA NO NAVEGADOR
            localStorage.setItem('meu_cep_doke', val); 
            
            atualizarTela(val); // Muda o texto
            document.getElementById('boxCep').style.display = 'none'; // Fecha
        } else {
            alert("CEP incompleto!");
        }
    }

    // --- EVENTOS AUTOMÁTICOS ---

    // 4. Assim que o site carrega, verifica se tem CEP salvo
    document.addEventListener("DOMContentLoaded", function() {
        const cepSalvo = localStorage.getItem('meu_cep_doke');
        
        if (cepSalvo) {
            // Se achou um CEP salvo, já atualiza a tela sozinho!
            atualizarTela(cepSalvo);
        }
    });

    // 5. Máscara (00000-000)
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

    // 6. Fecha ao clicar fora
    window.addEventListener('click', function(e) {
        const wrapper = document.querySelector('.cep-wrapper');
        const popup = document.getElementById('boxCep');
        if (popup && wrapper && !wrapper.contains(e.target)) {
            popup.style.display = 'none';
        }
    });
    
    
        
