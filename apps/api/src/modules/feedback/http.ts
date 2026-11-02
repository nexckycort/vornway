import { Api } from '@vornway/contracts/api';
import { CurrentUser } from '@vornway/contracts/modules/auth/contract';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { Feedback } from './service';

export const FeedbackHandlers = HttpApiBuilder.group(
  Api,
  'feedback',
  (handlers) =>
    Effect.gen(function* () {
      const feedback = yield* Feedback;
      return handlers
        .handle('list', ({ query }) =>
          Effect.flatMap(CurrentUser, (user) => feedback.list(user.id, query)),
        )
        .handle('create', ({ payload }) =>
          Effect.flatMap(CurrentUser, (user) =>
            feedback.create(user.id, payload),
          ),
        )
        .handle('delete', ({ params }) =>
          Effect.flatMap(CurrentUser, (user) =>
            feedback.remove(user.id, params.feedbackId),
          ),
        );
    }),
).pipe(Layer.provide(Feedback.layer));
