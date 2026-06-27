import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '#/components/ui/button';
import { Checkbox } from '#/components/ui/checkbox';
import { cn } from '#/lib/utils';
import { useExpenseEntryData } from './-hooks/use-expense-entry-data';
import { getQuickSplitMessages } from './-messages';

export const Route = createFileRoute('/_authed/expenses/new')({
  component: RouteComponent,
});

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function getGroupCardGradient(groupId: string) {
  const gradients = [
    'linear-gradient(180deg, #ffb09c 1.74%, #ff658a 21.97%, #fd364b 99.59%)',
    'linear-gradient(180deg, #ffd6a5 1.74%, #ff7b9c 38%, #de034d 99.59%)',
    'linear-gradient(180deg, #ffd9e5 1.74%, #ff8fb1 34%, #fd407f 99.59%)',
  ] as const;

  const hash = Array.from(groupId).reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );

  return gradients[hash % gradients.length];
}

function RouteComponent() {
  const navigate = useNavigate();
  const t = getQuickSplitMessages();
  const { spaces, recentFriends, isLoading } = useExpenseEntryData();
  const [search, setSearch] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const normalizedSearch = search.trim().toLocaleLowerCase('es-CO');

  const visibleSpaces = useMemo(
    () =>
      spaces.filter((space) =>
        normalizedSearch
          ? space.name.toLocaleLowerCase('es-CO').includes(normalizedSearch)
          : true,
      ),
    [normalizedSearch, spaces],
  );
  const visibleFriends = useMemo(
    () =>
      recentFriends.filter((friend) =>
        normalizedSearch
          ? friend.name.toLocaleLowerCase('es-CO').includes(normalizedSearch)
          : true,
      ),
    [normalizedSearch, recentFriends],
  );

  const selectedFriends = useMemo(
    () =>
      recentFriends.filter((friend) => selectedFriendIds.includes(friend.id)),
    [recentFriends, selectedFriendIds],
  );

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId],
    );
  };

  const handleContinue = () => {
    if (selectedFriendIds.length === 0) {
      return;
    }

    void navigate({
      to: '/expenses/quick-split',
      search: {
        friendIds: selectedFriendIds,
      },
    });
  };

  return (
    <main className="min-h-dvh bg-white font-sans text-[#111827]">
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-white">
        <header className="border-b border-[#f3f4f6] px-4 pb-3 pt-2">
          <div className="relative flex items-start justify-center">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="absolute left-0 top-1 rounded-full border-[#ebebeb] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
              onClick={() => navigate({ to: '/' })}
            >
              <span className="sr-only">Volver</span>
              <ChevronLeft className="size-4" />
            </Button>

            <div className="min-w-0 py-7 text-center">
              <p className="text-xs font-normal leading-4 text-[#4c4c4c]">
                {t.entryStep}
              </p>
              <h1 className="mt-0.5 text-sm font-semibold leading-5 text-[#1e1e1e]">
                {t.title}
              </h1>
            </div>
          </div>

          <div className="-mx-4 mt-1 h-2 overflow-hidden bg-[#ebebeb]">
            <div className="h-full w-[30%] rounded-r-full bg-[linear-gradient(90deg,#ffc8da_0%,#fd407f_39.32%,#d000bf_100%)]" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-32 pt-5">
          <section>
            <h2 className="text-[20px] font-semibold leading-8 text-[#1e1e1e]">
              {t.entryTitle}
            </h2>
            <p className="mt-1 text-base leading-6 text-[#626262]">
              Elige un grupo existente, regístralo con amigos o como un gasto
              personal
            </p>
          </section>

          <label className="mt-5 flex h-12 items-center gap-3 rounded-full border border-[#e2e8f0] bg-white px-4 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
            <Search className="size-4 shrink-0 text-[#94a3b8]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.entrySearchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#94a3b8]"
            />
          </label>

          <section className="mt-5">
            <p className="text-xs font-medium leading-4 text-[#626262]">
              {t.spacesLabel}
            </p>

            <div className="mt-4 flex flex-col gap-4">
              {visibleSpaces.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  onClick={() =>
                    navigate({
                      to: '/groups/$id/add-expense',
                      params: { id: space.id },
                    })
                  }
                  className="flex items-start gap-3 rounded-[24px] border border-[#ebebeb] bg-white p-4 text-left shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
                >
                  {space.imageUrl ? (
                    <img
                      src={space.imageUrl}
                      alt={space.name}
                      className="size-11 shrink-0 rounded-[8px] object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-[8px] text-sm font-semibold text-white"
                      style={{
                        backgroundImage: getGroupCardGradient(space.id),
                      }}
                    >
                      {toInitials(space.name)}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold leading-6 text-[#1e1e1e]">
                      {space.name}
                    </p>
                    <p className="text-sm leading-5 text-[#626262]">
                      {space.participantCount <= 1
                        ? 'Solo tú'
                        : t.spacesParticipants(space.participantCount)}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-[#ffe2e7] bg-[#fff0f2] px-[9px] py-[3px] text-sm font-medium leading-5 text-primary">
                    {space.participantCount <= 1
                      ? 'Personal'
                      : t.spacesSharedTag}
                  </span>
                </button>
              ))}

              {!isLoading && visibleSpaces.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#e2e8f0] px-4 py-5 text-sm text-[#64748b]">
                  {t.spacesEmpty}
                </div>
              ) : null}
            </div>
          </section>

          <section className="mt-6">
            <p className="text-xs font-medium leading-4 text-[#626262]">
              {t.friendsSectionLabel}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {visibleFriends.map((friend) => {
                const selected = selectedFriendIds.includes(friend.id);

                return (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => toggleFriend(friend.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-[24px] border bg-white p-4 text-left shadow-[0_1px_1px_rgba(0,0,0,0.05)]',
                      selected ? 'border-primary/30' : 'border-[#ebebeb]',
                    )}
                  >
                    {friend.image ? (
                      <img
                        src={friend.image}
                        alt={friend.name}
                        className="size-11 shrink-0 rounded-[8px] object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-[#ebebeb] text-[20px] font-medium text-[#1e1e1e]">
                        {toInitials(friend.name).slice(0, 1)}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium leading-6 text-[#1e1e1e]">
                        {friend.name}
                      </p>
                      <p className="text-sm leading-5 text-[#797979]">
                        {t.friendsSharedGroups(friend.sharedGroupCount)}
                      </p>
                    </div>

                    <Checkbox checked={selected} />
                  </button>
                );
              })}

              {!isLoading && visibleFriends.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#e2e8f0] px-4 py-5 text-sm text-[#64748b]">
                  {t.friendsListEmpty}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#ebebeb] bg-white px-4 py-3">
          <Button
            type="button"
            onClick={handleContinue}
            disabled={selectedFriends.length === 0}
            className="h-10 w-full rounded-[20px] text-base font-medium shadow-[0_8px_20px_rgba(222,3,77,0.1)]"
          >
            {t.entryContinue}
          </Button>
        </div>
      </div>
    </main>
  );
}
