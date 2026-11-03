import { formatCurrency } from '#/lib/i18n';
import type { GoalDetailData } from '../../-hooks/use-goal-detail-query';
import { buildTimeline, currentMonthDate } from '../../-lib/goal-detail';
import { getGoalTheme } from '../../-lib/goal-experience';
import { getGoalsMessages } from '../../-messages';
import { SectionHeader } from './goal-detail-parts';

export function GoalTimelineSection({ goal }: { goal: GoalDetailData }) {
  const t = getGoalsMessages();
  const theme = getGoalTheme(goal.goalType, goal.themeColor ?? undefined);
  const timeline = buildTimeline(goal.startDate, goal.endDate);

  return (
    <section className="rounded-[30px] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <SectionHeader
        title={t.detail.calendar}
        copy={t.detail.calendarCopy}
        count={t.detail.installmentsCount(goal.installmentCount)}
      />
      <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {timeline.map((item, index) => {
          const active = item.date <= currentMonthDate;
          return (
            <div
              key={item.key}
              className="min-w-[92px] rounded-[22px] border border-[#e2e8f0] bg-[#fafafa] p-3"
            >
              <div
                className="mb-3 size-7 rounded-full"
                style={{
                  backgroundColor: active ? theme.accent : '#e2e8f0',
                }}
              />
              <p className="text-sm font-semibold capitalize text-[#0f172a]">
                {item.label}
              </p>
              <p className="mt-1 text-xs text-[#64748b]">
                {index === 0
                  ? t.detail.start
                  : formatCurrency(goal.currency, goal.monthlyTarget)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
