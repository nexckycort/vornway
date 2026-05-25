import {
  Bed,
  BriefcaseBusiness,
  Car,
  Gift,
  Landmark,
  type LucideIcon,
  PartyPopper,
  Plane,
  ShoppingBag,
  TreePine,
  Utensils,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type CategoryVisual = {
  icon?: string | null;
  color?: string | null;
};

export const categoryIconOptions: Array<{
  id: string;
  icon: LucideIcon;
  label: string;
}> = [
  { id: 'food', icon: Utensils, label: 'Comida' },
  { id: 'transport', icon: Car, label: 'Transporte' },
  { id: 'hotel', icon: Bed, label: 'Alojamiento' },
  { id: 'party', icon: PartyPopper, label: 'Entretenimiento' },
  { id: 'activities', icon: TreePine, label: 'Actividades' },
  { id: 'shopping', icon: ShoppingBag, label: 'Compras' },
  { id: 'travel', icon: Plane, label: 'Viaje' },
  { id: 'work', icon: BriefcaseBusiness, label: 'Trabajo' },
  { id: 'bank', icon: Landmark, label: 'Banco' },
  { id: 'gift', icon: Gift, label: 'Regalos' },
];

export const categoryIconById = new Map(
  categoryIconOptions.map((option) => [option.id, option]),
);

export function CategoryIcon({
  icon,
  color,
  fallback,
  className = 'size-5',
}: CategoryVisual & {
  fallback?: ReactNode;
  className?: string;
}) {
  if (icon) {
    const iconOption = categoryIconById.get(icon);

    if (iconOption) {
      const Icon = iconOption.icon;
      return <Icon className={className} />;
    }

    return (
      <span
        className="text-xl leading-none"
        style={{ color: color ?? undefined }}
      >
        {icon}
      </span>
    );
  }

  return fallback;
}
