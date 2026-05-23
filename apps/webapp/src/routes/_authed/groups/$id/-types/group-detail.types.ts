export type ExpenseItem = {
  id: string;
  category: {
    id: string;
    name: string;
  } | null;
  description: string;
  amount: number;
  currency: string;
  date: string;
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
  participantCount: number;
  currentUserBalance: number | null;
  syncStatus?: 'pending';
};

export type GroupMemberIdentity = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  role: string;
  userId: string | null;
  isCurrentUser: boolean;
  expenseCount: number;
};

export type GroupMemberBalance = {
  memberId: string;
  name: string;
  isCurrentUser: boolean;
  balances: Record<string, number>;
};

export type GroupSummary = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  imageUrl: string | null;
  inviteCode: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  totals: Record<string, number>;
  categories: Array<{
    id: string;
    name: string;
  }>;
  members: GroupMemberIdentity[];
  directDebts: Array<{
    currency: string;
    amount: number;
  }>;
  directCredits: Array<{
    currency: string;
    amount: number;
  }>;
  memberBalances: GroupMemberBalance[];
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
