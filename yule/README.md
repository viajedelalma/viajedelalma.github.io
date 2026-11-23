# YULE-2311-IMG-WEB · borrador para revisión

Página de «Siete luces y una mañana», basada en la estructura de `/samhain/`: presentación, precio, consentimiento, botón, barra fija, GoatCounter y retorno de pago con `noindex, nofollow`.

El precio es **6,99 €**, pago único, sin rebaja ni precio tachado. La guía sigue en preparación: el HTML inicial y el JavaScript muestran «Próximamente» y no permiten cobrar. No se modifica Samhain, la meditación, Mi espacio, Premium, Stripe ni el servidor de descargas.

## Configuración y activación posterior

En `config.js` se mantienen `ENLACE_699 = ''`, `FIN_VENTA = ''` y `DESCARGA_LISTA = false`.

1. Revisar los PDF finales Noche y Papel, campos y enlaces, y el acceso al audio aprobado. No se publica un número de páginas hasta comprobar los PDF.
2. Crear el producto de 6,99 € en Stripe y su enlace. Configurar el retorno a `https://viajedelalma.app/yule/gracias-3d3dddbec7/?session_id={CHECKOUT_SESSION_ID}`. La URL con hash es una ruta de retorno, **no una protección de los archivos**.
3. Preparar y probar el servidor de descarga para `p=yule`. Esta PR solo prepara el cliente: no afirma que el servidor ya admita este producto. El servidor debe comprobar pago, producto Yule e importe correcto; emitir enlaces firmados y rechazar sesiones ajenas, impagadas o inválidas.
4. Contrato del cliente: HTTP 2xx y `{ "ok": true, "archivos": { "pantalla": "URL firmada del PDF Noche", "imprimir": "URL firmada del PDF Papel", "audio": "URL firmada del audio", "audio_descarga": "URL firmada de descarga del audio" } }`. Ambos PDF son obligatorios. El audio solo se muestra si su URL es válida. Confirmar antes de activar el contrato real del servidor y la duración de los enlaces: el cliente los renueva a los 50 minutos, como en Samhain.
5. Resolver Premium y FIN_VENTA según las propuestas de abajo. Revisar el texto de consentimiento y los términos vigentes para esta guía.
6. Solo tras la comprobación completa, rellenar `ENLACE_699`, poner `DESCARGA_LISTA = true`, añadir la fecha que se decida y sustituir los textos «próximamente» de metadatos y preguntas por la disponibilidad real. Retirar `noindex` de la página comercial cuando se publique; conservarlo siempre en gracias.

Un enlace de Stripe por sí solo no habilita la compra si la entrega no está lista. Una fecha inválida deja la venta pendiente. El cierre se comprueba al entrar, cada minuto, al volver a la pestaña y al pulsar; no hay parámetro de URL que lo anule. El fin de venta no bloquea las descargas de compras anteriores.

## Propuesta Premium · pendiente de decisión, sin implementar

Texto propuesto junto al precio: **«Incluida en Premium. Si ya tienes una suscripción activa, no necesitas comprarla de nuevo.»**

Cuando el acceso esté terminado, añadir debajo: **«Entra en Mi espacio para descargar tu guía.»** con enlace a `/mi-espacio/`. Hasta entonces no se añade este botón ni se anuncia un acceso que aún no existe. Si se publicara una página de preparación antes, el texto veraz sería: **«La guía estará incluida en Premium cuando esté disponible.»**

Propuesta de entrega: una sección «Guía de Yule» en Mi espacio, con dos botones Noche/Papel y el audio aprobado, tras comprobar en el servidor la sesión autenticada y la suscripción activa. La ruta «Siete luces» de la app enlazaría al mismo acceso. Así no se mantienen dos sistemas de entrega y las suscriptoras no pasan por Stripe otra vez. Los PDF descargados se conservan; la posibilidad de volver a descargarlos tras cancelar Premium requiere una decisión expresa. Nada de este flujo se programa en esta PR.

## Propuesta FIN_VENTA · pendiente de decisión, sin activar

**6 de enero de 2027, 23:59, hora de Madrid**, con cierre técnico el **7 de enero a las 00:00**: `2027-01-07T00:00:00+01:00`.

Permite comprar durante las fiestas y Reyes, porque el recorrido se puede empezar en cualquier momento y también trae adaptaciones al verano. Evita tratar el solsticio como una fecha límite artificial. Es una propuesta para esta edición; una eventual venta de invierno austral en junio sería otra decisión. No hay cuenta atrás ni cierre activado en este borrador.

## Medición y privacidad

GoatCounter usa la cuenta ya existente y solo carga en `viajedelalma.app` y `www.viajedelalma.app`, nunca en la vista local. Eventos: `yule-pendiente`, `yule-venta`, `yule-cerrada`, `yule-ve-precio`, `yule-barra`, `yule-acepta`, `yule-comprar-sin-casilla`, `yule-comprar`, `yule-pago-verificado`, `yule-recupera-descarga` y descargas por formato.

`yule-comprar` es inicio de pago. `yule-pago-verificado` solo se envía después de una respuesta válida del servidor con los dos PDF. Estos eventos sirven para analizar el recorrido; **las ventas y su atribución se contrastan con los pedidos pagados**, no con visitas a gracias. El identificador de pago se retira de la URL antes de cargar recursos externos y no se manda a analítica. El navegador solo conserva un identificador después de confirmarlo en el servidor.

## Validación

`node --test tests/yule.test.cjs`: diez pruebas de los bloqueos de cobro y descarga, consentimiento, doble clic, cierre con pestaña abierta, errores de servidor, URLs inválidas, acceso tras el cierre, almacenamiento bloqueado y limpieza del retorno antes de analítica.

Revisión visual local de escritorio y de marcos de 390 y 320 px, con portada, lectura, barra, precio y preguntas. No es una prueba de pago real ni de entrega de los PDF finales: están pendientes de Stripe, los archivos y el soporte del servidor para Yule. No se han hecho compras ni enviado eventos de prueba a producción.

## Archivos y alcance

La imagen de portada es una copia para web de `YULE_I01_v1.png` de la tanda de ilustraciones. La página no incorpora la nota de producción de imágenes; el motor la añade dentro del PDF. La revisión creativa del conjunto corresponde a la revisión de la guía antes de publicar.

El cambio está aislado en `yule/` y `tests/yule.test.cjs`. El código de previsualización local no forma parte de la PR. La PR permanece en borrador; no se fusiona ni se despliega.
