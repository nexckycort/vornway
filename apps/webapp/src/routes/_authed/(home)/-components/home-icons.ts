import {
  Add01Icon,
  ArrowMoveUpRightIcon,
  BellIcon,
  CompassIcon,
  HomeIcon,
  PiggyBankIcon,
  RepeatIcon,
  ShirtIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import type { HomeIconName } from '#/routes/_authed/(home)/-hooks/use-home-query';
export const homeIcons: Record<HomeIconName, IconSvgElement> = {
  bell: BellIcon,
  compass: CompassIcon,
  home: HomeIcon,
  'piggy-bank': PiggyBankIcon,
  plus: Add01Icon,
  'move-up-right': ArrowMoveUpRightIcon,
  repeat: RepeatIcon,
  shirt: ShirtIcon,
  user: UserIcon,
};
