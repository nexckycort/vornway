import {
  CalendarDays,
  Gift,
  Landmark,
  Plane,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { m } from '#/paraglide/messages.js';

export type GoalType = 'trip' | 'gift' | 'saving' | 'event' | 'custom';
export type ContributionMode = 'manual' | 'monthly' | 'flexible' | 'suggested';

export const goalTypes: Array<{
  id: GoalType;
  label: () => string;
  description: () => string;
  emoji: string;
  accent: string;
  soft: string;
  icon: typeof Plane;
}> = [
  {
    id: 'trip',
    label: () => m['goals.typeTrip'](),
    description: () => m['goals.typeTripDescription'](),
    emoji: '✈️',
    accent: '#0ea5e9',
    soft: '#e0f2fe',
    icon: Plane,
  },
  {
    id: 'gift',
    label: () => m['goals.typeGift'](),
    description: () => m['goals.typeGiftDescription'](),
    emoji: '🎁',
    accent: '#f97316',
    soft: '#ffedd5',
    icon: Gift,
  },
  {
    id: 'saving',
    label: () => m['goals.typeSaving'](),
    description: () => m['goals.typeSavingDescription'](),
    emoji: '💰',
    accent: '#10b981',
    soft: '#d1fae5',
    icon: Landmark,
  },
  {
    id: 'event',
    label: () => m['goals.typeEvent'](),
    description: () => m['goals.typeEventDescription'](),
    emoji: '🎉',
    accent: '#e11d48',
    soft: '#ffe4e6',
    icon: CalendarDays,
  },
  {
    id: 'custom',
    label: () => m['goals.typeCustom'](),
    description: () => m['goals.typeCustomDescription'](),
    emoji: '✨',
    accent: '#7c3aed',
    soft: '#ede9fe',
    icon: Sparkles,
  },
];

export const contributionModes: Array<{
  id: ContributionMode;
  label: () => string;
  description: () => string;
}> = [
  {
    id: 'manual',
    label: () => m['goals.modeManual'](),
    description: () => m['goals.modeManualDescription'](),
  },
  {
    id: 'monthly',
    label: () => m['goals.modeMonthly'](),
    description: () => m['goals.modeMonthlyDescription'](),
  },
  {
    id: 'flexible',
    label: () => m['goals.modeFlexible'](),
    description: () => m['goals.modeFlexibleDescription'](),
  },
  {
    id: 'suggested',
    label: () => m['goals.modeSuggested'](),
    description: () => m['goals.modeSuggestedDescription'](),
  },
];

export function getGoalTheme(
  goalType?: string | null,
  themeColor?: string | null,
) {
  const theme = goalTypes.find((item) => item.id === goalType) ?? goalTypes[2];
  return {
    ...theme,
    accent: themeColor || theme.accent,
  };
}

export function getContributionModeLabel(mode?: string | null) {
  return (
    contributionModes.find((item) => item.id === mode)?.label() ??
    contributionModes[0].label()
  );
}

export function getDaysLabel(daysLeft: number) {
  if (daysLeft <= 0) return m['goals.daysToday']();
  if (daysLeft === 1) return m['goals.daysOne']();
  return m['goals.daysMany']({ count: daysLeft });
}

export function getProgressTone(progress: number) {
  if (progress >= 100) return m['goals.progressComplete']();
  if (progress >= 75) return m['goals.progressClose']();
  if (progress >= 40) return m['goals.progressMoving']();
  if (progress > 0) return m['goals.progressStarting']();
  return m['goals.progressNew']();
}

export const defaultGoalIcon = WalletCards;
