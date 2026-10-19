/* ═══════════════════════════════════════════════════════════════════════
   Prueba de precio de los informes (decisión de la PO, vie 9-oct-2026).

   Del martes 13-oct 00:00 al lunes 26-oct 23:59 (hora de España):
     carta natal 14,99 € (antes 24,99 €) y pack carta + revolución 28,99 €
     (antes 39,99 €). La revolución solar sigue a 24,99 € y la de clienta a 14,99 €.
   Fuera de esas fechas, los precios de siempre: no hay que tocar nada el 27.

   Cómo se cobra (desde el 14-oct): enlaces de pago propios con el precio de
   otoño fijo y SIN códigos (enlace.carta 14,99 €, enlace.pack 28,99 €). Con el
   código prellenado, Stripe enseñaba unos segundos 24,99 € antes de aplicarlo.
   Esos enlaces solo se usan dentro de las fechas REALES de la prueba (no con
   ?precio=prueba) y se desactivan en Stripe el 27-oct. Sus ids están en
   ENLACES de stripe-webhook y estado-pedido, y se quedan ahí para siempre.
   Los códigos OTONOCARTA (-10 €) y OTONOPACK (-11 €) siguen como respaldo en
   los enlaces de siempre, por si este archivo es antiguo en alguna caché;
   caducan solos en Stripe. El webhook guarda el importe cobrado de verdad
   (1499 o 2899 en importe_centimos).

   Si este archivo no carga, cada página enseña y cobra el precio de siempre
   (24,99 € / 39,99 €, sin código): nunca se anuncia un precio y se cobra otro.

   Para comprobar sin esperar a las fechas: ?precio=prueba o ?precio=normal.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  var INICIO = Date.parse('2026-10-13T00:00:00+02:00');
  var FIN = Date.parse('2026-10-27T00:00:00+01:00');   // el 25-oct cambia la hora
  var forzado = '';
  try { forzado = new URLSearchParams(location.search).get('precio') || ''; } catch (e) {}
  var ahora = Date.now();
  var enVentana = ahora >= INICIO && ahora < FIN;
  var enPrueba = forzado === 'prueba' || (forzado !== 'normal' && enVentana);

  var P = enPrueba
    ? { carta: '14,99 €', revolucion: '24,99 €', pack: '28,99 €', ahorro_pack: '10,99 €',
        valor: { carta: 14.99, revolucion: 24.99, pack: 28.99 },
        codigo: { carta: 'OTONOCARTA', pack: 'OTONOPACK' } }
    : { carta: '24,99 €', revolucion: '24,99 €', pack: '39,99 €', ahorro_pack: '10 €',
        valor: { carta: 24.99, revolucion: 24.99, pack: 39.99 },
        codigo: {} };
  // Enlaces con el precio de otoño fijo: solo dentro de las fechas reales.
  P.enlace = (enPrueba && enVentana)
    ? { carta: 'https://buy.stripe.com/00w8wQd9Oazhd6P088ew805',
        pack: 'https://buy.stripe.com/aFa14oc5K5eX9UD6wwew806' }
    : {};
  P.enPrueba = enPrueba;
  window.VDA_PRECIOS = P;

  // Los precios escritos en las páginas llevan data-precio="carta|pack|ahorro_pack".
  function pinta() {
    if (!enPrueba) return;
    var els = document.querySelectorAll('[data-precio]');
    for (var i = 0; i < els.length; i++) {
      var k = els[i].getAttribute('data-precio');
      if (P[k]) els[i].textContent = P[k];
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pinta);
  else pinta();
})();
