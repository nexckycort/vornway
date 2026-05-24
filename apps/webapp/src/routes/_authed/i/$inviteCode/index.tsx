import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Check, Loader2, Users } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { getGroupFlowEntryState } from '#/lib/group-flow-navigation';
import { useAcceptInvite } from '#/routes/_authed/i/-hooks/use-accept-invite';
import {
  type InvitePreviewResponse,
  useInvitePreviewQuery,
} from '#/routes/_authed/i/-hooks/use-invite-preview-query';

export const Route = createFileRoute('/_authed/i/$inviteCode/')({
  component: RouteComponent,
});

type Selection = 'new' | string;

function RouteComponent() {
  const { inviteCode } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const previewQuery = useInvitePreviewQuery(inviteCode);
  const acceptMutation = useAcceptInvite(inviteCode);
  const [selection, setSelection] = useState<Selection>('new');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const preview = previewQuery.data;
  const group = preview?.group ?? null;
  const unregisteredMembers = preview?.unregisteredMembers ?? [];
  const alreadyMember = preview?.alreadyMember ?? false;
  const selectedMember = unregisteredMembers.find(
    (member) => member.id === selection,
  );

  useEffect(() => {
    if (!preview) return;

    if (unregisteredMembers.length > 0) {
      setSelection((current) =>
        current === 'new' ||
        unregisteredMembers.some((member) => member.id === current)
          ? current
          : 'new',
      );
      return;
    }

    setSelection('new');
  }, [preview, unregisteredMembers]);

  const goToGroup = async (groupType: string, groupId: string) => {
    await queryClient.invalidateQueries({ queryKey: ['groups-list'] });
    await queryClient.invalidateQueries({ queryKey: ['home-summary'] });

    if (groupType === 'meta') {
      await navigate({
        to: '/goals/$id',
        params: { id: groupId },
        replace: true,
      });
      return;
    }

    await navigate({
      to: '/groups/$id',
      params: { id: groupId },
      replace: true,
      state: getGroupFlowEntryState('/groups'),
    });
  };

  const handleAccept = async (mode: 'new' | 'linked') => {
    if (!group) return;

    setSubmitError(null);

    try {
      const result = await acceptMutation.mutateAsync({
        memberId: mode === 'new' ? undefined : selection,
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
      title="Invitación"
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
            <section className="rounded-[28px] border border-[#e2e8f0] bg-white px-4 pt-3 pb-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-center">
                <div className="relative h-24 w-32">
                  <div className="absolute right-1 top-1 h-18 w-18 rotate-12 rounded-[30px] bg-primary" />
                  <div className="absolute left-2 top-2 h-[4.75rem] w-[4.75rem] overflow-hidden rounded-[28px] border-[3px] border-white bg-[#f8fafc] shadow-[0_14px_28px_rgba(15,23,42,0.14)]">
                    {group.imageUrl ? (
                      <img
                        src={group.imageUrl}
                        alt={group.name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#fff1f4] text-primary">
                        <Users className="size-7" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <h2 className="mt-3 text-center text-[1.7rem] font-semibold leading-tight text-[#0f172a]">
                ¡Bienvenid@ a <span className="text-primary">{group.name}</span>
                !
              </h2>
            </section>

            {unregisteredMembers.length > 0 ? (
              <>
                <section className="space-y-2 px-1">
                  <h3 className="text-[1.1rem] font-semibold text-[#0f172a]">
                    ¿Ya estás en este grupo?
                  </h3>
                  <p className="text-sm leading-6 text-[#64748b]">
                    Encontramos participantes creados previamente que podrían
                    ser tú.
                  </p>
                </section>

                <section className="space-y-3">
                  {unregisteredMembers.map((member) => (
                    <MemberRow
                      key={member.id}
                      title={member.name}
                      email="Sin correo asignado"
                      selected={selection === member.id}
                      onClick={() => setSelection(member.id)}
                      actionLabel="Soy yo"
                      icon={<MemberInitials name={member.name} />}
                    />
                  ))}
                </section>

                <section className="mt-auto space-y-3 pt-1">
                  {submitError ? (
                    <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {submitError}
                    </div>
                  ) : null}

                  <Button
                    type="button"
                    onClick={() => void handleAccept('linked')}
                    disabled={!selectedMember || acceptMutation.isPending}
                    className="h-12 w-full rounded-full bg-primary text-base font-medium text-white"
                  >
                    {acceptMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Vinculando...
                      </>
                    ) : (
                      'Vincular cuenta'
                    )}
                  </Button>

                  <div className="flex items-center gap-3 px-1">
                    <div className="h-px flex-1 bg-[#e2e8f0]" />
                    <span className="text-xs text-[#94a3b8]">o</span>
                    <div className="h-px flex-1 bg-[#e2e8f0]" />
                  </div>

                  <Button
                    type="button"
                    onClick={() => void handleAccept('new')}
                    disabled={acceptMutation.isPending}
                    className="h-12 w-full rounded-full bg-[#0b0b0b] text-base font-medium text-white hover:bg-black/90"
                  >
                    {acceptMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Continuando...
                      </>
                    ) : (
                      'Continuar como nuevo participante'
                    )}
                  </Button>
                </section>
              </>
            ) : (
              <section className="mt-auto space-y-3 pt-1">
                <section className="space-y-2 px-1">
                  <h3 className="text-[1.1rem] font-semibold text-[#0f172a]">
                    Continúa como nuevo participante
                  </h3>
                  <p className="text-sm leading-6 text-[#64748b]">
                    No hay un registro previo para tu cuenta. Puedes crear tu
                    acceso ahora.
                  </p>
                </section>

                {submitError ? (
                  <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submitError}
                  </div>
                ) : null}

                <Button
                  type="button"
                  onClick={() => void handleAccept('new')}
                  disabled={acceptMutation.isPending}
                  className="h-12 w-full rounded-full bg-primary text-base font-medium text-white"
                >
                  {acceptMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Continuando...
                    </>
                  ) : (
                    'Continuar como nuevo participante'
                  )}
                </Button>
              </section>
            )}
          </>
        ) : null}
      </div>
    </MobilePageLayout>
  );
}

function MemberRow({
  title,
  email,
  selected,
  onClick,
  actionLabel,
  icon,
}: {
  title: string;
  email: string;
  selected: boolean;
  onClick: () => void;
  actionLabel: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-left transition-colors',
        selected
          ? 'border-primary/30 bg-primary/5'
          : 'border-[#e2e8f0] bg-white hover:bg-[#f8fafc]',
      ].join(' ')}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#e5e7eb] text-[#111827]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#0f172a]">{title}</p>
        <p className="truncate text-xs text-[#94a3b8]">{email}</p>
      </div>

      <div className="shrink-0 rounded-full border border-[#e2e8f0] bg-white px-4 py-2 text-sm text-[#0f172a]">
        {actionLabel}
      </div>
    </button>
  );
}

function MemberInitials({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || 'U';
  return <span className="text-sm font-medium text-[#0f172a]">{initial}</span>;
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-red-700">
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
      <section className="animate-pulse rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="mx-auto h-24 w-28 rounded-[32px] bg-[#e2e8f0]" />
        <div className="mx-auto mt-4 h-8 w-5/6 rounded-full bg-[#e2e8f0]" />
      </section>

      <section className="space-y-2 px-1">
        <div className="h-5 w-48 rounded-full bg-[#e2e8f0]" />
        <div className="h-4 w-72 rounded-full bg-[#e2e8f0]" />
      </section>

      <section className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-[72px] rounded-[20px] bg-[#e2e8f0]" />
        ))}
      </section>

      <section className="mt-auto space-y-3 pt-1">
        <div className="h-12 rounded-full bg-[#e2e8f0]" />
        <div className="flex items-center gap-3 px-1">
          <div className="h-px flex-1 bg-[#e2e8f0]" />
          <div className="h-3 w-3 rounded-full bg-[#e2e8f0]" />
          <div className="h-px flex-1 bg-[#e2e8f0]" />
        </div>
        <div className="h-12 rounded-full bg-[#e2e8f0]" />
      </section>
    </>
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
    <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
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
