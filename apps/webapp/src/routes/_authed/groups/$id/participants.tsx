import { Button } from '#/components/ui/button';
import { useAddMemberMutation } from '#/routes/_authed/groups/-hooks/use-group-actions';
import { useGroupSummaryQuery } from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { ArrowLeft, Share2, UserPlus } from 'lucide-react';
import { useState } from 'react';

export const Route = createFileRoute('/_authed/groups/$id/participants')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const groupQuery = useGroupSummaryQuery(id);
  const addMemberMutation = useAddMemberMutation(id);
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const group = groupQuery.data;
  const inviteLink =
    group?.inviteCode && typeof window !== 'undefined'
      ? `${window.location.origin}/join/${group.inviteCode}`
      : '';

  const addMember = async () => {
    const trimmed = name.trim();
    if (!trimmed || addMemberMutation.isPending) return;
    setMessage(null);

    try {
      await addMemberMutation.mutateAsync({ name: trimmed });
      setName('');
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
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto min-h-screen w-full max-w-[412px] bg-[#fafafa] px-4 pb-10 pt-8">
        <header className="mb-6">
          <Link
            to="/groups/$id"
            params={{ id }}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#334155]"
          >
            <ArrowLeft className="size-4" />
            Atrás
          </Link>
          <h1 className="text-2xl font-semibold leading-8 text-[#132238]">
            Participantes
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            {group?.name ?? 'Grupo'}
          </p>
        </header>

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
              onChange={(event) => setName(event.target.value)}
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
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f0f0ff] font-semibold text-primary">
                {member.name.charAt(0).toUpperCase()}
              </div>
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
      </div>
    </main>
  );
}
