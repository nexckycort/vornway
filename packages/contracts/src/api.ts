import { HttpApi } from 'effect/http-api';
import { ErrorBoundary, RequestValidation } from './errors.ts';
import { UsersApi } from './modules/users/contract.ts';

export const Api = HttpApi.make('VornwayApi')
  .add(UsersApi)
  .middleware(RequestValidation)
  .middleware(ErrorBoundary);
