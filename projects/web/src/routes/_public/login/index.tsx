import { createFileRoute } from '@tanstack/react-router';

import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '#/components/ui/input-otp';
import { VornwayLogo } from '#/components/vornway-logo';
import { OnboardingCarousel } from '#/routes/_public/login/-components/onboarding-carousel';
import { useLogin } from '#/routes/_public/login/-hooks/use-login';

export const Route = createFileRoute('/_public/login/')({
  component: RouteComponent,
});

function RouteComponent() {
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
    submitOtp,
    resendOtp,
    goBackToEmail,
  } = useLogin();

  const isEmailStep = step === 'email';
  const isNameStep = step === 'name';
  const isOtpStep = step === 'otp';
  const isDoneStep = step === 'done';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-background">
      <div className="relative h-[62vh] min-h-[500px]">
        <OnboardingCarousel />
      </div>

      <div className="relative z-10 -mt-14 flex-1 rounded-t-[28px] bg-background">
        <div className="flex flex-col items-center px-6 pb-6 pt-4">
          <div className="flex items-center gap-2">
            <VornwayLogo className="h-7 w-7" />
            <span className="text-lg font-semibold text-foreground">Vornway</span>
          </div>

          <div className="mt-4 flex w-full flex-col gap-4">
            {isEmailStep && (
              <>
                <Input
                  type="email"
                  placeholder="Tu correo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-lg border-border bg-background px-4 text-base placeholder:text-muted-foreground"
                />

                <Button
                  onClick={submitEmail}
                  disabled={!canSubmitEmail}
                  className="h-12 w-full rounded-lg bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmitting ? 'Enviando...' : 'Continuar'}
                </Button>
              </>
            )}

            {isNameStep && (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  No encontramos tu cuenta. Ingresa tu nombre para crearla y enviarte el código.
                </p>

                <Input
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-lg border-border bg-background px-4 text-base placeholder:text-muted-foreground"
                />

                <Button
                  onClick={submitName}
                  disabled={!canSubmitName}
                  className="h-12 w-full rounded-lg bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmitting ? 'Enviando...' : 'Continuar'}
                </Button>
              </>
            )}

            {isOtpStep && (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  Ingresa el código enviado a <span className="font-medium text-foreground">{email}</span>
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
                  onClick={submitOtp}
                  disabled={!canSubmitOtp}
                  className="h-12 w-full rounded-lg bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmitting ? 'Verificando...' : 'Verificar código'}
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
              </>
            )}

            {isDoneStep && (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-center text-sm text-foreground">
                Inicio de sesión completado.
              </div>
            )}

            {error && (
              <p className="text-center text-sm font-medium text-destructive">{error}</p>
            )}
          </div>

          <div className="my-4 flex w-full items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">o continuar con</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            className="h-12 w-full rounded-lg border-border text-base font-medium"
            onClick={() => {
              window.location.href = '/api/auth/sign-in/social?provider=google';
            }}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
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
            Continuar con Google
          </Button>
        </div>
      </div>
    </main>
  );
}
