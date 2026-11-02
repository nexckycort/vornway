import { Effect, Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup } from 'effect/http-api';
import { Page, TrimmedString } from '../../schema.ts';
import { AdminOnly } from '../auth/contract.ts';
import {
  FeedbackIdParams,
  FeedbackItem,
  FeedbackPageQuery,
} from '../feedback/contract.ts';

export const AdminStats = Schema.Struct({
  totalUsers: Schema.Int,
  totalGroups: Schema.Int,
});

export const AdminFeedbackItem = Schema.Struct({
  ...FeedbackItem.fields,
  user: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    email: Schema.String,
    image: Schema.NullOr(Schema.String),
  }),
});
export const AdminFeedbackPage = Page(AdminFeedbackItem);

const AdminFeedbackChanges = {
  status: Schema.optionalKey(
    Schema.Literals(['OPEN', 'IN_REVIEW', 'PLANNED', 'DONE', 'REJECTED']),
  ),
  priority: Schema.optionalKey(
    Schema.NullOr(TrimmedString.check(Schema.isMaxLength(80))),
  ),
};
export const UpdateAdminFeedbackPayload = Schema.Struct(
  AdminFeedbackChanges,
).check(
  Schema.makeFilter<{ readonly status?: unknown; readonly priority?: unknown }>(
    (changes) =>
      changes.status !== undefined ||
      changes.priority !== undefined ||
      'Debes enviar al menos un cambio',
  ),
);

export class AdminFeedbackNotFound extends Schema.TaggedError<AdminFeedbackNotFound>()(
  'AdminFeedbackNotFound',
  {
    error: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed('Reporte no encontrado')),
    ),
  },
  { httpApiStatus: 404 },
) {}

export class AdminApi extends HttpApiGroup.make('admin')
  .add(
    HttpApiEndpoint.get('stats', '/api/admin/stats', { success: AdminStats }),
  )
  .add(
    HttpApiEndpoint.get('feedback', '/api/admin/feedback', {
      query: FeedbackPageQuery,
      success: AdminFeedbackPage,
    }),
  )
  .add(
    HttpApiEndpoint.patch('updateFeedback', '/api/admin/feedback/:feedbackId', {
      params: FeedbackIdParams,
      payload: UpdateAdminFeedbackPayload,
      success: AdminFeedbackItem,
      error: AdminFeedbackNotFound,
    }),
  )
  .middleware(AdminOnly) {}
