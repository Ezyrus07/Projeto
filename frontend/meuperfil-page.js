
(function(){
  const KEYS=['doke_usuario_perfil','perfil_usuario','usuario_logado','doke_usuario_logado','userLogado','doke_profile_v1'];
  function pick(obj, keys){ for(const k of keys){ const v=obj && obj[k]; if(v!==undefined && v!==null && String(v).trim()!=='') return v; } return ''; }
  function readProfile(){
    const merged={};
    for(const key of KEYS){
      try{ const raw=localStorage.getItem(key); if(!raw) continue; const parsed=JSON.parse(raw); if(parsed && typeof parsed==='object') Object.assign(merged, parsed); }catch(_){ }
    }
    return merged;
  }
  function setText(id, value, fallback=''){
    const el=document.getElementById(id); if(!el) return;
    const out=(value??'').toString().trim() || fallback;
    if(out) el.textContent=out;
  }
  function setHtml(id, value){ const el=document.getElementById(id); if(el && value!==undefined) el.innerHTML=value; }
  function formatNum(n){ return new Intl.NumberFormat('pt-BR').format(Number(n)||0); }
  function apply(){
    const profile=readProfile();
    const nome=pick(profile,['nome','name','full_name','fullName','username']) || 'Seu perfil';
    const handleRaw=pick(profile,['arroba','handle','username','user_name','slug']);
    const handle=handleRaw ? ('@'+String(handleRaw).replace(/^@+/,'').trim()) : '@usuario';
    const bio=pick(profile,['bio','descricao','about','headline']);
    const about=pick(profile,['sobre','about','descricao_longa','descricao','bio']) || 'As informações do perfil aparecem aqui.';
    const cidade=pick(profile,['cidade','local','location']);
    const estado=pick(profile,['estado','uf']);
    const profissao=pick(profile,['profissao','categoria','ocupacao']);
    const points=Number(pick(profile,['pontos','points','xpTotal','xp_total','score'])||12450);
    const level=Math.max(1, Number(pick(profile,['nivel','level','lv']) || (Math.floor(points/520)+1)));
    const currentXp=Math.max(0, Number(pick(profile,['xpAtual','currentXp','xp_atual']) || (points%1000)));
    const nextXp=Math.max(1000, Number(pick(profile,['proximoNivelXp','nextLevelXp','xp_proximo_nivel']) || 1000));
    const followers=Number(pick(profile,['seguidores','followers'])||0);
    const following=Number(pick(profile,['seguindo','following'])||0);
    const reviews=Number(pick(profile,['avaliacoes','reviews','reviewCount'])||0);
    setText('dpName', nome);
    setText('dpHandle', handle);
    setText('dpBio', bio);
    setText('dpAboutText', about);
    setText('dpFollowers', formatNum(followers));
    setText('dpFollowing', formatNum(following));
    setText('dpReviews', formatNum(reviews));
    setText('dpPointsValue', formatNum(points));
    setText('dpLevelValue', 'Nivel '+level);
    setText('dpXpValue', formatNum(currentXp)+' / '+formatNum(nextXp)+' XP');
    const fill=document.getElementById('dpProgressFill'); if(fill) fill.style.width=Math.max(0,Math.min(100,(currentXp/nextXp)*100))+'%';
    const chips=[]; if(profissao) chips.push('<span class="dp-chip">'+profissao+'</span>'); if(cidade||estado) chips.push('<span class="dp-chip">'+[cidade,estado].filter(Boolean).join(' - ')+'</span>');
    setHtml('dpChips', chips.join(''));
    const avatar=pick(profile,['avatar_url','avatarUrl','foto','fotoPerfil','profile_picture']);
    const img=document.getElementById('dpAvatarImg'); const letter=document.getElementById('dpAvatarLetter');
    if(img && avatar){ img.src=avatar; img.style.display='block'; if(letter) letter.style.display='none'; }
    else if(letter){ letter.textContent=(nome||'U').trim().charAt(0).toUpperCase(); }
    const cards=[...document.querySelectorAll('#dpProgressCard, .dp-progressCard')];
    let kept=false; cards.forEach(el=>{ if(!kept){ el.classList.remove('is-duplicate'); el.style.removeProperty('display'); kept=true; } else el.classList.add('is-duplicate'); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', apply, {once:true}); else apply();
  window.addEventListener('load', apply);
  setTimeout(apply, 600); setTimeout(apply, 1600);
})();
