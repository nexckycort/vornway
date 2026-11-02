import {
  InviteGroupNotFound,
  InviteMemberAlreadyLinked,
  InviteMemberNotFound,
} from '@vornway/contracts/modules/invites/contract';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { getVersionedGroupImageUrl } from '#/infrastructure/storage/image-urls';

const make = Effect.gen(function* () {
  const database = yield* Database;
  const preview = Effect.fn('Invites.preview')(function* (
    userId: string,
    inviteCode: string,
  ) {
    const group = yield* database.use((db) =>
      db.group.findUnique({
        where: { inviteCode },
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          imageUrl: true,
          updatedAt: true,
          inviteCode: true,
          owner: { select: { name: true } },
          GroupMember: {
            select: { id: true, name: true, userId: true },
            orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
          },
        },
      }),
    );
    if (!group) return yield* new InviteGroupNotFound();
    return {
      group: {
        id: group.id,
        name: group.name,
        type: group.type,
        description: group.description,
        imageUrl: getVersionedGroupImageUrl(group.imageUrl, group.updatedAt),
        inviteCode: group.inviteCode,
        ownerName: group.owner?.name ?? null,
        memberCount: group.GroupMember.length,
      },
      unregisteredMembers: group.GroupMember.filter(
        (member) => member.userId === null,
      ).map((member) => ({ id: member.id, name: member.name })),
      alreadyMember: group.GroupMember.some(
        (member) => member.userId === userId,
      ),
    };
  });
  const accept = Effect.fn('Invites.accept')(function* (
    user: { id: string; name: string; email: string },
    inviteCode: string,
    memberId?: string,
  ) {
    const group = yield* database.use((db) =>
      db.group.findUnique({
        where: { inviteCode },
        select: { id: true, type: true },
      }),
    );
    if (!group) return yield* new InviteGroupNotFound();
    const existing = yield* database.use((db) =>
      db.groupMember.findFirst({
        where: { groupId: group.id, userId: user.id },
        select: { id: true },
      }),
    );
    if (existing)
      return {
        groupId: group.id,
        groupType: group.type,
        memberId: existing.id,
      };
    const name = user.name.trim();
    const fallbackName = name || user.email.split('@')[0]?.trim() || 'Usuario';
    if (memberId) {
      const member = yield* database.use((db) =>
        db.groupMember.findFirst({
          where: { id: memberId, groupId: group.id },
          select: { id: true, name: true, userId: true },
        }),
      );
      if (!member) return yield* new InviteMemberNotFound();
      if (member.userId) return yield* new InviteMemberAlreadyLinked();
      const finalName = member.name.trim() || fallbackName;
      yield* database.use((db) =>
        db.groupMember.update({
          where: { id: member.id },
          data: { userId: user.id },
        }),
      );
      if (!name || name.toLowerCase() === 'anonymous' || finalName !== name)
        yield* database.use((db) =>
          db.user.update({ where: { id: user.id }, data: { name: finalName } }),
        );
      return { groupId: group.id, groupType: group.type, memberId: member.id };
    }
    const member = yield* database.use((db) =>
      db.groupMember.create({
        data: {
          groupId: group.id,
          userId: user.id,
          name: fallbackName,
          role: 'member',
        },
        select: { id: true },
      }),
    );
    if (!name || name.toLowerCase() === 'anonymous')
      yield* database.use((db) =>
        db.user.update({
          where: { id: user.id },
          data: { name: fallbackName },
        }),
      );
    return { groupId: group.id, groupType: group.type, memberId: member.id };
  });
  return { preview, accept };
});
export class Invites extends Context.Service<
  Invites,
  Effect.Success<typeof make>
>()('vornway/invites/Invites') {
  static readonly layer = Layer.effect(Invites, make);
}
