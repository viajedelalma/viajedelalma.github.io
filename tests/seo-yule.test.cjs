// node --test tests/*.test.cjs — sin paquetes ni red.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('rituales/yule/index.html');
const source = read('rituales/yule/guia.js');

function browser(api, now = Date.parse('2026-12-21T20:50:00Z')) {
  const guia = { hidden: true };
  const events = {};
  let timer, currentTime = now;
  const context = {
    window: { VdaYule: api, addEventListener: (name, fn) => events[name] = fn },
    document: { getElementById: () => guia, addEventListener: (name, fn) => events[name] = fn },
    Date: { now: () => currentTime },
    setInterval: fn => { timer = fn; }
  };
  vm.runInNewContext(source, context);
  return { guia, events, tick: time => { currentTime = time; timer(); } };
}

test('guía oculta sin la configuración comercial o si su evaluación falla', () => {
  assert.match(html, /id="guiaYule" hidden/);
  assert.equal(browser(undefined).guia.hidden, true);
  assert.equal(browser({}).guia.hidden, true);
  assert.equal(browser({ estadoVenta() { throw Error('fallo'); } }).guia.hidden, true);
});

test('solo el estado venta de la página comercial permite la invitación', () => {
  for (const state of ['pendiente', 'cerrada', undefined, 'venta']) {
    const config = { marcador: 'misma configuración de la página comercial' };
    const now = Date.parse('2026-12-21T20:50:00Z');
    const api = { config, estadoVenta(c, time) { assert.equal(c, config); assert.equal(time, now); return state; } };
    assert.equal(browser(api, now).guia.hidden, state !== 'venta');
  }
});

test('la pestaña abierta, restaurada o reactivada vuelve a consultar el estado', () => {
  let state = 'venta';
  const api = { config: {}, estadoVenta: () => state };
  const b = browser(api);
  assert.equal(b.guia.hidden, false);
  state = 'cerrada'; b.tick(Date.parse('2027-01-06T23:00:00Z'));
  assert.equal(b.guia.hidden, true);
  state = 'venta'; b.events.pageshow();
  assert.equal(b.guia.hidden, false);
  state = 'pendiente'; b.events.visibilitychange();
  assert.equal(b.guia.hidden, true);
});

test('artículo indexable, metadatos completos y solo Article/BreadcrumbList', () => {
  assert.doesNotMatch(html, /noindex|FAQPage|HowTo/);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  const description = html.match(/<meta name="description" content="([^"]+)"/)[1];
  assert.ok(description.length >= 140 && description.length <= 155);
  const canonical = 'https://viajedelalma.app/rituales/yule/';
  assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
  for (const name of ['og:title', 'og:description', 'og:type', 'og:site_name', 'og:image', 'og:url', 'og:locale', 'twitter:card']) assert.ok(html.includes(`="${name}"`));
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(data.map(x => x['@type']), ['Article', 'BreadcrumbList']);
  const article = data[0];
  for (const field of ['headline', 'datePublished', 'dateModified', 'image']) assert.ok(article[field]);
  assert.equal(article.author.name, 'Viaje del Alma');
  assert.equal(article.publisher.name, 'Viaje del Alma');
  assert.deepEqual(data[1].itemListElement.map(x => x.name), ['Inicio', 'Rituales', 'Yule']);
  assert.equal(data[1].itemListElement[1].item, 'https://viajedelalma.app/#rituales');
  assert.ok(read('index.html').includes('id="rituales"'));
  for (const url of article.image) assert.ok(fs.existsSync(path.join(root, new URL(url).pathname)));
});

test('enlaces internos descubribles, sitemap y atribución directa a Play', () => {
  for (const page of ['index.html', 'rituales/samhain/index.html']) assert.ok(read(page).includes('href="/rituales/yule/"'));
  assert.match(read('sitemap.xml'), /<loc>https:\/\/viajedelalma.app\/rituales\/yule\/<\/loc>\s*<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  assert.doesNotMatch(read('robots.txt'), /Disallow:\s*\/(?:rituales)?/);
  assert.ok(html.includes('href="/app/?o=seo-yule&amp;utm_source=web&amp;utm_medium=seo&amp;utm_campaign=yule"'));
  const links = [...html.matchAll(/href="(https:\/\/play.google.com[^" ]+)"/g)];
  assert.equal(links.length, 2);
  for (const [, raw] of links) {
    const u = new URL(raw.replaceAll('&amp;', '&'));
    assert.equal(u.searchParams.get('id'), 'com.viajedelalma.app');
    const ref = new URLSearchParams(u.searchParams.get('referrer'));
    assert.equal(ref.get('utm_source'), 'web');
    assert.equal(ref.get('utm_medium'), 'seo');
    assert.equal(ref.get('utm_campaign'), 'yule');
  }
});

test('la ruta indirecta por /app/ conserva la campaña hasta Play y la app web', () => {
  const raw = html.match(/href="(\/app\/\?o=seo-yule[^"]+)"/)[1];
  const url = new URL(raw.replaceAll('&amp;', '&'), 'https://viajedelalma.app');
  const app = read('app/index.html');
  const start = app.indexOf('(function(){ try{\n  var q=new URLSearchParams(location.search)');
  assert.ok(start >= 0);
  const end = app.indexOf('}catch(e){} })();', start) + '}catch(e){} })();'.length;
  const play = {}, web = {};
  vm.runInNewContext(app.slice(start, end), {
    URLSearchParams, encodeURIComponent, location: { search: url.search },
    document: { querySelectorAll: selector => selector.includes('play.google.com') ? [play] : [web] }
  });
  assert.equal(new URL(play.href).searchParams.get('referrer'), 'utm_source=web&utm_medium=seo&utm_campaign=yule');
  assert.equal(web.href, '/web/?utm_source=web&utm_medium=seo&utm_campaign=yule');
});
