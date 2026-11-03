import { Add01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import {
  CategoryIcon,
  categoryIconOptions,
} from '#/routes/_authed/groups/$id/-components/category-icon';
import type { ExpenseForm } from '../-hooks/use-expense-form';
import {
  customCategoryIconId,
  categoryColorOptions,
} from '../-lib/expense-form.types';
import { normalizeCategoryIconInput } from '../-lib/expense-form.utils';

type ExpenseCreateCategoryDialogProps = { form: ExpenseForm };

export function ExpenseCreateCategoryDialog({
  form,
}: ExpenseCreateCategoryDialogProps) {
  const {
    createCategoryMutation,
    customCategoryIcon,
    customCategoryIconInputRef,
    groupMessages,
    handleCreateCategory,
    isCustomCategoryIcon,
    newCategoryColor,
    newCategoryCustomIcon,
    newCategoryIcon,
    newCategoryName,
    pendingCreateCategoryDialogRef,
    setNewCategoryColor,
    setNewCategoryCustomIcon,
    setNewCategoryIcon,
    setNewCategoryName,
    setShowCreateCategoryDialog,
    showCreateCategoryDialog,
    trimmedNewCategoryName,
  } = form;

  return (
    <Dialog
      open={showCreateCategoryDialog}
      onOpenChange={(nextOpen) => {
        setShowCreateCategoryDialog(nextOpen);
        if (!nextOpen) {
          pendingCreateCategoryDialogRef.current = false;
        }
      }}
    >
      <DialogContent className="max-h-[88dvh] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[28px] p-0 sm:max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="px-5 pt-5 text-left text-base">
            {groupMessages.expense.createCategoryTitle}
          </DialogTitle>
          <DialogDescription className="px-5 text-left">
            {groupMessages.expense.createCategoryDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto px-5 pb-5 pt-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-900">
              {groupMessages.expense.categoryNameLabel}
            </span>
            <input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder={groupMessages.expense.categoryPlaceholder}
              className="h-12 rounded-full border border-gray-200 px-4 text-base shadow-[0_4px_12px_rgba(15,23,42,0.06)] outline-none focus:border-rose-500"
            />
          </label>

          <section>
            <p className="mb-3 text-sm font-medium text-gray-900">
              {groupMessages.expense.selectIcon}
            </p>
            <div className="grid grid-cols-6 gap-3">
              {categoryIconOptions.map((option) => {
                const Icon = option.icon;
                const active = newCategoryIcon === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setNewCategoryIcon(option.id)}
                    className={`flex size-9 items-center justify-center rounded-full border bg-white transition-colors ${
                      active
                        ? 'border-gray-900 text-gray-900'
                        : 'border-gray-200 text-gray-500'
                    }`}
                    aria-label={option.label}
                  >
                    <HugeiconsIcon icon={Icon} className="size-4" />
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setNewCategoryIcon(customCategoryIconId)}
                className={`flex size-9 items-center justify-center rounded-full border bg-white transition-colors ${
                  isCustomCategoryIcon
                    ? 'border-gray-900 text-gray-900'
                    : 'border-gray-200 text-gray-500'
                }`}
                aria-label={groupMessages.expense.keyboardIconAria}
              >
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
              </button>
            </div>

            {isCustomCategoryIcon ? (
              <label className="mt-3 flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
                <span className="text-sm font-medium text-gray-700">Icono</span>
                <input
                  ref={customCategoryIconInputRef}
                  value={newCategoryCustomIcon}
                  onChange={(event) =>
                    setNewCategoryCustomIcon(
                      normalizeCategoryIconInput(event.target.value),
                    )
                  }
                  placeholder="🙂"
                  inputMode="text"
                  className="min-w-0 flex-1 bg-transparent text-xl outline-none"
                  aria-label={groupMessages.expense.customIconAria}
                />
              </label>
            ) : null}
          </section>

          <section>
            <p className="mb-3 text-sm font-medium text-gray-900">
              {groupMessages.expense.selectColor}
            </p>
            <div className="flex flex-wrap gap-4">
              {categoryColorOptions.map((color) => {
                const active = newCategoryColor === color;

                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCategoryColor(color)}
                    className={`flex size-9 items-center justify-center rounded-full border transition-transform active:scale-95 ${
                      active ? 'border-rose-500' : 'border-transparent'
                    }`}
                    aria-label={groupMessages.expense.colorAria(color)}
                  >
                    <span
                      className="size-7 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </button>
                );
              })}
            </div>
          </section>

          <div className="rounded-[24px] border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-4">
              <span
                className="flex size-11 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `${newCategoryColor}22`,
                  color: newCategoryColor,
                }}
              >
                <CategoryIcon
                  icon={
                    isCustomCategoryIcon
                      ? customCategoryIcon || null
                      : newCategoryIcon
                  }
                  color={newCategoryColor}
                  fallback={
                    <HugeiconsIcon icon={Add01Icon} className="size-5" />
                  }
                />
              </span>
              <p className="min-w-0 truncate text-base font-semibold text-gray-900">
                {trimmedNewCategoryName}
              </p>
            </div>
          </div>

          <Button
            type="button"
            className="h-11 w-full rounded-full bg-primary text-white hover:bg-primary/90"
            onClick={handleCreateCategory}
            disabled={
              !trimmedNewCategoryName || createCategoryMutation.isPending
            }
          >
            {createCategoryMutation.isPending
              ? groupMessages.expense.creatingCategory
              : groupMessages.settings.saveCategory}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
