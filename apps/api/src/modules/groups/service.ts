import type { InternalError } from '@vornway/contracts/errors';
import type { SessionUser } from '@vornway/contracts/modules/auth/contract';
import {
  GroupAccessDenied,
  GroupMemberNotFound,
  GroupNotFound,
  GroupOwnerTransferForbidden,
  GroupOwnerTransferTargetRequired,
  GroupOwnerTransferTargetSame,
} from '@vornway/contracts/modules/groups/errors';
import type {
  CreatedGroup,
  CreateGroupPayload,
  DeletedGroup,
  GroupImage,
  GroupListPage,
  GroupSummary,
  ImageUpload,
  TransferredOwner,
  UpdatedGroup,
  UpdatedGroupSettings,
  UpdateGroupPayload,
  UpdateGroupSettingsPayload,
} from '@vornway/contracts/modules/groups/schemas';
import { Context, Crypto, DateTime, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { makeInternalFailure } from '#/infrastructure/http/errors';
import { getVersionedGroupImageUrl } from '#/infrastructure/storage/image-urls';
import { Storage } from '#/infrastructure/storage/storage';
import { buildGroupCsv, groupExportSelect } from './csv';
import { type ListQuery, makeGroupLister } from './group-list';
import {
  activeExpenses,
  membershipOf,
  required,
  visibleGroup,
} from './helpers';
import { groupSummarySelect, toGroupSummary } from './summary-view';

const INVITE_CODE_ATTEMPTS = 5;

export class Groups extends Context.Service<
  Groups,
  {
    create(
      user: typeof SessionUser.Type,
      payload: typeof CreateGroupPayload.Type,
    ): Effect.Effect<typeof CreatedGroup.Type, InternalError>;
    list(
      userId: string,
      query: ListQuery,
    ): Effect.Effect<typeof GroupListPage.Type, InternalError>;
    get(
      userId: string,
      groupId: string,
    ): Effect.Effect<typeof GroupSummary.Type, GroupNotFound | InternalError>;
    exportCsv(
      userId: string,
      groupId: string,
    ): Effect.Effect<
      { content: string; fileName: string },
      GroupNotFound | InternalError
    >;
    remove(
      userId: string,
      groupId: string,
    ): Effect.Effect<typeof DeletedGroup.Type, GroupNotFound | InternalError>;
    update(
      userId: string,
      groupId: string,
      payload: typeof UpdateGroupPayload.Type,
    ): Effect.Effect<typeof UpdatedGroup.Type, GroupNotFound | InternalError>;
    updateSettings(
      userId: string,
      groupId: string,
      payload: typeof UpdateGroupSettingsPayload.Type,
    ): Effect.Effect<
      typeof UpdatedGroupSettings.Type,
      GroupNotFound | InternalError
    >;
    updateImage(
      userId: string,
      groupId: string,
      image: typeof ImageUpload.Type,
    ): Effect.Effect<typeof GroupImage.Type, GroupNotFound | InternalError>;
    transferOwner(
      userId: string,
      groupId: string,
      memberId: string,
    ): Effect.Effect<
      typeof TransferredOwner.Type,
      | GroupAccessDenied
      | GroupOwnerTransferForbidden
      | GroupMemberNotFound
      | GroupOwnerTransferTargetRequired
      | GroupOwnerTransferTargetSame
      | InternalError
    >;
  }
>()('@vornway/api/modules/groups/service/Groups') {
  static readonly layer = Layer.effect(
    Groups,
    Effect.gen(function* () {
      const database = yield* Database;
      const storage = yield* Storage;
      const failInternal = yield* makeInternalFailure;
      const list = yield* makeGroupLister;
      const crypto = yield* Crypto.Crypto;
      const randomUUID = crypto
        .randomUUIDv4()
        .pipe(Effect.catchTag('PlatformError', failInternal));

      const generateInviteCode = Effect.fn('Groups.generateInviteCode')(
        function* () {
          for (let attempt = 0; attempt < INVITE_CODE_ATTEMPTS; attempt += 1) {
            const inviteCode = (yield* randomUUID).slice(0, 8);
            const exists = yield* database.use((db) =>
              db.group.findUnique({
                where: { inviteCode },
                select: { id: true },
              }),
            );
            if (!exists) return inviteCode;
          }
          return yield* failInternal(
            new Error('No se pudo generar un código de invitación único'),
          );
        },
      );

      const uploadImage = (groupId: string, dataUrl: string) =>
        storage
          .uploadGroupImage({ groupId, dataUrl })
          .pipe(Effect.catchTag('StorageError', failInternal));
      const deleteImage = (imageUrl: string) =>
        storage.deleteGroupImage(imageUrl).pipe(Effect.ignore({ log: true }));

      const create = Effect.fn('Groups.create')(function* (
        user: typeof SessionUser.Type,
        payload: typeof CreateGroupPayload.Type,
      ) {
        const now = yield* DateTime.nowAsDate;
        const ownerName = user.name?.trim() || user.email || 'Usuario';
        const inviteCode = yield* generateInviteCode();
        const groupId = payload.id?.trim() || (yield* randomUUID);
        const name = payload.name.trim();
        const type = payload.type.trim();
        const description = payload.description?.trim() || null;
        const imageUrl = payload.image
          ? yield* storage
              .uploadGroupImage({ groupId, dataUrl: payload.image.dataUrl })
              .pipe(
                Effect.catchTag('StorageError', (error) =>
                  Effect.logWarning('Group image upload failed', error).pipe(
                    Effect.as(null),
                  ),
                ),
              )
          : null;

        const participants = (payload.participants ?? [])
          .map((participant) => ({
            name: participant.name.trim(),
            userId: participant.userId?.trim() || null,
          }))
          .filter(
            (participant) =>
              participant.name.length > 0 && participant.userId !== user.id,
          )
          .filter(
            (participant, index, all) =>
              all.findIndex(
                (other) =>
                  (other.userId && other.userId === participant.userId) ||
                  (!other.userId &&
                    other.name.toLocaleLowerCase('es-CO') ===
                      participant.name.toLocaleLowerCase('es-CO')),
              ) === index,
          );

        yield* database.transaction(async (tx) => {
          await tx.group.create({
            data: {
              id: groupId,
              name,
              type,
              description,
              imageUrl,
              createdAt: now,
              updatedAt: now,
              ownerId: user.id,
              inviteCode,
            },
          });
          await tx.groupMember.create({
            data: {
              groupId,
              userId: user.id,
              name: ownerName,
              role: 'admin',
              joinedAt: now,
            },
          });
          if (participants.length > 0) {
            await tx.groupMember.createMany({
              data: participants.map((participant) => ({
                groupId,
                userId: participant.userId,
                name: participant.name,
                role: 'member',
                joinedAt: now,
              })),
            });
          }
          await tx.activityLog.create({
            data: {
              groupId,
              actorUserId: user.id,
              actorName: ownerName,
              action: 'group.created',
              targetName: name,
              details: {
                type,
                participantsCount: (payload.participants ?? []).length,
              },
              createdAt: now,
            },
          });
        });

        return {
          id: groupId,
          name,
          type,
          description,
          imageUrl: getVersionedGroupImageUrl(imageUrl, now),
          inviteCode,
          createdAt: now.toISOString(),
        };
      });

      const get = Effect.fn('Groups.get')(function* (
        userId: string,
        groupId: string,
      ) {
        const group = yield* database
          .use((db) =>
            db.group.findFirst({
              where: visibleGroup(userId, groupId),
              select: groupSummarySelect,
            }),
          )
          .pipe(required(() => new GroupNotFound()));
        const categoryRows = yield* database.use((db) =>
          db.expense.groupBy({
            where: { ...activeExpenses(groupId), categoryId: { not: null } },
            by: ['categoryId'],
            _count: { _all: true },
          }),
        );
        return toGroupSummary(
          group,
          new Map(
            categoryRows.flatMap((row) =>
              row.categoryId
                ? [[row.categoryId, row._count._all] as const]
                : [],
            ),
          ),
          userId,
        );
      });

      const exportCsv = Effect.fn('Groups.exportCsv')(function* (
        userId: string,
        groupId: string,
      ) {
        const group = yield* database
          .use((db) =>
            db.group.findFirst({
              where: visibleGroup(userId, groupId),
              select: groupExportSelect,
            }),
          )
          .pipe(required(() => new GroupNotFound()));
        return buildGroupCsv(group);
      });

      const remove = Effect.fn('Groups.remove')(function* (
        userId: string,
        groupId: string,
      ) {
        const group = yield* database
          .use((db) =>
            db.group.findFirst({
              where: { id: groupId, ownerId: userId },
              select: { id: true, imageUrl: true },
            }),
          )
          .pipe(required(() => new GroupNotFound()));

        yield* database.transaction(async (tx) => {
          await tx.expenseParticipant.deleteMany({
            where: { expense: { groupId } },
          });
          await tx.expense.deleteMany({ where: { groupId } });
          await tx.goal.deleteMany({ where: { groupId } });
          await tx.expenseCategory.deleteMany({ where: { groupId } });
          await tx.groupMember.deleteMany({ where: { groupId } });
          await tx.group.delete({ where: { id: groupId } });
        });
        if (group.imageUrl) yield* deleteImage(group.imageUrl);
        return { id: group.id };
      });

      const update = Effect.fn('Groups.update')(function* (
        userId: string,
        groupId: string,
        payload: typeof UpdateGroupPayload.Type,
      ) {
        const group = yield* database
          .use((db) =>
            db.group.findFirst({
              where: visibleGroup(userId, groupId),
              select: { id: true, imageUrl: true },
            }),
          )
          .pipe(required(() => new GroupNotFound()));
        const name = payload.name.trim();
        const type = payload.type.trim();
        const description = payload.description?.trim() || null;
        const updatedAt = yield* DateTime.nowAsDate;
        const imageUrl = payload.image
          ? yield* uploadImage(groupId, payload.image.dataUrl)
          : group.imageUrl;

        yield* database.use((db) =>
          db.group.update({
            where: { id: groupId },
            data: { name, type, description, imageUrl, updatedAt },
          }),
        );
        if (payload.image && group.imageUrl && group.imageUrl !== imageUrl) {
          yield* deleteImage(group.imageUrl);
        }
        return {
          id: groupId,
          name,
          type,
          description,
          imageUrl: getVersionedGroupImageUrl(imageUrl, updatedAt),
          updatedAt: updatedAt.toISOString(),
        };
      });

      const updateSettings = Effect.fn('Groups.updateSettings')(function* (
        userId: string,
        groupId: string,
        payload: typeof UpdateGroupSettingsPayload.Type,
      ) {
        yield* database
          .use((db) =>
            db.group.findFirst({
              where: visibleGroup(userId, groupId),
              select: { id: true },
            }),
          )
          .pipe(required(() => new GroupNotFound()));
        const updatedAt = yield* DateTime.nowAsDate;
        const updated = yield* database.use((db) =>
          db.group.update({
            where: { id: groupId },
            data: {
              ...(payload.advancedExpenseDetailsEnabled === undefined
                ? {}
                : {
                    advancedExpenseDetailsEnabled:
                      payload.advancedExpenseDetailsEnabled,
                  }),
              updatedAt,
            },
            select: {
              id: true,
              advancedExpenseDetailsEnabled: true,
              updatedAt: true,
            },
          }),
        );
        return { ...updated, updatedAt: updated.updatedAt.toISOString() };
      });

      const updateImage = Effect.fn('Groups.updateImage')(function* (
        userId: string,
        groupId: string,
        image: typeof ImageUpload.Type,
      ) {
        const group = yield* database
          .use((db) =>
            db.group.findFirst({
              where: visibleGroup(userId, groupId),
              select: { id: true, imageUrl: true },
            }),
          )
          .pipe(required(() => new GroupNotFound()));
        const imageUrl = yield* uploadImage(groupId, image.dataUrl);
        const updatedAt = yield* DateTime.nowAsDate;
        yield* database.use((db) =>
          db.group.update({
            where: { id: groupId },
            data: { imageUrl, updatedAt },
          }),
        );
        if (group.imageUrl && group.imageUrl !== imageUrl) {
          yield* deleteImage(group.imageUrl);
        }
        return { imageUrl: getVersionedGroupImageUrl(imageUrl, updatedAt) };
      });

      const transferOwner = Effect.fn('Groups.transferOwner')(function* (
        userId: string,
        groupId: string,
        memberId: string,
      ) {
        const currentMembership = yield* database
          .use((db) =>
            db.groupMember.findFirst({
              where: membershipOf(userId, groupId),
              select: { id: true, name: true },
            }),
          )
          .pipe(required(() => new GroupAccessDenied()));
        const group = yield* database
          .use((db) =>
            db.group.findFirst({
              where: { id: groupId, type: { not: 'meta' } },
              select: { id: true, ownerId: true },
            }),
          )
          .pipe(required(() => new GroupAccessDenied()));
        if (group.ownerId !== userId) {
          return yield* new GroupOwnerTransferForbidden();
        }
        const target = yield* database
          .use((db) =>
            db.groupMember.findFirst({
              where: { id: memberId, groupId },
              select: { id: true, name: true, userId: true },
            }),
          )
          .pipe(required(() => new GroupMemberNotFound()));
        if (!target.userId) {
          return yield* new GroupOwnerTransferTargetRequired();
        }
        const newOwnerId = target.userId;
        if (newOwnerId === group.ownerId) {
          return yield* new GroupOwnerTransferTargetSame();
        }

        const updatedAt = yield* DateTime.nowAsDate;
        yield* database.transaction(async (tx) => {
          await tx.group.update({
            where: { id: group.id },
            data: { ownerId: newOwnerId, updatedAt },
          });
          await tx.groupMember.updateMany({
            where: { groupId, userId },
            data: { role: 'member' },
          });
          await tx.groupMember.update({
            where: { id: target.id },
            data: { role: 'admin' },
          });
          await tx.activityLog.create({
            data: {
              groupId,
              actorUserId: userId,
              actorName: currentMembership.name,
              action: 'group.owner_transferred',
              targetName: target.name,
              details: {
                previousOwnerId: userId,
                newOwnerId,
                newOwnerMemberId: target.id,
              },
              createdAt: updatedAt,
            },
          });
        });
        return {
          id: group.id,
          ownerId: newOwnerId,
          ownerMemberId: target.id,
          ownerName: target.name,
          updatedAt: updatedAt.toISOString(),
        };
      });

      return Groups.of({
        create,
        list,
        get,
        exportCsv,
        remove,
        update,
        updateSettings,
        updateImage,
        transferOwner,
      });
    }),
  );
}
