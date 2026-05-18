import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Check, Loader2, UserRound, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { useAuth } from '#/contexts/auth/use-auth';
import { useAcceptInvite } from '#/routes/_authed/i/-hooks/use-accept-invite';
import {
  useInvitePreviewQuery,
  type InvitePreviewResponse,
} from '#/routes/_authed/i/-hooks/use-invite-preview-query';

export const Route = createFileRoute('/_authed/i/$inviteCode/')({
  component: RouteComponent,
});

type Selection = 'new' | string;

function RouteComponent() {
  const { inviteCode } = Route.useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const previewQuery = useInvitePreviewQuery(inviteCode);
  const acceptMutation = useAcceptInvite(inviteCode);
  const [selection, setSelection] = useState<Selection>('new');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const preview = previewQuery.data;
  const group = preview?.group ?? null;
  const unregisteredMembers = preview?.unregisteredMembers ?? [];
  const alreadyMember = preview?.alreadyMember ?? false;

  useEffect(() => {
    if (!preview) return;
    if (unregisteredMembers.length > 0) {
      setSelection((current) =>
        current === 'new' ||
        unregisteredMembers.some((member) => member.id === current)
          ? current
          : 'new',
      );
    } else {
      setSelection('new');
    }
  }, [preview, unregisteredMembers]);

  const currentUserLabel = useMemo(() => {
    const name = auth.user?.name?.trim();
    const email = auth.user?.email?.trim();

    return name || email || 'tu perfil actual';
  }, [auth.user?.email, auth.user?.name]);

  const goToGroup = async (groupType: string, groupId: string) => {
    await queryClient.invalidateQueries({ queryKey: ['groups-list'] });
    await queryClient.invalidateQueries({ queryKey: ['home-summary'] });

    await navigate({
      to: groupType === 'meta' ? '/goals/$id' : '/groups/$id',
      params: { id: groupId },
      replace: true,
    });
  };

  const handleAccept = async () => {
    if (!group) return;

    setSubmitError(null);

    try {
      const result = await acceptMutation.mutateAsync({
        memberId: selection === 'new' ? undefined : selection,
      });

      await goToGroup(result.groupType, result.groupId);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'No se pudo aceptar la invitación',
      );
    }
  };

  return (
    <MobilePageLayout
      title="Aceptar invitación"
      onBack={() => {
        void navigate({ to: '/groups', replace: true });
      }}
    >
      <div className="flex flex-1 flex-col gap-4 pb-6">
        {previewQuery.isLoading ? (
          <InviteSkeleton />
        ) : previewQuery.isError ? (
          <ErrorState
            message={
              previewQuery.error instanceof Error
                ? previewQuery.error.message
                : 'No se pudo cargar la invitación'
            }
            onRetry={() => void previewQuery.refetch()}
          />
        ) : group && alreadyMember ? (
          <AlreadyMemberState
            group={group}
            onGo={() => {
              void goToGroup(group.type, group.id);
            }}
          />
        ) : group ? (
          <>
            <section className="rounded-3xl border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <p className="text-xs uppercase tracking-[0.22em] text-[#94a3b8]">
                Invitación
              </p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight text-[#0f172a]">
                {group.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#64748b]">
                {group.description ||
                  `Te invitó ${group.ownerName ?? 'un miembro del grupo'}.`}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>{formatGroupType(group.type)}</Badge>
                <Badge>
                  {group.memberCount} participante
                  {group.memberCount === 1 ? '' : 's'}
                </Badge>
                {group.ownerName ? (
                  <Badge>Invitado por {group.ownerName}</Badge>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <p className="text-sm font-semibold text-[#0f172a]">
                ¿Quién eres tú?
              </p>
              <p className="mt-1 text-sm leading-6 text-[#64748b]">
                Elige una de las personas sin correo asignado o continúa como
                {` ${currentUserLabel}`}.
              </p>

              <div className="mt-4 space-y-3">
                <MemberOption
                  title="Soy un usuario nuevo"
                  subtitle={`Usar ${currentUserLabel}`}
                  selected={selection === 'new'}
                  onClick={() => setSelection('new')}
                  icon={<UserRound className="size-5" />}
                />

                {unregisteredMembers.map((member) => (
                  <MemberOption
                    key={member.id}
                    title={member.name}
                    subtitle="Sin correo asignado"
                    selected={selection === member.id}
                    onClick={() => setSelection(member.id)}
                    icon={<Users className="size-5" />}
                  />
                ))}

                {unregisteredMembers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-5 text-sm text-[#64748b]">
                    No hay personas sin correo asignado. Puedes continuar como
                    nuevo usuario.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="mt-auto rounded-3xl border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              {submitError ? (
                <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              ) : null}

              <Button
                type="button"
                onClick={() => void handleAccept()}
                disabled={acceptMutation.isPending}
                className="h-12 w-full rounded-full bg-primary text-base font-medium text-white"
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Aceptando...
                  </>
                ) : (
                  'Aceptar invitación'
                )}
              </Button>
            </section>
          </>
        ) : null}
      </div>
    </MobilePageLayout>
  );
}

function MemberOption({
  title,
  subtitle,
  selected,
  onClick,
  icon,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-colors',
        selected
          ? 'border-primary/30 bg-primary/5'
          : 'border-[#e2e8f0] bg-white hover:bg-[#f8fafc]',
      ].join(' ')}
    >
      <div
        className={[
          'flex size-11 shrink-0 items-center justify-center rounded-2xl',
          selected
            ? 'bg-primary/10 text-primary'
            : 'bg-[#f8fafc] text-[#64748b]',
        ].join(' ')}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#0f172a]">{title}</p>
        <p className="truncate text-sm text-[#64748b]">{subtitle}</p>
      </div>

      {selected ? (
        <div className="flex size-6 items-center justify-center rounded-full bg-primary text-white">
          <Check className="size-4" />
        </div>
      ) : null}
    </button>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#fff1f2] px-3 py-1 text-xs font-medium text-primary">
      {children}
    </span>
  );
}

function AlreadyMemberState({
  group,
  onGo,
}: {
  group: InvitePreviewResponse['group'];
  onGo: () => void;
}) {
  return (
    <section className="rounded-3xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Check className="size-5" />
        </div>
        <div>
          <p className="text-base font-semibold text-[#0f172a]">
            Ya eres miembro
          </p>
          <p className="text-sm text-[#64748b]">{group.name}</p>
        </div>
      </div>

      <Button
        type="button"
        onClick={onGo}
        className="mt-4 h-12 w-full rounded-full bg-primary text-base font-medium text-white"
      >
        Ir al grupo
      </Button>
    </section>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700">
      <p className="text-base font-semibold">No se pudo cargar la invitación</p>
      <p className="mt-2 text-sm leading-6">{message}</p>
      <Button
        type="button"
        onClick={onRetry}
        variant="outline"
        className="mt-4 h-11 rounded-full border-red-200 bg-white text-red-700 hover:bg-red-50"
      >
        Reintentar
      </Button>
    </section>
  );
}

function InviteSkeleton() {
  return (
    <>
      <section className="animate-pulse rounded-3xl border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="h-3 w-24 rounded-full bg-[#e2e8f0]" />
        <div className="mt-3 h-6 w-2/3 rounded-full bg-[#e2e8f0]" />
        <div className="mt-3 h-4 w-full rounded-full bg-[#e2e8f0]" />
        <div className="mt-3 h-4 w-5/6 rounded-full bg-[#e2e8f0]" />
        <div className="mt-4 flex gap-2">
          <div className="h-6 w-20 rounded-full bg-[#e2e8f0]" />
          <div className="h-6 w-28 rounded-full bg-[#e2e8f0]" />
        </div>
      </section>

      <section className="animate-pulse rounded-3xl border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="h-4 w-28 rounded-full bg-[#e2e8f0]" />
        <div className="mt-2 h-4 w-full rounded-full bg-[#e2e8f0]" />
        <div className="mt-2 h-4 w-5/6 rounded-full bg-[#e2e8f0]" />
        <div className="mt-4 space-y-3">
          <div className="h-16 rounded-2xl bg-[#e2e8f0]" />
          <div className="h-16 rounded-2xl bg-[#e2e8f0]" />
        </div>
      </section>
    </>
  );
}

function formatGroupType(type: string) {
  const normalized = type.trim().toLowerCase();
  if (normalized === 'meta') return 'Meta de ahorro';
  if (normalized === 'viajes') return 'Grupo de viajes';
  return type;
}
