import React, { useMemo } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-store";
import { useChat } from "@/lib/chat-store";
import { useVentures } from "@/lib/ventures-store";

function formatLastMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getLastMessagePreview(msg: ReturnType<ReturnType<typeof useChat>['getLastMessage']>): string {
  if (!msg) return 'No messages yet';
  if (msg.type === 'image') return `📷 ${msg.imageCaption || 'Photo'}`;
  if (msg.type === 'poll') return `📊 Poll: ${msg.pollQuestion}`;
  return `${msg.senderName.split(' ')[0]}: ${msg.text ?? ''}`;
}

export default function ChatsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { getLastMessage } = useChat();
  const { ventures, getMemberForUser, getMembersForVenture } = useVentures();

  // Derive chat list dynamically: show a chat room for every venture the current user is a member of.
  // chatId = ventureId (so chat/[id].tsx can use the ventureId as chatId directly)
  const myChats = useMemo(() => {
    if (!authUser) return [];
    return ventures
      .filter(v => getMemberForUser(v.id, authUser.username) !== null)
      .map(v => {
        const members = getMembersForVenture(v.id);
        return {
          id: v.id,           // chatId == ventureId
          ventureId: v.id,
          ventureName: v.name,
          avatar: v.images?.[0] ?? 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&q=80',
          participants: members.length,
        };
      });
  }, [ventures, authUser, getMemberForUser, getMembersForVenture]);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.foreground }}>Chats</Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>Your venture group chats</Text>
      </View>

      {myChats.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 }}>
          <Text style={{ fontSize: 40 }}>💬</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground, textAlign: 'center' }}>No chats yet</Text>
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 }}>
            Join or create a venture to start chatting with your team.
          </Text>
        </View>
      ) : (
        <FlatList
          data={myChats}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />}
          renderItem={({ item }) => {
            const lastMsg = getLastMessage(item.id);
            const preview = getLastMessagePreview(lastMsg);
            const timeStr = lastMsg ? formatLastMessageTime(lastMsg.timestamp) : '';
            const isUnread = lastMsg && authUser && lastMsg.authUsername !== authUser.username;

            return (
              <Pressable
                onPress={() => router.push(`/chat/${item.id}` as any)}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
                  {/* Avatar */}
                  <Image
                    source={{ uri: item.avatar }}
                    style={{ width: 56, height: 56, borderRadius: 28 }}
                    resizeMode="cover"
                  />

                  {/* Content */}
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text
                        style={{ fontSize: 16, fontWeight: '600', color: colors.foreground, flex: 1, marginRight: 8 }}
                        numberOfLines={1}
                      >
                        {item.ventureName}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>{timeStr}</Text>
                    </View>
                    <Text
                      style={{ fontSize: 14, color: isUnread ? colors.foreground : colors.muted, fontWeight: isUnread ? '500' : '400' }}
                      numberOfLines={1}
                    >
                      {preview}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>{item.participants} participant{item.participants !== 1 ? 's' : ''}</Text>
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
