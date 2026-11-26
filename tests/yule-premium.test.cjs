const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const html = fs.readFileSync(require('node:path').join(__dirname, '../mi-espacio/index.html'), 'utf8');
const funcion = html.slice(html.indexOf('function nivelYule()'), html.indexOf('/* ── Lo que has pedido'));
const BASE = 'https://orxyhxehapqmjwmqmqgv.supabase.co';
const signed = k => `${BASE}/storage/v1/object/sign/descargas/yule/${k}?token=ficticio`;
class Nodo {
  constructor(tag, clase, texto) { this.tag=tag; this.className=clase; this.textContent=texto||''; this.children=[]; this.listeners={}; this.isConnected=true; }
  appendChild(n) { this.children.push(n); return n; }
  setAttribute(k,v) { this[k]=v; }
  addEventListener(k,v) { this.listeners[k]=v; }
  click(e={preventDefault(){}}) { return this.listeners.click?.(e); }
}
function escena() {
  let reloj = 1000000, sesion = {user:{id:'a'},access_token:'token-a'}, temporizador, resolver;
  const llamadas=[],eventos=[];
  const c = { URL, Date:{now:()=>reloj,parse:Date.parse}, AbortSignal, GEN:1, USUARIO:'a', SUPABASE_URL:BASE, SUPABASE_ANON:'publica',
    nodo:(...a)=>new Nodo(...a), enlace:(t,u)=>Object.assign(new Nodo('a','',t),{href:u}),
    nivel:(_i,_e,_est,_apag,t,_par,_not,acciones)=>Object.assign(new Nodo('section','',t),{children:acciones}),
    cuentaActual:async()=>sesion, vacia:n=>{n.children=[];n.textContent='';},
    limpia:()=>{c.GEN++;c.USUARIO=null;}, mide:e=>eventos.push(e),
    setTimeout:f=>(temporizador=f,1), clearTimeout(){},
    fetch:async(u,o)=>{llamadas.push({u,o});return {ok:true,json:async()=>respuesta};}
  };
  let respuesta={ok:true,archivos:{pantalla:signed('noche.pdf'),imprimir:signed('papel.pdf'),audio_descarga:signed('audio.mp3')},caduca_en:new Date(reloj+300000).toISOString()};
  vm.createContext(c);vm.runInContext(funcion,c);const card=c.nivelYule(),[boton,caja]=card.children;
  return {c,card,boton,caja,llamadas,eventos,setSesion:s=>sesion=s,setRespuesta:r=>respuesta=r,
    setAhora:n=>reloj=n,caduca:()=>temporizador(),valida:()=>respuesta,
    pausa:()=>{c.fetch=async(u,o)=>{llamadas.push({u,o});return new Promise(r=>resolver=r);};},
    resuelve:()=>resolver({ok:true,json:async()=>respuesta})};
}
test('la tarjeta se pinta únicamente con el permiso explícito del servidor',()=>{
  assert.match(html,/if \(j\.yule && j\.yule\.disponible === true\) niveles\.appendChild\(nivelYule\(\)\)/);
  assert.doesNotMatch(funcion,/localStorage|session_id|tier\s*===/);
});
test('envía el token actual en cabecera, prepara ambos PDF y no filtra identificadores a analítica',async()=>{
  const e=escena(); await e.boton.click();
  assert.equal(e.llamadas[0].u,BASE+'/functions/v1/descarga?p=yule');
  assert.equal(e.llamadas[0].o.headers.Authorization,'Bearer token-a');
  assert.equal(e.llamadas[0].o.cache,'no-store'); assert.equal(e.caja.children.length,3);
  assert.deepEqual(e.eventos,['mi-espacio-yule-preparada']);
  assert.equal(e.boton.disabled,false);
});
test('nunca expone enlaces incompletos, externos, públicos, maliciosos o demasiado duraderos',async()=>{
  for(const altera of [r=>r.ok=false,r=>delete r.archivos.imprimir,r=>r.archivos.pantalla='https://otro.es/x',
    r=>r.archivos.imprimir='javascript:alert(1)',r=>r.archivos.pantalla=BASE+'/storage/v1/object/public/descargas/yule/x',
    r=>r.caduca_en=new Date(1400000).toISOString(),r=>r.caduca_en='incorrecta']) {
    const e=escena();altera(e.valida());await e.boton.click();assert.equal(e.caja.children.length,0);assert.match(e.caja.textContent,/No hemos podido/);assert.equal(e.eventos.length,0);
  }
});
test('cambio de cuenta antes de solicitar: borra los datos y no llama a descarga',async()=>{
  const e=escena();e.setSesion({user:{id:'b'},access_token:'token-b'});await e.boton.click();assert.equal(e.llamadas.length,0);assert.equal(e.c.USUARIO,null);
});
test('respuesta tardía tras salir o cambiar de cuenta no enseña enlaces',async()=>{
  for(const modo of ['evento','sesion','dom']) {
    const e=escena();e.pausa();const p=e.boton.click();await new Promise(setImmediate);
    if(modo==='evento') e.c.limpia();if(modo==='sesion')e.setSesion(null);if(modo==='dom')e.card.isConnected=false;
    e.resuelve();await p;assert.equal(e.caja.children.length,0);assert.equal(e.eventos.length,0);
  }
});
test('los enlaces caducan en pantalla y un clic caducado no abre el archivo',async()=>{
  const e=escena();await e.boton.click();const a=e.caja.children[0];e.setAhora(1300000);let impedido=false;
  a.click({preventDefault(){impedido=true;}});assert.equal(impedido,true);assert.equal(e.caja.children.length,0);
  e.caduca();assert.match(e.caja.textContent,/caducado/);
});
test('evita doble petición y permite reintentar un fallo de conexión',async()=>{
  const e=escena();e.pausa();const p=e.boton.click();await Promise.resolve();await e.boton.click();assert.equal(e.llamadas.length,1);e.resuelve();await p;
  e.c.fetch=async()=>{throw Error('red');};await e.boton.click();assert.equal(e.boton.disabled,false);assert.equal(e.caja.children.length,0);
});
