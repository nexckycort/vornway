import { client } from '#/lib/hc';
import type { InferRequestType, InferResponseType } from '#/lib/hc';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const createGroupEndpoint = client.api.groups.$post;

type CreateGroupRequest = InferRequestType<typeof createGroupEndpoint>;
type CreateGroupResponse = InferResponseType<typeof createGroupEndpoint>;

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

async function createGroup(values: CreateGroupFormValues): Promise<CreateGroupResponse> {
  const payload: CreateGroupRequest = {
    json: {
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
              ...(values.image.fileName ? { fileName: values.image.fileName } : {}),
            },
          }
        : {}),
    },
  };

  const response = await createGroupEndpoint(payload);

  if (!response.ok) {
    throw new Error('No se pudo crear el grupo');
  }

  return (await response.json()) as CreateGroupResponse;
}

export function useCreateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGroup,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups-list'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
    },
  });
}
