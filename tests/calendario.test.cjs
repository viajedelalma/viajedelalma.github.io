// node --test tests/calendario.test.cjs — sin red ni paquetes externos.
// Páginas de descarga del calendario 2027: la venta (GoatCounter y Purchase) solo cuenta al llegar
// desde Stripe; el enlace del correo de entrega (?de=correo) da las descargas sin contar otra venta.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const turn = () => new Promise(resolve => setImmediate(resolve));
const SID = 'cs_live_EjemploDePrueba0123456789';

function pagina(lado) {
  const dir = path.join(__dirname, '../calendario-2027');
  const carpeta = fs.readdirSync(dir).find(n => n.startsWith(`descarga-${lado}-`));
  const html = fs.readFileSync(path.join(dir, carpeta, 'index.html'), 'utf8');
  const bloques = [...html.matchAll(/<script>([\s\S]+?)<\/script>/g)].map(m => m[1]);
  return { carpeta, script: bloques[bloques.length - 1] };
}

async function abre(lado, consulta, guardado) {
  const { carpeta, script } = pagina(lado);
  const eventos = [], pedidos = [], compras = [], almacen = new Map(guardado ? [[`vda-sid-calendario_${lado}`, guardado]] : []);
  const nodos = new Map();
  const nodo = id => {
    if (!nodos.has(id)) {
      const atributos = new Map([['aria-disabled', 'true']]);
      nodos.set(id, { id, hidden: true, href: '#', value: '', disabled: false, textContent: '',
        getAttribute: k => (atributos.has(k) ? atributos.get(k) : null), setAttribute: (k, v) => atributos.set(k, v),
        removeAttribute: k => atributos.delete(k), addEventListener() {}, focus() {}, click() {} });
    }
    return nodos.get(id);
  };
  const ctx = {
    URLSearchParams, setTimeout, clearTimeout, setInterval: () => 0,
    location: { search: consulta, pathname: `/calendario-2027/${carpeta}/`, hash: '' },
    history: { replaceState() {} },
    navigator: { userAgent: 'Prueba' },
    document: { readyState: 'complete', getElementById: nodo, querySelector: () => null },
    localStorage: { getItem: k => (almacen.has(k) ? almacen.get(k) : null), setItem: (k, v) => almacen.set(k, v) },
    addEventListener() {},
    goatcounter: { count: o => eventos.push(o.path) },
    vdaMeta: { track: (nombre, datos, extra) => compras.push([nombre, datos.value, extra.eventID]) },
    fetch: async url => {
      pedidos.push(url);
      if (url.includes('/functions/v1/descarga')) return { json: async () => ({ ok: true, archivos: { pantalla: 'https://almacen/p.pdf', imprimir: 'https://almacen/i.pdf' } }) };
      if (url.includes('/functions/v1/estado-pedido')) return { json: async () => ({ pagado: true, importe_centimos: 299, moneda: 'eur' }) };
      return { ok: true, status: 201, json: async () => ({}) };
    },
  };
  ctx.window = ctx;
  vm.runInNewContext(script, ctx);
  for (let i = 0; i < 5; i++) await turn();
  return { eventos, pedidos, compras, almacen, nodo };
}

for (const lado of ['norte', 'sur']) {
  test(`${lado}: al llegar desde Stripe cuenta la venta una vez`, async () => {
    const r = await abre(lado, `?session_id=${SID}`);
    assert.equal(r.pedidos.filter(u => u.includes('estado-pedido')).length, 1);
    assert.deepEqual(r.compras, [['Purchase', 2.99, SID]]);
    assert.ok(r.eventos.includes(`cal-pagado-${lado}`));
    assert.equal(r.nodo('d-pantalla').href, 'https://almacen/p.pdf');
  });
  test(`${lado}: desde el correo de entrega da las descargas sin contar otra venta`, async () => {
    const r = await abre(lado, `?session_id=${SID}&de=correo`);
    assert.equal(r.pedidos.filter(u => u.includes('estado-pedido')).length, 0);
    assert.deepEqual(r.compras, []);
    assert.ok(r.eventos.includes(`cal-desde-correo-${lado}`));
    assert.ok(!r.eventos.some(e => e.startsWith('cal-pagado') || e.startsWith('cal-sid')));
    assert.equal(r.nodo('d-pantalla').href, 'https://almacen/p.pdf');
    assert.equal(r.nodo('d-imprimir').href, 'https://almacen/i.pdf');
    assert.equal(r.almacen.get(`vda-sid-calendario_${lado}`), SID);
  });
  test(`${lado}: volver sin enlace usa la compra guardada en el móvil y no cuenta venta`, async () => {
    const r = await abre(lado, '', SID);
    assert.equal(r.pedidos.filter(u => u.includes('estado-pedido')).length, 0);
    assert.ok(r.eventos.includes(`cal-vuelve-${lado}`));
    assert.equal(r.nodo('d-pantalla').href, 'https://almacen/p.pdf');
  });
}
