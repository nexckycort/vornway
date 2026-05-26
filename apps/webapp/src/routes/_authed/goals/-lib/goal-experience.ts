import {
  CalendarDays,
  Gift,
  Landmark,
  Plane,
  Sparkles,
  WalletCards,
} from 'lucide-react';

export type GoalType = 'trip' | 'gift' | 'saving' | 'event' | 'custom';
export type ContributionMode = 'manual' | 'monthly' | 'flexible' | 'suggested';

export const goalTypes: Array<{
  id: GoalType;
  label: string;
  description: string;
  emoji: string;
  accent: string;
  soft: string;
  icon: typeof Plane;
}> = [
  {
    id: 'trip',
    label: 'Viaje',
    description: 'Destinos, countdown y presupuesto compartido.',
    emoji: '✈️',
    accent: '#0ea5e9',
    soft: '#e0f2fe',
    icon: Plane,
  },
  {
    id: 'gift',
    label: 'Regalo',
    description: 'Fondos cálidos para detalles en grupo.',
    emoji: '🎁',
    accent: '#f97316',
    soft: '#ffedd5',
    icon: Gift,
  },
  {
    id: 'saving',
    label: 'Ahorro',
    description: 'Minimal, claro y orientado al objetivo.',
    emoji: '💰',
    accent: '#10b981',
    soft: '#d1fae5',
    icon: Landmark,
  },
  {
    id: 'event',
    label: 'Evento',
    description: 'Planes sociales, fechas y aportes visibles.',
    emoji: '🎉',
    accent: '#e11d48',
    soft: '#ffe4e6',
    icon: CalendarDays,
  },
  {
    id: 'custom',
    label: 'Personalizada',
    description: 'Define tu propia vibra y ritmo.',
    emoji: '✨',
    accent: '#7c3aed',
    soft: '#ede9fe',
    icon: Sparkles,
  },
];

export const contributionModes: Array<{
  id: ContributionMode;
  label: string;
  description: string;
}> = [
  {
    id: 'manual',
    label: 'Manual',
    description: 'Cada aporte se registra cuando ocurra.',
  },
  {
    id: 'monthly',
    label: 'Mensual',
    description: 'Ideal para cuotas fijas y seguimiento por mes.',
  },
  {
    id: 'flexible',
    label: 'Flexible',
    description: 'Sin presión fija, pero con progreso visible.',
  },
  {
    id: 'suggested',
    label: 'Cuota sugerida',
    description: 'Vornway calcula un aporte recomendado.',
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
    contributionModes.find((item) => item.id === mode)?.label ??
    contributionModes[0].label
  );
}

export function getDaysLabel(daysLeft: number) {
  if (daysLeft <= 0) return 'Hoy';
  if (daysLeft === 1) return '1 día';
  return `${daysLeft} días`;
}

export function getProgressTone(progress: number) {
  if (progress >= 100) return 'Completada';
  if (progress >= 75) return 'Muy cerca';
  if (progress >= 40) return 'En movimiento';
  if (progress > 0) return 'Empezando';
  return 'Nueva';
}

export const defaultGoalIcon = WalletCards;
