import { Effect, Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/http-api';
import { SessionAuth } from '../auth/contract.ts';

export class InviteGroupNotFound extends Schema.TaggedError<InviteGroupNotFound>()(
  'InviteGroupNotFound',
  {
    error: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed('Grupo no encontrado')),
    ),
  },
  { httpApiStatus: 404 },
) {}
export class InviteMemberNotFound extends Schema.TaggedError<InviteMemberNotFound>()(
  'InviteMemberNotFound',
  {
    error: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed('Miembro no encontrado')),
    ),
  },
  { httpApiStatus: 400 },
) {}
export class InviteMemberAlreadyLinked extends Schema.TaggedError<InviteMemberAlreadyLinked>()(
  'InviteMemberAlreadyLinked',
  {
    error: Schema.String.pipe(
      Schema.withConstructorDefault(
        Effect.succeed('Ese participante ya tiene una cuenta asociada'),
      ),
    ),
  },
  { httpApiStatus: 400 },
) {}
const Params = Schema.Struct({
  inviteCode: Schema.String.check(Schema.isMinLength(1)),
});
export const InvitePreview = Schema.Struct({
  group: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    type: Schema.String,
    description: Schema.NullOr(Schema.String),
    imageUrl: Schema.NullOr(Schema.String),
    inviteCode: Schema.String,
    ownerName: Schema.NullOr(Schema.String),
    memberCount: Schema.Number,
  }),
  unregisteredMembers: Schema.Array(
    Schema.Struct({ id: Schema.String, name: Schema.String }),
  ),
  alreadyMember: Schema.Boolean,
});
export const InviteAccepted = Schema.Struct({
  groupId: Schema.String,
  groupType: Schema.String,
  memberId: Schema.String,
});
export class InvitesApi extends HttpApiGroup.make('invites')
  .add(
    HttpApiEndpoint.get('preview', '/api/invites/:inviteCode', {
      params: Params,
      success: InvitePreview,
      error: InviteGroupNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.post('accept', '/api/invites/:inviteCode/accept', {
      params: Params,
      payload: Schema.Struct({
        memberId: Schema.optionalKey(
          Schema.String.check(Schema.isMinLength(1)),
        ),
      }),
      success: InviteAccepted.pipe(HttpApiSchema.status(201)),
      error: [
        InviteGroupNotFound,
        InviteMemberNotFound,
        InviteMemberAlreadyLinked,
      ],
    }),
  )
  .middleware(SessionAuth) {}
