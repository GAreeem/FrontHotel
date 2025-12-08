if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registrado:', reg.scope))
      .catch(err => console.log('Error al registrar el Service Worker:', err));
    navigator.serviceWorker.ready.then(reg => {
      reg.sync.register('sync-offline-actions');
    });

  });
}
