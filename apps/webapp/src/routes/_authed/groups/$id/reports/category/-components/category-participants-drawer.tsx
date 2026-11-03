import { CheckIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { getInitials } from '#/routes/_authed/groups/$id/-components/group-detail.utils';
import type { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import type { GroupSummary } from '#/routes/_authed/groups/$id/-types/group-detail.types';
import type { ParticipantShare } from '../../-lib/participant-share.types';

type Messages = ReturnType<typeof getGroupDetailMessages>;

type CategoryParticipantsDrawerProps = {
  t: Messages;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: GroupSummary['members'] | undefined;
  participantShares: ParticipantShare[];
  selectedParticipantIds: string[];
  isAllParticipantsSelected: boolean;
  onToggleParticipant: (memberId: string) => void;
};

export function CategoryParticipantsDrawer({
  t,
  open,
  onOpenChange,
  members,
  participantShares,
  selectedParticipantIds,
  isAllParticipantsSelected,
  onToggleParticipant,
}: CategoryParticipantsDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh] gap-0 overflow-hidden p-0">
        <DrawerHeader className="pb-3 text-left">
          <DrawerTitle>{t.reports.participants}</DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-6">
          {participantShares.map((member) => {
            const memberIdentity = members?.find(
              (item) => item.id === member.memberId,
            );

            return (
              <button
                type="button"
                key={member.memberId}
                onClick={() => onToggleParticipant(member.memberId)}
                className="flex w-full items-center gap-3 py-3 text-left"
              >
                {memberIdentity?.image ? (
                  <img
                    src={memberIdentity.image}
                    alt={member.name}
                    className="size-[18px] shrink-0 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[#ebebeb] text-[7.5px] font-medium text-[#1e1e1e]">
                    {getInitials(member.name)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#1e1e1e]">
                    {member.name}
                  </p>
                </div>

                <CheckboxMark
                  checked={
                    isAllParticipantsSelected ||
                    selectedParticipantIds.includes(member.memberId)
                  }
                />
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function CheckboxMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={[
        'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
        checked
          ? 'border-[#de034d] bg-[#de034d] text-white'
          : 'border-[#d4d4d8] bg-white text-transparent',
      ].join(' ')}
    >
      <HugeiconsIcon icon={CheckIcon} className="size-3.5" strokeWidth={3} />
    </span>
  );
}
