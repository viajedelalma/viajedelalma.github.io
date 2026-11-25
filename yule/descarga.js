(function () {
  'use strict';
  const api = window.VdaYule;
  const estado = document.getElementById('estado-descarga');
  const archivos = document.getElementById('archivos');
  const noche = document.getElementById('pdf-noche');
  const papel = document.getElementById('pdf-papel');
  const meditacion = document.getElementById('meditacion');
  const audio = document.getElementById('audio');
  const audioDescarga = document.getElementById('audio-descarga');
  const reintentar = document.getElementById('reintentar');
  const cuenta = window.yuleCuenta || function () {};
  const clave = 'vda-yule-session';
  const retorno = window.yuleSession || '';
  const desdeCorreo = window.yuleDesdeCorreo === true;
  delete window.yuleSession;
  delete window.yuleDesdeCorreo;
  function leer(almacen, k) { try { return almacen.getItem(k) || ''; } catch (_) { return ''; } }
  function guardar(almacen, k, valor) { try { almacen.setItem(k, valor); } catch (_) {} }
  // El almacenamiento puede estar bloqueado por el navegador.
  let local, sesion;
  try { local = window.localStorage; sesion = window.sessionStorage; } catch (_) {}
  const sid = retorno || leer(local, clave);
  let ocupado = false;
  let confirmado = false;
  let refresco;
  function ocultarArchivos() {
    archivos.hidden = true;
    meditacion.hidden = true;
    [noche, papel, audioDescarga].forEach(function (el) { el.removeAttribute('href'); });
    audio.pause(); audio.removeAttribute('src'); audio.load();
    if (refresco) clearTimeout(refresco);
  }
  async function comprobar() {
    if (ocupado) return;
    if (!api || !api.config.DESCARGA_LISTA) {
      ocultarArchivos();
      estado.textContent = 'La descarga estará disponible cuando se abra la venta de la guía.';
      return;
    }
    if (!/^cs_(?:live|test)_[A-Za-z0-9]+$/.test(sid)) {
      estado.textContent = 'Abre el enlace de confirmación que recibiste después de pagar. Esta página por sí sola no da acceso a la guía.';
      return;
    }
    ocupado = true;
    reintentar.hidden = true;
    estado.textContent = confirmado ? 'Actualizando tus enlaces de descarga…' : 'Estamos comprobando tu compra…';
    const controlador = new AbortController();
    const limite = setTimeout(function () { controlador.abort(); }, 15000);
    try {
      const url = 'https://orxyhxehapqmjwmqmqgv.supabase.co/functions/v1/descarga?p=yule&session_id=' + encodeURIComponent(sid);
      const respuesta = await fetch(url, { signal: controlador.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!respuesta.ok) throw new Error('sin-acceso');
      const datos = await respuesta.json();
      const a = datos && datos.archivos;
      // Contrato de activación: el servidor confirma el pago y firma ambos PDF.
      if (datos.ok !== true || !a || !api.enlaceArchivoValido(a.pantalla) || !api.enlaceArchivoValido(a.imprimir)) throw new Error('respuesta-incompleta');
      noche.href = a.pantalla;
      papel.href = a.imprimir;
      archivos.hidden = false;
      if (api.enlaceArchivoValido(a.audio)) {
        audio.src = a.audio;
        audioDescarga.href = api.enlaceArchivoValido(a.audio_descarga) ? a.audio_descarga : a.audio;
        meditacion.hidden = false;
      } else {
        meditacion.hidden = true;
        audio.pause(); audio.removeAttribute('src'); audio.load(); audioDescarga.removeAttribute('href');
      }
      estado.textContent = 'Ya puedes descargar tu guía.';
      guardar(local, clave, sid);
      // No es una fuente contable: solo una confirmación de acceso en este navegador.
      // Abrir una URL con session_id jamás basta para registrar este evento.
      if (!confirmado && leer(sesion, 'vda-yule-contado') !== sid) {
        cuenta(retorno ? (desdeCorreo ? 'yule-desde-correo' : 'yule-pago-verificado') : 'yule-recupera-descarga');
        guardar(sesion, 'vda-yule-contado', sid);
      }
      confirmado = true;
      if (refresco) clearTimeout(refresco);
      refresco = setTimeout(comprobar, 50 * 60 * 1000);
    } catch (_) {
      ocultarArchivos();
      estado.textContent = 'No hemos podido confirmar el acceso. Si acabas de pagar, espera un momento y vuelve a comprobarlo. No hagas otra compra.';
      reintentar.hidden = false;
    } finally {
      clearTimeout(limite);
      ocupado = false;
    }
  }
  reintentar.addEventListener('click', comprobar);
  [[noche, 'yule-descarga-noche'], [papel, 'yule-descarga-papel'], [audioDescarga, 'yule-descarga-audio']].forEach(function (par) {
    par[0].addEventListener('click', function () { if (!archivos.hidden && par[0].hasAttribute('href')) cuenta(par[1]); });
  });
  comprobar();
})();
