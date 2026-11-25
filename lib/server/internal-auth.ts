import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { serverEnv } from '@/lib/env';

/**
 * Internal endpoints (/api/internal/*) are called by pg_cron through pg_net, or by
 * `npm run sweep` in dev, with `Authorization: Bearer <CRON_SECRET>`.
 * Compared in constant time; hashing first makes both buffers the same length.
 */
export function isCronAuthorized(request: Request): boolean {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!token) return false;
  return timingSafeEqual(digest(token), digest(serverEnv.CRON_SECRET));
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}
