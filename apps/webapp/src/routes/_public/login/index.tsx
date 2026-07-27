import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { Button } from '#/components/ui/button';
import { Spinner } from '#/components/ui/spinner';
import { useAuth } from '#/contexts/auth/use-auth';
import { signIn } from '#/lib/auth-client';
import { OnboardingCarousel } from '#/routes/_public/login/-components/onboarding-carousel';
import { getLoginMessages } from '#/routes/_public/login/-messages';

export const Route = createFileRoute('/_public/login/')({
  component: RouteComponent,
});

function RouteComponent() {
  const t = getLoginMessages();
  const navigate = useNavigate();
  const auth = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirect = normalizeRedirect(
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('redirect')
      : null,
  );
  const callbackURL =
    typeof window !== 'undefined'
      ? new URL(redirect, window.location.origin).toString()
      : '/';

  useEffect(() => {
    if (!auth.isAuthenticated) return;

    void navigate({
      to: redirect,
      replace: true,
    });
  }, [auth.isAuthenticated, navigate, redirect]);

  async function handleGoogleSignIn() {
    setError(null);
    setIsGoogleLoading(true);

    try {
      const result = await signIn.social({
        provider: 'google',
        callbackURL,
        disableRedirect: true,
      });

      if (result.error || !result.data?.url) {
        throw new Error(result.error?.message ?? 'GOOGLE_REDIRECT_UNAVAILABLE');
      }

      window.location.replace(result.data.url);
    } catch (rawError) {
      console.error('Error signing in with Google:', rawError);
      setError(t.googleError);
      setIsGoogleLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#171717] md:flex md:items-center md:justify-center md:p-4">
      <div className="relative mx-auto h-dvh min-h-[480px] w-full max-w-[412px] overflow-hidden bg-black md:h-[min(917px,calc(100dvh-2rem))] md:rounded-[20px] md:shadow-[0_30px_90px_rgba(0,0,0,0.4)]">
        <OnboardingCarousel
          actions={
            <div className="flex w-full flex-col gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="h-10 w-full rounded-[20px] border-[#ebebeb] bg-white px-4 text-base font-medium text-[#1e1e1e] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-white/95"
              >
                {isGoogleLoading ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <GoogleIcon data-icon="inline-start" className="size-4" />
                )}
                {isGoogleLoading ? t.redirecting : t.continueWithGoogle}
              </Button>

              {error ? (
                <p
                  className="rounded-xl bg-black/45 px-3 py-2 text-center text-sm font-medium text-white backdrop-blur-sm"
                  aria-live="polite"
                >
                  {error}
                </p>
              ) : null}
            </div>
          }
        />
      </div>
    </main>
  );
}

function normalizeRedirect(value: string | null): string {
  if (!value?.startsWith('/')) return '/';
  if (value.startsWith('//')) return '/';
  return value;
}

function GoogleIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
