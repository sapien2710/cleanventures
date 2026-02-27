import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useNotifications, type Notification, type NotifType } from "@/lib/notifications-store";

const TYPE_META: Record<NotifType, { icon: any; color: string }> = {
  join_accepted: { icon: "checkmark.circle.fill", color: "#22C55E" },
  join_declined: { icon: "xmark.circle.fill", color: "#EF4444" },
  task_assigned: { icon: "checkmark.square.fill", color: "#3B82F6" },
  venture_activated: { icon: "bolt.fill", color: "#F59E0B" },
  venture_completed: { icon: "trophy.fill", color: "#8B5CF6" },
  contribution: { icon: "arrow.right.circle.fill", color: "#10B981" },
  general: { icon: "bell.fill", color: "#6B7280" },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();

  return (
    <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "700", color: colors.foreground }}>
          Notifications
        </Text>
        {unreadCount > 0 && (
          <Pressable
            onPress={markAllRead}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
              Mark all read
            </Text>
          </Pressable>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
          <IconSymbol name="bell.fill" size={48} color={colors.border} />
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>
            No notifications yet
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
            You'll see updates about your ventures, tasks, and join requests here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 32 }}
          renderItem={({ item }: { item: Notification }) => {
            const meta = TYPE_META[item.type] ?? TYPE_META.general;
            return (
              <Pressable
                onPress={() => {
                  markRead(item.id);
                  if (item.ventureId) {
                    router.push(`/venture/${item.ventureId}`);
                  }
                }}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: item.read ? colors.background : colors.primaryLight + "66",
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  {/* Icon */}
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: meta.color + "20",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2,
                    }}
                  >
                    <IconSymbol name={meta.icon} size={20} color={meta.color} />
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: item.read ? "500" : "700",
                          color: colors.foreground,
                        }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {!item.read && (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: colors.primary,
                          }}
                        />
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.muted,
                        lineHeight: 18,
                      }}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Text style={{ fontSize: 11, color: colors.muted }}>
                        {timeAgo(item.timestamp)}
                      </Text>
                      {item.ventureId && (
                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>· Tap to view venture →</Text>
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}
