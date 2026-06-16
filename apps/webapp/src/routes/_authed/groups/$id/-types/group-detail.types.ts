export type ExpenseItem = {
  id: string;
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
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
  paidByMembers: Array<{
    memberId: string;
    name: string;
    amount: number;
  }>;
  participantCount: number;
  currentUserBalance: number | null;
  attachmentUrl: string | null;
  advancedDetails?: ExpenseAdvancedDetails | null;
  sharedSplit?: {
    amount: number;
    splitMethod: 'percentage' | 'exact';
    splitValues?: Record<string, number>;
    items?: Array<{
      name: string;
      amount: number;
    }>;
  } | null;
  syncStatus?: 'pending';
};

export type ExpenseAdvancedDetails = {
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
  advancedExpenseDetailsEnabled: boolean;
  participantCount: number;
  totals: Record<string, number>;
  categories: Array<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    expenseCount: number;
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
