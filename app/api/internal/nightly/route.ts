import { NIGHTLY_JOBS } from '@/lib/server/jobs';
import { handleInternalJobs } from '@/lib/server/jobs/endpoint';

// Called at 08:00 UTC by pg_cron (staging, production). Empty until the Host ranking.
export const maxDuration = 60;

export function POST(request: Request) {
  return handleInternalJobs(request, NIGHTLY_JOBS);
}
