(function (root) {
  'use strict';
  // Enlace de pago de 6,99 € (Stripe, plink_1UfhRRKjCAbuA162uj2xmN7V, creado el 25-nov).
  const ENLACE_699 = 'https://buy.stripe.com/4gMaEYc5K36Pc2LcUUew80d';
  // Cierre aprobado en COORD-20261124 (hora de Madrid).
  const FIN_VENTA = '2027-01-07T00:00:00+01:00';
  // PDF v3 en el servidor y función «descarga» v5 con Yule (25-nov).
  const DESCARGA_LISTA = true;
  const config = Object.freeze({ ENLACE_699, FIN_VENTA, DESCARGA_LISTA, PRECIO: 6.99 });

  function enlacePagoValido(enlace) {
    try {
      const u = new URL(enlace);
      return u.protocol === 'https:' && ['buy.stripe.com', 'checkout.stripe.com'].includes(u.hostname)
        && !u.username && !u.password && !u.port && u.pathname !== '/';
    } catch (_) { return false; }
  }
  function estadoVenta(c, ahora) {
    const fin = c.FIN_VENTA ? Date.parse(c.FIN_VENTA) : null;
    if (fin !== null && !Number.isFinite(fin)) return 'pendiente';
    if (fin !== null && ahora >= fin) return 'cerrada';
    return c.DESCARGA_LISTA === true && enlacePagoValido(c.ENLACE_699) ? 'venta' : 'pendiente';
  }
  function enlaceArchivoValido(enlace) {
    try {
      const u = new URL(enlace);
      return u.protocol === 'https:' && !u.username && !u.password && !u.port
        && u.hostname === 'orxyhxehapqmjwmqmqgv.supabase.co'
        && u.pathname.startsWith('/storage/v1/object/sign/');
    } catch (_) { return false; }
  }
  const api = { config, estadoVenta, enlacePagoValido, enlaceArchivoValido };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VdaYule = api;
})(typeof window === 'object' ? window : globalThis);
