(function () {
  'use strict';
  const api = window.VdaYule;
  if (!api) return; // El HTML inicial nunca permite cobrar.
  const c = api.config;
  const cuenta = window.yuleCuenta || function () {};
  const precio = document.getElementById('precio');
  const boton = document.getElementById('comprar');
  const casilla = document.getElementById('consiento');
  const condiciones = document.getElementById('condiciones');
  const aviso = document.getElementById('aviso');
  const entrega = document.getElementById('entrega');
  const barra = document.getElementById('barra');
  const barraCta = document.getElementById('barra-cta');
  let estado;
  let saliendo = false;
  function actualiza() {
    const nuevo = api.estadoVenta(c, Date.now());
    if (nuevo !== estado) {
      estado = nuevo;
      document.body.dataset.estado = estado;
      precio.hidden = estado === 'cerrada';
      document.getElementById('cerrada').hidden = estado !== 'cerrada';
      condiciones.hidden = estado !== 'venta';
      entrega.textContent = estado === 'venta'
        ? 'IVA incluido · pago único · descarga digital'
        : 'IVA incluido · la guía estará disponible próximamente';
      boton.textContent = estado === 'venta' ? 'Quiero mi guía · 6,99 €' : 'Próximamente';
      barraCta.textContent = estado === 'venta' ? 'Quiero mi guía · 6,99 €' : 'Ver la guía · 6,99 €';
      cuenta('yule-' + estado);
    }
    boton.disabled = estado !== 'venta' || saliendo;
    pintaBarra();
    return estado;
  }
  casilla.addEventListener('change', function () {
    if (casilla.checked) { cuenta('yule-acepta'); aviso.hidden = true; condiciones.classList.remove('resalta'); }
  });
  boton.addEventListener('click', function () {
    if (actualiza() !== 'venta' || saliendo) return;
    if (!casilla.checked) {
      cuenta('yule-comprar-sin-casilla');
      aviso.hidden = false;
      condiciones.classList.add('resalta');
      casilla.focus();
      return;
    }
    saliendo = true;
    boton.disabled = true;
    cuenta('yule-comprar'); // Inicio de pago; nunca se contabiliza aquí una venta.
    location.assign(c.ENLACE_699);
  });
  function pintaBarra() {
    const r = boton.getBoundingClientRect();
    const visible = estado !== 'cerrada' && !(r.top < innerHeight - barra.offsetHeight && r.bottom > 0);
    barra.classList.toggle('visible', visible);
    barra.setAttribute('aria-hidden', visible ? 'false' : 'true');
    barraCta.tabIndex = visible ? 0 : -1;
  }
  barraCta.addEventListener('click', function () { cuenta('yule-barra'); });
  if ('IntersectionObserver' in window) {
    const observador = new IntersectionObserver(function (entradas) {
      if (entradas.some(function (e) { return e.isIntersecting; })) {
        cuenta('yule-ve-precio'); observador.disconnect();
      }
    }, { threshold: 0.3 });
    observador.observe(precio);
  }
  window.addEventListener('scroll', pintaBarra, { passive: true });
  window.addEventListener('resize', pintaBarra);
  window.addEventListener('pageshow', function () { saliendo = false; actualiza(); });
  document.addEventListener('visibilitychange', actualiza);
  actualiza();
  setInterval(actualiza, 60000); // Revalida también al pulsar, por si vence con la pestaña abierta.
})();
