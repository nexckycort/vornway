import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  BarChart3,
  Bell,
  CalendarClock,
  Camera,
  ChevronRight,
  Download,
  Languages,
  LaptopMinimal,
  Lightbulb,
  LogOut,
  QrCode,
  Shield,
  Smartphone,
  UserRound,
} from 'lucide-react';
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { usersClient } from '#/api/users';
import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { useAuth } from '#/contexts/auth/use-auth';
import { usePWAInstall } from '#/hooks/use-pwa-install';
import { listSessions, revokeSession, useSession } from '#/lib/auth-client';
import {
  changeLocale,
  formatDateTime,
  getCurrentLocale,
  languages,
} from '#/lib/i18n';
import { compressImageFileToDataUrl } from '#/lib/image-compression';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationStatus,
} from '#/lib/push-notifications';
import { QrScannerDialog } from './-components/qr-scanner-dialog';
import { getProfileMessages } from './-messages';

export const Route = createFileRoute('/_authed/profile/')({
  component: RouteComponent,
});

type NotificationStatus =
  | 'unsupported'
  | 'permission-required'
  | 'enabled'
  | 'blocked';

function RouteComponent() {
  const t = getProfileMessages();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const session = useSession();
  const { isInstallable, isInstalled, installApp, getInstallInstructions } =
    usePWAInstall();
  const currentSession = session.data;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationStatus>('permission-required');
  const [showSessionsDialog, setShowSessionsDialog] = useState(false);
  const [showQrScannerDialog, setShowQrScannerDialog] = useState(false);
  const [showDisableNotificationsDialog, setShowDisableNotificationsDialog] =
    useState(false);
  const [showInstallInstructionsDialog, setShowInstallInstructionsDialog] =
    useState(false);
  const [showLanguageDrawer, setShowLanguageDrawer] = useState(false);

  const currentLocale = getCurrentLocale();
  const userName = auth.user?.name?.trim() || t.defaultUser;
  const userEmail = auth.user?.email?.trim() || t.noEmail;
  const isStatsUser =
    auth.user?.email?.trim().toLowerCase() === 'junior110120@gmail.com';
  const userImage = previewImageUrl ?? auth.user?.image ?? null;
  const notificationLabel = getNotificationLabel(notificationStatus, t);
  const installInstructions = getInstallInstructions();
  const currentSessionId = currentSession?.session.id ?? null;

  const sessionsQuery = useQuery({
    queryKey: ['profile-sessions'],
    queryFn: async () => {
      const result = await listSessions();
      if (result.error) {
        throw new Error(t.sessionsLoadFailed);
      }
      return result.data ?? [];
    },
    staleTime: 30_000,
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (token: string) => {
      const result = await revokeSession({ token });
      if (result.error) {
        throw new Error(t.sessionRemoveFailed);
      }
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile-sessions'] });
      toast.success(t.sessionRemoved);
    },
    onError: () => {
      toast.error(t.sessionRemoveFailed);
    },
  });

  const updateProfileImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const dataUrl = await compressImageFileToDataUrl(file);

      setPreviewImageUrl(dataUrl);

      const uploadResponse = await usersClient.me.image.$patch({
        json: { dataUrl },
      });

      if (!uploadResponse.ok) {
        const payload = (await uploadResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? t.photoUpdateFailed);
      }

      const payload = (await uploadResponse.json()) as {
        imageUrl?: string | null;
      };

      if (!payload.imageUrl) {
        throw new Error(t.photoUpdateFailed);
      }

      await session.refetch();

      return payload.imageUrl;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile-sessions'] });
      toast.success(t.photoUpdated);
      setPreviewImageUrl(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    },
    onError: (error) => {
      setPreviewImageUrl(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      toast.error(error instanceof Error ? error.message : t.photoUpdateFailed);
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

  const sessions = useMemo(() => {
    const list = sessionsQuery.data ?? [];
    if (!currentSessionId) return list;

    const current = list.find((session) => session.id === currentSessionId);
    if (!current) return list;

    return [
      current,
      ...list.filter((session) => session.id !== currentSessionId),
    ];
  }, [currentSessionId, sessionsQuery.data]);

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

  async function handleInstallApp() {
    if (isInstalled) return;

    const result = await installApp();

    if (result.reason === 'not-available' && !isInstalled) {
      setShowInstallInstructionsDialog(true);
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
    toast.success(t.sessionClosed);
    await navigate({
      to: '/login',
      search: { redirect: '/login' },
      replace: true,
    });
  }

  async function handleRemoveSession(sessionToken: string) {
    await revokeSessionMutation.mutateAsync(sessionToken);
  }

  async function handleChangeLocale(locale: keyof typeof languages) {
    if (locale === currentLocale) {
      setShowLanguageDrawer(false);
      return;
    }

    await changeLocale(locale);
  }

  function handleImageInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    updateProfileImageMutation.mutate(file);
  }

  return (
    <>
      <main className="min-h-screen bg-[#fafafa] text-foreground">
        <div className="flex min-h-screen w-full flex-col px-4 pb-28 pt-6">
          <header className="mb-5">
            <h1 className="mt-2 text-3xl font-semibold leading-9 text-[#0f172a]">
              {t.title}
            </h1>
          </header>

          <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="relative shrink-0 overflow-visible transition-transform active:scale-95"
                aria-label={t.updatePhoto}
                disabled={updateProfileImageMutation.isPending}
              >
                <div className="relative size-14 overflow-hidden rounded-3xl">
                  {userImage ? (
                    <img
                      src={userImage}
                      alt={userName}
                      className="size-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center rounded-3xl bg-[#f1f5f9] text-primary">
                      <UserRound className="size-6" />
                    </div>
                  )}
                </div>
                <span className="absolute inset-0 bg-black/0 transition-colors hover:bg-black/5" />
                <span className="absolute -right-1 -bottom-1 z-10 flex size-7 items-center justify-center rounded-full border border-white bg-primary text-white shadow-lg">
                  <Camera className="size-3.5" />
                </span>
              </button>

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

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageInputChange}
          />

          <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <ProfileActionRow
              icon={<Bell className="size-5" />}
              title={t.notifications}
              subtitle={notificationLabel}
              onClick={() => {
                if (notificationStatus === 'enabled') {
                  setShowDisableNotificationsDialog(true);
                  return;
                }

                void handleEnableNotifications();
              }}
              trailing={
                notificationStatus === 'enabled'
                  ? t.common.disable
                  : t.common.enable
              }
            />
            {!isInstalled ? (
              <ProfileActionRow
                icon={<Download className="size-5" />}
                title={t.installApp}
                subtitle={t.installAppSubtitle}
                onClick={() => {
                  void handleInstallApp();
                }}
                trailing={isInstallable ? t.common.install : t.common.manual}
              />
            ) : null}
            {isStatsUser && (
              <ProfileActionRow
                icon={<Languages className="size-5" />}
                title={t.language}
                subtitle={languages[currentLocale]}
                onClick={() => setShowLanguageDrawer(true)}
              />
            )}
            <ProfileActionRow
              icon={<Shield className="size-5" />}
              title={t.security}
              subtitle={t.securitySubtitle}
              onClick={() => setShowSessionsDialog(true)}
            />
            <ProfileActionRow
              icon={<AlertCircle className="size-5" />}
              title="Reportar error"
              subtitle="Algo no funcionó como esperabas"
              onClick={() =>
                void navigate({
                  to: '/profile/feedback',
                  search: { type: 'BUG' },
                })
              }
            />
            <ProfileActionRow
              icon={<Lightbulb className="size-5" />}
              title="Pedir funcionalidad"
              subtitle="Comparte una mejora o idea nueva"
              onClick={() =>
                void navigate({
                  to: '/profile/feedback',
                  search: { type: 'FEATURE_REQUEST' },
                })
              }
            />
            {isStatsUser && (
              <ProfileActionRow
                icon={<BarChart3 className="size-5" />}
                title="Estadísticas"
                subtitle="Usuarios y espacios creados"
                onClick={() =>
                  void navigate({
                    to: '/profile/stats',
                  })
                }
                trailing="Ver"
              />
            )}
            <ProfileActionRow
              icon={<QrCode className="size-5" />}
              title={t.qrScanner}
              subtitle={t.qrScannerSubtitle}
              onClick={() => setShowQrScannerDialog(true)}
            />
          </section>

          <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[#94a3b8]">
              {t.mainSession}
            </p>
            <p className="mt-1 text-sm leading-6 text-[#64748b]">
              {t.logoutCopy}
            </p>

            <Button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="mt-4 h-12 w-full rounded-full bg-destructive text-base font-medium text-white shadow-[0_10px_30px_rgba(239,68,68,0.22)] hover:bg-destructive/90"
            >
              <LogOut className="mr-2 size-4" />
              {isLoggingOut ? t.loggingOut : t.logout}
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
            <DialogTitle>{t.disableNotificationsTitle}</DialogTitle>
            <DialogDescription>{t.disableNotificationsCopy}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 rounded-full"
              onClick={() => setShowDisableNotificationsDialog(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              className="h-12 flex-1 rounded-full bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setShowDisableNotificationsDialog(false);
                void handleDisableNotifications();
              }}
            >
              {t.common.yesDisable}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Drawer
        open={showInstallInstructionsDialog}
        onOpenChange={setShowInstallInstructionsDialog}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{installInstructions.title}</DrawerTitle>
            <DrawerDescription>{t.installInstructionsCopy}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3 px-4 pb-4">
            {installInstructions.steps.map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm text-[#0f172a]"
              >
                <span className="mr-2 font-semibold text-primary">
                  {index + 1}.
                </span>
                {step}
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={showSessionsDialog} onOpenChange={setShowSessionsDialog}>
        <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-[28px] p-4 sm:max-w-md">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t.sessionsTitle}</DialogTitle>
            <DialogDescription>{t.sessionsCopy}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-3">
              {sessionsQuery.isLoading ? (
                <SessionSkeletonList />
              ) : sessions.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-5 text-sm text-[#64748b]">
                  {t.noSessions}
                </p>
              ) : (
                sessions.map((session) => {
                  const isCurrent = session.id === currentSessionId;
                  const deviceLabel = describeSession(session.userAgent, t);

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
                                {t.currentSession}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 flex items-center gap-1 text-xs text-[#64748b]">
                            <CalendarClock className="size-3.5 shrink-0" />
                            {t.startedAt(
                              formatDateTime(session.createdAt, t.unknownDate),
                            )}
                          </p>
                          <p className="mt-1 text-xs text-[#64748b]">
                            {t.expiresAt(
                              formatDateTime(session.expiresAt, t.unknownDate),
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="min-w-0 flex-1 truncate text-xs text-[#94a3b8]">
                          {session.userAgent ?? t.unknownDeviceInfo}
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
                          {isCurrent ? t.closeThisSession : t.common.delete}
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

      <Drawer open={showLanguageDrawer} onOpenChange={setShowLanguageDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.localeDrawerTitle}</DrawerTitle>
            <DrawerDescription>{t.localeDrawerCopy}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-2 px-4 pb-4">
            {Object.entries(languages).map(([locale, label]) => {
              const active = locale === currentLocale;

              return (
                <button
                  key={locale}
                  type="button"
                  onClick={() =>
                    void handleChangeLocale(locale as keyof typeof languages)
                  }
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                    active
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-[#e2e8f0] bg-white text-[#0f172a]'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    {active ? (
                      <p className="text-xs text-primary">
                        {t.selectedLanguage}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="size-4" />
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
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

function describeSession(
  userAgent: string | null | undefined,
  t: ReturnType<typeof getProfileMessages>,
) {
  if (!userAgent) return t.deviceUnknown;
  const normalized = userAgent.toLowerCase();
  if (normalized.includes('iphone') || normalized.includes('android')) {
    return t.mobileDevice;
  }
  if (normalized.includes('ipad') || normalized.includes('tablet')) {
    return t.tablet;
  }
  return t.desktop;
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

function getNotificationLabel(
  status: NotificationStatus,
  t: ReturnType<typeof getProfileMessages>,
) {
  if (status === 'unsupported') return t.notificationsUnsupported;
  if (status === 'permission-required') return t.notificationsDisabled;
  if (status === 'enabled') return t.notificationsEnabled;
  return t.notificationsBlocked;
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
