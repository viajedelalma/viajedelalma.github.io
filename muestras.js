/* Viaje del Alma · visor accesible de muestras reales (sin librerías externas).
   Mejora progresiva: sin JavaScript los enlaces abren la imagen original. */
(function () {
  'use strict';
  var enlaces = Array.prototype.slice.call(document.querySelectorAll('a[data-vda-muestra]'));
  if (!enlaces.length) return;

  var visor, imagen, descripcion, numero, original, anterior, siguiente, cerrar;
  var grupo = [], indice = 0, focoAnterior = null, overflowAnterior = '';

  function inicializa() {
    if (visor) return;
    visor = document.createElement('div');
    visor.className = 'vda-muestras-modal';
    visor.hidden = true;
    visor.setAttribute('role', 'dialog');
    visor.setAttribute('aria-modal', 'true');
    visor.setAttribute('aria-labelledby', 'vda-muestras-titulo');
    visor.innerHTML = '<div class="vda-muestras-ventana">' +
      '<div class="vda-muestras-cabecera">' +
      '<img class="vda-muestras-logo" alt="" src="/logo.png" width="40" height="40">' +
      '<h2 class="vda-muestras-nombre" id="vda-muestras-titulo">Así se ve por dentro</h2>' +
      '<button type="button" class="vda-muestras-cerrar" aria-label="Cerrar la muestra">×</button></div>' +
      '<div class="vda-muestras-escena"><img class="vda-muestras-imagen" alt=""></div>' +
      '<div class="vda-muestras-pie">' +
      '<button type="button" class="vda-muestras-nav" data-nav="anterior" aria-label="Página anterior">‹</button>' +
      '<div class="vda-muestras-dato"><span class="vda-muestras-numero"></span>' +
      '<span class="vda-muestras-descripcion"></span>' +
      '<div><a class="vda-muestras-original" href="#" target="_blank" rel="noopener">Ver imagen original</a></div></div>' +
      '<button type="button" class="vda-muestras-nav" data-nav="siguiente" aria-label="Página siguiente">›</button>' +
      '</div></div>';
    document.body.appendChild(visor);
    imagen = visor.querySelector('.vda-muestras-imagen');
    descripcion = visor.querySelector('.vda-muestras-descripcion');
    numero = visor.querySelector('.vda-muestras-numero');
    original = visor.querySelector('.vda-muestras-original');
    anterior = visor.querySelector('[data-nav="anterior"]');
    siguiente = visor.querySelector('[data-nav="siguiente"]');
    cerrar = visor.querySelector('.vda-muestras-cerrar');
    cerrar.addEventListener('click', cierra);
    anterior.addEventListener('click', function () { muestra(indice - 1); });
    siguiente.addEventListener('click', function () { muestra(indice + 1); });
    visor.addEventListener('click', function (e) { if (e.target === visor) cierra(); });
    document.addEventListener('keydown', teclas);
    var toqueX = null;
    visor.querySelector('.vda-muestras-escena').addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) toqueX = e.touches[0].clientX;
    }, { passive: true });
    visor.querySelector('.vda-muestras-escena').addEventListener('touchend', function (e) {
      if (toqueX === null || e.changedTouches.length !== 1) return;
      var diferencia = e.changedTouches[0].clientX - toqueX;
      toqueX = null;
      if (grupo.length > 1 && Math.abs(diferencia) > 65) muestra(indice + (diferencia < 0 ? 1 : -1));
    }, { passive: true });
  }

  function visible(el) { return el.getClientRects().length > 0; }
  function titulo(el) {
    var pie = el.closest('figure');
    var etiqueta = pie && pie.querySelector('figcaption');
    return el.getAttribute('data-vda-titulo') ||
      (etiqueta ? etiqueta.textContent.trim() : '') ||
      (el.querySelector('img') ? el.querySelector('img').alt : 'Página del ejemplo');
  }
  function muestra(n) {
    if (!grupo.length) return;
    indice = (n + grupo.length) % grupo.length;
    var el = grupo[indice], img = el.querySelector('img'), href = el.href;
    imagen.src = href;
    imagen.alt = img ? img.alt : titulo(el);
    descripcion.textContent = titulo(el);
    numero.textContent = grupo.length > 1 ? 'Imagen ' + (indice + 1) + ' de ' + grupo.length : 'Vista previa';
    original.href = href;
    anterior.hidden = siguiente.hidden = grupo.length < 2;
  }
  function abre(el) {
    inicializa();
    var nombre = el.getAttribute('data-vda-grupo') || 'general';
    grupo = enlaces.filter(function (a) { return visible(a) && (a.getAttribute('data-vda-grupo') || 'general') === nombre; });
    if (!grupo.length) grupo = [el];
    focoAnterior = document.activeElement;
    overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    visor.hidden = false;
    muestra(grupo.indexOf(el));
    cerrar.focus();
    // Seguimiento de aperturas, nunca de ventas. GoatCounter se carga con async:
    // si aún no está listo, se registra el clic al terminar de cargar el script.
    var evento = {path: 'muestra-ampliada-' + nombre, title: 'Muestra ampliada ' + nombre, event: true};
    function cuentaMuestra() {
      try {
        if (window.goatcounter && window.goatcounter.count) window.goatcounter.count(evento);
      } catch (e) {}
    }
    if (window.goatcounter && window.goatcounter.count) {
      cuentaMuestra();
    } else {
      var script = document.querySelector('script[data-goatcounter]');
      if (script) script.addEventListener('load', cuentaMuestra, {once: true});
    }
  }
  function cierra() {
    if (!visor || visor.hidden) return;
    visor.hidden = true;
    document.body.style.overflow = overflowAnterior;
    imagen.removeAttribute('src');
    if (focoAnterior && typeof focoAnterior.focus === 'function') focoAnterior.focus();
  }
  function teclas(e) {
    if (!visor || visor.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); cierra(); return; }
    if (e.key === 'ArrowRight' && grupo.length > 1) { e.preventDefault(); muestra(indice + 1); return; }
    if (e.key === 'ArrowLeft' && grupo.length > 1) { e.preventDefault(); muestra(indice - 1); return; }
    if (e.key !== 'Tab') return;
    var elementos = Array.prototype.slice.call(visor.querySelectorAll('button:not([hidden]),a[href]'))
      .filter(visible);
    if (!elementos.length) return;
    var primero = elementos[0], ultimo = elementos[elementos.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }

  enlaces.forEach(function (a) {
    a.classList.add('vda-muestra-enlace');
    a.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      abre(a);
    });
  });
})();
