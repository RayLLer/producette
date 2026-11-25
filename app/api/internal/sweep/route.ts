import { SWEEP_JOBS } from '@/lib/server/jobs';
import { handleInternalJobs } from '@/lib/server/jobs/endpoint';

// Called every minute by pg_cron (staging, production) or `npm run sweep` (dev).
export const maxDuration = 60;

export function POST(request: Request) {
  return handleInternalJobs(request, SWEEP_JOBS);
}
