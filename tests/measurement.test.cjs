// node --test tests/measurement.test.cjs — no network or external packages.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { webcrypto, createHash } = require('node:crypto');
const source = fs.readFileSync(require('node:path').join(__dirname, '../meta.js'), 'utf8');
const VERSION = 'meta-google-20261110';
const SID = 'cs_live_ExampleOrder0123456789';
const hash = id => createHash('sha256').update(id).digest('hex');
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

function browser(saved = {}, options = {}) {
  const storage = new Map(Object.entries(saved));
  const nodes = new Map(), scripts = [], cookies = [];
  function element(tag = 'div') {
    const e = {
      tagName: tag, style: { cssText: '', height: '', removeProperty() {}, setProperty() {} },
      children: [], listeners: {},
      setAttribute() {}, addEventListener(name, fn) { this.listeners[name] = fn; },
      getBoundingClientRect() { return { height: 110 }; },
      appendChild(child) { this.children.push(child); child.parentNode = this; if (child.id) nodes.set(child.id, child); if (child.src) scripts.push(child.src); return child; },
      insertBefore(child) { return this.appendChild(child); },
      remove() { nodes.delete(this.id); },
      querySelector(selector) { return this.buttons[selector] ||= element('button'); }, buttons: {}
    };
    return e;
  }
  const document = {
    head: element('head'), body: element('body'), documentElement: element('html'),
    referrer: 'https://example.com/page?email=private@example.com',
    createElement: element, getElementById: id => nodes.get(id),
    getElementsByTagName: () => [{ parentNode: document.head }], addEventListener() {},
    fonts: { ready: Promise.resolve() }
  };
  Object.defineProperty(document, 'cookie', {
    get: () => options.cookies || '', set: value => cookies.push(value)
  });
  const location = new URL(options.url || 'https://viajedelalma.app/regalo/?gclid=abc_123&correo=private@example.com&session_id=SECRET#private');
  const ctx = {
    document, location, URL, TextEncoder, crypto: webcrypto, Map, Set, Uint8Array,
    localStorage: {
      getItem: k => { if (options.noStorage) throw Error('blocked'); return storage.get(k) || null; },
      setItem: (k,v) => { if (options.noStorage) throw Error('blocked'); storage.set(k,v); },
      removeItem: k => storage.delete(k)
    },
    addEventListener() {}, ResizeObserver: class { observe() {} disconnect() {} }
  };
  ctx.window = ctx;
  vm.runInNewContext(source, ctx);
  return {
    ctx, storage, nodes, scripts, cookies,
    events: () => Array.from(ctx.dataLayer || [], args => Array.from(args)),
    conversions: () => Array.from(ctx.dataLayer || [], args => Array.from(args)).filter(a => a[0] === 'event' && a[1] === 'conversion'),
    buy: (id = SID, value = 19.99, currency = 'EUR') => ctx.vdaMeta.track('Purchase', { value, currency, email: 'must-not-leak@example.com', content_name: 'private-name' }, { eventID: id })
  };
}

test('no advertising scripts before a decision; rejecting loads none', async () => {
  const b = browser();
  b.buy();
  await settle();
  assert.equal(b.scripts.length, 0);
  assert.equal(b.conversions().length, 0);
  assert.ok(b.nodes.has('vda-cookies'));
  b.ctx.vdaMeta.rechaza();
  assert.equal(b.scripts.length, 0);
  assert.equal(b.nodes.has('vda-cookies'), false);
});

test('old Meta permission never becomes Google permission automatically', async () => {
  const b = browser({ vda_cookies: 'si' });
  assert.ok(b.scripts.some(s => s.includes('facebook.net')));
  assert.equal(b.scripts.some(s => s.includes('googletagmanager')), false);
  assert.ok(b.nodes.has('vda-cookies'));
  b.buy();
  await settle();
  assert.equal(b.conversions().length, 0);
  b.ctx.vdaMeta.acepta();
  await settle();
  assert.equal(b.conversions().length, 1);
});

test('old rejection is respected without re-prompting', () => {
  const b = browser({ vda_cookies: 'no' });
  assert.equal(b.scripts.length, 0);
  assert.equal(b.nodes.has('vda-cookies'), false);
});

test('late acceptance sends the confirmed value once with a hashed transaction ID', async () => {
  const b = browser();
  b.buy(); b.buy();
  b.ctx.vdaMeta.acepta();
  b.buy();
  await settle();
  assert.equal(b.conversions().length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(b.conversions()[0][2])), {
    send_to: 'AW-18490350522/gEiICLOQn44dELq38fBE', value: 19.99, currency: 'EUR', transaction_id: hash(SID)
  });
  assert.equal(b.storage.get('vda_cookies_version'), VERSION);
  assert.equal(b.scripts.filter(s => s.includes('googletagmanager')).length, 1);
  assert.equal(JSON.stringify(b.events()).includes('private'), false);
  assert.equal(JSON.stringify(b.events()).includes('SECRET'), false);
  assert.equal(JSON.stringify(b.events()).includes(SID), false);
});

test('each real order has its own stable ID, even in a new browser', async () => {
  const permission = { vda_cookies: 'si', vda_cookies_version: VERSION };
  const a = browser(permission), b = browser(permission);
  a.buy(); a.buy(SID+'B', 2.99); b.buy();
  await settle();
  assert.equal(a.conversions().length, 2);
  assert.equal(a.conversions()[0][2].transaction_id, b.conversions()[0][2].transaction_id);
  assert.notEqual(a.conversions()[0][2].transaction_id, a.conversions()[1][2].transaction_id);
});

test('test payments, zero amounts, malformed IDs/currency and non-purchase events never convert', async () => {
  const b = browser({ vda_cookies: 'si', vda_cookies_version: VERSION });
  b.buy('cs_test_ExampleOrder0123456789'); b.buy('fake'); b.buy(undefined, 0);
  b.buy(undefined, -2); b.buy(undefined, Infinity); b.buy(undefined, '19.99'); b.buy(undefined, 5, 'bad');
  b.ctx.vdaMeta.track('InitiateCheckout', { value: 19.99, currency: 'EUR' }, { eventID: SID });
  b.ctx.vdaMeta.track('Purchase', { value: 19.99, currency: 'EUR' });
  await settle();
  assert.equal(b.conversions().length, 0);
});

test('Google consent and clean URL settings precede loading and exclude personalization', () => {
  const b = browser({ vda_cookies: 'si', vda_cookies_version: VERSION });
  const ev = b.events();
  assert.equal(ev[0][0], 'consent'); assert.equal(ev[0][1], 'default');
  assert.equal(ev[0][2].ad_storage, 'denied');
  const update = ev.find(e => e[0] === 'consent' && e[1] === 'update')[2];
  assert.equal(update.ad_storage, 'granted'); assert.equal(update.ad_user_data, 'granted');
  assert.equal(update.ad_personalization, 'denied'); assert.equal(update.analytics_storage, 'denied');
  const config = ev.find(e => e[0] === 'config')[2];
  assert.equal(config.page_location, 'https://viajedelalma.app/regalo/?gclid=abc_123');
  assert.equal(config.page_referrer, 'https://example.com/page');
  assert.equal(config.page_title, 'Viaje del Alma');
  assert.equal(config.send_page_view, false);
});

test('revocation during hashing suppresses conversion and removes advertising cookies only', async () => {
  const b = browser({ vda_cookies: 'si', vda_cookies_version: VERSION }, { cookies: '_fbp=a; _gcl_aw=b; essential=c' });
  b.buy(); b.ctx.vdaMeta.olvida();
  await settle();
  assert.equal(b.conversions().length, 0);
  assert.equal(b.ctx.vdaMeta.consentimiento(), null);
  assert.ok(b.nodes.has('vda-cookies'));
  assert.ok(b.cookies.some(c => c.startsWith('_gcl_aw=')));
  assert.equal(b.cookies.some(c => c.startsWith('essential=')), false);
  assert.equal(b.events().at(-1)[2].ad_user_data, 'denied');
});

test('blocked storage still permits an explicit decision for this page', async () => {
  const b = browser({}, { noStorage: true });
  b.buy(); b.ctx.vdaMeta.acepta(); await settle();
  assert.equal(b.conversions().length, 1);
});

test('Meta still receives its existing checkout and purchase payloads', async () => {
  const b = browser();
  b.ctx.vdaMeta.track('InitiateCheckout', { value: 19.99 }); b.buy();
  b.ctx.vdaMeta.acepta(); await settle();
  const q = Array.from(b.ctx.fbq.queue, args => Array.from(args));
  assert.ok(q.some(a => a[0] === 'track' && a[1] === 'PageView'));
  assert.ok(q.some(a => a[0] === 'track' && a[1] === 'InitiateCheckout'));
  assert.ok(q.some(a => a[0] === 'track' && a[1] === 'Purchase' && a[3].eventID === SID));
});
