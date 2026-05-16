export type ListGroupsInput = {
  userId: string;
  limit: number;
  cursor?: string;
};

export type ListGroupExpensesInput = {
  userId: string;
  groupId: string;
  limit: number;
  cursor?: string;
};

export type CreateGroupInput = {
  userId: string;
  ownerName: string;
  name: string;
  type: string;
  description?: string;
  participants?: Array<{
    name: string;
    userId?: string;
  }>;
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

export type GroupSummaryMember = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  userId: string | null;
  isCurrentUser: boolean;
};

export type GroupSummaryResult = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  inviteCode: string;
  createdAt: Date;
  updatedAt: Date;
  totals: Record<string, number>;
  participantCount: number;
  members: GroupSummaryMember[];
  myMembership: {
    id: string;
    name: string;
    role: string;
  } | null;
};

export type GroupExpenseListItem = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  expenseType: 'STANDARD' | 'COMPOSITE' | 'SETTLEMENT';
  status: 'ACTIVE' | 'DELETED';
  paidBy: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
  } | null;
  participantCount: number;
};

export type ListGroupExpensesResult = {
  data: GroupExpenseListItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};
