export type ListGroupsInput = {
  userId: string;
  limit: number;
  cursor?: string;
  search?: string;
  filter?: 'all' | 'theyOweYou' | 'youOweThem' | 'noDebt';
};

export type ListGroupExpensesInput = {
  userId: string;
  groupId: string;
  limit: number;
  cursor?: string;
};

export type CreateGroupExpenseInput = {
  userId: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  paidById: string;
  participantIds: string[];
  splitMethod: 'equal' | 'percentage' | 'exact';
  exactShares?: Record<string, number>;
};

export type UpdateGroupExpenseInput = CreateGroupExpenseInput & {
  expenseId: string;
};

export type GetGroupExpenseInput = {
  userId: string;
  groupId: string;
  expenseId: string;
};

export type DeleteGroupExpenseInput = {
  userId: string;
  groupId: string;
  expenseId: string;
};

export type SettleGroupDebtInput = {
  userId: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
};

export type AddGroupMemberInput = {
  userId: string;
  groupId: string;
  name: string;
  linkedUserId?: string | null;
};

export type RemoveGroupMemberInput = {
  userId: string;
  groupId: string;
  memberId: string;
};

export type UnlinkGroupMemberInput = {
  userId: string;
  groupId: string;
  memberId: string;
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
  members: Array<{
    id: string;
    name: string;
    image: string | null;
  }>;
  currentUser: {
    memberId: string;
    name: string;
    image: string | null;
  } | null;
  hasExpenses: boolean;
  participantBalances: Array<{
    memberId: string;
    memberName: string;
    currency: string;
    amount: number;
    direction: 'theyOweYou' | 'youOweThem';
    label: string;
  }>;
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

export type GroupsService = {
  listGroups: (input: ListGroupsInput) => Promise<ListGroupsResult>;
  createGroup: (input: CreateGroupInput) => Promise<CreateGroupResult>;
  getGroupSummary: (input: {
    userId: string;
    groupId: string;
  }) => Promise<GroupSummaryResult>;
  listGroupExpenses: (
    input: ListGroupExpensesInput,
  ) => Promise<ListGroupExpensesResult>;
  getGroupReportsTotals: (
    input: GroupReportsTotalsInput,
  ) => Promise<GroupReportsTotalsResult>;
  getGroupExpense: (
    input: GetGroupExpenseInput,
  ) => Promise<GroupExpenseDetailResult>;
  createExpense: (input: CreateGroupExpenseInput) => Promise<{ id: string }>;
  updateExpense: (input: UpdateGroupExpenseInput) => Promise<{ id: string }>;
  deleteExpense: (input: DeleteGroupExpenseInput) => Promise<{ id: string }>;
  settleDebt: (input: SettleGroupDebtInput) => Promise<{ id: string }>;
  addMember: (
    input: AddGroupMemberInput,
  ) => Promise<{ id: string; name: string }>;
  removeMember: (
    input: RemoveGroupMemberInput,
  ) => Promise<{ id: string; name: string }>;
  unlinkMember: (
    input: UnlinkGroupMemberInput,
  ) => Promise<{ id: string; name: string }>;
  searchMembers: (input: {
    userId: string;
    groupId: string;
    query: string;
  }) => Promise<SearchGroupMembersResult>;
};

export type GroupSummaryMember = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  role: string;
  userId: string | null;
  isCurrentUser: boolean;
  expenseCount: number;
};

export type GroupSummaryResult = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  inviteCode: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  totals: Record<string, number>;
  participantCount: number;
  members: GroupSummaryMember[];
  memberBalances: Array<{
    memberId: string;
    name: string;
    isCurrentUser: boolean;
    balances: Record<string, number>;
  }>;
  directDebts: Array<{
    toMemberId: string;
    toName: string;
    currency: string;
    amount: number;
  }>;
  directCredits: Array<{
    fromMemberId: string;
    fromName: string;
    currency: string;
    amount: number;
  }>;
  settlementDebts: Array<{
    fromMemberId: string;
    fromName: string;
    toMemberId: string;
    toName: string;
    currency: string;
    amount: number;
  }>;
  myMembership: {
    id: string;
    name: string;
    role: string;
  } | null;
  isOwner: boolean;
};

export type GroupMemberSearchResult = {
  id: string;
  name: string;
  email: string;
  isCurrentUser: boolean;
  isAlreadyMember: boolean;
};

export type SearchGroupMembersResult = {
  data: GroupMemberSearchResult[];
};

export type GroupExpenseListItem = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  isDeleted: boolean;
  isSettlement: boolean;
  isPersonal: boolean;
  expenseType: 'standard' | 'composite';
  subExpenseCount: number;
  settlementToName: string | null;
  paidBy: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
  } | null;
  participantCount: number;
  currentUserBalance: number | null;
};

export type GroupReportsTotalsInput = {
  userId: string;
  groupId: string;
  range: 'all' | 7 | 15 | 30;
};

export type GroupReportsTotalsResult = {
  range: 'all' | 7 | 15 | 30;
  totalsByCurrency: Record<string, number>;
  expenseCountByCurrency: Record<string, number>;
  currentUserSpentByCurrency: Record<string, number>;
  categoriesByCurrency: Record<
    string,
    Array<{
      name: string;
      amount: number;
      fill: string;
    }>
  >;
};

export type GroupExpenseParticipant = {
  memberId: string;
  name: string;
  share: number;
};

export type GroupExpenseDetailResult = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  isDeleted: boolean;
  isSettlement: boolean;
  splitMethod: 'equal' | 'percentage' | 'exact';
  category: {
    id: string;
    name: string;
  } | null;
  paidBy: {
    id: string;
    name: string;
  };
  participants: GroupExpenseParticipant[];
};

export type ListGroupExpensesResult = {
  data: GroupExpenseListItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};
