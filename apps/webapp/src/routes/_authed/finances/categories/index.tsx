import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button';
import { m } from '#/paraglide/messages.js';
import { ScreenShell } from '../-components/finance-layout';
import {
  categoryColors,
  categoryIcons,
  createCategoryEndpoint,
  currency,
  currentMonthKey,
  deleteCategoryEndpoint,
  type FinanceCategory,
  type FinanceCategoryInput,
  type FinanceCategoryKind,
  type FinanceCategoryUpdateInput,
  getBrowserTimeZone,
  getCategoryKindLabel,
  summaryEndpoint,
  toCategoryKind,
  updateCategoryEndpoint,
} from '../-components/finance-model';

export const Route = createFileRoute('/_authed/finances/categories/')({
  validateSearch: (search: Record<string, unknown>) => ({
    month:
      typeof search.month === 'string' && /^\d{4}-\d{2}$/.test(search.month)
        ? search.month
        : currentMonthKey(),
  }),
  component: CategoriesRoute,
});

function CategoriesRoute() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const { month } = Route.useSearch();
  const timeZone = getBrowserTimeZone();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] =
    useState<FinanceCategoryKind>('both');
  const [newCategoryColor, setNewCategoryColor] = useState<string>(
    categoryColors[0],
  );
  const [newCategoryIcon, setNewCategoryIcon] = useState(categoryIcons[0]);
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryType, setEditingCategoryType] =
    useState<FinanceCategoryKind>('both');
  const [editingCategoryColor, setEditingCategoryColor] = useState<string>(
    categoryColors[0],
  );
  const [editingCategoryIcon, setEditingCategoryIcon] = useState(
    categoryIcons[0],
  );

  const summaryQuery = useQuery({
    queryKey: ['finances-summary', month, currency, timeZone],
    queryFn: async () => {
      const response = await summaryEndpoint({
        query: { month, currency, timeZone },
      });
      if (!response.ok) throw new Error(m['finances.loadError']());
      return response.json();
    },
  });

  const categoryMutation = useMutation({
    mutationFn: async (input: FinanceCategoryInput) => {
      const response = await createCategoryEndpoint({ json: input });
      if (!response.ok) throw new Error(m['finances.categorySaveFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await invalidateCategoryQueries(queryClient);
      setNewCategoryName('');
      toast.success(m['finances.categorySaved']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.categorySaveFailed'](),
      );
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: FinanceCategoryUpdateInput;
    }) => {
      const response = await updateCategoryEndpoint({
        param: { id },
        json: input,
      });
      if (!response.ok) throw new Error(m['finances.categoryUpdateFailed']());
      return response.json();
    },
    onSuccess: async (category) => {
      await invalidateCategoryQueries(queryClient);
      selectCategoryToEdit(category);
      toast.success(m['finances.categoryUpdated']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.categoryUpdateFailed'](),
      );
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteCategoryEndpoint({ param: { id } });
      if (!response.ok) throw new Error(m['finances.deleteCategoryFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await invalidateCategoryQueries(queryClient);
      setEditingCategoryId('');
      setEditingCategoryName('');
      toast.success(m['finances.categoryDeleted']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.deleteCategoryFailed'](),
      );
    },
  });

  function submitCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error(m['finances.categoryValidation']());
      return;
    }

    categoryMutation.mutate({
      name,
      type: newCategoryType,
      color: newCategoryColor,
      icon: newCategoryIcon,
    });
  }

  function selectCategoryToEdit(category: FinanceCategory) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryType(toCategoryKind(category.transactionType));
    setEditingCategoryColor(category.color ?? categoryColors[0]);
    setEditingCategoryIcon(category.icon ?? categoryIcons[0]);
  }

  function submitCategoryUpdate() {
    const name = editingCategoryName.trim();
    if (!editingCategoryId || !name) {
      toast.error(m['finances.categoryValidation']());
      return;
    }

    updateCategoryMutation.mutate({
      id: editingCategoryId,
      input: {
        name,
        type: editingCategoryType,
        color: editingCategoryColor,
        icon: editingCategoryIcon,
      },
    });
  }

  const categories = summaryQuery.data?.categories ?? [];

  return (
    <ScreenShell
      title={m['finances.categories']()}
      month={month}
      onBack={() =>
        void navigate({
          to: '/finances',
          search: {
            view: 'dashboard',
            month,
            transactionId: undefined,
            accountId: undefined,
          },
        })
      }
    >
      {summaryQuery.isLoading ? (
        <div className="rounded-[30px] bg-white p-5 text-sm text-black/45">
          {m['common.loading']()}
        </div>
      ) : summaryQuery.isError ? (
        <div className="rounded-[30px] bg-white p-5 text-sm text-red-700">
          {m['finances.loadError']()}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]">
          <section className="rounded-[30px] bg-white p-5">
            <h2 className="text-lg font-semibold">
              {m['finances.createCategory']()}
            </h2>
            <div className="mt-5 grid gap-4">
              <input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder={m['finances.categoryPlaceholder']()}
                className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
              />
              <CategoryTypePicker
                value={newCategoryType}
                onChange={setNewCategoryType}
              />
              <CategoryColorPicker
                value={newCategoryColor}
                onChange={setNewCategoryColor}
              />
              <CategoryIconPicker
                value={newCategoryIcon}
                onChange={setNewCategoryIcon}
              />
              <Button
                type="button"
                onClick={submitCategory}
                disabled={categoryMutation.isPending}
                className="h-12 rounded-full"
              >
                {categoryMutation.isPending
                  ? m['common.saving']()
                  : m['finances.saveCategory']()}
              </Button>
            </div>
          </section>

          <section className="rounded-[30px] bg-white p-5">
            <h2 className="text-lg font-semibold">
              {m['finances.editCategory']()}
            </h2>
            <div className="mt-4 grid gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => selectCategoryToEdit(category)}
                  className={`flex items-center gap-3 rounded-[20px] p-3 text-left ${
                    editingCategoryId === category.id
                      ? 'bg-black text-white'
                      : 'bg-[#f7f7f4]'
                  }`}
                >
                  <span
                    className="size-4 rounded-full"
                    style={{ backgroundColor: category.color ?? '#101113' }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {category.name}
                  </span>
                  <span className="text-xs opacity-60">
                    {getCategoryKindLabel(
                      toCategoryKind(category.transactionType),
                    )}
                  </span>
                </button>
              ))}
            </div>

            {editingCategoryId ? (
              <div className="mt-5 grid gap-4 border-t border-black/5 pt-5">
                <input
                  value={editingCategoryName}
                  onChange={(event) =>
                    setEditingCategoryName(event.target.value)
                  }
                  placeholder={m['finances.categoryPlaceholder']()}
                  className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
                />
                <CategoryTypePicker
                  value={editingCategoryType}
                  onChange={setEditingCategoryType}
                />
                <CategoryColorPicker
                  value={editingCategoryColor}
                  onChange={setEditingCategoryColor}
                />
                <CategoryIconPicker
                  value={editingCategoryIcon}
                  onChange={setEditingCategoryIcon}
                />
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Button
                    type="button"
                    onClick={submitCategoryUpdate}
                    disabled={updateCategoryMutation.isPending}
                    className="h-12 rounded-full"
                  >
                    {updateCategoryMutation.isPending
                      ? m['common.saving']()
                      : m['finances.saveCategoryChanges']()}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(m['finances.deleteCategoryConfirm']())) {
                        deleteCategoryMutation.mutate(editingCategoryId);
                      }
                    }}
                    disabled={deleteCategoryMutation.isPending}
                    className="h-12 rounded-full"
                  >
                    {m['common.delete']()}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </ScreenShell>
  );
}

function CategoryTypePicker({
  value,
  onChange,
}: {
  value: FinanceCategoryKind;
  onChange: (value: FinanceCategoryKind) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-full bg-[#f7f7f4] p-1">
      {(['both', 'expense', 'income'] as const).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={`h-10 rounded-full text-sm font-medium ${
            value === type ? 'bg-[#101113] text-white' : 'text-black/50'
          }`}
        >
          {getCategoryKindLabel(type)}
        </button>
      ))}
    </div>
  );
}

function CategoryColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {categoryColors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`size-9 rounded-full border-2 ${
            value === color ? 'border-black' : 'border-transparent'
          }`}
          style={{ backgroundColor: color }}
          aria-label={color}
        />
      ))}
    </div>
  );
}

function CategoryIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
    >
      {categoryIcons.map((icon) => (
        <option key={icon} value={icon}>
          {icon}
        </option>
      ))}
    </select>
  );
}

function invalidateCategoryQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
    queryClient.invalidateQueries({ queryKey: ['finances-movements'] }),
    queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
  ]);
}
