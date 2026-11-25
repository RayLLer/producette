export interface FeeSettings {
  providerBps: number;
  clientBps: number;
  founderBps: number;
  referralBps: number;
}

export interface FeeResult {
  priceInCents: number;
  clientFeeInCents: number;
  clientTotalInCents: number;
  platformFeeInCents: number;
  hostNetInCents: number;
  appliedPlatformBps: number;
  appliedClientBps: number;
}

/** Default fee settings as of project launch. Source: fee_settings table. */
export const DEFAULT_FEE_SETTINGS: FeeSettings = {
  providerBps: 1000,
  clientBps: 500,
  founderBps: 800,
  referralBps: 300,
};

/**
 * Calculates all fees for a booking.
 *
 * Rules:
 * - Client always pays clientBps% on top of price, with no cap.
 * - Platform takes providerBps% from price as commission (10%).
 * - Founders pay founderBps% (8%) instead of providerBps.
 * - If client registered via this host's referral link, platform takes referralBps% (3%).
 * - hostFeeBps (profiles.host_fee_bps) is the Host's own rate: when set it replaces
 *   providerBps/founderBps; null means "use fee_settings". It never decides the referral
 *   rate, which depends on the Client–Host pair (accounts.referred_by_host_id).
 * - Whenever the referral rate also applies, the lowest rate wins (e.g. founder 8% → 3%).
 * - Each quote stores the rates applied at creation; later changes never touch it.
 * - All amounts in integer cents. Rounding: half-up (Math.round).
 */
export function calculateFees(params: {
  priceInCents: number;
  settings: FeeSettings;
  hostIsFounder: boolean;
  clientReferredByThisHost: boolean;
  hostFeeBps?: number | null;
}): FeeResult {
  const { priceInCents, settings, hostIsFounder, clientReferredByThisHost, hostFeeBps } =
    params;

  if (!Number.isInteger(priceInCents) || priceInCents < 0) {
    throw new Error('priceInCents must be a non-negative integer');
  }

  const appliedClientBps = settings.clientBps;

  const hostBps =
    hostFeeBps ?? (hostIsFounder ? settings.founderBps : settings.providerBps);
  const appliedPlatformBps = clientReferredByThisHost
    ? Math.min(hostBps, settings.referralBps)
    : hostBps;

  const clientFeeInCents = Math.round(
    (priceInCents * appliedClientBps) / 10000,
  );
  const clientTotalInCents = priceInCents + clientFeeInCents;
  const platformFeeInCents = Math.round(
    (priceInCents * appliedPlatformBps) / 10000,
  );
  const hostNetInCents = priceInCents - platformFeeInCents;

  return {
    priceInCents,
    clientFeeInCents,
    clientTotalInCents,
    platformFeeInCents,
    hostNetInCents,
    appliedPlatformBps,
    appliedClientBps,
  };
}

export interface LowerPriceSettlement {
  agreedPriceInCents: number;
  refundToClientInCents: number;
  clientFeeKeptInCents: number;
  platformFeeInCents: number;
  hostNetInCents: number;
}

/**
 * Splits a paid booking when Client and Host agree on a lower price (alcance: "no se
 * recalcula el 5% ni el 10%"; edge case confirmed 2026-11-25):
 * - The Client gets back price − agreed; the client fee is never refunded.
 * - The platform fee stays the cents stored on the quote, capped at the agreed price.
 * - The Host receives what is left of the agreed price (never below zero).
 */
export function settleLowerAgreedPrice(params: {
  quote: Pick<FeeResult, 'priceInCents' | 'clientFeeInCents' | 'platformFeeInCents'>;
  agreedPriceInCents: number;
}): LowerPriceSettlement {
  const { quote, agreedPriceInCents } = params;

  if (!Number.isInteger(agreedPriceInCents) || agreedPriceInCents < 0) {
    throw new Error('agreedPriceInCents must be a non-negative integer');
  }
  if (agreedPriceInCents > quote.priceInCents) {
    throw new Error('agreedPriceInCents cannot exceed the quoted price');
  }

  const platformFeeInCents = Math.min(quote.platformFeeInCents, agreedPriceInCents);

  return {
    agreedPriceInCents,
    refundToClientInCents: quote.priceInCents - agreedPriceInCents,
    clientFeeKeptInCents: quote.clientFeeInCents,
    platformFeeInCents,
    hostNetInCents: agreedPriceInCents - platformFeeInCents,
  };
}
