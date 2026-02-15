/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
/** biome-ignore-all lint/a11y/noLabelWithoutControl: <explanation> */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ChevronLeft, Share2, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { AppDrawer } from '~/components/app-drawer';
import { GradientLayout } from '~/components/gradient-layout';
import { getGroup } from '../-actions/get-group';
import { removeMember } from '../-actions/remove-member';
import { addMember } from './-actions/add-member';

export const Route = createFileRoute('/_authed/groups/$id/participants/')({
  component: EditParticipants,
});

function EditParticipants() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [participantName, setParticipantName] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: async () => getGroup({ data: { groupId: id } }),
  });

  const addMemberMutation = useMutation({
    mutationFn: addMember,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['group', id] });
        setParticipantName('');
      }
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: removeMember,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['group', id] });
        setMemberToDelete(null);
      }
    },
  });

  const inviteLink = data?.inviteCode
    ? `${window.location.origin}/join/${data.inviteCode}`
    : '';

  const handleShareLink = async () => {
    if (!inviteLink) return;
    try {
      if (navigator.share) {
        await navigator.share({ url: inviteLink });
      } else {
        await navigator.clipboard.writeText(inviteLink);
      }
    } catch (err) {
      console.error('Error sharing link:', err);
    }
  };

  const handleAddParticipant = () => {
    const trimmedName = participantName.trim();
    if (!trimmedName || addMemberMutation.isPending) return;

    addMemberMutation.mutate({
      data: {
        groupId: id,
        name: trimmedName,
      },
    });
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    setMemberToDelete({ id: memberId, name: memberName });
  };

  const confirmRemoveMember = () => {
    if (!memberToDelete || removeMemberMutation.isPending) return;
    removeMemberMutation.mutate({
      data: {
        groupId: id,
        memberId: memberToDelete.id,
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddParticipant();
    }
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  if (isLoading) {
    return (
      <GradientLayout className="native-enter flex items-center justify-center pb-8">
        <p className="text-gray-500">Cargando...</p>
      </GradientLayout>
    );
  }

  return (
    <GradientLayout className="native-enter pb-8">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="native-surface-muted flex items-center gap-2 px-3 py-2.5">
          <button
            onClick={() =>
              router.navigate({ to: '/groups/$id', params: { id } })
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-semibold text-[#1a1a3e]">
            Editar participantes
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4">
        {/* Share invite link */}
        <div className="mb-6 rounded-3xl border border-white/60 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
          <p className="text-gray-600 mb-3">Compartir enlace del grupo</p>
          <div className="flex gap-3">
            <div className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
              <span className="text-gray-500 text-sm truncate block">
                {inviteLink}
              </span>
            </div>
            <button
              onClick={handleShareLink}
              className="w-14 h-14 border-2 border-[#4040b0] rounded-xl flex items-center justify-center flex-shrink-0"
            >
              <Share2 className="w-5 h-5 text-[#4040b0]" />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-sm text-gray-500">
              Añadir manualmente
            </span>
          </div>
        </div>

        {/* Add participant input */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Nombre del participante"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-[#1a1a3e] placeholder:text-gray-400 focus:outline-none focus:border-[#6060c0]"
          />
          <button
            onClick={handleAddParticipant}
            disabled={!participantName.trim() || addMemberMutation.isPending}
            className="w-14 h-14 bg-[#4040b0] rounded-xl flex items-center justify-center disabled:opacity-50 flex-shrink-0"
          >
            <UserPlus className="w-6 h-6 text-white" />
          </button>
        </div>

        {addMemberMutation.data && !addMemberMutation.data.success && (
          <p className="text-red-500 text-sm mb-4">
            {addMemberMutation.data.error}
          </p>
        )}

        {/* Members list */}
        <div className="space-y-3">
          {data?.members?.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#e8e4f8] rounded-full flex items-center justify-center">
                  <span className="text-[#6060c0] font-semibold">
                    {getInitial(member.name)}
                  </span>
                </div>
                <span className="font-medium text-[#1a1a3e]">
                  {member.name}
                  {member.isCurrentUser && ' (Tu)'}
                </span>
              </div>
              {data?.isOwner && (
                <button
                  onClick={() => handleRemoveMember(member.id, member.name)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-black/5 bg-white/85 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() =>
              router.navigate({ to: '/groups/$id', params: { id } })
            }
            className="flex-1 py-4 text-[#1a1a3e] font-medium"
          >
            Omitir
          </button>
          <button
            type="button"
            onClick={() =>
              router.navigate({ to: '/groups/$id', params: { id } })
            }
            className="flex-1 py-4 bg-[#4040b0] text-white font-medium rounded-2xl"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Confirm delete member modal */}
      {memberToDelete && (
        <AppDrawer
          open={Boolean(memberToDelete)}
          onOpenChange={(open) => {
            if (!open) {
              setMemberToDelete(null);
            }
          }}
        >
          <div className="max-h-[84vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="px-6 pb-8">
              <h2 className="text-xl font-bold text-[#1a1a3e] mb-2">
                Eliminar participante
              </h2>
              <p className="text-gray-600 mb-6">
                ¿Eliminar a <strong>{memberToDelete.name}</strong> del grupo?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMemberToDelete(null)}
                  className="flex-1 py-3 text-[#1a1a3e] font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmRemoveMember}
                  disabled={removeMemberMutation.isPending}
                  className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl disabled:opacity-60"
                >
                  {removeMemberMutation.isPending
                    ? 'Eliminando...'
                    : 'Eliminar'}
                </button>
              </div>
              {removeMemberMutation.data?.error && (
                <p className="text-red-500 text-sm mt-3">
                  {removeMemberMutation.data.error}
                </p>
              )}
            </div>
          </div>
        </AppDrawer>
      )}
    </GradientLayout>
  );
}
