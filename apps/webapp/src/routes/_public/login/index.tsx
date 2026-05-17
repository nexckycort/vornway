import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

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
  const [slideIndex, setSlideIndex] = useState(0);
  const redirect =
    typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('redirect') ?? '/')
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
  const activeSlide = LOGIN_SLIDES[slideIndex] ?? LOGIN_SLIDES[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % LOGIN_SLIDES.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!auth.isAuthenticated) return;

    setSlideIndex(0);
  }, [auth.isAuthenticated]);

  async function handleGoogleSignIn() {
    setSyncError(null);
    setIsGoogleLoading(true);

    try {
      await signIn.social({
        provider: 'google',
        callbackURL: 'https://app.vornway.com/',
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
    <main className="h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(244,246,251,0.98)_42%,_rgba(223,231,255,0.92)_100%)]">
      <div className="mx-auto grid h-full w-full max-w-6xl grid-rows-[1.15fr_0.95fr] gap-3 p-3 sm:p-4 lg:grid-cols-[1.08fr_0.92fr] lg:grid-rows-1 lg:gap-6 lg:p-6">
        <section className="relative min-h-0 overflow-hidden rounded-[28px] border border-white/70 bg-[#0d1430] text-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
          <div className="absolute inset-0">
            <img
              src={activeSlide.image}
              alt={activeSlide.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,9,20,0.18)_0%,rgba(6,9,20,0.3)_35%,rgba(6,9,20,0.86)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_48%)]" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-3">
              <VornwayLogo className="h-11 w-11 rounded-2xl bg-white/10 ring-1 ring-white/15" />
              <div>
                <p className="text-base font-semibold leading-5 text-white">
                  Vornway
                </p>
                <p className="text-xs text-white/70">Gastos, metas y viajes</p>
              </div>
            </div>

            <div className="max-w-xl space-y-3 pb-2">
              <p className="text-[11px] uppercase tracking-[0.26em] text-white/70">
                Login mobile first
              </p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl lg:text-5xl">
                {activeSlide.title}
              </h1>
              <p className="max-w-lg text-sm leading-6 text-white/80 sm:text-base">
                {activeSlide.description}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-white/55">
                <span>{activeSlide.kicker}</span>
                <span>{slideIndex + 1}/3</span>
              </div>

              <div className="flex items-center gap-2">
                {LOGIN_SLIDES.map((slide, index) => (
                  <button
                    key={slide.title}
                    type="button"
                    onClick={() => setSlideIndex(index)}
                    aria-label={`Ver slide ${index + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      index === slideIndex
                        ? 'w-8 bg-white'
                        : 'w-2.5 bg-white/45'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="min-h-0 overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_28px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:p-5 lg:flex lg:items-center lg:p-6">
          <div className="w-full">
            <div className="flex items-center gap-3">
              <VornwayLogo className="h-11 w-11 rounded-2xl bg-background ring-1 ring-border/60" />
              <div>
                <p className="text-base font-semibold leading-5 text-foreground">
                  Iniciar sesión
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
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

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />o con correo
                <span className="h-px flex-1 bg-border" />
              </div>

              {isEmailStep ? (
                <div className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Tu correo"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 rounded-2xl border-border bg-background px-4 text-base placeholder:text-muted-foreground"
                  />

                  <Button
                    type="button"
                    onClick={submitEmail}
                    disabled={!canSubmitEmail}
                    className="h-12 w-full rounded-full bg-primary text-base font-medium text-primary-foreground shadow-[0_10px_30px_rgba(222,3,77,0.2)] hover:bg-primary/90"
                  >
                    {isSubmitting ? 'Enviando...' : 'Continuar'}
                  </Button>
                </div>
              ) : null}

              {isNameStep ? (
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    No encontramos tu cuenta. Ingresa tu nombre para crearla y
                    enviarte el código.
                  </p>

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
                    className="h-12 w-full rounded-full bg-primary text-base font-medium text-primary-foreground shadow-[0_10px_30px_rgba(222,3,77,0.2)] hover:bg-primary/90"
                  >
                    {isSubmitting ? 'Enviando...' : 'Continuar'}
                  </Button>
                </div>
              ) : null}

              {isOtpStep ? (
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Ingresa el código enviado a{' '}
                    <span className="font-medium text-foreground">{email}</span>
                  </p>

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
                    className="h-12 w-full rounded-full bg-primary text-base font-medium text-primary-foreground shadow-[0_10px_30px_rgba(222,3,77,0.2)] hover:bg-primary/90"
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
                </div>
              ) : null}

              {syncError || error ? (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
                  {syncError || error}
                </p>
              ) : null}
            </div>

            <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
              Al continuar aceptas el uso de tu cuenta para iniciar sesión en
              Vornway.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

const LOGIN_SLIDES = [
  {
    kicker: 'Organiza viajes',
    image: '/images/login/slide-1.webp',
    title: 'Todo el viaje en un solo lugar',
    description:
      'Planifica itinerarios, comparte el contexto del grupo y evita perder detalles entre chats.',
  },
  {
    kicker: 'Divide gastos',
    image: '/images/login/slide-2.webp',
    title: 'Cuentas claras aunque cambies de moneda',
    description:
      'Registra gastos, divide por persona y sigue el balance sin hacer cuentas manuales.',
  },
  {
    kicker: 'Ahorra para metas',
    image: '/images/login/slide-3.webp',
    title: 'Metas que empujan tu próximo destino',
    description:
      'Define objetivos, revisa el progreso y llega al viaje con todo bajo control.',
  },
] as const;

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
