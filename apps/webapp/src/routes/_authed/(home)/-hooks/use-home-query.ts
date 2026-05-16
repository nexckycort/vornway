export type HomeIconName =
  | 'bell'
  | 'compass'
  | 'home'
  | 'piggy-bank'
  | 'plus'
  | 'repeat'
  | 'shirt'
  | 'user';

export type HomeAction = {
  id: string;
  icon: HomeIconName;
  label: string;
  variant: 'neutral' | 'primary';
};

export type Trip = {
  id: string;
  name: string;
  dates: string;
  avatars: string[];
  extraPeople: number;
} & (
  | {
      balanceLabel: string;
      balanceItems: { person: string; amount: string }[];
      emptyLabel?: never;
    }
  | {
      emptyLabel: string;
      balanceLabel?: never;
      balanceItems?: never;
    }
);

export type SavingGoal = {
  id: string;
  name: string;
  category: string;
  saved: string;
  target: string;
  progress: number;
  icon: HomeIconName;
  tone: 'pink' | 'yellow';
};

export type NavItem = {
  id: string;
  label: string;
  icon: 'compass' | 'home' | 'piggy-bank' | 'user';
  active: boolean;
};

export type HomeQueryData = {
  userName: string;
  welcomeText: string;
  actions: HomeAction[];
  trips: Trip[];
  savingGoals: SavingGoal[];
  navItems: NavItem[];
};

const homeMock: HomeQueryData = {
  userName: 'Vanessa',
  welcomeText: 'Bienvenida a Vornway',
  actions: [
    {
      id: 'currency-converter',
      icon: 'repeat',
      label: 'Convertidor de moneda',
      variant: 'neutral',
    },
    {
      id: 'create-trip',
      icon: 'compass',
      label: 'Crear Nuevo viaje',
      variant: 'primary',
    },
  ],
  trips: [
    {
      id: 'europa-balance',
      name: 'Europa trip',
      dates: '4 mar - 8 mar',
      avatars: ['VF', 'NC'],
      extraPeople: 2,
      balanceLabel: 'Te deben $1,000.000',
      balanceItems: [
        { person: 'Nestor', amount: 'Te debe $100.000' },
        { person: 'Nestor', amount: 'Te debe €500' },
      ],
    },
    {
      id: 'europa-empty',
      name: 'Europa trip',
      dates: '4 mar - 8 mar',
      avatars: ['VF', 'NC'],
      extraPeople: 2,
      emptyLabel: 'Sin gastos',
    },
  ],
  savingGoals: [
    {
      id: 'brasil-2026',
      name: 'Brasil 2026',
      category: 'Viaje',
      saved: '$1.000.000',
      target: '$3.000.00',
      progress: 25,
      icon: 'compass',
      tone: 'pink',
    },
    {
      id: 'travel-accessories',
      name: 'Accesorios de viaje',
      category: 'Insumos',
      saved: '$10.000',
      target: '$30.000',
      progress: 25,
      icon: 'shirt',
      tone: 'yellow',
    },
  ],
  navItems: [
    { id: 'home', label: 'Inicio', icon: 'home', active: true },
    { id: 'trips', label: 'Viajes', icon: 'compass', active: false },
    { id: 'goals', label: 'Metas', icon: 'piggy-bank', active: false },
    { id: 'account', label: 'Cuenta', icon: 'user', active: false },
  ],
};

export function useHomeQuery() {
  return {
    data: homeMock,
    error: null,
    isError: false,
    isLoading: false,
    refetch: () => homeMock,
  } as const;
}
