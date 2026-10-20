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
