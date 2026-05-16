export type ListGroupsInput = {
  userId: string;
  limit: number;
  cursor?: string;
};

export type CreateGroupInput = {
  userId: string;
  ownerName: string;
  name: string;
  type: string;
  description?: string;
};

export type CreateGroupResult = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  inviteCode: string;
  createdAt: Date;
};

export type GroupListItem = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  inviteCode: string;
  createdAt: Date;
  updatedAt: Date;
  participantCount: number;
  totals: Record<string, number>;
  myMembership: {
    id: string;
    name: string;
    role: string;
  } | null;
};

export type ListGroupsResult = {
  data: GroupListItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};
