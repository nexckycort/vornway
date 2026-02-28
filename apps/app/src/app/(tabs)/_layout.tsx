import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '@/providers/auth-provider';

export default function TabLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
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
            <MaterialIcons size={22} name="arrow-circle-down" color={String(color)} />
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
  );
}
