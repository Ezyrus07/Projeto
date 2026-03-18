
(function(){
 function hideDup(){ var el=document.getElementById('dpProgressCard'); if(el) el.style.display='none'; }
 document.addEventListener('DOMContentLoaded', hideDup); window.addEventListener('load', hideDup); setInterval(hideDup,1500);
})();
