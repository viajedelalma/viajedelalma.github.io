/* Tarjeta regalo de Viaje del Alma (26-oct-2026).
   window.VdaRegalo.tarjeta(contenedor, datos, opciones) pinta la tarjeta con
   textContent (nada de lo que escribe quien regala entra como HTML).
   window.VdaRegalo.api(accion, cuerpo) habla con la Edge Function «regalo». */
(function () {
  'use strict';
  var FUNCION = 'https://orxyhxehapqmjwmqmqgv.supabase.co/functions/v1/regalo';
  var CANJE = 'https://viajedelalma.app/regalo/canjear/';

  function el(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }

  function fechaLarga(iso) {
    try {
      return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
    } catch (e) { return ''; }
  }

  function enlaceCanje(codigo) { return CANJE + '?c=' + encodeURIComponent(codigo); }

  function qr(contenedor, texto) {
    contenedor.textContent = '';
    if (typeof window.qrcode !== 'function') return;     // sin la librería, la tarjeta sale sin QR
    try {
      var q = window.qrcode(0, 'M');
      q.addData(texto);
      q.make();
      // SVG: se ve nítido en pantalla y al imprimir.
      contenedor.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      var svg = contenedor.querySelector('svg');
      if (svg) svg.setAttribute('aria-label', 'Código QR para canjear el regalo');
    } catch (e) { contenedor.textContent = ''; }
  }

  /* Nada se corta: si la dedicatoria (o un nombre largo) no cabe, la dedicatoria
     baja de tamaño hasta que todo entra en el marco. El tamaño se guarda en cqw,
     así que al imprimir (otra anchura) la tarjeta sale igual. */
  function ajusta(t) {
    var d = t.querySelector('.t-dedicatoria'), marco = t.querySelector('.t-marco');
    if (!d || !marco) return;
    d.style.fontSize = '';
    if (!d.textContent) return;
    var ancho = t.getBoundingClientRect().width;
    if (!ancho) return;
    var cq = parseFloat(getComputedStyle(d).fontSize) / ancho * 100;
    for (var i = 0; i < 30 && marco.scrollHeight > marco.clientHeight + 1 && cq > 1.5; i++) {
      cq *= 0.94;
      d.style.fontSize = cq.toFixed(3) + 'cqw';
    }
  }

  /** datos: { para, de, dedicatoria, codigo, caduca_en }  ·  opciones: { tema: 'noche'|'papel', muestra } */
  function tarjeta(contenedor, datos, opciones) {
    opciones = opciones || {};
    contenedor.textContent = '';
    var t = el('div', 'tarjeta' + (opciones.tema === 'papel' ? ' papel' : '') + (opciones.muestra ? ' muestra' : ''));
    var dedic = String(datos.dedicatoria || '').trim();
    if (!dedic) t.classList.add('sin-dedicatoria');
    var m = el('div', 't-marco');
    ['a', 'b', 'c', 'd'].forEach(function (x) { m.appendChild(el('span', 't-esquina ' + x)); });

    var marca = el('div', 't-marca');
    var logo = el('img');
    logo.src = '/logo.png'; logo.alt = ''; logo.width = 64; logo.height = 64;
    marca.appendChild(logo);
    marca.appendChild(el('span', null, 'Viaje del Alma'));
    m.appendChild(marca);

    var nombre = String(datos.para || '').trim() || 'ti';
    var para = el('div', 't-para' + (nombre.length > 28 ? ' larga' : nombre.length > 16 ? ' media' : ''));
    para.appendChild(el('small', null, 'Un regalo para'));
    para.appendChild(document.createTextNode(nombre));
    m.appendChild(para);
    m.appendChild(el('div', 't-regalo', 'Tu carta natal, escrita para ti, y tu calendario lunar 2027'));
    var ded = el('div', 't-dedicatoria', dedic ? '«' + dedic + '»' : '');
    if (dedic.length > 190) ded.classList.add('larga'); else if (dedic.length > 110) ded.classList.add('media');
    m.appendChild(ded);
    var de = String(datos.de || '').trim();
    if (de) m.appendChild(el('div', 't-firma', '— ' + de));

    var pie = el('div', 't-pie');
    var cqr = el('div', 't-qr');
    pie.appendChild(cqr);
    var canje = el('div', 't-canje');
    canje.appendChild(el('div', null, 'Tu código'));
    canje.appendChild(el('div', 't-codigo', datos.codigo || 'VDA-····-····'));
    var linea = el('div');
    linea.appendChild(document.createTextNode('Canjéalo en '));
    linea.appendChild(el('b', null, 'viajedelalma.app/regalo/canjear'));
    var hasta = datos.caduca_en ? fechaLarga(datos.caduca_en) : '';
    if (hasta) linea.appendChild(document.createTextNode(' antes del ' + hasta));
    linea.appendChild(document.createTextNode('.'));
    canje.appendChild(linea);
    pie.appendChild(canje);
    m.appendChild(pie);
    t.appendChild(m);
    contenedor.appendChild(t);
    if (datos.codigo) qr(cqr, enlaceCanje(datos.codigo));
    ajusta(t);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ajusta(t); });
    return t;
  }

  function api(accion, cuerpo, ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    if (ctl) setTimeout(function () { ctl.abort(); }, ms || 15000);
    var datos = Object.assign({ accion: accion }, cuerpo || {});
    return fetch(FUNCION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
      signal: ctl ? ctl.signal : undefined,
    }).then(function (r) { return r.json(); });
  }

  /** Cuenta un evento en GoatCounter una sola vez por visita (count.js va con async). */
  var medidos = {};
  function mide(ev) {
    if (medidos[ev]) return;
    medidos[ev] = true;
    var envia = function () { try { window.goatcounter.count({ path: ev, title: ev, event: true }); } catch (e) {} };
    if (window.goatcounter && window.goatcounter.count) return envia();
    var s = document.querySelector('script[data-goatcounter]');
    if (s) s.addEventListener('load', envia, { once: true });
    else window.addEventListener('load', function () { setTimeout(envia, 500); }, { once: true });
  }

  window.VdaRegalo = { tarjeta: tarjeta, api: api, fechaLarga: fechaLarga, enlaceCanje: enlaceCanje, mide: mide };
})();
