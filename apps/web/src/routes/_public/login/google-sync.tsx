import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { GradientLayout } from '~/components/gradient-layout';
import { syncGoogleSessionFn } from '~/server/auth';

export const Route = createFileRoute('/_public/login/google-sync')({
  validateSearch: (search: { redirect?: string }) => {
    return search;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { redirect } = Route.useSearch();
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const result = await syncGoogleSessionFn();
        if (!result.success) {
          setError(result.error || 'No se pudo completar el inicio de sesión.');
          return;
        }

        window.location.replace(redirect || '/');
      } catch (err) {
        console.error('Error sincronizando sesión de Google:', err);
        setError('No se pudo completar el inicio de sesión.');
      }
    };

    void run();
  }, [redirect]);

  return (
    <GradientLayout className="native-enter">
      <div className="flex min-h-dvh flex-col items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-3xl border border-white/60 bg-blue-50/90 p-6 text-center shadow-[0_20px_45px_-28px_rgba(26,26,62,0.45)] backdrop-blur-xl">
          <h1 className="mb-2 text-xl font-bold tracking-tight text-[#1a1a3e]">
            Completando inicio de sesión
          </h1>
          {error
            ? (
              <p className="text-sm text-red-500">{error}</p>
            )
            : (
              <p className="text-sm text-[#4a4a6a]">
                Espera un momento mientras terminamos la autenticación.
              </p>
            )}
        </div>
      </div>
    </GradientLayout>
  );
}
