import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Bell, LogOut, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '#/components/ui/button';
import { useAuth } from '#/contexts/auth/use-auth';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationStatus,
} from '#/lib/push-notifications';

export const Route = createFileRoute('/_authed/profile/')({
  component: RouteComponent,
});

type NotificationStatus =
  | 'unsupported'
  | 'permission-required'
  | 'enabled'
  | 'blocked';

function RouteComponent() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationStatus>('permission-required');
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );

  const userName = auth.user?.name?.trim() || 'Usuario';
  const userEmail = auth.user?.email?.trim() || 'Sin correo';
  const userImage = auth.user?.image ?? null;
  const notificationLabel = getNotificationLabel(notificationStatus);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const status = await getPushNotificationStatus();
        if (active) {
          setNotificationStatus(status);
        }
      } catch {
        if (active) {
          setNotificationStatus('permission-required');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await auth.logout();
      await navigate({
        to: '/login',
        search: { redirect: '/login' },
        replace: true,
      });
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleEnableNotifications() {
    setIsUpdatingNotifications(true);
    setNotificationError(null);

    try {
      const status = await enablePushNotifications();
      setNotificationStatus(status);
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : 'No se pudieron activar las notificaciones',
      );
    } finally {
      setIsUpdatingNotifications(false);
    }
  }

  async function handleDisableNotifications() {
    setIsUpdatingNotifications(true);
    setNotificationError(null);

    try {
      const status = await disablePushNotifications();
      setNotificationStatus(status);
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : 'No se pudieron desactivar las notificaciones',
      );
    } finally {
      setIsUpdatingNotifications(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col px-4 pb-28 pt-6">
        <header className="mb-5">
          <h1 className="mt-2 text-3xl font-semibold leading-9 text-[#0f172a]">
            Mi perfil
          </h1>
        </header>

        <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {userImage ? (
                <img
                  src={userImage}
                  alt={userName}
                  className="size-14 rounded-3xl object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-3xl bg-[#f1f5f9] text-primary">
                  <UserRound className="size-6" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#0f172a]">{userName}</p>
              <p className="mt-1 truncate text-sm text-[#64748b]">
                {userEmail}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bell className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#0f172a]">
                  Notificaciones
                </p>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    notificationStatus === 'enabled'
                      ? 'bg-emerald-50 text-emerald-700'
                      : notificationStatus === 'blocked'
                        ? 'bg-amber-50 text-amber-700'
                        : notificationStatus === 'unsupported'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {notificationLabel}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-[#64748b]">
                {notificationStatus === 'unsupported' &&
                  'Tu navegador no soporta Web Push.'}
                {notificationStatus === 'permission-required' &&
                  'Actívalas para recibir avisos cuando te agreguen a un grupo o creen un gasto.'}
                {notificationStatus === 'enabled' &&
                  'Están activas en este navegador. Recibirás avisos del grupo aquí.'}
                {notificationStatus === 'blocked' &&
                  'Las bloqueaste para este sitio. Debes reactivarlas desde la configuración del navegador.'}
              </p>
            </div>
          </div>

          {notificationStatus === 'blocked' ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>
                Si quieres volver a recibir notificaciones, habilítalas en los
                permisos del sitio o del navegador.
              </p>
            </div>
          ) : null}

          {notificationError ? (
            <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {notificationError}
            </div>
          ) : null}

          <Button
            type="button"
            onClick={
              notificationStatus === 'enabled'
                ? handleDisableNotifications
                : handleEnableNotifications
            }
            disabled={
              isUpdatingNotifications ||
              notificationStatus === 'unsupported' ||
              notificationStatus === 'blocked'
            }
            className={`mt-4 h-12 w-full rounded-full text-base font-medium ${
              notificationStatus === 'enabled'
                ? 'bg-muted text-foreground hover:bg-muted/80'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            {isUpdatingNotifications
              ? notificationStatus === 'enabled'
                ? 'Desactivando...'
                : 'Activando...'
              : notificationStatus === 'enabled'
                ? 'Desactivar notificaciones'
                : 'Activar notificaciones'}
          </Button>
        </section>

        <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[#94a3b8]">
            Sesión
          </p>
          <p className="mt-1 text-sm leading-6 text-[#64748b]">
            Cerrar sesión quitará el acceso al contenido sincronizado en este
            dispositivo.
          </p>

          <Button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-4 h-12 w-full rounded-full bg-destructive text-base font-medium text-white shadow-[0_10px_30px_rgba(239,68,68,0.22)] hover:bg-destructive/90"
          >
            <LogOut className="mr-2 size-4" />
            {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </Button>
        </section>
      </div>
    </main>
  );
}

function getNotificationLabel(status: NotificationStatus) {
  if (status === 'unsupported') return 'No compatible';
  if (status === 'permission-required') return 'Desactivadas';
  if (status === 'enabled') return 'Activadas en este navegador';
  return 'Bloqueadas';
}
