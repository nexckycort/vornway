import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@workspace/ui/components/button';
import { GradientLayout } from '~/components/gradient-layout';

export function NotFound() {
  return (
    <GradientLayout className="native-enter">
      <div className="flex min-h-dvh items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-3xl border border-white/60 bg-white/85 p-6 text-center shadow-[0_20px_45px_-28px_rgba(26,26,62,0.45)] backdrop-blur-xl">
          <p className="mb-1 text-sm font-semibold tracking-wide text-[#6a6a86]">
            Error 404
          </p>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-[#1a1a3e]">
            Página no encontrada
          </h1>
          <p className="mb-5 text-sm text-[#4a4a6a]">
            La ruta que buscas no existe o fue movida.
          </p>
          <Link to="/" className={buttonVariants({ className: 'h-12 w-full rounded-2xl' })}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </GradientLayout>
  );
}
