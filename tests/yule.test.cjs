const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const api = require('../yule/config.js');
const source = name => fs.readFileSync(path.join(__dirname, '../yule', name), 'utf8');
const abierta = { ENLACE_699: 'https://buy.stripe.com/test_yule', FIN_VENTA: '', DESCARGA_LISTA: true };
// El borrador anterior a la venta (sin enlace ni descarga) sigue sin cobrar ni descargar.
const pendiente = { ...api.config, ENLACE_699: '', DESCARGA_LISTA: false };
const firmado = name => 'https://orxyhxehapqmjwmqmqgv.supabase.co/storage/v1/object/sign/yule/' + name + '?token=ficticio';

test('no cobra ni solo con Stripe ni solo con los archivos listos; la configuración publicada abre la venta', () => {
  assert.equal(api.config.PRECIO, 6.99);
  assert.equal(api.config.ENLACE_699, 'https://buy.stripe.com/4gMaEYc5K36Pc2LcUUew80d');
  assert.equal(api.config.DESCARGA_LISTA, true);
  assert.equal(api.config.FIN_VENTA, '2027-01-07T00:00:00+01:00');
  assert.equal(api.estadoVenta(api.config, Date.parse('2026-11-28T12:00:00+01:00')), 'venta');
  assert.equal(api.estadoVenta(api.config, Date.parse('2027-01-07T00:00:00+01:00')), 'cerrada');
  assert.equal(api.estadoVenta({...abierta, DESCARGA_LISTA: false}, Date.now()), 'pendiente');
  assert.equal(api.estadoVenta({...abierta, ENLACE_699: ''}, Date.now()), 'pendiente');
  assert.equal(api.estadoVenta(abierta, Date.now()), 'venta');
});
test('cierra exactamente en la fecha con zona y falla cerrado con fecha inválida', () => {
  const config = {...abierta, FIN_VENTA: '2027-01-07T00:00:00+01:00'};
  const limite = Date.parse('2027-01-06T23:00:00Z');
  assert.equal(api.estadoVenta(config, limite-1), 'venta');
  assert.equal(api.estadoVenta(config, limite), 'cerrada');
  assert.equal(api.estadoVenta({...config, FIN_VENTA: 'pendiente'}, limite), 'pendiente');
});
test('rechaza enlaces de pago y archivos ajenos o no firmados', () => {
  for (const url of ['', 'javascript:alert(1)', 'http://buy.stripe.com/x', 'https://buy.stripe.com.ejemplo.es/x', 'https://x:pass@buy.stripe.com/x']) assert.equal(api.enlacePagoValido(url), false);
  for (const url of ['https://ejemplo.es/a.pdf', 'javascript:alert(1)', 'https://orxyhxehapqmjwmqmqgv.supabase.co/storage/v1/object/public/yule/guia.pdf']) assert.equal(api.enlaceArchivoValido(url), false);
  assert.equal(api.enlaceArchivoValido(firmado('noche.pdf')), true);
});

function element() {
  const attrs = new Map(); const listeners = {};
  return {hidden:true, disabled:false, checked:false, textContent:'', dataset:{}, tabIndex:-1,
    offsetHeight:60, classList:{add(){},remove(){},toggle(){}},
    addEventListener(n,f){listeners[n]=f;}, fire(n){return listeners[n]?.();},
    getBoundingClientRect(){return {top:1200,bottom:1250};},
    focus(){this.focused=true;}, setAttribute(k,v){attrs.set(k,v);},
    hasAttribute(k){return attrs.has(k);}, removeAttribute(k){attrs.delete(k);},
    set href(v){attrs.set('href',v);}, get href(){return attrs.get('href');},
    pause(){},load(){}
  };
}
function env(config) {
  const nodes = {}; const events = []; const navigations = []; const handlers={};
  let now = Date.parse('2026-12-21T12:00:00Z');
  const context = {URL, AbortController, encodeURIComponent,
    Date:{now:()=>now}, innerHeight:800,
    setInterval:()=>1,setTimeout:()=>1,clearTimeout(){},
    location:{assign:u=>navigations.push(u)},
    document:{body:{dataset:{}},getElementById:id=>(nodes[id] ||= element()),addEventListener(){}},
    window:{VdaYule:{...api,config},yuleCuenta:e=>events.push(e),addEventListener:(n,f)=>handlers[n]=f}
  };
  return {context,nodes,events,navigations,handlers,setNow:v=>now=v};
}
test('sin consentimiento no sale a Stripe; evita el doble clic y el cobro si vence abierta', () => {
  const e=env({...abierta, FIN_VENTA:'2027-01-07T00:00:00+01:00'});
  vm.runInNewContext(source('yule.js'),e.context);
  e.nodes.comprar.fire('click');
  assert.equal(e.navigations.length,0);
  assert.equal(e.nodes.aviso.hidden,false);
  assert.equal(e.nodes.consiento.focused,true);
  e.nodes.consiento.checked=true;
  e.nodes.comprar.fire('click'); e.nodes.comprar.fire('click');
  assert.deepEqual(e.navigations,[abierta.ENLACE_699]);
  e.handlers.pageshow();
  e.setNow(Date.parse('2027-01-07T00:00:00+01:00'));
  e.nodes.comprar.fire('click');
  assert.equal(e.navigations.length,1);
  assert.equal(e.nodes.comprar.disabled,true);
  assert.equal(e.nodes.cerrada.hidden,false);
});
test('el enlace vacío permanece desactivado al invocar el manejador', () => {
  const e=env(pendiente);
  vm.runInNewContext(source('yule.js'),e.context);
  e.nodes.consiento.checked=true; e.nodes.comprar.fire('click');
  assert.equal(e.nodes.comprar.disabled,true);
  assert.equal(e.navigations.length,0);
});

const turn = () => new Promise(resolve=>setImmediate(resolve));
async function descarga({config=abierta, sid='cs_test_ficticio', response, denied=false, blockedStorage=false, desdeCorreo=false}={}) {
  const e=env(config); let calls=0;
  const stored = new Map();
  e.context.window.yuleSession=sid;
  e.context.window.yuleDesdeCorreo=desdeCorreo;
  const storage={getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)};
  e.context.window.localStorage=e.context.window.sessionStorage=storage;
  if (blockedStorage) Object.defineProperty(e.context.window,'localStorage',{get(){throw Error('bloqueado');}});
  e.context.fetch=async()=>{calls++; return {ok:!denied,json:async()=>response};};
  vm.runInNewContext(source('descarga.js'),e.context);
  await turn();
  return {...e,stored,calls};
}
test('ninguna descarga ni confirmación con enlace inventado o lanzamiento pendiente', async () => {
  for (const setup of [{config:pendiente},{sid:'inventado'}]) {
    const e=await descarga(setup);
    assert.equal(e.calls,0); assert.equal(e.events.length,0);
    assert.equal(e.nodes.archivos.hidden,true); assert.equal(e.stored.size,0);
  }
});
test('ni error HTTP, ni ok falso, ni archivos incompletos cuentan como pago', async () => {
  for (const setup of [{denied:true},{response:{ok:false}},{response:{ok:true,archivos:{pantalla:firmado('a.pdf')}}},{response:{ok:true,archivos:{pantalla:'https://ajeno.es/a.pdf',imprimir:firmado('b.pdf')}}}]) {
    const e=await descarga(setup);
    assert.equal(e.events.length,0);assert.equal(e.stored.size,0);
    assert.equal(e.nodes.archivos.hidden,true);assert.equal(e.nodes.reintentar.hidden,false);
  }
});
test('solo respuesta válida habilita ambos PDF y mantiene acceso después del cierre', async () => {
  const e=await descarga({config:{...abierta,FIN_VENTA:'2026-01-01T00:00:00Z'},response:{ok:true,archivos:{pantalla:firmado('noche.pdf'),imprimir:firmado('papel.pdf')}}});
  assert.equal(e.nodes.archivos.hidden,false);
  assert.equal(e.nodes['pdf-noche'].href,firmado('noche.pdf'));
  assert.equal(e.nodes['pdf-papel'].href,firmado('papel.pdf'));
  assert.deepEqual(e.events,['yule-pago-verificado']);
  assert.equal(e.stored.get('vda-yule-session'),'cs_test_ficticio');
  await e.nodes.reintentar.fire('click');
  assert.equal(e.events.length,1);
  e.context.fetch=async()=>({ok:false});
  await e.nodes.reintentar.fire('click');
  assert.equal(e.nodes.archivos.hidden,true);
  assert.equal(e.nodes['pdf-noche'].hasAttribute('href'),false);
});
test('con almacenamiento bloqueado, el retorno de pago sigue funcionando', async () => {
  const e=await descarga({blockedStorage:true,response:{ok:true,archivos:{pantalla:firmado('noche.pdf'),imprimir:firmado('papel.pdf')}}});
  assert.equal(e.nodes.archivos.hidden,false);
});
test('la página de gracias elimina la consulta antes de recursos externos', () => {
  const html=source('gracias-3d3dddbec7/index.html');
  assert.match(html, /noindex, nofollow/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.ok(html.indexOf('history.replaceState')<html.indexOf('<link'));
  const urls=[];
  const script=html.match(/<script>([\s\S]+?)<\/script>/)[1];
  const window={};
  vm.runInNewContext(script,{URL,location:{href:'https://viajedelalma.app/yule/gracias-3d3dddbec7/?session_id=cs_test_ficticio&utm_source=prueba#fragmento'},window,history:{replaceState:(a,b,u)=>urls.push(u)}});
  assert.equal(window.yuleSession,'cs_test_ficticio');
  assert.deepEqual(urls,['/yule/gracias-3d3dddbec7/']);
});
test('desde el correo de entrega da acceso pero no cuenta otro pago', async () => {
  const e=await descarga({desdeCorreo:true,response:{ok:true,archivos:{pantalla:firmado('noche.pdf'),imprimir:firmado('papel.pdf')}}});
  assert.equal(e.nodes.archivos.hidden,false);
  assert.deepEqual(e.events,['yule-desde-correo']);
});
test('la página de gracias reconoce ?de=correo y lo quita de la dirección', () => {
  const html=source('gracias-3d3dddbec7/index.html');
  const script=html.match(/<script>([\s\S]+?)<\/script>/)[1];
  for (const [consulta, esperado] of [['?session_id=cs_test_ficticio&de=correo', true], ['?session_id=cs_test_ficticio', false], ['?session_id=cs_test_ficticio&de=otro', false]]) {
    const urls=[], window={};
    vm.runInNewContext(script,{URL,location:{href:'https://viajedelalma.app/yule/gracias-3d3dddbec7/'+consulta},window,history:{replaceState:(a,b,u)=>urls.push(u)}});
    assert.equal(window.yuleSession,'cs_test_ficticio');
    assert.equal(window.yuleDesdeCorreo,esperado);
    assert.deepEqual(urls,['/yule/gracias-3d3dddbec7/']);
  }
});
