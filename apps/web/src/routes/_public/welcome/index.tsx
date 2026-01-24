import { createFileRoute, useRouter } from '@tanstack/react-router';
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
      {/* Logo */}
      <div className="mb-6">
        <div className="w-20 h-20 bg-[#1a1a3e] rounded-full flex items-center justify-center">
          <svg
            viewBox="0 0 40 40"
            className="w-10 h-10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 8C14 8 10 12 10 16C10 18 11 20 13 21C15 22 18 22 20 22C22 22 24 22 26 23C28 24 29 26 29 28C29 32 25 36 19 36"
              stroke="#00d4d4"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="12" cy="12" r="3" fill="#00d4d4" />
            <circle cx="28" cy="32" r="3" fill="#00d4d4" />
          </svg>
        </div>
      </div>

      {/* Título */}
      <h1 className="text-2xl font-bold text-[#1a1a3e] mb-2">
        Bienvenido a Splitway
      </h1>
      <p className="text-[#4a4a6a] mb-8">¿Cómo quieres que te llamemos?</p>

      {/* Card del formulario */}
      <div className="w-full max-w-sm bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-sm">
        <label className="block text-[#1a1a3e] text-lg mb-2">Tu nombre</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-[#8b7bb8] bg-white focus:outline-none focus:border-[#6b5b9a] transition-colors"
          placeholder=""
        />

        <button
          disabled={!nombre.trim()}
          onClick={async () => {
            setLocalUser({ name: nombre.trim() });
            await router.invalidate();
            navigate({ to: '/' });
          }}
          className={`w-full mt-4 py-4 rounded-xl text-lg font-medium transition-all ${
            nombre.trim()
              ? 'bg-[#1a1a3e] text-white hover:bg-[#2a2a5e]'
              : 'bg-[#e0e0e0] text-[#a0a0a0] cursor-not-allowed'
          }`}
        >
          Continuar
        </button>

        <div className="mt-6 text-center">
          <span className="text-[#4a4a6a]">¿Ya tienes una cuenta? </span>
          <button className="text-[#1a1a3e] font-semibold hover:underline">
            Iniciar Sesión
          </button>
        </div>
      </div>
    </GradientLayout>
  );
}
