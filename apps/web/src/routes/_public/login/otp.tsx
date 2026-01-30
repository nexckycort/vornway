import { createFileRoute, useRouter } from '@tanstack/react-router';
import { InputOTPForm } from '@workspace/ui/components/input-otp-form';
import { toast } from '@workspace/ui/components/sonner';
import { useState } from 'react';
import { loginFn, sendOtp } from '~/server/auth';

export const Route = createFileRoute('/_public/login/otp')({
  validateSearch: (search: { email: string; redirect?: string }) => {
    return search;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { redirect } = Route.useSearch();
  const router = useRouter();
  const { email } = Route.useSearch();

  const [isLoading, setIsLoading] = useState(false);
  const [otpKey, setOtpKey] = useState(0);

  const handleOtpSubmit = async (otp: string) => {
    setIsLoading(true);
    try {
      const result = await loginFn({ data: { email, otp } });

      if (result.success) {
        router.navigate({ to: redirect || '/' });
      } else {
        toast.error(
          result.error || 'Código incorrecto. Por favor intenta de nuevo.',
        );
        setOtpKey((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error verificando OTP:', error);
      toast.error('Error al verificar el código. Por favor intenta de nuevo.');
      setOtpKey((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await sendOtp({ data: { email } });
      toast.success('OTP reenviado exitosamente');
      // Resetear el formulario para que el usuario pueda ingresar el nuevo código
      setOtpKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error al reenviar OTP:', error);
      toast.error('Error al reenviar el código. Intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Revisa tu correo electrónico</h1>
          <p className="text-sm text-muted-foreground leading-relaxed px-2">
            Enviamos un código de verificación a {email}. Ingrésalo para
            continuar.
          </p>
        </div>

        <div className="flex justify-center">
          <InputOTPForm
            key={otpKey}
            onSubmit={handleOtpSubmit}
            isLoading={isLoading}
            description="Ingrese la contraseña de un solo uso enviada a su correo electrónico."
            onResend={handleResend}
          />
        </div>
      </div>
    </div>
  );
}
