import {
  Bell,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { BottomNav } from '~/components/bottom-nav';
import { GradientLayout } from '~/components/gradient-layout';

export const Route = createFileRoute('/_authed/(home)/')({
  component: HomePage,
});

function HomePage() {
  const { user } = Route.useRouteContext();
  const navigate = Route.useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  return (
    <GradientLayout>
      <div className="pb-24">
        {/* Header */}
        <header className="flex items-center justify-between px-6 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-[#1a1a3e]">
            Hola, {user.name}
          </h1>
          <button className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center">
            <HugeiconsIcon icon={Bell} className="w-5 h-5 text-[#1a1a3e]" />
          </button>
        </header>

        {/* Summary Cards */}
        <div className="px-6 mb-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Total gastado */}
              <div className="bg-white rounded-2xl p-4 row-span-2">
                <div className="w-10 h-10 bg-[#e8e4f8] rounded-xl flex items-center justify-center mb-8">
                  <div className="flex flex-col gap-0.5">
                    <div className="w-4 h-0.5 bg-[#6060c0] rounded-full" />
                    <div className="w-4 h-0.5 bg-[#6060c0] rounded-full" />
                  </div>
                </div>
                <p className="text-gray-500 text-sm">Total gastado</p>
                <p className="text-2xl font-bold text-[#1a1a3e]">$0</p>
              </div>

              {/* Debes */}
              <div className="bg-white rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Debes</p>
                    <p className="text-xl font-bold text-[#1a1a3e]">$0</p>
                  </div>
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-red-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="7" y1="7" x2="17" y2="17" />
                      <polyline points="17 7 17 17 7 17" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Te deben */}
              <div className="bg-white rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Te deben</p>
                    <p className="text-xl font-bold text-[#1a1a3e]">$0</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-green-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="17" y1="17" x2="7" y2="7" />
                      <polyline points="7 17 7 7 17 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tus grupos */}
        <div className="px-6">
          <h2 className="text-lg font-semibold text-[#1a1a3e] mb-4">
            Tus grupos
          </h2>

          {/* Search and Filter */}
          <div className="flex gap-3 mb-8">
            <div className="flex-1 relative">
              <HugeiconsIcon
                icon={Search}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              />
              <input
                type="text"
                placeholder="Buscar grupos o gastos"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-100 focus:outline-none focus:border-[#8b7bb8] transition-colors"
              />
            </div>
            <button className="w-12 h-12 rounded-xl border-2 border-[#6060c0] flex items-center justify-center bg-white">
              <HugeiconsIcon
                icon={SlidersHorizontal}
                className="w-5 h-5 text-[#6060c0]"
              />
            </button>
          </div>

          {/* Empty State */}
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 bg-[#8080d0] rounded-2xl rotate-[-8deg] flex items-center justify-center mb-6 shadow-lg">
              <HugeiconsIcon icon={Users} className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-[#1a1a3e] mb-2">
              No tienes grupos aún
            </h3>
            <p className="text-gray-500">Crea uno es menos de 5 Segundos</p>

            {/* Arrow pointing to FAB */}
            <div className="relative w-full h-32 mt-4">
              <svg
                className="absolute right-8 bottom-0 w-32 h-32"
                viewBox="0 0 128 128"
                fill="none"
              >
                <path
                  d="M20 20 Q60 100 100 80"
                  stroke="#8080d0"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M95 70 L100 80 L90 82"
                  stroke="#8080d0"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* FAB */}
        <button
          onClick={() => setShowOptions(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-[#4040b0] rounded-2xl flex items-center justify-center shadow-lg shadow-[#4040b0]/30"
        >
          <HugeiconsIcon icon={Plus} className="w-7 h-7 text-white" />
        </button>
      </div>

      {/* Bottom Sheet Modal */}
      {showOptions && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowOptions(false)}
          />

          {/* Bottom Sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Options */}
            <div className="px-6 pb-8 space-y-2">
              {/* Crear grupo */}
              <button
                onClick={() => {
                  setShowOptions(false);
                  navigate({ to: '/groups/new' });
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-[#e8e4f8] rounded-full flex items-center justify-center">
                  <HugeiconsIcon
                    icon={Plus}
                    className="w-5 h-5 text-[#6060c0]"
                  />
                </div>
                <div>
                  <p className="font-semibold text-[#1a1a3e]">Crear grupo</p>
                  <p className="text-sm text-gray-500">
                    Inicia un nuevo grupo desde cero
                  </p>
                </div>
              </button>

              {/* Unirse a grupo */}
              <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left">
                <div className="w-12 h-12 bg-[#e8e4f8] rounded-full flex items-center justify-center">
                  <HugeiconsIcon
                    icon={Bell}
                    className="w-5 h-5 text-[#6060c0]"
                  />
                </div>
                <div>
                  <p className="font-semibold text-[#1a1a3e]">
                    {'¿Te invitaron a un grupo?'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Usa un enlace o código QR para unirte a un grupo
                  </p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </GradientLayout>
  );
}
