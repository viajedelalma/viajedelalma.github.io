// node --test tests/resumen-measurement.test.cjs — no network or external packages.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../resumen/index.html'), 'utf8');
const start = html.indexOf('const mide =');
const end = html.indexOf('\nlet sb =', start);
assert.ok(start >= 0 && end > start, 'Read the measurement helper from the shipped page');
const source = html.slice(start, end);

function page({ ready = false, missingScript = false } = {}) {
  const events = [];
  const script = new EventTarget();
  const counter = { count: event => events.push(JSON.parse(JSON.stringify(event))) };
  const context = {
    window: ready ? { goatcounter: counter } : {},
    document: { querySelector: () => missingScript ? null : script }
  };
  vm.createContext(context);
  vm.runInContext(source + '\nthis.measure = mide;', context);
  return { events, context, counter, script, measure: context.measure };
}

test('events before the async counter loads are sent once, in order, when it is ready', () => {
  const p = page();
  p.measure('resumen-pide-entrar');
  p.measure('resumen-abre');
  assert.deepEqual(p.events, []);
  p.context.window.goatcounter = p.counter;
  p.script.dispatchEvent(new Event('load'));
  p.script.dispatchEvent(new Event('load'));
  assert.deepEqual(p.events, [
    { path: 'resumen-pide-entrar', event: true },
    { path: 'resumen-abre', event: true }
  ]);
});

test('a ready counter receives each event immediately, without adding pageviews', () => {
  const p = page({ ready: true });
  p.measure('resumen-abre');
  p.script.dispatchEvent(new Event('load'));
  assert.deepEqual(p.events, [{ path: 'resumen-abre', event: true }]);
});

test('missing or blocked analytics never interrupts the page', () => {
  assert.doesNotThrow(() => page({ missingScript: true }).measure('resumen-abre'));
  const p = page();
  assert.doesNotThrow(() => p.measure('resumen-abre'));
  p.script.dispatchEvent(new Event('load'));
  assert.deepEqual(p.events, []);
});

test('a counter exception is isolated both before and after its load', () => {
  const p = page();
  p.measure('resumen-abre');
  p.context.window.goatcounter = { count() { throw Error('unavailable'); } };
  assert.doesNotThrow(() => p.script.dispatchEvent(new Event('load')));
  assert.doesNotThrow(() => p.measure('resumen-a-app'));
});

test('a counter declining an event is not bypassed or retried', () => {
  const p = page({ ready: true });
  let calls = 0;
  p.context.window.goatcounter = { count() { calls++; return false; } };
  p.measure('resumen-abre');
  p.script.dispatchEvent(new Event('load'));
  assert.equal(calls, 1);
});
