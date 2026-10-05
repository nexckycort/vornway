export type HomeTrip = {
  id: string;
  name: string;
  imageUrl: string | null;
  isPersonal?: boolean;
  members: Array<{ id: string; name: string; image: string | null }>;
  balanceLabel?: string;
  balanceItems?: Array<{ person: string; amount: string }>;
  balanceOverflowLabel?: string;
  dates?: string;
  emptyLabel?: string;
};

export type HomeExpense = {
  id: string;
  quickSplitId: string;
  description: string;
  quickSplitName: string;
  amount: string;
  paidBy: string;
  participantCount: number;
  balance: string;
  createdAtLabel: string;
};

export type HomeGoal = {
  id: string;
  title: string;
  groupName: string;
  saved: string;
  target: string;
  progress: number;
  tone: 'pink' | 'yellow';
};

export type HomeDebt = {
  id: string;
  counterpartyName: string;
  directionLabel: string;
  remaining: string;
  statusLabel: string;
  updatedAtLabel: string;
};

export type HomeData = {
  trips: HomeTrip[];
  expenses: HomeExpense[];
  goals: HomeGoal[];
  debts: HomeDebt[];
  unreadNotifications: number;
};
