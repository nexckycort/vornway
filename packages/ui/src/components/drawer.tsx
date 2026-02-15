'use client';

import { cn } from '@workspace/ui/lib/utils';
import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  const lastOpen = useRef(props.open);
  const openedAtLocationKey = useRef<string | null>(null);
  const closeBackTimeout = useRef<number | null>(null);

  const getLocationKey = () =>
    `${window.location.pathname}${window.location.search}${window.location.hash}`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (!lastOpen.current && props.open) {
      if (closeBackTimeout.current !== null) {
        window.clearTimeout(closeBackTimeout.current);
        closeBackTimeout.current = null;
      }
      window.history.pushState({ drawer: true }, '');
      openedAtLocationKey.current = getLocationKey();
    }

    if (lastOpen.current && !props.open) {
      if (window.history.state?.drawer) {
        closeBackTimeout.current = window.setTimeout(() => {
          const sameLocation = openedAtLocationKey.current === getLocationKey();

          if (!props.open && sameLocation && window.history.state?.drawer) {
            window.history.back();
          }

          closeBackTimeout.current = null;
        }, 0);
      }
      openedAtLocationKey.current = null;
    }

    lastOpen.current = props.open;
  }, [props.open]);

  useEffect(() => {
    const handlePopState = () => {
      if (props.open) {
        props.onOpenChange?.(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [props.open, props.onOpenChange]);

  useEffect(() => {
    return () => {
      if (closeBackTimeout.current !== null) {
        window.clearTimeout(closeBackTimeout.current);
      }
    };
  }, []);

  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/15 supports-backdrop-filter:backdrop-blur-sm fixed inset-0 z-50',
        className,
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          'bg-background/97 flex h-auto flex-col text-sm data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[84vh] data-[vaul-drawer-direction=bottom]:rounded-t-[1.75rem] data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:rounded-r-[1.75rem] data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:rounded-l-[1.75rem] data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[84vh] data-[vaul-drawer-direction=top]:rounded-b-[1.75rem] data-[vaul-drawer-direction=top]:border-b data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=right]:sm:max-w-sm group/drawer-content fixed z-50 shadow-[0_28px_55px_-35px_color-mix(in_oklch,var(--foreground)_40%,transparent)] backdrop-blur-xl',
          className,
        )}
        {...props}
      >
        <div className="bg-muted mt-4 h-1.5 w-[88px] rounded-full mx-auto hidden shrink-0 group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        'gap-1 p-5 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1 md:text-left flex flex-col',
        className,
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('gap-2 p-5 mt-auto flex flex-col', className)}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        'text-foreground text-base font-semibold tracking-tight',
        className,
      )}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
