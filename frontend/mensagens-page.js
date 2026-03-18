(function(){
  function onReady(fn){if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn,{once:true});}else{fn();}}
  onReady(function(){
    try{document.body.classList.add('mensagens-consolidated');}catch(_){}
    try{var list=document.getElementById('listaConversas')||document.querySelector('.lista-conversas'); if(list && /Carregando/i.test(list.textContent||'')){list.innerHTML='<div class="doke-inline-loader"><span class="doke-inline-loader__spinner"><i class="bx bx-loader-alt bx-spin"></i></span><span>Carregando conversas...</span></div>';}}catch(_){}
  });
})();
