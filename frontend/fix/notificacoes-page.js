document.addEventListener('DOMContentLoaded',()=>{
  const list=document.getElementById('lista-notificacoes');
  if(list && /Buscando atualizações|Carregando/i.test(list.textContent||'')) {
    list.innerHTML='<div class="notif-simple-loading" role="status" aria-live="polite"><i class="bx bx-loader-alt bx-spin"></i><span>Carregando notificações...</span></div>';
  }
});
