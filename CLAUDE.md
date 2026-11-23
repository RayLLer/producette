# Producette · Instrucciones para Claude Code

## Contexto
Marketplace de locaciones y servicios audiovisuales en Miami. Fase 1: Host y Cliente, más el panel de administración.
- Alcance: docs/alcance-fase-1.md (el 5% del cliente no tiene tope)
- Plan de entornos: docs/plan-entornos.md
- Interfaz de referencia: docs/prototipo-fase-1.html (una sola web responsive) · Marca: docs/manual-marca.html
- Si el alcance no resuelve una duda de negocio, pregunta. No inventes reglas, plazos ni porcentajes.

## Skills del proyecto
- Al empezar cualquier tarea, carga la skill `producette-base`: dice qué otra skill usar según lo que toques.
- Las skills de .claude/skills/ (producette-*) mandan sobre las skills oficiales de Supabase, Vercel, Next.js o Stripe cuando choquen.
- Si una skill choca con este archivo o con docs/plan-entornos.md, manda este archivo; avísalo en el pull request.
- Los nombres de API marcados con "confirmar" en las skills se verifican contra la versión instalada antes de usarlos.

## Stack
Next.js 16 (App Router) + TypeScript estricto, Supabase (Postgres + PostGIS, Auth, Realtime,
Storage), Drizzle solo para consultas en el servidor (driver pg), Stripe Connect con Accounts v2
+ Identity + Payment Element, next-intl (es/en), Tailwind v4 + shadcn/ui, Zod 4, Vitest,
Playwright, Resend + React Email, Sentry, sharp, @react-pdf/renderer.

## Next.js 16
- Documentación de la versión instalada: node_modules/next/dist/docs/. Consúltala antes que tu memoria.
- proxy.ts (no middleware.ts) combina Supabase, next-intl y la contraseña de staging. El proxy no es
  la autorización: cada página y Server Action verifica con requireUser() o requireRole().
- params, searchParams, cookies() y headers() son asíncronos.
- Toda Server Action: autenticar, validar con Zod, autorizar sobre el recurso concreto, escribir.
- Nunca caches ('use cache') nada que dependa de la sesión o de cookies.
- `next lint` no existe: el lint es `eslint .`.

## Entornos y seguridad
- Trabajas solo contra producette-dev y la sandbox dev de Stripe.
- Nunca vincules el CLI de Supabase a staging ni a producción, ni uses, pidas o guardes sus
  credenciales. Esos entornos solo migran por GitHub Actions.
- El Stripe CLI nunca apunta al modo live.
- Nunca escribas secretos en código, commits, logs ni en el chat. Si un comando imprime una clave,
  no la repitas.
- `npm run db:reset:dev` solo con confirmación explícita de la persona.
- Si necesitas una cuenta, una clave o una acción en un panel, detente y pídela.

## Git
- Una tarea = una rama feat/* = un pull request hacia main, con la plantilla llena.
- Nunca hagas merge, crees etiquetas, despliegues a producción ni uses --no-verify.
- Una sola rama con migraciones a la vez.
- No modifiques .github/workflows/ si la tarea no lo pide; si lo haces, explícalo arriba del PR.

## Base de datos
- El esquema solo cambia con migraciones nuevas (`npm run db:new <tema>`).
  Nunca edites una migración aplicada. Migraciones solo aditivas, una por tema.
- Supabase CLI v3: todo comando de base lleva --remote (no hay stack local).
  Antes de aplicar: `supabase db push --remote --dry-run` y muestra el resultado.
- Toda tabla nace en la misma migración con RLS activado, políticas explícitas por operación
  e índices en las columnas que usan las políticas. Políticas con (select auth.uid()) y `to authenticated`.
- Las tablas nuevas no se exponen solas a la API: cada migración incluye sus GRANT mínimos
  (authenticated si la lee un usuario con sesión, anon solo para contenido público, service_role
  solo si el servidor la usa con supabase-js).
- Tablas internas y de dinero sin permisos para el navegador: panel_users, audit_log,
  fee_settings, stripe_events, job_runs y email_outbox no reciben grants para anon ni authenticated.
- Funciones security definer: solo en el esquema private, con `set search_path = ''` y
  `revoke all ... from public`.
- Drizzle se salta RLS: solo se usa en lib/server y toda consulta pasa antes por requireUser()
  o requireRole(). El esquema de Drizzle solo sale de `drizzle-kit pull`; nunca generate, migrate ni push.
- Sin ON DELETE CASCADE desde usuarios hacia contratos, pagos o bitácora.
  Borrar una cuenta = anonimizarla; contratos y pagos se guardan 7 años.
- Las contrataciones llevan project_id nulo (base mínima de Fase 2).
- Después de cada migración: `npm run db:types` y `npx drizzle-kit pull`.
- Valores que dependen del entorno (URLs, secretos) nunca en migraciones: van en Vault o en variables.

## Dinero (reglas no negociables)
- Cotizaciones, contratos, pagos, liberaciones, reembolsos y comisiones se escriben solo en el
  servidor, dentro de una transacción. RLS niega escribir esas tablas desde el navegador.
- Montos en centavos enteros. Comisiones solo con lib/domain/fees.ts, con las tasas de
  fee_settings guardadas en cada cotización. El 5% no tiene tope. Redondeo al centavo, mitad hacia arriba.
- El 3% aplica solo si el cliente se registró desde el enlace de ese Host.
  Si el Host además es fundador, aplica la tasa menor (3%).
- Ningún monto llega desde el navegador: el servidor recalcula o lee la cotización guardada.
- Stripe: cargos y transferencias separados (transfer_group + source_transaction). Nunca
  application_fee_amount ni capture_method manual. Cuentas de Host con Accounts v2 (recipient,
  panel Express); antes de transferir, stripe_transfers debe estar `active`.
- Toda llamada de escritura a Stripe lleva idempotencyKey derivada de un id de la base.
- Webhooks idempotentes, siempre por lib/server/stripe/dispatch.ts. El estado de un pago
  lo cambia el webhook, nunca la confirmación en el navegador.
- Producette nunca toca datos de tarjeta: solo el Payment Element de Stripe.
- En interfaz y textos: "Pago Protegido", nunca "escrow". Los proveedores nunca se llaman "empleados".

## Panel de administración
- Roles fijos en panel_users: admin, soporte, finanzas. requireRole() en cada acción del servidor.
- Toda acción sobre dinero o cuentas exige motivo y escribe audit_log en la misma transacción.
- Soporte no mueve dinero ni cambia comisiones. Finanzas no edita usuarios, listings ni contenido.

## Calendario
- Disponibilidad por horas y por publicación, dentro de su horario semanal.
- Una publicación atiende una reserva a la vez: el rango de un contrato no se
  superpone con otro (restricción de exclusión con btree_gist sobre tstzrange).
- El horario se bloquea al generarse el contrato; las solicitudes pendientes
  que se superponen vencen solas.

## Plazos y tareas programadas
- Cada plazo sale de lib/domain/deadlines.ts y se guarda como fecha en la fila.
- Los procesos de vencimiento son idempotentes, en lotes acotados y usan FOR UPDATE SKIP LOCKED.
- Los emails que no pueden perderse (contrato, pago, liberación, reembolso, disputa) se escriben
  en email_outbox dentro de la transacción y los envía sweep.

## Privacidad
- La dirección y las coordenadas exactas viven en una tabla aparte, legible solo después del
  pago; el listing público y el mapa usan un área aproximada.
- Toda foto pasa por sharp en el servidor: sin metadatos EXIF ni GPS. Los originales se suben
  al bucket privado photo-uploads y se borran al procesarlos.
- Contratos, evidencia, COI y archivos del chat: buckets privados y URLs firmadas de corta duración.
  Los contratos no se sobrescriben y guardan su hash SHA-256.
- Los mensajes del chat se insertan solo por una acción del servidor que aplica el filtro.
  Realtime solo se usa para leer, por broadcast en canales privados.
- No envíes datos personales a Sentry ni a los logs.

## Interfaz
- Una sola web responsive, sin app ni versión móvil aparte. Mobile first: cada pantalla
  se construye y se prueba en teléfono, tablet y escritorio (cortes de 600 y 900 px).
- Las tablas largas y la agenda por horas se desplazan dentro de su caja; la
  página nunca se desplaza de lado.
- El modo activo (Cliente o Host) se guarda en la sesión y define el menú de
  cuenta; las páginas comunes, como Ayuda, no lo cambian.
- Cada cuenta tiene un perfil público de Cliente y, si activa el Modo Host, otro
  de Host, cada uno con su presentación; el Host responde una vez y en público
  a cada review.
- Colores y tipografía (Geist) del manual: un solo botón coral por pantalla, con texto negro.

## Idiomas
- Ningún texto de interfaz escrito en componentes: siempre en messages/es.json y messages/en.json.
- Escribe tú los textos en inglés, completos; la persona corrige a mano lo que encuentre mal.
- Listings, chat y reviews se muestran en su idioma original, sin traducción.
- Fechas en America/New_York y montos con el formateador de next-intl.

## Forma de trabajar
- Las reglas de negocio van primero como funciones puras en lib/domain, con los tests escritos
  antes que el código.
- Antes de terminar: lint, typecheck, test y build; test:rls si hubo migraciones o políticas;
  test:e2e si tocaste interfaz. Si algo falla, la tarea no está terminada.
- Si necesitas una acción de la persona (cuenta, clave, panel), detente y pídela.

## Comandos
npm run dev | build | lint | typecheck | test | test:rls | test:e2e
npm run db:new | db:types | db:reset:dev | seed | stripe:listen | sweep | sweep:watch
