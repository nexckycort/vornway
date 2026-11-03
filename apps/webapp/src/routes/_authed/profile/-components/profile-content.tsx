import {
  AlertCircleIcon,
  AtSignIcon,
  BarChartIcon,
  BellIcon,
  BulbIcon,
  CameraIcon,
  DownloadIcon,
  LanguageCircleIcon,
  Logout01Icon,
  QrCodeIcon,
  ShieldIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '#/components/ui/button';
import type { ProfilePage } from '../-hooks/use-profile-page';
import { ProfileActionRow } from './profile-action-row';

export function ProfileContent({ page }: { page: ProfilePage }) {
  const {
    t,
    navigate,
    isLoggingOut,
    imageInputRef,
    notificationStatus,
    setShowSessionsDialog,
    setShowQrScannerDialog,
    setShowDisableNotificationsDialog,
    setShowLanguageDrawer,
    setShowUsernameDialog,
    currentLocale,
    userName,
    username,
    userEmail,
    isStatsUser,
    userImage,
    notificationLabel,
    updateProfileImageMutation,
    handleLogout,
    handleEnableNotifications,
    handleInstallApp,
    handleImageInputChange,
    languageLabels,
    isInstallable,
    isInstalled,
  } = page;

  return (
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
                    <HugeiconsIcon icon={UserIcon} className="size-6" />
                  </div>
                )}
              </div>
              <span className="absolute inset-0 bg-black/0 transition-colors hover:bg-black/5" />
              <span className="absolute -right-1 -bottom-1 z-10 flex size-7 items-center justify-center rounded-full border border-white bg-primary text-white shadow-lg">
                <HugeiconsIcon icon={CameraIcon} className="size-3.5" />
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#0f172a]">{userName}</p>
              {username ? (
                <p className="mt-1 truncate text-sm text-primary">
                  @{username}
                </p>
              ) : null}
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
            icon={<HugeiconsIcon icon={AtSignIcon} className="size-5" />}
            title={t.username}
            subtitle={username ? `@${username}` : t.configureUsername}
            onClick={() => setShowUsernameDialog(true)}
            trailing={t.edit}
          />
          <ProfileActionRow
            icon={<HugeiconsIcon icon={BellIcon} className="size-5" />}
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
              icon={<HugeiconsIcon icon={DownloadIcon} className="size-5" />}
              title={t.installApp}
              subtitle={t.installAppSubtitle}
              onClick={() => {
                void handleInstallApp();
              }}
              trailing={isInstallable ? t.common.install : t.common.manual}
            />
          ) : null}
          <ProfileActionRow
            icon={
              <HugeiconsIcon icon={LanguageCircleIcon} className="size-5" />
            }
            title={t.language}
            subtitle={languageLabels[currentLocale]}
            onClick={() => setShowLanguageDrawer(true)}
          />
          <ProfileActionRow
            icon={<HugeiconsIcon icon={ShieldIcon} className="size-5" />}
            title={t.security}
            subtitle={t.securitySubtitle}
            onClick={() => setShowSessionsDialog(true)}
          />
          <ProfileActionRow
            icon={<HugeiconsIcon icon={AlertCircleIcon} className="size-5" />}
            title={t.reportBug}
            subtitle={t.reportBugSubtitle}
            onClick={() =>
              void navigate({
                to: '/profile/feedback',
                search: { type: 'BUG' },
              })
            }
          />
          <ProfileActionRow
            icon={<HugeiconsIcon icon={BulbIcon} className="size-5" />}
            title={t.requestFeature}
            subtitle={t.requestFeatureSubtitle}
            onClick={() =>
              void navigate({
                to: '/profile/feedback',
                search: { type: 'FEATURE_REQUEST' },
              })
            }
          />
          {isStatsUser && (
            <ProfileActionRow
              icon={<HugeiconsIcon icon={BarChartIcon} className="size-5" />}
              title={t.stats}
              subtitle={t.statsSubtitle}
              onClick={() =>
                void navigate({
                  to: '/profile/stats',
                })
              }
              trailing={t.view}
            />
          )}
          <ProfileActionRow
            icon={<HugeiconsIcon icon={QrCodeIcon} className="size-5" />}
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
            <HugeiconsIcon icon={Logout01Icon} className="mr-2 size-4" />
            {isLoggingOut ? t.loggingOut : t.logout}
          </Button>
        </section>
      </div>
    </main>
  );
}
