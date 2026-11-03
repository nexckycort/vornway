import type { InternalError } from '@vornway/contracts/errors';
import {
  GroupAccessDenied,
  GroupMemberAlreadyUnlinked,
  GroupMemberHasExpenses,
  GroupMemberNotFound,
  GroupMemberRemoveForbidden,
  GroupMemberUnlinkForbidden,
  GroupOwnerRemoveForbidden,
  GroupOwnerUnlinkForbidden,
} from '@vornway/contracts/modules/groups/errors';
import type {
  AddMemberPayload,
  GroupMemberRef,
  MemberSearchResults,
} from '@vornway/contracts/modules/groups/schemas';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import {
  accessibleGroup,
  activeExpenses,
  membershipOf,
  required,
} from './helpers';
import { makeGroupNotifier, memberAddedPushPayload } from './notifications';

const SEARCH_LIMIT = 8;

export class GroupMembers extends Context.Service<
  GroupMembers,
  {
    search(
      userId: string,
      groupId: string,
      query: string,
    ): Effect.Effect<
      typeof MemberSearchResults.Type,
      GroupAccessDenied | InternalError
    >;
    add(
      userId: string,
      groupId: string,
      payload: typeof AddMemberPayload.Type,
    ): Effect.Effect<
      typeof GroupMemberRef.Type,
      GroupAccessDenied | InternalError
    >;
    unlink(
      userId: string,
      groupId: string,
      memberId: string,
    ): Effect.Effect<
      typeof GroupMemberRef.Type,
      | GroupAccessDenied
      | GroupMemberNotFound
      | GroupMemberUnlinkForbidden
      | GroupMemberAlreadyUnlinked
      | GroupOwnerUnlinkForbidden
      | InternalError
    >;
    remove(
      userId: string,
      groupId: string,
      memberId: string,
    ): Effect.Effect<
      typeof GroupMemberRef.Type,
      | GroupAccessDenied
      | GroupMemberRemoveForbidden
      | GroupMemberNotFound
      | GroupOwnerRemoveForbidden
      | GroupMemberHasExpenses
      | InternalError
    >;
  }
>()('@vornway/api/modules/groups/members/GroupMembers') {
  static readonly layer = Layer.effect(
    GroupMembers,
    Effect.gen(function* () {
      const database = yield* Database;
      const notify = yield* makeGroupNotifier;

      const requireMembership = (userId: string, groupId: string) =>
        database
          .use((db) =>
            db.groupMember.findFirst({
              where: membershipOf(userId, groupId),
              select: { id: true, name: true },
            }),
          )
          .pipe(required(() => new GroupAccessDenied()));

      const requireVisibleGroup = (userId: string, groupId: string) =>
        database
          .use((db) =>
            db.group.findFirst({
              where: {
                ...accessibleGroup(userId, groupId),
                type: { not: 'meta' },
              },
              select: { id: true, ownerId: true },
            }),
          )
          .pipe(required(() => new GroupAccessDenied()));

      const findTarget = (groupId: string, memberId: string) =>
        database
          .use((db) =>
            db.groupMember.findFirst({
              where: { id: memberId, groupId },
              select: { id: true, name: true, userId: true, role: true },
            }),
          )
          .pipe(required(() => new GroupMemberNotFound()));

      const usageCount = (groupId: string, memberId: string) =>
        database.use((db) =>
          db.expense.count({
            where: {
              ...activeExpenses(groupId),
              OR: [
                { paidById: memberId },
                { payers: { some: { memberId } } },
                { participants: { some: { memberId } } },
              ],
            },
          }),
        );

      const notifyAdded = Effect.fn('GroupMembers.notifyAdded')(function* (
        groupId: string,
        linkedUserId: string,
        name: string,
      ) {
        const [group, recipient] = yield* Effect.all(
          [
            database.use((db) =>
              db.group.findUnique({
                where: { id: groupId },
                select: { name: true },
              }),
            ),
            database.use((db) =>
              db.user.findUnique({
                where: { id: linkedUserId },
                select: { id: true },
              }),
            ),
          ],
          { concurrency: 2 },
        );
        if (!group || !recipient) return;
        yield* notify({
          userIds: [linkedUserId],
          type: 'group.member.added',
          payload: memberAddedPushPayload({
            groupId,
            groupName: group.name,
            addedByName: name,
          }),
          actorName: name,
        });
      });

      const search = Effect.fn('GroupMembers.search')(function* (
        userId: string,
        groupId: string,
        query: string,
      ) {
        yield* requireMembership(userId, groupId);
        const users = yield* database.use((db) =>
          db.user.findMany({
            where: {
              OR: [
                { username: { contains: query, mode: 'insensitive' } },
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            },
            select: { id: true, name: true, username: true, email: true },
            orderBy: [{ username: 'asc' }, { name: 'asc' }, { email: 'asc' }],
            take: SEARCH_LIMIT,
          }),
        );
        const members = yield* database.use((db) =>
          db.groupMember.findMany({
            where: { groupId, userId: { in: users.map((user) => user.id) } },
            select: { userId: true },
          }),
        );
        const memberUserIds = new Set(members.map((member) => member.userId));
        return {
          data: users.map((user) => ({
            ...user,
            isCurrentUser: user.id === userId,
            isAlreadyMember: memberUserIds.has(user.id),
          })),
        };
      });

      const add = Effect.fn('GroupMembers.add')(function* (
        userId: string,
        groupId: string,
        payload: typeof AddMemberPayload.Type,
      ) {
        yield* requireMembership(userId, groupId);
        const linkedUserId = payload.linkedUserId;
        if (linkedUserId) {
          const existing = yield* database.use((db) =>
            db.groupMember.findFirst({
              where: { groupId, userId: linkedUserId },
              select: { id: true, name: true },
            }),
          );
          if (existing) return existing;
        }

        const member = yield* database.use((db) =>
          db.groupMember.create({
            data: {
              groupId,
              name: payload.name,
              ...(linkedUserId ? { userId: linkedUserId } : {}),
              role: 'member',
            },
            select: { id: true, name: true },
          }),
        );
        if (linkedUserId) {
          yield* Effect.forkDetach(
            notifyAdded(groupId, linkedUserId, payload.name).pipe(
              Effect.ignore({ log: true }),
            ),
          );
        }
        return member;
      });

      const remove = Effect.fn('GroupMembers.remove')(function* (
        userId: string,
        groupId: string,
        memberId: string,
      ) {
        const membership = yield* requireMembership(userId, groupId);
        const group = yield* requireVisibleGroup(userId, groupId);
        if (group.ownerId !== userId) {
          return yield* new GroupMemberRemoveForbidden();
        }
        const target = yield* findTarget(groupId, memberId);
        if (target.userId === group.ownerId || target.role === 'admin') {
          return yield* new GroupOwnerRemoveForbidden();
        }
        if ((yield* usageCount(groupId, target.id)) > 0) {
          return yield* new GroupMemberHasExpenses();
        }

        yield* database.transaction(async (tx) => {
          await tx.groupMember.delete({ where: { id: target.id } });
          await tx.activityLog.create({
            data: {
              groupId,
              actorUserId: userId,
              actorName: membership.name,
              action: 'group.member_removed',
              targetName: target.name,
              details: { memberId: target.id },
            },
          });
        });
        return { id: target.id, name: target.name };
      });

      const unlink = Effect.fn('GroupMembers.unlink')(function* (
        userId: string,
        groupId: string,
        memberId: string,
      ) {
        const membership = yield* requireMembership(userId, groupId);
        const group = yield* requireVisibleGroup(userId, groupId);
        const target = yield* findTarget(groupId, memberId);
        const isSelfUnlink = target.userId === userId;
        if (!isSelfUnlink && group.ownerId !== userId) {
          return yield* new GroupMemberUnlinkForbidden();
        }
        if (!target.userId) return yield* new GroupMemberAlreadyUnlinked();
        if (target.userId === group.ownerId && !isSelfUnlink) {
          return yield* new GroupOwnerUnlinkForbidden();
        }
        const shouldDelete =
          isSelfUnlink && (yield* usageCount(groupId, target.id)) === 0;

        yield* database.transaction(async (tx) => {
          if (shouldDelete) {
            await tx.groupMember.delete({ where: { id: target.id } });
          } else {
            await tx.groupMember.update({
              where: { id: target.id },
              data: { userId: null },
            });
          }
          await tx.activityLog.create({
            data: {
              groupId,
              actorUserId: userId,
              actorName: membership.name,
              action: 'group.member_unlinked',
              targetName: target.name,
              details: { memberId: target.id },
            },
          });
        });
        return { id: target.id, name: target.name };
      });

      return GroupMembers.of({ search, add, unlink, remove });
    }),
  );
}
