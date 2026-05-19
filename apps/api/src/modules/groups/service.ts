export type { GroupsService } from './types';
import { createGroupCreateService } from './create-group.service';
import { createGroupExpensesService } from './expenses.service';
import { createGroupListService } from './list.service';
import { createGroupMembersService } from './members.service';
import { createGroupReportsService } from './reports.service';
import { createGroupSummaryService } from './summary.service';
import type { GroupsService } from './types';

export function createGroupsService(): GroupsService {
  return {
    ...createGroupCreateService(),
    ...createGroupListService(),
    ...createGroupSummaryService(),
    ...createGroupExpensesService(),
    ...createGroupMembersService(),
    ...createGroupReportsService(),
  };
}
