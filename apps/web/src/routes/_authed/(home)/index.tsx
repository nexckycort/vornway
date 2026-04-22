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
  Sofa,
  Users,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Compass, Repeat2, Target, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppDrawer } from '~/components/app-drawer';
import { GradientLayout } from '~/components/gradient-layout';
import { cn } from '~/lib/utils';
import { deleteGroup } from './-actions/delete-group';
import { findGroupByInvite } from './-actions/find-group-by-invite';
import { joinGroup } from './-actions/join-group';
import {
  HomeGroupsSkeleton,
  HomeItinerariesSkeleton,
  HomeSummarySkeleton,
} from './-components/home-skeletons';
import { useUserGroups } from './-hooks/use-user-groups';
import { useUserItineraries } from './-hooks/use-user-itineraries';

export const Route = createFileRoute('/_authed/(home)/')({
  component: HomePage,
});

const OPEN_HOME_OPTIONS_EVENT = 'splitway:open-home-options';

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

interface HomeGroup {
  id: string;
  name: string;
  type: string;
  ownerId: string;
  currentUserBalances: Record<string, number>;
  currentUserDebtsByCurrency: Record<string, number>;
  currentUserCreditsByCurrency: Record<string, number>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatItineraryDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function SwipeableGroupItem({
  group,
  onOpenGroup,
  onDeleteGroup,
  canDelete,
  isOwner,
}: {
  group: HomeGroup;
  onOpenGroup: (groupId: string) => void;
  onDeleteGroup: (group: HomeGroup) => void;
  canDelete: boolean;
  isOwner: boolean;
}) {
  const config = categoryConfig[group.type] ?? categoryConfig.otros;
  const IconComponent = config.icon;
  const isMetaGroup = group.type === 'meta';
  const SWIPE_WIDTH = 88;
  const SWIPE_THRESHOLD = 44;
  const FULL_SWIPE_THRESHOLD = 78;
  const [translateX, setTranslateX] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [didSwipe, setDidSwipe] = useState(false);
  const isOpen = translateX <= -SWIPE_THRESHOLD;

  const handleTouchStart = (event: React.TouchEvent<HTMLButtonElement>) => {
    if (!canDelete) return;
    const touch = event.touches[0];
    setStartX(touch.clientX);
    setStartY(touch.clientY);
    setIsDragging(true);
    setDidSwipe(false);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLButtonElement>) => {
    if (!canDelete) return;
    if (!isDragging || startX === null || startY === null) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    const nextTranslateX = Math.max(-SWIPE_WIDTH, Math.min(0, deltaX));
    if (Math.abs(nextTranslateX) > 6) {
      setDidSwipe(true);
    }
    setTranslateX(nextTranslateX);
  };

  const handleTouchEnd = () => {
    if (!canDelete) return;
    if (!isDragging) return;
    const shouldTriggerDelete = translateX <= -FULL_SWIPE_THRESHOLD;
    const shouldOpenActions = translateX <= -SWIPE_THRESHOLD;

    if (shouldTriggerDelete) {
      setTranslateX(0);
      onDeleteGroup(group);
    } else if (shouldOpenActions) {
      setTranslateX(-SWIPE_WIDTH);
    } else {
      setTranslateX(0);
    }

    setIsDragging(false);
    setStartX(null);
    setStartY(null);
  };

  const handleOpenGroup = () => {
    if (!canDelete) {
      onOpenGroup(group.id);
      return;
    }
    if (didSwipe) {
      setDidSwipe(false);
      return;
    }
    if (isOpen) {
      setTranslateX(0);
      return;
    }
    onOpenGroup(group.id);
  };

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!canDelete) return;
    event.stopPropagation();
    onDeleteGroup(group);
    setTranslateX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {canDelete && (
        <div className="absolute inset-y-0 right-0 w-[88px] bg-red-500 flex items-center justify-center rounded-2xl">
          <button
            type="button"
            onClick={handleDelete}
            className="h-full w-full flex flex-col items-center justify-center text-white"
          >
            <Trash2 className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Borrar</span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleOpenGroup}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={cn(
          'native-tap w-full rounded-2xl p-4 text-left transition-transform duration-200',
          isMetaGroup ? 'bg-[#eefbf5] border border-[#d7f3e5]' : 'bg-white',
        )}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        <div className="flex items-start gap-3">
          {isMetaGroup ? (
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-700" />
            </div>
          ) : (
            <div
              className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center`}
            >
              <HugeiconsIcon
                icon={IconComponent}
                className={`w-5 h-5 ${config.color}`}
              />
            </div>
          )}
          <div className="flex-1">
            <p className="font-semibold text-[#1a1a3e]">{group.name}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {!isMetaGroup && <span>{config.label}</span>}
              {isMetaGroup && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                  Meta
                </span>
              )}
              {isOwner && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#e8e4f8] text-[#4040b0]">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

function MetaGroupList({
  metaGroups,
  userId,
  navigate,
  onDeleteGroup,
}: {
  metaGroups: HomeGroup[];
  userId?: string;
  navigate: ReturnType<typeof Route.useNavigate>;
  onDeleteGroup: (group: HomeGroup) => void;
}) {
  return (
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      {metaGroups.map((metaGroup) => (
        <SwipeableGroupItem
          key={metaGroup.id}
          group={metaGroup}
          onOpenGroup={(groupId) =>
            navigate({ to: '/goals/$id', params: { id: groupId } })
          }
          onDeleteGroup={onDeleteGroup}
          canDelete={metaGroup.ownerId === userId}
          isOwner={metaGroup.ownerId === userId}
        />
      ))}
    </div>
  );
}

function HomePage() {
  const { user } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  // const [searchQuery, setSearchQuery] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [foundGroup, setFoundGroup] = useState<FoundGroup | null>(null);
  const [unregisteredMembers, setUnregisteredMembers] = useState<
    UnregisteredMember[]
  >([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [joinStep, setJoinStep] = useState<'input' | 'select' | 'confirm'>(
    'input',
  );
  const [joinError, setJoinError] = useState<string | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<HomeGroup | null>(null);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [deleteGroupNameInput, setDeleteGroupNameInput] = useState('');
  const [copiedGroupName, setCopiedGroupName] = useState(false);
  const [showDebtsDrawer, setShowDebtsDrawer] = useState(false);
  const [showCreditsDrawer, setShowCreditsDrawer] = useState(false);

  useEffect(() => {
    const handleOpenHomeOptions = () => {
      setShowOptions(true);
    };

    window.addEventListener(OPEN_HOME_OPTIONS_EVENT, handleOpenHomeOptions);

    try {
      if (sessionStorage.getItem(OPEN_HOME_OPTIONS_EVENT) === '1') {
        sessionStorage.removeItem(OPEN_HOME_OPTIONS_EVENT);
        setShowOptions(true);
      }
    } catch {}

    return () => {
      window.removeEventListener(
        OPEN_HOME_OPTIONS_EVENT,
        handleOpenHomeOptions,
      );
    };
  }, []);

  const { data: userGroups = [], isLoading: isLoadingGroups } = useUserGroups();
  const isDevApp = (import.meta.env.VITE_APP_ENV ?? 'prod') === 'dev';
  const { data: userItineraries = [], isLoading: isLoadingItineraries } =
    useUserItineraries({
      enabled: isDevApp,
    });
  const regularGroups = userGroups.filter((group) => group.type !== 'meta');
  const metaGroups = userGroups.filter((group) => group.type === 'meta');
  const hasRegularGroups = regularGroups.length > 0;
  const hasMetaGroups = metaGroups.length > 0;
  const hasItineraries = userItineraries.length > 0;

  const debtsByCurrency: Record<string, number> = {};
  const creditsByCurrency: Record<string, number> = {};

  for (const group of regularGroups) {
    for (const [currency, amount] of Object.entries(
      group.currentUserDebtsByCurrency ?? {},
    )) {
      if (amount > 0) {
        debtsByCurrency[currency] = (debtsByCurrency[currency] ?? 0) + amount;
      }
    }

    for (const [currency, amount] of Object.entries(
      group.currentUserCreditsByCurrency ?? {},
    )) {
      if (amount > 0) {
        creditsByCurrency[currency] =
          (creditsByCurrency[currency] ?? 0) + amount;
      }
    }
  }

  const debtEntries = Object.entries(debtsByCurrency).sort(
    (a, b) => b[1] - a[1],
  );
  const creditEntries = Object.entries(creditsByCurrency).sort(
    (a, b) => b[1] - a[1],
  );

  const findGroupMutation = useMutation({
    mutationFn: findGroupByInvite,
    onSuccess: (result) => {
      if (result.success && result.group) {
        if (result.alreadyMember) {
          if (result.group.type === 'meta') {
            navigate({ to: '/goals/$id', params: { id: result.group.id } });
          } else {
            navigate({ to: '/groups/$id', params: { id: result.group.id } });
          }
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
        if (foundGroup?.type === 'meta') {
          navigate({ to: '/goals/$id', params: { id: result.groupId } });
        } else {
          navigate({ to: '/groups/$id', params: { id: result.groupId } });
        }
        resetJoinModal();
      } else {
        setJoinError(result.error ?? 'Error al unirse al grupo');
      }
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['user-groups'] });
        setShowDeleteGroupModal(false);
        setGroupToDelete(null);
        setDeleteGroupNameInput('');
        setCopiedGroupName(false);
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

  const handleOpenCreateGoal = () => {
    setShowOptions(false);
    navigate({ to: '/goals/new' });
  };

  const handleOpenCreateItinerary = () => {
    setShowOptions(false);
    navigate({ to: '/itineraries/new' });
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

  const handleRequestDeleteGroup = (group: HomeGroup) => {
    setGroupToDelete(group);
    setDeleteGroupNameInput('');
    setCopiedGroupName(false);
    setShowDeleteGroupModal(true);
  };

  const handleCopyGroupName = async () => {
    if (!groupToDelete) return;
    try {
      await navigator.clipboard.writeText(groupToDelete.name);
      setCopiedGroupName(true);
      setTimeout(() => setCopiedGroupName(false), 1500);
    } catch (error) {
      console.error('Error copying group name:', error);
    }
  };

  const handleConfirmDeleteGroup = () => {
    if (!groupToDelete || deleteGroupMutation.isPending) return;
    deleteGroupMutation.mutate({
      data: {
        groupId: groupToDelete.id,
        groupNameConfirm: deleteGroupNameInput.trim(),
      },
    });
  };

  return (
    <GradientLayout className="native-enter pb-0">
      <header className="px-5 pt-2 pb-2 lg:px-6 lg:pt-6">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-semibold tracking-tight text-[#292929]">
            Hola, {user?.name}
          </h1>
          <button className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/80">
            <HugeiconsIcon icon={Bell} className="h-5 w-5 text-[#1a1a3e]" />
          </button>
        </div>
      </header>

      <div className="mb-6 px-5 lg:px-6">
        <div className="rounded-3xl border border-white/60 bg-blue-50/85 p-4 backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-gray-500 text-sm">Debes</p>
                  {isLoadingGroups ? (
                    <HomeSummarySkeleton />
                  ) : debtEntries.length === 0 ? (
                    <p className="text-xl font-bold text-[#1a1a3e]">$0</p>
                  ) : (
                    <div className="mt-1 space-y-0.5">
                      {debtEntries.slice(0, 3).map(([currency, amount]) => (
                        <p
                          key={currency}
                          className="text-base font-semibold text-[#1a1a3e]"
                        >
                          ${formatCurrency(amount)} {currency}
                        </p>
                      ))}
                    </div>
                  )}
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
              {!isLoadingGroups && debtEntries.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowDebtsDrawer(true)}
                  className="mt-3 text-sm font-medium text-[#4040b0]"
                >
                  Ver más
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-gray-500 text-sm">Te deben</p>
                  {isLoadingGroups ? (
                    <HomeSummarySkeleton />
                  ) : creditEntries.length === 0 ? (
                    <p className="text-xl font-bold text-[#1a1a3e]">$0</p>
                  ) : (
                    <div className="mt-1 space-y-0.5">
                      {creditEntries.slice(0, 3).map(([currency, amount]) => (
                        <p
                          key={currency}
                          className="text-base font-semibold text-[#1a1a3e]"
                        >
                          ${formatCurrency(amount)} {currency}
                        </p>
                      ))}
                    </div>
                  )}
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
              {!isLoadingGroups && creditEntries.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowCreditsDrawer(true)}
                  className="mt-3 text-sm font-medium text-[#4040b0]"
                >
                  Ver más
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 px-5 lg:px-6">
        <button
          type="button"
          onClick={() => navigate({ to: '/converter' })}
          className="flex w-full items-center justify-between rounded-3xl border border-white/70 bg-white/90 px-4 py-4 text-left shadow-sm backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#4040b0]">
              <Repeat2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-[#1a1a3e]">
                Conversor de monedas
              </p>
              <p className="text-sm text-gray-500">
                EUR, USD y COP con tasa diaria aproximada
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-medium text-[#4040b0]">
            Abrir
          </span>
        </button>
      </div>

      <div className="px-5 pb-10 lg:px-6 lg:pb-10">
        {!isLoadingGroups && !hasRegularGroups && hasMetaGroups && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-[#1a1a3e] mb-4">
              Tus metas
            </h2>
            <MetaGroupList
              metaGroups={metaGroups}
              userId={user?.id}
              navigate={navigate}
              onDeleteGroup={handleRequestDeleteGroup}
            />
          </div>
        )}

        {/* <h2 className="text-lg font-semibold text-[#1a1a3e] mb-4">
          Tus grupos
        </h2>

        <div className="mb-8 flex gap-3 lg:max-w-2xl">
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
              className="w-full rounded-2xl border border-white/70 bg-white/90 py-3.5 pl-12 pr-4 backdrop-blur-sm transition-colors focus:border-[#8b7bb8] focus:outline-none"
            />
          </div>
          <button className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#6060c0] bg-white/90">
            <HugeiconsIcon
              icon={SlidersHorizontal}
              className="w-5 h-5 text-[#6060c0]"
            />
          </button>
        </div> */}

        {isLoadingGroups ? (
          <HomeGroupsSkeleton />
        ) : !hasRegularGroups && !hasMetaGroups ? (
          <div className="native-empty flex flex-col items-center justify-center py-12 lg:mx-auto lg:max-w-2xl">
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
          <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {regularGroups.map((group) => {
              return (
                <SwipeableGroupItem
                  key={group.id}
                  group={group}
                  onOpenGroup={(groupId) =>
                    navigate({ to: '/groups/$id', params: { id: groupId } })
                  }
                  onDeleteGroup={handleRequestDeleteGroup}
                  canDelete={group.ownerId === user?.id}
                  isOwner={group.ownerId === user?.id}
                />
              );
            })}

            {/* Footer message */}
            {/* <p className="text-sm text-gray-500 pt-4">
              Ocultamos los grupos sin deudas del último mes.{' '}
              <button className="text-[#4040b0] font-medium">
                Ver todos los grupos
              </button>
            </p> */}
          </div>
        )}

        {!isLoadingGroups && hasMetaGroups && hasRegularGroups && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-[#1a1a3e] mb-4">
              Tus metas
            </h2>
            <MetaGroupList
              metaGroups={metaGroups}
              userId={user?.id}
              navigate={navigate}
              onDeleteGroup={handleRequestDeleteGroup}
            />
          </div>
        )}

        {isDevApp && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1a1a3e]">
                Tus itinerarios
              </h2>
              <button
                type="button"
                onClick={handleOpenCreateItinerary}
                className="rounded-xl bg-[#4040b0] px-3 py-2 text-sm font-medium text-white"
              >
                Crear
              </button>
            </div>

            {isLoadingItineraries ? (
              <HomeItinerariesSkeleton />
            ) : !hasItineraries ? (
              <div className="native-empty flex flex-col items-center justify-center py-8">
                <Compass className="mb-2 h-6 w-6 text-[#6060c0]" />
                <p className="text-sm text-gray-500">
                  No tienes itinerarios todavía
                </p>
              </div>
            ) : (
              <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                {userItineraries.map((itinerary) => (
                  <button
                    key={itinerary.id}
                    type="button"
                    onClick={() =>
                      navigate({
                        to: '/itineraries/$id',
                        params: { id: itinerary.id },
                      })
                    }
                    className="w-full rounded-2xl border border-white/70 bg-white/90 p-4 text-left transition-colors hover:bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8e4f8]">
                        <Compass className="h-5 w-5 text-[#6060c0]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[#1a1a3e]">
                          {itinerary.city}, {itinerary.country}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {itinerary.dayCount} días
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatItineraryDate(itinerary.startDate)} -{' '}
                          {formatItineraryDate(itinerary.endDate)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AppDrawer open={showDebtsDrawer} onOpenChange={setShowDebtsDrawer}>
        <div className="max-h-[80vh] overflow-y-auto">
          <div className="flex justify-center pt-3 pb-4">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
          <div className="px-6 pb-8">
            <h2 className="text-xl font-bold text-[#1a1a3e] mb-4">
              Debes por moneda
            </h2>
            <div className="space-y-3">
              {debtEntries.map(([currency, amount]) => (
                <div
                  key={currency}
                  className="rounded-2xl border border-gray-100 bg-white p-4"
                >
                  <p className="text-sm text-gray-500">{currency}</p>
                  <p className="text-lg font-semibold text-[#1a1a3e]">
                    ${formatCurrency(amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppDrawer>

      <AppDrawer open={showCreditsDrawer} onOpenChange={setShowCreditsDrawer}>
        <div className="max-h-[80vh] overflow-y-auto">
          <div className="flex justify-center pt-3 pb-4">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
          <div className="px-6 pb-8">
            <h2 className="text-xl font-bold text-[#1a1a3e] mb-4">
              Te deben por moneda
            </h2>
            <div className="space-y-3">
              {creditEntries.map(([currency, amount]) => (
                <div
                  key={currency}
                  className="rounded-2xl border border-gray-100 bg-white p-4"
                >
                  <p className="text-sm text-gray-500">{currency}</p>
                  <p className="text-lg font-semibold text-[#1a1a3e]">
                    ${formatCurrency(amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppDrawer>

      <AppDrawer open={showOptions} onOpenChange={setShowOptions}>
        <div className="max-h-[84vh] overflow-y-auto">
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
                <HugeiconsIcon icon={Plus} className="w-5 h-5 text-[#6060c0]" />
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
                  {'¿Te invitaron a un grupo o a una meta?'}
                </p>
                <p className="text-sm text-gray-500">
                  Usa un enlace o código QR para unirte
                </p>
              </div>
            </button>

            <button
              onClick={handleOpenCreateGoal}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-12 h-12 bg-[#e8e4f8] rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-[#6060c0]" />
              </div>
              <div>
                <p className="font-semibold text-[#1a1a3e]">Crear meta</p>
                <p className="text-sm text-gray-500">
                  Define un objetivo y registra aportes
                </p>
              </div>
            </button>

            {isDevApp && (
              <button
                onClick={handleOpenCreateItinerary}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-[#e8e4f8] rounded-full flex items-center justify-center">
                  <Compass className="w-5 h-5 text-[#6060c0]" />
                </div>
                <div>
                  <p className="font-semibold text-[#1a1a3e]">
                    Crear itinerario
                  </p>
                  <p className="text-sm text-gray-500">
                    Planea tu viaje por días con ruta optimizada
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>
      </AppDrawer>

      {/* Modal unirse a grupo */}
      <AppDrawer
        open={showJoinModal}
        onOpenChange={(open) => {
          if (!open) {
            resetJoinModal();
            return;
          }
          setShowJoinModal(true);
        }}
        className="max-h-[80vh]"
      >
        <div className="overflow-y-auto">
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
                      <p className="font-medium text-[#1a1a3e]">
                        Escanear código QR
                      </p>
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
                      <p className="font-medium text-[#1a1a3e] mb-2">
                        Pegar enlace de invitación
                      </p>
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
                        : 'bg-gray-200 text-gray-400',
                    )}
                  >
                    {findGroupMutation.isPending
                      ? 'Buscando...'
                      : 'Buscar grupo'}
                  </button>
                </div>
              </>
            )}

            {joinStep === 'select' && foundGroup && (
              <>
                <div className="bg-[#f8f7fc] rounded-2xl p-4 mb-6">
                  <p className="font-semibold text-[#1a1a3e]">
                    {foundGroup.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {foundGroup.memberCount} participantes
                  </p>
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
                          : 'bg-gray-50 text-[#1a1a3e]',
                      )}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center font-medium',
                          selectedMemberId === member.id
                            ? 'bg-white/20 text-white'
                            : 'bg-[#e8e4f8] text-[#6060c0]',
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
                        : 'bg-gray-50 text-[#1a1a3e]',
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        selectedMemberId === null
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 text-gray-500',
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
                    {joinGroupMutation.isPending
                      ? 'Uniéndose...'
                      : 'Unirme al grupo'}
                  </button>
                </div>
              </>
            )}

            {joinStep === 'confirm' && foundGroup && (
              <>
                <div className="bg-[#f8f7fc] rounded-2xl p-4 mb-6">
                  <p className="font-semibold text-[#1a1a3e]">
                    {foundGroup.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {foundGroup.memberCount} participantes
                  </p>
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
                    {joinGroupMutation.isPending
                      ? 'Uniéndose...'
                      : 'Unirme al grupo'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </AppDrawer>

      <AppDrawer
        open={showDeleteGroupModal && Boolean(groupToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteGroupModal(false);
            setGroupToDelete(null);
            setDeleteGroupNameInput('');
            setCopiedGroupName(false);
            return;
          }
          setShowDeleteGroupModal(true);
        }}
      >
        {groupToDelete ? (
          <div className="max-h-[84vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="px-6 pb-8">
              <h2 className="text-xl font-bold text-[#1a1a3e] mb-2">
                {groupToDelete.type === 'meta'
                  ? 'Eliminar meta'
                  : 'Eliminar grupo'}
              </h2>
              <p className="text-gray-600 mb-4">
                Para confirmar, escribe exactamente el nombre de{' '}
                {groupToDelete.type === 'meta' ? 'la meta' : 'el grupo'}:
              </p>
              <div className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100">
                <p className="text-sm text-gray-500">
                  {groupToDelete.type === 'meta'
                    ? 'Nombre de la meta'
                    : 'Nombre del grupo'}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-[#1a1a3e] break-all">
                    {groupToDelete.name}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyGroupName}
                    className="px-3 py-1.5 text-sm rounded-lg bg-white border border-gray-200 text-[#1a1a3e] whitespace-nowrap"
                  >
                    {copiedGroupName ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={deleteGroupNameInput}
                onChange={(event) =>
                  setDeleteGroupNameInput(event.target.value)
                }
                placeholder={
                  groupToDelete.type === 'meta'
                    ? 'Escribe el nombre de la meta'
                    : 'Escribe el nombre del grupo'
                }
                aria-label={
                  groupToDelete.type === 'meta'
                    ? 'Escribe el nombre de la meta'
                    : 'Escribe el nombre del grupo'
                }
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[#1a1a3e] placeholder:text-gray-400 focus:outline-none focus:border-[#6060c0] mb-3"
              />

              {deleteGroupMutation.data?.error && (
                <p className="text-red-500 text-sm mb-4">
                  {deleteGroupMutation.data.error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteGroupModal(false);
                    setGroupToDelete(null);
                    setDeleteGroupNameInput('');
                    setCopiedGroupName(false);
                  }}
                  className="flex-1 py-3 text-[#1a1a3e] font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteGroup}
                  disabled={
                    deleteGroupMutation.isPending ||
                    deleteGroupNameInput.trim() !== groupToDelete.name
                  }
                  className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl disabled:opacity-60"
                >
                  {deleteGroupMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </AppDrawer>
    </GradientLayout>
  );
}
