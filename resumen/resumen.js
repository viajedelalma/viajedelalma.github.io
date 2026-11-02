/* El Resumen diario de una voluntaria (piloto, 2-nov-2026).

   La URL lleva la llave: /resumen/?t=<id de su Resumen>. La función
   resumen-pagina devuelve el HTML ya montado y escapado por el motor y anota
   la primera vez que se abre (abierto_en, la métrica del piloto). Esa llamada
   se hace desde aquí, con JavaScript, para que los escáneres de enlaces de
   los correos (que no lo ejecutan) no cuenten como «abierto».

   Sin píxel ni contadores en esta página: es contenido personal. */
(function () {
  var FUNCION = 'https://orxyhxehapqmjwmqmqgv.supabase.co/functions/v1/resumen-pagina';
  var t = (new URLSearchParams(location.search).get('t') || '').trim().toLowerCase();
  var cargando = document.getElementById('cargando');
  var error = document.getElementById('error');
  var caja = document.getElementById('resumen');

  function falla() { cargando.hidden = true; error.hidden = false; }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(t)) { falla(); return; }

  fetch(FUNCION + '?t=' + encodeURIComponent(t), { cache: 'no-store', referrerPolicy: 'no-referrer' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.ok || !d.html) { falla(); return; }
      caja.innerHTML = d.html;
      var fecha = new Date(d.fecha + 'T12:00:00');
      document.title = 'Tu Resumen del ' + fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) +
        ' · Viaje del Alma';
      cargando.hidden = true;
      caja.hidden = false;
    })
    .catch(falla);
})();
