import { HttpApi } from 'effect/http-api';
import { ErrorBoundary, RequestValidation } from './errors.ts';
import { UserSearchApi } from './modules/users/contract.ts';

export const Api = HttpApi.make('VornwayApi')
  .add(UserSearchApi)
  .middleware(RequestValidation)
  .middleware(ErrorBoundary);
