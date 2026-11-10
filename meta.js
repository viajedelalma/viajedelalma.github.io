/* ═══════════════════════════════════════════════════════════════════════
   Medición de Meta y Google Ads con consentimiento (10-nov-2026).
   Se conserva la API vdaMeta de las páginas. Purchase solo lo llaman los
   recorridos que ya verifican el pago con el servidor. Google recibe el
   importe confirmado y un ID irreversible, nunca el código de pago.
   El consentimiento antiguo de Meta NO autoriza cargar Google.

   Hace dos cosas:
   1. Pinta una barra de cookies la primera vez o cuando el permiso de Meta
      es anterior a la incorporación de Google. Aceptar y rechazar cuestan
      lo mismo (un toque). La decisión y su versión se guardan en localStorage.
   2. Solo con permiso carga las etiquetas. Meta conserva sus eventos y
      Google recibe Purchase como conversión, con consentimiento nuevo y
      sin personalización de anuncios. GoatCounter sigue independiente.

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
   ... vdaMeta.track('Purchase', { value: 1, currency: 'EUR' }, { eventID: 'cs_live_…' });

   El ID del píxel se pega abajo en PIXEL_ID (Administrador de eventos de
   Meta › Conjuntos de datos). Mientras esté vacío, la barra no aparece y no
   se carga nada.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  const PIXEL_ID = '3307782956074811'; // Administrador de eventos › «Viaje del Alma web»
  const CLAVE = 'vda_cookies';         // 'si' | 'no'
  const VERSION = 'meta-google-20261110';
  const CLAVE_VERSION = 'vda_cookies_version';
  // Fragmento de la acción existente «Compra», leído en Google Ads el 10-nov.
  const GOOGLE_ID = 'AW-18490350522';
  const GOOGLE_COMPRA = GOOGLE_ID + '/gEiICLOQn44dELq38fBE';
  let estado = null;
  try { estado = localStorage.getItem(CLAVE); } catch (e) { /* sin almacenamiento: se pregunta cada vez */ }
  if (estado !== 'si' && estado !== 'no') estado = null;
  let version = null;
  try { version = localStorage.getItem(CLAVE_VERSION); } catch (e) {}
  const cola = [];
  const comprasGoogle = new Map();
  const enviadasGoogle = new Set();
  let googleCargado = false;
  let vigilante = null; // ResizeObserver que mantiene el hueco al alto de la barra

  function permiteGoogle() { return estado === 'si' && version === VERSION; }
  function urlMedicion(valor, clic) {
    try {
      const u = new URL(valor);
      const limpia = new URL(u.origin + u.pathname);
      // Solo identificadores publicitarios. Nunca correos, códigos de regalo,
      // dedicatorias, session_id, búsquedas ni fragmentos de la URL.
      if (clic) ['gclid', 'gbraid', 'wbraid'].forEach(k => {
        const v = u.searchParams.get(k);
        if (v && /^[A-Za-z0-9_-]{1,512}$/.test(v)) limpia.searchParams.set(k, v);
      });
      return limpia.href;
    } catch (e) { return ''; }
  }
  function cargaGoogle() {
    if (!permiteGoogle()) return;
    if (googleCargado) {
      window.gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied', analytics_storage: 'denied' });
      vaciaComprasGoogle();
      return;
    }
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
    window.gtag('set', 'ads_data_redaction', true);
    window.gtag('set', 'allow_ad_personalization_signals', false);
    window.gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied', analytics_storage: 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', GOOGLE_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: urlMedicion(location.href, true),
      page_referrer: urlMedicion(document.referrer, false),
      page_title: 'Viaje del Alma'
    });
    googleCargado = true;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GOOGLE_ID;
    document.head.appendChild(s);
    vaciaComprasGoogle();
  }
  function compraGoogle(datos, opciones) {
    if (estado === 'no') return;
    const id = opciones && opciones.eventID;
    const valor = datos && datos.value;
    const moneda = datos && datos.currency;
    // Ni pruebas de Stripe, ni regalos a cero, ni visitas/clics son ventas.
    if (typeof id !== 'string' || !/^cs_live_[A-Za-z0-9]{10,200}$/.test(id) ||
        typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0 ||
        typeof moneda !== 'string' || !/^[A-Z]{3}$/.test(moneda)) return;
    comprasGoogle.set(id, { value: valor, currency: moneda });
    vaciaComprasGoogle();
  }
  function vaciaComprasGoogle() {
    if (!permiteGoogle() || !googleCargado || !window.crypto || !crypto.subtle) return;
    comprasGoogle.forEach((datos, id) => {
      comprasGoogle.delete(id);
      crypto.subtle.digest('SHA-256', new TextEncoder().encode(id)).then(buffer => {
        // 64 caracteres estables por pedido. Google deduplica también si se
        // vuelve a abrir la página en otro navegador. No se guarda el pago aquí.
        const transaccion = Array.from(new Uint8Array(buffer), n => n.toString(16).padStart(2, '0')).join('');
        if (!permiteGoogle() || enviadasGoogle.has(transaccion)) return;
        enviadasGoogle.add(transaccion);
        window.gtag('event', 'conversion', {
          send_to: GOOGLE_COMPRA,
          value: datos.value,
          currency: datos.currency,
          transaction_id: transaccion
        });
      }).catch(function () {});
    });
  }
  function revocaMedicion() {
    comprasGoogle.clear();
    cola.length = 0;
    if (window.fbq) window.fbq('consent', 'revoke');
    if (googleCargado) window.gtag('consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
    // Borra solo las cookies publicitarias propias de este sitio.
    const dominios = ['', location.hostname, '.' + location.hostname];
    if (location.hostname.endsWith('.viajedelalma.app')) dominios.push('viajedelalma.app', '.viajedelalma.app');
    document.cookie.split(';').forEach(par => {
      const nombre = par.trim().split('=')[0];
      if (!/^(_fbp|_fbc|_gcl_[A-Za-z0-9_]+)$/.test(nombre)) return;
      dominios.forEach(d => { document.cookie = nombre + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : ''); });
    });
  }

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
    track(evento, datos, opciones) {
      if (!PIXEL_ID || estado === 'no') return;
      if (evento === 'Purchase') compraGoogle(datos, opciones);
      /* opciones (24-sep): { eventID: '…' }. Meta lo usa para no contar dos
         veces el mismo evento. Va como tercer argumento de fbq. */
      const args = opciones ? ['track', evento, datos || {}, opciones] : ['track', evento, datos || {}];
      if (estado === 'si' && window.fbq) window.fbq.apply(null, args);
      else cola.push(args); // se manda si acepta después
    },
    /* 24-sep: 'si' | 'no' | null (aún no ha contestado). Para que una página
       decida si merece la pena preparar un evento. */
    consentimiento() { return estado; },
    acepta() {
      estado = 'si'; version = VERSION; guarda(); quitaBarra();
      if (window.fbq) {
        window.fbq('consent', 'grant');
        cola.splice(0).forEach(a => window.fbq.apply(null, a));
      } else cargaPixel();
      cargaGoogle();
    },
    rechaza() { estado = 'no'; version = VERSION; guarda(); quitaBarra(); revocaMedicion(); },
    /* Para el enlace «Cambiar mis cookies» de la política de privacidad. */
    olvida() {
      try { localStorage.removeItem(CLAVE); localStorage.removeItem(CLAVE_VERSION); } catch (e) {}
      estado = null; version = null; revocaMedicion(); pintaBarra();
    },
  };
  function guarda() { try { localStorage.setItem(CLAVE, estado); localStorage.setItem(CLAVE_VERSION, version); } catch (e) {} }

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
      '<div class="in"><p>Usamos cookies de Meta y Google para medir los anuncios y las compras. ' +
      'Sin ellas la web funciona igual. <a href="/privacidad.html#cookies">Más información</a>.</p>' +
      '<div class="b"><button type="button" class="no">Solo lo necesario</button>' +
      '<button type="button" class="si">Aceptar</button></div></div>';
    b.querySelector('.si').addEventListener('click', window.vdaMeta.acepta);
    b.querySelector('.no').addEventListener('click', window.vdaMeta.rechaza);
    document.body.appendChild(b);
    reservaHueco(b);
  }

  if (!PIXEL_ID) return; // sin ID no hay nada que preguntar
  if (estado === 'si') { cargaPixel(); cargaGoogle(); }
  if (estado !== 'no' && !permiteGoogle()) {
    if (document.body) pintaBarra();
    else document.addEventListener('DOMContentLoaded', pintaBarra, { once: true });
  }
})();
