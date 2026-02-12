import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { useState } from 'react';
import { GradientLayout } from '~/components/gradient-layout';
import { setLocalUser } from '~/lib/local-user';

export const Route = createFileRoute('/_public/welcome/')({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const navigate = Route.useNavigate();

  const [nombre, setNombre] = useState('');

  return (
    <GradientLayout className="native-enter flex flex-col items-center justify-center px-5 pb-8">
      <div className="mb-5">
        <img src="/logo.svg" alt="logo" className="h-20 w-20 drop-shadow-sm" />
      </div>

      <h1 className="mb-1 text-2xl font-bold tracking-tight text-[#1a1a3e]">
        Bienvenido a Splitway
      </h1>
      <p className="mb-6 text-sm text-[#4a4a6a]">
        ¿Cómo quieres que te llamemos?
      </p>

      <form
        className="w-full max-w-sm rounded-3xl border border-white/60 bg-blue-50/90 p-6 shadow-[0_20px_45px_-28px_rgba(26,26,62,0.45)] backdrop-blur-xl"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nombre.trim()) return;
          setLocalUser({ name: nombre.trim() });
          await router.invalidate();
          navigate({ to: '/' });
        }}
      >
        <Label className="mb-2 block text-sm text-[#1a1a3e]">Tu nombre</Label>
        <Input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full max-w-xl rounded-2xl border-2 bg-white px-4 py-3.5 transition-colors focus:border-[#6b5b9a] focus:outline-none"
          autoFocus
        />

        <Button
          size="lg"
          type="submit"
          disabled={!nombre.trim()}
          className={`mt-5 w-full !h-14 rounded-2xl py-4 text-base font-medium transition-all ${
            nombre.trim()
              ? 'text-white hover:bg-[#2a2a5e]'
              : 'bg-[#e0e0e0] text-[#a0a0a0] cursor-not-allowed'
          }`}
        >
          Continuar
        </Button>
      </form>
      <div className="mt-3 text-center">
        <span className="text-[#4a4a6a] text-xs">¿Ya tienes una cuenta? </span>
        <Button
          variant="link"
          className="text-xs font-bold text-[#1a1a3e] hover:underline"
        >
          Iniciar Sesión
        </Button>
      </div>
    </GradientLayout>
  );
}
