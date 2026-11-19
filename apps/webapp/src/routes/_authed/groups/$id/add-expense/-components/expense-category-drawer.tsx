import { Add01Icon, CheckIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { CategoryIcon } from '#/routes/_authed/groups/$id/-components/category-icon';
import type { ExpenseForm } from '../-hooks/use-expense-form';

type ExpenseCategoryDrawerProps = { form: ExpenseForm };

export function ExpenseCategoryDrawer({ form }: ExpenseCategoryDrawerProps) {
  const {
    categories,
    categoryId,
    groupMessages,
    openCreateCategoryDialog,
    setCategoryId,
    setShowCategoryDrawer,
    showCategoryDrawer,
  } = form;

  return (
    <Drawer open={showCategoryDrawer} onOpenChange={setShowCategoryDrawer}>
      <DrawerContent className="flex max-h-[85dvh] flex-col overflow-hidden">
        <DrawerHeader>
          <DrawerTitle>{groupMessages.expense.categoryTitle}</DrawerTitle>
          <DrawerDescription>
            {groupMessages.expense.categoryDescription}
          </DrawerDescription>
          <Button
            type="button"
            variant="ghost"
            className="mt-2 h-10 w-full justify-start rounded-full px-0 text-rose-500 hover:bg-rose-50 hover:text-rose-500"
            onClick={openCreateCategoryDialog}
          >
            <HugeiconsIcon icon={Add01Icon} className="mr-2 size-4" />
            {groupMessages.expense.createNewCategory}
          </Button>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          <button
            type="button"
            onClick={() => {
              setCategoryId(null);
              setShowCategoryDrawer(false);
            }}
            className="flex w-full items-center justify-between rounded-2xl px-1 py-3 text-left"
          >
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-gray-900">
                {groupMessages.expense.withoutCategory}
              </p>
            </div>
            <span
              className={`flex size-6 items-center justify-center rounded-full border ${
                !categoryId
                  ? 'border-rose-500 bg-rose-500'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {!categoryId ? (
                <HugeiconsIcon icon={CheckIcon} className="size-4 text-white" />
              ) : null}
            </span>
          </button>

          {categories.map((category) => {
            const active = categoryId === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setCategoryId(category.id);
                  setShowCategoryDrawer(false);
                }}
                className="flex w-full items-center justify-between rounded-2xl px-1 py-3 text-left"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: `${category.color ?? '#f43f5e'}18`,
                      color: category.color ?? '#f43f5e',
                    }}
                  >
                    <CategoryIcon
                      icon={category.icon}
                      color={category.color}
                      fallback={
                        <HugeiconsIcon icon={Add01Icon} className="size-4" />
                      }
                    />
                  </span>
                  <p className="truncate text-base font-medium text-gray-900">
                    {category.name}
                  </p>
                </div>
                <span
                  className={`flex size-6 items-center justify-center rounded-full border ${
                    active
                      ? 'border-rose-500 bg-rose-500'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {active ? (
                    <HugeiconsIcon
                      icon={CheckIcon}
                      className="size-4 text-white"
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
