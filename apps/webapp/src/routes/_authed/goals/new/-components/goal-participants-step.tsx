import { Cancel01Icon, UserAdd01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { RefObject } from 'react';
import { Button } from '#/components/ui/button';
import type { useUserSearchQuery } from '#/routes/_authed/groups/-hooks/use-user-search-query';
import { getGoalsMessages } from '../../-messages';
import { MemberAvatar, StepHeader } from './goal-form-parts';

export type DraftParticipant = {
  name: string;
  userId?: string;
  email?: string | null;
  image?: string | null;
};

type SearchResults = NonNullable<
  ReturnType<typeof useUserSearchQuery>['data']
>['data'];

export function GoalParticipantsStep({
  inputRef,
  input,
  onInputChange,
  isSearching,
  searchResults,
  participants,
  onAdd,
  onRemove,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  input: string;
  onInputChange: (value: string) => void;
  isSearching: boolean;
  searchResults: SearchResults;
  participants: DraftParticipant[];
  onAdd: (participant: DraftParticipant) => void;
  onRemove: (index: number) => void;
}) {
  const t = getGoalsMessages();

  return (
    <section className="space-y-4">
      <StepHeader
        eyebrow={t.stepFive}
        title={t.addPeopleTitle}
        copy={t.stepFiveCopy}
      />
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onAdd({ name: input });
            }
          }}
          placeholder={t.peoplePlaceholder}
          className="h-12 min-w-0 flex-1 rounded-[20px] border border-[#e2e8f0] bg-white px-4 text-base outline-none"
        />
        <Button
          type="button"
          size="icon"
          className="size-12 rounded-[20px]"
          onClick={() => onAdd({ name: input })}
          disabled={!input.trim()}
          aria-label={t.addParticipantAria}
        >
          <HugeiconsIcon icon={UserAdd01Icon} className="size-5" />
        </Button>
      </div>

      {isSearching ? (
        <p className="text-sm text-[#64748b]">Buscando coincidencias...</p>
      ) : null}

      {searchResults.length > 0 ? (
        <div className="space-y-2">
          {searchResults.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              disabled={candidate.isCurrentUser}
              onClick={() => {
                if (candidate.isCurrentUser) return;
                onAdd({
                  name: candidate.name,
                  userId: candidate.id,
                  email: candidate.email,
                });
              }}
              className="flex w-full items-center gap-3 rounded-[22px] border border-[#e2e8f0] bg-white px-4 py-3 text-left disabled:opacity-60"
            >
              <MemberAvatar name={candidate.name} image={null} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#0f172a]">
                  {candidate.name}
                </span>
                <span className="block truncate text-xs text-[#64748b]">
                  {candidate.email}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        {participants.map((participant, index) => (
          <div
            key={`${participant.userId ?? participant.name}-${index}`}
            className="flex items-center gap-3 rounded-[22px] border border-[#e2e8f0] bg-white px-4 py-3"
          >
            <MemberAvatar
              name={participant.name}
              image={participant.image ?? null}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[#0f172a]">
                {participant.name}
              </span>
              <span className="block truncate text-xs text-[#64748b]">
                {participant.email ?? 'Participante manual'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="flex size-9 items-center justify-center rounded-full text-[#94a3b8]"
              aria-label={`Eliminar ${participant.name}`}
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
