---
name: producette-archivos
description: Archivos en Producette - fotos de listings procesadas con sharp en el servidor (orientación, sin EXIF ni GPS, tres anchos en WebP), subida directa a Storage con URL firmada, contratos PDF generados en el servidor con @react-pdf/renderer, guardados en el bucket privado contracts con hash SHA-256 e inmutables, y validación del tipo real de cada archivo. Úsala al tocar subida de fotos, evidencia, COI, adjuntos del chat, generación o descarga de contratos, o cualquier código que use sharp, @react-pdf/renderer o Storage.
---

# Fotos y contratos

Buckets, políticas y URLs firmadas están en `producette-supabase/references/storage-realtime.md`. Aquí va el procesamiento.

## Fotos de listings

Flujo (sin pasar archivos grandes por una Server Action):

1. El navegador pide una URL firmada de subida al bucket privado `photo-uploads` (la Server Action autoriza y fija la ruta `<listingId>/<uuid>`).
2. Sube el original con `uploadToSignedUrl`.
3. Llama a `processListingPhoto({ listingId, path })`.
4. El servidor descarga el original, lo procesa con sharp, sube las variantes a `listing-photos`, guarda las rutas en la base y borra el original.

```ts
// lib/server/photos.ts
import 'server-only';
import sharp from 'sharp';

const WIDTHS = [400, 800, 1600] as const;

export async function processPhoto(input: Buffer) {
  const base = sharp(input, { failOn: 'error', limitInputPixels: 50_000_000 })
    .rotate(); // aplica la orientación EXIF antes de que se pierda

  const meta = await base.metadata();
  if (!meta.format || !['jpeg', 'png', 'webp', 'heif'].includes(meta.format)) {
    throw new DomainError('unsupported_image');
  }

  return Promise.all(
    WIDTHS.map(async (width) => ({
      width,
      buffer: await base
        .clone()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(), // sharp no copia metadatos (EXIF, GPS, ICC) salvo que se pida con withMetadata/keepMetadata
    })),
  );
}
```

- **Nunca** llames a `withMetadata()` ni `keepMetadata()`.
- Test obligatorio: una foto de prueba con GPS en `tests/fixtures/` y un test que comprueba que `(await sharp(out).metadata()).exif` es `undefined`.
- Ruta pública: `listing-photos/<listingId>/<photoId>-<width>.webp`, subida con el cliente secreto y `contentType: 'image/webp'`, `upsert: false`.
- Formatos HEIC de iPhone: depende de que el sharp instalado tenga soporte; si no lo tiene, devuelve un error traducido que pida JPEG, y avísalo en el PR.
- Límite de tiempo de la función: procesa una foto por llamada, no un lote.
- `sharp` corre solo en Node (Server Actions o route handlers), nunca en el proxy ni en el navegador.

## Otros archivos privados (evidencia, COI, chat)

- Subida directa al bucket final con URL firmada de subida, ruta decidida por el servidor.
- Al confirmar la subida, el servidor verifica el tipo real leyendo los primeros bytes: JPEG `FF D8 FF`, PNG `89 50 4E 47`, PDF `%PDF-`. Si no coincide, borra el objeto.
- Las imágenes de evidencia también pasan por sharp para quitar EXIF antes de que otra persona pueda verlas.
- Descarga solo con `createSignedUrl` de corta duración, después de comprobar que quien pide es parte de la reserva o tiene rol en el panel.

## Contratos PDF

```tsx
// lib/server/contracts/render.tsx
import 'server-only';
import { renderToBuffer, Document, Page, Text, View, Font, StyleSheet } from '@react-pdf/renderer';
import { createHash } from 'node:crypto';
import path from 'node:path';

Font.register({
  family: 'Geist',
  fonts: [
    { src: path.join(process.cwd(), 'lib/server/contracts/fonts/Geist-Regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'lib/server/contracts/fonts/Geist-SemiBold.ttf'), fontWeight: 600 },
  ],
});

export async function renderContract(data: ContractData) {
  const buffer = await renderToBuffer(<ContractDocument data={data} />);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  return { buffer, sha256 };
}
```

- Si Next.js falla al empaquetar `@react-pdf/renderer` (por ejemplo, "require() of ES Module"), agrégalo a `serverExternalPackages` en `next.config.ts`.
- Registra todas las variantes de fuente que uses (si no, el peso cae a la regular). Las fuentes deben incluir á, é, í, ó, ú, ñ, ¿ y ¡.
- Los hijos de `<Text>` son textos ya formateados (montos con next-intl, fechas en `America/New_York`): nada de objetos ni números sueltos.
- El contenido legal sale de plantillas versionadas en el repositorio, en el idioma acordado en la reserva; el PDF guarda la versión de la plantilla.
- `ContractData` se arma en el servidor desde la cotización guardada (montos y tasas congelados), nunca desde datos del navegador.

### Guardado inmutable

```ts
const { buffer, sha256 } = await renderContract(data);
const storagePath = `${contractId}/v${version}.pdf`;
const { error } = await createAdminClient()
  .storage.from('contracts')
  .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });
if (error) throw new Error('contract_upload_failed');
// En la misma transacción de la base: storage_path, sha256, versión de plantilla y fecha.
```

- Un contrato guardado nunca se sobrescribe (`upsert: false`). Un cambio crea una versión nueva y deja la anterior.
- El hash se guarda en la fila del contrato; al descargar o al resolver una disputa se puede recalcular para comprobar que el archivo no cambió.
- Los contratos se conservan 7 años: ninguna limpieza automática borra objetos de `contracts`, y anonimizar una cuenta no borra sus contratos.
