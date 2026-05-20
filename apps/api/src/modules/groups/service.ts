export type { GroupsService } from './types';
import { createGroupCreateService } from './create-group.service';
import { createGroupDeleteService } from './delete-group.service';
import { createGroupExpensesService } from './expenses.service';
import { createGroupImageService } from './image.service';
import { createGroupListService } from './list.service';
import { createGroupMembersService } from './members.service';
import { createGroupReportsService } from './reports.service';
import { createGroupSummaryService } from './summary.service';
import { createGroupUpdateService } from './update-group.service';
import type { GroupsService } from './types';

export function createGroupsService(): GroupsService {
  return {
    ...createGroupCreateService(),
    ...createGroupDeleteService(),
    ...createGroupListService(),
    ...createGroupSummaryService(),
    ...createGroupUpdateService(),
    ...createGroupImageService(),
    ...createGroupExpensesService(),
    ...createGroupMembersService(),
    ...createGroupReportsService(),
  };
}
