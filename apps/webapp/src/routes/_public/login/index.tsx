import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useEffect, useState } from 'react';

import { Button } from '#/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldSeparator,
} from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '#/components/ui/input-otp';
import { Spinner } from '#/components/ui/spinner';
import { useAuth } from '#/contexts/auth/use-auth';
import { signIn } from '#/lib/auth-client';
import { OnboardingCarousel } from '#/routes/_public/login/-components/onboarding-carousel';
import { useLogin } from '#/routes/_public/login/-hooks/use-login';
import { getLoginMessages } from '#/routes/_public/login/-messages';

export const Route = createFileRoute('/_public/login/')({
  component: RouteComponent,
});

function RouteComponent() {
  const t = getLoginMessages();
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
  const displayedError = syncError || error;
  const isEmailStep = step === 'email';
  const isNameStep = step === 'name';
  const isOtpStep = step === 'otp';
  const desktopTitle = isOtpStep
    ? t.otpTitle
    : isNameStep
      ? t.nameTitle
      : t.title;
  const desktopCopy = isOtpStep
    ? t.otpCopy(email)
    : isNameStep
      ? t.nameCopy(email)
      : t.emailCopy;

  useEffect(() => {
    if (!auth.isAuthenticated) return;

    void navigate({
      to: redirect,
      replace: true,
    });
  }, [auth.isAuthenticated, navigate, redirect]);

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
      setSyncError(t.googleError);
      setIsGoogleLoading(false);
    }
  }

  async function submitOtpWithAuth() {
    const normalizedOtp = otp.replace(/\s+/g, '').trim();

    if (!normalizedOtp) {
      setSyncError(t.otpRequired);
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
        setSyncError(t.invalidOtp);
      } else {
        setSyncError(t.loginError);
      }
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitEmail();
  }

  function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitName();
  }

  function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitOtpWithAuth();
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_12%_18%,rgba(222,3,77,0.14),transparent_30%),radial-gradient(circle_at_88%_82%,rgba(246,178,107,0.2),transparent_28%),#f7f3f4] md:flex md:items-center md:justify-center md:p-6 lg:p-8">
      <div className="mx-auto flex min-h-dvh w-full max-w-[412px] flex-col overflow-hidden bg-[#eadfe2] md:min-h-[min(897px,calc(100dvh-3rem))] md:rounded-[28px] md:shadow-2xl lg:grid lg:h-[calc(100dvh-4rem)] lg:min-h-[680px] lg:max-h-[860px] lg:max-w-[1180px] lg:grid-cols-[minmax(0,1.12fr)_minmax(420px,0.88fr)] lg:rounded-[36px] lg:bg-white lg:shadow-[0_36px_100px_rgba(38,25,29,0.2)]">
        <section className="relative min-h-[280px] flex-1 overflow-visible lg:min-h-0 lg:overflow-hidden">
          <OnboardingCarousel />
        </section>

        <section className="relative flex w-full shrink-0 flex-col items-center gap-6 rounded-t-[24px] bg-white px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] [&>*]:w-full [&>*]:max-w-[420px] lg:h-full lg:justify-center lg:rounded-none lg:px-12 lg:py-12">
          <div className="flex h-7 items-center justify-center gap-1 lg:h-10 lg:justify-start lg:gap-2">
            <img
              src="/logo.webp"
              alt=""
              className="size-7 object-contain lg:size-10"
            />
            <h1 className="text-[28px] leading-7 font-semibold tracking-[-0.04em] text-[#1e1e1e] lg:text-[34px] lg:leading-10">
              Vornway
            </h1>
          </div>

          <div className="hidden flex-col gap-2 lg:flex">
            <h2 className="text-3xl leading-9 font-semibold tracking-[-0.025em] text-balance text-foreground">
              {desktopTitle}
            </h2>
            <p className="max-w-[360px] text-sm leading-6 text-muted-foreground">
              {desktopCopy}
            </p>
          </div>

          <FieldGroup className="gap-3">
            {isEmailStep ? (
              <form onSubmit={handleEmailSubmit}>
                <Field className="gap-3" data-invalid={Boolean(displayedError)}>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    aria-label={t.emailTitle}
                    aria-invalid={Boolean(displayedError)}
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-10 px-4 text-base shadow-sm lg:h-12"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!canSubmitEmail}
                    className="h-10 w-full text-base shadow-[0_8px_20px_rgba(222,3,77,0.1)] lg:h-12"
                  >
                    {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
                    {isSubmitting ? t.common.loading : t.common.continue}
                  </Button>
                </Field>
              </form>
            ) : null}

            {isNameStep ? (
              <form onSubmit={handleNameSubmit}>
                <Field className="gap-3" data-invalid={Boolean(displayedError)}>
                  <Input
                    type="text"
                    autoComplete="name"
                    aria-label={t.nameTitle}
                    aria-invalid={Boolean(displayedError)}
                    placeholder={t.namePlaceholder}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-10 px-4 text-base shadow-sm lg:h-12"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!canSubmitName}
                    className="h-10 w-full text-base shadow-[0_8px_20px_rgba(222,3,77,0.1)] lg:h-12"
                  >
                    {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
                    {isSubmitting ? t.common.loading : t.common.continue}
                  </Button>
                </Field>
              </form>
            ) : null}

            {isOtpStep ? (
              <form onSubmit={handleOtpSubmit}>
                <Field
                  className="items-center gap-3"
                  data-invalid={Boolean(displayedError)}
                >
                  <div className="flex flex-col gap-1 text-center lg:hidden">
                    <h2 className="text-base font-semibold text-foreground">
                      {t.otpTitle}
                    </h2>
                    <p className="text-xs leading-4 text-muted-foreground">
                      {t.otpCopy(email)}
                    </p>
                  </div>
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    aria-invalid={Boolean(displayedError)}
                    containerClassName="justify-center"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="size-10" />
                      <InputOTPSlot index={1} className="size-10" />
                      <InputOTPSlot index={2} className="size-10" />
                      <InputOTPSlot index={3} className="size-10" />
                      <InputOTPSlot index={4} className="size-10" />
                      <InputOTPSlot index={5} className="size-10" />
                    </InputOTPGroup>
                  </InputOTP>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!canSubmitOtp || isAuthSubmitting}
                    className="h-10 w-full text-base shadow-[0_8px_20px_rgba(222,3,77,0.1)] lg:h-12"
                  >
                    {isAuthSubmitting ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    {isAuthSubmitting ? t.common.loading : t.verifyCode}
                  </Button>
                </Field>
              </form>
            ) : null}

            {displayedError ? (
              <FieldError className="text-center" aria-live="polite">
                {displayedError}
              </FieldError>
            ) : null}
          </FieldGroup>

          <FieldSeparator className="-my-0 text-xs">
            o continuar con
          </FieldSeparator>

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSubmitting || isAuthSubmitting}
            className="h-10 w-full text-base shadow-sm lg:h-12"
          >
            {isGoogleLoading ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <GoogleIcon data-icon="inline-start" />
            )}
            {isGoogleLoading ? t.redirecting : t.continueWithGoogle}
          </Button>

          {isOtpStep ? (
            <div className="flex items-center justify-center gap-5 text-xs">
              <button
                type="button"
                onClick={goBackToEmail}
                className="text-[#626262]"
              >
                {t.changeEmail}
              </button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={isSubmitting}
                className="font-semibold text-[#1e1e1e] disabled:opacity-50"
              >
                {t.resendCode}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs">
              <span className="text-[#626262]">¿Ya tienes una cuenta?</span>
              {isNameStep ? (
                <button
                  type="button"
                  onClick={goBackToEmail}
                  className="font-semibold text-[#1e1e1e]"
                >
                  Iniciar Sesión
                </button>
              ) : (
                <span className="font-semibold text-[#1e1e1e]">
                  Iniciar Sesión
                </span>
              )}
            </div>
          )}
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
