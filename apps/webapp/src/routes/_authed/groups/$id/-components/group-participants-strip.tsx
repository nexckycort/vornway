import { Link } from '@tanstack/react-router';
import { ChevronRight, Plus } from 'lucide-react';
import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';

import type { GroupMemberIdentity } from '../-types/group-detail.types';
import { getInitials } from './group-detail.utils';

type GroupParticipantsStripProps = {
  groupId: string;
  members: GroupMemberIdentity[];
  participantCount: number;
};

export function GroupParticipantsStrip({
  groupId,
  members,
  participantCount,
}: GroupParticipantsStripProps) {
  const { flowState } = useGroupFlowNavigation(groupId);

  return (
    <section className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          to="/groups/$id/participants"
          params={{ id: groupId }}
          state={flowState}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#132238]"
        >
          Participantes
          <ChevronRight className="size-4 text-[#94a3b8]" />
        </Link>
        <span className="text-xs text-[#94a3b8]">
          {participantCount} miembros
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        <Link
          to="/groups/$id/participants"
          params={{ id: groupId }}
          state={flowState}
          className="flex min-w-[62px] flex-col items-center gap-1"
        >
          <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-[#d1d5db] bg-white text-[#94a3b8]">
            <Plus className="size-4" />
          </span>
          <span className="max-w-[62px] truncate text-[11px] text-[#64748b]">
            Agregar
          </span>
        </Link>

        {members.slice(0, 6).map((member) => (
          <div
            key={member.id}
            className="flex min-w-[62px] flex-col items-center gap-1"
          >
            {member.image ? (
              <img
                src={member.image}
                alt={member.name}
                className="size-12 rounded-full border border-[#e5e7eb] object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-full border border-[#e5e7eb] bg-[#f8fafc] text-sm font-semibold text-[#132238]">
                {getInitials(member.name)}
              </span>
            )}
            <span className="max-w-[62px] truncate text-[11px] text-[#64748b]">
              {member.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
