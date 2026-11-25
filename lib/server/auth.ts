import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { and, eq, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/server/db';
import { auditLog, panelUsers } from '@/lib/server/db/generated/schema';

export type PanelRole = 'admin' | 'soporte' | 'finanzas';

export interface Viewer {
  id: string;
  email: string | undefined;
}

export interface PanelViewer extends Viewer {
  role: PanelRole;
}

export class ForbiddenError extends Error {
  constructor() {
    super('forbidden');
    this.name = 'ForbiddenError';
  }
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  return { id: data.claims.sub, email: data.claims.email };
});

export async function requireUser(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect('/auth/login');
  return viewer;
}

export async function requireRole(roles: readonly PanelRole[]): Promise<PanelViewer> {
  const viewer = await requireUser();
  const [row] = await db
    .select({ role: panelUsers.role })
    .from(panelUsers)
    .where(
      and(
        eq(panelUsers.userId, viewer.id),
        eq(panelUsers.active, true),
        inArray(panelUsers.role, [...roles]),
      ),
    )
    .limit(1);
  if (!row) throw new ForbiddenError();
  return { ...viewer, role: row.role as PanelRole };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Call inside the same transaction as the action being audited.
export async function logAudit(
  tx: Tx,
  entry: {
    actor: PanelViewer;
    action: string;
    entityType: string;
    entityId?: string;
    reason: string;
    data?: Record<string, unknown>;
  },
): Promise<void> {
  if (!entry.reason.trim()) throw new Error('audit_reason_required');
  await tx.insert(auditLog).values({
    actorUserId: entry.actor.id,
    actorRole: entry.actor.role,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    reason: entry.reason,
    data: entry.data ?? {},
  });
}
