import 'server-only';
import { serverEnv } from '@/lib/env';

/**
 * DEADLINE_SCALE for this environment (1 when unset). Pass it to the hour-based helpers of
 * lib/domain/deadlines.ts when a row enters a state. Production is always 1 (lib/env.ts).
 */
export const deadlineScale: number = serverEnv.DEADLINE_SCALE ?? 1;
