import { toInitials } from './quick-split-model';

export function ParticipantAvatar({ name }: { name: string }) {
  return (
    <span className="flex size-9 items-center justify-center rounded-full bg-[#ebebeb] text-xs font-medium text-[#111827]">
      {toInitials(name)}
    </span>
  );
}
