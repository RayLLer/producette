/**
 * A scheduled process run by /api/internal/sweep (every minute) or /api/internal/nightly.
 *
 * Rules every job follows (CLAUDE.md, docs/plazos.md):
 * - It finds rows whose stored deadline has passed AND are still in the expected state.
 * - It locks them with FOR UPDATE SKIP LOCKED inside one transaction, in a bounded batch,
 *   and repeats the state condition in the UPDATE. Running it twice, or two runs at the same
 *   time, never has a double effect.
 * - Whatever is left over is picked up by the next run.
 */
export interface Job {
  /** Stable name; stored in job_runs.job. */
  name: string;
  /** Processes one batch and returns how many rows it changed. */
  run(): Promise<number>;
}

/** Rows a job handles per run; the rest waits for the next minute. */
export const JOB_BATCH_SIZE = 100;
