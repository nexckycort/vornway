import { Link } from '@tanstack/react-router';
import { cn } from '#/lib/utils';
import type { HomeAction as HomeActionData } from '#/routes/_authed/(home)/-hooks/use-home-query';
import { homeIcons } from './home-icons';

type HomeActionProps = {
  action: HomeActionData;
  onSelect?: (action: HomeActionData) => void;
};

export function HomeAction({ action, onSelect }: HomeActionProps) {
  const Icon = homeIcons[action.icon];
  const isPrimary = action.variant === 'primary';
  const to = action.id === 'create-group' ? '/groups/new' : null;

  const className = cn(
    'flex min-h-[118px] flex-col items-start justify-between rounded-[24px] p-4 text-left transition-transform active:translate-y-px',
    isPrimary
      ? 'bg-primary text-primary-foreground shadow-[0_8px_10px_rgba(222,3,77,0.12)]'
      : 'border border-border bg-white text-foreground shadow-[0_10px_20px_rgba(0,0,0,0.04)]',
  );

  const content = (
    <>
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-2xl',
          isPrimary ? 'bg-white text-primary' : 'bg-[#fff0f2] text-primary',
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="max-w-[120px] text-sm font-semibold leading-5">
        {action.label}
      </span>
    </>
  );

  if (!to) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => onSelect?.(action)}
      >
        {content}
      </button>
    );
  }

  if (to === '/groups/new') {
    return (
      <Link
        to={to}
        search={{
          name: '',
          type: '',
          description: '',
          draftId: '',
        }}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <Link to={to} className={className}>
      {content}
    </Link>
  );
}
