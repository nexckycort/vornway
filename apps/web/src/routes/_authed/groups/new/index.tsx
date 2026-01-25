/** biome-ignore-all lint/a11y/noLabelWithoutControl: <explanation> */
/** biome-ignore-all lint/a11y/useButtonType: <explanation> */

import {
  ChevronDown,
  LayoutGrid,
  Pizza,
  Plane,
  Sofa,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { StepLayout } from '~/components/layouts/step-layout';

const categorias = [
  { id: 'viajes', label: 'Viajes', icon: Plane },
  { id: 'roomates', label: 'Roomates', icon: Sofa },
  { id: 'salidas', label: 'Salidas', icon: Pizza },
  { id: 'otros', label: 'Otros', icon: LayoutGrid },
];

const monedas = [
  { code: 'EUR', label: 'Euro' },
  { code: 'COP', label: 'Peso colombiano' },
  { code: 'USD', label: 'Dolar estadounidense' },
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
    <StepLayout
      title="Crear grupo"
      currentStep={1}
      totalSteps={2}
      footer={
        <button
          type="button"
          disabled={!nombre.trim()}
          onClick={() =>
            router.navigate({
              to: '/groups/new/participants',
              search: {
                name: nombre.trim(),
                currency: moneda,
                category: categoria || '',
              },
            })
          }
          className={`w-full py-4 rounded-xl font-semibold text-white transition-colors ${
            nombre.trim() ? 'bg-[#4040b0]' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Continuar
        </button>
      }
    >
      <div className="space-y-6">
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
              <HugeiconsIcon
                icon={ChevronDown}
                className="w-5 h-5 text-gray-500"
              />
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
                    <HugeiconsIcon icon={Icon} className="w-5 h-5" />
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
    </StepLayout>
  );
}
