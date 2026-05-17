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
};

export type GroupMemberIdentity = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  userId: string | null;
  isCurrentUser: boolean;
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
  description: string | null;
  inviteCode: string;
  participantCount: number;
  totals: Record<string, number>;
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
};
