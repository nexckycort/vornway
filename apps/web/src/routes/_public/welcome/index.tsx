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
    <GradientLayout className="flex flex-col items-center justify-center px-6">
      <div className="mb-4">
        <img src="/logo.svg" alt="logo" className="w-20 h-20" />
      </div>

      <h1 className="text-base font-bold text-[#1a1a3e] mb-1">
        Bienvenido a Splitway
      </h1>
      <p className="text-[#4a4a6a] text-xs mb-4">
        ¿Cómo quieres que te llamemos?
      </p>

      <div className="w-full max-w-sm bg-[#f2f4ff] backdrop-blur-sm rounded-lg p-6 shadow-sm">
        <Label className="block text-[#1a1a3e] text-base mb-2">Tu nombre</Label>
        <Input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full max-w-xl px-4 py-3 rounded-xl border-2 bg-white focus:outline-none focus:border-[#6b5b9a] transition-colors"
          autoFocus
        />

        <Button
          size="lg"
          disabled={!nombre.trim()}
          onClick={async () => {
            setLocalUser({ name: nombre.trim() });
            await router.invalidate();
            navigate({ to: '/' });
          }}
          className={`w-full mt-4 !h-14 py-4 text-base font-medium transition-all ${
            nombre.trim()
              ? 'text-white hover:bg-[#2a2a5e]'
              : 'bg-[#e0e0e0] text-[#a0a0a0] cursor-not-allowed'
          }`}
        >
          Continuar
        </Button>
      </div>
      <div className="mt-2 text-center">
        <span className="text-[#4a4a6a] text-xs">¿Ya tienes una cuenta? </span>
        <Button
          variant="link"
          className="text-[#1a1a3e] text-xs font-bold hover:underline"
        >
          Iniciar Sesión
        </Button>
      </div>
    </GradientLayout>
  );
}
