function abrirPopup() {
    document.getElementById("popup").style.display = "block";
}

function fecharPopup() {
    document.getElementById("popup").style.display = "none";
}

/* Abre automaticamente quando a página carregar */
window.onload = function() {
    abrirPopup();
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
