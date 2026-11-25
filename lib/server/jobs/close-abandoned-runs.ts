import 'server-only';
import { and, asc, inArray, isNull, lt, sql } from 'drizzle-orm';
import { db } from '@/lib/server/db';
import { jobRuns } from '@/lib/server/db/generated/schema';
import { JOB_BATCH_SIZE, type Job } from './types';

/**
 * A run still "in progress" after this long was killed (function timeout, deploy, crash).
 * The endpoints allow at most 60 s, so 15 minutes leaves a wide margin.
 */
export const ABANDONED_AFTER_MINUTES = 15;

/**
 * Closes job_runs rows that never finished, marking them error = 'abandoned'.
 * `afterLock` exists only so tests can hold the lock and run a second copy concurrently.
 * Returns the ids it closed.
 */
export async function closeAbandonedJobRuns(
  options: { afterLock?: (ids: number[]) => Promise<void> } = {},
): Promise<number[]> {
  return db.transaction(async (tx) => {
    const stillRunning = and(
      isNull(jobRuns.finishedAt),
      lt(jobRuns.startedAt, sql`now() - make_interval(mins => ${ABANDONED_AFTER_MINUTES})`),
    );

    const due = await tx
      .select({ id: jobRuns.id })
      .from(jobRuns)
      .where(stillRunning)
      .orderBy(asc(jobRuns.startedAt))
      .limit(JOB_BATCH_SIZE)
      .for('update', { skipLocked: true });

    const ids = due.map((r) => r.id);
    await options.afterLock?.(ids);
    if (ids.length === 0) return [];

    const closed = await tx
      .update(jobRuns)
      .set({ finishedAt: sql`now()`, error: 'abandoned' })
      .where(and(inArray(jobRuns.id, ids), stillRunning)) // state re-checked in the write
      .returning({ id: jobRuns.id });
    return closed.map((r) => r.id);
  });
}

export const closeAbandonedRunsJob: Job = {
  name: 'close-abandoned-job-runs',
  run: async () => (await closeAbandonedJobRuns()).length,
};
