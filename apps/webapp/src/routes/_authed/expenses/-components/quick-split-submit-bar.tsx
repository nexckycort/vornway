import { Button } from '#/components/ui/button';
import type { QuickSplitForm } from '../-hooks/use-quick-split-form';

export function QuickSplitSubmitBar({ form }: { form: QuickSplitForm }) {
  const { t, isEditMode, handleSubmit, canSubmit, createExpenseMutation } =
    form;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
      <Button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!canSubmit}
        className="h-14 w-full rounded-full bg-rose-500 text-base font-medium text-white hover:bg-rose-500/90"
      >
        {createExpenseMutation.isPending
          ? isEditMode
            ? t.savePending
            : t.submitPending
          : isEditMode
            ? t.save
            : t.submit}
      </Button>
    </div>
  );
}
