'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import { authErrorReason } from '@/lib/domain/auth-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const SIGNUP_EMAIL_KEY = 'producette:signup-email';
const COOLDOWN_SECONDS = 60;

const noopSubscribe = () => () => {};

function readSavedEmail(): string {
  try {
    return sessionStorage.getItem(SIGNUP_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

export interface ResendConfirmationLabels {
  title: string;
  description: string;
  email: string;
  button: string;
  sending: string;
  sent: string;
  wait: string;
  rateLimited: string;
  unknown: string;
}

export function ResendConfirmation({ labels }: { labels: ResendConfirmationLabels }) {
  const savedEmail = useSyncExternalStore(noopSubscribe, readSavedEmail, () => '');
  const [typedEmail, setTypedEmail] = useState<string | null>(null);
  const email = typedEmail ?? savedEmail;
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function handleResend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    const { error } = await createClient().auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/` },
    });
    if (error) {
      setStatus('error');
      setErrorText(authErrorReason(error.code) === 'rate_limited' ? labels.rateLimited : labels.unknown);
      return;
    }
    setStatus('sent');
    setCooldown(COOLDOWN_SECONDS);
  }

  return (
    <form onSubmit={handleResend} className="flex flex-col gap-3 border-t pt-4">
      <div>
        <p className="text-sm font-medium">{labels.title}</p>
        <p className="text-sm text-muted-foreground">{labels.description}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="resend-email">{labels.email}</Label>
        <Input
          id="resend-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setTypedEmail(e.target.value)}
        />
      </div>
      <Button type="submit" variant="secondary" disabled={status === 'sending' || cooldown > 0}>
        {status === 'sending' ? labels.sending : labels.button}
      </Button>
      <div aria-live="polite" className="text-sm">
        {status === 'sent' && <p className="text-muted-foreground">{labels.sent}</p>}
        {status === 'error' && <p className="text-destructive">{errorText}</p>}
        {cooldown > 0 && (
          <p className="text-muted-foreground">{labels.wait.replace('{seconds}', String(cooldown))}</p>
        )}
      </div>
    </form>
  );
}
