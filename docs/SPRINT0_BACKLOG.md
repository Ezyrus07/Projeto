# Sprint 0 - Web Stabilization e Preparacao App

Objetivo: estabilizar o web para iniciar app sem carregar problemas estruturais.

## P0 (obrigatorio)

1. Auth unica (Supabase)
- Remover fluxos paralelos Firebase/Supabase em login/sessao.
- Garantir consistencia: header logado = permissoes logadas.
- Critico: curtir/comentar/grupo/chat sem falso "faca login".

2. Performance critica com meta
- Metas:
  - `feed_global_load` <= 1800ms (mediana ambiente local 4G)
  - `grupo_detect_schema` <= 300ms apos cache quente
  - `grupo_boot` <= 2200ms
- Usar `dokePerfReport(50)` como criterio de aceite.

3. Fluxos core sem regressao
- Login -> feed -> abrir publicacao -> comentar/curtir.
- Grupo -> abrir -> postar -> reagir -> responder.
- Chat -> abrir conversa -> enviar mensagem.

4. Responsividade minima mobile
- Corrigir: overlays, areas cortadas, input deslocado, barras inferiores.
- Checklist para `publicacao`, `chat`, `grupo`, `busca`, `perfil`.

## P1 (logo em seguida)

1. UX/Texto
- Corrigir encoding quebrado (`FaÃ§a`, `publicaÃ§Ã£o`, etc.).
- Padronizar mensagens de loading/erro/sucesso.

2. Seguranca e dados
- Revisar RLS por tabela sensivel.
- Validacao/sanitizacao de input (comentario, chat, upload).

3. Observabilidade
- Consolidar eventos de erro e rede (console -> provedor de erro).
- Painel simples de metricas client-side por pagina.

## P2 (preparacao app)

1. Contratos de dados
- Documento de endpoints/tabelas usados por fluxo.
- Estados de sessao e regras de permissao.

2. Camada compartilhavel
- Extrair modulos reutilizaveis:
  - `auth/session`
  - `api/posts`
  - `api/groups`
  - `cache`

## Definicao de pronto para comecar app

- P0 completo.
- Sem bug P1 aberto em login/feed/grupo/chat.
- Metas de performance batidas em 3 execucoes consecutivas.
- Documento de contratos atualizado.
