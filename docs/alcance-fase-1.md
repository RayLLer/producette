# Producette · Alcance definitivo Fase 1

Oct 22, 2026 · @Raimundo · actualizado el 23 de noviembre de 2026: el 5% del cliente no tiene tope, y se agregan las decisiones posteriores (sección 5).

## 1. Introducción: qué es Producette

Producette (antes The Project Place, nombre de trabajo; nombre comercial confirmado, en producette.com) es un marketplace donde cualquier persona convierte una idea en un proyecto realizado. En un solo sitio encuentra el espacio, el servicio o el profesional, acuerda las condiciones, firma y paga con protección.

Sirve tanto a la productora que rueda un comercial como a la persona que organiza una sesión de fotos, una fiesta o el lanzamiento de su pequeña marca. Su promesa de valor: todo lo que necesitas para llevar tu idea a la realidad, con personas verificadas, contrato claro y pago protegido hasta que el trabajo esté hecho.

Producette opera como Marketplace Facilitador: conecta partes independientes, procesa los pagos y cobra una comisión, pero no es empleador, subcontratista ni parte de los contratos entre cliente y proveedor.

Fase 1 lanza en Miami un marketplace de locaciones y servicios con solo dos segmentos, Host y Cliente, y cinco pilares de valor:

- Identidad verificada (KYC con Stripe Identity) para todo el que paga o cobra.
- Pago protegido: el dinero queda retenido por la plataforma hasta que el cliente confirma con el botón de liberación.
- Contrato digital automático generado desde la cotización aceptada.
- Chat de coordinación con cotizaciones formales, sin salir de la plataforma.
- Reviews verificadas, ligadas a una transacción real.

Los demás segmentos (Staff, Talento, Productor Individual y Empresa) se desarrollan, se prueban y se pagan en Fase 2, cuando la plataforma demuestre que funciona. Fase 1 solo deja las bases mínimas de datos para no rehacer lo existente.

## 2. Funcionalidades de Fase 1

Fase 1 construye dos sistemas web: la web pública para Host y Cliente, y el panel de administración para operar la plataforma.

### Recorrido de una reserva

1. El visitante navega el catálogo sin cuenta.
2. Crea cuenta con email propio o cuenta de Google y acepta Términos y Privacidad. Ya puede chatear con Hosts listados en Producette.
3. Envía una solicitud con fecha, horario, número de personas y tipo de producción. El Host tiene 24 horas para responder o la solicitud vence.
4. Si el Host tiene la opción de Reserva Inmediata, los pasos 5 y 6 se saltan y la cotización se genera sola al precio publicado, aceptada por el Host, y se genera el contrato. La reserva directa es posible con una antelación máxima de 3 meses y una mínima de 10 días.
5. El Host acepta, declina o envía una cotización. El Cliente acepta o contraoferta.
6. El Host acepta o declina la contraoferta.
7. Si se acepta por ambas partes se genera contrato automáticamente.
8. Antes de firmar, el Cliente completa el KYC (una sola vez) y agrega su tarjeta.
9. Ambos firman el contrato y el Cliente paga: precio + 5% de Pago Protegido.
10. Se habilitan el chat libre y la dirección exacta del lugar.
11. Al terminar, el Host marca "Trabajo completado" y especifica si hubo daños, o si el monto cambió a menos valor o más valor por horas extras o daños, y se abre una ventana de 48 horas. El Cliente confirma con un botón "Confirmar y liberar" en el panel del Cliente. El clic registra fecha, hora, IP y usuario, que sirve igual como evidencia ante contracargos.
12. Se libera el pago al Host y se abren las reviews.
13. Si el cliente no confirma en 48 horas, se libera el pago contratado inicial al Host y se abren las reviews. Si hay un pago adicional, el cliente debe confirmarlo y autorizarlo, pero el pago inicial se libera por separado; el segundo pago, si es confirmado, se libera; si no, el Host puede abrir disputa por el pago adicional.
14. Si el cliente no está de acuerdo, abre una disputa.

### Web pública sin cuenta

- **Landing con catálogo** de locaciones y servicios, con páginas indexables en Google (por ejemplo, "rooftop para fotos Miami").
- **Testimonios fijos** en la web pública, sin gestión desde el panel de administración.
- **Detalle de locación** con fotos, precio, capacidad, disponibilidad, barrio y área aproximada en el mapa. La dirección exacta solo se muestra después del pago.
- **Detalle de servicio** con fotos, descripción, precio y disponibilidad.
- **Registro y login** con email y contraseña (con confirmación y recuperación por email) o con Google.
- **Interfaz bilingüe ES/EN**: el usuario elige idioma al registrarse y lo cambia en su perfil.

### Cuenta, perfil y verificación

- **Aceptación activa de Términos y Privacidad** en el registro, guardando fecha, hora y versión aceptada.
- **Mayor de 18 años.**
- **Modo Cliente / Modo Host**: toda cuenta nace como Cliente y puede activar un perfil Host. Un selector en la barra superior cambia de vista, como Airbnb entre viajar y ser anfitrión.
- **KYC con Stripe Identity**, una sola vez por persona, antes de la primera acción con dinero o exposición pública: pagar, cobrar, publicar un listing o enviar una cotización.
- **Método de pago del Cliente** guardado en Stripe.
- **Cuenta Stripe Connect Express del Host** para cobrar; Stripe verifica su cuenta bancaria.
- **Perfil público** de Host o Cliente con badge KYC, reviews e historial. El perfil es visible por el Host cuando recibe una solicitud; no hay listado de clientes visible en Producette.
- **Enlace propio del Host** para traer a sus clientes de Instagram o WhatsApp; esas reservas pagan 3% de comisión. Solo aplica a clientes que se registren desde ese enlace; si el cliente ya existe en la plataforma, no aplica. (Si no se restringe, un cliente puede encontrar al proveedor por la plataforma Producette y luego ponerse de acuerdo para que utilice el enlace.)

### Publicación de listings (Host)

- **Listings ilimitados** con fotos, descripción, capacidad, servicios incluidos y calendario de disponibilidad.
- **Precio por hora con mínimo de horas** y precio por día opcional.
- **Tarifa por hora extra.**
- **Campos fijos**: tarifa de limpieza, capacidad máxima, reglas de la casa, equipo incluido, estacionamiento y acceso de carga.
- **Reserva Inmediata opcional** para reservas simples sin negociación.
- **Declaración obligatoria de propiedad o autorización** para rentar, con documento opcional; en esta fase no hay badge "Propiedad verificada".
- **Permisos y seguro**: el listing indica si la locación ya tiene permisos de rodaje y si el Host exige certificado de seguro (COI). Si el Host exige certificado de seguro, el cliente se lo presenta y el Host lo acepta o no bajo su responsabilidad.
- **Texto bilingüe**: un campo obligatorio en el idioma principal y uno opcional en el otro, escrito por el propio Host. Si falta, se muestra el original con la etiqueta "Solo disponible en español" o "Only available in English".
- **Revisión del admin** antes de publicar cada listing.

### Búsqueda y solicitud (Cliente)

- **Búsqueda con filtros** por tipo, precio, capacidad, zona y fecha, con mapa. Solo aparecen perfiles con KYC.
- **El orden en el que salen los Hosts en el listado** será por un ranking: puntaje de negativo a 100 que se recalcula cada noche. Se propone su cálculo según los siguientes pesos:
  - 40 x (calificación promedio / 5), con un promedio ajustado cuando hay pocas reviews, para que una sola de 5 estrellas no le gane a veinte de 4.8.
  - 20 x tasa de respuesta en 24 h.
  - 20 x (reservas completadas en 12 meses / 10, con máximo 1).
  - 10 x listing completo (fotos mínimas y campos llenos).
  - 10 de bono durante los primeros 30 días, para que los Hosts nuevos aparezcan.
  - Menos 15 por cada cancelación del Host en los últimos 6 meses.
  - Menos 20 por cada No se presentó del Host en los últimos 6 meses.

  Los pesos son un punto de partida para ajustar con datos reales. El usuario también puede ordenar por precio o por reviews.
- **Solicitud de reserva** con fecha, horario, número de personas y tipo de producción.
- **Calendario sin doble reserva**: al generarse el contrato se bloquea el horario reservado y las solicitudes pendientes que se superponen vencen solas. Si el contrato vence sin pago, se libera ese horario. (Si se bloqueara solo al pagar, podría haber 2 contratos para el mismo horario.) El calendario es por horas; ver la sección 5.
- **Reporte "no coincide con las fotos"** sobre cualquier listing.

### Chat de coordinación

- **Disponible desde el primer contacto**, con cuenta y email verificado.
- **Antes del contrato**: un filtro básico en el backend que bloquea solo patrones obvios:
  - formatos de teléfono (7 o más dígitos seguidos o con separadores típicos),
  - emails,
  - @usuarios,
  - las palabras whatsapp, instagram, telegram.

  Un precio como "$1,500" o "1500" debe pasar sin problema. Cuando se bloquea un mensaje se registra, y se notifica al admin cuando en una conversación se producen más de 3 bloqueos; los admin revisan si los bloqueos fueron adecuados y los reincidentes pueden suspenderse. Límite de 20 mensajes por conversación con aviso en el mensaje 18, botón de cotización siempre visible y banners que explican la protección que se pierde fuera de la plataforma.
- **Con cotización enviada** el contador se reinicia: una negociación formal nunca se queda sin chat.
- **Después del contrato y el pago**: chat libre, sin límite ni filtro, con archivos, fotos y documentos. (Después de un primer trabajo, el chat entre ellos queda libre para siempre.)
- **Fotos permitidas antes del contrato**; los mensajes bloqueados quedan registrados para el admin.
- **Mensajes en su idioma original**, sin traducción.

### Cotizaciones formales

- **Módulo independiente del chat**: cada cotización aparece como tarjeta en el chat y en un panel propio, y ambas vistas actualizan el mismo registro.

  Cuando el Host envía una cotización, en el chat no aparece como texto sino como un mensaje especial (tarjeta) con: título, fechas y horario, líneas de detalle, total que paga el Cliente (precio + 5%), fecha de vencimiento, estado y botones. El Cliente ve Aceptar, Contraofertar y Rechazar; el Host ve Retirar.

  La misma cotización aparece en "Mis cotizaciones", un panel con todas las cotizaciones del usuario filtrables por estado. Son dos vistas del mismo registro: si el Cliente acepta desde el chat, en el panel ya figura Aceptada, y al revés.

  La tarjeta se actualiza sola cuando cambia el estado (por ejemplo, "Vencida" o "Aceptada · ver contrato"). Una contraoferta aparece como tarjeta nueva enlazada a la anterior.
- Una cotización tendrá un campo opcional, cláusula adicional, que se llena antes de generar el contrato para agregar algo de mutuo acuerdo.
- **Estados**: Borrador, Enviada, Vista, Contra-oferta, Aceptada, Rechazada, Retirada, Vencida y Convertida.
  - Solicitud sin respuesta del Host: vence a las 24 h.
  - Cotización Enviada o Vista: vence en su fecha de validez (7 días por defecto y nunca después de 24 h antes del inicio).
  - Contra-oferta sin respuesta del Host: vence a las 24 h.
  - Contrato generado sin firmar o sin pagar: vence a las 24 h.
- **Versiones**: una cotización enviada no se edita; la contra-oferta o el cambio crean una versión nueva vinculada, para conservar la trazabilidad.
- **Cotización automática** cuando el Cliente acepta el precio de catálogo o usa Reserva Inmediata. En estos casos la cotización se crea por defecto en estado Aceptada.
- **Montos por parte**: el Cliente ve precio + 5% de Pago Protegido; el Host ve total, comisión y neto.
- **Favoritas**: el Cliente puede marcar una cotización sin cambiar su estado.

### Contrato digital

- **Generación automática** desde la cotización aceptada, con plantilla base y los datos del acuerdo: partes, monto, fechas, descripción y alcance.
- **Cláusulas adicionales** de mutuo acuerdo, pactadas en el chat antes de firmar.
- **Encabezado de facilitador**: "Contrato entre [cliente] y [proveedor], facilitado por [nombre comercial] como plataforma tecnológica".
- **Firma electrónica simple nativa**: botón "Firmar y aceptar" que registra nombre, fecha y hora, IP, ID verificado con KYC y hash del PDF.
- **Idioma**: se genera en el idioma de ambas partes, o bilingüe si difieren, con una cláusula que indica qué versión prevalece.
- **Permisos de rodaje** asignados al Cliente en el contrato.
- **PDF firmado** accesible para ambas partes desde su perfil.

### Pago protegido y liberación

- **Cobro al firmar**: el Cliente paga precio + 5% de Pago Protegido. El cargo se captura de inmediato en la cuenta de Stripe de Producette.
- **Retención** mientras ocurre el trabajo, la ventana de 48 horas o una disputa.
- **Marca "Trabajo completado"** del Host, que abre la ventana de 48 horas.
- **Confirmación del Cliente** con botón "Confirmar y liberar" en su panel.
- **Liberación automática** al Host si vence la ventana sin reclamo.
- **Transferencia inmediata** a la cuenta Connect del Host y retiro al banco en 2 días hábiles (estándar de Stripe).
- **Reservas de varios días**: una sola liberación al final.

### Cancelaciones y disputas

- **Cancelación con penalización automática** según la tabla de la sección 3.
- **Fuerza mayor** (clima o emergencia): cambio de fecha sin costo si ambas partes lo confirman y el admin lo aprueba. Reembolso del 100% del precio; por defecto Producette retiene su 5% de Pago Protegido.
- **Reporte de problema** dentro de las 48 horas: congela los fondos y abre una disputa.
- **No se presentó**: si el Host no responde con evidencia en 48 horas, reembolso automático del 100% del precio y del 5% de Pago Protegido; si el Host responde, pasa a disputa. Como Producette devuelve también el 5%, está perdiendo por culpa del proveedor: el monto correspondiente al 5% queda como deuda del proveedor y se descuenta de su próxima liberación. Si no vuelve a trabajar, Producette pierde la comisión que pagó a Stripe. Se aplica sanción: marca en el perfil, que baja en el ranking, y suspensión de cuenta si hay 3 cancelaciones o No se presentó en 6 meses.
- **Disputa con evidencia**: ambas partes suben fotos, videos, capturas del chat y el contrato.
- **Corrección automática de montos**: reembolso de la diferencia; un cargo adicional exige confirmación del Cliente.

### Wallet

- **Vista de historial en la plataforma calculado desde Stripe**, no es un monedero con saldo propio.
- **Host**: Retenido, En camino a tu banco y Pagado.
- **Cliente**: pagos, reembolsos y recibos.
- **Reembolsos** siempre a la tarjeta, nunca como saldo a favor.

### Reviews verificadas

- **Bidireccionales**: el Cliente califica al Host y el Host al Cliente.
- **Activación** al liberarse los fondos, por botón o por liberación automática.
- **Ventana de 7 días** con recordatorios los días 1, 5, 6 y 7.
- **Ciegas**: cada parte no ve la calificación de la otra hasta que ambas partes califican o vence la ventana.
- **Contenido**: puntuación de 1 a 5, 4 categorías, texto libre opcional.
- **Una respuesta pública** por review, de la parte calificada.
- **Permanentes**: solo el admin puede eliminar una review que viola los Términos.
- **Una reserva cancelada no permite reviews.**
- **Un No se presentó da la posibilidad de review al que dejaron esperando.**

### Notificaciones

- **Centro de notificaciones** en la web y por email.

### Panel de administración

- **Dashboard**: reservas activas, total de ingresos recibidos (GMV), comisiones generadas y usuarios nuevos.
- **Usuarios**: ver, verificar y suspender cuentas. Cada usuario tiene su historial de solicitudes, servicios prestados y deudas, en el caso de los proveedores que cancelaron o no se presentaron y Producette asumió la comisión de Stripe por la devolución.
- **KYC**: verificaciones pendientes, aprobadas o rechazadas.
- **Listings**: aprobar antes de publicar, editar, desactivar y atender reportes de "no coincide con las fotos".
- **Transacciones**: estado de cada pago protegido, con opción de forzar liberación o reembolso.
- **Disputas con evidencia**: revisión de ambas partes y decisión en 5 días hábiles (100% al proveedor, 100% al cliente o reparto parcial), ejecutada automáticamente en Stripe.
- **Cancelaciones**: aprobación de fuerza mayor y seguimiento de proveedores que cancelan.
- **Reviews**: moderar las reportadas.
- **Chat**: consulta de mensajes bloqueados por el filtro.
- **Términos**: registro de aceptación con fecha, hora y versión.
- **Comisiones**: configuración de 10% proveedor, 5% cliente sin tope, 8% fundador y 3% por enlace propio.
- **Notificaciones del sistema** a usuarios.
- **Reportes exportables** de transacciones, usuarios e ingresos.
- **Roles** (admin, soporte, finanzas) y bitácora de cada acción sobre dinero o cuentas.
  - Admin: todo, incluido crear usuarios del panel y asignar roles, cambiar comisiones, decidir disputas, suspender cuentas y eliminar reviews.
  - Soporte: ver usuarios, KYC, listings, reservas y mensajes bloqueados; aprobar o rechazar listings; reunir la evidencia de disputas. No mueve dinero ni cambia comisiones.
  - Finanzas: ver y exportar transacciones, reembolsos y reportes. No edita usuarios, listings ni contenido.

  Regla común: toda acción sobre dinero o cuentas queda en la bitácora con usuario, fecha y motivo.

  Serán roles fijos (no permisos configurables): un campo de rol por usuario del panel y una verificación en el backend en cada acción. Para empezar, Patricia puede tener el rol Admin y no hace falta crear los otros hasta que haya equipo.

## 3. Premisas, supuestos y límites

Fase 1 es un marketplace Host + Cliente en Miami, sin IA y sin membresías, con Stripe como único procesador y Producette como Marketplace Facilitador.

### Alcance

- **Solo dos sistemas**: la web pública de cara al usuario y el panel de administración. La app móvil nativa queda fuera.
- **Solo dos segmentos**: Host (locaciones y servicios) y Cliente. Un productor o una agencia reservan como Cliente.
- **Mercado inicial**: Miami. El mensaje comercial de Fase 1 es "bilingüe, hecho para Miami", sin prometer LATAM.
- **Un solo modelo de contratación**: el Cliente busca en el catálogo y envía una solicitud. El Cliente nunca publica ofertas abiertas en Fase 1.
- **Orden obligatorio**: acuerdo → cotización aceptada → contrato firmado → pago protegido. El pago nunca va antes del contrato.
- **Solo contrataciones puntuales**: no hay proyectos ni pagos por hitos.

### Bases mínimas para Fase 2

Fase 1 solo construye las bases que cuestan casi nada ahora y evitan rehacer lo existente. Nada de Fase 2 se programa, se prueba ni se paga en Fase 1.

| Se construye en Fase 1 | Por qué ahora |
| --- | --- |
| Cuenta de usuario separada del perfil (tabla profiles con user_id y segment), solo Cliente y Host | Ya se necesita para el Modo Cliente / Modo Host |
| Comisión guardada por proveedor (10%, 8% fundador, 3% por enlace) | Se cobra desde el lanzamiento |
| Campo project_id vacío (nullable) en las contrataciones | Es una columna; evita migrar datos después |
| Cliente de Stripe creado al registrarse | Ya se necesita para pagar |

**No se construye en Fase 1**: tabla de planes y control de permisos, cobro de membresías con Stripe Billing, pantallas de upgrade, perfiles de Staff, Talento, Productor y Empresa, Castings, proyectos, pagos por hitos, sub-cuentas, reportes de empresa, activación de segmentos desde el panel admin y traducción con IA.

### Inteligencia artificial

- **Sin IA**: Fase 1 no incluye interacción con modelos de IA ni modelos autohosteados.
- **Fuera**: traducción automática del chat, detección de idioma y match por porcentaje.
- **Dentro**: Stripe Identity, Stripe Connect y el chat básico, porque son integraciones con terceros, no modelos de IA.

### Modelo legal

- **Marketplace Facilitador**: Producette conecta partes independientes, procesa el pago y cobra una comisión. No es empleador, subcontratista ni parte del contrato.
- **Recibos**: muestran "Comisión de plataforma: 10%" al proveedor y "Pago Protegido: 5%" al cliente, nunca un precio por un servicio propio de Producette.
- **Lenguaje**: el panel admin nunca llama "empleados" a los proveedores, y la plataforma no fija horarios ni dirige el trabajo.
- **La palabra "escrow"**: en la interfaz y en los Términos se usa "Pago Protegido Producette", descrito como retención de fondos por la plataforma. "Escrow" queda solo como término técnico interno, porque en EE.UU. es una actividad regulada.
- **Mediación**: la decisión de Producette en una disputa es definitiva dentro de la plataforma, pero no reemplaza los derechos legales de las partes.

### Identidad y acceso

- **Sin KYC para navegar ni crear cuenta**. Chatear exige cuenta con email verificado.
- **KYC obligatorio** antes de pagar, cobrar, publicar un listing o enviar una cotización. Se hace una sola vez por persona.
- **Doble verificación del proveedor**: Stripe Identity verifica a la persona y Stripe Connect su cuenta bancaria.
- **Registro** con email y contraseña o Google; ambos llevan al mismo onboarding. Apple Sign In entra con la app iOS.

### Pagos y comisiones

- **Stripe es el único procesador**: Connect (pagos entre usuarios), Identity (KYC). Billing queda para Fase 2.
- **Mecanismo**: cargos y transferencias separados (separate charges and transfers), no capture_method manual. Una autorización manual vence a los 7 días, antes de reservas anticipadas o en medio de una disputa.
- **Comisión repartida**: 10% al proveedor + 5% de Pago Protegido al cliente, sin tope. Producette sigue ganando 15% por transacción.
- **Enlace propio**: 3% al proveedor y 5% al cliente en reservas que trae el proveedor.
- **Oferta de fundadores**: los primeros 100 proveedores de cada segmento pagan 8% de comisión de por vida, más 6 meses de Pro gratis cuando exista. Se cuentan los primeros 100 en publicar un listing.
- **Sin membresías**: en Fase 1 no se cobra ninguna; la membresía del Cliente es $0 siempre.
- **Seguridad**: Producette nunca toca datos de tarjeta y la secret key de Stripe vive solo en el servidor.

Ejemplo con una reserva de $3,400:

| Concepto | Monto |
| --- | --- |
| Paga el cliente ($3,400 + 5%) | $3,570 |
| Recibe el proveedor (90%) | $3,060 |
| Retiene Producette | $510 |
| Procesamiento de Stripe (2.9% + $0.30 sobre $3,570) | unos $103.83 |
| Margen de Producette | unos $406 |

### Liberación de fondos

- **Regla única**: al marcar "Trabajo completado" se abre una ventana de 48 horas.
- **Con botón** del Cliente, los fondos se liberan de inmediato.
- **Con reclamo** dentro de las 48 horas, los fondos se congelan y se abre una disputa.
- **Sin reclamo**, los fondos se liberan automáticamente al proveedor.
- **No se presentó**: si el proveedor no responde con evidencia en 48 horas, reembolso automático del 100%; si responde, pasa a disputa.
- **Si se acordó un monto menor**: reembolso y liberación cuando aplica. No se recalcula el 5%, ni el 10% de Producette.
- **Si se acordó un monto mayor por horas, servicio extra o daño**: el Cliente debe confirmarlo y autorizarlo. Si lo hace antes de la liberación del monto principal, se libera todo junto siguiendo las reglas de liberación estándar, y se recalculan el 5% y el 10% de Producette.

  **Si el cliente no lo confirma antes de la liberación del monto principal, pero lo confirma después, se hace un cargo nuevo a su tarjeta.** En ese momento se cobra el 5% y el 10% de Producette de ese nuevo monto.

  **Si el cliente no lo confirma, el Host abre disputa.**

### Cancelaciones

Si cancela el Cliente:

| Aviso antes del inicio | Devolución al Cliente | Para el proveedor |
| --- | --- | --- |
| Más de 7 días | 100% del precio y el 5% de Pago Protegido de Producette; Producette absorbe la pérdida | 0% |
| De 3 a 7 días | 75%; no incluye el 5% de Pago Protegido de Producette | 25% |
| De 24 h a 3 días | 50%; no incluye el 5% de Pago Protegido de Producette | 50% |
| Menos de 24 h | 25%; no incluye el 5% de Pago Protegido de Producette | 75% |
| Cliente No se presenta | 0%; no incluye el 5% de Pago Protegido de Producette | 100% |

- **Si cancela el proveedor**, el Cliente recibe siempre el 100% del precio y del 5%. La próxima vez al proveedor se le descuenta el 5%. Marca visible en su perfil, baja en el ranking y suspensión tras 3 cancelaciones o No se presentó en 6 meses.
- **Comisión sobre penalizaciones**: el monto que recibe el proveedor por penalización también paga el 10%.
- **El 5% de Pago Protegido** se devuelve completo solo en cancelaciones con más de 7 días de aviso.
- **Las reglas** están en los Términos y en cada contrato; al firmar, ambas partes las aceptan.

### Contratos

- **Plantilla base** con cláusulas adicionales de mutuo acuerdo.
- **Firma electrónica simple nativa**, válida bajo E-SIGN Act y UETA, sin costo por documento. Sin DocuSign ni Dropbox Sign en Fase 1.
- **El contrato es parte del flujo de pago**, no un módulo opcional: protege a las partes y es la evidencia ante Stripe si hay un contracargo, junto con el chat y el registro del clic del botón.
- **Contracargos bancarios** se defienden ante Stripe y son distintos de las disputas internas.

### Idiomas

- **Interfaz, correos y notificaciones**: i18n estándar con archivos ES y EN. Claude Code escribe los textos en ambos idiomas y Producette corrige a mano lo que encuentre mal (decisión del 26 de octubre).
- **Perfiles y listings**: los escribe el usuario, sin traducción automática.
- **Chat y reviews**: siempre en el idioma original, sin etiqueta.
- **Contrato y Términos**: plantilla en ambos idiomas.

### Wallet (premisa)

- **No es un monedero**: no admite depósitos ni créditos. Es una vista calculada desde Stripe.

### Cumplimiento y operación

- **Dirección exacta** de la locación solo después del pago, por seguridad del Host.
- **Seguro**: el Cliente sube su certificado (COI) cuando el Host lo exige.
- **Permisos de rodaje** de Miami-Dade a cargo del Cliente.
- **Sin perfiles de menores** de edad hasta Fase 2.
- **Privacidad**: Política de Privacidad, borrado de cuenta a pedido y retención de contratos y pagos por 7 años.
- **1099-K**: lo emite Stripe Connect a los proveedores que superan el umbral federal vigente. No hay 1099-NEC automático.

### Supuestos pendientes de validar

- **Comisión repartida** 10% + 5%.
- **Precios Pro y oferta de fundadores**.
- **Versión que prevalece** en contratos bilingües: se recomienda inglés, por jurisdicción en Florida.
- **Revisión de abogado en Florida** de Términos, contrato base y uso de "escrow".
- **Revisión de contador** sobre impuesto de ventas en Florida (alquiler de espacios y servicios) y umbral vigente del 1099-K.

## 4. Funcionalidades identificadas para Fase 2 y Fase 3

Fase 2 abre los otros cuatro segmentos en dos etapas, y cada etapa se desarrolla, se prueba y se paga cuando la anterior cumple su meta. Fase 3 es la expansión a LATAM.

### Fase 2 · Etapa 2 (meses 3–4): Staff y Talento

Meta para pasar a la etapa 3: 30 perfiles de staff y talento publicados y 10 trabajos completados con pago protegido.

- **Perfiles de Staff**: crew de producción (DP, gaffer, sonidista, maquillista, editor) y staff de eventos (bartender, DJ, mesero, fotógrafo), con especialidad, tarifas por hora o día, portfolio y calendario.
- **Perfiles de Talento**: actores, modelos, extras, locutores, bailarines y presentadores, con características físicas (altura, talla, color de ojos, medidas), demo reel en video, categorías e idiomas.
- **Contrato de uso de imagen** para Talento: qué puede hacer el cliente con el material, en qué medios, por cuánto tiempo y en qué territorios.
- **Castings**: el cliente publica un rol con requisitos, los talentos que coinciden aplican y el cliente selecciona. Visibilidad de 10 días y notificaciones de castings que coinciden con el perfil.
- **Casting suelto** para quien no es miembro: $39 por publicación, 10 días.
- **Membresías Free + Pro** con Stripe Billing: cobro mensual automático hasta que el usuario cancela, acceso hasta el fin del período pagado, reactivación y 3 reintentos ante pago fallido antes de pausar la suscripción.
- **Plan anual** con 20% de descuento, que se renueva cada año hasta que el usuario cancele.
- **Tabla de planes y permisos**: la tabla plans aprobada, con las columnas segment_status (active / coming_soon / hidden) y stripe_price_id. Los permisos se verifican en el backend y el frontend muestra el modal de upgrade.
- **Varios perfiles por cuenta**: una cuenta activa perfiles de varios segmentos, cada uno con su plan y su suscripción bajo el mismo customer ID de Stripe. Se comparten email, KYC, método de pago y Wallet; son independientes el plan, el perfil público, el portafolio, el calendario, las reviews y los proyectos.
- **Funciones de IA** cuando se levante la restricción: traducción automática del chat, detección de idioma y match por porcentaje.

Planes al abrir cada segmento (el Pro baja la comisión del proveedor del 10% al 8%):

| Segmento | Free | Pro |
| --- | --- | --- |
| Host | Listings ilimitados | $24.99/mes: primeros lugares, analítica, precios por tipo de producción |
| Staff | 5 cotizaciones al mes | $12.99/mes: cotizaciones ilimitadas, alertas de trabajos |
| Talento | Recibe solicitudes y 2 castings al mes | $9.99/mes: castings ilimitados, alertas |
| Productor Individual | 1 proyecto activo | $19.99/mes: 5 proyectos, cláusula de propiedad intelectual |
| Cliente | $0 siempre | No aplica |

### Fase 2 · Etapa 3 (mes 5 en adelante): Productor Individual y Empresa

Meta: primeras 5 membresías de pago activas.

- **Perfiles de Productor Individual**: directores, fotógrafos, videógrafos, productores musicales y creadores de contenido, con portafolio, estilo, tarifas por proyecto o día y equipo propio.
- **Publicar disponibilidad** y proyectos buscando colaboradores.
- **Proyectos opcionales**: el cliente crea un proyecto con nombre, fechas y presupuesto estimado, y le asocia varias contrataciones, cada una con su propio contrato y pago.
- **Ciclo de vida del proyecto**: Concepción → Preproducción → Producción → Postproducción → Completado, o Cancelado. Es independiente de cada contratación, y cancelar el proyecto nunca cancela sus contrataciones automáticamente.
- **Presupuesto comprometido** calculado sumando las contrataciones activas del proyecto.
- **Pagos por hitos** dentro de un mismo contrato (por ejemplo, 50% al inicio y 50% a la entrega), cada hito con su propia confirmación de liberación.
- **Contrato con propiedad intelectual y entregables**: titularidad de los derechos, uso en portafolio, número de piezas, revisiones, formato y fecha de entrega.
- **Empresa Team** ($99/mes): 3 usuarios, 3 proyectos activos, castings ilimitados, panel multi-proyecto y reportes.
- **Empresa Business** ($199/mes, 10 usuarios y API) y **Enterprise** a consultar, cuando haya demanda.
- **Sub-cuentas** de managers con pagos, contratos y reportes centralizados en la cuenta principal.
- **Facturación centralizada** a nombre de la empresa con su EIN o Tax ID.
- **Reportes exportables** en PDF o CSV por período, proyecto, proveedor o categoría.
- **Proveedores favoritos** e historial de trabajos con cada uno.
- **Contratos corporativos** con cláusulas de confidencialidad, propiedad intelectual y exclusividad.
- **Disponibilidad para contratos recurrentes** que el proveedor marca en su perfil.
- **Planes top** cuando 20 usuarios Pro lo pidan, con 6% de comisión: Host Business $59.99, Staff Studio $34.99, Talento Elite $19.99 y Productor Business $49.99 al mes.

### Fase 2 sin etapa fija

- **App móvil nativa** iOS y Android, con Apple Sign In.
- **Notificaciones por SMS**.
- **Seguro propio de Producette** para las reservas.
- **Perfiles de menores** de edad con cuenta administrada por el padre o tutor y cumplimiento de la ley laboral de Florida.
- **Firma con Dropbox Sign**, prevista para la versión 2 cuando el volumen de contratos lo justifique.

### Fase 3: expansión a LATAM

- **Mercado Miami-LATAM**: proveedores en ciudades como Bogotá trabajando con productores de Miami.
- **Traducción en tiempo real del chat** como funcionalidad crítica, porque las partes ya no comparten idioma.
- **Mensaje comercial** con soporte en español y cobertura LATAM como ventaja frente a la competencia.

## 5. Decisiones posteriores al 22 de octubre

Estas decisiones completan o precisan el alcance. Si algún texto anterior parece contradecirlas, manda esta sección.

- **5% del cliente sin tope** (26 de octubre): el Pago Protegido es siempre el 5% del precio, sin monto máximo.
- **Testimonios** (26 de octubre): fijos en la web pública, sin gestión desde el panel de administración.
- **Fundador que trae a su propio cliente** (26 de octubre): aplica la tasa menor, 3%.
- **Redondeo** (26 de octubre): montos en centavos, redondeados al centavo con la mitad hacia arriba.
- **Nombre y dominio** (26 de octubre): Producette, en producette.com.
- **Una sola web responsive**: no hay app ni versión móvil aparte; cada pantalla se adapta a teléfono, tablet y escritorio.
- **Búsqueda**: una sola página, Explorar, con filtros por tipo, precio, capacidad, zona y fecha, y mapa. Las páginas por categoría (por ejemplo, `/miami/rooftops`) son esa misma página con un filtro aplicado y un texto propio para Google.
- **Orden de resultados**: no hay "Recomendados". El ranking nocturno es el orden por defecto y el desempate cuando se ordena por precio o por calificación; la calificación usa el promedio ajustado.
- **Calendario**: por horas y por publicación, con un calendario unificado en el panel del Host. Cada publicación atiende una reserva a la vez: una hora con contrato o bloqueada no está disponible.
- **Panel del Host**: Mensajes con el botón "Enviar cotización" siempre visible, y "Mis publicaciones" con pestañas Locaciones y Servicios.
- **Menú de cuenta según el modo activo**: en Modo Cliente lleva a cuenta, reservas, cotizaciones, mensajes, pagos y perfil; en Modo Host, al panel, solicitudes, mensajes, reservas, publicaciones, calendario, Wallet y perfil.
- **Perfil público del Host**: lo abre el cliente desde cada publicación. Muestra identidad verificada, calificación, reservas completadas, la marca de cancelaciones de los últimos 6 meses, sus publicaciones aprobadas y las reviews con su única respuesta pública. El Host lo edita desde "Mi perfil" en Modo Host.
