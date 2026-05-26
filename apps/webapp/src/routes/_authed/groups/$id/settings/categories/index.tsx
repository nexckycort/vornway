import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowRightLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useMoveCategoryExpensesMutation,
  useUpdateCategoryMutation,
} from '#/routes/_authed/groups/-hooks/use-group-actions';
import { useGroupSummaryQuery } from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import {
  CategoryIcon,
  categoryIconById,
  categoryIconOptions,
} from '../../-components/category-icon';
import { getGroupDetailMessages } from '../../-messages';

export const Route = createFileRoute(
  '/_authed/groups/$id/settings/categories/',
)({
  component: RouteComponent,
});

const categoryColorOptions = [
  '#ff7fa3',
  '#5bd9cc',
  '#d978f4',
  '#ffa0a0',
  '#ffd741',
  '#62d9aa',
  '#9daef9',
  '#ffc06d',
] as const;

const customCategoryIconId = 'custom';

function normalizeCategoryIconInput(value: string) {
  return Array.from(value.trim()).slice(0, 4).join('');
}

function RouteComponent() {
  const { id } = Route.useParams();
  const t = getGroupDetailMessages();
  const navigate = useNavigate();
  const groupQuery = useGroupSummaryQuery(id);
  const [showEditorDrawer, setShowEditorDrawer] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const createCategoryMutation = useCreateCategoryMutation(id);
  const updateCategoryMutation = useUpdateCategoryMutation(
    id,
    selectedCategoryId ?? '',
  );
  const deleteCategoryMutation = useDeleteCategoryMutation(id);
  const moveCategoryExpensesMutation = useMoveCategoryExpensesMutation(
    id,
    selectedCategoryId ?? '',
  );
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState(categoryIconOptions[0].id);
  const [categoryCustomIcon, setCategoryCustomIcon] = useState('');
  const [categoryColor, setCategoryColor] = useState<string>(
    categoryColorOptions[0],
  );
  const [showMoveDrawer, setShowMoveDrawer] = useState(false);
  const iconInputRef = useRef<HTMLInputElement | null>(null);

  const categories = groupQuery.data?.categories ?? [];
  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );
  const trimmedCategoryName = categoryName.trim();
  const isCustomIcon = categoryIcon === customCategoryIconId;
  const customIconValue = categoryCustomIcon.trim();
  const categoryExpenseCount = selectedCategory?.expenseCount ?? 0;
  const movableCategories = categories.filter(
    (category) => category.id !== selectedCategoryId,
  );

  useEffect(() => {
    if (!showEditorDrawer || !isCustomIcon) return;

    const frame = window.requestAnimationFrame(() => {
      iconInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isCustomIcon, showEditorDrawer]);

  const goBack = () => {
    void navigate({
      to: '/groups/$id/settings',
      params: { id },
      replace: true,
    });
  };

  const openCreateDrawer = () => {
    setEditorMode('create');
    setSelectedCategoryId(null);
    setCategoryName('');
    setCategoryIcon(categoryIconOptions[0].id);
    setCategoryCustomIcon('');
    setCategoryColor(categoryColorOptions[0]);
    setShowEditorDrawer(true);
  };

  const openEditDrawer = (category: (typeof categories)[number]) => {
    setEditorMode('edit');
    setSelectedCategoryId(category.id);
    setCategoryName(category.name);
    if (category.icon && categoryIconById.has(category.icon)) {
      setCategoryIcon(category.icon);
      setCategoryCustomIcon('');
    } else if (category.icon) {
      setCategoryIcon(customCategoryIconId);
      setCategoryCustomIcon(category.icon);
    } else {
      setCategoryIcon(categoryIconOptions[0].id);
      setCategoryCustomIcon('');
    }
    setCategoryColor(category.color ?? categoryColorOptions[0]);
    setShowEditorDrawer(true);
  };

  const closeEditorDrawer = () => {
    setShowEditorDrawer(false);
    setShowMoveDrawer(false);
  };

  const openMoveDrawer = () => {
    setShowMoveDrawer(true);
  };

  const handleMoveExpenses = async (targetCategoryId: string | null) => {
    if (!selectedCategoryId || moveCategoryExpensesMutation.isPending) return;

    try {
      await moveCategoryExpensesMutation.mutateAsync({
        targetCategoryId,
      });
      setShowMoveDrawer(false);
    } catch {
      void 0;
    }
  };

  const handleSaveCategory = async () => {
    if (!trimmedCategoryName) return;

    try {
      if (editorMode === 'create') {
        await createCategoryMutation.mutateAsync({
          name: trimmedCategoryName,
          icon: isCustomIcon ? customIconValue || undefined : categoryIcon,
          color: categoryColor,
        });
      } else if (selectedCategoryId) {
        await updateCategoryMutation.mutateAsync({
          name: trimmedCategoryName,
          icon: isCustomIcon ? customIconValue || null : categoryIcon,
          color: categoryColor,
        });
      }

      closeEditorDrawer();
    } catch {
      void 0;
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategoryId) return;

    try {
      await deleteCategoryMutation.mutateAsync(selectedCategoryId);
      closeEditorDrawer();
    } catch {
      void 0;
    }
  };

  if (groupQuery.isLoading) {
    return (
      <MobilePageLayout title={t.settings.categoriesTitle} onBack={goBack}>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[#64748b]">
            {t.settings.categoriesLoading}
          </p>
        </div>
      </MobilePageLayout>
    );
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <MobilePageLayout title={t.settings.categoriesTitle} onBack={goBack}>
        <div className="flex flex-1 flex-col justify-center gap-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {groupQuery.error instanceof Error
              ? groupQuery.error.message
              : t.settings.categoriesLoadError}
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full"
            onClick={goBack}
          >
            {t.common.back}
          </Button>
        </div>
      </MobilePageLayout>
    );
  }

  const group = groupQuery.data;

  return (
    <MobilePageLayout title={t.settings.categoriesTitle} onBack={goBack}>
      <div className="flex flex-1 flex-col pb-4">
        <section className="-mx-4 border-y border-[#e5e7eb] bg-white px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[#64748b]">
            {group.name}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#132238]">
            {t.settings.manageCategoriesTitle}
          </h2>
          <p className="mt-1 text-sm text-[#64748b]">
            {t.settings.manageCategoriesCopy}
          </p>
        </section>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="mt-5 flex w-full items-center justify-between rounded-[24px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-white text-[#e11d48] shadow-sm">
              <Plus className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-[#132238]">
                {t.settings.createNewCategory}
              </p>
              <p className="text-xs text-[#64748b]">
                {t.settings.createNewCategoryCopy}
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-[#94a3b8]" />
        </button>

        <div className="mt-5 space-y-3">
          {categories.length === 0 ? (
            <div className="rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-8 text-center text-sm text-[#64748b]">
              {t.settings.emptyCategories}
            </div>
          ) : null}

          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => openEditDrawer(category)}
              className="flex w-full items-center justify-between rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-4 text-left shadow-[0_1px_0_rgba(15,23,42,0.02)] transition-transform active:scale-[0.99]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `${category.color ?? '#f43f5e'}18`,
                    color: category.color ?? '#f43f5e',
                  }}
                >
                  <CategoryIcon
                    icon={category.icon}
                    color={category.color}
                    fallback={<Plus className="size-4" />}
                    className="size-5"
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#132238]">
                    {category.name}
                  </p>
                  <p className="truncate text-xs text-[#64748b]">
                    {category.icon && categoryIconById.has(category.icon)
                      ? t.settings.defaultIcon
                      : category.icon
                        ? t.settings.customEmoji
                        : t.settings.noIcon}
                    {category.expenseCount > 0
                      ? ` · ${t.settings.expenseCount(category.expenseCount)}`
                      : ''}
                  </p>
                </div>
              </div>
              <span
                className="size-4 shrink-0 rounded-full border border-[#e5e7eb]"
                style={{
                  backgroundColor: category.color ?? '#f8fafc',
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <Drawer open={showEditorDrawer} onOpenChange={setShowEditorDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {editorMode === 'create'
                ? t.settings.createCategory
                : t.settings.editCategory}
            </DrawerTitle>
            <DrawerDescription>{t.settings.editorCopy}</DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[70dvh] space-y-5 overflow-y-auto px-5 pb-5">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#132238]">
                {t.settings.categoryName}
              </span>
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder={t.settings.categoryPlaceholder}
                className="h-12 rounded-full border border-[#e5e7eb] bg-white px-4 text-base outline-none focus:border-[#ff4d6a]"
              />
            </label>

            <section>
              <p className="mb-3 text-sm font-medium text-[#132238]">
                {t.settings.pickIcon}
              </p>
              <div className="grid grid-cols-6 gap-3">
                {categoryIconOptions.map((option) => {
                  const Icon = option.icon;
                  const active = categoryIcon === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setCategoryIcon(option.id)}
                      className={`flex size-9 items-center justify-center rounded-full border bg-white transition-colors ${
                        active
                          ? 'border-[#132238] text-[#132238]'
                          : 'border-[#e5e7eb] text-[#64748b]'
                      }`}
                      aria-label={option.label}
                    >
                      <Icon className="size-4" />
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setCategoryIcon(customCategoryIconId)}
                  className={`flex size-9 items-center justify-center rounded-full border bg-white transition-colors ${
                    isCustomIcon
                      ? 'border-[#132238] text-[#132238]'
                      : 'border-[#e5e7eb] text-[#64748b]'
                  }`}
                  aria-label={t.settings.pickKeyboardIcon}
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {isCustomIcon ? (
                <label className="mt-3 flex items-center gap-3 rounded-full border border-[#e5e7eb] bg-white px-4 py-2.5">
                  <span className="text-sm font-medium text-[#64748b]">
                    {t.settings.emoji}
                  </span>
                  <input
                    ref={iconInputRef}
                    value={categoryCustomIcon}
                    onChange={(event) =>
                      setCategoryCustomIcon(
                        normalizeCategoryIconInput(event.target.value),
                      )
                    }
                    placeholder={t.settings.emojiPlaceholder}
                    inputMode="text"
                    className="min-w-0 flex-1 bg-transparent text-xl outline-none"
                    aria-label={t.settings.customEmoji}
                  />
                </label>
              ) : null}
            </section>

            <section>
              <p className="mb-3 text-sm font-medium text-[#132238]">
                {t.settings.pickColor}
              </p>
              <div className="flex flex-wrap gap-4">
                {categoryColorOptions.map((color) => {
                  const active = categoryColor === color;

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCategoryColor(color)}
                      className={`flex size-9 items-center justify-center rounded-full border transition-transform active:scale-95 ${
                        active ? 'border-[#ff4d6a]' : 'border-transparent'
                      }`}
                      aria-label={`Color ${color}`}
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

            <div className="rounded-[24px] border border-[#e5e7eb] bg-white p-4">
              <div className="flex items-center gap-4">
                <span
                  className="flex size-11 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `${categoryColor}22`,
                    color: categoryColor,
                  }}
                >
                  <CategoryIcon
                    icon={isCustomIcon ? customIconValue || null : categoryIcon}
                    color={categoryColor}
                    fallback={<Plus className="size-5" />}
                  />
                </span>
                <p className="min-w-0 truncate text-base font-semibold text-[#132238]">
                  {trimmedCategoryName || t.settings.preview}
                </p>
              </div>
            </div>

            {editorMode === 'edit' &&
            (selectedCategory?.expenseCount ?? 0) === 0 ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-full border-[#fecaca] text-[#ef4444] hover:bg-[#fff1f2] hover:text-[#ef4444]"
                onClick={handleDeleteCategory}
                disabled={
                  deleteCategoryMutation.isPending ||
                  (selectedCategory?.expenseCount ?? 0) > 0
                }
              >
                <Trash2 className="mr-2 size-4" />
                {deleteCategoryMutation.isPending
                  ? 'Eliminando...'
                  : (selectedCategory?.expenseCount ?? 0) > 0
                    ? 'No se puede eliminar'
                    : t.settings.deleteCategory}
              </Button>
            ) : null}

            {editorMode === 'edit' && categoryExpenseCount > 0 ? (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-full border-[#dbe4f0] text-[#132238]"
                  onClick={openMoveDrawer}
                >
                  <ArrowRightLeft className="mr-2 size-4" />
                  {t.settings.moveExpenses}
                </Button>
                <p className="px-2 text-xs leading-5 text-[#64748b]">
                  {t.settings.moveExpensesCopy(categoryExpenseCount)}
                </p>
              </div>
            ) : null}

            <Button
              type="button"
              className="h-11 w-full rounded-full bg-primary text-white hover:bg-primary/90"
              onClick={handleSaveCategory}
              disabled={
                !trimmedCategoryName ||
                createCategoryMutation.isPending ||
                updateCategoryMutation.isPending
              }
            >
              {editorMode === 'create'
                ? createCategoryMutation.isPending
                  ? t.settings.creatingCategory
                  : t.settings.saveCategory
                : updateCategoryMutation.isPending
                  ? t.settings.savingCategory
                  : t.common.saveChanges}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={showMoveDrawer} onOpenChange={setShowMoveDrawer}>
        <DrawerContent className="max-h-[88dvh]">
          <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden px-4 pb-4">
            <DrawerHeader className="px-0 pb-4">
              <DrawerTitle className="text-left text-2xl font-semibold text-[#132238]">
                {t.settings.moveExpensesTitle}
              </DrawerTitle>
              <DrawerDescription className="text-left text-sm text-[#64748b]">
                {t.settings.moveExpensesDescription}
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 space-y-3 overflow-y-auto pb-4">
              <button
                type="button"
                onClick={() => {
                  void handleMoveExpenses(null);
                }}
                className="flex w-full items-center justify-between rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-4 text-left shadow-[0_1px_0_rgba(15,23,42,0.02)] transition-transform active:scale-[0.99]"
              >
                <div>
                  <p className="text-sm font-medium text-[#132238]">
                    {t.settings.withoutCategory}
                  </p>
                  <p className="mt-1 text-xs text-[#64748b]">
                    {t.settings.withoutCategoryCopy}
                  </p>
                </div>
                <ChevronRight className="size-4 text-[#94a3b8]" />
              </button>

              {movableCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    void handleMoveExpenses(category.id);
                  }}
                  className="flex w-full items-center justify-between rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-4 text-left shadow-[0_1px_0_rgba(15,23,42,0.02)] transition-transform active:scale-[0.99]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `${category.color ?? '#f43f5e'}18`,
                        color: category.color ?? '#f43f5e',
                      }}
                    >
                      <CategoryIcon
                        icon={category.icon}
                        color={category.color}
                        fallback={<Plus className="size-4" />}
                        className="size-5"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#132238]">
                        {category.name}
                      </p>
                      <p className="mt-1 text-xs text-[#64748b]">
                        {t.settings.moveToCategoryCopy}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-[#94a3b8]" />
                </button>
              ))}

              {movableCategories.length === 0 ? (
                <div className="rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-6 text-sm text-[#64748b]">
                  {t.settings.noMovableCategories}
                </div>
              ) : null}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </MobilePageLayout>
  );
}
