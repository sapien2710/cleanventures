import React, { useState, useRef, useEffect } from "react";
import {
  Alert, FlatList, Image, Pressable, Text, TextInput,
  View, KeyboardAvoidingView, Platform, Modal, ScrollView, StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/lib/auth-store";
import { useChat, type ChatMessage, type PollOption } from "@/lib/chat-store";
import { useVentures } from "@/lib/ventures-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } else if (diffDays === 1) {
    return 'Yesterday ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } else {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}

// ─── Poll Message ─────────────────────────────────────────────────────────────

function PollBubble({ msg, isMe, authUsername, onVote, colors }: {
  msg: ChatMessage;
  isMe: boolean;
  authUsername: string;
  onVote: (optionId: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const totalVotes = (msg.pollOptions ?? []).reduce((s, o) => s + o.votes.length, 0);
  const myVote = (msg.pollOptions ?? []).find(o => o.votes.includes(authUsername));

  return (
    <View style={{
      backgroundColor: isMe ? colors.primary : colors.surface,
      borderRadius: 16,
      borderTopRightRadius: isMe ? 4 : 16,
      borderTopLeftRadius: isMe ? 16 : 4,
      borderWidth: 1,
      borderColor: isMe ? 'transparent' : colors.border,
      padding: 14,
      maxWidth: 280,
      gap: 10,
    }}>
      {/* Poll icon + question */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <IconSymbol name="chart.bar.fill" size={16} color={isMe ? 'rgba(255,255,255,0.8)' : colors.primary} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: isMe ? 'white' : colors.foreground, lineHeight: 20 }}>
          {msg.pollQuestion}
        </Text>
      </View>

      {/* Options */}
      {(msg.pollOptions ?? []).map((opt: PollOption) => {
        const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
        const isSelected = opt.votes.includes(authUsername);
        return (
          <Pressable
            key={opt.id}
            onPress={() => onVote(opt.id)}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', borderWidth: 1.5, borderColor: isSelected ? (isMe ? 'white' : colors.primary) : (isMe ? 'rgba(255,255,255,0.3)' : colors.border) }}>
              {/* Progress bar background */}
              {totalVotes > 0 && (
                <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${pct}%`, backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : colors.primary + '18' }} />
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, gap: 8 }}>
                <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: isSelected ? (isMe ? 'white' : colors.primary) : (isMe ? 'rgba(255,255,255,0.5)' : colors.border), alignItems: 'center', justifyContent: 'center' }}>
                  {isSelected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isMe ? 'white' : colors.primary }} />}
                </View>
                <Text style={{ flex: 1, fontSize: 13, color: isMe ? 'white' : colors.foreground, fontWeight: isSelected ? '600' : '400' }}>{opt.text}</Text>
                {totalVotes > 0 && (
                  <Text style={{ fontSize: 12, color: isMe ? 'rgba(255,255,255,0.7)' : colors.muted, fontWeight: '600' }}>{pct}%</Text>
                )}
              </View>
            </View>
          </Pressable>
        );
      })}

      <Text style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.6)' : colors.muted }}>
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · Tap to vote
      </Text>
    </View>
  );
}

// ─── Create Poll Modal ────────────────────────────────────────────────────────

function CreatePollModal({ visible, onClose, onSubmit, colors }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (question: string, options: string[]) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const handleAddOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const handleOptionChange = (text: string, index: number) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const filledOptions = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim()) { Alert.alert('Poll question required'); return; }
    if (filledOptions.length < 2) { Alert.alert('At least 2 options required'); return; }
    onSubmit(question.trim(), filledOptions);
    setQuestion('');
    setOptions(['', '']);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
          <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground, marginBottom: 16 }}>Create Poll</Text>

            {/* Question */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 }}>Question</Text>
            <View style={{ backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 }}>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask something..."
                placeholderTextColor={colors.muted}
                style={{ fontSize: 15, color: colors.foreground }}
                returnKeyType="next"
              />
            </View>

            {/* Options */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 8 }}>Options</Text>
            {options.map((opt, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10 }}>
                  <TextInput
                    value={opt}
                    onChangeText={t => handleOptionChange(t, i)}
                    placeholder={`Option ${i + 1}`}
                    placeholderTextColor={colors.muted}
                    style={{ fontSize: 14, color: colors.foreground }}
                    returnKeyType="next"
                  />
                </View>
                {options.length > 2 && (
                  <Pressable onPress={() => handleRemoveOption(i)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                    <IconSymbol name="xmark.circle.fill" size={22} color={colors.error} />
                  </Pressable>
                )}
              </View>
            ))}

            {options.length < 6 && (
              <Pressable onPress={handleAddOption} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 }]}>
                <IconSymbol name="plus.circle.fill" size={18} color={colors.primary} />
                <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>Add option</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: pressed ? 0.85 : 1, marginBottom: 8 }]}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: 'white' }}>Create Poll</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Chat Screen ─────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { user: authUser } = useAuth();
  const { getMessages, sendMessage, votePoll, markChatRead } = useChat();

  const [messageText, setMessageText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // chatId == ventureId: look up the venture to get name/avatar/participants
  const { ventures, getMembersForVenture } = useVentures();
  const venture = ventures.find(v => v.id === id);
  const members = getMembersForVenture(id ?? '');
  const chat = {
    id: id ?? '',
    ventureId: id ?? '',
    ventureName: venture?.name ?? 'Venture Chat',
    avatar: venture?.images?.[0] ?? 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&q=80',
    participants: members.length,
  };
  const messages = getMessages(chat.id);

  // Mark chat as read when screen is opened or new messages arrive
  useEffect(() => {
    if (id && authUser) {
      markChatRead(id, authUser.username);
    }
  }, [id, authUser, messages.length]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSendText = () => {
    const text = messageText.trim();
    if (!text || !authUser) return;
    sendMessage(chat.id, {
      chatId: chat.id,
      authUsername: authUser.username,
      senderName: authUser.displayName,
      senderAvatar: authUser.avatar,
      type: 'text',
      text,
    });
    setMessageText('');
  };

  const handlePickImage = async () => {
    setShowAttachMenu(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0] && authUser) {
      sendMessage(chat.id, {
        chatId: chat.id,
        authUsername: authUser.username,
        senderName: authUser.displayName,
        senderAvatar: authUser.avatar,
        type: 'image',
        imageUri: result.assets[0].uri,
        text: '',
      });
    }
  };

  const handleCreatePoll = (question: string, options: string[]) => {
    if (!authUser) return;
    sendMessage(chat.id, {
      chatId: chat.id,
      authUsername: authUser.username,
      senderName: authUser.displayName,
      senderAvatar: authUser.avatar,
      type: 'poll',
      pollQuestion: question,
      pollOptions: options.map((text, i) => ({
        id: `opt-${Date.now()}-${i}`,
        text,
        votes: [],
      })),
    });
  };

  const handleVote = (messageId: string, optionId: string) => {
    if (!authUser) return;
    votePoll(chat.id, messageId, optionId, authUser.username);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.authUsername === authUser?.username;

    return (
      <View style={{ flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
        {/* Avatar (only for others) */}
        {!isMe && (
          <Image source={{ uri: item.senderAvatar }} style={{ width: 32, height: 32, borderRadius: 16 }} />
        )}

        <View style={{ maxWidth: '75%', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
          {/* Sender name (only for others) */}
          {!isMe && (
            <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 4, fontWeight: '600' }}>{item.senderName}</Text>
          )}

          {/* Message bubble */}
          {item.type === 'text' && (
            <View style={{
              backgroundColor: isMe ? colors.primary : colors.surface,
              borderRadius: 16,
              borderTopRightRadius: isMe ? 4 : 16,
              borderTopLeftRadius: isMe ? 16 : 4,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: isMe ? 0 : 1,
              borderColor: colors.border,
            }}>
              <Text style={{ fontSize: 14, color: isMe ? 'white' : colors.foreground, lineHeight: 20 }}>{item.text}</Text>
            </View>
          )}

          {item.type === 'image' && item.imageUri && (
            <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
              <Image source={{ uri: item.imageUri }} style={{ width: 220, height: 160 }} resizeMode="cover" />
              {item.imageCaption ? (
                <View style={{ backgroundColor: isMe ? colors.primary : colors.surface, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 13, color: isMe ? 'white' : colors.foreground }}>{item.imageCaption}</Text>
                </View>
              ) : null}
            </View>
          )}

          {item.type === 'poll' && (
            <PollBubble
              msg={item}
              isMe={isMe}
              authUsername={authUser?.username ?? ''}
              onVote={(optionId) => handleVote(item.id, optionId)}
              colors={colors}
            />
          )}

          {/* Timestamp */}
          <Text style={{ fontSize: 10, color: colors.muted, marginHorizontal: 4 }}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <Image source={{ uri: chat.avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} resizeMode="cover" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>{chat.ventureName}</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>{chat.participants} participants</Text>
          </View>
          <Pressable
            onPress={() => router.push(`/venture/${chat.ventureId}` as any)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={{ backgroundColor: colors.primary + '18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>View Venture</Text>
            </View>
          </Pressable>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={renderMessage}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 8 }}>
              <IconSymbol name="bubble.left.and.bubble.right.fill" size={40} color={colors.border} />
              <Text style={{ fontSize: 15, color: colors.muted }}>No messages yet</Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>Be the first to say something!</Text>
            </View>
          }
        />

        {/* Input bar */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
          {/* Attach button */}
          <Pressable
            onPress={() => setShowAttachMenu(!showAttachMenu)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}
          >
            <IconSymbol name="plus" size={18} color={colors.primary} />
          </Pressable>

          {/* Text input */}
          <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 8, minHeight: 38 }}>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              placeholderTextColor={colors.muted}
              style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}
              multiline
              maxLength={500}
              returnKeyType="default"
            />
          </View>

          {/* Send button */}
          <Pressable
            onPress={handleSendText}
            disabled={!messageText.trim()}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, width: 36, height: 36, borderRadius: 18, backgroundColor: messageText.trim() ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }]}
          >
            <IconSymbol name="paperplane.fill" size={16} color={messageText.trim() ? 'white' : colors.muted} />
          </Pressable>
        </View>

        {/* Attach menu */}
        {showAttachMenu && (
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Pressable
              onPress={handlePickImage}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, alignItems: 'center', gap: 6 }]}
            >
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#8B5CF620', alignItems: 'center', justifyContent: 'center' }}>
                <IconSymbol name="photo.fill" size={24} color="#8B5CF6" />
              </View>
              <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '500' }}>Photo</Text>
            </Pressable>

            <Pressable
              onPress={() => { setShowAttachMenu(false); setShowPollModal(true); }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, alignItems: 'center', gap: 6 }]}
            >
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
                <IconSymbol name="chart.bar.fill" size={24} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '500' }}>Poll</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      <CreatePollModal
        visible={showPollModal}
        onClose={() => setShowPollModal(false)}
        onSubmit={handleCreatePoll}
        colors={colors}
      />
    </View>
  );
}
