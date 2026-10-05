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
import { useI18n } from '@/lib/i18n';

type TabItem = GlassTabItem & { href: string; iconName: IoniconsIconName };

export default function AppTabs() {
  const router = useRouter();
  const { t } = useI18n();
  const items: TabItem[] = [
    {
      name: 'index',
      href: '/',
      label: t('bottomBar.home'),
      iconName: 'home-outline',
    },
    {
      name: 'friends',
      href: '/friends',
      label: t('bottomBar.friends'),
      iconName: 'people-outline',
    },
    {
      name: 'spaces',
      href: '/spaces',
      label: t('bottomBar.groups'),
      iconName: 'grid-outline',
    },
    {
      name: 'goals',
      href: '/goals',
      label: t('bottomBar.goals'),
      iconName: 'flag-outline',
    },
    {
      name: 'profile',
      href: '/profile',
      label: t('bottomBar.profile'),
      iconName: 'person-outline',
    },
  ];

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
              const item = items[index];
              if (item) router.navigate(item.href as never);
            }}
          >
            {items.map(({ href, iconName, ...item }, index) => (
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
