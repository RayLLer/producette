# Skills de Producette para Claude Code

Doce skills con las buenas prácticas actuales de cada tecnología del plan de implementación v2, ya adaptadas a las reglas de Producette. Investigadas en noviembre de 2026.

| Skill | Cubre |
| --- | --- |
| `producette-base` | Reglas transversales, fuentes de verdad, qué skill cargar y cambios técnicos respecto del plan |
| `producette-nextjs` | Next.js 16: estructura, proxy, Data Access Layer, Server Actions, Zod 4, Cache Components, variables |
| `producette-supabase` | Auth SSR, RLS y grants, CLI v3, Storage, Realtime, pg_cron + Vault (con 5 referencias) |
| `producette-drizzle` | Conexión al pooler, transacciones, `skip locked`, `drizzle-kit pull` |
| `producette-stripe` | Comisiones, Connect con Accounts v2, cobros y transferencias, webhooks, Identity (con 4 referencias) |
| `producette-i18n-seo` | next-intl v4, formato, hreflang, sitemap y robots |
| `producette-ui` | Tailwind v4, shadcn/ui, marca Chispa, responsive 600/900, accesibilidad, Mapbox |
| `producette-testing` | Vitest, tests de RLS, concurrencia, Playwright |
| `producette-email` | Resend, React Email, idempotencia, lista permitida, plantillas de Auth |
| `producette-sentry` | @sentry/nextjs sin datos personales |
| `producette-deploy` | GitHub Actions, Vercel, entornos, contraseña de staging |
| `producette-archivos` | sharp sin EXIF, subidas firmadas, contratos PDF con hash |

## Instalación en el repositorio (recomendada)

1. Descomprime `producette-skills.zip` en la raíz del repositorio. Queda `.claude/skills/<skill>/SKILL.md`.
2. Haz commit de `.claude/skills/` junto con el resto del Paso 1 (o en un PR propio si el repositorio ya existe).
3. Agrega a `CLAUDE.md`, debajo de "Forma de trabajar":

   ```markdown
   ## Skills del proyecto
   - Al empezar una tarea, carga `producette-base`; ella indica qué otra skill usar.
   - Las skills en .claude/skills/ mandan sobre las skills oficiales cuando choquen.
   ```

4. Agrega a la lista `deny` de `.claude/settings.json`:

   ```json
   "Bash(npx drizzle-kit push*)",
   "Bash(npx drizzle-kit generate*)",
   "Bash(npx drizzle-kit migrate*)",
   "Bash(stripe * --live*)"
   ```

   y a `ask`: `"Bash(supabase db reset*)"` si todavía no está.

Claude Code descubre las skills de `.claude/skills/` al iniciar la sesión. Comprueba con `/skills` que aparecen las doce.

## Instalación en claude.ai (opcional)

Cada skill tiene su propio zip (`producette-<nombre>.zip`) para subirla en la sección de Skills de la configuración de claude.ai, si quieres usarlas también en chats de claude.ai.

## Skills oficiales que conviene instalar junto a estas

Estas cubren la referencia general de cada herramienta; las de Producette ganan cuando hay conflicto.

```bash
npx skills add supabase/agent-skills          # supabase y supabase-postgres-best-practices
npx skills add vercel-labs/agent-skills       # React/Next.js best practices, deploy, composición, guías de diseño web
npx skills add vercel-labs/next-skills        # next-best-practices y next-cache-components
npx skills add https://docs.stripe.com        # skills de Stripe (o: stripe agent setup con el Stripe CLI)
```

En Claude Code también se pueden instalar como plugins (`/plugin marketplace add supabase/agent-skills`, `claude plugin install stripe@claude-plugins-official`). Revisa qué instala cada comando antes de aceptar.

## Cambios que estas skills proponen respecto del plan v2

Las skills ya los aplican y le piden a Claude Code que los mencione en el PR mientras el plan no los recoja:

1. **Supabase CLI v3**: `--remote` en lugar de `--linked`; `supabase db push --remote --dry-run`; `supabase gen types typescript --remote`; `SUPABASE_YES=1` y `--password` en Actions.
2. **Drizzle**: driver `pg` (node-postgres) con el pooler en modo transacción y `attachDatabasePool`, en lugar de postgres.js, porque ese modo no admite pipelining.
3. **Stripe Connect**: cuentas con Accounts v2 (configuración `recipient`, panel Express), comprobación de `stripe_transfers` antes de transferir, y una tercera ruta de webhooks para eventos thin (`STRIPE_V2_WEBHOOK_SECRET`).
4. **Webhooks**: un evento registrado pero fallido se vuelve a procesar en el reintento; solo se ignora si ya estaba procesado.
5. **Storage**: bucket privado `photo-uploads` para los originales antes de sharp.
6. **Emails críticos**: tabla `email_outbox` procesada por `sweep`.
7. **Variable nueva** `NEXT_PUBLIC_APP_ENV` para Sentry y la franja de entorno en el navegador.

## Mantenimiento

- Cada skill marca con "confirma" o "confirmar" los nombres de API que conviene revisar contra la versión instalada.
- Cuando cambie una decisión del plan, actualiza `producette-base` y la skill afectada en el mismo PR que el plan.
