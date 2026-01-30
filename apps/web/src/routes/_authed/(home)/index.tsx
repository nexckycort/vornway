/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
/** biome-ignore-all lint/a11y/noSvgWithoutTitle: <explanation> */

import {
  Bell,
  LayoutGrid,
  Link as LinkIcon,
  Pizza,
  Plane,
  Plus,
  QrCode,
  Search,
  SlidersHorizontal,
  Sofa,
  Users,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { BottomNav } from '~/components/bottom-nav';
import { GradientLayout } from '~/components/gradient-layout';
import { cn } from '~/lib/utils';
import { findGroupByInvite } from './-actions/find-group-by-invite';
import { joinGroup } from './-actions/join-group';
import { useUserGroups } from './-hooks/use-user-groups';

export const Route = createFileRoute('/_authed/(home)/')({
  component: HomePage,
});

const categoryConfig: Record<
  string,
  { icon: typeof Plane; bg: string; color: string; label: string }
> = {
  viajes: {
    icon: Plane,
    bg: 'bg-blue-100',
    color: 'text-blue-600',
    label: 'Viajes',
  },
  roomates: {
    icon: Sofa,
    bg: 'bg-orange-100',
    color: 'text-orange-600',
    label: 'Roomates',
  },
  salidas: {
    icon: Pizza,
    bg: 'bg-pink-100',
    color: 'text-pink-600',
    label: 'Salidas',
  },
  otros: {
    icon: LayoutGrid,
    bg: 'bg-gray-100',
    color: 'text-gray-600',
    label: 'Otros',
  },
};

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

function HomePage() {
  const { user } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [foundGroup, setFoundGroup] = useState<FoundGroup | null>(null);
  const [unregisteredMembers, setUnregisteredMembers] = useState<UnregisteredMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [joinStep, setJoinStep] = useState<'input' | 'select' | 'confirm'>('input');
  const [joinError, setJoinError] = useState<string | null>(null);

  const { data: userGroups = [] } = useUserGroups();

  const findGroupMutation = useMutation({
    mutationFn: findGroupByInvite,
    onSuccess: (result) => {
      if (result.success && result.group) {
        if (result.alreadyMember) {
          navigate({ to: '/groups/$id', params: { id: result.group.id } });
          resetJoinModal();
          return;
        }
        setFoundGroup(result.group);
        setUnregisteredMembers(result.unregisteredMembers);
        if (result.unregisteredMembers.length > 0) {
          setJoinStep('select');
        } else {
          setJoinStep('confirm');
        }
        setJoinError(null);
      } else {
        setJoinError(result.error ?? 'Error al buscar el grupo');
      }
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: joinGroup,
    onSuccess: (result) => {
      if (result.success && result.groupId) {
        queryClient.invalidateQueries({ queryKey: ['user-groups'] });
        navigate({ to: '/groups/$id', params: { id: result.groupId } });
        resetJoinModal();
      } else {
        setJoinError(result.error ?? 'Error al unirse al grupo');
      }
    },
  });

  const resetJoinModal = () => {
    setShowJoinModal(false);
    setShowOptions(false);
    setInviteLink('');
    setFoundGroup(null);
    setUnregisteredMembers([]);
    setSelectedMemberId(null);
    setJoinStep('input');
    setJoinError(null);
  };

  const handleFindGroup = () => {
    if (!inviteLink.trim()) return;
    findGroupMutation.mutate({ data: { inviteCode: inviteLink } });
  };

  const handleJoinGroup = () => {
    if (!foundGroup) return;
    joinGroupMutation.mutate({
      data: {
        groupId: foundGroup.id,
        existingMemberId: selectedMemberId ?? undefined,
      },
    });
  };

  return (
    <GradientLayout>
      <header className="flex items-center justify-between px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#1a1a3e]">Hola, {user?.name}</h1>
        <button className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center">
          <HugeiconsIcon icon={Bell} className="w-5 h-5 text-[#1a1a3e]" />
        </button>
      </header>

      <div className="px-6 mb-6">
        <div className="bg-blue-50 backdrop-blur-sm rounded-lg p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 row-span-2">
              <div className="w-10 h-10 bg-[#e8e4f8] rounded-xl flex items-center justify-center mb-8">
                <div className="flex flex-col gap-0.5">
                  <div className="w-4 h-0.5 bg-[#6060c0] rounded-full" />
                  <div className="w-4 h-0.5 bg-[#6060c0] rounded-full" />
                </div>
              </div>
              <p className="text-gray-500 text-sm">Total gastado</p>
              <p className="text-2xl font-bold text-[#1a1a3e]">$0</p>
            </div>

            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Debes</p>
                  <p className="text-xl font-bold text-[#1a1a3e]">$0</p>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-red-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="7" y1="7" x2="17" y2="17" />
                    <polyline points="17 7 17 17 7 17" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Te deben</p>
                  <p className="text-xl font-bold text-[#1a1a3e]">$0</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-green-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="17" y1="17" x2="7" y2="7" />
                    <polyline points="7 17 7 7 17 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={cn('px-6', userGroups.length > 0 && 'pb-32')}>
        <h2 className="text-lg font-semibold text-[#1a1a3e] mb-4">
          Tus grupos
        </h2>

        <div className="flex gap-3 mb-8">
          <div className="flex-1 relative">
            <HugeiconsIcon
              icon={Search}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar grupos o gastos"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-100 focus:outline-none focus:border-[#8b7bb8] transition-colors"
            />
          </div>
          <button className="w-12 h-12 rounded-xl border-2 border-[#6060c0] flex items-center justify-center bg-white">
            <HugeiconsIcon
              icon={SlidersHorizontal}
              className="w-5 h-5 text-[#6060c0]"
            />
          </button>
        </div>

        {userGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 bg-[#8080d0] rounded-2xl rotate-[-8deg] flex items-center justify-center mb-6 shadow-lg">
              <HugeiconsIcon icon={Users} className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-[#1a1a3e] mb-2">
              No tienes grupos aún
            </h3>
            <p className="text-gray-500">Crea uno es menos de 5 Segundos</p>

            <div className="relative w-full h-32 mt-4">
              <svg
                className="absolute right-8 bottom-0 w-32 h-32"
                viewBox="0 0 128 128"
                fill="none"
              >
                <path
                  d="M20 20 Q60 100 100 80"
                  stroke="#8080d0"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M95 70 L100 80 L90 82"
                  stroke="#8080d0"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {userGroups.map((group) => {
              const config =
                categoryConfig[group.type] ?? categoryConfig.otros;
              const IconComponent = config.icon;
              return (
                <button
                  key={group.id}
                  onClick={() =>
                    navigate({ to: '/groups/$id', params: { id: group.id } })
                  }
                  className="w-full bg-white rounded-2xl p-4 text-left"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center`}
                    >
                      <HugeiconsIcon
                        icon={IconComponent}
                        className={`w-5 h-5 ${config.color}`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#1a1a3e]">
                        {group.name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{config.label}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Footer message */}
            <p className="text-sm text-gray-500 pt-4">
              Ocultamos los grupos sin deudas del último mes.{' '}
              <button className="text-[#4040b0] font-medium">
                Ver todos los grupos
              </button>
            </p>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowOptions(true)}
        className="fixed bottom-26 right-6 w-14 h-14 bg-[#4040b0] rounded-2xl flex items-center justify-center shadow-lg shadow-[#4040b0]/30"
      >
        <HugeiconsIcon icon={Plus} className="w-7 h-7 text-white" />
      </button>

      {showOptions && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowOptions(false)}
          />

          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="px-6 pb-8 space-y-2">
              <button
                onClick={() => {
                  setShowOptions(false);
                  navigate({ to: '/groups/new' });
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-[#e8e4f8] rounded-full flex items-center justify-center">
                  <HugeiconsIcon
                    icon={Plus}
                    className="w-5 h-5 text-[#6060c0]"
                  />
                </div>
                <div>
                  <p className="font-semibold text-[#1a1a3e]">Crear grupo</p>
                  <p className="text-sm text-gray-500">
                    Inicia un nuevo grupo desde cero
                  </p>
                </div>
              </button>

              {/* Unirse a grupo */}
              <button
                onClick={() => {
                  setShowOptions(false);
                  setShowJoinModal(true);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-[#e8e4f8] rounded-full flex items-center justify-center">
                  <HugeiconsIcon
                    icon={Users}
                    className="w-5 h-5 text-[#6060c0]"
                  />
                </div>
                <div>
                  <p className="font-semibold text-[#1a1a3e]">
                    {'¿Te invitaron a un grupo?'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Usa un enlace o código QR para unirte a un grupo
                  </p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal unirse a grupo */}
      {showJoinModal && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={resetJoinModal}
          />

          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="px-6 pb-8">
              <h2 className="text-xl font-bold text-[#1a1a3e] mb-6">
                Unirse a un grupo
              </h2>

              {joinStep === 'input' && (
                <>
                  {/* Opciones */}
                  <div className="space-y-3 mb-6">
                    <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 text-left opacity-50">
                      <div className="w-10 h-10 bg-[#e8e4f8] rounded-xl flex items-center justify-center">
                        <HugeiconsIcon
                          icon={QrCode}
                          className="w-5 h-5 text-[#6060c0]"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-[#1a1a3e]">Escanear código QR</p>
                        <p className="text-sm text-gray-500">Próximamente</p>
                      </div>
                    </button>

                    <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-[#6060c0] bg-[#f8f7fc]">
                      <div className="w-10 h-10 bg-[#e8e4f8] rounded-xl flex items-center justify-center">
                        <HugeiconsIcon
                          icon={LinkIcon}
                          className="w-5 h-5 text-[#6060c0]"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[#1a1a3e] mb-2">Pegar enlace de invitación</p>
                        <input
                          type="text"
                          value={inviteLink}
                          onChange={(e) => setInviteLink(e.target.value)}
                          placeholder="https://splitway.app/join/abc123"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#6060c0]"
                        />
                      </div>
                    </div>
                  </div>

                  {joinError && (
                    <p className="text-red-500 text-sm mb-4">{joinError}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={resetJoinModal}
                      className="flex-1 py-3 text-[#1a1a3e] font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleFindGroup}
                      disabled={!inviteLink.trim() || findGroupMutation.isPending}
                      className={cn(
                        'flex-1 py-3 font-medium rounded-xl transition-colors',
                        inviteLink.trim() && !findGroupMutation.isPending
                          ? 'bg-[#4040b0] text-white'
                          : 'bg-gray-200 text-gray-400'
                      )}
                    >
                      {findGroupMutation.isPending ? 'Buscando...' : 'Buscar grupo'}
                    </button>
                  </div>
                </>
              )}

              {joinStep === 'select' && foundGroup && (
                <>
                  <div className="bg-[#f8f7fc] rounded-2xl p-4 mb-6">
                    <p className="font-semibold text-[#1a1a3e]">{foundGroup.name}</p>
                    <p className="text-sm text-gray-500">{foundGroup.memberCount} participantes</p>
                  </div>

                  <p className="text-[#1a1a3e] mb-4">
                    Hay participantes sin cuenta asociada. ¿Eres alguno de ellos?
                  </p>

                  <div className="space-y-2 mb-6">
                    {unregisteredMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => setSelectedMemberId(member.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-4 rounded-xl transition-colors text-left',
                          selectedMemberId === member.id
                            ? 'bg-[#4040b0] text-white'
                            : 'bg-gray-50 text-[#1a1a3e]'
                        )}
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-medium',
                            selectedMemberId === member.id
                              ? 'bg-white/20 text-white'
                              : 'bg-[#e8e4f8] text-[#6060c0]'
                          )}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{member.name}</span>
                      </button>
                    ))}

                    <button
                      onClick={() => setSelectedMemberId(null)}
                      className={cn(
                        'w-full flex items-center gap-3 p-4 rounded-xl transition-colors text-left',
                        selectedMemberId === null
                          ? 'bg-[#4040b0] text-white'
                          : 'bg-gray-50 text-[#1a1a3e]'
                      )}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          selectedMemberId === null
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-200 text-gray-500'
                        )}
                      >
                        <HugeiconsIcon icon={Plus} className="w-4 h-4" />
                      </div>
                      <span className="font-medium">No, soy alguien nuevo</span>
                    </button>
                  </div>

                  {joinError && (
                    <p className="text-red-500 text-sm mb-4">{joinError}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setJoinStep('input')}
                      className="flex-1 py-3 text-[#1a1a3e] font-medium"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleJoinGroup}
                      disabled={joinGroupMutation.isPending}
                      className="flex-1 py-3 bg-[#4040b0] text-white font-medium rounded-xl"
                    >
                      {joinGroupMutation.isPending ? 'Uniéndose...' : 'Unirme al grupo'}
                    </button>
                  </div>
                </>
              )}

              {joinStep === 'confirm' && foundGroup && (
                <>
                  <div className="bg-[#f8f7fc] rounded-2xl p-4 mb-6">
                    <p className="font-semibold text-[#1a1a3e]">{foundGroup.name}</p>
                    <p className="text-sm text-gray-500">{foundGroup.memberCount} participantes</p>
                  </div>

                  <p className="text-[#1a1a3e] mb-6">
                    Te unirás como <strong>{user?.name}</strong> a este grupo.
                  </p>

                  {joinError && (
                    <p className="text-red-500 text-sm mb-4">{joinError}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setJoinStep('input')}
                      className="flex-1 py-3 text-[#1a1a3e] font-medium"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleJoinGroup}
                      disabled={joinGroupMutation.isPending}
                      className="flex-1 py-3 bg-[#4040b0] text-white font-medium rounded-xl"
                    >
                      {joinGroupMutation.isPending ? 'Uniéndose...' : 'Unirme al grupo'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </GradientLayout>
  );
}
