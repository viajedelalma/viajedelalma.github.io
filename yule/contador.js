(function () {
  'use strict';
  const cola = [];
  // Las previsualizaciones y pruebas no añaden visitas a producción.
  const produccion = ['viajedelalma.app', 'www.viajedelalma.app'].includes(location.hostname);
  function envia(nombre) {
    try { window.goatcounter.count({ path: nombre, title: nombre, event: true }); } catch (_) {}
  }
  window.yuleCuenta = function (nombre) {
    if (!produccion) return;
    if (window.goatcounter && window.goatcounter.count) envia(nombre);
    else cola.push(nombre);
  };
  if (!produccion) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.setAttribute('data-goatcounter', 'https://viajedelalma.goatcounter.com/count');
  script.addEventListener('load', function () { cola.splice(0).forEach(envia); });
  document.head.appendChild(script);
})();
