import { createFileRoute } from '@tanstack/react-router';
import { Crown, Link2Off, Share2, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';
import {
  useAddMemberMutation,
  useRemoveMemberMutation,
  useUnlinkMemberMutation,
} from '#/routes/_authed/groups/-hooks/use-group-actions';
import { useGroupSummaryQuery } from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { useGroupMemberSearchQuery } from '#/routes/_authed/groups/-hooks/use-group-member-search-query';

export const Route = createFileRoute('/_authed/groups/$id/participants')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { navigateToGroupRoot } = useGroupFlowNavigation(id);
  const groupQuery = useGroupSummaryQuery(id);
  const addMemberMutation = useAddMemberMutation(id);
  const removeMemberMutation = useRemoveMemberMutation(id);
  const unlinkMemberMutation = useUnlinkMemberMutation(id);
  const [name, setName] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<
    NonNullable<typeof groupQuery.data>['members'][number] | null
  >(null);
  const [memberToUnlink, setMemberToUnlink] = useState<
    NonNullable<typeof groupQuery.data>['members'][number] | null
  >(null);

  const group = groupQuery.data;
  const searchQuery = useGroupMemberSearchQuery(id, debouncedSearch);
  const searchResults = searchQuery.data?.data ?? [];
  const inviteLink =
    group?.inviteCode && typeof window !== 'undefined'
      ? `https://join.vornway.com/${group.inviteCode}`
      : '';

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const addMember = async () => {
    const trimmed = name.trim();
    if (!trimmed || addMemberMutation.isPending) return;
    setMessage(null);

    try {
      await addMemberMutation.mutateAsync({
        name: trimmed,
        ...(selectedUserId ? { linkedUserId: selectedUserId } : {}),
      });
      setName('');
      setSearchInput('');
      setSelectedUserId(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo agregar el participante',
      );
    }
  };

  const shareInvite = async () => {
    if (!inviteLink) return;
    try {
      if (navigator.share) {
        await navigator.share({ url: inviteLink });
        return;
      }
      await navigator.clipboard.writeText(inviteLink);
      setMessage('Enlace copiado');
    } catch {
      setMessage('No se pudo compartir el enlace');
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      await removeMemberMutation.mutateAsync({
        memberId: memberToRemove.id,
      });
      setMessage('Participante eliminado correctamente');
      setMemberToRemove(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el participante',
      );
    }
  };

  const handleUnlinkMember = async () => {
    if (!memberToUnlink) return;

    try {
      await unlinkMemberMutation.mutateAsync({
        memberId: memberToUnlink.id,
      });
      setMessage('Cuenta desvinculada correctamente');
      setMemberToUnlink(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo desvincular la cuenta',
      );
    }
  };

  return (
    <MobilePageLayout
      title="Agregar participantes"
      onBack={() => navigateToGroupRoot(true)}
    >
      <section className="mb-5 rounded-2xl border border-[#e2e8f0] bg-white p-4">
        <p className="mb-2 text-sm font-medium text-[#132238]">
          Compartir enlace del espacio
        </p>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1 rounded-2xl bg-[#f8fafc] px-3 py-3">
            <p className="truncate text-xs text-[#64748b]">{inviteLink}</p>
          </div>
          <Button
            type="button"
            size="icon"
            className="size-11 rounded-2xl"
            onClick={shareInvite}
          >
            <Share2 className="size-4" />
          </Button>
        </div>
      </section>

      <section className="mb-5">
        <label
          htmlFor="member-name"
          className="mb-2 block text-sm font-medium text-[#334155]"
        >
          Añadir manualmente
        </label>
        <div className="flex gap-2">
          <input
            id="member-name"
            value={name}
            onChange={(event) => {
              const value = event.target.value;
              setName(value);
              setSearchInput(value);
              setSelectedUserId(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void addMember();
              }
            }}
            placeholder="Nombre del participante"
            className="h-12 min-w-0 flex-1 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none focus:border-primary"
          />
          <Button
            type="button"
            size="icon"
            className="size-12 rounded-2xl"
            disabled={!name.trim() || addMemberMutation.isPending}
            onClick={addMember}
          >
            <UserPlus className="size-5" />
          </Button>
        </div>

        <p className="mt-2 text-xs text-[#64748b]">
          Si encontramos un usuario registrado con ese nombre o correo, lo
          mostraremos debajo. Si no, puedes crear el participante manualmente.
        </p>

        {searchQuery.isFetching ? (
          <p className="mt-3 text-sm text-[#64748b]">
            Buscando coincidencias...
          </p>
        ) : null}

        {debouncedSearch &&
        !searchQuery.isFetching &&
        searchResults.length === 0 ? (
          <p className="mt-3 text-sm text-[#64748b]">
            No encontramos coincidencias. Puedes crearlo solo con el nombre.
          </p>
        ) : null}

        {searchResults.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2">
            {searchResults.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => {
                  setName(candidate.name);
                  setSearchInput(candidate.name);
                  setSelectedUserId(candidate.id);
                  setMessage(
                    candidate.isAlreadyMember
                      ? 'Este usuario ya está agregado en el espacio'
                      : `Usuario seleccionado: ${candidate.name}`,
                  );
                }}
                className={`rounded-2xl border px-4 py-3 text-left ${
                  selectedUserId === candidate.id
                    ? 'border-primary bg-primary/5'
                    : 'border-[#e2e8f0] bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#132238]">
                      {candidate.name}
                    </p>
                    <p className="truncate text-xs text-[#64748b]">
                      {candidate.email}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-[11px] text-[#64748b]">
                    {candidate.isAlreadyMember ? (
                      <span className="rounded-full bg-[#f8fafc] px-2 py-1">
                        Ya está en el espacio
                      </span>
                    ) : null}
                    {candidate.isCurrentUser ? (
                      <span className="rounded-full bg-[#f8fafc] px-2 py-1">
                        Tú
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {message ? (
        <p className="mb-4 rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm text-[#64748b]">
          {message}
        </p>
      ) : null}

      <section className="flex flex-col gap-2">
        {(group?.members ?? []).map((member) => (
          <article
            key={member.id}
            className="flex items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white p-4"
          >
            {member.image ? (
              <img
                src={member.image}
                alt={member.name}
                className="size-10 shrink-0 rounded-full border border-[#e2e8f0] object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f0f0ff] font-semibold text-primary">
                {member.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#132238]">
                {member.name}
                {member.isCurrentUser ? (
                  <span className="ml-1 text-xs text-[#94a3b8]">(tú)</span>
                ) : null}
                {group?.ownerId === member.userId ? (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    <Crown className="size-3" />
                    Dueño
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-[#64748b]">
                {member.email ?? 'Sin cuenta vinculada'}
              </p>
              {group?.isOwner && !member.isCurrentUser ? (
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#94a3b8]">
                  {member.userId ? (
                    <span className="rounded-full bg-[#f8fafc] px-2 py-1">
                      Cuenta vinculada
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#f8fafc] px-2 py-1">
                      Sin cuenta vinculada
                    </span>
                  )}
                  <span className="rounded-full bg-[#f8fafc] px-2 py-1">
                    {member.expenseCount > 0
                      ? 'No se puede eliminar: tiene gastos'
                      : 'Se puede eliminar'}
                  </span>
                </div>
              ) : null}
            </div>
            {group?.isOwner && !member.isCurrentUser ? (
              <div className="flex items-center gap-2">
                {member.userId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10 rounded-2xl text-amber-600"
                    onClick={() => setMemberToUnlink(member)}
                  >
                    <Link2Off className="size-4" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10 rounded-2xl text-red-500"
                  disabled={member.expenseCount > 0}
                  onClick={() => setMemberToRemove(member)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <Drawer
        open={Boolean(memberToUnlink)}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToUnlink(null);
          }
        }}
      >
        <DrawerContent>
          {memberToUnlink ? (
            <>
              <DrawerHeader>
                <DrawerTitle>Desvincular cuenta</DrawerTitle>
                <DrawerDescription>
                  Se quitará la cuenta vinculada, pero el nombre del
                  participante permanecerá para que otra persona lo pueda
                  reclamar más adelante.
                </DrawerDescription>
              </DrawerHeader>

              <div className="px-5 pb-2">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Vas a desvincular a <strong>{memberToUnlink.name}</strong> de
                  su cuenta actual.
                </div>
              </div>

              <DrawerFooter>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 rounded-full"
                  disabled={unlinkMemberMutation.isPending}
                  onClick={handleUnlinkMember}
                >
                  {unlinkMemberMutation.isPending
                    ? 'Desvinculando...'
                    : 'Sí, desvincular cuenta'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full"
                  onClick={() => setMemberToUnlink(null)}
                >
                  Cancelar
                </Button>
              </DrawerFooter>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>

      <Drawer
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToRemove(null);
          }
        }}
      >
        <DrawerContent>
          {memberToRemove ? (
            <>
              <DrawerHeader>
                <DrawerTitle>Eliminar participante</DrawerTitle>
                <DrawerDescription>
                  Solo puedes eliminarlo si no tiene gastos.
                </DrawerDescription>
              </DrawerHeader>

              <div className="px-5 pb-2">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Vas a eliminar a <strong>{memberToRemove.name}</strong> del
                  espacio.
                </div>
              </div>

              <DrawerFooter>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 rounded-full"
                  disabled={removeMemberMutation.isPending}
                  onClick={handleRemoveMember}
                >
                  {removeMemberMutation.isPending
                    ? 'Eliminando...'
                    : 'Sí, eliminar participante'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full"
                  onClick={() => setMemberToRemove(null)}
                >
                  Cancelar
                </Button>
              </DrawerFooter>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </MobilePageLayout>
  );
}
