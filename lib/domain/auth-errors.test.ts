import { describe, expect, it } from 'vitest';
import { authErrorReason, parseAuthErrorReason } from './auth-errors';

describe('authErrorReason', () => {
  it('enlace vencido o ya usado', () => {
    expect(authErrorReason('otp_expired')).toBe('link_expired');
    expect(authErrorReason('flow_state_expired')).toBe('link_expired');
    expect(authErrorReason('flow_state_not_found')).toBe('link_expired');
  });

  it('límite de envíos', () => {
    expect(authErrorReason('over_email_send_rate_limit')).toBe('rate_limited');
  });

  it('cualquier otro código es desconocido', () => {
    expect(authErrorReason('algo_nuevo')).toBe('unknown');
    expect(authErrorReason(null)).toBe('unknown');
    expect(authErrorReason(undefined)).toBe('unknown');
  });
});

describe('parseAuthErrorReason', () => {
  it('solo acepta motivos conocidos de la URL', () => {
    expect(parseAuthErrorReason('link_expired')).toBe('link_expired');
    expect(parseAuthErrorReason('missing_token')).toBe('missing_token');
    expect(parseAuthErrorReason('<script>')).toBe('unknown');
    expect(parseAuthErrorReason(undefined)).toBe('unknown');
  });
});
