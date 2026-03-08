# Doke App V2 (migracao gradual)

Base nova para migrar o projeto sem quebrar o legado:
- Shell fixo (header + menu lateral)
- Router com lifecycle (`mount/unmount`)
- Estado global simples
- Pagina `home` inicial de teste

## Como ativar
No console:

```js
localStorage.setItem("doke_app_v2", "1");
location.reload();
```

Ou via querystring:

`index.html?appv2=1`

## Como desativar

```js
localStorage.removeItem("doke_app_v2");
location.reload();
```

## Proximo passo
Portar o HTML/CSS real do `index` para `app-v2/pages/home.js` mantendo classes visuais.

