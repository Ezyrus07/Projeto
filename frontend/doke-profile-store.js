(function(){
  const KEY = 'doke_profile_v1';

  function safeParse(json){
    try { return JSON.parse(json); } catch { return null; }
  }

  function now(){ return new Date().toISOString(); }

  function read(){
    const raw = localStorage.getItem(KEY);
    const obj = raw ? safeParse(raw) : null;
    return (obj && typeof obj === 'object') ? obj : {};
  }

  function write(profile){
    const p = normalize(profile);
    localStorage.setItem(KEY, JSON.stringify(p));
    return p;
  }

  function merge(partial){
    const cur = read();
    const merged = { ...cur, ...(partial || {}) };
    merged._updatedAt = now();
    return write(merged);
  }

  function normalize(p){
    const out = { ...(p || {}) };
    // normalize common fields
    if (out.nome != null) out.nome = String(out.nome).trim().slice(0, 60);
    if (out.email != null) out.email = String(out.email).trim().toLowerCase();
    if (out.cpf_cnpj != null) out.cpf_cnpj = String(out.cpf_cnpj).trim();
    if (out.telefone != null) out.telefone = String(out.telefone).trim();
    if (out.data_nascimento != null) out.data_nascimento = String(out.data_nascimento).trim();
    if (out.cep != null) out.cep = String(out.cep).trim();
    if (out.cidade != null) out.cidade = String(out.cidade).trim();
    if (out.bairro != null) out.bairro = String(out.bairro).trim();
    if (out.estado != null) out.estado = String(out.estado).trim();
    if (out.endereco != null) out.endereco = String(out.endereco).trim();
    if (out.numero != null) out.numero = String(out.numero).trim();
    if (out.complemento != null) out.complemento = String(out.complemento).trim();

    out._updatedAt = out._updatedAt || now();
    return out;
  }

  function fillInputs(map){
    const profile = read();
    Object.entries(map || {}).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const val = profile[key];
      if (val == null) return;
      // avoid overwriting user edits
      if (String(el.value || '').trim() !== '') return;
      el.value = val;
    });
  }

  function bindAutoSave(map){
    Object.entries(map || {}).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const handler = () => merge({ [key]: el.value });
      el.addEventListener('change', handler);
      el.addEventListener('blur', handler);
    });
  }

  window.DokeProfileStore = { read, write, merge, fillInputs, bindAutoSave, KEY };
})();
