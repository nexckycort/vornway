import { Effect, Layer } from 'effect';
import { Email } from '#/infrastructure/email/email';
import { Push } from '#/infrastructure/push/push';
import type {
  PushNotificationPayload,
  PushSubscriptionInput,
} from '#/infrastructure/push/types';
import { Storage, StorageError } from '#/infrastructure/storage/storage';

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
    layer: Layer.succeed(
      Storage,
      Storage.of({
        uploadUserImage: ({ userId, dataUrl }) =>
          upload(`users/${userId}/avatar.webp`, dataUrl),
        uploadGroupImage: ({ groupId, dataUrl }) =>
          upload(`groups/${groupId}/cover.webp`, dataUrl),
        deleteUserImage: remove,
        deleteGroupImage: remove,
      }),
    ),
  };
};

export const makePush = () => {
  const subscriptions = new Map<string, PushSubscriptionInput>();
  const sent: {
    readonly userIds: readonly string[];
    readonly payload: PushNotificationPayload;
  }[] = [];

  return {
    subscriptions,
    sent,
    layer: Layer.succeed(
      Push,
      Push.of({
        storeSubscription: (input) =>
          Effect.sync(() => {
            subscriptions.set(input.endpoint, input);
            return {
              id: input.endpoint,
              endpoint: input.endpoint,
              revokedAt: null,
            };
          }),
        revokeSubscription: ({ endpoint }) =>
          Effect.sync(() => {
            subscriptions.delete(endpoint);
          }),
        sendToUsers: (userIds, payload) =>
          Effect.sync(() => {
            sent.push({ userIds, payload });
          }),
      }),
    ),
  };
};
