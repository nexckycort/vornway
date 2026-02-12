import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { useState } from 'react';
import { GradientLayout } from '~/components/gradient-layout';

import { sendOtp } from '~/server/auth';

export const Route = createFileRoute('/_public/login/')({
  component: RouteComponent,
});

const allowedDomains = [
  'gmail.com',
  'outlook.com',
  'outlook.es',
  'hotmail.com',
  'hotmail.es',
  'yahoo.com',
  'yahoo.es',
  'icloud.com',
  'live.com',
  'msn.com',
  'protonmail.com',
  'proton.me',
];

function RouteComponent() {
  const { redirect } = Route.useSearch();
  const { navigate } = useRouter();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'email' | 'name'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;

    const domain = email.split('@')[1]?.toLowerCase();
    return allowedDomains.includes(domain);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (!validateEmail(email)) {
      setError('Usa un correo de Gmail, Outlook, Yahoo o iCloud');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const response = await sendOtp({ data: { email } });
      if (response.code === 'USER_NOT_FOUND') {
        setStep('name');
      } else {
        navigate({ to: '/login/otp', search: { email, redirect } });
      }
    } catch (err) {
      console.error('Error en login:', err);
      setError('No se pudo enviar el código. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setError('');
    setIsLoading(true);
    try {
      await sendOtp({ data: { email, name } });
      navigate({ to: '/login/otp', search: { email, redirect } });
    } catch (err) {
      console.error('Error en registro:', err);
      setError('No se pudo crear la cuenta. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const goBackToEmail = () => {
    setStep('email');
    setName('');
    setError('');
  };

  return (
    <GradientLayout className="native-enter flex flex-col items-center justify-center px-5 pb-8">
      <div className="mb-5">
        <img src="/logo.svg" alt="logo" className="h-20 w-20 drop-shadow-sm" />
      </div>

      {step === 'email' ? (
        <>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-[#1a1a3e]">
            Bienvenido a SplitWay
          </h1>
          <p className="mb-6 text-sm text-[#4a4a6a]">
            Ingresa tu correo electrónico para continuar
          </p>

          <form
            className="w-full max-w-sm rounded-3xl border border-white/60 bg-blue-50/90 p-6 shadow-[0_20px_45px_-28px_rgba(26,26,62,0.45)] backdrop-blur-xl"
            onSubmit={handleEmailSubmit}
          >
            <Label className="mb-2 block text-sm text-[#1a1a3e]">
              Correo electrónico
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="tu@correo.com"
              className="w-full max-w-xl rounded-2xl border-2 bg-white px-4 py-3.5 transition-colors focus:border-[#6b5b9a] focus:outline-none"
              autoFocus
            />
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

            <Button
              size="lg"
              type="submit"
              disabled={!email || isLoading}
              className={`mt-5 w-full !h-14 rounded-2xl py-4 text-base font-medium transition-all ${
                email && !isLoading
                  ? 'text-white hover:bg-[#2a2a5e]'
                  : 'bg-[#e0e0e0] text-[#a0a0a0] cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Verificando...' : 'Continuar'}
            </Button>
          </form>

          <div className="mt-3 text-center">
            <span className="text-xs text-[#4a4a6a]">
              ¿No tienes una cuenta?{' '}
            </span>
            <Button
              variant="link"
              className="p-0 text-xs font-bold text-[#1a1a3e] hover:underline"
              onClick={() =>
                navigate({
                  to: '/welcome',
                  search: { redirect: redirect || '' },
                })
              }
            >
              Regístrate
            </Button>
          </div>
        </>
      ) : (
        <>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-[#1a1a3e]">
            Crear cuenta
          </h1>
          <p className="mb-6 text-sm text-[#4a4a6a]">
            Ingresa tu nombre para completar el registro
          </p>

          <form
            className="w-full max-w-sm rounded-3xl border border-white/60 bg-blue-50/90 p-6 shadow-[0_20px_45px_-28px_rgba(26,26,62,0.45)] backdrop-blur-xl"
            onSubmit={handleNameSubmit}
          >
            <Label className="mb-2 block text-sm text-[#1a1a3e]">
              Nombre completo
            </Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Tu nombre"
              className="w-full max-w-xl rounded-2xl border-2 bg-white px-4 py-3.5 transition-colors focus:border-[#6b5b9a] focus:outline-none"
              autoFocus
            />
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

            <Button
              size="lg"
              type="submit"
              disabled={!name || isLoading}
              className={`mt-5 w-full !h-14 rounded-2xl py-4 text-base font-medium transition-all ${
                name && !isLoading
                  ? 'text-white hover:bg-[#2a2a5e]'
                  : 'bg-[#e0e0e0] text-[#a0a0a0] cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="mt-2 w-full rounded-2xl text-[#4a4a6a] hover:text-[#1a1a3e]"
              onClick={goBackToEmail}
            >
              Volver
            </Button>
          </form>
        </>
      )}
    </GradientLayout>
  );
}
