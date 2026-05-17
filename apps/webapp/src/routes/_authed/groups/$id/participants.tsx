import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { useAddMemberMutation } from '#/routes/_authed/groups/-hooks/use-group-actions';
import { useGroupSummaryQuery } from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { useGroupMemberSearchQuery } from '#/routes/_authed/groups/-hooks/use-group-member-search-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Share2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/_authed/groups/$id/participants')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const groupQuery = useGroupSummaryQuery(id);
  const addMemberMutation = useAddMemberMutation(id);
  const [name, setName] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const group = groupQuery.data;
  const searchQuery = useGroupMemberSearchQuery(id, debouncedSearch);
  const searchResults = searchQuery.data?.data ?? [];
  const inviteLink =
    group?.inviteCode && typeof window !== 'undefined'
      ? `${window.location.origin}/join/${group.inviteCode}`
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

  return (
    <MobilePageLayout
      title="Agregar participantes"
      onBack={() =>
        navigate({ to: '/groups/$id', params: { id }, replace: true })
      }
    >
      <section className="mb-5 rounded-2xl border border-[#e2e8f0] bg-white p-4">
        <p className="mb-2 text-sm font-medium text-[#132238]">
          Compartir enlace del grupo
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
          <p className="mt-3 text-sm text-[#64748b]">Buscando coincidencias...</p>
        ) : null}

        {debouncedSearch && !searchQuery.isFetching && searchResults.length === 0 ? (
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
                      ? 'Este usuario ya está agregado en el grupo'
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
                        Ya está en el grupo
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
              </p>
              <p className="truncate text-xs text-[#64748b]">
                {member.email ?? 'Sin cuenta vinculada'}
              </p>
            </div>
          </article>
        ))}
      </section>
    </MobilePageLayout>
  );
}
