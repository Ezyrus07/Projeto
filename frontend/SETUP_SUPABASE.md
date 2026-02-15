# DOKE — Setup rápido (para parar de dar “Failed to fetch” / nada carregar)

## 0) CORS (obrigatório para rodar no navegador)
Se o console mostrar:
`blocked by CORS policy: No 'Access-Control-Allow-Origin' header...`

No Supabase Dashboard → **Project Settings** → **API** → **CORS** (Allowed origins), adicione **EXATAMENTE**:

- `http://localhost:5500`
- `http://127.0.0.1:5500`

Salve e dê **Ctrl+Shift+R**.

> Se você usar outra porta, adicione também (ex.: `http://localhost:5501`).

### Auth (recomendado)
Para evitar páginas pedindo login “do nada”, inclua também em **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:5500`
- **Redirect URLs**: `http://localhost:5500/*` e `http://127.0.0.1:5500/*`

## 1) Rode os SQLs no Supabase
No Supabase Dashboard → **SQL Editor** → cole e execute, nesta ordem:

1. `supabase_schema.sql` (perfis + publicações + vídeos)
2. `supabase_features.sql` (extras: seguidores, chat, etc.)
3. `schema_comunidades.sql` e `supabase-grupos-privados.sql` (membros/solicitação)
4. `supabase_anuncios_comunidades.sql` (**novo**: cria `comunidades`, `comunidade_posts`, `anuncios`, `servicos`)

> Se você já rodou alguns, não tem problema: tudo está com `IF NOT EXISTS`.

## 2) Entenda o erro que você viu (PGRST200 / “api.anuncios”)
Se você fizer `fetch` direto em `/rest/v1/...` sem os headers de profile, o PostgREST pode
buscar por padrão no schema **api**. O site (supabase-js) usa **public**.

Para testar o schema `public`, use esse snippet no console:

```js
const url = (window.SUPABASE_URL || window.DOKE_SUPABASE_URL);
const key = (window.SUPABASE_ANON_KEY || window.DOKE_SUPABASE_ANON_KEY);
fetch(`${url}/rest/v1/anuncios?select=id&limit=1`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Accept-Profile": "public",
  }
}).then(r=>r.text()).then(console.log);
```

Se vier `[]` → tabela existe (só está vazia).

## 3) Cache
Atualizei o cache-buster para `script.js?v=20260215v4`.
Mesmo assim, se você estiver vendo JS antigo:
- **Ctrl+Shift+R**
- ou abra em janela anônima.
