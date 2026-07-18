export type GoalListItem = {
  id: string;
  title: string;
  description: string | null;
  goalType: string;
  emoji: string | null;
  coverImageUrl: string | null;
  themeColor: string | null;
  contributionMode: string;
  currency: string;
  targetAmount: number;
  savedAmount: number;
  progress: number;
  endDate: Date;
  createdAt: Date;
  participantCount: number;
  daysLeft: number;
  monthlyTarget: number;
  perMemberMonthlyTarget: number;
  group: {
    id: string;
    name: string;
  };
};

export type GoalDetailMember = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  role: string;
  userId: string | null;
  isCurrentUser: boolean;
};

export type GoalContributionItem = {
  id: string;
  amount: number;
  contributedAt: Date;
  notes: string | null;
  member: {
    id: string;
    name: string;
    image: string | null;
    isCurrentUser: boolean;
  };
};

export type GoalDetailResult = GoalListItem & {
  startDate: Date;
  installmentCount: number;
  installmentAmount: number;
  suggestedContributionAmount: number | null;
  completedAt: Date | null;
  updatedAt: Date;
  group: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    inviteCode: string;
    createdAt: Date;
    updatedAt: Date;
  };
  members: GoalDetailMember[];
  myMembership: {
    id: string;
    name: string;
    role: string;
  } | null;
  participantCount: number;
  contributions: GoalContributionItem[];
  stats: {
    remainingAmount: number;
    averageContribution: number;
    projectedCompletionDate: Date | null;
    currentMonthContributionTotal: number;
    contributorsThisMonth: number;
    pendingMembersThisMonth: number;
  };
  memberStats: Array<{
    memberId: string;
    totalAmount: number;
    contributionCount: number;
    contributedThisMonth: boolean;
    latestContributionAt: Date | null;
  }>;
};

export type GoalsListResponse = {
  data: GoalListItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};

export type CreateGoalInput = {
  userId: string;
  ownerName: string;
  name: string;
  description?: string;
  goalType?: string;
  emoji?: string | null;
  coverImageUrl?: string | null;
  themeColor?: string | null;
  contributionMode?: string;
  currency: string;
  targetAmount: number;
  startDate: Date;
  endDate: Date;
  installmentCount: number;
  installmentAmount?: number;
  suggestedContributionAmount?: number | null;
  participants?: Array<{
    name: string;
    userId?: string | null;
  }>;
};

export type CreateGoalResult = {
  id: string;
};

export type UpdateGoalInput = {
  userId: string;
  goalId: string;
  name?: string;
  description?: string | null;
  goalType?: string;
  emoji?: string | null;
  coverImageUrl?: string | null;
  themeColor?: string | null;
  contributionMode?: string;
  currency?: string;
  targetAmount?: number;
  startDate?: Date;
  endDate?: Date;
  installmentCount?: number;
  installmentAmount?: number | null;
  suggestedContributionAmount?: number | null;
};

export type UpdateGoalResult = {
  id: string;
};

export type CreateGoalContributionInput = {
  userId: string;
  goalId: string;
  memberId: string;
  amount: number;
  contributedAt?: Date;
  notes?: string;
};

export type CreateGoalContributionResult = {
  id: string;
};

export type DeleteGoalContributionInput = {
  userId: string;
  goalId: string;
  contributionId: string;
};

export type DeleteGoalContributionResult = {
  id: string;
};
