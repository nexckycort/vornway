import type { GoalListItem } from '../-hooks/use-goals-infinite-query';

type GoalCardProps = {
  goal: GoalListItem;
  onPress: () => void;
};

function formatMoney(currency: string, amount: number): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function formatDate(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function GoalCard({ goal, onPress }: GoalCardProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full rounded-[28px] border border-white bg-white px-4 py-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-[#0f172a]">
            {goal.title}
          </p>
          <p className="mt-0.5 truncate text-sm text-[#64748b]">
            {goal.group.name}
          </p>
        </div>

        <div className="rounded-full bg-[#f1f5f9] px-3 py-1 text-[11px] font-medium text-[#475569]">
          Meta
        </div>
      </div>

      {goal.description ? (
        <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#475569]">
          {goal.description}
        </p>
      ) : null}

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0f172a]">
            {formatMoney(goal.currency, goal.savedAmount)}
            <span className="font-normal text-[#64748b]">
              {' '}
              / {formatMoney(goal.currency, goal.targetAmount)}
            </span>
          </p>
          <div className="mt-2 h-2 rounded-full bg-[#eef2ff]">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${Math.max(4, goal.progress)}%` }}
            />
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs text-[#64748b]">Cierra</p>
          <p className="text-sm font-medium text-[#0f172a]">
            {formatDate(goal.endDate)}
          </p>
        </div>
      </div>
    </button>
  );
}
