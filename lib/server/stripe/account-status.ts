// Pure mapping from a v2 Account (retrieved with include configuration.recipient and
// requirements) to the columns of host_stripe_accounts. No server-only imports so it can be
// unit-tested.

const TRANSFERS_STATUSES = ['active', 'pending', 'rejected', 'restricted', 'unsupported'] as const;
const REQUIREMENTS_STATUSES = ['currently_due', 'eventually_due', 'past_due'] as const;

export type TransfersStatus = (typeof TRANSFERS_STATUSES)[number];
export type RequirementsStatus = (typeof REQUIREMENTS_STATUSES)[number];

interface AccountLike {
  configuration?: {
    recipient?: {
      capabilities?: { stripe_balance?: { stripe_transfers?: { status?: string } } };
    } | null;
  } | null;
  requirements?: { summary?: { minimum_deadline?: { status?: string } | null } | null } | null;
}

export function hostAccountStatus(account: AccountLike): {
  transfersStatus: TransfersStatus;
  requirementsStatus: RequirementsStatus | null;
} {
  const transfers = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
  const deadline = account.requirements?.summary?.minimum_deadline?.status;
  return {
    // Anything unknown is treated as not ready: money only moves on an explicit 'active'.
    transfersStatus: TRANSFERS_STATUSES.find((s) => s === transfers) ?? 'pending',
    requirementsStatus: REQUIREMENTS_STATUSES.find((s) => s === deadline) ?? null,
  };
}
