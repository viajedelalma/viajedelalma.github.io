(function () {
  'use strict';
  const guia = document.getElementById('guiaYule');
  if (!guia) return;

  function actualizar() {
    try {
      const api = window.VdaYule;
      // Misma fecha y mismos bloqueos que la página de compra. Fallo cerrado.
      guia.hidden = !api || api.estadoVenta(api.config, Date.now()) !== 'venta';
    } catch (_) {
      guia.hidden = true;
    }
  }
  actualizar();
  // También cierra la invitación si la lectora deja la pestaña abierta.
  setInterval(actualizar, 1000);
  window.addEventListener('pageshow', actualizar);
  document.addEventListener('visibilitychange', actualizar);
})();
