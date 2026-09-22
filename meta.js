/* ═══════════════════════════════════════════════════════════════════════
   Píxel de Meta con consentimiento (20-sep-2026 · revisado 22-sep-2026).

   Hace dos cosas:
   1. Pinta una barra de cookies la primera vez. Aceptar y rechazar cuestan
      lo mismo (un toque). La decisión se guarda en localStorage y no se
      vuelve a preguntar.
   2. Solo si se acepta, carga el píxel de Meta y manda los eventos que las
      páginas piden con vdaMeta.track(...). Si no se acepta, no se carga
      nada: la web funciona exactamente igual y GoatCounter (sin cookies)
      sigue contando.

   ARREGLO DEL 22-sep-2026 — la barra ya no puede tapar un botón:
   a) RESERVA HUECO. Mientras la barra está visible, añade al final del
      documento un hueco de su alto real (#vda-hueco, medido con
      ResizeObserver) y publica ese alto en --vda-barra-alto. No depende
      de que nadie acepte ni rechace nada.
   b) BARRA COMPACTA en pantallas ≤560 px. Medido a 390 px de ancho:
      /carta/ pasa de 150 px a 95 px; /carta/pedido.html de 205 px a 127 px.
   c) BOTONES CON width:auto. El CSS de pedido.html los estiraba a 125 px
      y por eso allí la barra era 55 px más alta que en /carta/.
   d) Si la página tiene su propia barra fija abajo (.barra de /carta/, la
      de «Quiero mi informe»), se sube por encima de esta mientras se
      pregunta, en vez de quedar sepultada debajo.

   Uso en una página:
   <script src="/meta.js" defer></script>
   ... vdaMeta.track('InitiateCheckout', { value: 24.99, currency: 'EUR' });

   El ID del píxel se pega abajo en PIXEL_ID (Administrador de eventos de
   Meta › Conjuntos de datos). Mientras esté vacío, la barra no aparece y no
   se carga nada.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  const PIXEL_ID = '3307782956074811'; // Administrador de eventos › «Viaje del Alma web»
  const CLAVE = 'vda_cookies';         // 'si' | 'no'
  let estado = null;
  try { estado = localStorage.getItem(CLAVE); } catch (e) { /* sin almacenamiento: se pregunta cada vez */ }
  const cola = [];
  let vigilante = null; // ResizeObserver que mantiene el hueco al alto de la barra

  function cargaPixel() {
    if (!PIXEL_ID || window.fbq) return;
    /* Fragmento oficial de Meta, tal cual. */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
    cola.splice(0).forEach(a => window.fbq.apply(null, a));
  }

  window.vdaMeta = {
    /* Eventos estándar de Meta: ViewContent, InitiateCheckout, Purchase, Lead… */
    track(evento, datos) {
      if (!PIXEL_ID || estado === 'no') return;
      if (estado === 'si' && window.fbq) window.fbq('track', evento, datos || {});
      else cola.push(['track', evento, datos || {}]); // se manda si acepta después
    },
    acepta() { estado = 'si'; guarda(); quitaBarra(); cargaPixel(); },
    rechaza() { estado = 'no'; guarda(); quitaBarra(); cola.length = 0; },
    /* Para el enlace «Cambiar mis cookies» de la política de privacidad. */
    olvida() { try { localStorage.removeItem(CLAVE); } catch (e) {} estado = null; pintaBarra(); },
  };
  function guarda() { try { localStorage.setItem(CLAVE, estado); } catch (e) {} }

  function quitaBarra() {
    const b = document.getElementById('vda-cookies'); if (b) b.remove();
    const h = document.getElementById('vda-hueco'); if (h) h.remove();
    if (vigilante) { vigilante.disconnect(); vigilante = null; }
    document.documentElement.style.removeProperty('--vda-barra-alto');
  }

  /* Hueco al final del documento, del alto real de la barra: garantiza que
     siempre se puede desplazar hasta ver el último botón de la página. */
  function reservaHueco(b) {
    let hueco = document.getElementById('vda-hueco');
    if (!hueco) {
      hueco = document.createElement('div');
      hueco.id = 'vda-hueco';
      hueco.setAttribute('aria-hidden', 'true');
      hueco.style.cssText = 'margin:0;padding:0;border:0;flex:none;height:0';
      document.body.appendChild(hueco);
    }
    const mide = function () {
      const alto = Math.ceil(b.getBoundingClientRect().height);
      hueco.style.height = alto + 'px';
      document.documentElement.style.setProperty('--vda-barra-alto', alto + 'px');
    };
    mide();
    if (window.ResizeObserver) { vigilante = new ResizeObserver(mide); vigilante.observe(b); }
    else { window.addEventListener('resize', mide); }
    /* Karla llega de Google Fonts: al cargar, el texto puede cambiar de líneas. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(mide).catch(function () {});
  }

  function pintaBarra() {
    if (document.getElementById('vda-cookies')) return;
    const b = document.createElement('div');
    b.id = 'vda-cookies';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Cookies');
    b.innerHTML =
      '<style>' +
      '#vda-cookies{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#14102A;color:#EDE7DC;' +
      'border-top:1px solid rgba(201,168,76,.35);box-shadow:0 -8px 30px rgba(0,0,0,.45);' +
      'font:15px/1.5 Karla,"Helvetica Neue",Arial,sans-serif;padding:14px 18px calc(14px + env(safe-area-inset-bottom))}' +
      '#vda-cookies .in{max-width:760px;margin:0 auto;display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;justify-content:space-between}' +
      '#vda-cookies p{margin:0;flex:1 1 320px;color:#C9BFDD}' +
      '#vda-cookies a{color:#E8D9A0}' +
      '#vda-cookies .b{display:flex;gap:8px;flex:0 0 auto}' +
      '#vda-cookies button{cursor:pointer;border-radius:9px;padding:10px 16px;font:inherit;font-weight:700;' +
      'width:auto;flex:0 0 auto;border:1px solid rgba(201,168,76,.45)}' +
      '#vda-cookies .si{background:linear-gradient(180deg,#E8D9A0,#C9A84C);color:#2A2004;border-color:transparent}' +
      '#vda-cookies .no{background:transparent;color:#EDE7DC}' +
      /* la barra fija propia de la página (la de «Quiero mi informe») se sube */
      'body .barra{bottom:var(--vda-barra-alto,0px)}' +
      '@media (max-width:560px){' +
      '#vda-cookies{font-size:13px;line-height:1.35;padding:9px 12px calc(9px + env(safe-area-inset-bottom))}' +
      '#vda-cookies .in{gap:6px 10px}' +
      '#vda-cookies p{flex:1 1 180px}' +
      '#vda-cookies button{padding:8px 11px;font-size:13px}}' +
      '</style>' +
      '<div class="in"><p>Usamos una cookie de Meta para medir los anuncios. ' +
      'Sin ella la web funciona igual. <a href="/privacidad.html#cookies">Más información</a>.</p>' +
      '<div class="b"><button type="button" class="no">Solo lo necesario</button>' +
      '<button type="button" class="si">Aceptar</button></div></div>';
    b.querySelector('.si').addEventListener('click', window.vdaMeta.acepta);
    b.querySelector('.no').addEventListener('click', window.vdaMeta.rechaza);
    document.body.appendChild(b);
    reservaHueco(b);
  }

  if (!PIXEL_ID) return; // sin ID no hay nada que preguntar
  if (estado === 'si') cargaPixel();
  else if (estado !== 'no') {
    if (document.body) pintaBarra();
    else document.addEventListener('DOMContentLoaded', pintaBarra, { once: true });
  }
})();
