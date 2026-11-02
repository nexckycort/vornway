import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/http-api';
import { isUrl } from '../../url.ts';
import { SessionAuth } from '../auth/contract.ts';

const NonEmpty = Schema.String.check(Schema.isMinLength(1));

export const PushSubscriptionPayload = Schema.Struct({
  endpoint: Schema.String.check(isUrl),
  keys: Schema.Struct({ p256dh: NonEmpty, auth: NonEmpty }),
});
export const RevokePushSubscriptionPayload = Schema.Struct({
  endpoint: Schema.String.check(isUrl),
});
export const NativePushSubscriptionPayload = Schema.Struct({
  token: NonEmpty,
  platform: Schema.optionalKey(Schema.Literals(['ios', 'android'])),
});
export const RevokeNativePushSubscriptionPayload = Schema.Struct({
  token: NonEmpty,
});

export const StoredPushSubscription = Schema.Struct({
  id: Schema.String,
  endpoint: Schema.String,
  revokedAt: Schema.NullOr(Schema.Date),
});
export const PushSuccess = Schema.Struct({ success: Schema.Literal(true) });

export class PushApi extends HttpApiGroup.make('push')
  .add(
    HttpApiEndpoint.post('subscribe', '/api/push/subscriptions', {
      payload: PushSubscriptionPayload,
      success: StoredPushSubscription.pipe(HttpApiSchema.status(201)),
    }),
  )
  .add(
    HttpApiEndpoint.delete('unsubscribe', '/api/push/subscriptions', {
      payload: RevokePushSubscriptionPayload,
      success: PushSuccess,
    }),
  )
  .add(
    HttpApiEndpoint.post('test', '/api/push/test', {
      success: PushSuccess,
    }),
  )
  .add(
    HttpApiEndpoint.post('subscribeNative', '/api/push/native-subscriptions', {
      payload: NativePushSubscriptionPayload,
      success: StoredPushSubscription.pipe(HttpApiSchema.status(201)),
    }),
  )
  .add(
    HttpApiEndpoint.delete(
      'unsubscribeNative',
      '/api/push/native-subscriptions',
      {
        payload: RevokeNativePushSubscriptionPayload,
        success: PushSuccess,
      },
    ),
  )
  .middleware(SessionAuth) {}
