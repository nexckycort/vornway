import { Effect, Layer } from 'effect';
import {
  HttpClient,
  HttpClientError,
  type HttpClientRequest,
  HttpClientResponse,
} from 'effect/http';
import { Email } from '#/infrastructure/email/email';
import { Push, PushError } from '#/infrastructure/push/push';
import type {
  PushNotificationPayload,
  PushSubscriptionInput,
} from '#/infrastructure/push/types';
import {
  Storage,
  StorageError,
  type StoredObject,
} from '#/infrastructure/storage/storage';

const DATA_URL = /^data:([^;]+);base64,(.+)$/;

export const makeEmailInbox = () => {
  const messages: { readonly to: string; readonly otp: string }[] = [];

  return {
    messages,
    otpFor: (to: string) => {
      const message = messages.findLast(
        (m) => m.to.toLowerCase() === to.toLowerCase(),
      );
      if (!message) throw new Error(`No OTP was sent to ${to}`);
      return message.otp;
    },
    layer: Layer.succeed(
      Email,
      Email.of({
        sendOtp: (to, otp) =>
          Effect.sync(() => {
            messages.push({ to, otp });
          }),
      }),
    ),
  };
};

export const makeStorage = () => {
  const uploads: { readonly key: string; readonly dataUrl: string }[] = [];
  const deleted: string[] = [];
  const objects = new Map<string, StoredObject>();

  const upload = (key: string, dataUrl: string) =>
    DATA_URL.test(dataUrl)
      ? Effect.sync(() => {
          uploads.push({ key, dataUrl });
          return `/${key}`;
        })
      : Effect.fail(new StorageError({ cause: 'invalid data url' }));
  const remove = (imageUrl: string | null | undefined) =>
    Effect.sync(() => {
      if (imageUrl) deleted.push(imageUrl);
    });

  return {
    uploads,
    deleted,
    objects,
    layer: Layer.succeed(
      Storage,
      Storage.of({
        uploadUserImage: ({ userId, dataUrl }) =>
          upload(`users/${userId}/avatar.webp`, dataUrl),
        uploadGroupImage: ({ groupId, dataUrl }) =>
          upload(`groups/${groupId}/cover.webp`, dataUrl),
        uploadExpenseAttachment: ({ groupId, expenseId, dataUrl }) =>
          upload(
            `groups/${groupId}/expenses/${expenseId}/attachment.webp`,
            dataUrl,
          ),
        uploadFeedbackImage: ({ userId, feedbackId, index, dataUrl }) =>
          upload(
            `feedback/${userId}/${feedbackId}/attachment-${index + 1}.webp`,
            dataUrl,
          ),
        deleteUserImage: remove,
        deleteGroupImage: remove,
        deleteExpenseAttachment: remove,
        deleteFeedbackImage: remove,
        getObject: (key) => Effect.succeed(objects.get(key) ?? null),
      }),
    ),
  };
};

export const makePush = () => {
  const subscriptions = new Map<string, PushSubscriptionInput>();
  const revoked: { readonly userId: string; readonly endpoint: string }[] = [];
  const sent: {
    readonly userIds: readonly string[];
    readonly payload: PushNotificationPayload;
  }[] = [];
  let unavailable = false;

  const unlessUnavailable = <A>(operation: () => A) =>
    unavailable
      ? Effect.fail(new PushError({ cause: 'unavailable' }))
      : Effect.sync(operation);

  return {
    subscriptions,
    revoked,
    sent,
    get unavailable() {
      return unavailable;
    },
    set unavailable(value: boolean) {
      unavailable = value;
    },
    layer: Layer.succeed(
      Push,
      Push.of({
        storeSubscription: (input) =>
          unlessUnavailable(() => {
            subscriptions.set(input.endpoint, input);
            return {
              id: input.endpoint,
              endpoint: input.endpoint,
              revokedAt: null,
            };
          }),
        revokeSubscription: ({ userId, endpoint }) =>
          unlessUnavailable(() => {
            revoked.push({ userId, endpoint });
            if (subscriptions.get(endpoint)?.userId === userId) {
              subscriptions.delete(endpoint);
            }
          }),
        sendToUsers: (userIds, payload) =>
          unlessUnavailable(() => {
            sent.push({ userIds, payload });
          }),
      }),
    ),
  };
};

export type OutboundHandler = (
  request: HttpClientRequest.HttpClientRequest,
) => Response | Promise<Response>;

const noNetwork: OutboundHandler = () =>
  new Response('no network in tests', { status: 503 });

export const makeHttp = (handler: OutboundHandler = noNetwork) => {
  const requests: HttpClientRequest.HttpClientRequest[] = [];

  return {
    requests,
    layer: Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) =>
        Effect.tryPromise({
          try: async () => {
            requests.push(request);
            return HttpClientResponse.fromWeb(request, await handler(request));
          },
          catch: (cause) =>
            new HttpClientError.HttpClientError({
              reason: new HttpClientError.TransportError({ request, cause }),
            }),
        }),
      ),
    ),
  };
};
