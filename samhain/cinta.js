/* Cinta de temporada · Samhain 2026 (26-sep).
   Una sola línea en lo alto de cada página que la carga. Se retira sola el
   3-nov; para quitarla antes, borrar la línea <script src="/samhain/cinta.js">
   de cada página o dejar este archivo vacío. */
(function () {
  var ahora = Date.now();
  var LANZAMIENTO = Date.parse('2026-10-01T20:00:00+02:00');
  var FIN = Date.parse('2026-11-03T00:00:00+01:00');
  if (ahora >= FIN || /^\/samhain\//.test(location.pathname)) return;

  var pagina = (location.pathname.replace(/^\/|\/$|\.html$/g, '') || 'portada').replace(/\//g, '-');
  var antes = ahora < LANZAMIENTO;
  var texto = antes
    ? '<b>Samhain · 31 de octubre</b><span class="vda-cs-sep"> · </span><span class="vda-cs-sub">La guía de las siete noches llega el 1 de octubre</span>'
    : '<b>Guía de Samhain · 6,99 €</b><span class="vda-cs-sep"> · </span><span class="vda-cs-sub">Siete noches hacia el año nuevo celta</span>';

  var css = '.vda-cinta{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;' +
    'padding:9px 16px;background:linear-gradient(90deg,#1a0f08,#3a1c0c 50%,#1a0f08);' +
    'border-bottom:1px solid rgba(196,154,60,.55);color:#F6E3AE;font:15px/1.35 "Cormorant Garamond",Georgia,serif;' +
    'text-align:center;text-decoration:none!important;position:relative;z-index:30}' +
    '.vda-cinta b{font-family:Cinzel,"Cormorant Garamond",serif;font-weight:500;letter-spacing:.08em;font-size:.86em;color:#E8CE8C}' +
    '.vda-cinta .vda-cs-ir{white-space:nowrap;border:1px solid rgba(196,154,60,.7);border-radius:999px;padding:2px 11px;' +
    'font-size:.84em;letter-spacing:.06em;color:#F6E3AE}' +
    '.vda-cinta:hover .vda-cs-ir{background:rgba(196,154,60,.18)}' +
    '.vda-cinta .vda-cs-fuego{color:#e9853a}' +
    '@media (max-width:520px){.vda-cinta{font-size:13.5px;gap:6px;padding:8px 12px}.vda-cs-sep,.vda-cs-sub{display:none}}';

  function monta() {
    if (document.querySelector('.vda-cinta')) return;
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    var a = document.createElement('a');
    a.className = 'vda-cinta';
    a.href = '/samhain/?utm_source=web&utm_medium=cinta&utm_campaign=samhain&o=' + encodeURIComponent(pagina);
    a.innerHTML = '<span class="vda-cs-fuego" aria-hidden="true">🔥</span><span>' + texto + '</span>' +
      '<span class="vda-cs-ir">' + (antes ? 'Avísame →' : 'Verla →') + '</span>';
    a.addEventListener('click', function () {
      try {
        if (window.goatcounter && window.goatcounter.count) {
          window.goatcounter.count({ path: 'cinta-samhain-' + pagina, title: 'Cinta Samhain desde ' + pagina, event: true });
        }
      } catch (e) {}
    });
    document.body.insertBefore(a, document.body.firstChild);
  }
  if (document.body) monta(); else document.addEventListener('DOMContentLoaded', monta);
})();
