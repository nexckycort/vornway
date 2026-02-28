import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { BottomDrawer } from '@/components/ui/bottom-drawer';
import { useAuth } from '@/providers/auth-provider';
import { Pressable, Text, View } from '@/tw';

export default function TabLayout() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isCreateDrawerVisible, setIsCreateDrawerVisible] = useState(false);

  const openCreateDrawer = () => {
    setIsCreateDrawerVisible(true);
  };

  const closeCreateDrawer = () => {
    setIsCreateDrawerVisible(false);
  };

  const handleDrawerAction = (
    path: '/create-group' | '/create-goal' | '/join-group'
  ) => {
    closeCreateDrawer();
    setTimeout(() => router.push(path), 120);
  };

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#4F46E5',
          tabBarInactiveTintColor: '#98A2B3',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            height: 72,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Grupos',
            tabBarIcon: ({ color }) => (
              <MaterialIcons size={22} name="groups-2" color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="metas"
          options={{
            title: 'Metas',
            tabBarIcon: ({ color }) => (
              <MaterialIcons
                size={22}
                name="arrow-circle-down"
                color={String(color)}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: '',
            tabBarIcon: () => <MaterialIcons size={28} name="add" color="#FFFFFF" />,
            tabBarButton: (props: BottomTabBarButtonProps) => (
              <PlatformPressable
                {...props}
                onPress={openCreateDrawer}
                style={[
                  props.style,
                  {
                    top: -14,
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#4F46E5',
                  },
                ]}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="actividad"
          options={{
            title: 'Actividad',
            tabBarIcon: ({ color }) => (
              <MaterialIcons size={22} name="schedule" color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color }) => (
              <MaterialIcons size={22} name="person-outline" color={String(color)} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            href: null,
          }}
        />
      </Tabs>

      <BottomDrawer visible={isCreateDrawerVisible} onClose={closeCreateDrawer}>
        <Pressable
          onPress={() => handleDrawerAction('/create-group')}
          className="mb-2 flex-row items-center gap-4 rounded-2xl px-2 py-3 active:bg-slate-50">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <MaterialIcons name="group-add" size={22} color="#4F46E5" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-[#1a1a3e]">Crear grupo</Text>
            <Text className="text-sm text-slate-500">
              Inicia un nuevo grupo desde cero
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => handleDrawerAction('/create-goal')}
          className="mb-2 flex-row items-center gap-4 rounded-2xl px-2 py-3 active:bg-slate-50">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <MaterialIcons name="track-changes" size={22} color="#4F46E5" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-[#1a1a3e]">Crear una meta</Text>
            <Text className="text-sm text-slate-500">
              Define un objetivo y registra aportes
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => handleDrawerAction('/join-group')}
          className="flex-row items-center gap-4 rounded-2xl px-2 py-3 active:bg-slate-50">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <MaterialIcons name="group" size={22} color="#4F46E5" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-[#1a1a3e]">
              Te invitaron a un grupo o a una meta
            </Text>
            <Text className="text-sm text-slate-500">
              Pega un enlace de invitación para unirte
            </Text>
          </View>
        </Pressable>
      </BottomDrawer>
    </>
  );
}
