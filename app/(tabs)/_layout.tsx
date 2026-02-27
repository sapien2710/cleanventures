import { Tabs, useRouter } from "expo-router";
import { Platform, View, ActivityIndicator, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useMemo } from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-store";
import { useChat } from "@/lib/chat-store";
import { useVentures } from "@/lib/ventures-store";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  const { user, loading } = useAuth();
  const router = useRouter();
  const { getTotalUnread, getLastRead } = useChat();
  const { ventures, getMemberForUser } = useVentures();

  // Compute total unread messages across all chats the current user is a member of
  const chatUnreadCount = useMemo(() => {
    if (!user) return 0;
    const myChatIds = ventures
      .filter(v => getMemberForUser(v.id, user.username) !== null)
      .map(v => v.id);
    // Build lastReadTimestamps map from getLastRead
    const lrts: Record<string, string> = {};
    myChatIds.forEach(chatId => {
      const lrt = getLastRead(chatId, user.username);
      if (lrt) lrts[`${chatId}:${user.username}`] = lrt;
    });
    return getTotalUnread(myChatIds, user.username, lrts);
  }, [user, ventures, getMemberForUser, getTotalUnread, getLastRead]);

  // Auth guard: redirect to sign-in if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/sign-in");
    }
  }, [user, loading]);

  // Show a blank loading screen while session is being restored
  if (loading || !user) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ventures"
        options={{
          title: "My Ventures",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="list.bullet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: "Market",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="cart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          tabBarIcon: ({ color }) => (
            <View style={{ position: 'relative' }}>
              <IconSymbol size={24} name="bubble.left.fill" color={color} />
              {chatUnreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -6,
                  backgroundColor: colors.error,
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 3,
                  borderWidth: 1.5,
                  borderColor: colors.surface,
                }}>
                  <Text style={{ color: 'white', fontSize: 9, fontWeight: '800', lineHeight: 12 }}>
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
