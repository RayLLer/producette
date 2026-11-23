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
 * - If host is both founder and referrer, the lower rate applies (3%).
 * - All amounts in integer cents. Rounding: half-up (Math.round).
 */
export function calculateFees(params: {
  priceInCents: number;
  settings: FeeSettings;
  hostIsFounder: boolean;
  clientReferredByThisHost: boolean;
}): FeeResult {
  const { priceInCents, settings, hostIsFounder, clientReferredByThisHost } =
    params;

  if (!Number.isInteger(priceInCents) || priceInCents < 0) {
    throw new Error('priceInCents must be a non-negative integer');
  }

  const appliedClientBps = settings.clientBps;

  let appliedPlatformBps: number;
  if (clientReferredByThisHost) {
    appliedPlatformBps = settings.referralBps;
  } else if (hostIsFounder) {
    appliedPlatformBps = settings.founderBps;
  } else {
    appliedPlatformBps = settings.providerBps;
  }

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
