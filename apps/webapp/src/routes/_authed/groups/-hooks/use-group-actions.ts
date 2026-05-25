import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeCachedGroupListItem } from '#/lib/groups-list-query-collection';
import type { InferRequestType, InferResponseType } from '#/lib/hc';
import { client } from '#/lib/hc';
import { createExpenseOfflineFirst } from '#/lib/offline-expense-query-collection';
import { removeLocalGroupFallback } from '#/lib/offline-group-query-collection';

const createExpenseEndpoint = client.api.groups[':id'].expenses.$post;
const updateExpenseEndpoint =
  client.api.groups[':id'].expenses[':expenseId'].$put;
const updateGroupEndpoint = client.api.groups[':id'].$patch;
const deleteGroupEndpoint = client.api.groups[':id'].$delete;
const settleDebtEndpoint = client.api.groups[':id'].settlements.$post;
const addMemberEndpoint = client.api.groups[':id'].members.$post;
const createCategoryEndpoint = client.api.groups[':id'].categories.$post;
const updateCategoryEndpoint =
  client.api.groups[':id'].categories[':categoryId'].$patch;
const deleteCategoryEndpoint =
  client.api.groups[':id'].categories[':categoryId'].$delete;
const removeMemberEndpoint =
  client.api.groups[':id'].members[':memberId'].$delete;

type CreateExpenseRequest = InferRequestType<typeof createExpenseEndpoint>;
type UpdateExpenseRequest = InferRequestType<typeof updateExpenseEndpoint>;
type UpdateExpenseResponse = InferResponseType<typeof updateExpenseEndpoint>;
type UpdateGroupRequest = InferRequestType<typeof updateGroupEndpoint>;
type UpdateGroupResponse = InferResponseType<typeof updateGroupEndpoint>;
type DeleteGroupResponse = InferResponseType<typeof deleteGroupEndpoint>;
type SettleDebtRequest = InferRequestType<typeof settleDebtEndpoint>;
type SettleDebtResponse = InferResponseType<typeof settleDebtEndpoint>;
type AddMemberRequest = InferRequestType<typeof addMemberEndpoint>;
type AddMemberResponse = InferResponseType<typeof addMemberEndpoint>;
type CreateCategoryRequest = InferRequestType<typeof createCategoryEndpoint>;
type CreateCategoryResponse = InferResponseType<typeof createCategoryEndpoint>;
type CreateCategorySuccess = Extract<CreateCategoryResponse, { id: string }>;
type UpdateCategoryRequest = InferRequestType<typeof updateCategoryEndpoint>;
type UpdateCategoryResponse = InferResponseType<typeof updateCategoryEndpoint>;
type UpdateCategorySuccess = Extract<UpdateCategoryResponse, { id: string }>;
type DeleteCategoryResponse = InferResponseType<typeof deleteCategoryEndpoint>;
type RemoveMemberResponse = InferResponseType<typeof removeMemberEndpoint>;

type UpdateGroupImageRequest = {
  dataUrl: string;
  fileName?: string;
};

type UpdateGroupImageResponse = {
  imageUrl: string | null;
};

const updateGroupImageEndpoint = client.api.groups[':id'] as unknown as {
  image: {
    $patch: (args: {
      param: { id: string };
      json: UpdateGroupImageRequest;
    }) => Promise<{
      ok: boolean;
      json: () => Promise<unknown>;
    }>;
  };
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'string') return error;
  if (!error || typeof error !== 'object') return fallback;

  const candidate = error as {
    message?: unknown;
    error?: unknown;
  };

  if (typeof candidate.message === 'string') {
    return candidate.message;
  }

  return getApiErrorMessage(candidate.error, fallback);
}

function invalidateGroup(
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

export function useUpdateGroupImageMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: UpdateGroupImageRequest) => {
      const response = await updateGroupImageEndpoint.image.$patch({
        param: { id: groupId },
        json,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: unknown };
        throw new Error(
          getApiErrorMessage(payload.error, 'No se pudo actualizar la imagen'),
        );
      }

      return (await response.json()) as UpdateGroupImageResponse;
    },
    onSuccess: async () => {
      await invalidateGroup(queryClient, groupId);
    },
  });
}

export function useUpdateGroupMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: UpdateGroupRequest['json']) => {
      const response = await updateGroupEndpoint({
        param: { id: groupId },
        json,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo actualizar el grupo');
      }

      return (await response.json()) as UpdateGroupResponse;
    },
    onSuccess: async () => {
      await invalidateGroup(queryClient, groupId);
    },
  });
}

export function useDeleteGroupMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await deleteGroupEndpoint({
        param: { id: groupId },
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo eliminar el grupo');
      }

      return (await response.json()) as DeleteGroupResponse;
    },
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

export function useCreateExpenseMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: CreateExpenseRequest['json']) => {
      const result = await createExpenseOfflineFirst(groupId, json);
      return { id: result.id };
    },
    onSuccess: () => {
      void invalidateGroup(queryClient, groupId);
    },
  });
}

export function useUpdateExpenseMutation(groupId: string, expenseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: UpdateExpenseRequest['json']) => {
      const response = await updateExpenseEndpoint({
        param: { id: groupId, expenseId },
        json,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo actualizar el gasto');
      }

      return (await response.json()) as UpdateExpenseResponse;
    },
    onSuccess: async () => {
      await invalidateGroup(queryClient, groupId);
    },
  });
}

export function useSettleDebtMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: SettleDebtRequest['json']) => {
      const response = await settleDebtEndpoint({
        param: { id: groupId },
        json,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo liquidar la deuda');
      }

      return (await response.json()) as SettleDebtResponse;
    },
    onSuccess: async () => {
      await invalidateGroup(queryClient, groupId);
    },
  });
}

export function useAddMemberMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: AddMemberRequest['json']) => {
      const response = await addMemberEndpoint({
        param: { id: groupId },
        json,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo agregar el participante');
      }

      return (await response.json()) as AddMemberResponse;
    },
    onSuccess: async () => {
      await invalidateGroup(queryClient, groupId);
    },
  });
}

export function useCreateCategoryMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: CreateCategoryRequest['json']) => {
      const response = await createCategoryEndpoint({
        param: { id: groupId },
        json,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo crear la categoría');
      }

      return (await response.json()) as CreateCategorySuccess;
    },
    onSuccess: async () => {
      await invalidateGroup(queryClient, groupId);
    },
  });
}

export function useUpdateCategoryMutation(groupId: string, categoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: UpdateCategoryRequest['json']) => {
      const response = await updateCategoryEndpoint({
        param: { id: groupId, categoryId },
        json,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo actualizar la categoría');
      }

      return (await response.json()) as UpdateCategorySuccess;
    },
    onSuccess: async () => {
      await invalidateGroup(queryClient, groupId);
    },
  });
}

export function useDeleteCategoryMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await deleteCategoryEndpoint({
        param: { id: groupId, categoryId },
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo eliminar la categoría');
      }

      return (await response.json()) as DeleteCategoryResponse;
    },
    onSuccess: async () => {
      await invalidateGroup(queryClient, groupId);
    },
  });
}

export function useRemoveMemberMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const response = await removeMemberEndpoint({
        param: { id: groupId, memberId },
        query: { unlink: 'true' },
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo eliminar el participante');
      }

      return (await response.json()) as RemoveMemberResponse;
    },
    onSuccess: async () => {
      await invalidateGroup(queryClient, groupId);
    },
  });
}

export function useUnlinkMemberMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const response = await removeMemberEndpoint({
        param: { id: groupId, memberId },
        query: { unlink: 'true' },
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo desvincular la cuenta');
      }

      return (await response.json()) as RemoveMemberResponse;
    },
    onSuccess: async () => {
      await invalidateGroup(queryClient, groupId);
    },
  });
}
