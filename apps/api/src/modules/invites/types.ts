export type InvitePreviewMember = {
  id: string;
  name: string;
};

export type InvitePreviewResult = {
  group: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    imageUrl: string | null;
    inviteCode: string;
    ownerName: string | null;
    memberCount: number;
  };
  unregisteredMembers: InvitePreviewMember[];
  alreadyMember: boolean;
};

export type AcceptInviteInput = {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  inviteCode: string;
  memberId?: string;
};

export type AcceptInviteResult = {
  groupId: string;
  groupType: string;
  memberId: string;
};
