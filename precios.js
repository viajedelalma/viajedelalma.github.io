/* ═══════════════════════════════════════════════════════════════════════
   Prueba de precio de los informes (decisión de la PO, vie 9-oct-2026).

   Del martes 13-oct 00:00 al lunes 26-oct 23:59 (hora de España):
     carta natal 14,99 € (antes 24,99 €) y pack carta + revolución 28,99 €
     (antes 39,99 €). La revolución solar sigue a 24,99 € y la de clienta a 14,99 €.
   Fuera de esas fechas, los precios de siempre: no hay que tocar nada el 27.

   Cómo se cobra: el enlace de pago de siempre, con un código de promoción
   de Stripe ya puesto (prefilled_promo_code). OTONOCARTA quita 10 € a la
   carta y OTONOPACK quita 11 € al pack; los dos caducan solos en Stripe.
   El webhook no cambia: identifica el producto por el enlace y guarda el
   importe cobrado de verdad (1499 o 2899 en importe_centimos).

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
  var enPrueba = forzado === 'prueba' || (forzado !== 'normal' && ahora >= INICIO && ahora < FIN);

  var P = enPrueba
    ? { carta: '14,99 €', revolucion: '24,99 €', pack: '28,99 €', ahorro_pack: '10,99 €',
        valor: { carta: 14.99, revolucion: 24.99, pack: 28.99 },
        codigo: { carta: 'OTONOCARTA', pack: 'OTONOPACK' } }
    : { carta: '24,99 €', revolucion: '24,99 €', pack: '39,99 €', ahorro_pack: '10 €',
        valor: { carta: 24.99, revolucion: 24.99, pack: 39.99 },
        codigo: {} };
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
