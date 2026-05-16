import {
  Bell,
  Compass,
  Home,
  type LucideIcon,
  PiggyBank,
  Plus,
  Repeat2,
  Shirt,
  UserRound,
} from 'lucide-react';

import type { HomeIconName } from '#/routes/_authed/(home)/-hooks/use-home-query';

export const homeIcons: Record<HomeIconName, LucideIcon> = {
  bell: Bell,
  compass: Compass,
  home: Home,
  'piggy-bank': PiggyBank,
  plus: Plus,
  repeat: Repeat2,
  shirt: Shirt,
  user: UserRound,
};
