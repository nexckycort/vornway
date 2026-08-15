import {
  Ionicons,
  type IoniconsIconName,
} from '@react-native-vector-icons/ionicons';
import {
  GlassTabBar,
  GlassTabButton,
  type GlassTabItem,
  renderFadingTabScreen,
  TabBarMinimizeProvider,
} from 'expo-glass-tabs';
import { useRouter } from 'expo-router';
import { TabList, TabSlot, Tabs, TabTrigger } from 'expo-router/ui';

type TabItem = GlassTabItem & { href: string; iconName: IoniconsIconName };

const ITEMS: TabItem[] = [
  { name: 'index', href: '/', label: 'Inicio', iconName: 'home-outline' },
  {
    name: 'friends',
    href: '/friends',
    label: 'Amigos',
    iconName: 'people-outline',
  },
  {
    name: 'spaces',
    href: '/spaces',
    label: 'Espacios',
    iconName: 'grid-outline',
  },
  {
    name: 'finances',
    href: '/finances',
    label: 'Finanzas',
    iconName: 'wallet-outline',
  },
  {
    name: 'profile',
    href: '/profile',
    label: 'Perfil',
    iconName: 'person-outline',
  },
];

export default function AppTabs() {
  const router = useRouter();

  return (
    <TabBarMinimizeProvider>
      <Tabs>
        <TabSlot style={{ height: '100%' }} renderFn={renderFadingTabScreen} />
        <TabList asChild>
          <GlassTabBar
            haptics
            theme={{
              activeTint: '#DE034D',
              inactiveTint: '#777777',
              highlight: 'rgba(222, 3, 77, 0.12)',
              glassTint: 'rgba(255, 255, 255, 0.55)',
              solidFallback: 'rgba(255, 255, 255, 0.96)',
            }}
            onIndexSelected={(index) => {
              const item = ITEMS[index];
              if (item) router.navigate(item.href as never);
            }}
          >
            {ITEMS.map(({ href, iconName, ...item }, index) => (
              <TabTrigger
                key={item.name}
                name={item.name}
                href={href as never}
                asChild
              >
                <GlassTabButton
                  item={{
                    ...item,
                    renderIcon: ({ tint, size }) => (
                      <Ionicons name={iconName} color={tint} size={size} />
                    ),
                  }}
                  index={index}
                />
              </TabTrigger>
            ))}
          </GlassTabBar>
        </TabList>
      </Tabs>
    </TabBarMinimizeProvider>
  );
}
