---
name: producette-email
description: Emails de Producette con Resend y React Email - lib/server/email.ts como única vía de envío, lista permitida fuera de producción, claves de idempotencia, manejo de { data, error }, plantillas bilingües con next-intl, cola en base de datos para emails críticos y plantillas de Auth de Supabase en supabase/templates. Úsala siempre que un flujo tenga que avisar a alguien por email (registro, cotización, contrato, pago, liberación, disputa, recordatorios) o cuando cambies una plantilla.
---

# Emails

## Reglas

- **Una sola vía**: todo envío pasa por `lib/server/email.ts`. Nadie importa `resend` en otro archivo.
- **Fuera de producción**, todo destinatario que no esté en `EMAIL_ALLOWLIST` se registra en el log (sin el contenido) y **no se envía**. El plan Free permite 100 emails al día para todos los entornos juntos.
- **Idioma**: el del destinatario (`accounts.preferred_locale`), no el de quien provoca el email.
- **Sin datos sensibles** en el cuerpo: nada de dirección exacta antes del pago, ni montos internos de comisión que el destinatario no deba ver.

## Envío

```ts
// lib/server/email.ts
import 'server-only';
import { Resend } from 'resend';
import { serverEnv } from '@/lib/env';
import { getAppEnv } from '@/lib/app-env';

const resend = new Resend(serverEnv.RESEND_API_KEY);

export async function sendEmail(params: {
  to: string;
  subject: string;
  react: React.ReactElement;
  idempotencyKey: string; // <evento>/<id>, por ejemplo 'quote-sent/9f1c…'
  tags?: { name: string; value: string }[];
}) {
  if (getAppEnv() !== 'production' && !isAllowed(params.to)) {
    console.info('email bloqueado fuera de producción', { key: params.idempotencyKey });
    return { skipped: true as const };
  }

  const { data, error } = await resend.emails.send(
    { from: serverEnv.EMAIL_FROM, to: [params.to], subject: params.subject, react: params.react, tags: params.tags },
    { idempotencyKey: params.idempotencyKey },
  );
  if (error) throw new EmailError(error.name, error.message); // el SDK no lanza: devuelve { data, error }
  return { id: data!.id };
}
```

- El SDK de Node de Resend **no lanza** errores de la API: siempre revisa `error`.
- **Idempotencia**: misma clave + mismo contenido dentro de 24 h → Resend no lo reenvía. Misma clave con otro contenido → error 409. La clave identifica un solo email lógico: `<evento>/<id de la entidad>`.
- Reintenta solo los 429 y 5xx, siempre con la misma clave. Los 4xx de validación no se reintentan.
- Los parámetros del SDK de Node van en camelCase (`replyTo`, `scheduledAt`).
- `react`, `html`, `text` y `template` no se combinan entre sí.

## Emails que no pueden perderse

Contrato listo, pago confirmado, liberación, reembolso y disputa no se envían "en línea" desde la acción. Se escribe una fila en `email_outbox` dentro de la misma transacción que el cambio de estado, y un proceso de `sweep` la envía usando el id de la fila como clave de idempotencia. Así, si Resend falla o la función se corta, el email sale en el minuto siguiente y nunca dos veces.

Los avisos no críticos pueden enviarse con `after()` después de responder.

## Plantillas (React Email)

- En `emails/`, un componente por email, que recibe `locale` y los datos ya formateados.
- Traducciones desde `messages/*.json` con `createTranslator({ locale, messages, namespace: 'Emails.quoteSent' })` de next-intl, que funciona fuera de React.
- Colores del manual (negro set, coral con texto negro, humo), Geist con fuentes de respaldo del sistema, y el logo como imagen alojada en el dominio.
- Vista previa local: `npx react-email dev --dir emails` (confirma el comando con la versión instalada).
- Enlaces absolutos con `NEXT_PUBLIC_SITE_URL` y el prefijo de idioma.

## Plantillas de Auth de Supabase (`supabase/templates/`)

Supabase no usa React Email: usa plantillas Go en su panel. Claude Code escribe el HTML; la persona lo pega en cada proyecto.

```html
{{ if eq .Data.locale "en" }}
  <h1>Confirm your email</h1>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/en">Confirm</a>
{{ else }}
  <h1>Confirma tu email</h1>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/es">Confirmar</a>
{{ end }}
```

- `.Data` son los metadatos del usuario: guarda `locale` en `options.data` al registrarse (`signUp`) y al volver de Google.
- Plantillas mínimas: confirmación y recuperación de contraseña, en ambos idiomas.
- Resend se configura como SMTP de Auth en cada proyecto (tarea de la persona, Paso 8).
