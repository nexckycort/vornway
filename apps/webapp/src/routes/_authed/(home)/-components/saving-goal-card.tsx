import { cn } from '#/lib/utils';
import type { SavingGoal } from '#/routes/_authed/(home)/-hooks/use-home-query';
import { homeIcons } from './home-icons';

type SavingGoalCardProps = {
  goal: SavingGoal;
};

export function SavingGoalCard({ goal }: SavingGoalCardProps) {
  const Icon = homeIcons[goal.icon];

  return (
    <article className="rounded-[24px] border border-[#f4f4f4] bg-white px-5 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-11 items-center justify-center rounded-2xl',
            goal.tone === 'yellow'
              ? 'bg-[#fefce8] text-[#b45309]'
              : 'bg-[#fff0f2] text-primary',
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold leading-6">
            {goal.name}
          </h3>
          <p className="text-xs leading-4 text-[#4c4c4c]">{goal.category}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-[#ebebeb]">
          <div
            className="h-full rounded-r-full bg-primary"
            style={{ width: `${goal.progress}%` }}
          />
        </div>
        <p className="text-sm leading-5">
          <span className="font-bold">{goal.saved}</span>{' '}
          <span className="text-[#797979]">/ {goal.target}</span>
        </p>
      </div>
    </article>
  );
}
