import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors } from '@/lib/theme/tokens';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View, Image, Text } from 'react-native';
import { useAuth } from '@/lib/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { isDark, toggleTheme } = useTheme();
  const colors = getColors(isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, apiUrl, avatarUpdatedAt } = useAuth();

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarUri = () => {
    if (!user || !user.avatar_url) return null;
    const baseUri = user.avatar_url.startsWith('http') ? user.avatar_url : `${apiUrl}${user.avatar_url}`;
    return `${baseUri}?t=${avatarUpdatedAt}`;
  };

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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable
              onPress={toggleTheme}
              hitSlop={10}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                paddingHorizontal: 8,
              })}
            >
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
            <Pressable
              onPress={() => router.push('/profile')}
              hitSlop={10}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                paddingHorizontal: 8,
                marginRight: 10,
                justifyContent: 'center',
                alignItems: 'center',
              })}
            >
              {user?.avatar_url ? (
                <Image
                  source={{ uri: getAvatarUri() || undefined }}
                  style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
                />
              ) : user ? (
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>
                    {getInitials(user.nome)}
                  </Text>
                </View>
              ) : (
                <Ionicons
                  name="person-circle-outline"
                  size={24}
                  color={colors.textSecondary}
                />
              )}
            </Pressable>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          headerTitle: 'Sanctus',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="church" size={size} color={color} />
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
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plano"
        options={{
          title: 'Plano',
          headerTitle: 'Plano de Vida',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="notebook-check" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          headerTitle: 'Magisterium AI',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="comment-question" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
