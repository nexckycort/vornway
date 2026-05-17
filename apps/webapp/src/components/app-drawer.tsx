import { cn } from '#/lib/utils';
import { Drawer, DrawerContent } from './ui/drawer';

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
      <DrawerContent
        className={cn(
          '[&>div:first-child]:hidden lg:mx-auto lg:mb-6 lg:max-h-[88vh] lg:max-w-2xl lg:rounded-3xl lg:border lg:border-white/70 lg:shadow-[0_30px_70px_-40px_rgba(20,15,52,0.5)]',
          className,
        )}
      >
        {children}
      </DrawerContent>
    </Drawer>
  );
}
