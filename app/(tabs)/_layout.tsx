import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors } from '@/lib/theme/tokens';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { isDark, toggleTheme } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerRight: () => (
          <Pressable
            onPress={toggleTheme}
            hitSlop={10}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              paddingHorizontal: 12,
            })}
          >
            <Ionicons
              name={isDark ? 'moon' : 'sunny'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          headerTitle: 'Sanctus',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="biblia"
        options={{
          title: 'Bíblia',
          headerTitle: 'Bíblia Sagrada',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-cross" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="liturgia"
        options={{
          title: 'Liturgia',
          headerTitle: 'Liturgia Diária',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
