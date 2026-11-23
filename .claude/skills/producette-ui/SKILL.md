---
name: producette-ui
description: Interfaz de Producette - Tailwind CSS v4 (configuración en CSS con @theme inline), shadcn/ui, paleta y tipografía Geist del manual Chispa, una sola web responsive con cortes en 600 y 900 px, menú según el modo activo (Cliente/Host), accesibilidad WCAG 2.2 AA, estados de carga y error, y el mapa de Mapbox con área aproximada. Úsala al crear o cambiar cualquier componente, pantalla, estilo, formulario o el mapa, y siempre que traslades algo de docs/prototipo-fase-1.html al código.
---

# Interfaz de Producette

## Fuentes

- `docs/prototipo-fase-1.html`: estructura y comportamiento de cada pantalla. Es la referencia; si algo del prototipo choca con el alcance, manda el alcance y lo señalas.
- `docs/manual-marca.html`: colores, tipografía y proporciones.

## Marca (manual Chispa)

| Token | HEX | Uso |
| --- | --- | --- |
| Negro set | `#0D0F14` | Marca, textos, navegación, botones secundarios |
| Coral | `#FF7E66` | Un solo botón principal por pantalla; **texto encima siempre negro** |
| Coral oscuro | `#B9432C` | Texto coral pequeño sobre blanco |
| Humo | `#F4F4F5` | Fondo de página; tarjetas en blanco encima |
| Grafito | `#2A2D34` | Superficie oscura |
| Gris | `#5E626B` | Texto secundario |
| Línea | `#E3E4E8` | Bordes |
| Verde protección | `#0A8F7F` | Solo Pago Protegido, Verificado y seguros |
| Ámbar | `#FFB020` | Solo estrellas e insignia Fundador |

- Proporción aproximada: humo y blanco 55%, negro 30%, grafito y gris 10%, coral 5%. Si una pantalla se ve "muy naranja", sobra coral.
- Nunca texto blanco sobre coral (2.5:1, no pasa AA).
- Tipografía única: **Geist** (400, 500, 600, 700) con `next/font`.
- La animación del logo respeta `prefers-reduced-motion`.

## Tailwind v4 + shadcn/ui

Tailwind v4 se configura en CSS; no hay `tailwind.config.js`. En `components.json`, `"tailwind": { "config": "" }`.

```css
/* app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

:root {
  --background: #F4F4F5;   /* humo */
  --foreground: #0D0F14;   /* negro set */
  --card: #FFFFFF;
  --card-foreground: #0D0F14;
  --primary: #FF7E66;      /* coral: acción principal */
  --primary-foreground: #0D0F14;
  --secondary: #0D0F14;
  --secondary-foreground: #FFFFFF;
  --muted-foreground: #5E626B;
  --border: #E3E4E8;
  --input: #E3E4E8;
  --ring: #0D0F14;
  --protect: #0A8F7F;
  --rating: #FFB020;
  --coral-text: #B9432C;
  --radius: 0.75rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-protect: var(--protect);
  --color-rating: var(--rating);
  --color-coral-text: var(--coral-text);
  --font-sans: var(--font-geist-sans);
  --radius-lg: var(--radius);

  --breakpoint-tablet: 600px;
  --breakpoint-desktop: 900px;
}
```

- Toma como base el `globals.css` que genera `npx shadcn@latest init` y reemplaza solo los valores; no borres variables que usan los componentes (`--popover`, `--accent`, `--destructive`, etc.).
- `@theme` no va dentro de selectores. Los valores por tema viven en `:root` y `@theme inline` los mapea.
- Los componentes de shadcn se copian al repo (`components/ui`): se pueden editar, pero cambia la variante en el componente, no con clases sueltas repetidas por la app.
- Combina clases con `cn()` (`clsx` + `tailwind-merge`) y variantes con `cva`.
- Componentes base del Paso 2: botón, campos, diálogo, tabla, menú desplegable, tarjeta, pestañas, insignia y avisos. Del Supabase UI Library, solo el bloque de login social.

## Responsive: una sola web

- Mobile first. Sin prefijo = teléfono; `tablet:` desde 600 px; `desktop:` desde 900 px. Son los cortes del prototipo.
- Los prefijos por defecto de Tailwind (`sm`, `md`, `lg`) siguen existiendo porque los usan los componentes de shadcn; en las pantallas de Producette usa `tablet:` y `desktop:`.
- No hay pantallas separadas para móvil: el mismo componente se adapta.
- Toques de al menos 44 × 44 px. Diálogos a pantalla completa en teléfono si el contenido es largo.
- Tablas largas (panel, pagos): en teléfono se convierten en tarjetas o se desplazan dentro de su contenedor, nunca rompen la página.
- Prueba cada pantalla nueva en 375, 600 y 900 px (Playwright tiene proyectos para teléfono y escritorio; ver `producette-testing`).

## Navegación y modos

- El menú de cuenta depende del modo activo (Cliente o Host), como en el prototipo. Un elemento que solo tiene sentido en un modo no aparece en el otro.
- El perfil público del Host es una ruta pública; "Mis publicaciones", el calendario por horas y los mensajes del Host viven en el modo Host.
- El cambio de modo no cambia la sesión, solo la vista; guarda la preferencia en el servidor (no en `localStorage`, que no está disponible en el servidor).

## Accesibilidad (WCAG 2.2 AA)

- Cada campo con `<Label>`; errores asociados con `aria-describedby`; foco visible con `--ring`.
- Íconos sin texto con `aria-label`; imágenes con `alt` útil (fotos de listings: el título del listing más el número de foto).
- El color nunca es la única señal (estado de reserva: texto + color).
- Los componentes de shadcn ya manejan foco y teclado en diálogos y menús: no los reemplaces con `div` clicables.

## Estados

Toda pantalla con datos tiene: cargando (esqueleto), vacío (texto y acción siguiente), error (mensaje traducido y reintento) y éxito. Los formularios deshabilitan el envío mientras `useFormStatus().pending`.

## Imágenes

- `next/image` con `sizes` correcto; las fotos de listings ya vienen redimensionadas por sharp en tres anchos (ver `producette-archivos`).
- Agrega el host de Supabase Storage a `images.remotePatterns` (`/storage/v1/object/public/listing-photos/**`).
- La optimización de imágenes de Vercel consume cuota del plan; si se acerca al límite, usa un loader que elija el ancho ya generado.

## Mapa (Mapbox)

- Componente cliente cargado con `next/dynamic` y `ssr: false`, solo cuando se muestra (por ejemplo, al abrir "Ver mapa" en Explorar): cada carga del mapa cuenta para las 50,000 gratis del mes.
- `NEXT_PUBLIC_MAPBOX_TOKEN` restringido por URL (lo crea la persona).
- **Nunca** llega al navegador la coordenada exacta. El servidor envía el área aproximada del listing (un polígono GeoJSON calculado con PostGIS, por ejemplo con `ST_AsGeoJSON` sobre el área guardada) y el mapa dibuja ese polígono.
- Centrado inicial en Miami. Limpia la instancia con `map.remove()` al desmontar.
- Importa `mapbox-gl/dist/mapbox-gl.css` solo en ese componente.
