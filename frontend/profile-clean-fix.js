(function(){
  function dedupe(){
    var progress = document.getElementById('dpProgressCard');
    if(progress) progress.style.display='none';
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', dedupe, {once:true});
  else dedupe();
})();
