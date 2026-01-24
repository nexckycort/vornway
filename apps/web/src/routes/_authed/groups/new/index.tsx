import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  ChevronDown,
  ChevronLeft,
  LayoutGrid,
  Pizza,
  Plane,
  Sofa,
} from 'lucide-react';
import { useState } from 'react';
import { GradientLayout } from '~/components/gradient-layout';

const categorias = [
  { id: 'viajes', label: 'Viajes', icon: Plane },
  { id: 'roomates', label: 'Roomates', icon: Sofa },
  { id: 'salidas', label: 'Salidas', icon: Pizza },
  { id: 'otros', label: 'Otros', icon: LayoutGrid },
];

const monedas = [
  { code: 'USD', label: 'Dolar estadounidense' },
  { code: 'EUR', label: 'Euro' },
  { code: 'MXN', label: 'Peso mexicano' },
  { code: 'ARS', label: 'Peso argentino' },
  { code: 'COP', label: 'Peso colombiano' },
];

export const Route = createFileRoute('/_authed/groups/new/')({
  component: CreateGroupPage,
});

function CreateGroupPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [moneda, setMoneda] = useState('USD');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [showMonedaSelect, setShowMonedaSelect] = useState(false);

  const monedaSeleccionada = monedas.find((m) => m.code === moneda);

  return (
    <GradientLayout className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <button onClick={() => router.history.back()} className="p-1">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-semibold text-[#1a1a3e]">Crear grupo</h1>
        </div>
        <span className="text-gray-500 text-sm">Paso 1 de 2</span>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-1 px-4 mb-6">
        <div className="flex-1 h-1.5 bg-[#4040b0] rounded-full" />
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full" />
      </div>

      {/* Form */}
      <div className="flex-1 px-4 space-y-6">
        {/* Nombre del grupo */}
        <div>
          <label className="block text-[#1a1a3e] font-medium mb-2">
            Nombre del grupo
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Viaje a Madrid"
            className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-[#1a1a3e] placeholder:text-gray-400 focus:outline-none focus:border-[#6060c0]"
          />
        </div>

        {/* Moneda */}
        <div>
          <label className="block text-[#1a1a3e] font-medium mb-2">
            Moneda
          </label>
          <div className="relative">
            <button
              onClick={() => setShowMonedaSelect(!showMonedaSelect)}
              className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-[#1a1a3e] flex items-center justify-between focus:outline-none focus:border-[#6060c0]"
            >
              <span>
                {moneda} - {monedaSeleccionada?.label}
              </span>
              <ChevronDown className="w-5 h-5 text-gray-500" />
            </button>

            {showMonedaSelect && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                {monedas.map((m) => (
                  <button
                    key={m.code}
                    onClick={() => {
                      setMoneda(m.code);
                      setShowMonedaSelect(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                      moneda === m.code ? 'bg-[#f0ebf5]' : ''
                    }`}
                  >
                    {m.code} - {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-[#1a1a3e] font-medium mb-3">
            {'Categoría (Opcional)'}
          </label>
          <div className="flex gap-4">
            {categorias.map((cat) => {
              const Icon = cat.icon;
              const isSelected = categoria === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoria(isSelected ? null : cat.id)}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[#1a8a9a] text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-sm ${isSelected ? 'text-[#1a8a9a] font-medium' : 'text-gray-600'}`}
                  >
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="p-4 pb-8">
        <button
          disabled={!nombre.trim()}
          onClick={() => router.push('/crear-grupo/paso-2')}
          className={`w-full py-4 rounded-xl font-semibold text-white transition-colors ${
            nombre.trim() ? 'bg-[#4040b0]' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Continuar
        </button>
      </div>
    </GradientLayout>
  );
}
