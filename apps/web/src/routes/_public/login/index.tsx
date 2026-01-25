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
    <GradientLayout className="flex flex-col items-center justify-center px-6">
      <div className="mb-4">
        <img src="/logo.svg" alt="logo" className="w-20 h-20" />
      </div>

      {step === 'email' ? (
        <>
          <h1 className="text-base font-bold text-[#1a1a3e] mb-1">
            Bienvenido a SplitWay
          </h1>
          <p className="text-[#4a4a6a] text-xs mb-4">
            Ingresa tu correo electrónico para continuar
          </p>

          <form
            className="w-full max-w-sm bg-blue-50 backdrop-blur-sm rounded-lg p-6 shadow-sm"
            onSubmit={handleEmailSubmit}
          >
            <Label className="block text-[#1a1a3e] text-base mb-2">
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
              className="w-full max-w-xl px-4 py-3 rounded-xl border-2 bg-white focus:outline-none focus:border-[#6b5b9a] transition-colors"
              autoFocus
            />
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

            <Button
              size="lg"
              type="submit"
              disabled={!email || isLoading}
              className={`w-full mt-4 !h-14 py-4 text-base font-medium transition-all ${
                email && !isLoading
                  ? 'text-white hover:bg-[#2a2a5e]'
                  : 'bg-[#e0e0e0] text-[#a0a0a0] cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Verificando...' : 'Continuar'}
            </Button>
          </form>

          <div className="mt-2 text-center">
            <span className="text-[#4a4a6a] text-xs">
              ¿No tienes una cuenta?{' '}
            </span>
            <Button
              variant="link"
              className="text-[#1a1a3e] text-xs font-bold hover:underline p-0"
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
          <h1 className="text-base font-bold text-[#1a1a3e] mb-1">
            Crear cuenta
          </h1>
          <p className="text-[#4a4a6a] text-xs mb-4">
            Ingresa tu nombre para completar el registro
          </p>

          <form
            className="w-full max-w-sm bg-blue-50 backdrop-blur-sm rounded-lg p-6 shadow-sm"
            onSubmit={handleNameSubmit}
          >
            <Label className="block text-[#1a1a3e] text-base mb-2">
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
              className="w-full max-w-xl px-4 py-3 rounded-xl border-2 bg-white focus:outline-none focus:border-[#6b5b9a] transition-colors"
              autoFocus
            />
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

            <Button
              size="lg"
              type="submit"
              disabled={!name || isLoading}
              className={`w-full mt-4 !h-14 py-4 text-base font-medium transition-all ${
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
              className="w-full mt-2 text-[#4a4a6a] hover:text-[#1a1a3e]"
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
