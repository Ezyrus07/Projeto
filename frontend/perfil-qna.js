function looksUUID(v){ return typeof v==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v); }
﻿/* DOKE — Perfil Profissional | Perguntas (estilo marketplace)
   Requer: supabase-init.js (window.sb)
*/
(() => {
  "use strict";

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = (str="") => String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt = (iso) => {
    try{
      const d = new Date(iso);
      return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" });
    }catch(_){ return ""; }
  };

  function getUsuariosTableOrderCompat(){
    const preferred = String(window.__dokeUsuariosTable || window.__dokePerfilUsuariosTable || "").trim();
    if(preferred === "usuarios_legacy") return ["usuarios_legacy", "usuarios"];
    return ["usuarios", "usuarios_legacy"];
  }

  function isUsuariosCompatError(err){
    if(!err) return false;
    const msg = String((err.message||"") + " " + (err.hint||"") + " " + (err.details||"")).toLowerCase();
    return (
      err.code === "PGRST205" ||
      err.code === "PGRST204" ||
      err.code === "22P02" ||
      err.status === 404 ||
      /could not find the table/i.test(msg) ||
      /could not find the .* column/i.test(msg) ||
      /column .* does not exist/i.test(msg) ||
      /invalid input syntax for type uuid/i.test(msg)
    );
  }

  async function runUsuariosCompatQuery(client, requestBuilder){
    if(!client || typeof requestBuilder !== "function"){
      return { data: null, error: null, table: null, uidField: "uid" };
    }

    let lastCompatErr = null;
    for(const table of getUsuariosTableOrderCompat()){
      const uidField = table === "usuarios_legacy" ? "uid_text" : "uid";
      let res = null;
      try{
        res = await requestBuilder({ table, uidField });
      }catch(err){
        if(isUsuariosCompatError(err)){ lastCompatErr = err; continue; }
        throw err;
      }
      const err = res?.error || null;
      if(err && isUsuariosCompatError(err)){
        lastCompatErr = err;
        continue;
      }
      if(!err){
        window.__dokeUsuariosTable = table;
        window.__dokePerfilUsuariosTable = table;
      }
      return { data: res?.data ?? null, error: err, table, uidField };
    }

    return { data: null, error: lastCompatErr, table: null, uidField: "uid" };
  }

  async function getUsuarioByAuthUid(client, authUid){
    const { data, error } = await runUsuariosCompatQuery(client, ({ table, uidField }) =>
      client.from(table).select("*").eq(uidField, authUid).maybeSingle()
    );
    if(error) return { error };
    return { usuario: data || null };
  }
  async function getUsuarioByUsername(client, username){
    const { data, error } = await runUsuariosCompatQuery(client, ({ table }) =>
      client.from(table).select("*").eq("user", username).maybeSingle()
    );
    if(error) return { error };
    return { usuario: data || null };
  }
  async function getUsuarioById(client, id){
    if(looksUUID(id)){
      const r = await runUsuariosCompatQuery(client, ({ table, uidField }) =>
        client.from(table).select("*").eq(uidField, id).maybeSingle()
      );
      if(r.error) return { error: r.error };
      return { usuario: r.data || null };
    }
    const r = await runUsuariosCompatQuery(client, ({ table }) =>
      client.from(table).select("*").eq("id", id).maybeSingle()
    );
    if(r.error) return { error: r.error };
    return { usuario: r.data || null };
  }

  function renderItem(item, opts){
    const { canAnswer, meId } = opts;
    const isAnswered = !!(item.resposta && String(item.resposta).trim().length);
    const isHidden = !!item.oculto;
    const canDeleteOwn = !!(meId && item.asked_by_id === meId && !isAnswered);

    const badges = [];
    badges.push(isAnswered ? `<span class="qna-badge">Respondida</span>` : `<span class="qna-badge gray">Sem resposta</span>`);
    if(isHidden) badges.push(`<span class="qna-badge gray">Oculta</span>`);

    return `
      <div class="qna-item" data-qid="${esc(item.id)}">
        <div class="qna-itemTop">
          <div>
            <p class="qna-q">${esc(item.pergunta || "")}</p>
            <div class="qna-meta">por <b>${esc(item.asked_by_user || item.asked_by_nome || "Usuário")}</b> • ${esc(fmt(item.created_at))}</div>
          </div>
          <div class="qna-badges">${badges.join("")}</div>
        </div>

        ${isAnswered ? `
          <div class="qna-answer">
            <p class="qna-aTitle">Resposta do profissional</p>
            <p class="qna-aText">${esc(item.resposta)}</p>
          </div>
        ` : ``}

        ${(canAnswer || canDeleteOwn) ? `
          <div class="qna-editor">
            <div class="qna-editorRow">
              ${canAnswer ? `
                <button class="dp-secondary" type="button" data-action="toggle-reply">${isAnswered ? "Editar resposta" : "Responder"}</button>
                <button class="dp-secondary" type="button" data-action="toggle-hide">${isHidden ? "Desocultar" : "Ocultar"}</button>
                <button class="dp-secondary" type="button" data-action="delete">Excluir</button>
              ` : ``}
              ${(!canAnswer && canDeleteOwn) ? `
                <button class="dp-secondary" type="button" data-action="delete">Excluir pergunta</button>
              ` : ``}
            </div>
            ${canAnswer ? `
              <div class="qna-reply" style="display:none;">
                <textarea class="dp-textarea" rows="4" placeholder="Escreva a resposta..." data-field="resposta">${esc(item.resposta || "")}</textarea>
                <div class="qna-editorRow">
                  <button class="dp-primary" type="button" data-action="save-reply">Salvar</button>
                  <button class="dp-secondary" type="button" data-action="cancel-reply">Cancelar</button>
                </div>
              </div>
            ` : ``}
          </div>
        ` : ``}
      </div>
    `;
  }

  async function main(){
    const client = window.sb;
    const section = $("#qnaSection");
    if(!client || !section) return;

    const listEl = $("#qnaList");
    const emptyEl = $("#qnaEmpty");
    const moreWrap = $("#qnaMoreWrap");
    const moreBtn = $("#qnaMoreBtn");
    const askWrap = $("#qnaAskWrap");
    const askBtn = $("#qnaAskBtn");
    const askTxt = $("#qnaQuestionText");
    const loginHint = $("#qnaLoginHint");

    // determine target
    const params = new URLSearchParams(location.search);
    const targetIdParam = params.get("id");
    const targetUidParam = params.get("uid");
    const targetUserParam = params.get("user");
    let target = null;

    if(targetIdParam){
      const r = await getUsuarioById(client, targetIdParam);
      if(r.error) console.error(r.error);
      target = r.usuario;
    } else if(targetUidParam){
      const r = await getUsuarioById(client, targetUidParam);
      if(r.error) console.error(r.error);
      target = r.usuario;
    } else if(targetUserParam){
      const raw = String(targetUserParam || "");
      const clean = raw.startsWith("@") ? raw.slice(1) : raw;
      let r = await getUsuarioByUsername(client, clean);
      if(!r.usuario && raw.startsWith("@")){
        r = await getUsuarioByUsername(client, raw.slice(1));
      }
      if(r.error) console.error(r.error);
      target = r.usuario;
    }

    if(!target || !target.id){
      emptyEl.textContent = "Não foi possível carregar as perguntas deste perfil.";
      emptyEl.style.display = "";
      return;
    }

    // auth + me
    const sess = await client.auth.getSession();
    const authUser = sess?.data?.session?.user || null;
    let me = null;
    if(authUser){
      const r = await getUsuarioByAuthUid(client, authUser.id);
      if(r.error) console.error(r.error);
      me = r.usuario || null;
    }

    const canAnswer = !!(me && (me.id === target.id || String(me.uid) === String(target.uid)));
    const meId = me?.id || null;

    // UI visibility
    if(!authUser){
      askWrap.style.display = "none";
      loginHint.style.display = "";
    } else {
      askWrap.style.display = "";
      loginHint.style.display = "none";
    }

    // filters
    let filter = "all";
    $$(".qna-chip").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".qna-chip").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        filter = btn.dataset.filter || "all";
        // reset and reload
        state.offset = 0;
        state.items = [];
        load(true);
      });
    });

    // pagination state
    const state = {
      limit: 12,
      offset: 0,
      done: false,
      items: []
    };

    async function fetchPage(){
      let q = client.from("perguntas_profissional")
        .select("*")
        .eq("profissional_id", target.id)
        .order("created_at", { ascending: false })
        .range(state.offset, state.offset + state.limit - 1);

      if(!canAnswer){
        q = q.eq("oculto", false);
      }
      const { data, error } = await q;
      if(error) throw error;
      return data || [];
    }

    function applyFilter(items){
      if(filter === "answered") return items.filter(i => (i.resposta && String(i.resposta).trim().length));
      if(filter === "unanswered") return items.filter(i => !(i.resposta && String(i.resposta).trim().length));
      if(filter === "hidden") return items.filter(i => !!i.oculto);
      return items;
    }

    function render(){
      const visible = applyFilter(state.items);
      listEl.innerHTML = visible.map(it => renderItem(it, { canAnswer, meId })).join("");
      emptyEl.style.display = visible.length ? "none" : "";
      moreWrap.style.display = (!state.done) ? "" : "none";
      bindItemActions();
    }

    function bindItemActions(){
      $$(".qna-item").forEach(itemEl => {
        const qid = itemEl.getAttribute("data-qid");
        const getRow = () => state.items.find(x => String(x.id) === String(qid));
        const replyBox = itemEl.querySelector(".qna-reply");
        const replyTa = itemEl.querySelector('textarea[data-field="resposta"]');

        itemEl.querySelectorAll("[data-action]").forEach(btn => {
          btn.addEventListener("click", async () => {
            const action = btn.getAttribute("data-action");
            const row = getRow();
            if(!row) return;

            try{
              if(action === "toggle-reply"){
                if(!replyBox) return;
                replyBox.style.display = (replyBox.style.display === "none" ? "" : "none");
              }
              if(action === "cancel-reply"){
                if(!replyBox) return;
                replyBox.style.display = "none";
                if(replyTa) replyTa.value = row.resposta || "";
              }
              if(action === "save-reply"){
                if(!canAnswer) return;
                const resposta = (replyTa?.value || "").trim();
                const payload = { resposta: resposta || null, answered_at: resposta ? new Date().toISOString() : null };
                const { error } = await client.from("perguntas_profissional").update(payload).eq("id", row.id);
                if(error) throw error;
                row.resposta = payload.resposta;
                row.answered_at = payload.answered_at;
                replyBox.style.display = "none";
                render();
                window.mostrarToast ? window.mostrarToast("Resposta salva!") : alert("Resposta salva!");
              }
              if(action === "toggle-hide"){
                if(!canAnswer) return;
                const { error } = await client.from("perguntas_profissional").update({ oculto: !row.oculto }).eq("id", row.id);
                if(error) throw error;
                row.oculto = !row.oculto;
                render();
                window.mostrarToast ? window.mostrarToast(row.oculto ? "Pergunta oculta." : "Pergunta visível.") : null;
              }
              if(action === "delete"){
                // permite dono ou autor (se não respondida)
                const isAnswered = !!(row.resposta && String(row.resposta).trim().length);
                const canDeleteOwn = !!(meId && row.asked_by_id === meId && !isAnswered);
                if(!(canAnswer || canDeleteOwn)) return;

                if(!confirm("Excluir esta pergunta?")) return;
                const { error } = await client.from("perguntas_profissional").delete().eq("id", row.id);
                if(error) throw error;
                state.items = state.items.filter(x => String(x.id) !== String(row.id));
                render();
                window.mostrarToast ? window.mostrarToast("Pergunta excluída.") : null;
              }
            }catch(err){
              console.error(err);
              window.mostrarToast ? window.mostrarToast("Erro: " + (err?.message || "não foi possível concluir.")) : alert(err?.message || "Erro");
            }
          });
        });
      });
    }

    async function load(reset=false){
      try{
        if(reset){
          listEl.innerHTML = "";
          emptyEl.style.display = "none";
          state.done = false;
          state.offset = 0;
        }
        if(state.done) return;

        moreBtn.disabled = true;
        moreBtn.textContent = "Carregando...";
        const page = await fetchPage();
        if(page.length < state.limit) state.done = true;
        state.offset += state.limit;
        state.items = state.items.concat(page);
        render();
      }catch(err){
        console.error(err);
        emptyEl.textContent = "Erro ao carregar perguntas.";
        emptyEl.style.display = "";
      }finally{
        moreBtn.disabled = false;
        moreBtn.textContent = "Ver mais";
      }
    }

    moreBtn.addEventListener("click", () => load(false));

    // Ask
    askBtn.addEventListener("click", async () => {
      try{
        if(!authUser || !me) return;
        const pergunta = (askTxt.value || "").trim();
        if(pergunta.length < 6){
          window.mostrarToast ? window.mostrarToast("Escreva uma pergunta mais detalhada.") : alert("Escreva uma pergunta mais detalhada.");
          return;
        }
        askBtn.disabled = true;
        askBtn.textContent = "Enviando...";

        const payload = {
          profissional_id: target.id,
          asked_by_id: me.id,
          pergunta,
          resposta: null,
          oculto: false,
          asked_by_nome: me.nome || null,
          asked_by_user: me.user || null,
          asked_by_avatar: me.foto_url || me.foto || null
        };

        const { data, error } = await client.from("perguntas_profissional").insert(payload).select("*").single();
        if(error) throw error;

        // prepend
        state.items.unshift(data);
        askTxt.value = "";
        // volta pro topo da lista
        render();
        window.mostrarToast ? window.mostrarToast("Pergunta enviada!") : alert("Pergunta enviada!");
      }catch(err){
        console.error(err);
        window.mostrarToast ? window.mostrarToast("Erro: " + (err?.message || "não foi possível enviar.")) : alert(err?.message || "Erro");
      }finally{
        askBtn.disabled = false;
        askBtn.textContent = "Perguntar";
      }
    });

    // Owner-only filter
    const hiddenChip = $("#qnaFilterHidden");
    if(hiddenChip){
      hiddenChip.style.display = canAnswer ? "" : "none";
    }

    // initial load
    load(true);
  }

  document.addEventListener("DOMContentLoaded", main);
})();

