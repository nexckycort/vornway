import { formatCurrency } from '#/lib/i18n';
import type { GoalListItem } from '../-hooks/use-goals-infinite-query';
import {
  getContributionModeLabel,
  getDaysLabel,
  getGoalTheme,
  getProgressTone,
} from '../-lib/goal-experience';

type GoalCardProps = {
  goal: GoalListItem;
  onPress: () => void;
  featured?: boolean;
};

export function GoalCard({ goal, onPress, featured = false }: GoalCardProps) {
  const theme = getGoalTheme(goal.goalType, goal.themeColor);
  const progress = Math.min(100, Math.max(0, goal.progress));

  return (
    <button
      type="button"
      onClick={onPress}
      className={[
        'group relative w-full overflow-hidden rounded-[30px] text-left transition duration-300 active:scale-[0.985]',
        featured
          ? 'min-h-[250px] bg-[#111111] px-5 py-5 text-white shadow-[0_22px_50px_rgba(15,23,42,0.24)]'
          : 'bg-white px-4 py-4 text-[#0f172a] shadow-[0_12px_30px_rgba(15,23,42,0.07)]',
      ].join(' ')}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-14 size-40 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: theme.accent }}
      />
      {goal.coverImageUrl ? (
        <img
          src={goal.coverImageUrl}
          alt=""
          className="pointer-events-none absolute inset-0 size-full object-cover opacity-20"
        />
      ) : null}

      <div className="relative flex items-start justify-between gap-3">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
          style={{
            backgroundColor: featured ? 'rgba(255,255,255,0.12)' : theme.soft,
          }}
        >
          {goal.emoji || theme.emoji}
        </div>

        <div
          className={[
            'rounded-full px-3 py-1 text-[11px] font-semibold',
            featured
              ? 'bg-white/10 text-white/85'
              : 'bg-[#f8fafc] text-[#64748b]',
          ].join(' ')}
        >
          {getProgressTone(progress)}
        </div>
      </div>

      <div className="relative mt-5">
        <p
          className={[
            'text-xs font-semibold uppercase',
            featured ? 'text-white/55' : 'text-[#94a3b8]',
          ].join(' ')}
        >
          {theme.label()} · {getContributionModeLabel(goal.contributionMode)}
        </p>
        <h2
          className={[
            'mt-1 line-clamp-2 text-2xl font-semibold leading-7',
            featured ? 'text-white' : 'text-[#0f172a]',
          ].join(' ')}
        >
          {goal.title}
        </h2>
        <p
          className={[
            'mt-1 text-sm',
            featured ? 'text-white/65' : 'text-[#64748b]',
          ].join(' ')}
        >
          Faltan {getDaysLabel(goal.daysLeft)} · {goal.participantCount || 1}{' '}
          participante{goal.participantCount === 1 ? '' : 's'}
        </p>
      </div>

      <div className="relative mt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p
              className={[
                'text-xs',
                featured ? 'text-white/55' : 'text-[#64748b]',
              ].join(' ')}
            >
              Ahorrado
            </p>
            <p
              className={[
                'text-xl font-semibold',
                featured ? 'text-white' : 'text-[#0f172a]',
              ].join(' ')}
            >
              {formatCurrency(goal.currency, goal.savedAmount)}
            </p>
          </div>
          <p
            className={[
              'text-sm font-medium',
              featured ? 'text-white/70' : 'text-[#64748b]',
            ].join(' ')}
          >
            {Math.round(progress)}%
          </p>
        </div>

        <div
          className={[
            'mt-3 h-2 overflow-hidden rounded-full',
            featured ? 'bg-white/12' : 'bg-[#eef2f7]',
          ].join(' ')}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.max(3, progress)}%`,
              backgroundColor: theme.accent,
            }}
          />
        </div>

        <div
          className={[
            'mt-3 flex items-center justify-between text-xs',
            featured ? 'text-white/55' : 'text-[#64748b]',
          ].join(' ')}
        >
          <span>{formatCurrency(goal.currency, goal.targetAmount)}</span>
          <span>
            {formatCurrency(goal.currency, goal.perMemberMonthlyTarget || 0)} /
            persona mes
          </span>
        </div>
      </div>
    </button>
  );
}
