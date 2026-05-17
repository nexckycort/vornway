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

function RouteComponent() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<
    'unsupported' | 'permission-required' | 'enabled' | 'blocked'
  >('permission-required');
  const [isEnablingNotifications, setIsEnablingNotifications] =
    useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );

  const userName = auth.user?.name?.trim() || 'Usuario';
  const userEmail = auth.user?.email?.trim() || 'Sin correo';
  const userImage = auth.user?.image ?? null;
  const notificationLabel =
    notificationStatus === 'unsupported'
      ? 'No compatible'
      : notificationStatus === 'permission-required'
        ? 'Desactivadas'
        : notificationStatus === 'enabled'
          ? 'Activadas en este navegador'
          : 'Bloqueadas';

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
    setIsEnablingNotifications(true);
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
      setIsEnablingNotifications(false);
    }
  }

  async function handleDisableNotifications() {
    setIsEnablingNotifications(true);
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
      setIsEnablingNotifications(false);
    }
  }

  return (
    <main className="flex h-dvh items-center justify-center overflow-hidden bg-background px-4 py-6">
      <section className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              className="size-11 rounded-2xl border border-border/60 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="size-5" />
            </div>
          )}
          <div>
            <p className="text-base font-semibold leading-5 text-foreground">
              Mi perfil
            </p>
            <p className="text-xs text-muted-foreground">
              Información de tu cuenta
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-[24px] border border-border/60 bg-muted/20 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Nombre
            </p>
              <p className="mt-1 text-lg font-semibold leading-6 text-foreground">
                {userName}
              </p>
            </div>

          <div className="h-px bg-border/70" />

          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Correo
            </p>
            <p className="mt-1 break-words text-base leading-6 text-foreground">
              {userEmail}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-[24px] border border-border/60 bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bell className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Notificaciones
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {notificationLabel}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {notificationStatus === 'unsupported' &&
                  'Tu navegador no soporta Web Push.'}
                {notificationStatus === 'permission-required' &&
                  'Las notificaciones están desactivadas en este navegador.'}
                {notificationStatus === 'enabled' &&
                  'Las notificaciones están activadas en este navegador.'}
                {notificationStatus === 'blocked' &&
                  'Debes habilitar las notificaciones desde la configuración del navegador o del sitio.'}
              </p>
            </div>
          </div>

          {notificationStatus === 'blocked' ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>
                Si las bloqueaste, debes habilitarlas manualmente en la
                configuración del navegador para este sitio.
              </p>
            </div>
          ) : null}

          {notificationError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {notificationError}
            </div>
          ) : null}

          {notificationStatus === 'enabled' ? (
            <Button
              type="button"
              onClick={handleDisableNotifications}
              disabled={isEnablingNotifications}
              className="h-12 w-full rounded-full bg-muted text-base font-medium text-foreground hover:bg-muted/80"
            >
              {isEnablingNotifications
                ? 'Desactivando...'
                : 'Desactivar notificaciones'}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleEnableNotifications}
              disabled={
                isEnablingNotifications ||
                notificationStatus === 'unsupported' ||
                notificationStatus === 'blocked'
              }
              className="h-12 w-full rounded-full bg-primary text-base font-medium text-white hover:bg-primary/90"
            >
              {isEnablingNotifications
                ? 'Activando...'
                : 'Activar notificaciones'}
            </Button>
          )}
        </div>

        <Button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mt-6 h-12 w-full rounded-full bg-destructive text-base font-medium text-white shadow-[0_10px_30px_rgba(239,68,68,0.22)] hover:bg-destructive/90"
        >
          <LogOut className="mr-2 size-4" />
          {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </Button>
      </section>
    </main>
  );
}
