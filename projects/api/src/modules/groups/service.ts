import type { GroupsHealth } from './types';

export type GroupsService = {
  getHealth: () => Promise<GroupsHealth>;
};

export function createGroupsService(): GroupsService {
  return {
    getHealth: async () => ({
      module: 'groups',
      status: 'ok',
    }),
  };
}
