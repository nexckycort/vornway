import { useMutation } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { CheckCircle, Loader2, Plus, Users, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { findGroupByInvite } from '~/routes/_authed/(home)/-actions/find-group-by-invite';
import { joinGroup } from '~/routes/_authed/(home)/-actions/join-group';

export const Route = createFileRoute('/_authed/join/$invite-code')({
  component: RouteComponent,
});

interface UnregisteredMember {
  id: string;
  name: string;
}

interface FoundGroup {
  id: string;
  name: string;
  type: string;
  memberCount: number;
}

function RouteComponent() {
  const { 'invite-code': inviteCode } = Route.useParams();
  const { user } = Route.useRouteContext();
  const router = useRouter();

  const [foundGroup, setFoundGroup] = useState<FoundGroup | null>(null);
  const [unregisteredMembers, setUnregisteredMembers] = useState<UnregisteredMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [step, setStep] = useState<'loading' | 'select' | 'confirm' | 'success' | 'error' | 'already-member'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const findGroupMutation = useMutation({
    mutationFn: findGroupByInvite,
    onSuccess: (result) => {
      if (result.success && result.group) {
        if (result.alreadyMember) {
          setFoundGroup(result.group);
          setStep('already-member');
          return;
        }
        setFoundGroup(result.group);
        setUnregisteredMembers(result.unregisteredMembers);
        if (result.unregisteredMembers.length > 0) {
          setStep('select');
        } else {
          setStep('confirm');
        }
      } else {
        setErrorMessage(result.error ?? 'Código de invitación inválido');
        setStep('error');
      }
    },
    onError: () => {
      setErrorMessage('Error al buscar el grupo');
      setStep('error');
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: joinGroup,
    onSuccess: (result) => {
      if (result.success) {
        setStep('success');
      } else {
        setErrorMessage(result.error ?? 'Error al unirse al grupo');
      }
    },
    onError: () => {
      setErrorMessage('Error al unirse al grupo');
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: only run on mount/inviteCode change
  useEffect(() => {
    if (inviteCode) {
      findGroupMutation.mutate({ data: { inviteCode } });
    }
  }, [inviteCode]);

  const handleJoinGroup = () => {
    if (!foundGroup) return;
    joinGroupMutation.mutate({
      data: {
        groupId: foundGroup.id,
        existingMemberId: selectedMemberId ?? undefined,
      },
    });
  };

  const goToGroup = () => {
    if (foundGroup) {
      router.navigate({ to: '/groups/$id', params: { id: foundGroup.id } });
    }
  };

  const goToHome = () => {
    router.navigate({ to: '/' });
  };

  return (
    <div className="min-h-screen bg-[#f5f3fa] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Loading */}
        {step === 'loading' && (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-[#e8e4f8] rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-[#6060c0] animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-[#1a1a3e] mb-2">
              Buscando grupo...
            </h2>
            <p className="text-gray-500">
              Verificando el código de invitación
            </p>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-[#1a1a3e] mb-2">
              Enlace inválido
            </h2>
            <p className="text-gray-500 mb-6">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={goToHome}
              className="w-full py-4 bg-[#4040b0] text-white font-medium rounded-2xl"
            >
              Ir al inicio
            </button>
          </div>
        )}

        {/* Already member */}
        {step === 'already-member' && foundGroup && (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-[#e8e4f8] rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-[#6060c0]" />
            </div>
            <h2 className="text-xl font-bold text-[#1a1a3e] mb-2">
              Ya eres miembro
            </h2>
            <p className="text-gray-500 mb-6">
              Ya formas parte del grupo <strong>{foundGroup.name}</strong>
            </p>
            <button
              type="button"
              onClick={goToGroup}
              className="w-full py-4 bg-[#4040b0] text-white font-medium rounded-2xl"
            >
              Ir al grupo
            </button>
          </div>
        )}

        {/* Select member */}
        {step === 'select' && foundGroup && (
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#e8e4f8] rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[#6060c0]" />
              </div>
              <h2 className="text-xl font-bold text-[#1a1a3e] mb-1">
                {foundGroup.name}
              </h2>
              <p className="text-gray-500">
                {foundGroup.memberCount} participantes
              </p>
            </div>

            <p className="text-[#1a1a3e] mb-4 text-center">
              Hay participantes sin cuenta asociada. ¿Eres alguno de ellos?
            </p>

            <div className="space-y-2 mb-6">
              {unregisteredMembers.map((member) => (
                <button
                  type="button"
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors text-left ${
                    selectedMemberId === member.id
                      ? 'bg-[#4040b0] text-white'
                      : 'bg-gray-50 text-[#1a1a3e]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                      selectedMemberId === member.id
                        ? 'bg-white/20 text-white'
                        : 'bg-[#e8e4f8] text-[#6060c0]'
                    }`}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{member.name}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setSelectedMemberId(null)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors text-left ${
                  selectedMemberId === null
                    ? 'bg-[#4040b0] text-white'
                    : 'bg-gray-50 text-[#1a1a3e]'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedMemberId === null
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-medium">No, soy alguien nuevo</span>
              </button>
            </div>

            {errorMessage && (
              <p className="text-red-500 text-sm text-center mb-4">{errorMessage}</p>
            )}

            <button
              type="button"
              onClick={handleJoinGroup}
              disabled={joinGroupMutation.isPending}
              className="w-full py-4 bg-[#4040b0] text-white font-medium rounded-2xl disabled:opacity-50"
            >
              {joinGroupMutation.isPending ? 'Uniéndose...' : 'Unirme al grupo'}
            </button>
          </div>
        )}

        {/* Confirm (no unregistered members) */}
        {step === 'confirm' && foundGroup && (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-[#e8e4f8] rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-[#6060c0]" />
            </div>
            <h2 className="text-xl font-bold text-[#1a1a3e] mb-1">
              {foundGroup.name}
            </h2>
            <p className="text-gray-500 mb-6">
              {foundGroup.memberCount} participantes
            </p>

            <p className="text-[#1a1a3e] mb-6">
              Te unirás como <strong>{user?.name}</strong> a este grupo.
            </p>

            {errorMessage && (
              <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleJoinGroup}
                disabled={joinGroupMutation.isPending}
                className="w-full py-4 bg-[#4040b0] text-white font-medium rounded-2xl disabled:opacity-50"
              >
                {joinGroupMutation.isPending ? 'Uniéndose...' : 'Unirme al grupo'}
              </button>
              <button
                type="button"
                onClick={goToHome}
                className="w-full py-4 text-[#1a1a3e] font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {step === 'success' && foundGroup && (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-[#1a1a3e] mb-2">
              ¡Te uniste al grupo!
            </h2>
            <p className="text-gray-500 mb-6">
              Ahora eres parte de <strong>{foundGroup.name}</strong>
            </p>
            <button
              type="button"
              onClick={goToGroup}
              className="w-full py-4 bg-[#4040b0] text-white font-medium rounded-2xl"
            >
              Ir al grupo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
