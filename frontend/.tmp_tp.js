(function(){
    // ============================================================
    // Tornar-se profissional (SUPABASE ONLY)
    // ============================================================

    const sb = window.sb;
    const toastWrapId = "dokeToastWrapTP";

    function ensureToastWrap(){
      let w = document.getElementById(toastWrapId);
      if(!w){
        w = document.createElement("div");
        w.className = "doke-toast-wrap";
        w.id = toastWrapId;
        w.setAttribute("role", "status");
        w.setAttribute("aria-live", "polite");
        w.setAttribute("aria-atomic", "true");
        document.body.appendChild(w);
      }
      return w;
    }

    function toast(msg, type="info", title){
      if(window.dokeToast) { window.dokeToast(msg, type); return; }
      const wrap = ensureToastWrap();
      const t = document.createElement("div");
      t.className = "doke-toast " + (type || "info");
      const isError = (type === "error" || type === "warn");
      t.setAttribute("role", isError ? "alert" : "status");
      t.setAttribute("aria-live", isError ? "assertive" : "polite");
      t.setAttribute("aria-atomic", "true");
      const icon = document.createElement("div");
      icon.className = "icon";
      icon.innerHTML = type === "success" ? "<i class='bx bxs-check-circle'></i>" : (type === "error" ? "<i class='bx bxs-error'></i>" : "<i class='bx bxs-info-circle'></i>");
      const txt = document.createElement("div");
      const tt = document.createElement("div");
      tt.className = "title";
      tt.textContent = title || (type === "error" ? "Ops" : (type === "success" ? "Pronto" : "Info"));
      const mm = document.createElement("div");
      mm.className = "msg";
      mm.textContent = msg;
      txt.appendChild(tt);
      txt.appendChild(mm);
      t.appendChild(icon);
      t.appendChild(txt);
      wrap.appendChild(t);
      setTimeout(()=>{ t.style.opacity = "0"; t.style.transform = "translateY(6px)"; }, 3200);
      setTimeout(()=>{ t.remove(); }, 3600);
    }

    
      function showObrigado(){
        try{
          const hero = document.querySelector('.anuncio-hero-container');
          const card = document.querySelector('.anuncio-card');
          const thanks = document.getElementById('tpObrigado');
          if(hero) hero.style.display = 'none';
          if(card) card.style.display = 'none';
          if(thanks) thanks.style.display = 'block';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }catch(_e){}
      }

function onlyDigits(v){ return (v || "").replace(/\D/g, ""); }

    function isMissingColumnError(error, col){
      if(!error) return false;
      const needle = String(col||'').toLowerCase();
      const parts = [
        error.message, error.details, error.hint, error.error_description,
        (typeof error === 'string' ? error : null),
        (error.code ? String(error.code) : null)
      ].filter(Boolean).map(x=>String(x).toLowerCase());
      const msg = parts.join(' | ');
      // c�digos comuns do PostgREST quando coluna/tabela n�o existe: PGRST204
      if(msg.includes('pgrst204')) return true;
      if(needle && (msg.includes(`could not find the '${needle}' column`) || msg.includes(`could not find the "${needle}" column`) || msg.includes(`column "${needle}" does not exist`) || msg.includes(`column '${needle}' does not exist`))) return true;
      return false;
    }

    function extractMissingColumn(error){
      const msg = (error && (error.message || '') || '').toString();
      const m = msg.match(/Could not find the ['"]([^'"]+)['"] column/i);
      return m ? m[1] : null;
    }

    async function safeSelectOne(table, tries){
      // tries: [{col, val}]
      for(const t of tries){
        if(t?.val == null || t?.val === '') continue;
        const { data, error } = await sb.from(table).select('*').eq(t.col, t.val).maybeSingle();
        if(!error) return { row: data, col: t.col, error: null };
        if(isMissingColumnError(error, t.col)) continue;
        // other errors: keep as last and continue for fallbacks
        console.warn(`[DOKE] safeSelectOne ${table} error`, error);
        return { row: null, col: null, error };
      }
      return { row: null, col: null, error: null };
    }

    async function safeWriteRow(table, keyTries, basePayload){
      // Try update (if exists) else insert. Remove unknown columns and retry automatically.
      let lastError = null;

      for(const key of keyTries){
        if(!key?.col || key.val == null || key.val === '') continue;

        // If the key column doesn't exist in the table, skip this key.
        const probe = await sb.from(table).select(key.col).limit(1);
        if(probe.error && isMissingColumnError(probe.error, key.col)) continue;

        // Build payload for this key
        let payload = { ...basePayload, [key.col]: key.val };

        // 1) Try UPDATE
        for(let i=0; i<6; i++){
          const { error, count } = await sb.from(table).update(payload, { count: 'exact' }).eq(key.col, key.val);
          if(!error){
            if((count ?? 0) > 0) return { ok: true, mode: 'update', key: key.col };
            break; // no row updated -> try insert
          }
          lastError = error;
          if(isMissingColumnError(error, key.col)) break; // key col not valid, try next key
          const miss = extractMissingColumn(error);
          if(miss && (miss in payload)){
            delete payload[miss];
            continue;
          }
          break;
        }

        // 2) Try INSERT
        for(let i=0; i<6; i++){
          const { error } = await sb.from(table).insert(payload);
          if(!error) return { ok: true, mode: 'insert', key: key.col };
          lastError = error;
          if(isMissingColumnError(error, key.col)) break;
          const miss = extractMissingColumn(error);
          if(miss && (miss in payload)){
            delete payload[miss];
            continue;
          }
          break;
        }
      }

      return { ok: false, error: lastError };
    }


    function maskTelefone(v){
      let d = onlyDigits(v).slice(0, 11);
      if(d.length <= 10){
        const a = d.slice(0,2);
        const b = d.slice(2,6);
        const c = d.slice(6,10);
        if(!a) return "";
        if(d.length < 3) return `(${a}`;
        if(d.length < 7) return `(${a}) ${b}`;
        return `(${a}) ${b}-${c}`;
      }
      return d.replace(/^(\d{2})(\d{5})(\d{4}).*$/, "($1) $2-$3");
    }

    function maskCPF(v){
      let d = onlyDigits(v).slice(0, 11);
      if(d.length <= 3) return d;
      if(d.length <= 6) return d.replace(/^(\d{3})(\d+)/, "$1.$2");
      if(d.length <= 9) return d.replace(/^(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
      return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*$/, "$1.$2.$3-$4");
    }

    function maskCEP(v){
      let d = onlyDigits(v).slice(0, 8);
      if(d.length <= 5) return d;
      return d.replace(/^(\d{5})(\d+)/, "$1-$2");
    }

    function calcIdade(isoDate){
      if(!isoDate) return 0;
      const d = new Date(isoDate + "T00:00:00");
      if(String(d) === "Invalid Date") return 0;
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if(m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
      return age;
    }

    function setFieldError(groupId, on){
      const el = document.getElementById(groupId);
      if(!el) return;
      if(on) el.classList.add("field-error");
      else el.classList.remove("field-error");
    }

    async function getAuthUid(){
      if(!sb || !sb.auth) return null;
      const { data, error } = await sb.auth.getUser();
      if(error) return null;
      return data?.user?.id || null;
    }

    async function resolveUsuario(uid){
      if(!uid) return null;
      // tenta uid primeiro, depois id (alguns projetos salvam id = auth.uid)
      const { data, error } = await sb
        .from("usu�rios")
        .select("id, uid, user, nome, email")
        .or(`uid.eq.${uid},id.eq.${uid}`)
        .maybeSingle();

      if(error) return null;
      if(!data) return null;
      return data;
    }

    async function uploadDocumento(uid, file){
      if(!file) return null;
      if(!sb?.storage) throw new Error("Supabase Storage n�o dispon�vel.");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `validacao/${uid}/${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage.from("perfil").upload(path, file, {
        upsert: true,
        contentType: file.type || "image/jpeg"
      });
      if(upErr) throw upErr;
      const { data: pub } = sb.storage.from("perfil").getPublicUrl(path);
      return pub?.publicUrl || null;
    }

        async function prefill(){
      try{
        const uid = await getAuthUid();
        const u = await resolveUsuario(uid);
        if(!u) return;

        const tries = [
          { col: "usuario_id", val: u.id },
          { col: "user_id",    val: uid },
          { col: "uid",        val: uid }
        ];

        const { row } = await safeSelectOne("profissional_validacao", tries);
        if(!row) return;

        const setVal = (id, val, maskFn) => {
          const el = document.getElementById(id);
          if(!el || val == null) return;
          el.value = maskFn ? maskFn(String(val)) : String(val);
        };

        setVal("tpTelefone", row.telefone || row.whatsapp || "", maskTelefone);
        setVal("tpCpf", row.cpf || "", maskCPF);
        setVal("tpNascimento", row.data_nascimento || row.nascimento || "");
        setVal("tpCep", row.cep || "", maskCEP);
        setVal("tpUf", row.uf || "");
        setVal("tpCidade", row.cidade || "");
        setVal("tpBairro", row.bairro || "");
        setVal("tpRua", row.rua || row.logradouro || "");
        setVal("tpNumero", row.n�mero || "");
        setVal("tpComplemento", row.complemento || "");

        const cpfEl = document.getElementById("tpCpf");
        if(cpfEl && row.cpf){
          cpfEl.setAttribute("readonly", "readonly");
          cpfEl.classList.add("locked-field");
        }

        // Preview do documento j� enviado
        if(row.identidade_url){
          const img = document.getElementById("tpDocumentoPreview");
          const hint = document.getElementById("tpDocumentoHint");
          const zone = document.getElementById("tpUploadZone");
          if(img){
            img.src = row.identidade_url;
            img.style.display = "block";
          }
          if(hint){
            hint.textContent = "Documento j� enviado";
            hint.style.display = "block";
          }
          if(zone){
            zone.classList.add("has-file");
          }
        }
      }catch(err){
        console.warn("[DOKE] prefill erro", err);
      }
    }

    // Impede letras/s�mbolos e aplica m�scara a cada digita��o/paste.
    // (Antes este helper n�o existia e quebrava todo o script, por isso nada funcionava.)
    function bindNumericGuards(el, maskFn){
      if(!el) return;

      const apply = () => {
        const v = el.value || "";
        el.value = maskFn ? maskFn(v) : v;
      };

      // Evita caracteres n�o num�ricos entrando antes do input.
      el.addEventListener('beforeinput', (e)=>{
        if(!e.data) return; // deletes etc.
        if(/\D/.test(e.data)) e.preventDefault();
      });

      el.addEventListener('keydown', (e)=>{
        if(e.ctrlKey || e.metaKey || e.altKey) return;
        const k = e.key;
        const allowed = [
          'Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter'
        ];
        if(allowed.includes(k)) return;
        // Permite apenas d�gitos
        if(!/^\d$/.test(k)) e.preventDefault();
      });

      el.addEventListener('paste', ()=> setTimeout(apply, 0));
      el.addEventListener('input', apply);
      el.addEventListener('blur', apply);

      // aplica j� ao carregar
      apply();
    }

    let _cepTimer = null;

    function bindMasks(){
      const tel = document.getElementById("tpTelefone");
      const cpf = document.getElementById("tpCpf");
      const cep = document.getElementById("tpCep");

      bindNumericGuards(tel, maskTelefone);
      bindNumericGuards(cpf, maskCPF);
      bindNumericGuards(cep, (v)=>{
        const masked = maskCEP(v);
        // auto busca quando completar
        if(masked.length === 9) buscarCepAPI(masked);
        return masked;
      });
    }

    async function buscarCepAPI(cep){
      const cleanCep = onlyDigits(cep);
      if(cleanCep.length !== 8) return;
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if(data?.erro) {
          toast("CEP n�o encontrado. Verifique e tente novamente.", "error");
          return;
        }
        document.getElementById("tpRua").value = data.logradouro || "";
        document.getElementById("tpBairro").value = data.bairro || "";
        document.getElementById("tpCidade").value = data.localidade || "";
        document.getElementById("tpUf").value = (data.uf || "").toUpperCase();
        toast("Endere�o preenchido pelo CEP.", "success");
        try{
          if(window.atualizarTelaCep){
            window.atualizarTelaCep({
              cep: document.getElementById("tpCep")?.value || "",
              cidade: document.getElementById("tpCidade")?.value || "",
              bairro: document.getElementById("tpBairro")?.value || "",
              uf: document.getElementById("tpUf")?.value || ""
            });
          }
        }catch(_e){}
      } catch(e) {
        console.warn("Erro CEP", e);
        toast("N�o foi poss�vel buscar o CEP agora.", "error");
      }
    }

    function bindUploadUI(){
      const input = document.getElementById("tpDocumento");
      const hint = document.getElementById("tpDocumentoHint");
      const zone = document.getElementById("tpUploadZone");
      const prev = document.getElementById("tpDocumentoPreview");

      if(!input) return;

      if(zone){
        zone.addEventListener("click", (ev)=>{
          if(ev.target === input) return;
          input.click();
        });
        zone.addEventListener("touchend", (ev)=>{
          ev.preventDefault();
          input.click();
        }, { passive: false });
      }

      input.addEventListener("change", ()=>{
        const f = input.files && input.files[0];
        if(!f) return;
        hint.textContent = f.name;
        hint.style.display = "inline-flex";

        // preview
        try {
          const url = URL.createObjectURL(f);
          prev.src = url;
          prev.style.display = "block";
        } catch(_e) {}

        zone.style.borderColor = "var(--cor0, #0b7768)";
        zone.style.backgroundColor = "#f0fdfa";
        const ic = zone.querySelector("i");
        if(ic) {
          ic.className = "bx bxs-check-circle";
          ic.style.color = "var(--cor0, #0b7768)";
        }
      });
    }

    function bindCepButton(){
      const btn = document.getElementById("btnBuscarCep");
      const cep = document.getElementById("tpCep");
      if(!btn || !cep) return;
      btn.addEventListener("click", ()=> buscarCepAPI(cep.value));
    }

    function setEnderecoFields(data){
      if(!data || typeof data !== "object") return;
      const setVal = (id, val)=>{
        const el = document.getElementById(id);
        if(!el) return;
        el.value = String(val || "").trim();
      };
      const cepRaw = String(data.cep || data.postcode || "").trim();
      if(cepRaw){
        setVal("tpCep", maskCEP(cepRaw));
      }
      setVal("tpRua", data.rua || data.logradouro || data.road || "");
      setVal("tpBairro", data.bairro || data.neighbourhood || data.suburb || "");
      setVal("tpCidade", data.cidade || data.city || data.town || data.village || data.municipality || "");
      const uf = String(data.uf || data.state_code || "").trim().toUpperCase();
      if(uf) setVal("tpUf", uf.slice(0,2));
      if(data.numero) setVal("tpNumero", data.numero);
      if(data.complemento) setVal("tpComplemento", data.complemento);
    }

    function getEnderecoOwnerUid(){
      try{
        const perfil = JSON.parse(localStorage.getItem("doke_usuario_perfil") || "null") || {};
        return String(perfil.uid || perfil.id || localStorage.getItem("doke_uid") || "").trim();
      }catch(_){
        return String(localStorage.getItem("doke_uid") || "").trim();
      }
    }

    function getAddressBookStorageKey(){
      const uid = getEnderecoOwnerUid();
      return uid ? `doke_address_book_${uid}` : "doke_enderecos";
    }

    function getSelectedAddressStorageKey(){
      const uid = getEnderecoOwnerUid();
      return uid ? `doke_selected_address_${uid}` : "doke_selected_address";
    }

    function normalizeEndereco(addr, idx){
      if(!addr || typeof addr !== "object") return null;
      const id = String(addr.id || addr.enderecoId || addr.uuid || `addr-${idx+1}`).trim();
      if(!id) return null;
      return {
        id,
        apelido: String(addr.apelido || addr.nome || addr.label || `Endere�o ${idx + 1}`).trim(),
        cep: String(addr.cep || "").trim(),
        rua: String(addr.rua || addr.logradouro || "").trim(),
        numero: String(addr.numero || "").trim(),
        complemento: String(addr.complemento || "").trim(),
        bairro: String(addr.bairro || "").trim(),
        cidade: String(addr.cidade || "").trim(),
        uf: String(addr.uf || "").trim().toUpperCase(),
        referencia: String(addr.referencia || "").trim(),
        principal: !!(addr.principal || addr.isDefault || addr.default)
      };
    }

    function loadAddressBook(){
      const keys = [getAddressBookStorageKey(), "doke_enderecos"];
      for(const key of keys){
        try{
          const raw = JSON.parse(localStorage.getItem(key) || "null");
          if(!raw) continue;
          const list = Array.isArray(raw) ? raw : (Array.isArray(raw.items) ? raw.items : []);
          const normalized = list.map((r, i)=> normalizeEndereco(r, i)).filter(Boolean);
          if(normalized.length) return normalized;
        }catch(_){}
      }
      return [];
    }

    function enderecoResumo(addr){
      return [
        addr.rua ? `${addr.rua}${addr.numero ? `, ${addr.numero}` : ""}` : "",
        addr.bairro,
        addr.cidade ? `${addr.cidade}${addr.uf ? `/${addr.uf}` : ""}` : "",
        addr.cep ? `CEP ${maskCEP(addr.cep)}` : ""
      ].filter(Boolean).join(" � ");
    }

    function getSelectedAddressId(){
      try{ return String(localStorage.getItem(getSelectedAddressStorageKey()) || "").trim(); }catch(_){ return ""; }
    }

    function saveSelectedAddressId(id){
      try{ localStorage.setItem(getSelectedAddressStorageKey(), String(id || "")); }catch(_){}
    }

    function applyAddressToForm(addr, opts = {}){
      if(!addr) return;
      setEnderecoFields(addr);
      if(opts.save !== false) saveSelectedAddressId(addr.id);
      if(opts.toast !== false) toast("Endere�o aplicado.", "success");
    }

    function renderAddressCards(){
      const wrap = document.getElementById("anr-endereco-cards");
      const manual = document.getElementById("anr-manual-address");
      const toggleBtn = document.getElementById("btn-no-saved-address");
      if(!wrap) return;
      const list = loadAddressBook();
      const selectedId = getSelectedAddressId();
      if(!list.length){
        wrap.innerHTML = '<div class="anr-address-empty">Nenhum endere�o salvo ainda.</div>';
        if(manual) manual.classList.remove("show");
        if(toggleBtn) toggleBtn.innerHTML = "<i class='bx bx-plus-circle'></i> N�o tenho endere�o salvo";
        return;
      }
      wrap.innerHTML = list.map((addr)=>{
        const active = selectedId ? (String(selectedId) === String(addr.id)) : !!addr.principal;
        return `
          <article class="anr-address-card ${active ? "is-active" : ""} ${addr.principal ? "is-principal" : ""}" data-id="${String(addr.id).replace(/"/g, "&quot;")}" role="button" tabindex="0">
            <span class="anr-address-pin"><i class='bx ${addr.principal ? "bxs-check-circle" : "bx-map"}'></i></span>
            <div>
              <p class="anr-address-title">
                ${addr.apelido || "Endere�o"}
                ${addr.principal ? "<span class='anr-address-tag'><i class='bx bxs-star'></i> Principal</span>" : ""}
              </p>
              <p class="anr-address-line">${enderecoResumo(addr)}</p>
            </div>
          </article>
        `;
      }).join("");
      const preferred = list.find((a)=> selectedId ? String(a.id) === String(selectedId) : !!a.principal) || list[0];
      if(preferred) applyAddressToForm(preferred, { toast: false, save: !selectedId });
      if(manual) manual.classList.remove("show");
      if(toggleBtn) toggleBtn.innerHTML = "<i class='bx bx-plus-circle'></i> N�o tenho endere�o salvo";
    }

    function normalizeUfFromState(state){
      const s = String(state || "").trim().toUpperCase();
      if(!s) return "";
      if(s.length === 2) return s;
      const map = {
        "ACRE":"AC","ALAGOAS":"AL","AMAPA":"AP","AMAZONAS":"AM","BAHIA":"BA","CEARA":"CE",
        "DISTRITO FEDERAL":"DF","ESPIRITO SANTO":"ES","GOIAS":"GO","MARANHAO":"MA",
        "MATO GROSSO":"MT","MATO GROSSO DO SUL":"MS","MINAS GERAIS":"MG","PARA":"PA",
        "PARAIBA":"PB","PARANA":"PR","PERNAMBUCO":"PE","PIAUI":"PI","RIO DE JANEIRO":"RJ",
        "RIO GRANDE DO NORTE":"RN","RIO GRANDE DO SUL":"RS","RONDONIA":"RO","RORAIMA":"RR",
        "SANTA CATARINA":"SC","SAO PAULO":"SP","SERGIPE":"SE","TOCANTINS":"TO"
      };
      const normalized = s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return map[normalized] || "";
    }

    function bindLocationButtons(){
      const btnGeo = document.getElementById("btnUsarLocalizacaoAtual");
      const btnOpen = document.getElementById("btn-open-enderecos");
      const btnManual = document.getElementById("btn-no-saved-address");
      const cardsWrap = document.getElementById("anr-endereco-cards");
      const manualWrap = document.getElementById("anr-manual-address");
      const manualRequiredIds = ["tpCep", "tpCidade", "tpUf", "tpBairro", "tpRua", "tpNumero"];

      function setManualAddressRequired(isRequired){
        manualRequiredIds.forEach((id)=>{
          const el = document.getElementById(id);
          if(!el) return;
          if(isRequired) el.setAttribute("required", "required");
          else el.removeAttribute("required");
        });
      }

      renderAddressCards();
      setManualAddressRequired(!!(manualWrap && manualWrap.classList.contains("show")));

      if(btnOpen){
        btnOpen.addEventListener("click", ()=>{
          window.location.href = "enderecos.html?from=tornar-profissional";
        });
      }

      if(btnManual && manualWrap){
        btnManual.addEventListener("click", ()=>{
          const open = manualWrap.classList.toggle("show");
          setManualAddressRequired(open);
          btnManual.innerHTML = open
            ? "<i class='bx bx-x'></i> Fechar endere�o manual"
            : "<i class='bx bx-plus-circle'></i> N�o tenho endere�o salvo";
        });
      }

      if(cardsWrap){
        cardsWrap.addEventListener("click", (ev)=>{
          const card = ev.target.closest(".anr-address-card");
          if(!card) return;
          const id = String(card.getAttribute("data-id") || "").trim();
          if(!id) return;
          const list = loadAddressBook();
          const found = list.find((a)=> String(a.id) === id);
          if(!found) return;
          applyAddressToForm(found);
          setManualAddressRequired(false);
          renderAddressCards();
        });
      }

      if(btnGeo){
        btnGeo.addEventListener("click", async ()=>{
          if(!navigator.geolocation){
            toast("Geolocaliza��o n�o suportada neste navegador.", "error");
            return;
          }
          const old = btnGeo.innerHTML;
          btnGeo.disabled = true;
          btnGeo.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Localizando...";
          try{
            const pos = await new Promise((resolve, reject)=>{
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 0
              });
            });
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`;
            const res = await fetch(url, { headers: { "Accept": "application/json" } });
            const data = await res.json();
            const addr = data?.address || {};
            const postcode = String(addr.postcode || "").replace(/\D/g, "");
            const uf = normalizeUfFromState(addr.state || addr.region || "");
            setEnderecoFields({
              cep: postcode,
              rua: addr.road || addr.pedestrian || addr.cycleway || "",
              bairro: addr.suburb || addr.neighbourhood || addr.quarter || "",
              cidade: addr.city || addr.town || addr.village || addr.municipality || "",
              uf
            });
            if(postcode.length === 8){
              await buscarCepAPI(postcode);
            }
            toast("Localiza��o aplicada no endere�o.", "success");
            if(manualWrap && !manualWrap.classList.contains("show")) manualWrap.classList.add("show");
            setManualAddressRequired(true);
          }catch(e){
            console.warn("Geo erro", e);
            toast("N�o foi poss�vel obter sua localiza��o agora.", "error");
          }finally{
            btnGeo.disabled = false;
            btnGeo.innerHTML = old;
          }
        });
      }
    }

            async function salvar(e){
      e.preventDefault();

      const btn = document.querySelector("#tpForm button[type='submit']");
      const btnOld = btn ? btn.innerHTML : "";
      if(btn){
        btn.disabled = true;
        btn.innerHTML = "Enviando...";
      }

      let completed = false;

      try{
        const uid = await getAuthUid();
        const u = await resolveUsuario(uid);
        if(!u || !uid){
          toast("Fa�a login para continuar.", "error");
          return;
        }

        const telMasked = document.getElementById("tpTelefone")?.value || "";
        const cpfMasked = document.getElementById("tpCpf")?.value || "";
        const nasc = document.getElementById("tpNascimento")?.value || "";
        const cepMasked = document.getElementById("tpCep")?.value || "";
        const uf = (document.getElementById("tpUf")?.value || "").toUpperCase().trim();
        const manualOpen = !!document.getElementById("anr-manual-address")?.classList.contains("show");
        const cidade = (document.getElementById("tpCidade")?.value || "").trim();
        const bairro = (document.getElementById("tpBairro")?.value || "").trim();
        const rua = (document.getElementById("tpRua")?.value || "").trim();
        const n�mero = (document.getElementById("tpNumero")?.value || "").trim();
        const complemento = (document.getElementById("tpComplemento")?.value || "").trim();
        const docFile = document.getElementById("tpDocumento")?.files?.[0] || null;

        const tel = onlyDigits(telMasked);
        const cpf = onlyDigits(cpfMasked);
        const cep = onlyDigits(cepMasked);

        // Valida��es r�pidas
        if(tel.length < 10){ toast("Telefone inv�lido. Use DDD + n�mero.", "error"); return; }
        if(cpf.length !== 11){ toast("CPF inv�lido. Informe 11 d�gitos.", "error"); return; }
        if(calcIdade(nasc) < 18){ toast("Voc� precisa ter 18 anos ou mais.", "error"); return; }
        if(cep.length !== 8){ toast("CEP inv�lido. Informe 8 d�gitos.", "error"); return; }
        if(uf.length !== 2){ toast("UF inv�lida.", "error"); return; }
        if(!cidade || !bairro || !rua || !n�mero){
          toast(manualOpen ? "Preencha o endere�o completo." : "Escolha um endere�o salvo ou abra o endere�o manual.", "error");
          return;
        }
        if(!docFile){ toast("Envie a foto do documento (RG ou CNH).", "error"); return; }

        // Upload documento (Storage)
        let docUrl = null;
        try{
          docUrl = await uploadDocumento(uid, docFile);
        }catch(err){
          console.error(err);
          toast("Erro ao enviar documento. Verifique seu Storage/Bucket.", "error");
          return;
        }

        const basePayload = {
          telefone: tel,
          cpf: cpf,
          data_nascimento: nasc,
          cep: cep,
          uf,
          cidade,
          bairro,
          rua,
          n�mero,
          complemento,
          identidade_url: docUrl,
          status: "pendente",
          updated_at: new Date().toISOString()
        };

        const keyTries = [
          { col: "usuario_id", val: u.id },
          { col: "user_id",    val: uid },
          { col: "uid",        val: uid }
        ];

        const res = await safeWriteRow("profissional_validacao", keyTries, basePayload);
        if(!res.ok){
          console.error(res.error);

          const msg = (res.error && (res.error.message || res.error.error_description) || "Erro ao salvar dados.").toString();

          if(msg.toLowerCase().includes("row-level security")){
            toast("Permiss�o negada (RLS). Rode o SQL do zip para criar pol�ticas.", "error");
          }else if(msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("relation")){
            toast("Tabela profissional_validacao n�o encontrada. Rode o SQL do zip.", "error");
          }else if(msg.toLowerCase().includes("could not find the")){
            toast("Sua tabela profissional_validacao tem colunas diferentes. Rode o SQL do zip (ou ajuste os nomes).", "error");
          }else{
            toast("Erro ao salvar: " + msg, "error");
          }
          return;
        }

        // Marca usu�rio como profissional (mant�m compatibilidade com schemas antigos)
        try{
          const orQ = [];
          if(u.id) orQ.push(`id.eq.${u.id}`);
          if(u.uid) orQ.push(`uid.eq.${u.uid}`);
          const orStr = orQ.join(",");
          const req = orStr
            ? sb.from("usuarios").update({ isProfissional: true }).or(orStr).select("*").maybeSingle()
            : sb.from("usuarios").update({ isProfissional: true }).eq("id", u.id).select("*").maybeSingle();
          const rU = await req;
          const rowU = rU?.data || null;

          const local = JSON.parse(localStorage.getItem("doke_usuario_perfil")||"null") || {};
          const merged = rowU ? rowU : { ...local, isProfissional: true, id: (u.id||local.id), uid: (u.uid||local.uid) };
          merged.isProfissional = true;
          localStorage.setItem("doke_usuario_perfil", JSON.stringify(merged));
        }catch(_e){}

        toast("Dados enviados! Redirecionando para criar seu an�ncio...", "success");
        completed = true;
        setTimeout(()=>{ showObrigado(); }, 900);

      } finally {
        if(btn && !completed){
          btn.disabled = false;
          btn.innerHTML = btnOld;
        }
      }
    }

document.addEventListener("DOMContentLoaded", ()=>{
      bindMasks();
      bindUploadUI();
      bindCepButton();
      bindLocationButtons();
      prefill();
      const form = document.getElementById("tpForm");
      if(form) form.addEventListener("submit", salvar);
    });
  })();