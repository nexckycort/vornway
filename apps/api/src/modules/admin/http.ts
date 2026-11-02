import { Api } from '@vornway/contracts/api';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { Admin } from './service';

export const AdminHandlers = HttpApiBuilder.group(Api, 'admin', (handlers) =>
  Effect.gen(function* () {
    const admin = yield* Admin;
    return handlers
      .handle('stats', () => admin.stats())
      .handle('feedback', ({ query }) => admin.listFeedback(query))
      .handle('updateFeedback', ({ params, payload }) =>
        admin.updateFeedback(params.feedbackId, payload),
      );
  }),
).pipe(Layer.provide(Admin.layer));
