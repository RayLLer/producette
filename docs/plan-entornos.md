# Producette · Plan de implementación v2: proyecto base y entornos con Claude Code

Raimundo · actualizado el 23 de noviembre de 2026

Este plan deja el proyecto base de Producette funcionando antes de escribir cualquier funcionalidad de negocio, y no paga hosting ni base de datos hasta preparar el lanzamiento. Avanza en tres fases de costo: construcción a $0 al mes, preparación del lanzamiento a $45 al mes y lanzamiento a $65 al mes. El flujo de reserva (catálogo, solicitud, cotización, contrato, pago, liberación y reviews) empieza al cerrar los pasos 0 a 8, sin esperar al Paso 9.

Cambios respecto de la v1 del 23 de octubre:

- **Construcción sin costo**: dev y staging viven en una organización Free de Supabase y la aplicación corre en tu máquina. Vercel Pro y la base de producción se contratan recién en el Paso 9.
- **Una sola rama principal**: se elimina develop. Cada merge a main migra staging, y desde el Paso 9 cada etiqueta `v*` despliega producción.
- **GitHub Free**: sin ramas protegidas ni entornos de GitHub. Los reemplazan un hook local, una verificación en el workflow y los permisos de Claude Code.
- **Bases que faltaban**: roles y bitácora del panel de administración, comisiones configurables, atribución del enlace del 3%, privacidad de la dirección exacta, filtro del chat solo en el servidor, retención de 7 años y SEO.
- **El 5% del cliente no tiene tope**, según la decisión del 26 de octubre.

Cambios del 23 de noviembre, para alinear el plan con las skills del proyecto y con la documentación vigente de cada herramienta:

- **Skills del proyecto**: doce skills `producette-*` en `.claude/skills/` guían a Claude Code en cada tecnología. `CLAUDE.md` le pide cargar `producette-base` al empezar cada tarea.
- **Supabase CLI v3**: los comandos de base apuntan al stack local por defecto, así que contra dev llevan `--remote` (`--linked` queda obsoleto). En GitHub Actions se usan `SUPABASE_YES=1` y `--password`.
- **Drizzle con el driver pg**: el pooler de Supabase en modo transacción no admite el pipelining de postgres.js, que puede dejar consultas colgadas o mezclar resultados. Se usa node-postgres y, en Vercel, `attachDatabasePool`.
- **Stripe Connect con Accounts v2**: las cuentas de Host se crean con la API v2 (configuración `recipient` y panel Express), no con `type: 'express'`. Antes de cada transferencia se comprueba que `stripe_transfers` esté activo. Una tercera ruta recibe los eventos thin de esas cuentas.
- **Webhooks**: un evento ya procesado se ignora; uno registrado que falló se vuelve a procesar en el reintento de Stripe.
- **Fotos**: los originales se suben a un bucket privado nuevo, `photo-uploads`, y solo pasan a `listing-photos` después de sharp.
- **Emails críticos**: contrato, pago, liberación, reembolso y disputa pasan por la tabla `email_outbox`, que envía `sweep`.
- **Next.js 16**: `proxy.ts` en lugar de `middleware.ts`, y `eslint .` en lugar de `next lint`.

## Supuestos y costo mensual

Una sola persona desarrolla, revisa el trabajo de Claude Code y aprueba cada merge. Next.js corre en tu máquina; Supabase nunca corre local. Solo pagas cuando el proyecto necesita estar en internet.

| Fase | Cuándo empieza | Qué se paga | Costo mensual |
| --- | --- | --- | --- |
| Construcción | Hoy (Pasos 0 a 8) | Nada | $0 |
| Preparación del lanzamiento | Paso 9: al necesitar una URL pública o 4 a 6 semanas antes de abrir | Vercel Pro ($20) + organización Pro de Supabase solo con producción ($25) | $45 |
| Lanzamiento | Al abrir a usuarios reales | Lo anterior + Resend Pro ($20) | $65 |

Claude Code ya está contratado y el dominio cuesta unos $10 a $20 al año; ninguno de los dos entra en estos totales.

| Servicio | Construcción | Desde el Paso 9 | Límite que importa |
| --- | --- | --- | --- |
| Supabase | Free: producette-dev y producette-staging | + organización Pro con producette-prod | Free: 2 proyectos activos, 500 MB por base y pausa tras una semana sin actividad |
| Vercel | Sin uso | Pro, 1 usuario | Pro incluye $20 de uso |
| GitHub | Free | Free | 2,000 minutos de Actions al mes |
| Stripe | Sandboxes, sin costo | Live, variable | 2.9% + $0.30 por cobro; Connect $2 por Host activo + 0.25% + $0.25 por transferencia; Identity $1.50 por verificación (50 gratis) |
| Resend | Free | Free; Pro al lanzar | 100 emails al día y 1 dominio para todos los entornos |
| Sentry | Developer | Developer | 1 usuario y 5,000 errores al mes |
| Mapbox | Free | Free | 50,000 cargas de mapa al mes; pide tarjeta |
| Google Cloud | Gratis | Gratis | — |
| Bitwarden | Free | Free | — |

**Por qué no usar Vercel Hobby durante la construcción.** Vercel limita Hobby al uso personal no comercial, y considera comercial cualquier despliegue que sirva a la ganancia económica de alguien que participa en el proyecto ([guía de uso justo](https://vercel.com/docs/limits/fair-use-guidelines)). Un staging de Producette cae en esa definición. Por eso la construcción no despliega en ningún hosting y todo se prueba en tu máquina:

- **Webhooks de Stripe**: Stripe CLI los reenvía a localhost.
- **Login con Google y emails de Auth**: funcionan con `http://localhost:3000`.
- **Plazos**: `npm run sweep:watch` hace el papel de pg\_cron.
- **Pruebas en el teléfono**: un túnel temporal gratuito (por ejemplo, Cloudflare Tunnel) hacia localhost, abierto solo mientras pruebas.

Staging sí existe desde el principio, como base de datos: recibe cada migración integrada a main, igual que la recibirá producción. Su web aparece en el Paso 9.

Precios revisados en fuentes de 2026; confírmalos en cada página de precios antes de contratar.

## Cómo usar este plan

Cada paso dice quién lo hace, qué hacer y un criterio de **Hecho cuando** que Claude Code verifica antes de darlo por terminado.

- **\[Persona\]**: crear cuentas, configurar paneles con login humano (Google Cloud, DNS, Stripe, Vercel, Supabase), cargar secretos de staging y producción, revisar pull requests, hacer merge y crear etiquetas de producción.
- **\[Claude Code\]**: todo lo que vive en el repositorio (código, migraciones, scripts, workflows) y la configuración por línea de comandos contra dev, una vez que dejaste cada CLI autenticada.

Forma de trabajar:

1. Abre una sesión de Claude Code por paso, con una instrucción como: *"Lee CLAUDE.md y ejecuta el Paso 4 de docs/plan-entornos.md. Al terminar, verifica los criterios de Hecho cuando y resúmelos."*
2. Claude Code trabaja en una rama `feat/*`, llena la plantilla del pull request y lo abre hacia main.
3. Tú lo revisas en GitHub y haces merge. Claude Code nunca hace merge, nunca crea etiquetas y nunca despliega a producción.
4. Si un paso necesita una acción tuya a mitad de camino, Claude Code se detiene y la pide; no inventa valores ni claves.

Solo una rama con migraciones puede estar abierta a la vez, porque dev es una sola base compartida. Varias sesiones en paralelo sirven solo para tareas sin cambios de base.

## Decisiones técnicas

Un solo repositorio con Next.js, desplegado en Vercel desde el Paso 9, sobre tres proyectos de Supabase en la nube y Stripe con sandboxes separadas. El código es el mismo en todos los entornos; solo cambian las variables.

### Stack

| Capa | Tecnología |
| --- | --- |
| Base del proyecto | Plantilla oficial Supabase Starter (with-supabase) |
| Framework | Next.js 16 (App Router) + TypeScript estricto |
| UI | Tailwind CSS con la paleta y tipografía del manual de marca, shadcn/ui, bloque de login social de Supabase UI |
| Base de datos | Supabase Postgres + PostGIS; migraciones SQL con Supabase CLI v3 |
| Consultas | Drizzle ORM con el driver pg, solo en el servidor y solo consultas tipadas (no migraciones) |
| Auth | Supabase Auth: email con confirmación y Google |
| Tiempo real y archivos | Supabase Realtime (solo lectura) y Supabase Storage |
| Fotos | sharp en el servidor: redimensiona y borra metadatos EXIF, incluida la ubicación GPS |
| Contratos | PDF generado en el servidor con @react-pdf/renderer, guardado en Storage privado con su hash SHA-256 |
| Pagos y KYC | Stripe Connect (cuentas de Host con Accounts v2 y panel Express), Stripe Identity, Payment Element |
| Tareas programadas | pg\_cron + pg\_net en staging y producción |
| Emails | Resend + React Email |
| Idiomas | next-intl con rutas /es y /en para la web; el panel admin va en español, sin idioma en la URL |
| Validación y tests | Zod 4, Vitest, Playwright |
| Errores | Sentry |
| Guías para Claude Code | Skills del proyecto `producette-*` en `.claude/skills/`, más las skills oficiales de Supabase, Vercel, Next.js y Stripe |

### Entornos

|  | Local (dev) | Staging | Producción |
| --- | --- | --- | --- |
| Para qué | Tú y Claude Code desarrollan | Ensayo de cada migración integrada; desde el Paso 9, pruebas en una URL pública | Usuarios reales |
| Rama o etiqueta | Ramas `feat/*` | main | Etiquetas `v*` |
| Next.js | `npm run dev` | Vercel, entorno personalizado staging (Paso 9) | Vercel, Production (Paso 9) |
| Supabase | producette-dev (Free) | producette-staging (Free) | producette-prod (Pro, Paso 9) |
| Migraciones | Claude Code, con `--remote --dry-run` antes | Solo GitHub Actions | Solo GitHub Actions |
| Stripe | Sandbox dev + Stripe CLI | Sandbox staging (Paso 9) | Modo live (Paso 9) |
| Dominio | localhost:3000 | staging.producette.com (Paso 9) | producette.com (Paso 9) |
| Cron | Manual (`npm run sweep:watch`) | pg\_cron cada minuto (Paso 9) | pg\_cron cada minuto |
| Datos | Ficticios (seed) | Ficticios (seed) | Reales |
| Credenciales en tu máquina | Sí | No | Nunca |

### Camino de un cambio

1. Claude Code trabaja en una rama `feat/*` contra producette-dev y crea las migraciones como archivos en `supabase/migrations`.
2. Abre un pull request hacia main; el CI corre lint, typecheck, tests unitarios y build.
3. Revisas y haces merge (squash).
4. Una GitHub Action comprueba que el commit vino de un pull request con CI en verde y aplica las migraciones a staging. Desde el Paso 9, además despliega la web de staging.
5. Desde el Paso 9: pruebas en staging y creas una etiqueta `v2026.11.03` sobre ese commit. Otra Action aplica las migraciones a producción y despliega exactamente ese commit.

Nadie modifica la estructura de staging ni de producción desde el panel de Supabase.

## Paso 0 · Requisitos previos \[Persona\]

Antes de abrir Claude Code creas las cuentas, dejas las herramientas autenticadas y corriges los documentos que Claude Code tomará como fuente de verdad. Ninguna clave se pega en el chat de Claude Code ni en el repositorio: se guardan en el gestor de contraseñas.

### Herramientas en tu máquina

- [ ] Node.js (LTS actual) y Git.
- [ ] Claude Code (ya instalado).
- [ ] GitHub CLI autenticado con `gh auth login`.
- [ ] Supabase CLI versión 3 o superior (`supabase --version`), autenticado con `supabase login`. No hace falta Docker.
- [ ] Stripe CLI autenticado con `stripe login`, apuntando a la sandbox dev y nunca al modo live.
- [ ] Vercel CLI: no hace falta hasta el Paso 9.

### Cuentas y recursos (todas gratuitas)

- [ ] **GitHub Free**: repositorio privado vacío `producette`.
- [ ] **Supabase Free**: una organización gratuita con dos proyectos en la región East US, `producette-dev` y `producette-staging`. Guarda la contraseña de base de datos de cada uno. Al crear cada proyecto: región East US (North Virginia), elegida en "Need a specific region?"; sin conectar GitHub; Data API activada; "Automatically expose new tables" desactivado; "Enable automatic RLS" activado. Los tres proyectos llevan exactamente esta configuración. La organización Pro con `producette-prod` se crea en el Paso 9.
- [ ] **Stripe**: cuenta de la empresa con Connect (plataforma con panel Express para los Hosts) e Identity activados, y dos sandboxes: dev y staging. El modo live se activa en el Paso 9.
- [ ] **Google Cloud**: un proyecto con la pantalla de consentimiento OAuth configurada.
- [ ] **Resend Free**, **Sentry Developer** y **Mapbox Free** (con tarjeta).
- [ ] **Bitwarden** (u otro gestor) para todas las claves.

### Documentos de referencia

- [ ] **Alcance corregido**: en la sección del panel, "5% cliente con tope" pasa a "5% cliente sin tope". Agrega las decisiones del 26 de octubre: testimonios fijos, sin gestión desde el admin.
- [ ] **Alcance en Markdown real**: los archivos del proyecto son texto Markdown con extensión `.docx`, así que basta con renombrarlos a `.md`.
- [ ] **Prototipo de interfaces** (HTML: la web responsive publicada, con el sitio, el panel del Host y el panel de administración) y **manual de marca Chispa** (HTML) listos para copiar a `docs/`.
- [ ] **Skills del proyecto** (`producette-skills.zip`) listas para descomprimir en la raíz del repositorio.

### Preguntas abiertas

- [ ] Nombre comercial: Producette. Dominio producette.com ya comprado; confirmar el acceso al DNS para Vercel y Resend.

**Hecho cuando**: todas las casillas están marcadas; `gh auth status` y `stripe config --list` responden sin error; y `supabase projects list` muestra `producette-dev` y `producette-staging`.

## Paso 1 · Proyecto base desde la plantilla \[Claude Code\]

El proyecto nace de la plantilla oficial Supabase Starter, creada con el comando, se limpia del contenido de demostración y queda conectado a producette-dev.

### Instrucciones para Claude Code

1. En una carpeta vacía, ejecuta `npx create-next-app@latest producette --example with-supabase` y entra en `producette`.
2. Inicializa Git y conecta el remoto `producette` con `gh`. Solo existe la rama main.
3. Conserva de la plantilla: los clientes de Supabase (navegador y servidor), el proxy que refresca la sesión (en Next.js 16 es `proxy.ts`; si la plantilla trae `middleware.ts`, conviértelo), las páginas de login, registro, recuperación y cambio de contraseña, y la ruta de confirmación de email.
4. Elimina: los componentes del tutorial, la página de inicio de demostración, el contenido de ejemplo de la página protegida y los enlaces a la documentación de Supabase o Vercel.
5. Crea esta estructura, con un `README.md` corto en cada carpeta:
   - `app/[locale]/(public)`: web pública sin cuenta.
   - `app/[locale]/(app)`: páginas con sesión, Modo Cliente y Modo Host.
   - `app/admin`: panel de administración, en español y sin idioma en la URL.
   - `app/api`: webhooks y endpoints internos, sin idioma.
   - `lib/domain`: reglas de negocio como funciones puras con tests (comisiones, cancelaciones, plazos, estados).
   - `lib/server`: acceso a datos y servicios externos, solo ejecutable en el servidor.
   - `supabase/migrations`, `supabase/templates` y `scripts/`.
   - `messages/es.json` y `messages/en.json`.
   - `docs/` y `tests/e2e/`.
6. Guarda en `docs/`: este plan como `plan-entornos.md`, el alcance corregido como `alcance-fase-1.md`, el prototipo como `prototipo-fase-1.html` y el manual como `manual-marca.html`.
7. Crea `CLAUDE.md`, `.claude/settings.json` y `.github/pull_request_template.md` con el contenido de la sección *CLAUDE.md, permisos y plantilla* de este plan, y descomprime las skills del proyecto en `.claude/skills/`.
8. Obtén la URL y la clave publicable de producette-dev con el Supabase CLI y guárdalas en `.env.local`, que debe estar en `.gitignore`.
9. Haz el primer commit y súbelo a main.
10. Después del primer push, instala `simple-git-hooks` con un hook `pre-push` que rechace cualquier push a `refs/heads/main` y deje pasar las ramas `feat/*` y las etiquetas `v*`.

**Hecho cuando**: `npm run build` termina sin errores; `npm run dev` muestra una página de inicio vacía en localhost:3000; GitHub tiene main sin `.env.local`; `git push origin main` desde tu máquina es rechazado por el hook; y `/skills` en Claude Code muestra las doce skills `producette-*`.

## Paso 2 · Herramientas base \[Claude Code\]

Este paso deja las herramientas con las que Claude Code comprueba su propio trabajo en cada tarea: tipos estrictos, lint, tests, idiomas y la base visual.

### Instrucciones para Claude Code

- **TypeScript estricto**: activa `strict` y `noUncheckedIndexedAccess` en `tsconfig.json` y corrige lo que falle.
- **Calidad de código**: ESLint y Prettier con las reglas estándar de Next.js. El script `lint` es `eslint .`, porque Next.js 16 ya no trae `next lint`.
- **Tests unitarios**: instala Vitest, con un test de ejemplo en `lib/domain` para el caso del alcance: reserva de $3,400, el cliente paga $3,570 y el proveedor recibe $3,060.
- **Tests de punta a punta**: instala Playwright con un test mínimo que abra la página de inicio en /es y en /en, a ancho de teléfono (390 px) y de escritorio, y compruebe que la página no se desplaza de lado. Corren en tu máquina, no en el CI, para no gastar minutos de GitHub Actions.
- **Validación**: instala Zod. Todo dato que entra al servidor (formularios, acciones, webhooks) se valida con un esquema.
- **Drizzle**: instala Drizzle ORM con el driver pg (node-postgres), conectado al pooler de Supabase en modo transacción, sin prepared statements con nombre, y registra el pool con `attachDatabasePool` de `@vercel/functions`. No uses postgres.js: su pipelining no funciona con el pooler en modo transacción. Genera el esquema con `drizzle-kit pull` filtrado al esquema `public` y nunca generes migraciones con Drizzle (`generate`, `migrate` y `push` quedan bloqueados en `.claude/settings.json`). Drizzle entra con el usuario dueño de la base y se salta RLS, así que solo se importa desde `lib/server` y cada consulta verifica antes quién pide los datos.
- **Tipos de Supabase**: un script que genere los tipos con `supabase gen types typescript --remote`.
- **Idiomas**: next-intl con /es y /en siempre visibles en la URL y redirección desde la raíz según el idioma del navegador. Combina el proxy de next-intl con el de Supabase en un solo archivo y prueba que funcionan juntos. Todos los textos de la interfaz van en `messages/es.json` y `messages/en.json`.
- **SEO**: `generateMetadata` con `hreflang` es/en, `x-default` y URL canónica en cada página pública. La redirección por idioma solo aplica a la raíz, para no impedir que Google rastree el catálogo.
- **Base visual**: tema de Tailwind con la paleta y la tipografía de `docs/manual-marca.html`, para que los componentes se construyan desde `docs/prototipo-fase-1.html`.
- **Componentes**: con shadcn, los componentes base (botón, campos, diálogo, tabla, menú desplegable, tarjeta, pestañas, insignia y avisos). De Supabase UI Library, solo el bloque de login social.
- **Skills oficiales**: instala las skills de Supabase (`npx skills add supabase/agent-skills`), Vercel (`vercel-labs/agent-skills`), Next.js (`vercel-labs/next-skills`) y Stripe (`npx skills add https://docs.stripe.com`). Las skills `producette-*` mandan cuando choquen.
- **Scripts** en `package.json`: `dev`, `build`, `lint`, `typecheck`, `test`, `test:rls`, `test:e2e`, `db:types`, `db:new`, `db:reset:dev`, `seed`, `stripe:listen`, `sweep` y `sweep:watch`.

**Hecho cuando**: `npm run lint`, `npm run typecheck`, `npm test` y `npm run test:e2e` pasan; /es y /en muestran la página de inicio con textos de los archivos de mensajes y sus etiquetas `hreflang`; y las páginas de login cargan en ambos idiomas.

## Paso 3 · Variables de entorno y protecciones \[Claude Code + Persona\]

La aplicación valida sus variables al arrancar y se niega a funcionar si detecta una mezcla peligrosa: claves live fuera de producción, o tu máquina apuntando a staging o a producción.

### Variables

| Variable | Visibilidad | Para qué |
| --- | --- | --- |
| NEXT\_PUBLIC\_SITE\_URL | Pública | URL base del entorno |
| NEXT\_PUBLIC\_APP\_ENV | Pública | `local`, `staging` o `production` en el navegador (franja de entorno y Sentry) |
| NEXT\_PUBLIC\_SUPABASE\_URL | Pública | URL del proyecto de Supabase |
| NEXT\_PUBLIC\_SUPABASE\_PUBLISHABLE\_KEY | Pública | Clave publicable de Supabase |
| SUPABASE\_SECRET\_KEY | Secreta | Operaciones del servidor que saltan RLS |
| DATABASE\_URL | Secreta | Conexión de Drizzle (driver pg) por el pooler en modo transacción |
| NEXT\_PUBLIC\_STRIPE\_PUBLISHABLE\_KEY | Pública | Stripe Elements |
| STRIPE\_SECRET\_KEY | Secreta | Llamadas a Stripe desde el servidor |
| STRIPE\_WEBHOOK\_SECRET | Secreta | Firma de webhooks de la plataforma |
| STRIPE\_CONNECT\_WEBHOOK\_SECRET | Secreta | Firma de webhooks de cuentas conectadas |
| STRIPE\_V2\_WEBHOOK\_SECRET | Secreta | Firma de los eventos thin de cuentas v2 |
| CRON\_SECRET | Secreta | Autoriza las llamadas de pg\_cron |
| STAGING\_PASSWORD | Secreta | Contraseña compartida de staging; no existe en producción |
| RESEND\_API\_KEY y EMAIL\_FROM | Secreta | Envío de emails |
| EMAIL\_ALLOWLIST | Secreta | Destinatarios permitidos fuera de producción |
| NEXT\_PUBLIC\_SENTRY\_DSN y SENTRY\_AUTH\_TOKEN | Pública y secreta | Errores y mapas de código |
| NEXT\_PUBLIC\_MAPBOX\_TOKEN | Pública | Mapa, restringido por URL |
| DEADLINE\_SCALE | Secreta | Acelera los plazos fuera de producción (Paso 6) |

### Instrucciones para Claude Code

- Crea `lib/env.ts` con dos esquemas Zod, uno público y uno secreto, que fallen al arrancar con un mensaje claro. Las secretas solo se importan desde el servidor.
- Crea `.env.example` con todas las variables, sin valores y con un comentario por cada una.
- Crea `lib/app-env.ts`: devuelve `local`, `staging` o `production`. En Vercel lee `VERCEL_TARGET_ENV`, porque `VERCEL_ENV` devuelve `preview` también en entornos personalizados.
- Guarda como constantes en el código los identificadores de los tres proyectos de Supabase (no son secretos) y agrega estas protecciones al arrancar:
  - En `local`, la URL de Supabase tiene que ser la de producette-dev; con la de staging o producción, la aplicación se detiene.
  - Fuera de producción, con la URL de producette-prod, la aplicación se detiene.
  - Fuera de producción, una clave de Stripe `sk_live_` o `pk_live_` detiene la aplicación; en producción, una clave de prueba también.
- Fuera de producción, muestra una franja fija con el texto LOCAL o STAGING y bloquea la indexación con `X-Robots-Tag: noindex` y un `robots.txt` que lo prohíbe todo.
- En producción, `robots.txt` permite rastrear la web pública y bloquea `/admin` y `/api`; agrega `sitemap.xml` con las páginas públicas en ambos idiomas.
- Completa `.env.local` con los valores de producette-dev y de la sandbox dev de Stripe, usando los CLI ya autenticados. Si falta un valor, pídelo.

### Dónde vive cada valor

- **Local**: `.env.local`, fuera de Git, solo con valores de dev.
- **Staging**: hasta el Paso 9 no hay web, así que solo existen los secretos de su base en GitHub (Paso 7). Desde el Paso 9, el entorno staging de Vercel; Claude Code puede cargarlo con `vercel env add <NOMBRE> staging`.
- **Producción**: desde el Paso 9, el entorno Production de Vercel, marcado como sensible para que no se pueda volver a leer. Lo cargas tú, desde el gestor de contraseñas.

**Hecho cuando**: quitar una variable obligatoria hace fallar `npm run build` con un mensaje claro; una clave `sk_live_` o la URL de staging en `.env.local` impiden arrancar; la franja LOCAL se ve en localhost; y `curl -I` en localhost muestra la cabecera noindex.

## Paso 4 · Supabase, migraciones base y datos de prueba \[Claude Code + Persona\]

El repositorio queda vinculado solo a producette-dev, con las tablas base del alcance (cuentas, perfiles, roles del panel, bitácora y comisiones) y un script de datos de prueba. Staging las recibe con la Action del Paso 7 y producción, con la del Paso 9.

### Configuración de Auth \[Persona\]

- [ ] **producette-dev**: URL del sitio `http://localhost:3000`, redirecciones `http://localhost:3000/**` y confirmación de email activada.
- [ ] **producette-staging**: confirmación de email activada. La URL del sitio y las redirecciones se configuran en el Paso 9, cuando staging tenga web.
- [ ] **producette-prod**: se crea y configura en el Paso 9.
- [ ] El correo incluido en Supabase tiene límites muy bajos; en el Paso 8 se reemplaza por Resend.

### Instrucciones para Claude Code

- Ejecuta `supabase init` y `supabase link --project-ref <ref de producette-dev>`. Nunca vincules staging ni producción.
- Crea las migraciones con `supabase migration new`, una por tema:
  - **Extensiones**: postgis, btree\_gist, pg\_cron y pg\_net.
  - **Cuentas y perfiles**: `accounts` (id igual al de auth.users, idioma preferido, `stripe_customer_id`, `referred_by_host_id` nulo, fecha de anonimización) y `profiles` (user\_id, `segment` como texto con check `client` o `host`, tasa de comisión del Host en puntos básicos, número de fundador nulo, presentación propia de cada perfil). Un trigger crea la cuenta y su perfil Cliente al registrarse, porque toda cuenta nace como Cliente.
  - **Panel de administración**: `panel_users` (user\_id, rol con check `admin`, `soporte` o `finanzas`, activo) y `audit_log` (usuario, rol, acción, entidad, id, motivo obligatorio, datos, fecha). Revoca UPDATE y DELETE sobre `audit_log`: solo admite agregar filas.
  - **Comisiones**: `fee_settings` con filas versionadas (proveedor 1000, cliente 500, fundador 800 y enlace 300 puntos básicos, vigente desde, creado por). El 5% del cliente no tiene tope.
  - **Storage**: bucket público `listing-photos` y buckets privados `photo-uploads` (originales antes de sharp), `contracts`, `evidence`, `coi` y `chat-files`, con límites de tamaño y tipo, y políticas que niegan todo por defecto. Las subidas usan URLs firmadas que crea el servidor.
- Activa RLS en cada tabla desde su creación, con políticas explícitas: cada usuario lee solo su cuenta y sus perfiles; `panel_users`, `audit_log` y `fee_settings` no son legibles desde el navegador. Como los proyectos no exponen tablas nuevas a la API, cada migración que crea una tabla incluye sus permisos (GRANT): a `authenticated` si la lee un usuario con sesión, a `anon` solo si es contenido público, como el catálogo, y a `service_role` solo si el servidor la usa con supabase-js. Las tablas de dinero, la bitácora y la configuración de comisiones no reciben permisos para el navegador.
- Las funciones `security definer` van en el esquema `private`, con `set search_path = ''` y `revoke all … from public`.
- Ninguna llave foránea borra en cascada desde usuarios hacia contratos, pagos o bitácora. Borrar una cuenta es anonimizarla, porque contratos y pagos se guardan 7 años.
- Crea `lib/server/auth.ts` con `requireUser()` y `requireRole(roles)`, que verifican sesión y rol en cada acción del servidor, y `logAudit()`, que escribe en la bitácora dentro de la misma transacción que la acción.
- Revisa con `supabase db push --remote --dry-run`, muestra el resultado y aplica con `supabase db push --remote`.
- Genera los tipos (`npm run db:types`) y el esquema de Drizzle (`npx drizzle-kit pull`).
- Crea `scripts/seed.ts`: usuarios de prueba con la API de administración de Supabase (alias tuyos como `tu+cliente1@…`, contraseñas conocidas), Patricia como Admin en `panel_users` y la primera fila de `fee_settings`. Se detiene si la URL es la de producción. En staging lo corre una Action manual del Paso 7, no tu máquina.
- Escribe tests de RLS, que corren en tu máquina contra dev con `npm run test:rls`: un usuario no lee la cuenta ni el perfil de otro; un usuario sin rol no lee `audit_log`; y una fila de `audit_log` no se puede modificar; y una tabla sin permiso explícito devuelve "permission denied" con la clave publicable.

### Reglas de migración

- Una migración aplicada nunca se edita; un cambio es siempre una migración nueva.
- Las migraciones solo agregan. Borrar o renombrar se hace en dos pasos: primero se deja de usar en el código desplegado y después se elimina en otra migración.
- Una sola rama con migraciones a la vez. Al cambiar de rama, `npm run db:reset:dev` reaplica las migraciones de la rama actual en dev y corre el seed.
- Nadie cambia la estructura de staging ni de producción desde el panel de Supabase.

**Hecho cuando**: `supabase migration list --remote` muestra las migraciones aplicadas en dev; registrarse en localhost crea la cuenta y el perfil Cliente en dev; los tests de RLS pasan; y el seed funciona en dev y se niega a correr con la URL de producción.

## Paso 5 · Stripe y comisiones \[Claude Code + Persona\]

Stripe queda conectado en dev con su sandbox (staging se conecta en el Paso 9), el cliente de Stripe se crea al registrarse, todos los webhooks pasan por un único repartidor y las comisiones se calculan en un solo lugar. Todavía no se programa ningún cobro.

### Configuración en Stripe \[Persona\]

- [ ] En las sandboxes dev y staging: perfil de plataforma Connect con panel Express para los Hosts, marca de Producette e Identity activado.
- [ ] Paso 9: en la sandbox staging, tres destinos de webhook: eventos de la plataforma a `https://staging.producette.com/api/webhooks/stripe`, eventos de cuentas conectadas a `https://staging.producette.com/api/webhooks/stripe-connect` y eventos thin de cuentas v2 a `https://staging.producette.com/api/webhooks/stripe-v2`. Cada clave de firma va al entorno staging de Vercel.
- [ ] Paso 9, antes del modo live: revisar en Connect la emisión de formularios 1099-K para los Hosts ($2.99 por formulario al IRS).
- [ ] Paso 9: el modo live repite la configuración con el dominio real. Solo tú manejas esas claves.

### Instrucciones para Claude Code

- Instala `stripe`, `@stripe/stripe-js` y `@stripe/react-stripe-js`. Crea el cliente en `lib/server/stripe.ts`, solo para servidor, con la versión de la API fijada.
- Crea `ensureStripeCustomer(userId)`: si la cuenta no tiene `stripe_customer_id`, crea el cliente con el id del usuario en los metadatos y una clave de idempotencia. Llámala al confirmar el email, al volver del login con Google y antes de cualquier acción con dinero.
- Crea la tabla `stripe_events`: id del evento único, tipo, origen (plataforma, cuenta conectada o v2), contenido, recibido, procesado y error.
- Crea las rutas `app/api/webhooks/stripe` y `app/api/webhooks/stripe-connect` (eventos snapshot, con `constructEvent`) y `app/api/webhooks/stripe-v2` (eventos thin, con `parseEventNotification`): cada una verifica la firma con su clave sobre el cuerpo sin procesar, guarda el evento y lo entrega al repartidor. Si el evento ya estaba procesado, responde 200 sin repetir nada; si se registró pero falló, lo procesa de nuevo y, si vuelve a fallar, responde 500 para que Stripe reintente.
- Crea el repartidor en `lib/server/stripe/dispatch.ts`: un mapa de tipo de evento a manejador, cada uno en su archivo y dentro de un savepoint. Por ahora solo los eventos de cuentas v2 (cambios de requisitos y de la capacidad `stripe_transfers`). Después llegan los de pagos, Identity, transferencias y contracargos.
- Las cuentas de Host se crean con Accounts v2 cuando se construya el onboarding del Host: configuración `recipient` con `stripe_transfers`, panel Express y la plataforma responsable de tarifas y pérdidas. Nunca `type: 'express'`, `merchant` ni `card_payments`. Detalle en la skill `producette-stripe`.
- Crea `lib/domain/fees.ts` como única función de cálculo, con montos en centavos enteros:
  - Recibe el precio, las tasas vigentes leídas de `fee_settings`, la tasa del Host (10% u 8% de fundador) y si el cliente se registró desde el enlace de ese Host (`referred_by_host_id`). El 3% depende del registro del cliente, no de la reserva. Si un Host fundador trae a su propio cliente, aplica la tasa menor (3%).
  - Devuelve lo que paga el cliente (precio + 5%, sin tope), la comisión, el neto del Host y las tasas usadas. Cada cotización guarda esas tasas, para que un cambio en el panel solo afecte reservas nuevas.
  - Redondea al centavo, la mitad hacia arriba.
  - Si se acuerda un monto menor, no recalcula el 5% ni la comisión.
  - Tests: $3,400 → $3,570 y $3,060; fundador al 8%; enlace al 3%; monto menor; y redondeo.
- Agrega el script `stripe:listen`: `stripe listen --forward-to localhost:3000/api/webhooks/stripe --forward-connect-to localhost:3000/api/webhooks/stripe-connect`, y `stripe:listen:v2` para los eventos thin hacia `/api/webhooks/stripe-v2` (confirma las banderas con `stripe listen --help`).

**Hecho cuando**: un usuario nuevo en dev tiene su cliente en la sandbox dev; `stripe trigger` guarda un evento una sola vez aunque se reenvíe; un manejador que falla deja el evento sin procesar y se procesa en el reintento; una firma inválida devuelve 400 en las tres rutas; y los tests de comisiones pasan.

## Paso 6 · Tareas programadas y plazos \[Claude Code + Persona\]

Desde el Paso 9, staging y producción llaman cada minuto a su propio endpoint de vencimientos con pg\_cron y pg\_net. Dev no tiene cron automático, porque pg\_cron no puede llamar a localhost; mientras desarrollas usas `npm run sweep:watch`.

### Instrucciones para Claude Code

- Crea `app/api/internal/sweep` (POST), que exige `Authorization: Bearer <CRON_SECRET>` y responde 401 sin ella. Ejecuta los procesos registrados en `lib/server/jobs`; al principio solo uno de prueba.
- Cada proceso busca filas cuyo plazo ya pasó y siguen en el estado esperado, y las procesa en una transacción con `FOR UPDATE SKIP LOCKED`. Ejecutarlo dos veces nunca tiene doble efecto.
- Crea `app/api/internal/nightly` con la misma protección, para el ranking nocturno de Hosts. Por ahora queda vacío.
- Crea la tabla `job_runs` (proceso, inicio, fin, filas procesadas, error) y registra cada ejecución.
- Crea una migración que programe con pg\_cron `sweep` cada minuto y `nightly` a las 08:00 UTC (madrugada en Miami). Cada tarea llama a una función `private.call_internal(ruta)` que lee `app_url` y `cron_secret` de Supabase Vault y hace un `net.http_post`. Si `app_url` no existe, la tarea no hace nada: así la misma migración sirve en dev, staging y producción.
- Crea `lib/domain/deadlines.ts` con los plazos del alcance:
  - Solicitud sin respuesta: 24 h.
  - Validez de la cotización: 7 días, nunca después de 24 h antes del inicio.
  - Contraoferta: 24 h.
  - Contrato sin firmar o sin pagar: 24 h.
  - Ventana de liberación: 48 h desde que el Host marca "Trabajo completado".
  - Respuesta a "No se presentó": 48 h.
  - Ventana de reviews: 7 días.
  - Decisión de una disputa: 5 días hábiles, contados en la zona horaria America/New\_York.
- Agrega `DEADLINE_SCALE`, que multiplica los plazos en horas. Fuera de producción puede valer 0.0035 (48 h ≈ 10 minutos). En producción, si existe y no vale 1, la aplicación se detiene. El plazo se guarda como fecha en la fila al entrar en cada estado.
- No escales los días hábiles de las disputas ni las reglas que dependen de la fecha del evento: la tabla de cancelaciones y la antelación de 10 días a 3 meses de la Reserva Inmediata.
- Agrega `npm run sweep` (una llamada) y `npm run sweep:watch` (una llamada por minuto) contra localhost con el secreto local.

### Secretos de Vault \[Persona\]

- [ ] **producette-dev**: nada. Sin `app_url`, la tarea programada no hace nada.
- [ ] **producette-staging** (Paso 9): `app_url = https://staging.producette.com` y `cron_secret` igual al `CRON_SECRET` del entorno staging de Vercel.
- [ ] **producette-prod** (Paso 9): lo mismo con el dominio real y su propio secreto.

**Hecho cuando**: la migración de pg\_cron se aplica en dev y staging sin errores y, sin `app_url`, no registra ejecuciones; `npm run sweep` registra una ejecución en dev; una llamada sin secreto devuelve 401; un test demuestra que dos ejecuciones simultáneas no procesan la misma fila; y un test demuestra que en producción la aplicación no arranca con `DEADLINE_SCALE` distinto de 1. La ejecución por minuto en staging se comprueba en el Paso 9.

## Paso 7 · GitHub Actions y migraciones a staging \[Claude Code + Persona\]

Cada merge a main pasa por el CI y aplica sus migraciones a producette-staging, que funciona como ensayo general de lo que después recibirá producción. Todavía no se despliega ninguna web; eso llega en el Paso 9. GitHub Free no protege ramas, así que el workflow se niega a migrar un commit que no vino de un pull request con CI en verde.

### Configuración \[Persona\]

- [ ] **Token de acceso de Supabase** (personal) y contraseña de base de producette-staging.
- [ ] **Secretos del repositorio en GitHub**: `SUPABASE_ACCESS_TOKEN`, `STAGING_DB_PASSWORD`, y la URL y la clave secreta de staging para el seed.
- [ ] **Ajustes del repositorio**: solo merge con squash y borrar la rama al hacer merge.

En GitHub Free cualquier workflow puede leer los secretos del repositorio, incluido uno modificado en una rama. Por eso todo cambio en `.github/workflows/` pide tu confirmación en Claude Code, y es lo primero que miras en cada pull request.

### Instrucciones para Claude Code

- Crea `.github/workflows/ci.yml`: en cada pull request ejecuta lint, typecheck, tests unitarios y build, con valores ficticios de formato válido (por ejemplo, `sk_test_ci`).
- Crea `.github/workflows/deploy.yml`, disparado por cada push a main:
  - Un primer job comprueba con la API de GitHub que el commit pertenece a un pull request integrado y que su CI pasó; si no, termina sin tocar nada.
  - Después instala el Supabase CLI con una versión fijada (`supabase/setup-cli`), lo enlaza con producette-staging y ejecuta `supabase db push --remote` con `SUPABASE_YES=1` y la contraseña de staging. Dos despliegues nunca corren a la vez (`concurrency` sin cancelar el que está en curso).
  - Deja preparado el lugar de los pasos de Vercel y de la etiqueta de producción, que se agregan en el Paso 9.
- Crea `.github/workflows/seed-staging.yml`, que solo se lanza a mano y corre `scripts/seed.ts` contra staging.
- Escribe en `docs/despliegue.md` qué hacer si staging está pausado: restaurarlo desde el panel de Supabase y volver a lanzar el workflow.

**Hecho cuando**: un pull request muestra los checks de CI; un merge a main aplica sus migraciones a staging y el log de la Action lo muestra; un push directo a main (saltando el hook) no migra nada; el seed de staging funciona desde la Action manual; y, con staging pausado, la Action falla sin efectos y funciona al restaurarlo.

## Paso 8 · Servicios externos en planes gratuitos \[Claude Code + Persona\]

Google, Resend, Sentry y Mapbox quedan conectados y probados en localhost; sus credenciales de producción se crean en el Paso 9. Los planes gratuitos comparten sus límites entre entornos, así que fuera de producción ningún email llega a alguien ajeno a ti.

### Login con Google

- [ ] **\[Persona\]** En Google Cloud, crea un cliente OAuth web para dev y staging, con las URLs de callback de ambos proyectos de Supabase, y activa el proveedor Google en esos dos proyectos. El cliente de producción se crea en el Paso 9.

* **\[Claude Code\]** Conecta el bloque de login social a los botones de Google. En la ruta de retorno llama a `ensureStripeCustomer`. La aceptación de Términos y Privacidad (con fecha, hora, versión e IP) y la casilla de mayor de 18 años se resuelven en un onboarding común a email y Google.

### Emails con Resend Free

- [ ] **\[Persona\]** Verifica producette.com en Resend (registros DNS) y crea una clave para lo que no es producción. Configura Resend como servidor SMTP de Auth en producette-dev y producette-staging.

* **\[Claude Code\]** Crea `lib/server/email.ts` como única vía de envío, con plantillas de React Email en `emails/` en español e inglés y una clave de idempotencia por email (`<evento>/<id>`). Fuera de producción, todo destinatario fuera de `EMAIL_ALLOWLIST` queda en el log y no se envía.
* **\[Claude Code\]** Crea la tabla `email_outbox` y un proceso de `sweep` que la envía. Los emails que no pueden perderse (contrato, pago, liberación, reembolso y disputa) se escriben ahí dentro de la misma transacción que el cambio de estado.
* **\[Claude Code\]** Escribe las plantillas de Auth (confirmación y recuperación) en ambos idiomas en `supabase/templates/`, eligiendo el idioma según los metadatos del usuario. Tú las pegas en cada proyecto.

El plan gratuito permite 100 emails al día entre todos los entornos. Al lanzar, pasa a Resend Pro ($20 al mes).

### Errores con Sentry Developer

- [ ] **\[Persona\]** Entrega el DSN y un token para subir los mapas de código.

* **\[Claude Code\]** Instala `@sentry/nextjs` en servidor y navegador, con `onRequestError` en `instrumentation.ts`. Etiqueta cada error con el entorno de `lib/app-env.ts` y no envíes datos personales (emails, nombres, direcciones): `sendDefaultPii` en `false`, sin Session Replay y un `beforeSend` que los limpia. Queda activo solo en staging y producción, para no gastar los 5,000 errores del mes. Agrega una ruta de prueba que lance un error, disponible solo fuera de producción, y pruébala una vez activando Sentry en local.

### Mapa con Mapbox Free

- [ ] **\[Persona\]** Crea un token público restringido a localhost y staging. El de producción se crea en el Paso 9.

* **\[Claude Code\]** Crea un componente de mapa centrado en Miami que muestre un área aproximada, nunca un punto exacto.

**Hecho cuando**: el login con Google funciona en localhost y crea la cuenta y el cliente de Stripe en dev; el email de confirmación llega por Resend en el idioma del usuario; un envío local a una dirección fuera de la lista se bloquea y queda registrado; el error de prueba aparece en Sentry con la etiqueta local; y el mapa carga en localhost.

## Paso 9 · Preparación del lanzamiento: Vercel Pro y producción \[Claude Code + Persona\]

Este paso pone staging y producción en internet y sube el costo a $45 al mes. Hazlo cuando necesites una URL pública (webhooks reales, pruebas en el teléfono sin túnel, mostrarle staging a alguien) o 4 a 6 semanas antes de abrir. Desde aquí, cada merge a main migra y despliega staging y cada etiqueta `v*` migra y despliega producción, siempre migración primero.

### Cuentas y configuración \[Persona\]

- [ ] **Vercel Pro** con un usuario y Vercel CLI autenticado con `vercel login`. Importa el repositorio, crea el entorno personalizado staging y asigna `staging.producette.com` y `producette.com` (registros DNS).
- [ ] **Supabase**: una organización Pro con `producette-prod` en East US, con la misma configuración del Paso 0. En producción, URL del sitio `https://producette.com`, confirmación de email, Resend como SMTP y el proveedor Google con un cliente OAuth propio de producción. En staging, URL del sitio `https://staging.producette.com` y solo esa redirección.
- [ ] **Vault**: `app_url` y `cron_secret` en staging y en producción, como dice el Paso 6.
- [ ] **Stripe**: los tres destinos de webhook de la sandbox staging (Paso 5), la revisión del 1099-K y el modo live con sus propios tres destinos hacia producette.com.
- [ ] **Variables de Vercel**: Claude Code carga las de staging; tú cargas las de producción como sensibles, incluida una clave de Resend y un token de Mapbox solo para producción.
- [ ] **Secretos del repositorio en GitHub**: `PROD_DB_PASSWORD`, `VERCEL_TOKEN` y los ids del equipo y del proyecto de Vercel. Las claves live de Stripe y el resto de secretos de la aplicación viven solo en Vercel.

### Instrucciones para Claude Code

- Crea `vercel.json` con los despliegues automáticos desde Git desactivados (`git.deploymentEnabled: false`).
- Completa `.github/workflows/deploy.yml`:
  - **Push a main**: después de migrar staging, si terminó bien, `vercel deploy --target=staging`. El build se hace en Vercel (sin `--prebuilt`), porque las variables sensibles no se pueden descargar al runner de GitHub.
  - **Push de una etiqueta `v*`**: comprueba que el commit está en main y que ya pasó por staging; enlaza con producción, ejecuta `supabase db push --remote` y despliega con `vercel deploy --prod`.
  - Si la migración falla, no se despliega.
- Agrega la contraseña de staging: fuera de producción, el proxy pide `STAGING_PASSWORD`, guarda una cookie y devuelve a la URL original (enlaces de email, regresos de Stripe y de Google). Quedan abiertas `/api/webhooks/*` y `/api/internal/*`.
- Carga las variables del entorno staging de Vercel con `vercel env add`. No toques Production.
- Completa `docs/despliegue.md` con cómo publicar con una etiqueta y cómo revertir con `vercel rollback`.

Con la web de staging desplegada, una pausa del proyecto Free deja staging caído hasta restaurarlo. Si pasa seguido, mueve producette-staging a la organización Pro (+$10 al mes).

**Hecho cuando**: un merge a main migra y despliega `staging.producette.com` con la franja STAGING y la contraseña; `job_runs` de staging muestra una ejecución por minuto; los webhooks de la sandbox staging llegan y se guardan una sola vez; el error de prueba aparece en Sentry con la etiqueta staging; y la etiqueta `v0.1.0` crea las tablas en producción, publica la web en producette.com y deja a Patricia entrar a `/admin`.

## CLAUDE.md, permisos y plantilla

Estos tres archivos van en el repositorio desde el Paso 1. Claude Code lee CLAUDE.md al inicio de cada sesión; los permisos los aplica Claude Code aunque el modelo intente otra cosa. Se actualizan cada vez que cambia una decisión.

### CLAUDE.md

La línea `@AGENTS.md` carga la guía de Next.js 16 para agentes si el proyecto tiene ese archivo; si no existe, se borra.

```markdown
# Producette · Instrucciones para Claude Code

@AGENTS.md

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
```

### .claude/settings.json

Las reglas comparan el texto del comando: son una baranda contra errores, no seguridad. La protección real es que las credenciales de staging y producción no estén en tu máquina. Reemplaza los identificadores de proyecto y confirma la sintaxis en [code.claude.com/docs/en/permissions](https://code.claude.com/docs/en/permissions).

```json
{
  "permissions": {
    "deny": [
      "Bash(gh pr merge *)",
      "Bash(git push * main*)",
      "Bash(git push *--no-verify*)",
      "Bash(git tag *)",
      "Bash(git push *--tags*)",
      "Bash(vercel * --prod*)",
      "Bash(vercel env pull *production*)",
      "Bash(supabase link --project-ref <ref-staging>*)",
      "Bash(supabase link --project-ref <ref-prod>*)",
      "Bash(npx drizzle-kit push*)",
      "Bash(npx drizzle-kit generate*)",
      "Bash(npx drizzle-kit migrate*)",
      "Bash(stripe * --live*)"
    ],
    "ask": [
      "Bash(supabase db push*)",
      "Bash(supabase db reset*)",
      "Bash(npm run db:reset:dev*)",
      "Edit(.github/workflows/**)"
    ]
  }
}
```

### .github/pull\_request\_template.md

```markdown
## Qué cambia

## Migraciones
- [ ] Sin migraciones
- [ ] SQL completo de cada migración y salida de `supabase db push --remote --dry-run` contra dev:

## Cómo probarlo

## Hecho cuando
Resultado de cada criterio del paso o la tarea.

## Riesgos y decisiones abiertas

## Checklist
- [ ] lint, typecheck, test y build pasan
- [ ] test:rls corrido en local (si hay migraciones o políticas)
- [ ] test:e2e corrido en local (si toca interfaz)
- [ ] No toca .github/workflows/, o lo explica arriba
- [ ] Textos nuevos en messages/es.json y messages/en.json
```

## Checklist final

Cada fase termina cuando tú, no Claude Code, compruebas sus puntos a mano. El desarrollo de negocio empieza al cerrar la primera lista.

### Al cerrar la construcción (Pasos 0 a 8)

- [ ] Localhost usa producette-dev y la sandbox dev de Stripe. Verificado registrando un usuario de prueba.
- [ ] Tu máquina no tiene credenciales de staging ni de producción: ni en `.env.local`, ni en el enlace del CLI de Supabase, ni en el CLI de Stripe.
- [ ] Con una clave live de Stripe o con la URL de staging en `.env.local`, la aplicación no arranca.
- [ ] Registro con email y con Google funcionan en localhost y crean la cuenta, el perfil Cliente y el cliente de Stripe.
- [ ] Los webhooks reenviados por Stripe CLI se guardan una sola vez.
- [ ] `npm run sweep:watch` registra ejecuciones en `job_runs` de dev.
- [ ] Un email a una dirección fuera de la lista permitida no se envía.
- [ ] El hook rechaza un push a main, y Claude Code no puede hacer merge, crear etiquetas ni desplegar.
- [ ] Un merge a main aplica sus migraciones a staging, y un push directo que salta el hook no migra nada.
- [ ] Los tests de RLS pasan, y `audit_log` no admite cambios.
- [ ] Claude Code carga `producette-base` al empezar una tarea y las skills `producette-*` aparecen en `/skills`.

### Al cerrar la preparación del lanzamiento (Paso 9)

- [ ] Staging usa producette-staging y la sandbox staging; producción usa producette-prod y el modo live.
- [ ] `staging.producette.com` pide la contraseña, vuelve a la URL original, muestra la franja STAGING y no es indexable.
- [ ] `job_runs` registra una ejecución por minuto en staging y en producción.
- [ ] Las migraciones de producción llegaron solo por la Action de la etiqueta, y el panel de Supabase coincide con `supabase/migrations`.
- [ ] La web carga en producette.com, sin franja ni contraseña, en /es y /en, con `sitemap.xml` y etiquetas `hreflang`.
- [ ] Patricia entra a `/admin` como Admin, y un usuario sin rol recibe 403.
- [ ] Los backups diarios de producette-prod están activos.
- [ ] `vercel rollback` está documentado y probado una vez en staging.

## Cuándo cambiar el esquema

Este esquema sirve mientras trabajes solo. Hay cinco momentos para revisarlo:

- **Si staging se pausa seguido** después del Paso 9: moverlo a la organización Pro de Supabase (+$10 al mes).
- **Al lanzar**: Resend Pro ($20 al mes) cuando se pasen 100 emails al día, y considerar la recuperación a un punto en el tiempo (PITR) de Supabase para producción, porque guarda dinero de terceros.
- **Cuando entre otra persona**: GitHub Pro o Team para tener ramas protegidas y secretos por entorno; Sentry Team si necesita ver los errores; un usuario más de Vercel.
- **Cuando varias personas desarrollen en paralelo**: evaluar Supabase Branching, que crea una base por cada pull request y reemplaza a producette-dev.
- **Al empezar Fase 2**: las suscripciones entran como manejadores nuevos en el repartidor de webhooks y como una variación de las tasas que lee `lib/domain/fees.ts`.

Con la primera lista del checklist completa, el desarrollo de negocio arranca en tramos verticales que siguen el recorrido de una reserva, empezando por el onboarding con aceptación de Términos. El Paso 9 puede hacerse en paralelo, cuando haga falta.

## Decisiones tomadas

- **Fundador que trae a su propio cliente**: aplica la tasa menor, 3%.
- **Textos en inglés de la interfaz**: Claude Code los escribe completos; los errores se corrigen a mano.
- **Nombre y dominio**: Producette, en producette.com, ya comprado.
- **Redondeo**: al centavo, la mitad hacia arriba.
- **Búsqueda**: una sola página, Explorar, con filtros por tipo, precio, capacidad, zona y fecha, y mapa. Las páginas por categoría (`/miami/rooftops`) son esa misma página con un filtro aplicado y un texto propio para Google.
- **Orden de resultados**: no hay "Recomendados". El ranking nocturno es el orden por defecto y el desempate cuando se ordena por precio o por calificación; la calificación usa el promedio ajustado.
- **Calendario**: por horas y por publicación, con un calendario unificado en el panel del Host. Cada publicación atiende una reserva a la vez: una hora con contrato o bloqueada no está disponible.
- **Panel del Host**: Mensajes con el botón "Enviar cotización" siempre visible, y "Mis publicaciones" con pestañas Locaciones y Servicios.
- **Una sola web responsive**: no hay app ni versión móvil aparte. Cada pantalla se adapta a teléfono, tablet y escritorio.
- **Menú de cuenta según el modo activo**: en Modo Cliente lleva a cuenta, reservas, cotizaciones, mensajes, pagos y perfil; en Modo Host, al panel, solicitudes, mensajes, reservas, publicaciones, calendario, Wallet y perfil. Los enlaces públicos solo aparecen en el menú cuando la barra no tiene espacio.
- **Perfil público del Host**: lo abre el cliente desde cada publicación. Muestra identidad verificada, calificación, reservas completadas, la marca de cancelaciones de los últimos 6 meses, sus publicaciones aprobadas y las reviews con su única respuesta pública. El Host lo edita desde "Mi perfil" en Modo Host.
- **Configuración de Supabase**: las tablas nuevas no se exponen solas a la API y RLS se activa automáticamente, al revés de lo que trae Supabase por defecto. Un permiso olvidado deja la tabla cerrada, no abierta; cada migración da sus permisos de forma explícita.
- **Skills del proyecto** (23 de noviembre): doce skills `producette-*` en `.claude/skills/` con las prácticas vigentes de cada tecnología; mandan sobre las skills oficiales cuando choquen.
- **Herramientas actualizadas** (23 de noviembre): Supabase CLI v3 con `--remote`; Drizzle con el driver pg; Stripe Connect con Accounts v2 y tres rutas de webhooks; bucket `photo-uploads`; tabla `email_outbox`; Next.js 16 con `proxy.ts`.
