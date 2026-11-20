/* ═══════════════════════════════════════════════════════════════════════
   Precios de los informes.

   Decisión de la PO (mar 20-oct-2026), al cerrar la prueba de precio del
   13 al 26-oct: la carta natal se queda a 14,99 € y el pack carta +
   revolución a 28,99 € (la revolución sola, 24,99 €: el pack sigue saliendo
   10,99 € más barato que comprarlas por separado). La revolución de clienta
   sigue a 14,99 € con su código. Ya no hay fecha de fin.

   Cómo se cobra: con los enlaces de pago del 14-oct, de precio fijo y SIN
   códigos (enlace.carta 14,99 €, enlace.pack 28,99 €). NO DESACTIVARLOS en
   Stripe: son los enlaces de venta. Sus ids están en ENLACES de
   stripe-webhook y estado-pedido. pedido.html usa estos mismos enlaces en
   PRODUCTOS, y las páginas ya traen escritos 14,99 € / 28,99 €: si este
   archivo no carga, se enseña y se cobra lo mismo.

   No se anuncia como rebaja ni como oferta: 14,99 € es el precio normal (y
   el más bajo de los últimos 30 días).

   Los precios escritos en las páginas llevan data-precio="carta|pack|ahorro_pack";
   este archivo los vuelve a pintar por si alguien tiene una página antigua
   en la caché.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  var P = {
    carta: '14,99 €', revolucion: '24,99 €', pack: '28,99 €', ahorro_pack: '10,99 €',
    valor: { carta: 14.99, revolucion: 24.99, pack: 28.99 },
    codigo: {},
    enlace: { carta: 'https://buy.stripe.com/00w8wQd9Oazhd6P088ew805',
              pack: 'https://buy.stripe.com/aFa14oc5K5eX9UD6wwew806' },
    enPrueba: false
  };
  window.VDA_PRECIOS = P;

  function pinta() {
    var els = document.querySelectorAll('[data-precio]');
    for (var i = 0; i < els.length; i++) {
      var k = els[i].getAttribute('data-precio');
      if (P[k]) els[i].textContent = P[k];
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pinta);
  else pinta();
})();

/* ═══════════════════════════════════════════════════════════════════════
   Franja del Black Friday (BF-1711, decidido «A» por la PO el 18-nov-2026).
   −30 % en informes con el código BLACK30 (Stripe, cupón xS349YvG:
   carta, revolución, sinastría, pack y regalo). Premium NO entra.
   Se ve SOLO del lun 23-nov 00:00 al lun 30-nov 23:59 (hora de Madrid) y
   desaparece sola: no hace falta otro cambio para quitarla.
   Precio tachado: 14,99 € es el más bajo de los 30 días anteriores
   (art. 20 LOCM; comprobado el 18 y el 20-nov).
   Vista previa antes de la fecha: añade ?bf=1 a la dirección.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  var INICIO = Date.UTC(2026, 10, 22, 23, 0, 0);   // 23-nov 00:00 Madrid (UTC+1)
  var FIN    = Date.UTC(2026, 10, 30, 23, 0, 0);   // 1-dic 00:00 Madrid
  var ahora = Date.now();
  var previa = /[?&]bf=1\b/.test(location.search);
  if (!previa && (ahora < INICIO || ahora >= FIN)) return;

  function monta() {
    if (document.getElementById('vda-franja-bf')) return;
    var css = document.createElement('style');
    css.textContent =
      '#vda-franja-bf{background:#080614;color:#f3ead8;border-bottom:1px solid #C49A3C;' +
      'text-align:center;padding:10px 16px;font:400 15px/1.45 "Cormorant Garamond",Georgia,serif;' +
      'position:relative;z-index:50}' +
      '#vda-franja-bf b.t{display:block;font:600 12px/1.6 Cinzel,Georgia,serif;letter-spacing:.14em;color:#C49A3C}' +
      '#vda-franja-bf code{font:600 14px/1 Cinzel,Georgia,serif;color:#C49A3C;letter-spacing:.06em}' +
      '#vda-franja-bf s{opacity:.7}' +
      '#vda-franja-bf small{display:block;font-size:12.5px;opacity:.8;margin-top:2px}';
    document.head.appendChild(css);
    var f = document.createElement('div');
    f.id = 'vda-franja-bf';
    f.setAttribute('role', 'note');
    f.innerHTML =
      '<b class="t">BLACK FRIDAY · 23–30 NOVIEMBRE</b>' +
      '−30 % en informes seleccionados. Usa el código <code>BLACK30</code> al pagar. ' +
      'Carta natal <s>14,99 €</s> 10,49 €' +
      '<small>Hasta el 30 de noviembre a las 23:59. Premium no incluido.</small>';
    document.body.insertBefore(f, document.body.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monta);
  else monta();
})();
