import {
  BedIcon,
  BriefcaseBusinessIcon,
  CarIcon,
  GiftIcon,
  KitchenUtensilsIcon,
  LandmarkIcon,
  PartyIcon,
  PineTreeIcon,
  PlaneIcon,
  ShoppingBagIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import type { ReactNode } from 'react';
export type CategoryVisual = {
  icon?: string | null;
  color?: string | null;
};

export const categoryIconOptions: Array<{
  id: string;
  icon: IconSvgElement;
  label: string;
}> = [
  { id: 'food', icon: KitchenUtensilsIcon, label: 'Comida' },
  { id: 'transport', icon: CarIcon, label: 'Transporte' },
  { id: 'hotel', icon: BedIcon, label: 'Alojamiento' },
  { id: 'party', icon: PartyIcon, label: 'Entretenimiento' },
  { id: 'activities', icon: PineTreeIcon, label: 'Actividades' },
  { id: 'shopping', icon: ShoppingBagIcon, label: 'Compras' },
  { id: 'travel', icon: PlaneIcon, label: 'Viaje' },
  { id: 'work', icon: BriefcaseBusinessIcon, label: 'Trabajo' },
  { id: 'bank', icon: LandmarkIcon, label: 'Banco' },
  { id: 'gift', icon: GiftIcon, label: 'Regalos' },
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
      return <HugeiconsIcon icon={Icon} className={className} />;
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
