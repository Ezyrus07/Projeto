# Plano de Organizacao do Repositorio

## Diagnostico rapido

- Total de arquivos no repo: alto (inclui `node_modules`).
- `frontend` e `frontend/frontend` possuem quase espelho completo.
- Isso dobra manutencao e aumenta risco de divergencia.

## Problema principal

Hoje cada ajuste precisa ser replicado em dois caminhos:

- `frontend/*`
- `frontend/frontend/*`

Se esquecer 1 lado, comportamento muda entre ambientes.

## Estrategia recomendada (sem quebrar deploy atual)

1. Eleger fonte canonica
- Fonte canonica: `frontend/*`.
- `frontend/frontend/*` vira espelho gerado (build/sync), nao editado manualmente.

2. Criar sincronizacao automatica
- Script de sync copia apenas arquivos permitidos da fonte canonica.
- Rodar no predeploy.

3. Congelar edicao direta no espelho
- Regra de equipe: nao editar `frontend/frontend/*` diretamente.
- PR com alteracao no espelho sem alteracao na fonte = bloqueado.

4. Limpar arquivos temporarios
- Remover artefatos `_tmp`, `_snippet`, `_dev*` que nao sao usados em runtime.
- Mover scripts de diagnostico para pasta `tools/`.

5. Estruturar por dominio (progressivo)
- `frontend/pages`
- `frontend/components`
- `frontend/modules/auth|feed|groups|chat`
- `frontend/styles`

## Criterios de aceite

- Nenhuma divergencia entre fonte e espelho nos arquivos tracked.
- Tempo de manutencao reduzido (1 alteracao = 1 lugar).
- Build/deploy sem mudanca visual inesperada.
