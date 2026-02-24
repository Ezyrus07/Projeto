
    (function(){
      const state = { pedidos: [], filter: 'all', query: '', sort: 'recent', detailsById: new Map(), activeChatUrl: '', selectMode: false, selected: new Set() };
      const el = {
        grid: document.getElementById('ordersGrid'),
        empty: document.getElementById('emptyState'),
        subtitle: document.getElementById('ordersSubtitle'),
        count: document.getElementById('heroCount'),
        statToday: document.getElementById('statToday'),
        statProgress: document.getElementById('statProgress'),
        statUrgent: document.getElementById('statUrgent'),
        search: document.getElementById('searchInput'),
        sortBtn: document.getElementById('sortBtn'),
        sortLabel: document.getElementById('sortLabel'),
        selectBtn: document.getElementById('selectBtn'),
        selectLabel: document.getElementById('selectLabel'),
        refreshBtn: document.getElementById('refreshBtn'),
        chips: Array.from(document.querySelectorAll('.chip[data-filter]')),
        toast: document.getElementById('toast'),
        inlineChatShell: document.getElementById('inlineChatShell'),
        inlineChatFrame: document.getElementById('inlineChatFrame'),
        inlineChatBack: document.getElementById('inlineChatBack'),
        inlineChatOpenTab: document.getElementById('inlineChatOpenTab'),
        inlineChatTitle: document.getElementById('inlineChatTitle'),
        inlineChatSub: document.getElementById('inlineChatSub'),
        detailsModal: document.getElementById('detailsModal'),
        detailsCloseBtn: document.getElementById('detailsCloseBtn'),
        detailsSubtitle: document.getElementById('detailsSubtitle'),
        detailsGrid: document.getElementById('detailsGrid'),
        detailsDescription: document.getElementById('detailsDescription'),
        detailsTriagem: document.getElementById('detailsTriagem'),
        detailsAnexos: document.getElementById('detailsAnexos')
      };

      function showToast(msg){
        if(!el.toast) return;
        el.toast.textContent = String(msg || 'OK');
        el.toast.classList.add('show');
        clearTimeout(window.__ordersToastTimer);
        window.__ordersToastTimer = setTimeout(() => el.toast.classList.remove('show'), 1800);
      }

      function esc(v){
        return String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
      }

      function parseJSON(raw){
        if(!raw) return null;
        try { return JSON.parse(raw); } catch (_) { return null; }
      }

      function asArray(input){
        if(Array.isArray(input)) return input;
        if(input && typeof input === 'object'){
          if(Array.isArray(input.items)) return input.items;
          if(Array.isArray(input.data)) return input.data;
          if(Array.isArray(input.rows)) return input.rows;
          if(Array.isArray(input.pedidos)) return input.pedidos;
          if(Array.isArray(input.orcamentos)) return input.orcamentos;
        }
        return [];
      }

      function pick(obj, keys, fallback){
        for(const k of keys){
          const v = obj ? obj[k] : null;
          if(v == null) continue;
          const s = String(v).trim();
          if(s) return s;
        }
        return fallback;
      }

      function toDate(v){
        if(!v) return null;
        if(v instanceof Date && Number.isFinite(v.getTime())) return v;
        if(typeof v === 'number'){
          const d = new Date(v > 1e12 ? v : v * 1000);
          return Number.isFinite(d.getTime()) ? d : null;
        }
        if(typeof v === 'string'){
          const n = Number(v.trim());
          if(Number.isFinite(n)){
            const dn = new Date(v.trim().length >= 13 ? n : n * 1000);
            if(Number.isFinite(dn.getTime())) return dn;
          }
          const d = new Date(v);
          return Number.isFinite(d.getTime()) ? d : null;
        }
        if(typeof v === 'object'){
          if(typeof v.toDate === 'function'){
            const d = v.toDate();
            if(d instanceof Date && Number.isFinite(d.getTime())) return d;
          }
          if(typeof v.seconds === 'number') return new Date(v.seconds * 1000);
          if(typeof v._seconds === 'number') return new Date(v._seconds * 1000);
        }
        return null;
      }

      function formatUpdated(v){
        const d = toDate(v);
        if(!d) return String(v || 'recentemente');
        const diff = Date.now() - d.getTime();
        if(diff < 60000) return 'agora';
        if(diff < 3600000) return `ha ${Math.max(1, Math.round(diff/60000))} min`;
        if(diff < 86400000) return `ha ${Math.max(1, Math.round(diff/3600000))} h`;
        return d.toLocaleDateString('pt-BR');
      }

      function statusCode(raw){
        const s = String(raw || 'pendente').toLowerCase();
        if(s.includes('and') || s.includes('aceit') || s.includes('pago')) return 'andamento';
        if(s.includes('fin') || s.includes('conc')) return 'finalizado';
        return 'pendente';
      }

      function statusLabel(s){
        if(s === 'andamento') return 'Em andamento';
        if(s === 'finalizado') return 'Finalizado';
        return 'Pendente';
      }

      function statusClass(s){
        if(s === 'andamento') return 'progress';
        if(s === 'finalizado') return 'done';
        return 'pending';
      }

      function looksLikeImage(url){
        const s = String(url || '').toLowerCase();
        return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/.test(s) || s.includes('/storage/v1/object/public/');
      }

      function normalizeMediaUrl(v){
        if(!v) return '';
        if(typeof v === 'string') return v.trim();
        if(typeof v === 'object'){
          return String(v.url || v.src || v.link || '').trim();
        }
        return '';
      }

      function normalizeId(v){
        const id = String(v == null ? '' : v).trim();
        if(!id) return '';
        if(/^PD-\d+$/i.test(id)) return '';
        if(/^TEMP-/i.test(id)) return '';
        if(/^NEW-/i.test(id)) return '';
        return id;
      }

      function normalizePedido(row, idx, forcedId){
        if(!row || typeof row !== 'object') return null;
        const id = normalizeId(forcedId || pick(row, ['id','codigo','pedidoId','idPedido','orderId','orcamentoId','chatId','threadId','postid','docId'], ''));
        if(!id) return null;

        const uidAtual = resolveUid();
        const deUid = pick(row, ['deUid','deuid','de_uid','clienteUid','clienteuid','cliente_uid'], '');
        const paraUid = pick(row, ['paraUid','parauid','para_uid','prestadorUid','prestadoruid','prestador_uid'], '');
        const isSouCliente = !!uidAtual && !!deUid && String(uidAtual) === String(deUid);
        const isSouProfissional = !!uidAtual && !!paraUid && String(uidAtual) === String(paraUid);

        const nome = isSouCliente
          ? pick(row, ['paraNome','nomePrestador','profissionalNome','nome','nomeCliente','clienteNome','cliente','usuarioNome','userName','deNome'], 'Cliente')
          : isSouProfissional
            ? pick(row, ['deNome','nomeCliente','clienteNome','nome','cliente','usuarioNome','userName','paraNome'], 'Cliente')
            : pick(row, ['nome','nomeCliente','clienteNome','cliente','usuarioNome','userName','deNome','paraNome'], 'Cliente');

        const usuarioBase = isSouCliente
          ? pick(row, ['paraUser','usuarioPrestador','usernamePrestador','usuario','username','user','handle'], nome || 'cliente')
          : isSouProfissional
            ? pick(row, ['deUser','usuarioCliente','usernameCliente','usuario','username','user','handle'], nome || 'cliente')
            : pick(row, ['usuario','username','user','handle','deUser','paraUser'], nome || 'cliente');
        const usuario = usuarioBase.startsWith('@') ? usuarioBase : `@${usuarioBase.toLowerCase().replace(/\s+/g,'.')}`;
        const titulo = pick(row, ['titulo','servicoReferencia','nomeServico','servico','assunto','pedidoTitulo','orcamentoTitulo','title'], 'Pedido');
        const descricao = pick(row, ['descricao','descricaoBase','mensagem','mensagemInicial','detalhes','observacoes','preview','ultimaMensagem'], 'Sem detalhes adicionais.');
        const tipoRaw = pick(row, ['tipo','tipoPedido','categoriaTipo'], '');
        const tipo = tipoRaw || (String(titulo).toLowerCase().includes('orc') ? 'Orcamento' : 'Servico');
        const status = statusCode(pick(row, ['status','statusPedido','situacao','estado'], 'pendente'));

        const updatedRaw = pick(row, ['dataAtualizacao','updatedAt','updatedat','ultimaAtualizacao','timestamp','lastMessageAt','createdAt'], '');
        const createdRaw = pick(row, ['criadoEm','createdAt','createdat','dataCriacao','dataPedido'], updatedRaw || new Date().toISOString());

        return {
          id,
          usuario,
          nome,
          avatar: pick(row, isSouCliente
            ? ['paraFoto','fotoPrestador','profilePicture','avatar','foto','fotoPerfil','profissionalFoto','deFoto','fotoCliente']
            : isSouProfissional
              ? ['deFoto','fotoCliente','profilePicture','avatar','foto','fotoPerfil','paraFoto','profissionalFoto']
              : ['avatar','foto','fotoCliente','fotoPerfil','profilePicture','deFoto','paraFoto','clienteFoto','profissionalFoto']
          , 'assets/Imagens/user_placeholder.png'),
          titulo,
          descricao,
          tipo,
          status,
          urgente: !!(row.urgente || String(row.prioridade || '').toLowerCase() === 'alta' || String(row.priority || '').toLowerCase() === 'high'),
          prazo: pick(row, ['prazo','paraQuando','dataEspecifica','deadline','turno'], 'A combinar'),
          atualizado: formatUpdated(updatedRaw || createdRaw),
          valor: pick(row, ['valor','preco','orcamento','faixa','precoFormatado','valorOrcamento','valor_orcamento'], 'Sob Orcamento'),
          naoLidas: Number(row.naoLidas || row.naolidas || row.unread || row.unreadCount || row.mensagensNaoLidas || row.qtdNaoLidas || 0) || 0,
          criadoEm: (toDate(createdRaw) || new Date()).toISOString(),
          categoria: pick(row, ['categoria','area','segmento','tipoServico'], 'Geral'),
          deUid,
          paraUid,
          anuncioId: pick(row, ['anuncioId','anuncio_id','aid','anuncioid'], ''),
          servicoReferencia: pick(row, ['servicoReferencia','titulo','nomeServico','servico'], ''),
          mensagemInicial: pick(row, ['mensagemInicial','descricao','descricaoBase','detalhes'], ''),
          descricaoBase: pick(row, ['descricaoBase','descricao','mensagemInicial'], ''),
          paraQuando: pick(row, ['paraQuando','prazo','dataEspecifica'], ''),
          dataEspecifica: pick(row, ['dataEspecifica'], ''),
          turno: pick(row, ['turno'], ''),
          respostasTriagem: Array.isArray(row.respostasTriagem) ? row.respostasTriagem : [],
          localizacao: row.localizacao || row.localização || row['localizacao'] || row['localização'] || null,
          modoAtend: pick(row, ['modoAtend','modo_atend'], ''),
          statusOriginal: pick(row, ['status','statusPedido','situacao','estado'], ''),
          anexos: Array.isArray(row.anexos) ? row.anexos : []
        };
      }

      function mergePedidos(list){
        const map = new Map();
        (list || []).forEach((p) => {
          if(!p || !p.id) return;
          const key = String(p.id);
          const cur = map.get(key);
          if(!cur){ map.set(key, {...p}); return; }
          const next = {...cur};
          Object.keys(p).forEach((k) => {
            const v = p[k];
            if(k === 'naoLidas'){ next[k] = Math.max(Number(next[k] || 0), Number(v || 0)); return; }
            if(k === 'descricao' && String(v || '').length > String(next[k] || '').length){ next[k] = v; return; }
            if(Array.isArray(v) && v.length && (!Array.isArray(next[k]) || !next[k].length)){ next[k] = v; return; }
            if(v && typeof v === 'object' && !Array.isArray(v) && (!next[k] || typeof next[k] !== 'object' || Array.isArray(next[k]))){ next[k] = v; return; }
            if((next[k] == null || String(next[k]).trim() === '' || String(next[k]) === '—') && String(v ?? '').trim() !== '') next[k] = v;
          });
          map.set(key, next);
        });
        return Array.from(map.values());
      }

      function looksPedidoRow(row){
        if(!row || typeof row !== 'object') return false;
        const id = normalizeId(pick(row, ['id','codigo','pedidoId','idPedido','orderId','orcamentoId','chatId','threadId','postid','docId'], ''));
        if(!id) return false;
        const directSignals = [
          row.pedidoId, row.idPedido, row.orcamentoId, row.statusPedido, row.paraQuando,
          row.dataEspecifica, row.prazo, row.descricaoBase, row.respostasTriagem,
          row.formularioRespostas, row.modoAtend, row.localizacao, row.localização, row.servicoReferencia
        ];
        if(directSignals.some(Boolean)) return true;
        const keys = Object.keys(row).map((k) => String(k || '').toLowerCase());
        return keys.some((k) =>
          k.includes('pedido') ||
          k.includes('orcamento') ||
          k.includes('prazo') ||
          k.includes('triagem')
        );
      }

      function loadLocal(){
        let list = [];
        if(Array.isArray(window.pedidosCache)){
          list = list.concat(window.pedidosCache.map((r,i)=>normalizePedido(r,i)).filter(Boolean));
        }

        const primaryKeys = [
          'doke_pedidos','pedidos','DOKE_PEDIDOS','meus_pedidos','cachePedidos','doke_cache_pedidos',
          'orcamentos','doke_orcamentos','orcamentosCache','doke_orcamentos_cache','doke_cache_orcamentos','orcamentos_pedidos'
        ];

        primaryKeys.forEach((key) => {
          const arr = asArray(parseJSON(localStorage.getItem(key)));
          arr.forEach((row, idx) => {
            const n = normalizePedido(row, idx);
            if(n) list.push(n);
          });
        });

        const singleRows = [
          parseJSON(localStorage.getItem('doke_pedido_contexto')),
          parseJSON(localStorage.getItem('doke_pedido_detalhes')),
          parseJSON(localStorage.getItem('pedidoAtual')),
          parseJSON(localStorage.getItem('doke_chat_prefill')),
          parseJSON(localStorage.getItem('pedidoSelecionado'))
        ].filter(Boolean);
        singleRows.forEach((row, idx) => {
          const n = normalizePedido(row, idx);
          if(n) list.push(n);
        });

        return mergePedidos(list);
      }
      function resolveUid(){
        const perfil = parseJSON(localStorage.getItem('doke_usuario_perfil')) || {};
        return String(window.auth?.currentUser?.uid || window.firebaseAuth?.currentUser?.uid || localStorage.getItem('doke_uid') || perfil.uid || perfil.id || '').trim();
      }

      function mine(row, uid){
        if(!uid) return true;
        const fields = [
          row.deUid,row.deuid,row.de_uid,row.clienteUid,row.clienteuid,row.cliente_uid,row.uidCliente,row.uid_cliente,row.solicitanteUid,row.solicitante_uid,
          row.paraUid,row.parauid,row.para_uid,row.prestadorUid,row.prestadoruid,row.prestador_uid,row.profissionalUid,row.profissionaluid,row.profissional_uid,row.uidPrestador,row.uid_prestador,
          row.participante1,row.participante2,row.uid1,row.uid2,row.clienteId,row.profissionalId
        ].map(v => String(v || '').trim()).filter(Boolean);
        if(Array.isArray(row.participantes)) fields.push(...row.participantes.map(v => String(v || '').trim()).filter(Boolean));
        return fields.includes(String(uid));
      }

      async function loadFirestore(){
        const { getFirestore, collection, query, limit, getDocs } = window || {};
        if(typeof getFirestore !== 'function' || typeof collection !== 'function' || typeof query !== 'function' || typeof limit !== 'function' || typeof getDocs !== 'function') return [];
        const uid = resolveUid();
        const db = window.db || getFirestore();

        try{
          const snap = await getDocs(query(collection(db, 'pedidos'), limit(300)));
          const out = [];
          let idx = 0;
          snap.forEach((d) => {
            const row = d.data() || {};
            if(!mine(row, uid)) return;
            const n = normalizePedido(row, idx++, d.id);
            if(n) out.push(n);
          });
          return mergePedidos(out);
        }catch(err){
          console.warn('Firestore pedidos erro:', err);
          return [];
        }
      }

      function sortList(list){
        const arr = [...list];
        if(state.sort === 'updated') return arr.sort((a,b)=>String(a.atualizado).localeCompare(String(b.atualizado), 'pt-BR'));
        if(state.sort === 'unread') return arr.sort((a,b)=>Number(b.naoLidas||0)-Number(a.naoLidas||0) || (new Date(b.criadoEm)-new Date(a.criadoEm)));
        if(state.sort === 'urgent') return arr.sort((a,b)=>Number(b.urgente)-Number(a.urgente) || (new Date(b.criadoEm)-new Date(a.criadoEm)));
        return arr.sort((a,b)=>new Date(b.criadoEm)-new Date(a.criadoEm));
      }

      function filtered(){
        let arr = [...state.pedidos];
        if(state.filter === 'pending') arr = arr.filter(p=>p.status === 'pendente');
        if(state.filter === 'progress') arr = arr.filter(p=>p.status === 'andamento');
        if(state.filter === 'done') arr = arr.filter(p=>p.status === 'finalizado');
        if(state.filter === 'urgent') arr = arr.filter(p=>p.urgente);

        const q = state.query.trim().toLowerCase();
        if(q){
          arr = arr.filter(p => [p.id,p.nome,p.usuario,p.titulo,p.descricao,p.categoria,p.tipo,p.prazo,p.valor].filter(Boolean).join(' ').toLowerCase().includes(q));
        }

        return sortList(arr);
      }

      function card(p){
        const selected = state.selected.has(String(p.id));
        return `
          <article class="card ${selected ? 'selected' : ''}" data-id="${esc(p.id)}">
            <div class="card-top">
              <div class="tags">
                <span class="tag type"><i class='bx bx-receipt'></i>${esc(p.tipo)}</span>
                <span class="tag ${statusClass(p.status)}">${esc(statusLabel(p.status))}</span>
                ${p.urgente ? `<span class="tag urgent"><i class='bx bx-error'></i>Urgente</span>` : ''}
              </div>
              <button class="card-select" type="button" data-action="select" data-id="${esc(p.id)}" aria-label="Selecionar pedido">
                <i class='bx ${selected ? 'bxs-check-circle' : 'bx-circle'}'></i>
              </button>
            </div>

            <div class="user">
              <img src="${esc(normalizeMediaUrl(p.avatar) || 'assets/Imagens/user_placeholder.png')}" alt="Avatar" onerror="this.onerror=null;this.src='assets/Imagens/user_placeholder.png'"/>
              <div class="user-meta">
                <strong>${esc(p.usuario || p.nome)}</strong>
                <span>${esc(p.id)} • ${esc(p.categoria || 'Geral')}</span>
              </div>
            </div>

            <h3 class="title">${esc(p.titulo)}</h3>
            <p class="desc">${esc(p.descricao || 'Sem detalhes adicionais.')}</p>

            <div class="meta">
              <div class="meta-item"><i class='bx bx-time-five'></i><div><small>Prazo</small><strong>${esc(p.prazo || 'A combinar')}</strong></div></div>
              <div class="meta-item"><i class='bx bx-refresh'></i><div><small>Atualizado</small><strong>${esc(p.atualizado || 'recentemente')}</strong></div></div>
              <div class="meta-item"><i class='bx bx-wallet'></i><div><small>Valor</small><strong>${esc(String(p.valor ?? 'Sob Orcamento'))}</strong></div></div>
              <div class="meta-item"><i class='bx bx-message-dots'></i><div><small>Chat</small><strong>${p.naoLidas ? `${p.naoLidas} nao lida${p.naoLidas > 1 ? 's' : ''}` : 'Sem novas'}</strong></div></div>
            </div>

            <div class="footer">
              <span class="unread"><i class='bx bx-message-rounded-dots'></i>${p.naoLidas ? `${p.naoLidas} novas` : 'Sem novas'}</span>
              <div class="actions">
                <button class="btn-order primary" type="button" data-action="chat" data-id="${esc(p.id)}"><i class='bx bx-message-square-detail'></i>Abrir chat</button>
                <button class="btn-order" type="button" data-action="details" data-id="${esc(p.id)}"><i class='bx bx-file'></i>Detalhes</button>
              </div>
            </div>
          </article>
        `;
      }

      function counters(list){
        return {
          all: list.length,
          today: list.filter(p => String(p.atualizado).includes('agora') || String(p.atualizado).includes('ha')).length,
          progress: list.filter(p => p.status === 'andamento').length,
          urgent: list.filter(p => p.urgente).length
        };
      }

      function render(){
        const list = filtered();
        const c = counters(state.pedidos);
        const existing = new Set((state.pedidos || []).map((p) => String(p.id)));
        Array.from(state.selected).forEach((id) => { if(!existing.has(String(id))) state.selected.delete(String(id)); });
        document.body.classList.toggle('select-mode', !!state.selectMode);
        el.count.textContent = String(c.all);
        el.statToday.textContent = String(c.today);
        el.statProgress.textContent = String(c.progress);
        el.statUrgent.textContent = String(c.urgent);
        el.subtitle.textContent = list.length ? `Mostrando ${list.length} pedido${list.length > 1 ? 's' : ''}` : 'Nenhum pedido encontrado';
        el.grid.innerHTML = list.map(card).join('');
        el.empty.classList.toggle('show', list.length === 0);
        el.grid.style.display = list.length ? 'grid' : 'none';
        el.chips.forEach(ch => ch.classList.toggle('active', ch.dataset.filter === state.filter));
        if(el.selectLabel){
          const total = state.selected.size;
          el.selectLabel.textContent = state.selectMode ? (total ? `${total} selecionado${total > 1 ? 's' : ''}` : 'Cancelar') : 'Selecionar';
        }
      }

      function sortLabel(){
        if(state.sort === 'updated') return 'Atualizacao';
        if(state.sort === 'unread') return 'Nao lidas';
        if(state.sort === 'urgent') return 'Urgentes';
        return 'Mais recentes';
      }

      function nextSort(){
        if(state.sort === 'recent') state.sort = 'unread';
        else if(state.sort === 'unread') state.sort = 'urgent';
        else if(state.sort === 'urgent') state.sort = 'updated';
        else state.sort = 'recent';
        el.sortLabel.textContent = sortLabel();
      }

      function byId(id){
        return state.pedidos.find(p => String(p.id) === String(id)) || null;
      }

      function detailsValue(v, fallback){
        const s = String(v == null ? '' : v).trim();
        return s || (fallback || '-');
      }

      async function fetchPedidoCompleto(p){
        if(!p || !p.id) return null;
        const pid = String(p.id);
        const cached = state.detailsById.get(pid);
        if(cached) return mergePedidos([p, cached])[0] || p;

        const { getFirestore, getDoc, doc } = window || {};
        if(typeof getFirestore !== 'function' || typeof getDoc !== 'function' || typeof doc !== 'function'){
          return p;
        }

        try{
          const db = window.db || getFirestore();
          const snap = await getDoc(doc(db, 'pedidos', pid));
          if(!snap.exists()) return p;
          const row = snap.data() || {};
          const normalized = normalizePedido(row, 0, pid);
          if(!normalized) return p;
          const merged = mergePedidos([p, normalized, {
            id: pid,
            respostasTriagem: Array.isArray(row.respostasTriagem) ? row.respostasTriagem : [],
            localizacao: row.localizacao || row.localização || row['localizacao'] || row['localização'] || null,
            mensagemInicial: pick(row, ['mensagemInicial','descricaoBase','descricao'], normalized.mensagemInicial || ''),
            descricaoBase: pick(row, ['descricaoBase','mensagemInicial','descricao'], normalized.descricaoBase || ''),
            paraQuando: pick(row, ['paraQuando','prazo','dataEspecifica'], normalized.paraQuando || ''),
            turno: pick(row, ['turno'], normalized.turno || ''),
            modoAtend: pick(row, ['modoAtend','modo_atend'], normalized.modoAtend || ''),
            servicoReferencia: pick(row, ['servicoReferencia','titulo','nomeServico','servico'], normalized.servicoReferencia || '')
          }])[0];

          if(merged){
            state.detailsById.set(pid, merged);
            state.pedidos = mergePedidos([...(state.pedidos || []), merged]);
            render();
            return merged;
          }
          return p;
        }catch(err){
          console.warn('Falha ao carregar detalhes do pedido:', err);
          return p;
        }
      }

            function collectAnexos(p){
        const out = [];
        const pushUrl = (url, name) => {
          const u = normalizeMediaUrl(url);
          if(!u) return;
          if(out.some((item) => item.url === u)) return;
          out.push({ url: u, name: name || '' });
        };

        if(Array.isArray(p.anexos)){
          p.anexos.forEach((a, idx) => {
            if(typeof a === 'string') pushUrl(a, `Anexo ${idx + 1}`);
            else if(a && typeof a === 'object') pushUrl(a.url || a.src || a.link, a.nome || a.name || `Anexo ${idx + 1}`);
          });
        }

        const triagem = Array.isArray(p.respostasTriagem) ? p.respostasTriagem : [];
        triagem.forEach((row) => {
          const raw = typeof row === 'object' ? String(row.resposta || '') : String(row || '');
          const namedMatch = raw.match(/^\s*([^\n]+?)\s*-\s*https?:\/\//i);
          const maybeName = namedMatch ? namedMatch[1].trim() : '';
          const matches = raw.match(/https?:\/\/[^\s)]+/g) || [];
          matches.forEach((url) => {
            const clean = url.replace(/[.,;!?]+$/, '');
            const name = maybeName || clean.split('/').pop() || 'Anexo';
            pushUrl(clean, name);
          });
        });

        return out;
      }

      function renderDetailsModal(p){
        if(!p) return;
        const locObj = p.localizacao || {};
        const locText = [
          locObj.endereco || locObj['endereço'] || '',
          locObj.numero || locObj['número'] || '',
          locObj.complemento || '',
          locObj.referencia || ''
        ].map((v)=>String(v || '').trim()).filter(Boolean).join(', ');

        const rows = [
          ['ID', detailsValue(p.id)],
          ['Cliente', detailsValue(p.nome || p.usuario, 'Cliente')],
          ['Status', detailsValue(statusLabel(p.status))],
          ['Tipo', detailsValue(p.tipo)],
          ['Prazo', detailsValue(p.paraQuando || p.prazo, 'A combinar')],
          ['Turno', detailsValue(p.turno, 'Nao informado')],
          ['Modo', detailsValue(p.modoAtend, 'Nao informado')],
          ['Valor', detailsValue(p.valor, 'Sob orcamento')]
        ];

        el.detailsSubtitle.textContent = `${detailsValue(p.usuario || p.nome, '@cliente')} • ${detailsValue(p.categoria, 'Geral')}`;
        el.detailsGrid.innerHTML = rows.map(([k,v]) => `<div class="details-item"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('');
        el.detailsDescription.textContent = detailsValue(p.mensagemInicial || p.descricaoBase || p.descricao, 'Sem descricao.');

        const triagem = Array.isArray(p.respostasTriagem) ? p.respostasTriagem : [];
        const triagemRows = [];
        if(locText){
          triagemRows.push({ pergunta:'Local', resposta: locText });
        }
        triagem.forEach((item, idx) => {
          if(item && typeof item === 'object'){
            triagemRows.push({
              pergunta: detailsValue(item.pergunta, `Pergunta ${idx + 1}`),
              resposta: detailsValue(item.resposta, '')
            });
          }else if(item != null){
            triagemRows.push({ pergunta:`Triagem ${idx + 1}`, resposta: detailsValue(item, '') });
          }
        });
        if(!triagemRows.length){
          triagemRows.push({ pergunta:'Triagem', resposta:'Sem respostas de triagem neste pedido.' });
        }
        el.detailsTriagem.innerHTML = triagemRows.map((r) => `
          <div class="triagem-row">
            <small>${esc(r.pergunta)}</small>
            <strong>${esc(r.resposta)}</strong>
          </div>
        `).join('');

        const anexos = collectAnexos(p);
        if(!anexos.length){
          el.detailsAnexos.innerHTML = `<div class="triagem-row"><small>Anexos</small><strong>Sem anexos neste pedido.</strong></div>`;
        }else{
          el.detailsAnexos.innerHTML = anexos.map((a, idx) => {
            const isImg = looksLikeImage(a.url);
            return `
              <div class="anexo-item">
                <a href="${esc(a.url)}" target="_blank" rel="noopener">
                  ${isImg ? `<img src="${esc(a.url)}" alt="Anexo ${idx + 1}" onerror="this.style.display='none'"/>` : ''}
                  <span class="anexo-caption">${esc(a.name || `Anexo ${idx + 1}`)}</span>
                </a>
              </div>
            `;
          }).join('');
        }

        el.detailsModal.classList.add('open');
        el.detailsModal.setAttribute('aria-hidden', 'false');
      }

      function closeDetailsModal(){
        el.detailsModal.classList.remove('open');
        el.detailsModal.setAttribute('aria-hidden', 'true');
      }

      function openInlineChat(p){
        if(!p || !p.id){ showToast('Pedido invalido para abrir chat.'); return; }
        try{
          localStorage.setItem('doke_pedido_contexto', JSON.stringify(p));
          localStorage.setItem('pedidoAtual', JSON.stringify(p));
          localStorage.setItem('doke_chat_prefill', JSON.stringify({ pedidoId: p.id, titulo: p.titulo, usuario: p.usuario, nome: p.nome, origem: 'pedidos.html' }));
        }catch(_){ }

        const pid = encodeURIComponent(String(p.id));
        const chatUrl = `chat.html?embed=1&chatId=${pid}&pedidoId=${pid}&from=pedidos&aba=pedidos&origin=pedido`;
        state.activeChatUrl = chatUrl;

        el.inlineChatTitle.textContent = p.titulo || 'Chat do pedido';
        el.inlineChatSub.textContent = `${p.usuario || p.nome || '@cliente'} • ${p.id}`;
        if(el.inlineChatFrame.getAttribute('src') !== chatUrl){
          el.inlineChatFrame.setAttribute('src', chatUrl);
        }
        el.inlineChatShell.classList.add('open');
        el.inlineChatShell.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }

      function closeInlineChat(){
        el.inlineChatShell.classList.remove('open');
        el.inlineChatShell.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }

      function openChat(p){
        openInlineChat(p);
      }

      async function openDetails(p){
        if(!p || !p.id){ showToast('Pedido invalido para abrir detalhes.'); return; }
        try{
          localStorage.setItem('doke_pedido_detalhes', JSON.stringify(p));
          localStorage.setItem('pedidoAtual', JSON.stringify(p));
        }catch(_){ }
        const full = await fetchPedidoCompleto(p);
        renderDetailsModal(full || p);
      }

      function toggleSelectMode(force){
        const next = typeof force === 'boolean' ? force : !state.selectMode;
        state.selectMode = next;
        if(!next) state.selected.clear();
        render();
      }

      function toggleSelected(id){
        const key = String(id || '');
        if(!key) return;
        if(state.selected.has(key)) state.selected.delete(key);
        else state.selected.add(key);
        render();
      }

      function setupFallbacks(){
        window.toggleCep = window.toggleCep || function(e){ if(e) e.preventDefault(); const box = document.getElementById('boxCep'); if(box) box.style.display = box.style.display === 'block' ? 'none' : 'block'; };
        window.salvarCep = window.salvarCep || function(){ const val = String(document.getElementById('inputCep')?.value || '').trim(); if(!val) return; localStorage.setItem('doke_cep', val); const span = document.getElementById('textoCepSpan'); if(span) span.textContent = val; const box = document.getElementById('boxCep'); if(box) box.style.display='none'; showToast('CEP salvo'); };
        window.abrirMenuMobile = window.abrirMenuMobile || function(){ document.querySelector('.sidebar-icones')?.classList.add('menu-aberto'); document.body.classList.add('menu-ativo'); const ov = document.getElementById('overlay-menu'); if(ov) ov.style.display='block'; };
        window.fecharMenuMobile = window.fecharMenuMobile || function(){ document.querySelector('.sidebar-icones')?.classList.remove('menu-aberto'); document.body.classList.remove('menu-ativo'); const ov = document.getElementById('overlay-menu'); if(ov) ov.style.display='none'; };
        window.irParaMeuPerfil = window.irParaMeuPerfil || function(e){ if(e) e.preventDefault(); location.href='meuperfil.html'; };

        const cep = localStorage.getItem('doke_cep');
        if(cep){ const span = document.getElementById('textoCepSpan'); if(span) span.textContent = cep; }
      }

      async function hydrate(forceFs){
        let local = [];
        try{ local = loadLocal(); }catch(err){ console.warn('loadLocal erro:', err); }
        let merged = mergePedidos(local);
        if(forceFs || merged.length < 3){
          try{
            const fs = await loadFirestore();
            merged = mergePedidos([...(merged || []), ...(fs || [])]);
          }catch(err){
            console.warn('loadFirestore erro:', err);
          }
        }
        state.pedidos = merged;
        render();
      }

      function bind(){
        el.search.addEventListener('input', () => { state.query = String(el.search.value || ''); render(); });
        el.sortBtn.addEventListener('click', () => { nextSort(); render(); });
        el.selectBtn.addEventListener('click', () => toggleSelectMode());
        el.refreshBtn.addEventListener('click', async () => { el.refreshBtn.disabled = true; await hydrate(true); el.refreshBtn.disabled = false; showToast('Pedidos atualizados'); });
        el.chips.forEach(ch => ch.addEventListener('click', () => { state.filter = ch.dataset.filter || 'all'; render(); }));
        el.grid.addEventListener('click', (ev) => {
          const btn = ev.target.closest('button[data-action][data-id]');
          if(btn){
            const p = byId(btn.dataset.id);
            if(btn.dataset.action === 'select'){ toggleSelected(btn.dataset.id); return; }
            if(state.selectMode){ toggleSelected(btn.dataset.id); return; }
            if(btn.dataset.action === 'chat') openChat(p); else openDetails(p);
            return;
          }
          const cardEl = ev.target.closest('.card[data-id]');
          if(!cardEl || !state.selectMode) return;
          toggleSelected(cardEl.dataset.id);
        });
        el.inlineChatBack.addEventListener('click', closeInlineChat);
        el.inlineChatOpenTab.addEventListener('click', () => {
          if(!state.activeChatUrl) return;
          window.open(state.activeChatUrl, '_blank', 'noopener');
        });
        el.detailsCloseBtn.addEventListener('click', closeDetailsModal);
        el.detailsModal.addEventListener('click', (ev) => {
          if(ev.target === el.detailsModal) closeDetailsModal();
        });
        document.addEventListener('keydown', (ev) => {
          if(ev.key !== 'Escape') return;
          if(el.detailsModal.classList.contains('open')) closeDetailsModal();
          if(el.inlineChatShell.classList.contains('open')) closeInlineChat();
        });
        window.addEventListener('storage', (ev) => { const key = String(ev?.key || ''); if(!key || /(pedido|orcamento|doke_)/i.test(key)) hydrate(false); });
      }

      function bootstrapPedidos(){
        try{
          setupFallbacks();
          bind();
          hydrate(true).catch((err) => {
            console.error('[pedidos] hydrate error', err);
            try{ state.pedidos = mergePedidos(loadLocal()); }catch(_){ state.pedidos = []; }
            render();
            try{ showToast('Erro ao carregar pedidos. Mostrando dados locais.'); }catch(_){ }
          });
        }catch(err){
          console.error('[pedidos] bootstrap error', err);
          try{ state.pedidos = mergePedidos(loadLocal()); }catch(_){ state.pedidos = []; }
          try{ render(); }catch(_){ }
        }
      }

      bootstrapPedidos();
    })();
  