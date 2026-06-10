export type { GroupsService } from './types';

import { createGroupCategoriesService } from './categories.service';
import { createGroupCreateService } from './create-group.service';
import { createGroupDeleteService } from './delete-group.service';
import { createGroupExpensesService } from './expenses.service';
import { createGroupExportService } from './export.service';
import { createGroupImageService } from './image.service';
import { createGroupListService } from './list.service';
import { createGroupMembersService } from './members.service';
import { createGroupReportsService } from './reports.service';
import { createGroupSummaryService } from './summary.service';
import type { GroupsService } from './types';
import { createGroupUpdateService } from './update-group.service';

export function createGroupsService(): GroupsService {
  return {
    ...createGroupCreateService(),
    ...createGroupCategoriesService(),
    ...createGroupDeleteService(),
    ...createGroupListService(),
    ...createGroupSummaryService(),
    ...createGroupUpdateService(),
    ...createGroupImageService(),
    ...createGroupExpensesService(),
    ...createGroupExportService(),
    ...createGroupMembersService(),
    ...createGroupReportsService(),
  };
}
