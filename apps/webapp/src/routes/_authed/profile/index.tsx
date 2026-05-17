import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { LogOut, UserRound } from 'lucide-react';
import { useState } from 'react';

import { Button } from '#/components/ui/button';
import { useAuth } from '#/contexts/auth/use-auth';

export const Route = createFileRoute('/_authed/profile/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userName = auth.user?.name?.trim() || 'Usuario';
  const userEmail = auth.user?.email?.trim() || 'Sin correo';

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await auth.logout();
      await navigate({ to: '/login', replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <main className="flex h-dvh items-center justify-center overflow-hidden bg-background px-4 py-6">
      <section className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserRound className="size-5" />
          </div>
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
