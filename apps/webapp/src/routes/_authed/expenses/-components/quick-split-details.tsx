import { Edit03Icon, SearchIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m } from '#/paraglide/messages.js';
import type { QuickSplitForm } from '../-hooks/use-quick-split-form';

export function QuickSplitDetails({ form }: { form: QuickSplitForm }) {
  const {
    t,
    isEditMode,
    description,
    setDescription,
    friendInput,
    setFriendInput,
    category,
    setCategory,
  } = form;

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#ebebeb] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="px-4 py-4">
        <div className="flex h-11 items-center gap-2 rounded-[24px] border border-[#ebebeb] bg-[#fafafa] px-4">
          <HugeiconsIcon icon={Edit03Icon} className="size-4 text-[#626262]" />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t.descriptionPlaceholder}
            className="w-full bg-transparent text-base font-normal text-[#1e1e1e] outline-none placeholder:text-[#94a3b8]"
            maxLength={200}
          />
        </div>
      </div>

      {!isEditMode ? (
        <>
          <div className="h-px bg-[#f1f5f9]" />

          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-[#fff8ed] text-[#ff7a00]">
                <HugeiconsIcon icon={SearchIcon} className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-normal leading-4 text-[#626262]">
                  {t.friendsLabel}
                </p>
                <input
                  value={friendInput}
                  onChange={(event) => setFriendInput(event.target.value)}
                  placeholder={t.friendsPlaceholder}
                  className="mt-0.5 h-5 w-full bg-transparent text-sm font-semibold text-[#1e1e1e] outline-none placeholder:font-normal placeholder:text-[#94a3b8]"
                />
              </div>
              <HugeiconsIcon
                icon={SearchIcon}
                className="size-4 text-[#b0b0b0]"
              />
            </div>
          </div>
        </>
      ) : null}

      <div className="border-t border-[#f1f5f9] px-4 py-4">
        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder={m['groups.expense.category']()}
          className="h-11 w-full rounded-full border border-[#ebebeb] bg-[#fafafa] px-4 text-sm outline-none focus:border-primary"
          maxLength={80}
        />
      </div>
    </section>
  );
}
