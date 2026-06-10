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
  id?: string;
  description: string;
  amount: number;
  currency: string;
  categoryId?: string | null;
  paidById?: string;
  paidByIds?: string[];
  participantIds: string[];
  splitMethod: 'equal' | 'percentage' | 'exact';
  exactShares?: Record<string, number>;
  sharedSplit?: GroupExpenseSharedSplit | null;
  attachmentImage?: {
    dataUrl: string;
    fileName?: string;
  };
  advancedDetails?: GroupExpenseAdvancedDetails | null;
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
  id?: string;
  userId: string;
  ownerName: string;
  name: string;
  type: string;
  description?: string;
  image?: {
    dataUrl: string;
    fileName?: string;
  };
  participants?: Array<{
    name: string;
    userId?: string;
  }>;
};

export type UpdateGroupInput = {
  userId: string;
  groupId: string;
  name: string;
  type: string;
  description?: string;
  image?: {
    dataUrl: string;
    fileName?: string;
  };
};

export type UpdateGroupImageInput = {
  userId: string;
  groupId: string;
  image: {
    dataUrl: string;
    fileName?: string;
  };
};

export type CreateGroupResult = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  imageUrl: string | null;
  inviteCode: string;
  createdAt: Date;
};

export type UpdateGroupResult = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  imageUrl: string | null;
  updatedAt: Date;
};

export type UpdateGroupSettingsInput = {
  userId: string;
  groupId: string;
  advancedExpenseDetailsEnabled?: boolean;
};

export type UpdateGroupSettingsResult = {
  id: string;
  advancedExpenseDetailsEnabled: boolean;
  updatedAt: Date;
};

export type CreateGroupCategoryInput = {
  userId: string;
  groupId: string;
  name: string;
  icon?: string;
  color?: string;
};

export type CreateGroupCategoryResult = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

export type UpdateGroupCategoryInput = {
  userId: string;
  groupId: string;
  categoryId: string;
  name?: string;
  icon?: string | null;
  color?: string | null;
};

export type UpdateGroupCategoryResult = CreateGroupCategoryResult;

export type DeleteGroupCategoryInput = {
  userId: string;
  groupId: string;
  categoryId: string;
};

export type DeleteGroupCategoryResult = {
  id: string;
};

export type MoveGroupCategoryExpensesInput = {
  userId: string;
  groupId: string;
  categoryId: string;
  targetCategoryId?: string | null;
};

export type MoveGroupCategoryExpensesResult = {
  categoryId: string;
  targetCategoryId: string | null;
  movedExpenseCount: number;
};

export type GroupDeleteResult = {
  id: string;
};

export type GroupListItem = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  imageUrl: string | null;
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
  updateGroup: (input: UpdateGroupInput) => Promise<UpdateGroupResult>;
  updateGroupSettings: (
    input: UpdateGroupSettingsInput,
  ) => Promise<UpdateGroupSettingsResult>;
  createCategory: (
    input: CreateGroupCategoryInput,
  ) => Promise<CreateGroupCategoryResult>;
  updateCategory: (
    input: UpdateGroupCategoryInput,
  ) => Promise<UpdateGroupCategoryResult>;
  deleteCategory: (
    input: DeleteGroupCategoryInput,
  ) => Promise<DeleteGroupCategoryResult>;
  moveCategoryExpenses: (
    input: MoveGroupCategoryExpensesInput,
  ) => Promise<MoveGroupCategoryExpensesResult>;
  updateGroupImage: (
    input: UpdateGroupImageInput,
  ) => Promise<{ imageUrl: string | null }>;
  deleteGroup: (input: {
    userId: string;
    groupId: string;
  }) => Promise<GroupDeleteResult>;
  getGroupSummary: (input: {
    userId: string;
    groupId: string;
  }) => Promise<GroupSummaryResult>;
  listGroupExpenses: (
    input: ListGroupExpensesInput,
  ) => Promise<ListGroupExpensesResult>;
  listGroupMemberExpenses: (
    input: ListGroupMemberExpensesInput,
  ) => Promise<ListGroupMemberExpensesResult>;
  getGroupReportsTotals: (
    input: GroupReportsTotalsInput,
  ) => Promise<GroupReportsTotalsResult>;
  getGroupReportsBalances: (
    input: GroupReportsBalancesInput,
  ) => Promise<GroupReportsBalancesResult>;
  getGroupReportsShares: (
    input: GroupReportsSharesInput,
  ) => Promise<GroupReportsSharesResult>;
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
  imageUrl: string | null;
  inviteCode: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  advancedExpenseDetailsEnabled: boolean;
  totals: Record<string, number>;
  participantCount: number;
  categories: Array<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    expenseCount: number;
  }>;
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

export type GroupExpenseAdvancedDetails = {
  type: 'stay' | 'food' | 'transport' | 'activity' | 'purchase' | 'other';
  placeName?: string;
  address?: string;
  mapUrl?: string;
  mapEmbedUrl?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  bookingCode?: string;
  reservationTime?: string;
  websiteUrl?: string;
  notes?: string;
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
  paidByMembers: Array<{
    memberId: string;
    name: string;
    amount: number;
  }>;
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  participantCount: number;
  currentUserBalance: number | null;
  attachmentUrl: string | null;
};

export type GroupReportsTotalsInput = {
  userId: string;
  groupId: string;
  range: 'all' | 7 | 15 | 30;
};

export type GroupReportsBalancesInput = GroupReportsTotalsInput;
export type GroupReportsSharesInput = GroupReportsTotalsInput;

export type GroupReportsTotalsResult = {
  range: 'all' | 7 | 15 | 30;
  totalsByCurrency: Record<string, number>;
  expenseCountByCurrency: Record<string, number>;
  currentUserSpentByCurrency: Record<string, number>;
  categoriesByCurrency: Record<
    string,
    Array<{
      name: string;
      icon: string | null;
      amount: number;
      fill: string;
    }>
  >;
};

export type GroupReportsBalancesResult = {
  range: 'all' | 7 | 15 | 30;
  memberBalances: Array<{
    memberId: string;
    name: string;
    isCurrentUser: boolean;
    balances: Record<string, number>;
  }>;
};

export type GroupReportsSharesResult = {
  range: 'all' | 7 | 15 | 30;
  memberShares: Array<{
    memberId: string;
    name: string;
    isCurrentUser: boolean;
    shares: Record<string, number>;
  }>;
};

export type GroupExpenseParticipant = {
  memberId: string;
  name: string;
  share: number;
};

export type GroupExpenseSharedSplit = {
  amount: number;
  splitMethod: 'percentage' | 'exact';
  splitValues?: Record<string, number>;
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
    icon: string | null;
    color: string | null;
  } | null;
  paidBy: {
    id: string;
    name: string;
  };
  paidByMembers: Array<{
    memberId: string;
    name: string;
    amount: number;
  }>;
  participants: GroupExpenseParticipant[];
  sharedSplit: GroupExpenseSharedSplit | null;
  advancedDetails: GroupExpenseAdvancedDetails | null;
  attachmentUrl: string | null;
};

export type ListGroupExpensesResult = {
  data: GroupExpenseListItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};

export type ListGroupMemberExpensesInput = {
  userId: string;
  groupId: string;
  memberId: string;
  limit: number;
  cursor?: string;
};

export type GroupMemberExpenseListItem = GroupExpenseListItem & {
  participants: GroupExpenseParticipant[];
};

export type ListGroupMemberExpensesResult = {
  data: GroupMemberExpenseListItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};
