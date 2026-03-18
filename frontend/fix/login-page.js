(function(){
  function onReady(fn){if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn,{once:true});}else{fn();}}
  onReady(function(){
    try{document.body.classList.add('auth-page');}catch(_){}
    try{document.documentElement.classList.add('doke-no-shell');}catch(_){}
    try{var u=new URL(location.href); if(!u.searchParams.has('noshell')){history.replaceState({},'',u.pathname+'?noshell=1'+(u.hash||''));}}catch(_){}
  });
})();
