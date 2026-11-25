import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/domain/safe-redirect';
import { type EmailOtpType } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

// Handles both email link styles: token_hash (custom template, works on any device)
// and code (default Supabase template with PKCE; only works in the browser that signed up).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

  const supabase = await createClient();
  let errorMessage = 'missing_token';

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
    errorMessage = error.message;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
    errorMessage = error.message;
  }

  redirect(`/auth/error?error=${encodeURIComponent(errorMessage)}`);
}
