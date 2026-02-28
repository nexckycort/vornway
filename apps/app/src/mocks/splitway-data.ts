export type CurrencyCode = 'COP' | 'USD' | 'EUR' | 'AED';
export type GroupCategory = 'viajes' | 'roomates' | 'salidas' | 'otros' | 'meta';

export type User = {
  id: string;
  name: string;
  email: string;
  isAnonymous?: boolean;
};

export type Member = {
  id: string;
  name: string;
  isCurrentUser?: boolean;
  role?: 'admin' | 'member';
};

export type Expense = {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  paidById: string;
  participantIds: string[];
  isDeleted?: boolean;
  isSettlement?: boolean;
};

export type Group = {
  id: string;
  name: string;
  type: GroupCategory;
  currency: CurrencyCode;
  members: Member[];
  expenses: Expense[];
  inviteCode: string;
};

export type Goal = {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  targetAmount: number;
  totalContributed: number;
  currency: CurrencyCode;
  startDate: string;
  endDate: string;
  installmentCount: number;
};

export type ItineraryPlace = {
  id: string;
  name: string;
  address: string;
  notes?: string;
};

export type ItineraryDay = {
  id: string;
  date: string;
  notes?: string;
  places: ItineraryPlace[];
};

export type Itinerary = {
  id: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  days: ItineraryDay[];
};

export type ActivityItem = {
  id: string;
  actorName: string;
  action: string;
  targetName?: string;
  groupName: string;
  createdAt: string;
  amount?: number;
  currency?: CurrencyCode;
};

export const mockUser: User = {
  id: 'u1',
  name: 'Vanessa',
  email: 'vanessa@example.com',
};

const baseMembers: Member[] = [
  { id: 'm1', name: 'Vanessa', isCurrentUser: true, role: 'admin' },
  { id: 'm2', name: 'Carlos', role: 'member' },
  { id: 'm3', name: 'Ana', role: 'member' },
  { id: 'm4', name: 'Luisa', role: 'member' },
];

export const mockGroups: Group[] = [
  {
    id: 'g1',
    name: 'Viaje a Madrid',
    type: 'viajes',
    currency: 'EUR',
    members: baseMembers,
    inviteCode: 'MADRID2026',
    expenses: [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Hotel centro',
        amount: 520,
        currency: 'EUR',
        date: '2026-01-18T10:00:00.000Z',
        paidById: 'm1',
        participantIds: ['m1', 'm2', 'm3'],
      },
      {
        id: 'e2',
        groupId: 'g1',
        description: 'Cena tapas',
        amount: 120,
        currency: 'EUR',
        date: '2026-01-19T21:00:00.000Z',
        paidById: 'm2',
        participantIds: ['m1', 'm2', 'm3', 'm4'],
      },
    ],
  },
  {
    id: 'g2',
    name: 'Cumpleanos de Ana',
    type: 'salidas',
    currency: 'COP',
    members: baseMembers.slice(0, 3),
    inviteCode: 'CUMPLEANA',
    expenses: [
      {
        id: 'e3',
        groupId: 'g2',
        description: 'Decoracion',
        amount: 180000,
        currency: 'COP',
        date: '2026-02-02T09:30:00.000Z',
        paidById: 'm3',
        participantIds: ['m1', 'm2', 'm3'],
      },
      {
        id: 'e4',
        groupId: 'g2',
        description: 'Torta',
        amount: 95000,
        currency: 'COP',
        date: '2026-02-02T13:10:00.000Z',
        paidById: 'm1',
        participantIds: ['m1', 'm2', 'm3'],
      },
    ],
  },
  {
    id: 'g3',
    name: 'Meta: Viaje Japon',
    type: 'meta',
    currency: 'USD',
    members: baseMembers,
    inviteCode: 'JAPONMETA',
    expenses: [],
  },
];

export const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    groupId: 'g3',
    name: 'Tiquetes',
    description: 'Ahorro para vuelos ida y vuelta',
    targetAmount: 2400,
    totalContributed: 1450,
    currency: 'USD',
    startDate: '2026-01-01',
    endDate: '2026-09-30',
    installmentCount: 9,
  },
  {
    id: 'goal-2',
    groupId: 'g3',
    name: 'Hospedaje',
    description: 'Reserva de hotel por 10 noches',
    targetAmount: 1800,
    totalContributed: 650,
    currency: 'USD',
    startDate: '2026-01-01',
    endDate: '2026-09-30',
    installmentCount: 9,
  },
];

export const mockItineraries: Itinerary[] = [
  {
    id: 'it1',
    city: 'Madrid',
    country: 'Espana',
    startDate: '2026-04-10',
    endDate: '2026-04-15',
    days: [
      {
        id: 'd1',
        date: '2026-04-10',
        notes: 'Llegada y check-in',
        places: [
          { id: 'p1', name: 'Plaza Mayor', address: 'Centro Historico' },
          { id: 'p2', name: 'Mercado San Miguel', address: 'Madrid Centro' },
        ],
      },
      {
        id: 'd2',
        date: '2026-04-11',
        notes: 'Museos',
        places: [
          { id: 'p3', name: 'Museo del Prado', address: 'Paseo del Prado' },
        ],
      },
    ],
  },
];

export const mockActivity: ActivityItem[] = [
  {
    id: 'a1',
    actorName: 'Vanessa',
    action: 'expense.created',
    targetName: 'Hotel centro',
    groupName: 'Viaje a Madrid',
    createdAt: '2026-02-20T08:35:00.000Z',
    amount: 520,
    currency: 'EUR',
  },
  {
    id: 'a2',
    actorName: 'Carlos',
    action: 'member.removed',
    targetName: 'Pedro',
    groupName: 'Viaje a Madrid',
    createdAt: '2026-02-21T11:00:00.000Z',
  },
  {
    id: 'a3',
    actorName: 'Vanessa',
    action: 'goal.contribution.created',
    targetName: 'Tiquetes',
    groupName: 'Meta: Viaje Japon',
    createdAt: '2026-02-22T17:40:00.000Z',
    amount: 200,
    currency: 'USD',
  },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function getGroupById(groupId: string) {
  return mockGroups.find((group) => group.id === groupId) ?? null;
}

export function getExpenseById(groupId: string, expenseId: string) {
  const group = getGroupById(groupId);
  if (!group) return null;
  return group.expenses.find((expense) => expense.id === expenseId) ?? null;
}

export function getGoalsByGroupId(groupId: string) {
  return mockGoals.filter((goal) => goal.groupId === groupId);
}

export function getGoalById(goalId: string) {
  return mockGoals.find((goal) => goal.id === goalId) ?? null;
}

export function getItineraryById(itineraryId: string) {
  return mockItineraries.find((item) => item.id === itineraryId) ?? null;
}
