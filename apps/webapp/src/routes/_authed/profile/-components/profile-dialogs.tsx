import {
  CalendarClockIcon,
  ChevronRightIcon,
  LaptopIcon,
  SmartPhone01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
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
import { type AppLocale, formatDateTime } from '#/lib/i18n';
import type { ProfilePage } from '../-hooks/use-profile-page';
import { describeSession, isMobileSession } from './profile-model';
import { SessionSkeletonList } from './profile-session-skeleton';
import { QrScannerDialog } from './qr-scanner-dialog';

export function ProfileDialogs({ page }: { page: ProfilePage }) {
  const {
    t,
    navigate,
    isLoggingOut,
    showSessionsDialog,
    setShowSessionsDialog,
    showQrScannerDialog,
    setShowQrScannerDialog,
    showDisableNotificationsDialog,
    setShowDisableNotificationsDialog,
    showInstallInstructionsDialog,
    setShowInstallInstructionsDialog,
    showLanguageDrawer,
    setShowLanguageDrawer,
    showUsernameDialog,
    setShowUsernameDialog,
    usernameInput,
    setUsernameInput,
    currentLocale,
    installInstructions,
    currentSessionId,
    sessionsQuery,
    revokeSessionMutation,
    updateUsernameMutation,
    sessions,
    handleDisableNotifications,
    handleRemoveCurrentSession,
    handleRemoveSession,
    handleChangeLocale,
    normalizedUsernameInput,
    isUsernameValid,
    hasUsernameChanges,
    languageLabels,
  } = page;

  return (
    <>
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

      <Dialog open={showUsernameDialog} onOpenChange={setShowUsernameDialog}>
        <DialogContent className="max-w-[calc(100%-1rem)] rounded-[28px] p-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.editUsernameTitle}</DialogTitle>
            <DialogDescription>{t.editUsernameCopy}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm text-[#475569]">
              {t.usernamePreview}{' '}
              <span className="font-semibold">
                @{normalizedUsernameInput || t.usernamePlaceholder}
              </span>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#0f172a]">
                {t.username}
              </span>
              <div className="flex h-12 items-center rounded-full border border-[#e2e8f0] bg-white px-4 focus-within:border-primary">
                <span className="mr-1 text-sm text-[#64748b]">@</span>
                <input
                  value={usernameInput}
                  onChange={(event) =>
                    setUsernameInput(
                      event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9._]/g, ''),
                    )
                  }
                  placeholder={t.usernamePlaceholder}
                  maxLength={24}
                  autoFocus
                  className="w-full bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
                />
              </div>
              <p className="mt-2 text-xs text-[#64748b]">{t.usernameRules}</p>
            </label>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 rounded-full"
                onClick={() => setShowUsernameDialog(false)}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="button"
                className="h-12 flex-1 rounded-full"
                disabled={
                  !isUsernameValid ||
                  !hasUsernameChanges ||
                  updateUsernameMutation.isPending
                }
                onClick={() =>
                  void updateUsernameMutation.mutateAsync(
                    normalizedUsernameInput,
                  )
                }
              >
                {updateUsernameMutation.isPending
                  ? t.common.saving
                  : t.common.saveChanges}
              </Button>
            </div>
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
                            <HugeiconsIcon
                              icon={SmartPhone01Icon}
                              className="size-4"
                            />
                          ) : (
                            <HugeiconsIcon
                              icon={LaptopIcon}
                              className="size-4"
                            />
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
                            <HugeiconsIcon
                              icon={CalendarClockIcon}
                              className="size-3.5 shrink-0"
                            />
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
            {Object.entries(languageLabels).map(([locale, label]) => {
              const active = locale === currentLocale;

              return (
                <button
                  key={locale}
                  type="button"
                  onClick={() => void handleChangeLocale(locale as AppLocale)}
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
                  <HugeiconsIcon icon={ChevronRightIcon} className="size-4" />
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
