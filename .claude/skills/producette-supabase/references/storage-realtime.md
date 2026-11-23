# Storage y Realtime

## Buckets de Fase 1

| Bucket | Público | Contenido | Quién sube | Cómo se lee |
| --- | --- | --- | --- | --- |
| `listing-photos` | Sí | Fotos ya procesadas por sharp (sin EXIF) | Solo el servidor | URL pública |
| `photo-uploads` (propuesto) | No | Originales recién subidos, antes de sharp | El navegador, con URL firmada de subida | Solo el servidor; se borran al procesar |
| `contracts` | No | PDF de contratos | Solo el servidor | URL firmada de corta duración |
| `evidence` | No | Evidencia de disputas y "No se presentó" | El navegador, con URL firmada de subida | URL firmada tras verificar participación |
| `coi` | No | Certificados de seguro | El navegador, con URL firmada de subida | URL firmada para el dueño y el panel |
| `chat-files` | No | Adjuntos del chat | El navegador, con URL firmada de subida | URL firmada para participantes |

`photo-uploads` no está en el plan v2: hace falta porque las fotos de un teléfono superan el límite de cuerpo de una Server Action y de una función de Vercel (4.5 MB), y el plan exige que sharp quite el EXIF en el servidor antes de que la foto sea pública. Propónlo en el PR antes de crearlo.

Crea los buckets en una migración, con límites:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-photos', 'listing-photos', true,  10485760, array['image/webp','image/jpeg']),
  ('photo-uploads',  'photo-uploads',  false, 26214400, array['image/jpeg','image/png','image/heic','image/heif','image/webp']),
  ('contracts',      'contracts',      false, 10485760, array['application/pdf']),
  ('evidence',       'evidence',       false, 26214400, array['image/jpeg','image/png','image/webp','application/pdf','video/mp4']),
  ('coi',            'coi',            false, 10485760, array['application/pdf','image/jpeg','image/png']),
  ('chat-files',     'chat-files',     false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;
```

El plan Free de Supabase limita cada archivo a 50 MB y no incluye transformaciones de imagen: los tamaños los genera sharp.

## Políticas: denegar por defecto

Storage no permite nada sin políticas sobre `storage.objects`. Producette no crea políticas de escritura para el navegador: todas las subidas usan **URLs firmadas que crea el servidor** después de autorizar, y todas las lecturas privadas usan **URLs firmadas** de corta duración.

La única política de lectura directa, si hiciera falta, es la del bucket público (que ya se sirve sin política por ser `public = true`).

## Subida con URL firmada

```ts
// Servidor (Server Action): autoriza y decide la ruta. El navegador nunca elige la ruta.
'use server';
export async function createEvidenceUpload(input: unknown) {
  const viewer = await requireUser();
  const { bookingId, contentType } = EvidenceUploadInput.parse(input);
  await assertBookingParticipant(viewer.id, bookingId);

  const path = `${bookingId}/${crypto.randomUUID()}`;
  const admin = createAdminClient(); // crea la URL; RLS no aplica al cliente secreto
  const { data, error } = await admin.storage.from('evidence').createSignedUploadUrl(path);
  if (error) throw new Error('upload_url_failed');

  await recordPendingUpload({ bucket: 'evidence', path, bookingId, uploadedBy: viewer.id, contentType });
  return { path: data.path, token: data.token };
}
```

```ts
// Navegador
const { path, token } = await createEvidenceUpload({ bookingId, contentType: file.type });
const { error } = await supabase.storage.from('evidence').uploadToSignedUrl(path, token, file, {
  contentType: file.type,
});
```

- La URL firmada de subida caduca (unas 2 horas); no la guardes.
- Registra la subida pendiente en una tabla y confírmala con otra acción del servidor que compruebe que el objeto existe. Un proceso de `sweep` limpia las pendientes viejas.
- No confíes en `file.type`: el servidor verifica el tipo real al procesar (sharp lo detecta en imágenes; para PDF, comprueba que empieza con `%PDF-`).

## Lectura con URL firmada

```ts
export async function getContractUrl(contractId: string) {
  const viewer = await requireUser();
  const contract = await getContractForViewer(viewer.id, contractId); // lanza si no es parte
  const { data, error } = await createAdminClient()
    .storage.from('contracts')
    .createSignedUrl(contract.storagePath, 60); // segundos
  if (error) throw new Error('signed_url_failed');
  return data.signedUrl;
}
```

Duraciones cortas (60 a 300 s) y creadas en el momento del clic, no al renderizar una lista.

## Realtime: chat de solo lectura

El plan dice: los mensajes se insertan solo por una acción del servidor que aplica el filtro de contacto; Realtime solo se usa para leer. La recomendación actual de Supabase es **broadcast desde la base con canales privados** en lugar de `postgres_changes`, que escala peor.

### 1. Trigger que emite el mensaje ya guardado

```sql
create function private.broadcast_message_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.broadcast_changes(
    'conversation:' || new.conversation_id::text,  -- topic
    tg_op,                                         -- event: 'INSERT'
    tg_op,                                         -- operation
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end $$;

create trigger messages_broadcast
  after insert on public.messages
  for each row execute function private.broadcast_message_insert();
```

El mensaje completo viaja en el evento: la tabla `messages` no puede tener columnas que el otro participante no deba ver.

### 2. Autorización del canal (RLS sobre `realtime.messages`)

```sql
create policy "chat: participantes reciben su conversación"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and split_part((select realtime.topic()), ':', 1) = 'conversation'
    and private.is_conversation_participant(
      nullif(split_part((select realtime.topic()), ':', 2), '')::uuid
    )
  );
-- Sin política de insert: el navegador no puede emitir en el canal.
```

Si un topic mal formado pudiera romper el cast a `uuid`, valida el formato antes (por ejemplo, con una función que devuelva `false` ante un texto no válido).

### 3. Cliente

```ts
'use client';
useEffect(() => {
  const supabase = createClient();
  let channel: ReturnType<typeof supabase.channel> | null = null;
  (async () => {
    await supabase.realtime.setAuth(); // usa el token de la sesión para la autorización
    channel = supabase
      .channel(`conversation:${conversationId}`, { config: { private: true } })
      .on('broadcast', { event: 'INSERT' }, ({ payload }) => onMessage(payload.record))
      .subscribe();
  })();
  return () => {
    if (channel) supabase.removeChannel(channel);
  };
}, [conversationId]);
```

- `broadcast_changes` manda la fila en `payload.record` (y la anterior en `payload.old_record`); confirma la forma una vez en dev antes de tiparla.
- El emisor y el canal tienen que coincidir en privado/público: `broadcast_changes` emite en privado, así que el canal lleva `private: true`.
- **[Persona]** En el panel de Realtime de cada proyecto, desactivar el acceso a canales públicos para que solo funcionen los privados.
- Al reconectar, recarga los últimos mensajes desde el servidor: Realtime no garantiza entrega de lo que pasó mientras el cliente estuvo desconectado.
- Nombres de topic: `ámbito:id` (`conversation:…`, `booking:…`).
