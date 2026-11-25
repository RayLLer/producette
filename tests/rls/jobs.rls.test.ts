import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import './helpers'; // loads .env.local and refuses anything but producette-dev
import { closeAbandonedJobRuns } from '@/lib/server/jobs/close-abandoned-runs';
import { runJobs } from '@/lib/server/jobs';

let owner: Client;
const createdIds: number[] = [];

beforeAll(async () => {
  owner = new Client({ connectionString: process.env.DATABASE_URL });
  await owner.connect();
});

afterAll(async () => {
  if (createdIds.length) {
    await owner.query('delete from public.job_runs where id = any($1)', [createdIds]);
  }
  await owner.end();
});

/** Inserts `n` runs that started an hour ago and never finished. */
async function staleRuns(n: number): Promise<number[]> {
  const { rows } = await owner.query<{ id: string }>(
    `insert into public.job_runs (job, started_at)
     select 'test-stale', now() - interval '1 hour' from generate_series(1, $1)
     returning id`,
    [n],
  );
  const ids = rows.map((r) => Number(r.id));
  createdIds.push(...ids);
  return ids;
}

function only(ids: number[], mine: number[]) {
  return ids.filter((id) => mine.includes(id)).sort((a, b) => a - b);
}

describe('procesos programados: FOR UPDATE SKIP LOCKED', () => {
  it('mientras una ejecución tiene filas bloqueadas, otra simultánea no las procesa', async () => {
    const mine = await staleRuns(5);

    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    let locked!: () => void;
    const hasLocked = new Promise<void>((resolve) => (locked = resolve));

    // A locks the rows and waits; B runs completely in the meantime.
    const first = closeAbandonedJobRuns({
      afterLock: async () => {
        locked();
        await held;
      },
    });
    await hasLocked;
    const second = await closeAbandonedJobRuns();
    release();
    const firstIds = await first;

    expect(only(second, mine)).toEqual([]);
    expect(only(firstIds, mine)).toEqual(mine);
  });

  it('dos ejecuciones a la vez procesan cada fila exactamente una vez', async () => {
    const mine = await staleRuns(8);
    const [a, b] = await Promise.all([closeAbandonedJobRuns(), closeAbandonedJobRuns()]);
    const all = [...only(a, mine), ...only(b, mine)].sort((x, y) => x - y);
    expect(all).toEqual(mine);

    const { rows } = await owner.query(
      `select count(*)::int as n from public.job_runs
       where id = any($1) and finished_at is not null and error = 'abandoned'`,
      [mine],
    );
    expect(rows[0].n).toBe(8);
  });

  it('ejecutarlo de nuevo no tiene efecto sobre filas ya procesadas', async () => {
    const mine = await staleRuns(3);
    await closeAbandonedJobRuns();
    const again = await closeAbandonedJobRuns();
    expect(only(again, mine)).toEqual([]);
  });

  it('una ejecución reciente en curso no se toca', async () => {
    const { rows } = await owner.query<{ id: string }>(
      `insert into public.job_runs (job) values ('test-running') returning id`,
    );
    const id = Number(rows[0]!.id);
    createdIds.push(id);
    expect(await closeAbandonedJobRuns()).not.toContain(id);
  });
});

describe('runJobs', () => {
  it('registra inicio, fin y filas procesadas; un fallo queda con su código', async () => {
    const results = await runJobs([
      { name: 'test-ok', run: async () => 7 },
      { name: 'test-fail', run: async () => { throw new RangeError('boom'); } },
    ]);
    expect(results).toEqual([
      { job: 'test-ok', processed: 7, error: null },
      { job: 'test-fail', processed: null, error: 'RangeError' },
    ]);

    const { rows } = await owner.query(
      `select id, job, processed, error, finished_at is not null as finished
       from public.job_runs where job in ('test-ok', 'test-fail')
       order by id desc limit 2`,
    );
    createdIds.push(...rows.map((r) => Number(r.id)));
    expect(rows.map((r) => ({ job: r.job, processed: r.processed, error: r.error, finished: r.finished }))).toEqual([
      { job: 'test-fail', processed: null, error: 'RangeError', finished: true },
      { job: 'test-ok', processed: 7, error: null, finished: true },
    ]);
  });
});
