import { useMutation } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
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
import { useAuth } from '#/contexts/auth/use-auth';
import { m } from '#/paraglide/messages.js';

type UsernameRequirementContextValue = {
  ensureUsername: () => Promise<boolean>;
};

export const UsernameRequirementContext =
  createContext<UsernameRequirementContextValue | null>(null);

export function UsernameRequirementProvider({
  children,
}: {
  children: ReactNode;
}) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const pendingResolution = useRef<((allowed: boolean) => void) | null>(null);
  const normalizedExistingUsername = auth.user?.username?.trim() ?? '';

  const finishRequirement = useCallback((allowed: boolean) => {
    pendingResolution.current?.(allowed);
    pendingResolution.current = null;
    setOpen(false);
  }, []);

  const ensureUsername = useCallback(() => {
    if (normalizedExistingUsername.length > 0) {
      return Promise.resolve(true);
    }

    pendingResolution.current?.(false);
    setUsername('');
    setOpen(true);

    return new Promise<boolean>((resolve) => {
      pendingResolution.current = resolve;
    });
  }, [normalizedExistingUsername]);

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
            m['profile.usernameSaveFailed'](),
        );
      }

      return await response.json();
    },
    onSuccess: async () => {
      await auth.refresh();
      toast.success(m['profile.usernameConfigured']());
      finishRequirement(true);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['profile.usernameSaveFailed'](),
      );
    },
  });

  const canSubmit =
    /^[a-z0-9._]{3,24}$/.test(username.trim()) &&
    !updateUsernameMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true);
      return;
    }

    if (updateUsernameMutation.isPending) return;
    finishRequirement(false);
  };

  return (
    <UsernameRequirementContext.Provider value={{ ensureUsername }}>
      {children}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-[calc(100%-1rem)] rounded-[28px] p-5 sm:max-w-md">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle>{m['profile.chooseUsernameTitle']()}</DialogTitle>
            <DialogDescription>
              {m['profile.chooseUsernameCopy']()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm text-[#475569]">
              {m['profile.usernamePreview']()}{' '}
              <span className="font-semibold">
                @{username.trim() || m['profile.usernamePlaceholder']()}
              </span>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#0f172a]">
                {m['profile.username']()}
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
                  placeholder={m['profile.usernamePlaceholder']()}
                  maxLength={24}
                  autoFocus
                  className="w-full bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
                />
              </div>
              <p className="mt-2 text-xs text-[#64748b]">
                {m['profile.usernameRules']()}
              </p>
            </label>

            <Button
              type="button"
              className="h-12 w-full rounded-full"
              disabled={!canSubmit}
              onClick={() => updateUsernameMutation.mutate(username.trim())}
            >
              {updateUsernameMutation.isPending
                ? m['common.saving']()
                : m['profile.saveUsername']()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </UsernameRequirementContext.Provider>
  );
}
