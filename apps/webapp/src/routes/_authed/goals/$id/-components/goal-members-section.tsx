import { Award01Icon, UserAdd01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQueryClient } from '@tanstack/react-query';
import { type RefObject, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button';
import { formatCurrency } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import { useAddMemberMutation } from '#/routes/_authed/groups/-hooks/use-group-actions';
import { useUserSearchQuery } from '#/routes/_authed/groups/-hooks/use-user-search-query';
import type { GoalDetailData } from '../../-hooks/use-goal-detail-query';
import type { rankMembers } from '../../-lib/goal-detail';
import { getGoalsMessages } from '../../-messages';
import { Avatar, SectionHeader } from './goal-detail-parts';

export function GoalMembersSection({
  goal,
  rankedMembers,
  isAdmin,
  inputRef,
}: {
  goal: GoalDetailData;
  rankedMembers: ReturnType<typeof rankMembers>;
  isAdmin: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const t = getGoalsMessages();
  const queryClient = useQueryClient();
  const addMemberMutation = useAddMemberMutation(goal.group.id);
  const [participantInput, setParticipantInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchQuery = useUserSearchQuery(debouncedSearch);
  const searchResults = searchQuery.data?.data ?? [];
  const currentUserIds = useMemo(
    () =>
      new Set(
        goal.members.flatMap((member) =>
          member.userId ? [member.userId] : [],
        ),
      ),
    [goal.members],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(participantInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [participantInput]);

  const addParticipant = async (participant: {
    name: string;
    linkedUserId?: string;
  }) => {
    if (addMemberMutation.isPending) return;

    const trimmedName = participant.name.trim();
    if (!trimmedName) return;

    try {
      await addMemberMutation.mutateAsync({
        name: trimmedName,
        ...(participant.linkedUserId
          ? { linkedUserId: participant.linkedUserId }
          : {}),
      });
      await queryClient.invalidateQueries({
        queryKey: ['goal-detail', goal.id],
      });
      setParticipantInput('');
      setDebouncedSearch('');
      toast.success(t.detail.memberAdded);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : m['system.addGoalParticipantFailed'](),
      );
    }
  };

  return (
    <section className="rounded-[30px] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <SectionHeader
        title={t.detail.members}
        copy={t.detail.membersCopy}
        count={t.detail.peopleCount(goal.participantCount)}
      />

      {isAdmin ? (
        <div className="mt-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={participantInput}
              onChange={(event) => setParticipantInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void addParticipant({ name: participantInput });
                }
              }}
              placeholder={t.detail.peoplePlaceholder}
              className="h-12 min-w-0 flex-1 rounded-[20px] border border-[#e2e8f0] bg-white px-4 text-base outline-none"
            />
            <Button
              type="button"
              size="icon"
              className="size-12 rounded-[20px]"
              disabled={!participantInput.trim() || addMemberMutation.isPending}
              onClick={() => void addParticipant({ name: participantInput })}
              aria-label={t.detail.addParticipantAria}
            >
              <HugeiconsIcon icon={UserAdd01Icon} className="size-5" />
            </Button>
          </div>

          {searchResults.length > 0 ? (
            <div className="mt-3 space-y-2">
              {searchResults.map((candidate) => {
                const alreadyMember = currentUserIds.has(candidate.id);

                return (
                  <button
                    key={candidate.id}
                    type="button"
                    disabled={candidate.isCurrentUser || alreadyMember}
                    onClick={() => {
                      if (candidate.isCurrentUser || alreadyMember) return;
                      void addParticipant({
                        name: candidate.name,
                        linkedUserId: candidate.id,
                      });
                    }}
                    className="flex w-full items-center gap-3 rounded-[20px] border border-[#e2e8f0] bg-[#fafafa] px-3 py-3 text-left disabled:opacity-60"
                  >
                    <Avatar name={candidate.name} image={null} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {candidate.name}
                      </span>
                      <span className="block truncate text-xs text-[#64748b]">
                        {alreadyMember
                          ? t.detail.alreadyAdded
                          : candidate.username
                            ? `@${candidate.username}`
                            : candidate.email}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {rankedMembers.map(({ member, amount, isOnTrack }, index) => (
          <article
            key={member.id}
            className="rounded-[24px] border border-[#edf2f7] bg-[#fafafa] p-4"
          >
            <div className="flex items-center gap-3">
              <Avatar name={member.name} image={member.image} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#0f172a]">
                  {member.name}
                  {member.isCurrentUser ? (
                    <span className="ml-1 text-xs text-[#94a3b8]">
                      {t.detail.you}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-[#64748b]">
                  {isOnTrack ? t.detail.onTrackCopy : t.detail.pendingCopy}
                </p>
              </div>
              {index === 0 && amount > 0 ? (
                <HugeiconsIcon
                  icon={Award01Icon}
                  className="size-4 text-amber-500"
                />
              ) : null}
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xs text-[#94a3b8]">
                  {t.detail.totalContributed}
                </p>
                <p className="text-base font-semibold">
                  {formatCurrency(goal.currency, amount)}
                </p>
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  color: isOnTrack ? '#059669' : '#e11d48',
                  backgroundColor: isOnTrack ? '#ecfdf5' : '#fff1f2',
                }}
              >
                {isOnTrack ? t.detail.onTrack : t.detail.pending}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
