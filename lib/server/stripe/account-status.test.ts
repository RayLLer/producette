import { describe, expect, it } from 'vitest';
import { hostAccountStatus } from './account-status';

describe('hostAccountStatus', () => {
  it('lee stripe_transfers y el plazo mínimo de requisitos', () => {
    expect(
      hostAccountStatus({
        configuration: {
          recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: 'active' } } } },
        },
        requirements: { summary: { minimum_deadline: { status: 'eventually_due' } } },
      }),
    ).toEqual({ transfersStatus: 'active', requirementsStatus: 'eventually_due' });
  });

  it('sin capacidad ni requisitos: pending y sin requisitos', () => {
    expect(hostAccountStatus({})).toEqual({ transfersStatus: 'pending', requirementsStatus: null });
  });

  it('un estado desconocido de Stripe no se toma como active', () => {
    const r = hostAccountStatus({
      configuration: {
        recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: 'nuevo_estado' } } } },
      },
      requirements: { summary: { minimum_deadline: { status: 'otro' } } },
    });
    expect(r).toEqual({ transfersStatus: 'pending', requirementsStatus: null });
  });
});
