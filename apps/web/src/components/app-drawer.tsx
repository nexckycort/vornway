import {
  Drawer,
  DrawerContent,
} from '@workspace/ui/components/drawer';
import type React from 'react';
import { cn } from '~/lib/utils';

interface AppDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function AppDrawer({
  open,
  onOpenChange,
  children,
  className,
}: AppDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn('[&>div:first-child]:hidden', className)}>
        {children}
      </DrawerContent>
    </Drawer>
  );
}
