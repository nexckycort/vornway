import {
  GlassTabBar,
  GlassTabButton,
  type GlassTabItem,
  renderFadingTabScreen,
  TabBarMinimizeProvider,
} from 'expo-glass-tabs';
import { useRouter } from 'expo-router';
import { TabList, TabSlot, Tabs, TabTrigger } from 'expo-router/ui';

const ITEMS: Array<GlassTabItem & { href: string }> = [
  { name: 'index', href: '/', label: 'Inicio', icon: 'house.fill' },
  {
    name: 'friends',
    href: '/friends',
    label: 'Amigos',
    icon: 'arrow.left.arrow.right',
  },
  {
    name: 'spaces',
    href: '/spaces',
    label: 'Espacios',
    icon: 'square.grid.2x2.fill',
  },
  {
    name: 'finances',
    href: '/finances',
    label: 'Finanzas',
    icon: 'wallet.bifold.fill',
  },
  { name: 'profile', href: '/profile', label: 'Perfil', icon: 'person.fill' },
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
            {ITEMS.map(({ href, ...item }, index) => (
              <TabTrigger
                key={item.name}
                name={item.name}
                href={href as never}
                asChild
              >
                <GlassTabButton item={item} index={index} />
              </TabTrigger>
            ))}
          </GlassTabBar>
        </TabList>
      </Tabs>
    </TabBarMinimizeProvider>
  );
}
