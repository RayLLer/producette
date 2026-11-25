import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/domain/safe-redirect';
import { authErrorReason } from '@/lib/domain/auth-errors';
import { type EmailOtpType } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

// Handles both email link styles: token_hash (custom template, works on any device)
// and code (default Supabase template with PKCE; only works in the browser that signed up).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Supabase rejected the link before redirecting here (expired or already used).
  const supabaseError = searchParams.get('error_code');
  if (supabaseError) {
    redirect(`/auth/error?reason=${authErrorReason(supabaseError)}`);
  }

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));
  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) redirect(`/auth/error?reason=${authErrorReason(error.code)}`);
    redirect(next);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Supabase only issues the code after verifying the email, so the address is already
    // confirmed; the exchange fails when the link is opened in another browser or device.
    if (error) redirect('/auth/login?confirmed=1');
    redirect(next);
  }

  redirect('/auth/error?reason=missing_token');
}
