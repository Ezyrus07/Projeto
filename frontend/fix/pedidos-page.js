document.addEventListener('DOMContentLoaded',()=>{
  document.body.classList.add('pedidos-consolidated');
  const loading=document.querySelector('#ordersGrid .loading, #ordersGrid .loader, #ordersGridWrap .loading');
  if(loading && /carregando|buscando/i.test(loading.textContent||'')) loading.classList.add('doke-inline-loader');
});
