import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api, withErrorMessage } from '#/api/client';
import { useAuth } from '#/contexts/auth/use-auth';
import { usePWAInstall } from '#/hooks/use-pwa-install';
import { useWhenChanged } from '#/hooks/use-when-changed';
import { listSessions, revokeSession, useSession } from '#/lib/auth-client';
import { type AppLocale, changeLocale, getCurrentLocale } from '#/lib/i18n';
import { compressImageFileToDataUrl } from '#/lib/image-compression';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationStatus,
} from '#/lib/push-notifications';
import {
  getNotificationLabel,
  type NotificationStatus,
} from '../-components/profile-model';
import { getProfileMessages } from '../-messages';

export type ProfilePage = ReturnType<typeof useProfilePage>;

export function useProfilePage() {
  const t = getProfileMessages();
  const languageLabels: Record<AppLocale, string> = {
    es: t.languageSpanish,
    en: t.languageEnglish,
  };
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
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

  const currentLocale = getCurrentLocale();
  const userName = auth.user?.name?.trim() || t.defaultUser;
  const username = auth.user?.username?.trim() || '';
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

      const payload = await withErrorMessage(
        api.users.image.request({ payload: { dataUrl } }),
        t.photoUpdateFailed,
      );

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

  const updateUsernameMutation = useMutation({
    mutationFn: (value: string) =>
      withErrorMessage(
        api.users.username.request({ payload: { username: value } }),
        t.usernameUpdateFailed,
      ),
    onSuccess: async () => {
      await Promise.all([auth.refresh(), session.refetch()]);
      setShowUsernameDialog(false);
      toast.success(t.usernameUpdated);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t.usernameUpdateFailed,
      );
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

  useWhenChanged([showUsernameDialog, username], () => {
    if (showUsernameDialog) setUsernameInput(username);
  });

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

  async function handleChangeLocale(locale: AppLocale) {
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

  const normalizedUsernameInput = usernameInput.trim().toLowerCase();
  const isUsernameValid = /^[a-z0-9._]{3,24}$/.test(normalizedUsernameInput);
  const hasUsernameChanges = normalizedUsernameInput !== username;

  return {
    t,
    navigate,
    session,
    currentSession,
    isLoggingOut,
    imageInputRef,
    notificationStatus,
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
    userName,
    username,
    userEmail,
    isStatsUser,
    userImage,
    notificationLabel,
    installInstructions,
    currentSessionId,
    sessionsQuery,
    revokeSessionMutation,
    updateProfileImageMutation,
    updateUsernameMutation,
    sessions,
    handleLogout,
    handleEnableNotifications,
    handleInstallApp,
    handleDisableNotifications,
    handleRemoveCurrentSession,
    handleRemoveSession,
    handleChangeLocale,
    handleImageInputChange,
    normalizedUsernameInput,
    isUsernameValid,
    hasUsernameChanges,
    languageLabels,
    isInstallable,
    isInstalled,
  };
}
