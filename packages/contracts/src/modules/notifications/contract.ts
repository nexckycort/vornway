import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup } from 'effect/http-api';
import { Cursor, Page } from '../../schema.ts';
import { SessionAuth } from '../auth/contract.ts';

export const NotificationItem = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  title: Schema.String,
  body: Schema.String,
  url: Schema.String,
  groupId: Schema.NullOr(Schema.String),
  expenseId: Schema.NullOr(Schema.String),
  actorName: Schema.NullOr(Schema.String),
  actorImage: Schema.NullOr(Schema.String),
  readAt: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
});

export const NotificationsPage = Schema.Struct({
  ...Page(NotificationItem).fields,
  unreadCount: Schema.Int,
});

export const NotificationsQuery = Schema.Struct({
  cursor: Schema.optionalKey(Cursor.check(Schema.isMinLength(1))),
  limit: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 50 })),
  ),
});

export class NotificationsApi extends HttpApiGroup.make('notifications')
  .add(
    HttpApiEndpoint.get('list', '/api/notifications', {
      query: NotificationsQuery,
      success: NotificationsPage,
    }),
  )
  .add(
    HttpApiEndpoint.post('readAll', '/api/notifications/read-all', {
      success: Schema.Struct({ success: Schema.Literal(true) }),
    }),
  )
  .middleware(SessionAuth) {}
