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
