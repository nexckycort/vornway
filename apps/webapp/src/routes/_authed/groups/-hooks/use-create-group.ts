import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiPayload, ApiSuccess } from '@vornway/api-client';
import {
  type CreateGroupOfflineFirstResult,
  createGroupOfflineFirst,
} from '#/lib/offline-group-query-collection';

type CreateGroupPayload = ApiPayload<'groups', 'create'>;

export type CreateGroupFormValues = {
  name: string;
  type: string;
  description: string;
  image?: {
    dataUrl: string;
    fileName?: string;
  } | null;
  participants?: Array<{
    name: string;
    userId?: string;
  }>;
};

export type CreatedGroupPayload = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  imageUrl: string | null;
  inviteCode: string;
  createdAt: string;
};

export function buildCreateGroupPayload(values: CreateGroupFormValues) {
  return {
    name: values.name.trim(),
    type: values.type.trim(),
    ...(values.description.trim()
      ? { description: values.description.trim() }
      : {}),
    ...(values.participants && values.participants.length > 0
      ? { participants: values.participants }
      : {}),
    ...(values.image
      ? {
          image: {
            dataUrl: values.image.dataUrl,
            ...(values.image.fileName
              ? { fileName: values.image.fileName }
              : {}),
          },
        }
      : {}),
  } satisfies CreateGroupPayload;
}

async function createGroup(
  values: CreateGroupFormValues,
): Promise<ApiSuccess<'groups', 'create'> | CreateGroupOfflineFirstResult> {
  const payload = buildCreateGroupPayload(values);

  return createGroupOfflineFirst(payload);
}

export function useCreateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups-list'] });
      void queryClient.invalidateQueries({ queryKey: ['home-summary'] });
    },
  });
}
