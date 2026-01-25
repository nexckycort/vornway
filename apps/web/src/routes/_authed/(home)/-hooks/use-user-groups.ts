import { useQuery } from '@tanstack/react-query';

import { getUserGroups } from '../-actions/get-user-groups';

export function useUserGroups() {
  return useQuery({
    queryKey: ['user-groups'],
    queryFn: async () => {
      const response = await getUserGroups();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.groups;
    },
  });
}
