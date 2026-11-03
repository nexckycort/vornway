import { CheckIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { QuickSplitForm } from '../-hooks/use-quick-split-form';
import { ParticipantAvatar } from './participant-avatar';

export function QuickSplitPayerPicker({ form }: { form: QuickSplitForm }) {
  const { t, people, paidByParticipantId, setPaidByParticipantId } = form;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">{t.payerLabel}</p>
        <span className="text-xs text-gray-400">{t.selectedOne}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {people.map((person) => {
          const isSelected = paidByParticipantId === person.id;

          return (
            <button
              key={person.id}
              type="button"
              onClick={() => setPaidByParticipantId(person.id)}
              className="flex min-w-[72px] flex-col items-center"
            >
              <div
                className={`flex size-11 items-center justify-center overflow-hidden rounded-full border-2 ${
                  isSelected ? 'border-rose-500' : 'border-transparent'
                }`}
              >
                <ParticipantAvatar name={person.name} />
              </div>
              <span
                className={`mt-1 inline-flex size-4 items-center justify-center rounded-full border text-[10px] font-semibold ${
                  isSelected
                    ? 'border-rose-500 bg-rose-500 text-white'
                    : 'border-gray-300 bg-white text-transparent'
                }`}
              >
                {isSelected ? (
                  <HugeiconsIcon icon={CheckIcon} className="size-2.5" />
                ) : (
                  '•'
                )}
              </span>
              <span className="mt-1.5 max-w-[60px] truncate text-xs text-gray-600">
                {person.isCurrentUser ? t.you : person.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
