import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Alert, FlatList, Image, Pressable, Text, TextInput,
  View, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Channel, Event, MessageResponse } from "stream-chat";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-store";
import { useStreamChat } from "@/lib/chat-provider";
import { useVentures } from "@/lib/ventures-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  } else if (diffDays === 1) {
    return "Yesterday " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  } else {
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isMe,
  colors,
}: {
  msg: MessageResponse;
  isMe: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const senderName = msg.user?.name ?? msg.user?.id ?? "Unknown";
  const senderAvatar = (msg.user as any)?.image as string | undefined;
  const timestamp = typeof msg.created_at === "string" ? msg.created_at : (msg.created_at as Date).toISOString();

  return (
    <View
      style={{
        flexDirection: isMe ? "row-reverse" : "row",
        gap: 8,
        marginBottom: 12,
        alignItems: "flex-end",
      }}
    >
      {/* Avatar (only for others) */}
      {!isMe && (
        senderAvatar ? (
          <Image
            source={{ uri: senderAvatar }}
            style={{ width: 32, height: 32, borderRadius: 16 }}
          />
        ) : (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.primary + "30",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>
              {senderName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )
      )}

      <View
        style={{
          maxWidth: "75%",
          alignItems: isMe ? "flex-end" : "flex-start",
          gap: 3,
        }}
      >
        {/* Sender name (only for others) */}
        {!isMe && (
          <Text
            style={{
              fontSize: 11,
              color: colors.muted,
              marginLeft: 4,
              fontWeight: "600",
            }}
          >
            {senderName}
          </Text>
        )}

        {/* Text bubble */}
        <View
          style={{
            backgroundColor: isMe ? colors.primary : colors.surface,
            borderRadius: 16,
            borderTopRightRadius: isMe ? 4 : 16,
            borderTopLeftRadius: isMe ? 16 : 4,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: isMe ? 0 : 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: isMe ? "white" : colors.foreground,
              lineHeight: 20,
            }}
          >
            {msg.text ?? ""}
          </Text>
        </View>

        {/* Timestamp */}
        <Text
          style={{ fontSize: 10, color: colors.muted, marginHorizontal: 4 }}
        >
          {formatTime(timestamp)}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  const { isReady, loadChannel } = useStreamChat();
  const { ventures, getMembersForVenture } = useVentures();

  const venture = ventures.find((v) => v.id === id);
  const members = getMembersForVenture(id ?? "");
  const ventureName = venture?.name ?? "Venture Chat";
  const ventureAvatar =
    venture?.images?.[0] ??
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&q=80";

  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load the Stream channel when the screen mounts
  useEffect(() => {
    if (!id) return;

    async function init() {
      setLoading(true);
      const ch = await loadChannel(id!, ventureName);
      if (!ch) {
        setLoading(false);
        return;
      }
      setChannel(ch);

      // Load initial messages (most recent 50)
      const state = ch.state;
      const msgs = Object.values(state.messages) as MessageResponse[];
      setMessages(msgs.sort((a, b) => {
        const ta = typeof a.created_at === "string" ? a.created_at : (a.created_at as Date).toISOString();
        const tb = typeof b.created_at === "string" ? b.created_at : (b.created_at as Date).toISOString();
        return ta.localeCompare(tb);
      }));
      setLoading(false);
    }

    init();
  }, [isReady, id]);

  // Subscribe to new messages
  useEffect(() => {
    if (!channel) return;

    const handleNewMessage = (event: Event) => {
      if (event.message) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.find((m) => m.id === event.message!.id)) return prev;
          return [...prev, event.message as MessageResponse];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    channel.on("message.new", handleNewMessage);
    return () => {
      channel.off("message.new", handleNewMessage);
    };
  }, [channel]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 150);
    }
  }, [loading]);

  const handleSend = useCallback(async () => {
    const text = messageText.trim();
    if (!text || !channel || sending) return;

    setSending(true);
    setMessageText("");
    try {
      await channel.sendMessage({ text });
    } catch (err) {
      Alert.alert("Error", "Failed to send message. Please try again.");
      setMessageText(text); // restore text on failure
    } finally {
      setSending(false);
    }
  }, [messageText, channel, sending]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <Image
            source={{ uri: ventureAvatar }}
            style={{ width: 40, height: 40, borderRadius: 20 }}
            resizeMode="cover"
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.foreground,
              }}
              numberOfLines={1}
            >
              {ventureName}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {members.length} participants
            </Text>
          </View>
          <Pressable
            onPress={() => router.push(`/venture/${id}` as any)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View
              style={{
                backgroundColor: colors.primary + "18",
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: colors.primary,
                  fontWeight: "600",
                }}
              >
                View Venture
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Messages */}
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 12, color: colors.muted, fontSize: 14 }}>
              Loading chat...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <MessageBubble
                msg={item}
                isMe={item.user?.id === authUser?.id}
                colors={colors}
              />
            )}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 60,
                  gap: 8,
                }}
              >
                <IconSymbol
                  name="bubble.left.and.bubble.right.fill"
                  size={40}
                  color={colors.border}
                />
                <Text style={{ fontSize: 15, color: colors.muted }}>
                  {channel ? "No messages yet" : "Chat unavailable"}
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  {channel ? "Be the first to say something!" : "Could not connect to chat. Try again later."}
                </Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 8,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 10) + 4,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          {/* Text input */}
          <View
            style={{
              flex: 1,
              backgroundColor: colors.background,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              paddingVertical: 8,
              minHeight: 38,
            }}
          >
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              placeholderTextColor={colors.muted}
              style={{
                fontSize: 14,
                color: colors.foreground,
                lineHeight: 20,
              }}
              multiline
              maxLength={500}
              returnKeyType="default"
              onSubmitEditing={handleSend}
            />
          </View>

          {/* Send button */}
          <Pressable
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor:
                  messageText.trim() && !sending
                    ? colors.primary
                    : colors.border,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <IconSymbol
                name="paperplane.fill"
                size={16}
                color={messageText.trim() ? "white" : colors.muted}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
