import {
  Ionicons,
  type IoniconsIconName,
} from '@react-native-vector-icons/ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usersClient } from '@/api/users';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/auth-client';
import { languages, useI18n } from '@/lib/i18n';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationStatus,
  type PushNotificationStatus,
} from '@/lib/push-notifications';

import type { ProfileSession } from './profile.types';
import { QrScanner } from './qr-scanner';

type RowProps = {
  icon: IoniconsIconName;
  title: string;
  subtitle: string;
  trailing?: string;
  onPress: () => void;
};

function ProfileRow({ icon, title, subtitle, trailing, onPress }: RowProps) {
  return (
    <Button variant="ghost" onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={21} color="#DE034D" />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.rowSubtitle}>
          {subtitle}
        </Text>
      </View>
      {trailing ? (
        <Text style={styles.rowTrailing}>{trailing}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      )}
    </Button>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, setLocale } = useI18n();
  const { data: session } = authClient.useSession();
  const [username, setUsername] = useState('');
  const [usernameDialog, setUsernameDialog] = useState(false);
  const [sessionsDialog, setSessionsDialog] = useState(false);
  const [languageDialog, setLanguageDialog] = useState(false);
  const [sessions, setSessions] = useState<ProfileSession[]>([]);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [notificationStatus, setNotificationStatus] =
    useState<PushNotificationStatus>('permission-required');
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [imageOverride, setImageOverride] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const sessionsQuery = useQuery({
    queryKey: ['profile-sessions'],
    enabled: sessionsDialog,
    queryFn: async () => {
      const response = await authClient.listSessions();
      if (response.error) throw new Error('sessions_load_failed');
      return (response.data ?? []) as ProfileSession[];
    },
  });

  const user = (
    session as {
      user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        username?: string | null;
      };
    } | null
  )?.user;
  const userName = user?.name?.trim() || 'Viajero';
  const userEmail = user?.email?.trim() || 'Sin correo';
  const currentUsername = user?.username?.trim() || '';
  const currentSessionToken = (
    session as { session?: { token?: string | null } } | null
  )?.session?.token;
  const isStatsUser = userEmail.toLowerCase() === 'junior110120@gmail.com';

  useEffect(() => {
    let active = true;
    void getPushNotificationStatus()
      .then((status) => {
        if (active) setNotificationStatus(status);
      })
      .catch(() => {
        if (active) setNotificationStatus('permission-required');
      });

    return () => {
      active = false;
    };
  }, []);

  async function toggleNotifications() {
    setIsUpdatingNotifications(true);
    try {
      const status =
        notificationStatus === 'enabled'
          ? await disablePushNotifications()
          : await enablePushNotifications();
      setNotificationStatus(status);
      if (status === 'enabled') {
        Alert.alert('Notificaciones activadas', 'Recibirás avisos de Vornway.');
      } else if (status === 'blocked') {
        Alert.alert(
          'Notificaciones bloqueadas',
          'Actívalas desde la configuración del dispositivo.',
        );
      }
    } catch {
      Alert.alert('No se pudo actualizar', 'Intenta nuevamente.');
    } finally {
      setIsUpdatingNotifications(false);
    }
  }

  async function updatePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset?.base64) return;

    const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
    setIsUpdatingImage(true);
    const response = await usersClient.me.image.$patch({ json: { dataUrl } });
    setIsUpdatingImage(false);

    if (!response.ok) {
      Alert.alert('No se pudo actualizar', 'Intenta nuevamente.');
      return;
    }

    setImageOverride(dataUrl);
    await authClient.getSession();
  }

  async function saveUsername() {
    const normalized = username.trim().toLowerCase();
    if (!/^[a-z0-9._]{3,24}$/.test(normalized)) {
      Alert.alert(
        'Username inválido',
        'Usa entre 3 y 24 caracteres: letras, números, puntos o guiones bajos.',
      );
      return;
    }

    setIsSaving(true);
    const response = await usersClient.me.username.$patch({
      json: { username: normalized },
    });
    setIsSaving(false);

    if (!response.ok) {
      Alert.alert('No se pudo actualizar', 'Intenta nuevamente.');
      return;
    }

    setUsernameDialog(false);
    await authClient.getSession();
  }

  async function openSessions() {
    setSessionsDialog(true);
  }

  function revokeRemoteSession(item: ProfileSession) {
    Alert.alert(
      'Cerrar sesión remota',
      'Este dispositivo perderá el acceso a tu cuenta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setRevokingSession(item.id);
              const response = await authClient.revokeSession({
                token: item.token,
              });
              setRevokingSession(null);

              if (response.error) {
                Alert.alert('No se pudo cerrar', 'Intenta nuevamente.');
                return;
              }

              setSessions((current) =>
                current.filter((sessionItem) => sessionItem.id !== item.id),
              );
              await queryClient.invalidateQueries({
                queryKey: ['profile-sessions'],
              });
            })();
          },
        },
      ],
    );
  }

  async function logout() {
    setIsLoggingOut(true);
    await authClient.signOut();
    setIsLoggingOut(false);
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Perfil</Text>

        <Card style={styles.userCard}>
          {imageOverride || user?.image ? (
            <Image
              source={{ uri: imageOverride || user?.image || undefined }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={28} color="#DE034D" />
            </View>
          )}
          <Button
            disabled={isUpdatingImage}
            onPress={() => void updatePhoto()}
            size="icon-sm"
            variant="default"
            style={styles.photoButton}
          >
            <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
          </Button>
          <View style={styles.userCopy}>
            <Text style={styles.userName}>{userName}</Text>
            {currentUsername ? (
              <Text style={styles.username}>@{currentUsername}</Text>
            ) : null}
            <Text numberOfLines={1} style={styles.email}>
              {userEmail}
            </Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <ProfileRow
            icon="at-outline"
            title="Username"
            subtitle={
              currentUsername ? `@${currentUsername}` : 'Configura tu username'
            }
            trailing="Editar"
            onPress={() => {
              setUsername(currentUsername);
              setUsernameDialog(true);
            }}
          />
          <ProfileRow
            icon="notifications-outline"
            title="Notificaciones"
            subtitle={
              notificationStatus === 'enabled'
                ? 'Activadas'
                : notificationStatus === 'unsupported'
                  ? 'No disponibles en este dispositivo'
                  : notificationStatus === 'blocked'
                    ? 'Bloqueadas en configuración'
                    : 'Desactivadas'
            }
            trailing={
              isUpdatingNotifications
                ? '...'
                : notificationStatus === 'enabled'
                  ? 'Desactivar'
                  : 'Activar'
            }
            onPress={() => void toggleNotifications()}
          />
          <ProfileRow
            icon="qr-code-outline"
            title="Escanear invitación"
            subtitle="Únete a un espacio con un código QR"
            onPress={() => setQrOpen(true)}
          />
          <ProfileRow
            icon="language-outline"
            title="Idioma"
            subtitle={languages[locale]}
            onPress={() => setLanguageDialog(true)}
          />
          <ProfileRow
            icon="shield-checkmark-outline"
            title="Seguridad"
            subtitle="Administra tus sesiones activas"
            onPress={() => void openSessions()}
          />
          <ProfileRow
            icon="bug-outline"
            title="Reportar un problema"
            subtitle="Ayúdanos a mejorar Vornway"
            onPress={() =>
              router.push({
                pathname: '/profile/feedback',
                params: { type: 'BUG' },
              } as never)
            }
          />
          <ProfileRow
            icon="bulb-outline"
            title="Solicitar una función"
            subtitle="Cuéntanos qué necesitas"
            onPress={() =>
              router.push({
                pathname: '/profile/feedback',
                params: { type: 'FEATURE_REQUEST' },
              } as never)
            }
          />
          {isStatsUser ? (
            <ProfileRow
              icon="bar-chart-outline"
              title="Estadísticas"
              subtitle="Panel de administración"
              onPress={() => router.push('/profile/stats' as never)}
            />
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sessionLabel}>SESIÓN PRINCIPAL</Text>
          <Text style={styles.sessionCopy}>
            Cierra tu sesión en este dispositivo.
          </Text>
          <Button
            disabled={isLoggingOut}
            onPress={() => void logout()}
            variant="destructive"
            style={styles.logoutButton}
          >
            {isLoggingOut ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
                <Text style={styles.logoutText}>Cerrar sesión</Text>
              </>
            )}
          </Button>
        </Card>
      </ScrollView>

      <QrScanner
        open={qrOpen}
        onOpenChange={setQrOpen}
        onScanned={(code) => router.push(`/i/${code}` as never)}
      />

      <Dialog open={usernameDialog} onOpenChange={setUsernameDialog}>
        <DialogContent style={styles.modalCard}>
          <DialogHeader>
            <DialogTitle>Editar username</DialogTitle>
            <DialogDescription>
              Elige cómo te encontrarán tus amigos.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
            value={username}
            onChangeText={setUsername}
            placeholder="tu_username"
            style={styles.input}
          />
          <DialogFooter>
            <DialogClose>
              <Text>Cancelar</Text>
            </DialogClose>
            <Button
              disabled={isSaving}
              onPress={() => void saveUsername()}
              style={styles.saveButton}
            >
              {isSaving ? (
                <Spinner color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Guardar</Text>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sessionsDialog} onOpenChange={setSessionsDialog}>
        <DialogContent style={styles.modalCard}>
          <DialogHeader>
            <View style={styles.modalHeader}>
              <DialogTitle>Sesiones activas</DialogTitle>
              <DialogClose>
                <Ionicons name="close" size={24} color="#202124" />
              </DialogClose>
            </View>
            <DialogDescription>
              Dispositivos con acceso a tu cuenta.
            </DialogDescription>
          </DialogHeader>
          <ScrollView style={styles.sessionsList}>
            {sessionsQuery.isLoading ? (
              <Spinner color="#DE034D" />
            ) : sessionsQuery.isError ? (
              <View style={styles.emptySessions}>
                <Text style={styles.emptySessionsText}>
                  No se pudieron cargar las sesiones.
                </Text>
                <Button onPress={() => void sessionsQuery.refetch()}>
                  <Text style={styles.saveText}>Reintentar</Text>
                </Button>
              </View>
            ) : (sessionsQuery.data ?? sessions).length === 0 ? (
              <Text style={styles.emptySessions}>
                No se encontraron sesiones.
              </Text>
            ) : (
              (sessionsQuery.data ?? sessions).map((item) => (
                <View key={item.id} style={styles.sessionItem}>
                  <View style={styles.sessionRow}>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={22}
                      color="#DE034D"
                    />
                    <View style={styles.sessionItemCopy}>
                      <Text style={styles.sessionDevice}>
                        {item.userAgent || 'Dispositivo desconocido'}
                      </Text>
                      <Text style={styles.sessionDate}>
                        {new Date(item.createdAt).toLocaleDateString('es-CO')}
                      </Text>
                    </View>
                  </View>
                  {item.token !== currentSessionToken ? (
                    <Button
                      disabled={revokingSession === item.id}
                      onPress={() => revokeRemoteSession(item)}
                      variant="outline"
                      size="sm"
                      style={styles.revokeButton}
                    >
                      <Text style={styles.revokeText}>
                        {revokingSession === item.id
                          ? 'Cerrando…'
                          : 'Cerrar sesión'}
                      </Text>
                    </Button>
                  ) : (
                    <Text style={styles.currentSession}>Sesión actual</Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </DialogContent>
      </Dialog>

      <Dialog open={languageDialog} onOpenChange={setLanguageDialog}>
        <DialogContent style={styles.modalCard}>
          <DialogHeader>
            <DialogTitle>Idioma / Language</DialogTitle>
            <DialogDescription>
              Selecciona el idioma de Vornway.
            </DialogDescription>
          </DialogHeader>
          {(
            Object.entries(languages) as Array<[keyof typeof languages, string]>
          ).map(([value, label]) => (
            <Button
              key={value}
              variant={locale === value ? 'default' : 'outline'}
              onPress={() => {
                void setLocale(value).then(() => setLanguageDialog(false));
              }}
            >
              <Text
                style={
                  locale === value ? styles.saveText : styles.languageOptionText
                }
              >
                {label}
                {locale === value ? ' ✓' : ''}
              </Text>
            </Button>
          ))}
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 152,
    gap: 16,
  },
  pageTitle: {
    color: '#0F172A',
    fontSize: 30,
    fontWeight: '600',
    marginBottom: 4,
  },
  userCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 28,
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  avatar: { width: 58, height: 58, borderRadius: 22 },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  photoButton: {
    position: 'absolute',
    left: 58,
    top: 58,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DE034D',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userCopy: { flex: 1, gap: 3 },
  userName: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  username: { color: '#DE034D', fontSize: 14 },
  email: { color: '#64748B', fontSize: 14 },
  card: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 28,
    padding: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  pressed: { backgroundColor: '#F8FAFC' },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F4',
  },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  rowSubtitle: { color: '#64748B', fontSize: 12 },
  rowTrailing: { color: '#DE034D', fontSize: 12, fontWeight: '600' },
  sessionLabel: { color: '#94A3B8', fontSize: 11, letterSpacing: 2, margin: 8 },
  sessionCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginHorizontal: 8,
  },
  logoutButton: {
    height: 48,
    borderRadius: 24,
    margin: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  modalCard: {
    maxHeight: '80%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { color: '#0F172A', fontSize: 20, fontWeight: '600' },
  modalDescription: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 25,
    paddingHorizontal: 18,
    color: '#0F172A',
    fontSize: 15,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelButton: {
    height: 48,
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    height: 48,
    flex: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DE034D',
  },
  saveText: { color: '#FFFFFF', fontWeight: '600' },
  languageOptionText: { color: '#0F172A', fontWeight: '600' },
  sessionsList: { marginTop: 4 },
  emptySessions: { paddingVertical: 24, color: '#64748B', textAlign: 'center' },
  emptySessionsText: {
    color: '#64748B',
    marginBottom: 10,
    textAlign: 'center',
  },
  sessionItem: {
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    padding: 14,
    marginBottom: 10,
  },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sessionItemCopy: { flex: 1, gap: 4 },
  sessionDevice: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  sessionDate: { color: '#64748B', fontSize: 12 },
  revokeButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderColor: '#FECACA',
  },
  revokeText: { color: '#B91C1C', fontSize: 12, fontWeight: '600' },
  currentSession: {
    alignSelf: 'flex-start',
    marginTop: 10,
    color: '#15803D',
    fontSize: 12,
    fontWeight: '600',
  },
});
