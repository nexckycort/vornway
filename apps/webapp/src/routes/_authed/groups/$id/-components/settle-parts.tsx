import { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import { formatCompactAmount, initialsFromName } from '../-lib/settle';

export function DebtSection({
  title,
  items,
  membersById,
  myMembershipId,
  onSelect,
  className = '',
}: {
  title: string;
  items: {
    key: string;
    fromMemberId: string;
    fromName: string;
    toMemberId: string;
    toName: string;
    currency: string;
    amount: number;
  }[];
  membersById: Map<
    string,
    {
      id: string;
      name: string;
      email: string | null;
      image: string | null;
      role: string;
      userId: string | null;
      isCurrentUser: boolean;
      expenseCount: number;
    }
  >;
  myMembershipId: string | null;
  onSelect: (key: string) => void;
  className?: string;
}) {
  const t = getGroupDetailMessages();
  if (items.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="mb-3 text-xl font-medium leading-none text-[#1f2937]">
        {title}
      </h2>
      <div className="space-y-3">
        {items.map((item) => {
          const counterpartId =
            item.fromMemberId === myMembershipId
              ? item.toMemberId
              : item.fromMemberId;
          const counterpart = membersById.get(counterpartId) ?? {
            name:
              item.fromMemberId === myMembershipId
                ? item.toName
                : item.fromName,
            image: null,
          };
          const isDebtToMe = item.toMemberId === myMembershipId;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className="flex w-full items-center gap-3 rounded-[22px] border border-[#e8edf3] bg-white px-3 py-3 text-left shadow-[0_10px_20px_rgba(15,23,42,0.03)]"
            >
              <AvatarCircle
                name={counterpart.name}
                image={counterpart.image}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-[#111827]">
                  {counterpart.name}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    isDebtToMe ? 'text-[#10b981]' : 'text-[#ef4444]'
                  }`}
                >
                  {isDebtToMe
                    ? t.settle.owesYou(
                        formatCompactAmount(item.currency, item.amount),
                      )
                    : t.settle.youOwe(
                        formatCompactAmount(item.currency, item.amount),
                      )}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function AvatarCircle({
  name,
  image,
  size,
}: {
  name: string;
  image: string | null;
  size: 'md';
}) {
  const sizeClass = size === 'md' ? 'size-12' : 'size-10';

  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-lg font-medium text-[#374151]`}
    >
      {initialsFromName(name)}
    </div>
  );
}

export function KeypadButton({
  label,
  onClick,
  borderless = false,
}: {
  label: React.ReactNode;
  onClick: () => void;
  borderless?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-0 items-center justify-center rounded-[18px] bg-white text-[24px] font-light text-[#1f2937] transition-transform active:scale-[0.98] ${
        borderless
          ? ''
          : 'border border-[#edf1f5] shadow-[0_8px_18px_rgba(15,23,42,0.03)]'
      }`}
    >
      {label}
    </button>
  );
}
