import { useMutation } from '@tanstack/react-query';
import {
  createFileRoute,
  Outlet,
  redirect,
  useRouterState,
} from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { usersClient } from '#/api/users';
import { BottomAppBar } from '#/components/bottom-app-bar';
import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { useAuth } from '#/contexts/auth/use-auth';

export const Route = createFileRoute('/_authed')({
  component: AuthedLayout,
  beforeLoad: async ({ location, context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          // Use the current location to power a redirect after login
          // (Do not use `router.state.resolvedLocation` as it can
          // potentially lag behind the actual current location)
          redirect: location.href,
        },
      });
    }
  },
});

const MAIN_VIEWS = new Set([
  '/',
  '/expenses/friends',
  '/groups',
  '/groups/',
  '/goals',
  '/goals/',
  '/profile',
  '/profile/',
]);

function AuthedLayout() {
  const auth = useAuth();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const showBottomBar = MAIN_VIEWS.has(pathname);
  const [username, setUsername] = useState('');
  const normalizedExistingUsername = auth.user?.username?.trim() ?? '';
  const needsUsername = Boolean(
    auth.user && normalizedExistingUsername.length === 0,
  );

  useEffect(() => {
    if (!needsUsername) return;
    setUsername('');
  }, [needsUsername]);

  const updateUsernameMutation = useMutation({
    mutationFn: async (value: string) => {
      const response = await usersClient.me.username.$patch({
        json: { username: value },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;

        throw new Error(
          payload?.message ??
            payload?.error ??
            'No se pudo guardar el nombre de usuario',
        );
      }

      return await response.json();
    },
    onSuccess: async () => {
      await auth.refresh();
      toast.success('Nombre de usuario configurado');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el nombre de usuario',
      );
    },
  });

  const canSubmitUsername =
    /^[a-z0-9._]{3,24}$/.test(username.trim()) &&
    !updateUsernameMutation.isPending;

  return (
    <div className="mobile-shell">
      <div className="mobile-shell-frame">
        <Outlet />
        {showBottomBar ? <BottomAppBar /> : null}
      </div>
      <Dialog open={needsUsername}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[calc(100%-1rem)] rounded-[28px] p-5 sm:max-w-md"
        >
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle>Elige tu nombre de usuario</DialogTitle>
            <DialogDescription>
              Todas las personas deben tener uno para que buscar y agregar
              amigos sea mucho mas facil.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm text-[#475569]">
              Se vera como{' '}
              <span className="font-semibold">
                @{username.trim() || 'tu.usuario'}
              </span>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#0f172a]">
                Nombre de usuario
              </span>
              <div className="flex h-12 items-center rounded-full border border-[#e2e8f0] bg-white px-4 focus-within:border-primary">
                <span className="mr-1 text-sm text-[#64748b]">@</span>
                <input
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9._]/g, ''),
                    )
                  }
                  placeholder="tu.usuario"
                  maxLength={24}
                  autoFocus
                  className="w-full bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
                />
              </div>
              <p className="mt-2 text-xs text-[#64748b]">
                Usa entre 3 y 24 caracteres. Solo letras minusculas, numeros,
                punto y guion bajo.
              </p>
            </label>

            <Button
              type="button"
              className="h-12 w-full rounded-full"
              disabled={!canSubmitUsername}
              onClick={() =>
                void updateUsernameMutation.mutateAsync(username.trim())
              }
            >
              {updateUsernameMutation.isPending
                ? 'Guardando...'
                : 'Guardar nombre de usuario'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
