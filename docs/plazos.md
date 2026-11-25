# Plazos y tareas programadas

Este documento explica cómo Producette calcula los plazos de Fase 1, cómo se configuran los días hábiles y cómo se ejecutan los procesos que hacen vencer cada plazo.

- Código de los plazos: `lib/domain/deadlines.ts`
- Calendario de días hábiles: `lib/domain/business-calendar.ts`
- Procesos programados: `lib/server/jobs/`
- Endpoints: `app/api/internal/sweep` (cada minuto) y `app/api/internal/nightly` (cada noche)

## 1. Regla general

Cada plazo se calcula **una sola vez**, cuando la fila entra en el estado que lo abre (por ejemplo, cuando el Host marca "Trabajo completado"), y se guarda como fecha en esa fila. Los procesos programados solo comparan esa fecha con la hora actual; nunca la recalculan.

Consecuencia práctica: si cambia un plazo o el calendario de feriados, el cambio solo afecta a los plazos que se abran después del despliegue. Los que ya estaban abiertos conservan su fecha.

## 2. Plazos del alcance

| Plazo | Duración | ¿Se escala con `DEADLINE_SCALE`? |
| --- | --- | --- |
| Solicitud sin respuesta del Host | 24 h | Sí |
| Validez de una cotización enviada | 7 días, y nunca después de 24 h antes del inicio de la reserva | Los 7 días sí; el corte de 24 h antes del inicio no |
| Contraoferta sin respuesta | 24 h | Sí |
| Contrato sin firmar o sin pagar | 24 h | Sí |
| Ventana de liberación desde "Trabajo completado" | 48 h | Sí |
| Respuesta a "No se presentó" | 48 h | Sí |
| Ventana de reviews | 7 días | Sí |
| Decisión de una disputa | 5 días hábiles (sección 3) | No |

Tampoco se escalan las reglas que dependen de la fecha del evento: la tabla de cancelaciones y la antelación de 10 días a 3 meses de la Reserva Inmediata.

### `DEADLINE_SCALE`

Multiplica los plazos medidos en horas, para probar en dev o en staging sin esperar días. Por ejemplo, con `DEADLINE_SCALE=0.0035` una ventana de 48 h dura unos 10 minutos.

- Si no está definida, vale 1.
- Debe ser un número positivo.
- **En producción solo puede valer 1.** Con cualquier otro valor la aplicación no arranca (`lib/env.ts`, probado en `lib/env.test.ts`).

## 3. Días hábiles (disputas)

Decisión del 25 de noviembre de 2026:

- **Día hábil**: de lunes a viernes, en hora de Miami (America/New_York), que no sea feriado de la configuración.
- **Configuración por defecto**: los 11 feriados federales de EE. UU. en su fecha observada. Si un feriado cae sábado, se observa el viernes anterior; si cae domingo, el lunes siguiente.
- **Cómo se cuenta**: el día en que se abre la disputa no cuenta. Se cuentan 5 días hábiles a partir del día siguiente.
- **Cuándo vence**: al final del 5.º día hábil, a las 11:59:59 pm, hora de Miami.

Ejemplos:

| Disputa abierta | Vence |
| --- | --- |
| Martes 1 de diciembre de 2026, 3:00 pm | Martes 8 de diciembre, 11:59 pm |
| Sábado 5 de diciembre de 2026 | Viernes 11 de diciembre, 11:59 pm (empieza a contar el lunes) |
| Lunes 23 de noviembre de 2026 (Thanksgiving el jueves 26) | Martes 1 de diciembre, 11:59 pm |

### Feriados federales incluidos por defecto

New Year's Day (1 de enero), Martin Luther King Jr. Day (3.er lunes de enero), Washington's Birthday (3.er lunes de febrero), Memorial Day (último lunes de mayo), Juneteenth (19 de junio), Independence Day (4 de julio), Labor Day (1.er lunes de septiembre), Columbus Day (2.º lunes de octubre), Veterans Day (11 de noviembre), Thanksgiving (4.º jueves de noviembre) y Christmas Day (25 de diciembre).

Se calculan solos para cualquier año: no hace falta cargarlos cada enero.

### Cómo cambiar los feriados

Se editan en un solo lugar, `BUSINESS_CALENDAR_CONFIG` en `lib/domain/business-calendar.ts`, y el cambio entra con un pull request:

```ts
export const BUSINESS_CALENDAR_CONFIG: BusinessCalendarConfig = {
  includeUsFederalHolidays: true, // false = solo se excluyen sábados y domingos
  extraHolidays: [
    // días que Producette tampoco cuenta como hábiles
    { date: '2026-12-24', name: 'Nochebuena' },
  ],
  excludedHolidays: [
    // feriados federales en los que Producette sí trabaja
    '2026-10-12',
  ],
};
```

- Las fechas van como `'AAAA-MM-DD'`. Una fecha mal escrita produce un error en cuanto se carga el calendario, y `npm test` falla, así que no llega a desplegarse sin que se note.
- Los tests de `lib/domain/business-calendar.test.ts` y `lib/domain/deadlines.test.ts` muestran el comportamiento esperado. Si se cambia la configuración por defecto, hay que actualizarlos.
- Si más adelante los feriados deben editarse desde el panel de administración, la función de plazos ya recibe el calendario como parámetro: solo cambia de dónde se lee la configuración.

## 4. Procesos programados

### Cómo se ejecutan

| Entorno | Quién llama a los endpoints |
| --- | --- |
| Dev (tu equipo) | Tú, con `npm run sweep` (una vez) o `npm run sweep:watch` (cada minuto). pg_cron no puede llamar a `localhost`. |
| Staging y producción (Paso 9) | pg_cron, con `private.call_internal()`, que lee `app_url` y `cron_secret` de Supabase Vault y hace un `net.http_post`. |

Tareas de pg_cron (migración `internal_cron`):

| Tarea | Horario | Qué hace |
| --- | --- | --- |
| `producette-sweep` | Cada minuto | `POST /api/internal/sweep` |
| `producette-nightly` | 08:00 UTC (3:00 am en Miami, 4:00 am en horario de verano) | `POST /api/internal/nightly` |
| `producette-cron-history-cleanup` | Domingos 08:30 UTC | Borra el historial de pg_cron de más de 7 días |

En dev las tareas también corren, pero **no hacen nada**: Vault no tiene `app_url`.

### Seguridad de los endpoints

Los endpoints exigen `Authorization: Bearer <CRON_SECRET>` y responden 401 sin él. El proxy no les pide la contraseña de staging.

`CRON_SECRET` solo sirve para estos endpoints. pg_net guarda un momento la petición pendiente, con la cabecera incluida, en una tabla de la base; si alguien más obtiene acceso a la base, se rota el secreto en Vercel y en Vault.

### Cómo se escribe un proceso

Cada proceso es un `Job` (`lib/server/jobs/types.ts`) registrado en `SWEEP_JOBS` o `NIGHTLY_JOBS` (`lib/server/jobs/index.ts`). Todos siguen el mismo patrón, que permite ejecutarlos dos veces, o dos a la vez, sin doble efecto:

1. Buscar filas cuyo plazo guardado ya pasó **y** que siguen en el estado esperado.
2. Bloquearlas con `FOR UPDATE SKIP LOCKED`, en lotes de como máximo 100, dentro de una transacción.
3. Repetir la condición de estado en el `UPDATE`.
4. Lo que no entra en el lote queda para el minuto siguiente.

El primer proceso, `close-abandoned-job-runs`, cierra las ejecuciones que quedaron "en curso" más de 15 minutos. `tests/rls/jobs.rls.test.ts` demuestra contra dev que dos ejecuciones simultáneas no procesan la misma fila.

### Registro: `job_runs`

Cada ejecución de cada proceso deja una fila en `job_runs`, con el proceso, el inicio, el fin, las filas procesadas y, si falló, un código corto sin datos personales. Es el registro fiable, porque pg_net no espera la respuesta del endpoint.

Para revisar en dev:

```sql
select job, started_at, finished_at, processed, error
from public.job_runs order by id desc limit 20;

select j.jobname, d.status, d.start_time
from cron.job_run_details d join cron.job j using (jobid)
order by d.start_time desc limit 20;
```

### Secretos de Vault (Paso 9, los carga la persona)

En el SQL Editor de **staging** y de **producción**, nunca con una migración:

```sql
select vault.create_secret('https://staging.producette.com', 'app_url');
select vault.create_secret('<el mismo valor que CRON_SECRET en Vercel>', 'cron_secret');
```

En **dev** no se carga nada.
