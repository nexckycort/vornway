'use client';

import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ChevronRight, LogOut, Mail, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BottomNav } from '~/components/bottom-nav';
import { GradientLayout } from '~/components/gradient-layout';
import { logoutFn } from '~/server/auth';
import { updateProfileName } from './-actions/update-profile-name';

export const Route = createFileRoute('/_authed/profile/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.name ?? '');
  const [displayName, setDisplayName] = useState(user?.name ?? 'Usuario');

  const isGuest = user?.isAnonymous ?? false;
  const userName = displayName;
  const userEmail = user?.email ?? 'Sin correo';
  const userInitial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!user?.name) return;
    setDisplayName(user.name);
    setNameDraft(user.name);
  }, [user?.name]);

  const updateNameMutation = useMutation({
    mutationFn: updateProfileName,
    onSuccess: (result) => {
      if (!result.success) return;
      const nextName = result.name ?? nameDraft.trim();
      setDisplayName(nextName);
      setNameDraft(nextName);
      setShowEditNameModal(false);
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutFn();
      router.navigate({ to: '/login', search: { redirect: '/' } });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <GradientLayout className="pb-20">
      <div className="min-h-screen">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="native-surface-muted flex items-center justify-between px-4 py-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#1a1a3e]">Mi perfil</h1>
            {isGuest && (
              <span className="rounded-full bg-[#1a1a3e] px-3 py-1.5 text-sm font-medium text-white">
                Modo Invitado
              </span>
            )}
          </div>
        </div>

        {/* Avatar and Name */}
        <div className="flex flex-col items-center py-6">
          <div className="w-24 h-24 bg-[#d8f4f4] rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl font-semibold text-[#1a1a3e]">
              {userInitial}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-[#1a1a3e]">{userName}</h2>
          {!isGuest && <p className="text-gray-500 mt-1">{userEmail}</p>}
        </div>

        {/* Guest Mode: Auth Options */}
        {isGuest && (
          <div className="px-6">
            <p className="text-center text-gray-500 mb-6 px-4">
              Inicia sesión o regístrate para usar Splitway en varios
              dispositivos y recibir notificaciones.
            </p>

            <div className="space-y-3 mb-8">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 py-4 border border-gray-200 rounded-xl bg-white opacity-50"
                disabled
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <span className="font-medium text-[#1a1a3e]">
                  Continuar con Apple ID
                </span>
              </button>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 py-4 border border-gray-200 rounded-xl bg-white opacity-50"
                disabled
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-medium text-[#1a1a3e]">
                  Continuar con Google
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  router.navigate({
                    to: '/login',
                    search: { redirect: '/profile' },
                  })
                }
                className="w-full flex items-center justify-center gap-3 py-4 border border-gray-200 rounded-xl bg-white"
              >
                <Mail className="w-5 h-5 text-[#1a1a3e]" />
                <span className="font-medium text-[#1a1a3e]">
                  Continuar con correo electrónico
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Personal Data */}
        <div className="px-6">
          <h3 className="text-sm font-semibold text-[#1a1a3e] mb-3">
            Mis datos personales
          </h3>
          <div className="bg-white rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowEditNameModal(true)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <p className="font-medium text-[#1a1a3e]">Nombre</p>
                <p className="text-gray-500 text-sm">{userName}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            {!isGuest && (
              <>
                <div className="h-px bg-gray-100 mx-4" />
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div>
                    <p className="font-medium text-[#1a1a3e]">
                      Correo electrónico
                    </p>
                    <p className="text-gray-500 text-sm">{userEmail}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Settings */}
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
                {!isGuest && <p className="text-gray-500 text-sm">Activo</p>}
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            {!isGuest && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Support (only logged in) */}
        {!isGuest && (
          <div className="px-6 mt-6 pb-6">
            <h3 className="text-sm font-semibold text-[#1a1a3e] mb-3">
              Soporte
            </h3>
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
        )}

        {/* Logout / Delete session */}
        <div className="px-6 pb-6">
          <button
            type="button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 bg-white rounded-2xl text-red-500 font-medium disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" />
            {isLoggingOut
              ? isGuest
                ? 'Eliminando sesión...'
                : 'Cerrando sesión...'
              : isGuest
                ? 'Eliminar sesión'
                : 'Cerrar sesión'}
          </button>
        </div>
      </div>

      <BottomNav />

      {showEditNameModal && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowEditNameModal(false)}
            aria-label="Cerrar modal"
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#1a1a3e]">
                  Editar nombre
                </h2>
                <button
                  type="button"
                  onClick={() => setShowEditNameModal(false)}
                  className="w-8 h-8 flex items-center justify-center"
                >
                  <ChevronRight className="w-5 h-5 text-gray-500 rotate-90" />
                </button>
              </div>

              <input
                type="text"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="Tu nombre"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
              />

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setShowEditNameModal(false)}
                  className="flex-1 py-3 text-[#1a1a3e] font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateNameMutation.mutate({
                      data: {
                        name: nameDraft,
                      },
                    })
                  }
                  disabled={
                    updateNameMutation.isPending ||
                    nameDraft.trim().length === 0
                  }
                  className="flex-1 py-3 bg-[#4040b0] text-white font-medium rounded-xl disabled:opacity-60"
                >
                  {updateNameMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              {updateNameMutation.data?.error ? (
                <p className="text-red-500 text-sm mt-3">
                  {updateNameMutation.data.error}
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}
    </GradientLayout>
  );
}
