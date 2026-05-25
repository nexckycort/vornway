'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import * as React from 'react';
import { Button } from '#/components/ui/button';
import { cn } from '#/lib/utils';

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  const lastOpen = React.useRef(props.open);
  const openedAtLocationKey = React.useRef<string | null>(null);
  const closeBackTimeout = React.useRef<number | null>(null);

  const getLocationKey = () =>
    `${window.location.pathname}${window.location.search}${window.location.hash}`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: mirrors Drawer behavior and only reacts to open transitions
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!lastOpen.current && props.open) {
      if (closeBackTimeout.current !== null) {
        window.clearTimeout(closeBackTimeout.current);
        closeBackTimeout.current = null;
      }

      window.history.pushState({ dialog: true }, '');
      openedAtLocationKey.current = getLocationKey();
    }

    if (lastOpen.current && !props.open) {
      if (window.history.state?.dialog) {
        closeBackTimeout.current = window.setTimeout(() => {
          const sameLocation = openedAtLocationKey.current === getLocationKey();

          if (!props.open && sameLocation && window.history.state?.dialog) {
            window.history.back();
          }

          closeBackTimeout.current = null;
        }, 0);
      }

      openedAtLocationKey.current = null;
    }

    lastOpen.current = props.open;
  }, [props.open]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      if (props.open) {
        props.onOpenChange?.(
          false,
          {} as DialogPrimitive.Root.ChangeEventDetails,
        );
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [props.open, props.onOpenChange]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    return () => {
      if (closeBackTimeout.current !== null) {
        window.clearTimeout(closeBackTimeout.current);
      }
    };
  }, []);

  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 isolate z-50 bg-black/80 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-4xl bg-popover p-6 text-sm text-popover-foreground ring-1 ring-foreground/5 duration-100 outline-none sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-4 right-4"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-base leading-none font-medium', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        'text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
