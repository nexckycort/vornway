import { Api } from '@vornway/contracts/api';
import { CurrentUser } from '@vornway/contracts/modules/auth/contract';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { GoalContributions } from './contributions';
import { Goals } from './service';

export const GoalsHandlers = HttpApiBuilder.group(Api, 'goals', (handlers) =>
  Effect.gen(function* () {
    const goals = yield* Goals;
    const contributions = yield* GoalContributions;
    return handlers
      .handle('list', ({ query }) =>
        Effect.flatMap(CurrentUser, (user) => goals.list(user.id, query)),
      )
      .handle('get', ({ params }) =>
        Effect.flatMap(CurrentUser, (user) => goals.get(user.id, params.id)),
      )
      .handle('create', ({ payload }) =>
        Effect.flatMap(CurrentUser, (user) => goals.create(user, payload)),
      )
      .handle('update', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          goals.update(user.id, params.id, payload),
        ),
      )
      .handle('addContribution', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          contributions.add(user.id, params.id, payload),
        ),
      )
      .handle('deleteContribution', ({ params }) =>
        Effect.flatMap(CurrentUser, (user) =>
          contributions.remove(user.id, params.id, params.contributionId),
        ),
      );
  }),
).pipe(Layer.provide([Goals.layer, GoalContributions.layer]));
