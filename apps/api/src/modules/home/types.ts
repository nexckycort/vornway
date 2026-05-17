export type HomeParticipantBalance = {
  memberId: string;
  memberName: string;
  currency: string;
  amount: number;
  direction: 'theyOweYou' | 'youOweThem';
  label: string;
};

export type HomeGroupSummary = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  createdAt: Date;
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
  participantBalances: HomeParticipantBalance[];
  totalsByCurrency: Record<string, number>;
};

export type HomeGoalSummary = {
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

export type HomeSummary = {
  groups: HomeGroupSummary[];
  goals: HomeGoalSummary[];
};
