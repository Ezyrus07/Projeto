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
