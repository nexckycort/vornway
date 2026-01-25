'use client';

import { cn } from '@workspace/ui/lib/utils';
import type * as React from 'react';
import type { FieldError as RHFFieldError } from 'react-hook-form';

interface FieldProps extends React.ComponentProps<'div'> {
  orientation?: 'horizontal' | 'vertical';
}

function Field({ className, orientation = 'vertical', ...props }: FieldProps) {
  return (
    <div
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        'grid gap-2',
        orientation === 'horizontal' && 'flex flex-row items-center gap-3',
        className
      )}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-group"
      className={cn('grid gap-4', className)}
      {...props}
    />
  );
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<'label'>) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: label is associated via htmlFor prop
    <label
      data-slot="field-label"
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        'group-data-[invalid=true]/field:text-destructive',
        className
      )}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

interface FieldErrorProps extends React.ComponentProps<'p'> {
  errors?: (RHFFieldError | undefined)[];
}

function FieldError({ className, errors, ...props }: FieldErrorProps) {
  const errorMessages = errors
    ?.filter((error): error is RHFFieldError => !!error?.message)
    .map((error) => error.message);

  if (!errorMessages?.length) {
    return null;
  }

  return (
    <p
      data-slot="field-error"
      className={cn('text-destructive text-sm', className)}
      {...props}
    >
      {errorMessages[0]}
    </p>
  );
}

export {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
};
