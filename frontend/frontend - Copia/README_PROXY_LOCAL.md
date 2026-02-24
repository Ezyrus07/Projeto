# DOKE — Rodar local SEM CORS (Supabase)

## O que foi corrigido
- Adicionado `doke-devserver.js` (servidor local + proxy Supabase) para evitar CORS.
- `supabase-init.js` agora **detecta** se você abriu pelo Live Server (sem proxy) e tenta **redirecionar** automaticamente para a porta do proxy.
- Criado endpoint `/_ _doke_proxy_pixel.gif` no devserver para o auto-scan funcionar.

## Como rodar (Windows / VS Code)
1) **Feche o Live Server** (ele entra em conflito de porta e também não tem proxy).
2) Abra o terminal na raiz do projeto.
3) Rode:

```powershell
node .\doke-devserver.js
```

4) Abra no navegador o link que aparecer no terminal (ex.: `http://localhost:5502/`).
5) Para login: `http://localhost:5502/frontend/login.html`

## Se aparecer "porta em uso"
- É porque tem outro servidor usando a porta (geralmente Live Server).
- Feche o Live Server e rode de novo.
- O `doke-devserver.js` tenta automaticamente a próxima porta.

## Dica
Se você abrir por engano em `http://localhost:5501/...` (Live Server), o `supabase-init.js` deve tentar te mandar para a porta correta do proxy.
