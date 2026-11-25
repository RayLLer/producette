-- Buckets de Fase 1. Sin políticas sobre storage.objects: todo se niega por defecto.
-- Las subidas y lecturas privadas usan URLs firmadas que crea el servidor tras autorizar.
-- listing-photos es público y solo recibe fotos ya procesadas por sharp (sin EXIF).
-- photo-uploads guarda originales antes de sharp; se borran al procesarlos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-photos', 'listing-photos', true,  10485760, array['image/webp', 'image/jpeg']),
  ('photo-uploads',  'photo-uploads',  false, 26214400, array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']),
  ('contracts',      'contracts',      false, 10485760, array['application/pdf']),
  ('evidence',       'evidence',       false, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4']),
  ('coi',            'coi',            false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('chat-files',     'chat-files',     false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
