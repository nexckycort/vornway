import { HttpApi } from 'effect/http-api';
import { ErrorBoundary, RequestValidation } from './errors.ts';
import { AdminApi } from './modules/admin/contract.ts';
import { ConverterApi } from './modules/converter/contract.ts';
import { DebtsApi } from './modules/debts/contract.ts';
import { FeedbackApi } from './modules/feedback/contract.ts';
import { FinancesApi } from './modules/finances/contract.ts';
import { GoalsApi } from './modules/goals/contract.ts';
import { GroupsApi } from './modules/groups/contract.ts';
import { HomeApi } from './modules/home/contract.ts';
import { InvitesApi } from './modules/invites/contract.ts';
import { LoginApi } from './modules/login/contract.ts';
import { MapsApi } from './modules/maps/contract.ts';
import { NotificationsApi } from './modules/notifications/contract.ts';
import { PushApi } from './modules/push/contract.ts';
import { QuickSplitsApi } from './modules/quick-splits/contract.ts';
import { UsersApi } from './modules/users/contract.ts';

export const Api = HttpApi.make('VornwayApi')
  .add(AdminApi)
  .add(ConverterApi)
  .add(DebtsApi)
  .add(FeedbackApi)
  .add(FinancesApi)
  .add(GoalsApi)
  .add(GroupsApi)
  .add(HomeApi)
  .add(InvitesApi)
  .add(LoginApi)
  .add(MapsApi)
  .add(NotificationsApi)
  .add(PushApi)
  .add(QuickSplitsApi)
  .add(UsersApi)
  .middleware(RequestValidation)
  .middleware(ErrorBoundary);
