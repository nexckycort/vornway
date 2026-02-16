import { useQuery } from '@tanstack/react-query';

import { getUserItineraries } from '../-actions/get-user-itineraries';

export function useUserItineraries({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: ['user-itineraries'],
    enabled,
    queryFn: async () => {
      const response = await getUserItineraries();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.itineraries;
    },
  });
}
