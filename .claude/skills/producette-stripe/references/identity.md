# Stripe Identity

Verificación de identidad con documento para quien el alcance lo exija. Producette **no guarda imágenes de documentos**: solo el estado y el id de la sesión.

## Crear la sesión (servidor)

```ts
'use server';
export async function startIdentityVerification() {
  const viewer = await requireUser();
  const session = await stripe.identity.verificationSessions.create(
    {
      type: 'document',
      provided_details: { email: viewer.email },
      metadata: { user_id: viewer.id },
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/es/cuenta/verificacion`, // ajusta idioma y ruta
    },
    { idempotencyKey: `identity-${viewer.id}-${attemptId}` },
  );
  await saveVerificationSession(viewer.id, session.id, 'pending');
  return { url: session.url, clientSecret: session.client_secret };
}
```

- Hay dos formas de mostrarla: redirigir a `session.url` (página de Stripe) o abrir el modal con `stripe.verifyIdentity(clientSecret)` de `@stripe/stripe-js`. Elige una y úsala en todas partes.
- Un nuevo intento crea una sesión nueva si la anterior terminó en `canceled`; si quedó en `requires_input`, se puede reutilizar mientras siga abierta.
- Cuesta $1.50 por verificación (50 gratis): no crees sesiones al cargar una página, solo al pulsar el botón.

## Eventos (ruta de la plataforma)

| Evento | Qué hace |
| --- | --- |
| `identity.verification_session.verified` | Marca al usuario como verificado (fecha y id de sesión). Muestra la insignia "Verificado" en verde protección (`#0A8F7F`) |
| `identity.verification_session.requires_input` | Guarda el motivo (`last_error.code`) para mostrar un texto traducido y permitir reintentar |
| `identity.verification_session.redacted` | Solo llega si te suscribes explícitamente; úsalo si el alcance pide borrar los datos de Stripe al anonimizar una cuenta |

- Encuentra al usuario por `metadata.user_id` y comprueba que la sesión guardada coincide con `data.object.id`.
- No copies a la base nombre, fecha de nacimiento ni número de documento verificados, salvo que el alcance lo pida; si lo pide, guárdalos con la misma protección que la dirección exacta.
- El panel muestra el estado y un enlace a la sesión en el dashboard de Stripe, no los datos.
