import 'server-only';
import { isCronAuthorized } from '@/lib/server/internal-auth';
import { runJobs } from './index';
import type { Job } from './types';

/** Shared body of /api/internal/sweep and /api/internal/nightly. */
export async function handleInternalJobs(request: Request, jobs: readonly Job[]): Promise<Response> {
  if (!isCronAuthorized(request)) {
    return new Response('unauthorized', { status: 401 });
  }
  const results = await runJobs(jobs);
  const failed = results.some((r) => r.error !== null);
  return Response.json({ ok: !failed, results }, { status: failed ? 500 : 200 });
}
