import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/server/db';
import { jobRuns } from '@/lib/server/db/generated/schema';
import { closeAbandonedRunsJob } from './close-abandoned-runs';
import type { Job } from './types';

/** Run every minute by /api/internal/sweep. Expiry jobs (requests, quotes, contracts,
 *  release windows, disputes…) are added here as their tables arrive. */
export const SWEEP_JOBS: readonly Job[] = [closeAbandonedRunsJob];

/** Run at 08:00 UTC by /api/internal/nightly. The Host ranking arrives later. */
export const NIGHTLY_JOBS: readonly Job[] = [];

export interface JobResult {
  job: string;
  processed: number | null;
  error: string | null;
}

/**
 * Runs the jobs one after another, recording each run in job_runs. A failing job is recorded
 * with a short error code (no personal data) and does not stop the others.
 */
export async function runJobs(jobs: readonly Job[]): Promise<JobResult[]> {
  const results: JobResult[] = [];
  for (const job of jobs) {
    const [run] = await db.insert(jobRuns).values({ job: job.name }).returning({ id: jobRuns.id });
    if (!run) throw new Error('job_run_not_recorded');

    let processed: number | null = null;
    let error: string | null = null;
    try {
      processed = await job.run();
    } catch (err) {
      error = err instanceof Error ? err.name : 'unknown_error';
      console.error(`[jobs] ${job.name} failed (${error})`);
    }

    await db
      .update(jobRuns)
      .set({ finishedAt: sql`now()`, processed, error })
      .where(eq(jobRuns.id, run.id));
    results.push({ job: job.name, processed, error });
  }
  return results;
}
