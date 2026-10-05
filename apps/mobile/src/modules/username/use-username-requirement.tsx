import { useCallback, useRef, useState } from 'react';
import { Alert, Text } from 'react-native';

import { usersClient } from '@/api/users';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/auth-client';

export function useUsernameRequirement() {
  const { data: session } = authClient.useSession();
  const currentUsername = (
    session as { user?: { username?: string | null } } | null
  )?.user?.username?.trim();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const resolution = useRef<((allowed: boolean) => void) | null>(null);

  const ensureUsername = useCallback(() => {
    if (currentUsername) return Promise.resolve(true);

    setUsername('');
    setOpen(true);
    resolution.current?.(false);

    return new Promise<boolean>((resolve) => {
      resolution.current = resolve;
    });
  }, [currentUsername]);

  const cancel = useCallback(() => {
    setOpen(false);
    resolution.current?.(false);
    resolution.current = null;
  }, []);

  const save = useCallback(async () => {
    const normalized = username.trim().toLowerCase();
    if (!/^[a-z0-9._]{3,24}$/.test(normalized)) {
      Alert.alert(
        'Username inválido',
        'Usa entre 3 y 24 caracteres: letras, números, puntos o guiones bajos.',
      );
      return;
    }

    setIsSaving(true);
    try {
      const response = await usersClient.me.username.$patch({
        json: { username: normalized },
      });
      if (!response.ok) throw new Error('username_update_failed');

      await authClient.getSession();
      const resolve = resolution.current;
      resolution.current = null;
      setOpen(false);
      resolve?.(true);
    } catch {
      Alert.alert('No se pudo guardar', 'Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  }, [username]);

  const dialog = (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) cancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configura tu username</DialogTitle>
          <DialogDescription>
            Necesitas un username para continuar y vincularte con otros
            viajeros.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={24}
          onChangeText={(value) =>
            setUsername(value.toLowerCase().replace(/[^a-z0-9._]/g, ''))
          }
          placeholder="tu_username"
          value={username}
        />
        <DialogFooter>
          <Button variant="outline" disabled={isSaving} onPress={cancel}>
            <Text style={{ color: '#0F172A', fontWeight: '600' }}>
              Cancelar
            </Text>
          </Button>
          <Button
            disabled={isSaving || !/^[a-z0-9._]{3,24}$/.test(username.trim())}
            onPress={() => void save()}
          >
            {isSaving ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                Guardar
              </Text>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { ensureUsername, usernameDialog: dialog };
}
