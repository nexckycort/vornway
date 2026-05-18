export type GoalListItem = {
  id: string;
  title: string;
  description: string | null;
  currency: string;
  targetAmount: number;
  savedAmount: number;
  progress: number;
  endDate: Date;
  createdAt: Date;
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

export type GoalDetailResult = GoalListItem & {
  startDate: Date;
  installmentCount: number;
  installmentAmount: number;
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
  currency: string;
  targetAmount: number;
  startDate: Date;
  endDate: Date;
  installmentCount: number;
  installmentAmount?: number;
  participants?: Array<{
    name: string;
    userId?: string | null;
  }>;
};

export type CreateGoalResult = {
  id: string;
};
