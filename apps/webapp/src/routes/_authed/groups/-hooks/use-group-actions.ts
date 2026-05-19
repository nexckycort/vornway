import type { InferRequestType, InferResponseType } from '#/lib/hc';
import { client } from '#/lib/hc';
import { createExpenseWithOfflineSupport } from '#/lib/offline-expense-sync';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const createExpenseEndpoint = client.api.groups[':id'].expenses.$post;
const updateExpenseEndpoint =
  client.api.groups[':id'].expenses[':expenseId'].$put;
const settleDebtEndpoint = client.api.groups[':id'].settlements.$post;
const addMemberEndpoint = client.api.groups[':id'].members.$post;
const removeMemberEndpoint =
  client.api.groups[':id'].members[':memberId'].$delete;

type CreateExpenseRequest = InferRequestType<typeof createExpenseEndpoint>;
type UpdateExpenseRequest = InferRequestType<typeof updateExpenseEndpoint>;
type UpdateExpenseResponse = InferResponseType<typeof updateExpenseEndpoint>;
type SettleDebtRequest = InferRequestType<typeof settleDebtEndpoint>;
type SettleDebtResponse = InferResponseType<typeof settleDebtEndpoint>;
type AddMemberRequest = InferRequestType<typeof addMemberEndpoint>;
type AddMemberResponse = InferResponseType<typeof addMemberEndpoint>;
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

export function useCreateExpenseMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: CreateExpenseRequest['json']) => {
      return createExpenseWithOfflineSupport(groupId, json, queryClient);
    },
    onSuccess: async (data) => {
      if (data && typeof data === 'object' && 'queued' in data && data.queued) {
        return;
      }

      await invalidateGroup(queryClient, groupId);
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
