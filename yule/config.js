(function (root) {
  'use strict';
  // Activar únicamente después de revisar el PDF, Stripe y la descarga real.
  const ENLACE_699 = '';
  // Pendiente de decisión. Propuesta documentada en README.md, sin activar.
  const FIN_VENTA = '';
  const DESCARGA_LISTA = false;
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
