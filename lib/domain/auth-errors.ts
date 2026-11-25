export const AUTH_ERROR_REASONS = ['link_expired', 'rate_limited', 'missing_token', 'unknown'] as const;
export type AuthErrorReason = (typeof AUTH_ERROR_REASONS)[number];

// Maps Supabase Auth error codes to the reasons the UI knows how to explain.
export function authErrorReason(code: string | null | undefined): AuthErrorReason {
  switch (code) {
    case 'otp_expired':
    case 'flow_state_expired':
    case 'flow_state_not_found':
      return 'link_expired';
    case 'over_email_send_rate_limit':
      return 'rate_limited';
    default:
      return 'unknown';
  }
}

// The reason arrives in the URL, so anything unexpected becomes 'unknown'.
export function parseAuthErrorReason(value: string | null | undefined): AuthErrorReason {
  return AUTH_ERROR_REASONS.find((r) => r === value) ?? 'unknown';
}
