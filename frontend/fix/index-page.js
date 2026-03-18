(function(){
  function onReady(fn){if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn,{once:true});}else{fn();}}
  onReady(function(){
    try{document.body.classList.add('home-consolidated');}catch(_){}
    try{document.querySelectorAll('.popup').forEach(function(el){el.style.display='none';});}catch(_){}
  });
})();
