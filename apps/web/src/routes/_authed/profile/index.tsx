'use client';

import { createFileRoute } from '@tanstack/react-router';
import { ChevronRight, Sun } from 'lucide-react';
import { BottomNav } from '~/components/bottom-nav';
import { GradientLayout } from '~/components/gradient-layout';

export const Route = createFileRoute('/_authed/profile/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useRouteContext();

  const userName = user?.name ?? 'Usuario';
  const userEmail = user?.email ?? 'Sin correo';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <GradientLayout className="pb-20">
      <div className="min-h-screen">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1a1a3e]">Mi perfil</h1>
        </div>

        {/* Avatar and Name */}
        <div className="flex flex-col items-center py-6">
          <div className="w-24 h-24 bg-[#d8f4f4] rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl font-semibold text-[#1a1a3e]">
              {userInitial}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-[#1a1a3e]">{userName}</h2>
          <p className="text-gray-500 mt-1">{userEmail}</p>
        </div>

        {/* Personal Data Section */}
        <div className="px-6">
          <h3 className="text-sm font-semibold text-[#1a1a3e] mb-3">
            Mis datos personales
          </h3>
          <div className="bg-white rounded-2xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <p className="font-medium text-[#1a1a3e]">Nombre</p>
                <p className="text-gray-500 text-sm">{userName}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <div className="h-px bg-gray-100 mx-4" />
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <p className="font-medium text-[#1a1a3e]">Correo electrónico</p>
                <p className="text-gray-500 text-sm">{userEmail}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Settings Section */}
        <div className="px-6 mt-6">
          <h3 className="text-sm font-semibold text-[#1a1a3e] mb-3">
            Ajustes y preferencias
          </h3>
          <div className="bg-white rounded-2xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <p className="font-medium text-[#1a1a3e]">Idioma</p>
                <p className="text-gray-500 text-sm">{'Español (Colombia)'}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <div className="h-px bg-gray-100 mx-4" />

            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <p className="font-medium text-[#1a1a3e]">Notificaciones</p>
                <p className="text-gray-500 text-sm">Activo</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <div className="h-px bg-gray-100 mx-4" />
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <p className="font-medium text-[#1a1a3e]">Apariencia</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-gray-500 text-sm">Modo Claro</p>
                  <Sun className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="px-6 mt-6 pb-6">
          <h3 className="text-sm font-semibold text-[#1a1a3e] mb-3">Soporte</h3>
          <div className="bg-white rounded-2xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <p className="font-medium text-[#1a1a3e]">Centro de ayuda</p>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <div className="h-px bg-gray-100 mx-4" />
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <p className="font-medium text-[#1a1a3e]">Contactar soporte</p>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </GradientLayout>
  );
}
