import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { type ReactNode, useEffect, useState } from 'react';

import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '#/components/ui/input-otp';
import { VornwayLogo } from '#/components/vornway-logo';
import { useAuth } from '#/contexts/auth/use-auth';
import { signIn } from '#/lib/auth-client';
import { useLogin } from '#/routes/_public/login/-hooks/use-login';

export const Route = createFileRoute('/_public/login/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const auth = useAuth();
  const {
    step,
    email,
    name,
    otp,
    error,
    isSubmitting,
    canSubmitEmail,
    canSubmitName,
    canSubmitOtp,
    setEmail,
    setName,
    setOtp,
    submitEmail,
    submitName,
    resendOtp,
    goBackToEmail,
  } = useLogin();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
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

  const isEmailStep = step === 'email';
  const isNameStep = step === 'name';
  const isOtpStep = step === 'otp';

  async function handleGoogleSignIn() {
    setSyncError(null);
    setIsGoogleLoading(true);

    try {
      await signIn.social({
        provider: 'google',
        callbackURL,
      });
    } catch (rawError) {
      console.error('Error en login con Google:', rawError);
      setSyncError('No se pudo iniciar sesión con Google. Intenta de nuevo.');
      setIsGoogleLoading(false);
    }
  }

  async function submitOtpWithAuth() {
    const normalizedOtp = otp.replace(/\s+/g, '').trim();

    if (!normalizedOtp) {
      setSyncError('Ingresa el código OTP.');
      return;
    }

    setSyncError(null);
    setIsAuthSubmitting(true);

    try {
      await auth.login(email.trim().toLowerCase(), normalizedOtp);
    } catch (rawError) {
      const code =
        rawError instanceof Error ? rawError.message : String(rawError ?? '');

      if (code === 'INVALID_OTP') {
        setOtp('');
        setSyncError('Código inválido. Ingresa el OTP nuevamente.');
      } else {
        setSyncError('No se pudo iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(251,242,246,1)_0%,_rgba(255,255,255,1)_36%,_rgba(245,247,251,1)_100%)] px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md items-center">
        <section className="w-full space-y-5">
          <div className="flex items-center gap-3 px-1">
            <VornwayLogo className="h-12 w-12 rounded-2xl bg-white ring-1 ring-border/70 shadow-sm" />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Vornway
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Entra a tu app
              </h1>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isSubmitting || isAuthSubmitting}
                className="h-12 w-full rounded-full border-border bg-background text-base font-medium text-foreground hover:bg-muted/40"
              >
                <GoogleIcon className="mr-2 size-5" />
                {isGoogleLoading ? 'Redirigiendo...' : 'Continuar con Google'}
              </Button>

              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                <span className="h-px flex-1 bg-border" />o con correo
                <span className="h-px flex-1 bg-border" />
              </div>

              {isEmailStep ? (
                <StepCard
                  title="Tu correo"
                  copy="Solo necesitamos tu correo electrónico para continuar."
                >
                  <Input
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 rounded-2xl border-border bg-background px-4 text-base placeholder:text-muted-foreground"
                  />

                  <Button
                    type="button"
                    onClick={submitEmail}
                    disabled={!canSubmitEmail}
                    className="h-12 w-full rounded-full bg-primary text-base font-medium text-primary-foreground shadow-[0_10px_30px_rgba(222,3,77,0.16)] hover:bg-primary/90"
                  >
                    {isSubmitting ? 'Enviando...' : 'Continuar'}
                  </Button>
                </StepCard>
              ) : null}

              {isNameStep ? (
                <StepCard
                  title="Tu nombre"
                  copy={`No encontramos una cuenta para ${email}.`}
                >
                  <Input
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-12 rounded-2xl border-border bg-background px-4 text-base placeholder:text-muted-foreground"
                  />

                  <Button
                    type="button"
                    onClick={submitName}
                    disabled={!canSubmitName}
                    className="h-12 w-full rounded-full bg-primary text-base font-medium text-primary-foreground shadow-[0_10px_30px_rgba(222,3,77,0.16)] hover:bg-primary/90"
                  >
                    {isSubmitting ? 'Enviando...' : 'Continuar'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={goBackToEmail}
                    className="h-11 w-full rounded-full text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  >
                    Volver
                  </Button>
                </StepCard>
              ) : null}

              {isOtpStep ? (
                <StepCard
                  title="Verifica tu acceso"
                  copy={`Enviamos un código a ${email}`}
                >
                  <div className="mx-auto">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
                      containerClassName="justify-center"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button
                    type="button"
                    onClick={submitOtpWithAuth}
                    disabled={!canSubmitOtp || isAuthSubmitting}
                    className="h-12 w-full rounded-full bg-primary text-base font-medium text-primary-foreground shadow-[0_10px_30px_rgba(222,3,77,0.16)] hover:bg-primary/90"
                  >
                    {isAuthSubmitting ? 'Verificando...' : 'Verificar código'}
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={goBackToEmail}
                      className="font-medium text-muted-foreground hover:underline"
                    >
                      Cambiar correo
                    </button>
                    <button
                      type="button"
                      onClick={resendOtp}
                      className="font-medium text-foreground hover:underline"
                    >
                      Reenviar código
                    </button>
                  </div>
                </StepCard>
              ) : null}

              {syncError || error ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
                  {syncError || error}
                </p>
              ) : null}
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
              Al continuar aceptas el uso de tu cuenta para iniciar sesión en
              Vornway.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function normalizeRedirect(value: string | null): string {
  if (!value?.startsWith('/')) return '/';
  if (value.startsWith('//')) return '/';
  return value;
}

function StepCard({
  title,
  copy,
  children,
}: {
  title: string;
  copy: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#e8edf4] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">{copy}</p>
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
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
