import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Bell,
  CalendarClock,
  ChevronRight,
  LaptopMinimal,
  LogOut,
  QrCode,
  Shield,
  Smartphone,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { useAuth } from '#/contexts/auth/use-auth';
import { listSessions, revokeSession, useSession } from '#/lib/auth-client';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationStatus,
} from '#/lib/push-notifications';
import { QrScannerDialog } from './-components/qr-scanner-dialog';

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
  const queryClient = useQueryClient();
  const auth = useAuth();
  const { data: currentSession } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationStatus>('permission-required');
  const [showSessionsDialog, setShowSessionsDialog] = useState(false);
  const [showQrScannerDialog, setShowQrScannerDialog] = useState(false);
  const [showDisableNotificationsDialog, setShowDisableNotificationsDialog] =
    useState(false);

  const userName = auth.user?.name?.trim() || 'Usuario';
  const userEmail = auth.user?.email?.trim() || 'Sin correo';
  const userImage = auth.user?.image ?? null;
  const notificationLabel = getNotificationLabel(notificationStatus);
  const currentSessionId = currentSession?.session.id ?? null;

  const sessionsQuery = useQuery({
    queryKey: ['profile-sessions'],
    queryFn: async () => {
      const result = await listSessions();
      if (result.error) {
        throw new Error('No se pudieron cargar las sesiones');
      }
      return result.data ?? [];
    },
    staleTime: 30_000,
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (token: string) => {
      const result = await revokeSession({ token });
      if (result.error) {
        throw new Error('No se pudo eliminar la sesión');
      }
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile-sessions'] });
      toast.success('Sesión eliminada correctamente');
    },
    onError: () => {
      toast.error('No se pudo eliminar la sesión');
    },
  });

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

  const sessions = useMemo(
    () => {
      const list = sessionsQuery.data ?? [];
      if (!currentSessionId) return list;

      const current = list.find((session) => session.id === currentSessionId);
      if (!current) return list;

      return [
        current,
        ...list.filter((session) => session.id !== currentSessionId),
      ];
    },
    [currentSessionId, sessionsQuery.data],
  );

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
    try {
      const status = await enablePushNotifications();
      setNotificationStatus(status);
    } catch {
      // Se mantiene silencioso para no bloquear el flujo del perfil.
    }
  }

  async function handleDisableNotifications() {
    try {
      const status = await disablePushNotifications();
      setNotificationStatus(status);
    } catch {
      // Se mantiene silencioso para no bloquear el flujo del perfil.
    }
  }

  async function handleRemoveCurrentSession() {
    await auth.logout();
    toast.success('Sesión cerrada correctamente');
    await navigate({
      to: '/login',
      search: { redirect: '/login' },
      replace: true,
    });
  }

  async function handleRemoveSession(sessionToken: string) {
    await revokeSessionMutation.mutateAsync(sessionToken);
  }

  return (
    <>
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
                <p className="text-sm font-semibold text-[#0f172a]">
                  {userName}
                </p>
                <p className="mt-1 truncate text-sm text-[#64748b]">
                  {userEmail}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <ProfileActionRow
              icon={<Bell className="size-5" />}
              title="Notificaciones"
              subtitle={notificationLabel}
              onClick={() => {
                if (notificationStatus === 'enabled') {
                  setShowDisableNotificationsDialog(true);
                  return;
                }

                void handleEnableNotifications();
              }}
              trailing={notificationStatus === 'enabled' ? 'Desactivar' : 'Activar'}
            />
            <ProfileActionRow
              icon={<Shield className="size-5" />}
              title="Seguridad"
              subtitle="Sesiones y acceso"
              onClick={() => setShowSessionsDialog(true)}
            />
            <ProfileActionRow
              icon={<QrCode className="size-5" />}
              title="Escanear QR"
              subtitle="Unirse a un grupo"
              onClick={() => setShowQrScannerDialog(true)}
            />
          </section>

          <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[#94a3b8]">
              Sesión principal
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

      <QrScannerDialog
        open={showQrScannerDialog}
        onOpenChange={setShowQrScannerDialog}
        onScanned={async (inviteCode) => {
          await navigate({
            to: '/i/$inviteCode',
            params: { inviteCode },
            replace: true,
          });
        }}
      />

      <Dialog
        open={showDisableNotificationsDialog}
        onOpenChange={setShowDisableNotificationsDialog}
      >
        <DialogContent className="max-w-[calc(100%-1rem)] rounded-[28px] p-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desactivar notificaciones</DialogTitle>
            <DialogDescription>
              Si las desactivas, dejarás de recibir avisos de gastos, cambios y
              movimientos del grupo en esta app.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 rounded-full"
              onClick={() => setShowDisableNotificationsDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-12 flex-1 rounded-full bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setShowDisableNotificationsDialog(false);
                void handleDisableNotifications();
              }}
            >
              Sí, desactivar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSessionsDialog} onOpenChange={setShowSessionsDialog}>
        <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-[28px] p-4 sm:max-w-md">
          <DialogHeader className="shrink-0">
            <DialogTitle>Sesiones abiertas</DialogTitle>
            <DialogDescription>
              Administra los dispositivos donde tienes sesión iniciada.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-3">
              {sessionsQuery.isLoading ? (
                <SessionSkeletonList />
              ) : sessions.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-5 text-sm text-[#64748b]">
                  No hay sesiones abiertas en este momento.
                </p>
              ) : (
                sessions.map((session) => {
                  const isCurrent = session.id === currentSessionId;
                  const deviceLabel = describeSession(session.userAgent);

                  return (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-white text-[#0f172a] shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
                          {isMobileSession(session.userAgent) ? (
                            <Smartphone className="size-4" />
                          ) : (
                            <LaptopMinimal className="size-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-[#0f172a]">
                              {deviceLabel}
                            </p>
                            {isCurrent ? (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                Esta sesión
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 flex items-center gap-1 text-xs text-[#64748b]">
                            <CalendarClock className="size-3.5 shrink-0" />
                            Inició {formatDateTime(session.createdAt)}
                          </p>
                          <p className="mt-1 text-xs text-[#64748b]">
                            Expira {formatDateTime(session.expiresAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="min-w-0 flex-1 truncate text-xs text-[#94a3b8]">
                          {session.userAgent ??
                            'Sin información del dispositivo'}
                        </p>
                        <Button
                          type="button"
                          variant={isCurrent ? 'secondary' : 'destructive'}
                          className="h-10 rounded-full px-4 text-sm"
                          disabled={
                            revokeSessionMutation.isPending || isLoggingOut
                          }
                          onClick={() => {
                            if (isCurrent) {
                              void handleRemoveCurrentSession();
                              return;
                            }

                            void handleRemoveSession(session.token);
                          }}
                        >
                          {isCurrent ? 'Cerrar esta sesión' : 'Eliminar'}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProfileActionRow({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  trailing?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-2xl px-2 py-3 text-left transition-colors hover:bg-[#f8fafc]"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0f172a]">{title}</p>
          <p className="text-sm text-[#64748b]">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {trailing ? (
          <span className="text-xs font-medium text-[#64748b]">{trailing}</span>
        ) : null}
        <ChevronRight className="size-4 text-[#94a3b8]" />
      </div>
    </button>
  );
}

function describeSession(userAgent?: string | null) {
  if (!userAgent) return 'Sesión sin dispositivo identificado';
  const normalized = userAgent.toLowerCase();
  if (normalized.includes('iphone') || normalized.includes('android')) {
    return 'Dispositivo móvil';
  }
  if (normalized.includes('ipad') || normalized.includes('tablet')) {
    return 'Tableta';
  }
  return 'Escritorio o navegador web';
}

function isMobileSession(userAgent?: string | null) {
  if (!userAgent) return false;
  const normalized = userAgent.toLowerCase();
  return (
    normalized.includes('iphone') ||
    normalized.includes('android') ||
    normalized.includes('mobile')
  );
}

function formatDateTime(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'fecha desconocida';

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getNotificationLabel(status: NotificationStatus) {
  if (status === 'unsupported') return 'No compatible';
  if (status === 'permission-required') return 'Desactivadas';
  if (status === 'enabled') return 'Activadas en esta app';
  return 'Bloqueadas';
}

function SessionSkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4"
        >
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-2xl bg-[#e2e8f0]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded-full bg-[#e2e8f0]" />
              <div className="h-3 w-1/2 rounded-full bg-[#e2e8f0]" />
              <div className="h-3 w-3/4 rounded-full bg-[#e2e8f0]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
