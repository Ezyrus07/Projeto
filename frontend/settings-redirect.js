
(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get('embed') === '1') return;
  // If already inside an iframe, do nothing.
  if (window.self !== window.top) return;

  const file = (location.pathname.split('/').pop() || '').toLowerCase();

  const map = {
    'dadospessoais.html': 'dadospessoais',
    'enderecos.html': 'enderecos',
    'senha.html': 'senha',
    'pagamentos.html': 'pagamentos',
    'preferencia-notif.html': 'preferencia-notif',
    'privacidade.html': 'privacidade',
    'idioma.html': 'idioma',
    'ajuda.html': 'ajuda',
    'sobre-doke.html': 'sobre-doke'
  };

  const section = map[file];
  if (!section) return;

  const url = new URL('mais.html', location.href);
  url.searchParams.set('section', section);
  location.replace(url.toString());
})();
