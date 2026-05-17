import type { Trip } from '#/routes/_authed/(home)/-hooks/use-home-query';
import { Link } from '@tanstack/react-router';

type TripCardProps = {
  trip: Trip;
};

export function TripCard({ trip }: TripCardProps) {
  return (
    <Link
      to="/groups/$id"
      params={{ id: trip.id }}
      className="block rounded-[24px] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-transform active:translate-y-px"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold leading-7">{trip.name}</h3>
          <p className="text-xs leading-4">{trip.dates}</p>
        </div>

        <div className="flex items-center">
          {trip.avatars.map((avatar) => (
            <span
              key={avatar}
              className="-mr-1.5 flex size-8 items-center justify-center rounded-full border border-border bg-[#fafafa] text-sm font-medium leading-5"
            >
              {avatar}
            </span>
          ))}
          <span className="flex size-8 items-center justify-center rounded-full border border-border bg-white text-sm font-medium leading-5 shadow-sm">
            +{trip.extraPeople}
          </span>
        </div>
      </div>

      {trip.balanceItems ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-base font-medium leading-6 text-[#047857]">
            {trip.balanceLabel}
          </p>
          <div className="flex flex-col gap-1">
            {trip.balanceItems.map((item) => (
              <p
                key={`${item.person}-${item.amount}`}
                className="text-xs leading-4"
              >
                <span className="text-[#4c4c4c]">{item.person}</span>{' '}
                <span className="text-[#047857]">{item.amount}</span>
              </p>
            ))}
          </div>
          {trip.balanceOverflowLabel ? (
            <p className="text-xs leading-4 text-[#64748b]">
              {trip.balanceOverflowLabel}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-base font-medium leading-6">
          {trip.emptyLabel}
        </p>
      )}
    </Link>
  );
}
