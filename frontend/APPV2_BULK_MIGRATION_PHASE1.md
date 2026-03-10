# App-v2 bulk migration - phase 1

## O que mudou

Nesta rodada, o app-v2 ganhou uma camada nativa de bridge para retirar mais rotas do fluxo `legacy-html`.

## Rotas agora atendidas por bridge nativa

- negocios.html
- comunidade.html
- meuperfil.html
- acompanhamento-profissional.html
- admin-validacoes.html
- anunciar-negocio.html
- anunciar.html
- avaliar.html
- cadastro.html
- diagnostico.html
- diagnostico-avancado.html
- editar-anuncio.html
- empresas.html
- estatistica.html
- explorar.html
- feed.html
- grupo.html
- interacoes.html
- login.html
- meuempreendimento.html
- negocio.html
- orcamento.html
- pagar.html
- pedido.html
- perfil.html
- perfil-cliente.html
- perfil-empresa.html
- perfil-profissional.html
- perfil-usuario.html
- projeto.html
- publicacoes.html
- quiz.html
- resultado.html
- sobre-doke.html

## O que significa bridge nativa

- a shell do app-v2 passa a controlar header/sidebar/miolo
- o conteúdo principal do HTML legado é reaproveitado dentro da shell nativa
- estilos de página são reaproveitados de forma tolerante
- scripts legados podem inicializar parcialmente, mas ainda exigem revisão página a página

## O que ficou fora desta fase

- portar toda a lógica fina de cada página para módulos totalmente nativos
- remover de vez toda dependência de scripts legados com acoplamento em `DOMContentLoaded`
- migrar páginas de teste / instrução / descartes

## Próximos focos

1. comunidade.html
2. meuperfil.html
3. negocios.html
4. perfil-profissional.html
5. grupo.html
