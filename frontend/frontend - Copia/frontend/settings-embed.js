
(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get('embed') !== '1') return;

  document.documentElement.classList.add('embed');

  function postHeight() {
    try {
      const doc = document.documentElement;
      const body = document.body;
      const height = Math.max(
        body ? body.scrollHeight : 0,
        doc ? doc.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        doc ? doc.offsetHeight : 0
      );
      window.parent && window.parent.postMessage(
        { type: 'doke:embedHeight', height },
        window.location.origin
      );
    } catch (_) {}
  }

  window.addEventListener('load', () => {
    postHeight();
    setTimeout(postHeight, 60);
    setTimeout(postHeight, 260);
  });

  window.addEventListener('resize', postHeight);

  if ('ResizeObserver' in window && document.body) {
    const ro = new ResizeObserver(() => postHeight());
    ro.observe(document.body);
  } else {
    setInterval(postHeight, 600);
  }
})();
