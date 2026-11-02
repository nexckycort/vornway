import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiPayload } from '@vornway/api-client';
import { api, withErrorMessage } from '#/api/client';
import { removeCachedGroupListItem } from '#/lib/groups-list-query-collection';
import { createExpenseOfflineFirst } from '#/lib/offline-expense-query-collection';
import { removeLocalGroupFallback } from '#/lib/offline-group-query-collection';
import { m } from '#/paraglide/messages.js';

function invalidateFinanceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
    queryClient.invalidateQueries({ queryKey: ['finances-movements'] }),
    queryClient.invalidateQueries({ queryKey: ['finances-accounts'] }),
    queryClient.invalidateQueries({ queryKey: ['finances-account'] }),
    queryClient.invalidateQueries({
      queryKey: ['finances-account-movements'],
    }),
  ]);
}

function invalidateGroupQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  groupId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['group-summary', groupId] }),
    queryClient.invalidateQueries({ queryKey: ['group-expenses', groupId] }),
    queryClient.invalidateQueries({ queryKey: ['groups-list'] }),
    queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
  ]);
}

function slugifyFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function useUpdateGroupImageMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApiPayload<'groups', 'updateImage'>) =>
      withErrorMessage(
        api.groups.updateImage.request({ params: { id: groupId }, payload }),
        m['profile.photoUpdateFailed'](),
      ),
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useUpdateGroupMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApiPayload<'groups', 'update'>) =>
      withErrorMessage(
        api.groups.update.request({ params: { id: groupId }, payload }),
        m['groups.settings.loadError'](),
      ),
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useTransferGroupOwnerMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApiPayload<'groups', 'transferOwner'>) =>
      withErrorMessage(
        api.groups.transferOwner.request({ params: { id: groupId }, payload }),
        m['groups.participants.transferFailed'](),
      ),
    onSuccess: () =>
      Promise.all([
        invalidateGroupQueries(queryClient, groupId),
        invalidateFinanceQueries(queryClient),
      ]),
  });
}

export function useUpdateGroupSettingsMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApiPayload<'groups', 'updateSettings'>) =>
      withErrorMessage(
        api.groups.updateSettings.request({
          params: { id: groupId },
          payload,
        }),
        m['groups.settings.loadError'](),
      ),
    onSuccess: () =>
      Promise.all([
        invalidateGroupQueries(queryClient, groupId),
        invalidateFinanceQueries(queryClient),
      ]),
  });
}

export function useDeleteGroupMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      withErrorMessage(
        api.groups.remove.request({ params: { id: groupId } }),
        m['groups.settings.deleteFailed'](),
      ),
    onSuccess: async () => {
      removeCachedGroupListItem(groupId);
      removeLocalGroupFallback(groupId);

      await Promise.all([
        queryClient.removeQueries({ queryKey: ['group-summary', groupId] }),
        queryClient.removeQueries({ queryKey: ['group-expenses', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['groups-list'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
    },
  });
}

export function useExportGroupCsvMutation(groupId: string, groupName: string) {
  return useMutation({
    mutationFn: () =>
      withErrorMessage(
        api.groups.exportCsv.request({ params: { id: groupId } }),
        m['groups.settings.loadError'](),
      ),
    onSuccess: (csv) => {
      if (typeof document === 'undefined') return;

      const link = document.createElement('a');
      const url = URL.createObjectURL(
        new Blob([csv.body], { type: 'text/csv;charset=utf-8' }),
      );
      const safeName =
        slugifyFileName(groupName) ||
        slugifyFileName(m['groups.participants.createdGroupFallback']());
      link.href = url;
      link.download = `${safeName}-export.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });
}

export function useCreateExpenseMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ApiPayload<'groups', 'createExpense'>) => {
      const result = await createExpenseOfflineFirst(groupId, payload);
      return { id: result.id };
    },
    onSuccess: () => {
      void invalidateGroupQueries(queryClient, groupId);
    },
  });
}

export function useUpdateExpenseMutation(groupId: string, expenseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApiPayload<'groups', 'updateExpense'>) =>
      withErrorMessage(
        api.groups.updateExpense.request({
          params: { id: groupId, expenseId },
          payload,
        }),
        m['groups.detail.deleteExpenseFailed'](),
      ),
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useSettleDebtMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApiPayload<'groups', 'settleDebt'>) =>
      withErrorMessage(
        api.groups.settleDebt.request({ params: { id: groupId }, payload }),
        m['groups.settle.settleFailed'](),
      ),
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useAddMemberMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApiPayload<'groups', 'addMember'>) =>
      withErrorMessage(
        api.groups.addMember.request({ params: { id: groupId }, payload }),
        m['groups.detail.removeMemberFailed'](),
      ),
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useCreateCategoryMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApiPayload<'groups', 'createCategory'>) =>
      withErrorMessage(
        api.groups.createCategory.request({
          params: { id: groupId },
          payload,
        }),
        m['groups.settings.categoriesLoadError'](),
      ),
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useUpdateCategoryMutation(groupId: string, categoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApiPayload<'groups', 'updateCategory'>) =>
      withErrorMessage(
        api.groups.updateCategory.request({
          params: { id: groupId, categoryId },
          payload,
        }),
        m['groups.settings.categoriesLoadError'](),
      ),
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useDeleteCategoryMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: string) =>
      withErrorMessage(
        api.groups.removeCategory.request({
          params: { id: groupId, categoryId },
        }),
        m['groups.settings.categoriesLoadError'](),
      ),
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useMoveCategoryExpensesMutation(
  groupId: string,
  categoryId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApiPayload<'groups', 'moveCategoryExpenses'>) =>
      withErrorMessage(
        api.groups.moveCategoryExpenses.request({
          params: { id: groupId, categoryId },
          payload,
        }),
        m['groups.settings.moveExpensesTitle'](),
      ),
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useRemoveMemberMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId }: { memberId: string }) =>
      withErrorMessage(
        api.groups.removeMember.request({ params: { id: groupId, memberId } }),
        m['groups.detail.removeMemberFailed'](),
      ),
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}

export function useUnlinkMemberMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId }: { memberId: string }) =>
      withErrorMessage(
        api.groups.unlinkMember.request({ params: { id: groupId, memberId } }),
        m['groups.settings.leaveFailed'](),
      ),
    onSuccess: () => invalidateGroupQueries(queryClient, groupId),
  });
}
