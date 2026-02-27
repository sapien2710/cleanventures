import React, { useState } from "react";
import { Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BadgeChip } from "@/components/ui/badge-chip";
import { HealthBar } from "@/components/ui/health-bar";
import { useColors } from "@/hooks/use-colors";
import { useVentures, type VentureMember, type Pledge } from "@/lib/ventures-store";
import { useWallet } from "@/lib/wallet-store";
import { useCart } from "@/lib/cart-store";
import { useNotifications } from "@/lib/notifications-store";
import { useAuth } from "@/lib/auth-store";
import { useActivity } from "@/lib/activity-store";
import {
  MOCK_VENTURES, MOCK_TASKS, MOCK_JOIN_REQUESTS, MOCK_TRANSACTIONS,
  MOCK_PRODUCTS, MOCK_SERVICES, type Transaction, type Venture
} from "@/lib/mock-data";
import { can, roleLabel as getRoleLabel, privilegeLabel } from "@/lib/permissions";

type Tab = 'mission' | 'requests' | 'tasks' | 'wallet' | 'products' | 'members';

// ─── Activity Feed ──────────────────────────────────────────────────────────
type ActivityEvent = {
  id: string;
  icon: string;
  iconColor: string;
  text: string;
  time: string;
};

function buildActivityFeed(
  ventureId: string,
  members: VentureMember[],
  tasks: { id: string; title: string; completed?: boolean }[],
  ventureTxs: { id: string; username: string; amount: number; description: string; timestamp: string }[],
  venture: { status: string; name: string; startDate: string },
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  // Venture created event (use startDate as proxy)
  events.push({
    id: 'created',
    icon: '🌱',
    iconColor: '#2d5016',
    text: `Venture "${venture.name}" was created`,
    time: venture.startDate,
  });

  // Status event
  if (venture.status === 'ongoing') {
    events.push({ id: 'activated', icon: '▶', iconColor: '#F59E0B', text: 'Venture was activated', time: '' });
  } else if (venture.status === 'finished') {
    events.push({ id: 'finished', icon: '✅', iconColor: '#22C55E', text: 'Venture marked as complete', time: '' });
  }

  // Member join events
  members.forEach((m, i) => {
    if (!m.isOwner) {
      events.push({
        id: `join-${m.id}`,
        icon: '👤',
        iconColor: '#6366F1',
        text: `${m.username} joined as ${m.role === 'contributing_volunteer' ? 'Contributing Volunteer' : m.role === 'sponsor' ? 'Sponsor' : 'Volunteer'}`,
        time: '',
      });
    }
  });

  // Task events
  tasks.forEach(t => {
    events.push({
      id: `task-${t.id}`,
      icon: '📋',
      iconColor: '#0EA5E9',
      text: `Task created: "${t.title}"`,
      time: '',
    });
    if (t.completed) {
      events.push({
        id: `task-done-${t.id}`,
        icon: '✔',
        iconColor: '#22C55E',
        text: `Task completed: "${t.title}"`,
        time: '',
      });
    }
  });

  // Fund contribution events
  ventureTxs.filter(tx => tx.amount > 0).forEach(tx => {
    events.push({
      id: `tx-${tx.id}`,
      icon: '💰',
      iconColor: '#F59E0B',
      text: `${tx.username} contributed ₹${tx.amount}`,
      time: tx.timestamp ? new Date(tx.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '',
    });
  });

  return events.slice(0, 12); // cap at 12 items
}

function ActivityFeed({ ventureId }: { ventureId: string }) {
  const colors = useColors();
  const { getMembersForVenture, getTasksForVenture, getVentureTxs, ventures } = useVentures();
  const { getEvents: getLiveEvents } = useActivity();
  const venture = ventures.find(v => v.id === ventureId);
  const members = getMembersForVenture(ventureId);
  const tasks = getTasksForVenture(ventureId);
  const ventureTxs = getVentureTxs(ventureId);

  if (!venture) return null;

  // Merge live events (newest first) with static seed events
  const liveEvents = getLiveEvents(ventureId);
  const seedEvents = buildActivityFeed(ventureId, members, tasks, ventureTxs, venture);
  // Live events go at the top (most recent actions), seed events fill history
  const liveIds = new Set(liveEvents.map(e => e.id));
  const mergedEvents = [
    ...liveEvents.map(e => ({ id: e.id, icon: e.icon, iconColor: e.iconColor, text: e.text, time: new Date(e.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })),
    ...seedEvents.filter(e => !liveIds.has(e.id)),
  ].slice(0, 20);
  const events = mergedEvents;

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>Activity</Text>
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}>
        {events.map((event, index) => (
          <View key={event.id} style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            padding: 14,
            gap: 12,
            borderBottomWidth: index < events.length - 1 ? 1 : 0,
            borderBottomColor: colors.border,
          }}>
            {/* Timeline dot + line */}
            <View style={{ alignItems: 'center', width: 32 }}>
              <View style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: event.iconColor + '18',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 14 }}>{event.icon}</Text>
              </View>
              {index < events.length - 1 && (
                <View style={{ width: 1.5, flex: 1, minHeight: 8, backgroundColor: colors.border, marginTop: 4 }} />
              )}
            </View>
            {/* Content */}
            <View style={{ flex: 1, paddingTop: 6 }}>
              <Text style={{ fontSize: 13, color: colors.foreground, lineHeight: 18 }}>{event.text}</Text>
              {event.time ? (
                <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{event.time}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Mission Tab ─────────────────────────────────────────────────────────────
function MissionTab({ venture, onJoinPress, canJoin, alreadyRequested, onStatusChange, canChangeStatus = false, canUploadPhoto = false, canSetCover = false, canRemovePhoto = false, myRole, myPrivilege }: { venture: typeof MOCK_VENTURES[0]; onJoinPress: () => void; canJoin: boolean; alreadyRequested: boolean; onStatusChange: (s: 'ongoing' | 'finished') => void; canChangeStatus?: boolean; canUploadPhoto?: boolean; canSetCover?: boolean; canRemovePhoto?: boolean; myRole?: string; myPrivilege?: string | null }) {
  const colors = useColors();
  const { updateVenture, getVentureTxs } = useVentures();
  const missionTxs = getVentureTxs(venture.id);
  const balance = missionTxs.reduce((sum, t) => sum + t.amount, 0);

  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number | null>(null);

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const newImages = [...venture.images, result.assets[0].uri];
        updateVenture(venture.id, { images: newImages });
      }
    } catch {
      Alert.alert('Photo upload', 'Could not access photo library.');
    }
  };

  const removePhoto = (idx: number) => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: () => {
          const newImages = venture.images.filter((_, i) => i !== idx);
          updateVenture(venture.id, { images: newImages });
          setSelectedPhotoIdx(null);
        },
      },
    ]);
  };

  const setAsCover = (idx: number) => {
    // Move the selected photo to index 0 (cover = first image)
    const imgs = [...venture.images];
    const [cover] = imgs.splice(idx, 1);
    updateVenture(venture.id, { images: [cover, ...imgs] });
    setSelectedPhotoIdx(0);
  };

  const allImages = venture.images;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
      {/* Capacity */}
      <View className="bg-surface rounded-2xl p-4 border border-border gap-3">
        <Text className="text-sm font-semibold text-foreground">Volunteer Capacity</Text>
        <HealthBar value={venture.volunteersJoined} max={venture.volunteersRequired} variant="capacity" showCount />
      </View>

      {/* Funding (paid only) */}
      {!venture.isFree && (
        <View className="bg-surface rounded-2xl p-4 border border-border gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-foreground">Project Funding</Text>
            <BadgeChip label={`EAC: ₹${venture.eac}`} variant="paid" />
          </View>
          <HealthBar value={balance} max={venture.budget} variant="funding" showCount />
        </View>
      )}

      {/* Description */}
      <View className="gap-2">
        <Text className="text-base font-bold text-foreground">About this Venture</Text>
        <Text className="text-sm text-muted leading-relaxed">{venture.description}</Text>
      </View>

      {/* Details */}
      <View className="bg-surface rounded-2xl p-4 border border-border gap-3">
        {[
          { icon: 'calendar' as const, label: 'Date', value: venture.startDate },
          { icon: 'location.fill' as const, label: 'Location', value: venture.location },
          { icon: 'person.2.fill' as const, label: 'Owner', value: `${venture.ownerName} · ⭐ ${venture.ownerStats.rating} · ${venture.ownerStats.completed} ventures` },
        ].map(item => (
          <View key={item.label} className="flex-row gap-3 items-start">
            <View className="w-8 h-8 bg-primaryLight rounded-lg items-center justify-center mt-0.5">
              <IconSymbol name={item.icon} size={16} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-muted font-medium">{item.label}</Text>
              <Text className="text-sm text-foreground">{item.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Tags */}
      <View className="flex-row flex-wrap gap-2">
        {venture.tags.map(tag => (
          <View key={tag} className="bg-primaryLight rounded-full px-3 py-1">
            <Text className="text-xs text-primary font-medium capitalize">{tag}</Text>
          </View>
        ))}
      </View>

      {/* Gallery */}
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-foreground">Gallery</Text>
          <Text className="text-xs text-muted">{allImages.length} photo{allImages.length !== 1 ? 's' : ''}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {allImages.map((img, i) => (
            <Pressable
              key={i}
              onPress={() => setSelectedPhotoIdx(selectedPhotoIdx === i ? null : i)}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={{ position: 'relative' }}>
                <Image source={{ uri: img }} style={{ width: 192, height: 128, borderRadius: 12, borderWidth: selectedPhotoIdx === i ? 2.5 : 0, borderColor: colors.primary }} resizeMode="cover" />
                {/* Cover badge */}
                {i === 0 && (
                  <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>Cover</Text>
                  </View>
                )}
                {/* Action bar when selected */}
                {selectedPhotoIdx === i && (
                  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden' }}>
                    {i !== 0 && (
                      <Pressable
                        onPress={() => setAsCover(i)}
                        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
                      >
                        <View style={{ backgroundColor: 'rgba(16,122,68,0.88)', paddingVertical: 7, alignItems: 'center' }}>
                          <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>Set Cover</Text>
                        </View>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => removePhoto(i)}
                      style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
                    >
                      <View style={{ backgroundColor: 'rgba(220,38,38,0.85)', paddingVertical: 7, alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>Remove</Text>
                      </View>
                    </Pressable>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
          {canUploadPhoto && (
          <Pressable
            onPress={pickPhoto}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={{ width: 192, height: 128, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconSymbol name="camera.fill" size={24} color={colors.primary} />
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Add Photo</Text>
            </View>
          </Pressable>
          )}
        </ScrollView>
      </View>

      {/* Join button — only for proposed/ongoing ventures user hasn't joined */}
      {canJoin && !alreadyRequested && (
        <Pressable
          onPress={onJoinPress}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <View className="bg-primary rounded-2xl py-4 items-center">
            <Text className="text-white font-bold text-base">Request to Join</Text>
          </View>
        </Pressable>
      )}

      {/* Request already submitted */}
      {canJoin && alreadyRequested && (
        <View style={{ backgroundColor: colors.warning + '18', borderRadius: 16, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.warning + '40' }}>
          <IconSymbol name="clock.fill" size={16} color={colors.warning} />
          <Text style={{ color: colors.warning, fontWeight: '700', fontSize: 15 }}>Request Pending</Text>
        </View>
      )}

      {/* Finished venture — cannot join */}
      {!myRole && venture.status === 'finished' && (
        <View className="bg-border/40 rounded-2xl py-4 items-center">
          <Text className="text-muted font-semibold text-sm">This venture has finished</Text>
        </View>
      )}

      {myRole && (
        <View className="bg-primaryLight rounded-2xl py-4 items-center border border-primary/30">
          <Text className="text-primary font-semibold text-sm">You are part of this venture</Text>
          <Text className="text-muted text-xs mt-0.5 capitalize">
            {myRole?.replace('_', ' ')} · {myPrivilege}
          </Text>
        </View>
      )}

      {/* Owner-only status controls */}
      {canChangeStatus && venture.status === 'proposed' && (
        <Pressable
          onPress={() => onStatusChange('ongoing')}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={{ backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <IconSymbol name="play.fill" size={16} color="white" />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Activate Venture</Text>
          </View>
        </Pressable>
      )}

      {canChangeStatus && venture.status === 'ongoing' && (
        <Pressable
          onPress={() => onStatusChange('finished')}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={{ backgroundColor: colors.success, borderRadius: 16, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="white" />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Mark as Complete</Text>
          </View>
        </Pressable>
      )}

      {/* Activity Feed */}
      <ActivityFeed ventureId={venture.id} />
    </ScrollView>
  );
}

// ─── Requests Tab ─────────────────────────────────────────────────────────────
function RequestsTab({ ventureId, isOwner, canManage = false, onApprove, onPledgeDeduct }: {
  ventureId: string;
  isOwner: boolean;
  canManage?: boolean;
  onApprove?: (member: VentureMember) => void;
  /** Called when a pledge is deducted on approval: (authUsername, displayName, amount) */
  onPledgeDeduct?: (authUsername: string, displayName: string, amount: number) => void;
}) {
  const colors = useColors();
  const { addNotification } = useNotifications();
  const { getJoinRequestsForVenture, updateJoinRequestStatus } = useVentures();
  const { emit: emitActivity } = useActivity();

  // All requests come from the store (persistent)
  const allRequests = getJoinRequestsForVenture(ventureId);

  const decide = (req: import('@/lib/mock-data').JoinRequest, action: 'approved' | 'denied') => {
    // Persist decision to store
    updateJoinRequestStatus(ventureId, req.id, action);
    addNotification({
      type: action === 'approved' ? 'join_accepted' : 'join_declined',
      title: action === 'approved' ? 'Request Approved' : 'Request Denied',
      body: action === 'approved'
        ? `${req.username} has been approved to join the venture.`
        : `${req.username}'s request has been declined.`,
      ventureId,
    });
    if (action === 'approved') {
      emitActivity(ventureId, 'member_joined', `${req.username} joined the venture as ${(req.privilege ?? 'member').replace('_', ' ')}`);
    } else {
      emitActivity(ventureId, 'member_joined', `${req.username}'s join request was declined`);
    }
    if (action === 'approved') {
      // Deduct pledge from wallet if pitch > 0
      if (req.pitch > 0 && req.authUsername && onPledgeDeduct) {
        onPledgeDeduct(req.authUsername, req.username, req.pitch);
      }
      if (onApprove) {
        onApprove({
          id: `member-${req.id}`,
          username: req.username,
          authUsername: req.authUsername,
          avatar: req.avatar,
          role: req.role as import('@/lib/mock-data').UserRole,
          privilege: (req.privilege ?? null) as import('@/lib/mock-data').UserPrivilege | null,
        });
      }
    }
  };

  const pendingRequests = allRequests.filter(r => !r.status || r.status === 'pending');
  const decidedRequests = allRequests.filter(r => r.status === 'approved' || r.status === 'denied');

  if (allRequests.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-2 p-8">
        <IconSymbol name="person.2.fill" size={40} color={colors.border} />
        <Text className="text-base font-semibold text-foreground">No pending requests</Text>
        <Text className="text-sm text-muted text-center">New join requests will appear here</Text>
      </View>
    );
  }

  const renderRequest = (item: import('@/lib/mock-data').JoinRequest, decided?: 'approved' | 'denied') => (
    <View key={item.id} style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12,
      opacity: decided ? 0.7 : 1,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Image source={{ uri: item.avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>{item.username}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <IconSymbol name="star.fill" size={11} color={colors.accent} />
            <Text style={{ fontSize: 12, color: colors.muted }}>{item.rating} rating</Text>
          </View>
        </View>
        {item.pitch > 0 && (
          <View style={{ backgroundColor: colors.warning + '25', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.warning }}>₹{item.pitch}</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <BadgeChip
          label={item.role.replace('_', ' ')}
          variant={item.role === 'volunteer' ? 'volunteer' : item.role === 'contributing_volunteer' ? 'contributing' : 'sponsor'}
        />
        {item.privilege && (
          <BadgeChip
            label={item.privilege}
            variant={item.privilege === 'co-owner' ? 'coowner' : item.privilege === 'buyer' ? 'buyer' : 'viewer'}
          />
        )}
      </View>

      <Text style={{ fontSize: 13, color: colors.muted, fontStyle: 'italic' }}>"{item.message}"</Text>

      {decided ? (
        <View style={{
          borderRadius: 14, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
          backgroundColor: decided === 'approved' ? colors.success + '18' : colors.error + '18',
          borderWidth: 1, borderColor: decided === 'approved' ? colors.success + '40' : colors.error + '40',
        }}>
          <IconSymbol name={decided === 'approved' ? 'checkmark.circle.fill' : 'xmark.circle.fill'} size={15} color={decided === 'approved' ? colors.success : colors.error} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: decided === 'approved' ? colors.success : colors.error }}>
            {decided === 'approved' ? 'Approved' : 'Denied'}
          </Text>
        </View>
      ) : isOwner ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => decide(item, 'denied')}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flex: 1 }]}
          >
            <View style={{ backgroundColor: colors.error + '12', borderRadius: 14, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: colors.error + '30' }}>
              <Text style={{ color: colors.error, fontWeight: '600', fontSize: 13 }}>Deny</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => decide(item, 'approved')}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flex: 1 }]}
          >
            <View style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 11, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Approve</Text>
            </View>
          </Pressable>
        </View>
      ) : (
        <View style={{ backgroundColor: colors.border + '40', borderRadius: 14, paddingVertical: 10, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.muted }}>Awaiting owner decision</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
      {pendingRequests.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pending ({pendingRequests.length})</Text>
          {pendingRequests.map(r => renderRequest(r))}
        </View>
      )}
      {decidedRequests.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Decided ({decidedRequests.length})</Text>
          {decidedRequests.map(r => renderRequest(r, r.status as 'approved' | 'denied'))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────
const taskStyles = StyleSheet.create({
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  formContent: { padding: 20, gap: 14, paddingBottom: 40 },
  field: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  fieldInput: { fontSize: 15, lineHeight: 22 },
  fieldInputMulti: { height: 80, textAlignVertical: 'top' },
  submitBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  submitBtnText: { fontWeight: '700', fontSize: 15 },
});

function TasksTab({ ventureId, canCreate = false, canComplete = false, canAssign = false }: { ventureId: string; canCreate?: boolean; canComplete?: boolean; canAssign?: boolean }) {
  const colors = useColors();
  const { addTask, updateTask, getTasksForVenture } = useVentures();
  const { emit: emitActivity } = useActivity();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskTag, setTaskTag] = useState('');
  // Multi-member assignment: array of selected member IDs
  const [taskAssignees, setTaskAssignees] = useState<string[]>([]);
  const [taskDueDate, setTaskDueDate] = useState('');
  const { getMembersForVenture } = useVentures();
  const members = getMembersForVenture(ventureId);
  const tasks = getTasksForVenture(ventureId);

  const toggleAssignee = (memberId: string) => {
    setTaskAssignees(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const toggleComplete = (task: { id: string; title: string; completed?: boolean }) => {
    const nowDone = !task.completed;
    updateTask(ventureId, task.id, { completed: nowDone });
    if (nowDone) {
      emitActivity(ventureId, 'task_completed', `Task completed: "${task.title}"`);
    }
  };

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Text className="text-base font-bold text-foreground">Active Tasks</Text>
        {canCreate && (
          <Pressable
            onPress={() => setShowCreateModal(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View className="flex-row items-center gap-1 bg-primary rounded-full px-3 py-1.5">
              <IconSymbol name="plus" size={14} color="white" />
              <Text className="text-white text-xs font-semibold">Create Task</Text>
            </View>
          </Pressable>
        )}
      </View>

      {tasks.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2 p-8">
          <IconSymbol name="checkmark.circle.fill" size={40} color={colors.border} />
          <Text className="text-base font-semibold text-foreground">No tasks yet</Text>
          <Text className="text-sm text-muted text-center">Create tasks to organize your cleanup effort</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isExpanded = expandedId === item.id;
            const isDone = !!item.completed;
            // Build assignee display: prefer new multi-assignee fields, fall back to legacy
            const assigneeAvatars = item.assigneeAvatars ?? (item.assigneeAvatar ? [item.assigneeAvatar] : []);
            const assigneeNames = item.assigneeNames ?? (item.assignee ? [item.assignee] : []);
            // Due date logic
            const today = new Date().toISOString().split('T')[0];
            const isOverdue = !isDone && !!item.dueDate && item.dueDate < today;
            const isDueSoon = !isDone && !isOverdue && !!item.dueDate && item.dueDate <= new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
            return (
              <View style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: isDone ? colors.success + '50' : isOverdue ? colors.error : colors.border,
                overflow: 'hidden',
                opacity: isDone ? 0.75 : 1,
              }}>
                {/* Task header row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}>
                  {/* Completion toggle */}
                  {canComplete && (
                    <Pressable
                      onPress={() => toggleComplete(item)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                      hitSlop={8}
                    >
                      <View style={{
                        width: 24, height: 24, borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isDone ? colors.success : colors.border,
                        backgroundColor: isDone ? colors.success : 'transparent',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isDone && <IconSymbol name="checkmark" size={13} color="white" />}
                      </View>
                    </Pressable>
                  )}
                  {/* Title + expand */}
                  <Pressable
                    onPress={() => setExpandedId(isExpanded ? null : item.id)}
                    style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
                  >
                    <Text style={{
                      fontSize: isExpanded ? 15 : 14,
                      fontWeight: '600',
                      color: isDone ? colors.muted : colors.foreground,
                      textDecorationLine: isDone ? 'line-through' : 'none',
                      flex: 1,
                    }}>
                      {item.title}
                    </Text>
                  </Pressable>
                  {/* Assignee avatars (stacked) */}
                  {assigneeAvatars.length > 0 && (
                    <View style={{ flexDirection: 'row' }}>
                      {assigneeAvatars.slice(0, 3).map((av, i) => (
                        <Image
                          key={i}
                          source={{ uri: av }}
                          style={{ width: 24, height: 24, borderRadius: 12, marginLeft: i > 0 ? -8 : 0, borderWidth: 1.5, borderColor: colors.surface }}
                        />
                      ))}
                      {assigneeAvatars.length > 3 && (
                        <View style={{ width: 24, height: 24, borderRadius: 12, marginLeft: -8, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.muted }}>+{assigneeAvatars.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <Pressable
                    onPress={() => setExpandedId(isExpanded ? null : item.id)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                    hitSlop={8}
                  >
                    <IconSymbol name={isExpanded ? 'chevron.up' : 'chevron.down'} size={16} color={colors.muted} />
                  </Pressable>
                </View>

                {/* Expanded body */}
                {isExpanded && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                    {item.description ? (
                      <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 10 }}>{item.description}</Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      {item.tag ? (
                        <View style={{ backgroundColor: colors.primary + '18', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600', textTransform: 'capitalize' }}>{item.tag}</Text>
                        </View>
                      ) : null}
                      {isDone && (
                        <View style={{ backgroundColor: colors.success + '18', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 11, color: colors.success, fontWeight: '700' }}>Completed</Text>
                        </View>
                      )}
                      {item.dueDate && (
                        <View style={{ backgroundColor: isOverdue ? colors.error + '18' : isDueSoon ? colors.warning + '18' : colors.border + '60', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: 10 }}>{isOverdue ? '🔴' : isDueSoon ? '🟡' : '📅'}</Text>
                          <Text style={{ fontSize: 11, color: isOverdue ? colors.error : isDueSoon ? colors.warning : colors.muted, fontWeight: '600' }}>
                            {isOverdue ? 'Overdue · ' : isDueSoon ? 'Due soon · ' : 'Due '}{item.dueDate}
                          </Text>
                        </View>
                      )}
                    </View>
                    {assigneeNames.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {assigneeNames.map((name, i) => (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.background, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border }}>
                            {assigneeAvatars[i] && <Image source={{ uri: assigneeAvatars[i] }} style={{ width: 18, height: 18, borderRadius: 9 }} />}
                            <Text style={{ fontSize: 12, color: colors.foreground, fontWeight: '500' }}>{name}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Create Task Modal — keyboard-aware */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
            onPress={() => setShowCreateModal(false)}
          >
            <Pressable onPress={() => {}} style={[taskStyles.sheet, { backgroundColor: colors.surface }]}>
              {/* Handle bar */}
              <View style={[taskStyles.handle, { backgroundColor: colors.border }]} />

              {/* Header */}
              <View style={[taskStyles.header, { borderBottomColor: colors.border }]}>
                <Text style={[taskStyles.headerTitle, { color: colors.foreground }]}>Create New Task</Text>
                <Pressable onPress={() => setShowCreateModal(false)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                  <IconSymbol name="xmark.circle.fill" size={24} color={colors.muted} />
                </Pressable>
              </View>

              {/* Scrollable form — scrolls up when keyboard appears */}
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={taskStyles.formContent}
              >
                <View style={[taskStyles.field, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[taskStyles.fieldLabel, { color: colors.muted }]}>Title *</Text>
                  <TextInput
                    value={taskTitle}
                    onChangeText={setTaskTitle}
                    placeholder="e.g. Collect trash bags from storage"
                    placeholderTextColor={colors.muted}
                    style={[taskStyles.fieldInput, { color: colors.foreground }]}
                    returnKeyType="next"
                    autoFocus
                  />
                </View>

                <View style={[taskStyles.field, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[taskStyles.fieldLabel, { color: colors.muted }]}>Description</Text>
                  <TextInput
                    value={taskDesc}
                    onChangeText={setTaskDesc}
                    placeholder="Describe what needs to be done..."
                    placeholderTextColor={colors.muted}
                    style={[taskStyles.fieldInput, taskStyles.fieldInputMulti, { color: colors.foreground }]}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    blurOnSubmit
                    returnKeyType="done"
                  />
                </View>

                {canAssign && members.length > 0 && (
                  <View style={[taskStyles.field, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[taskStyles.fieldLabel, { color: colors.muted }]}>Assign To (select multiple)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => setTaskAssignees([])}
                          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                        >
                          <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: taskAssignees.length === 0 ? colors.primary : colors.surface, borderWidth: 1, borderColor: taskAssignees.length === 0 ? colors.primary : colors.border }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: taskAssignees.length === 0 ? 'white' : colors.muted }}>Unassigned</Text>
                          </View>
                        </Pressable>
                        {members.map(m => {
                          const isSelected = taskAssignees.includes(m.id);
                          return (
                            <Pressable
                              key={m.id}
                              onPress={() => toggleAssignee(m.id)}
                              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: isSelected ? colors.primary : colors.surface, borderWidth: 1, borderColor: isSelected ? colors.primary : colors.border }}>
                                <Image source={{ uri: m.avatar }} style={{ width: 20, height: 20, borderRadius: 10 }} />
                                <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? 'white' : colors.foreground }}>{m.username}</Text>
                                {isSelected && <IconSymbol name="checkmark" size={11} color="white" />}
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}

                <View style={[taskStyles.field, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[taskStyles.fieldLabel, { color: colors.muted }]}>Due Date (optional)</Text>
                  <TextInput
                    value={taskDueDate}
                    onChangeText={setTaskDueDate}
                    placeholder="YYYY-MM-DD (e.g. 2026-03-15)"
                    placeholderTextColor={colors.muted}
                    style={[taskStyles.fieldInput, { color: colors.foreground }]}
                    returnKeyType="next"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>

                <View style={[taskStyles.field, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[taskStyles.fieldLabel, { color: colors.muted }]}>Tag</Text>
                  <TextInput
                    value={taskTag}
                    onChangeText={setTaskTag}
                    placeholder="e.g. procurement, logistics"
                    placeholderTextColor={colors.muted}
                    style={[taskStyles.fieldInput, { color: colors.foreground }]}
                    returnKeyType="done"
                  />
                </View>

                <Pressable
                  onPress={() => {
                    if (!taskTitle.trim()) return;
                    const selectedMembers = members.filter(m => taskAssignees.includes(m.id));
                    // Validate due date format if provided
                    const dueDateVal = taskDueDate.trim();
                    const dueDateFinal = dueDateVal && /^\d{4}-\d{2}-\d{2}$/.test(dueDateVal) ? dueDateVal : undefined;
                    const newTask = {
                      id: `task-${Date.now()}`,
                      ventureId,
                      title: taskTitle.trim(),
                      description: taskDesc.trim(),
                      tag: taskTag.trim() || 'general',
                      assignees: selectedMembers.length > 0 ? selectedMembers.map(m => m.id) : undefined,
                      assigneeNames: selectedMembers.length > 0 ? selectedMembers.map(m => m.username) : undefined,
                      assigneeAvatars: selectedMembers.length > 0 ? selectedMembers.map(m => m.avatar) : undefined,
                      dueDate: dueDateFinal,
                    };
                    addTask(ventureId, newTask);
                    emitActivity(ventureId, 'task_created', `Task created: "${newTask.title}"`);
                    setTaskTitle('');
                    setTaskDesc('');
                    setTaskTag('');
                    setTaskDueDate('');
                    setTaskAssignees([]);
                    setShowCreateModal(false);
                  }}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={[taskStyles.submitBtn, { backgroundColor: taskTitle.trim() ? colors.primary : colors.border }]}>
                    <Text style={[taskStyles.submitBtnText, { color: taskTitle.trim() ? 'white' : colors.muted }]}>Create Task</Text>
                  </View>
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Wallet Tab ───────────────────────────────────────────────────────────────
function WalletTab({ ventureId, venture, canContribute = false }: { ventureId: string; venture: Venture; canContribute?: boolean }) {
  const colors = useColors();
  const { getBalance, deduct } = useWallet();
  const { user: walletAuthUser } = useAuth();
  const personalBalance = walletAuthUser ? getBalance(walletAuthUser.username) : 0;
  const { getVentureTxs, addVentureTx } = useVentures();
  const { emit: emitActivity } = useActivity();
  const transactions = getVentureTxs(ventureId);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeSuccess, setContributeSuccess] = useState(false);

  const balance = transactions.reduce((sum, t) => sum + t.amount, 0);

  const handleContribute = () => {
    const amount = parseInt(contributeAmount, 10);
    if (!amount || amount <= 0) return;
    if (amount > personalBalance) {
      Alert.alert('Insufficient Balance', `Your personal wallet only has ₹${personalBalance}. Please top up first.`);
      return;
    }
    // Deduct from personal wallet
    if (walletAuthUser) deduct(walletAuthUser.username, amount, `Contribution to ${venture.name}`);
    // Add to venture transaction log (persisted)
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      ventureId,
      type: 'contribution',
      username: 'You',
      amount,
      description: 'Member contribution',
      timestamp: new Date().toISOString(),
    };
    addVentureTx(ventureId, newTx);
    emitActivity(ventureId, 'funds_contributed', `You contributed ₹${amount} to the venture`);
    setContributeAmount('');
    setContributeSuccess(true);
  };

  const typeColors: Record<string, string> = {
    contribution: colors.success,
    purchase: colors.error,
    cashout: colors.warning,
    refund: '#3B82F6',
  };

  const typeIcons: Record<string, any> = {
    contribution: 'arrow.right.circle.fill',
    purchase: 'cart.fill',
    cashout: 'wallet.pass.fill',
    refund: 'arrow.clockwise',
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
      {/* Balance card */}
      <View style={{ backgroundColor: colors.primary, borderRadius: 20, padding: 20, gap: 4 }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' }}>Venture Balance</Text>
        <Text style={{ color: 'white', fontSize: 36, fontWeight: '800' }}>₹{balance.toLocaleString()}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>Budget: ₹{venture.budget.toLocaleString()} · EAC: ₹{venture.eac}</Text>
      </View>

      {/* Contribute Funds button — only shown if user has CONTRIBUTE_FUNDS permission */}
      {canContribute && (
        <Pressable
          onPress={() => { setShowContributeModal(true); setContributeSuccess(false); }}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={{ backgroundColor: colors.success, borderRadius: 16, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <IconSymbol name="plus.circle.fill" size={18} color="white" />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Contribute Funds</Text>
          </View>
        </Pressable>
      )}
      {!canContribute && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>Join this venture to contribute funds</Text>
        </View>
      )}

      {/* Personal wallet hint */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}>
        <IconSymbol name="wallet.pass.fill" size={16} color={colors.muted} />
        <Text style={{ fontSize: 13, color: colors.muted }}>Your personal wallet: <Text style={{ fontWeight: '700', color: colors.foreground }}>₹{personalBalance.toLocaleString()}</Text></Text>
      </View>

      {/* Funding progress */}
      {!venture.isFree && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>Funding Progress</Text>
          <HealthBar value={balance} max={venture.budget} variant="funding" showCount />
        </View>
      )}

      {/* Transaction log */}
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Transaction History</Text>
        {transactions.map((tx: Transaction) => (
          <View key={tx.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: typeColors[tx.type] + '20' }}>
              <IconSymbol name={typeIcons[tx.type]} size={18} color={typeColors[tx.type]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}>{tx.description}</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>{tx.username} · {new Date(tx.timestamp).toLocaleDateString()}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: tx.amount > 0 ? colors.success : colors.error }}>
              {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount)}
            </Text>
          </View>
        ))}
        {transactions.length === 0 && (
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: 16 }}>No transactions yet</Text>
        )}
      </View>

      {/* Contribute Funds Modal */}
      <Modal visible={showContributeModal} transparent animationType="slide" onRequestClose={() => setShowContributeModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
            onPress={() => setShowContributeModal(false)}
          >
            <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />

              {contributeSuccess ? (
                <View style={{ padding: 32, alignItems: 'center', gap: 16 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.success + '20', alignItems: 'center', justifyContent: 'center' }}>
                    <IconSymbol name="checkmark.circle.fill" size={40} color={colors.success} />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>Contribution Sent!</Text>
                  <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 }}>
                    Your personal wallet has been debited and the funds have been added to this venture.
                  </Text>
                  <Pressable
                    onPress={() => setShowContributeModal(false)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, width: '100%' }]}
                  >
                    <View style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center' }}>
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Done</Text>
                    </View>
                  </Pressable>
                </View>
              ) : (
                <View style={{ padding: 24, gap: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Contribute Funds</Text>
                    <Pressable onPress={() => setShowContributeModal(false)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                      <IconSymbol name="xmark.circle.fill" size={24} color={colors.muted} />
                    </Pressable>
                  </View>

                  <View style={{ backgroundColor: colors.background, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Amount (₹)</Text>
                    <TextInput
                      value={contributeAmount}
                      onChangeText={setContributeAmount}
                      placeholder="e.g. 500"
                      placeholderTextColor={colors.muted}
                      keyboardType="numeric"
                      style={{ fontSize: 28, fontWeight: '700', color: colors.foreground }}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleContribute}
                    />
                  </View>

                  {/* Quick amounts */}
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    {[100, 250, 500, 1000].map(amt => (
                      <Pressable
                        key={amt}
                        onPress={() => setContributeAmount(String(amt))}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={[
                          { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
                          contributeAmount === String(amt)
                            ? { backgroundColor: colors.primary, borderColor: colors.primary }
                            : { backgroundColor: colors.surface, borderColor: colors.border },
                        ]}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: contributeAmount === String(amt) ? 'white' : colors.foreground }}>₹{amt}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={{ fontSize: 12, color: colors.muted }}>Available in personal wallet: <Text style={{ fontWeight: '700', color: colors.foreground }}>₹{personalBalance}</Text></Text>

                  <Pressable
                    onPress={handleContribute}
                    style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                  >
                    <View style={[
                      { borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
                      contributeAmount && parseInt(contributeAmount) > 0
                        ? { backgroundColor: colors.success }
                        : { backgroundColor: colors.border },
                    ]}>
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Confirm Contribution</Text>
                    </View>
                  </Pressable>
                </View>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

// ─── Products & Services Tab (Supplies) ──────────────────────────────────────
function ProductsTab({ ventureId }: { ventureId: string }) {
  const colors = useColors();
  const { getVentureItems } = useCart();
  const items = getVentureItems(ventureId);

  const pendingItems = items.filter(i => i.status === 'pending');
  const purchasedItems = items.filter(i => i.status === 'purchased');

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 }}>
        <IconSymbol name="cart.fill" size={40} color={colors.border} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No supplies yet</Text>
        <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 }}>
          Go to the Marketplace and add products or services to this venture's cart.
        </Text>
      </View>
    );
  }

  const renderItem = (item: ReturnType<typeof getVentureItems>[0]) => (
    <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border }}>
      <Image source={{ uri: item.image }} style={{ width: 52, height: 52, borderRadius: 10 }} resizeMode="cover" />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>{item.name}</Text>
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Qty: {item.quantity} · ₹{item.price * item.quantity}</Text>
      </View>
      <View style={[
        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
        item.status === 'pending'
          ? { backgroundColor: colors.warning + '20' }
          : { backgroundColor: colors.success + '20' },
      ]}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: item.status === 'pending' ? colors.warning : colors.success }}>
          {item.status === 'pending' ? 'Pending' : 'Purchased'}
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
      {pendingItems.length > 0 && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning }} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>Pending Purchase</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>({pendingItems.length})</Text>
          </View>
          {pendingItems.map(renderItem)}
        </View>
      )}

      {purchasedItems.length > 0 && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>Purchased</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>({purchasedItems.length})</Text>
          </View>
          {purchasedItems.map(renderItem)}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Members Tab ────────────────────────────────────────────────────────────
function MembersTab({ ventureId, isCoOwner, currentAuthUsername, onMemberRemoved }: {
  ventureId: string;
  isCoOwner: boolean;
  currentAuthUsername?: string;
  /** Called when a member is removed or leaves: triggers pledge refund */
  onMemberRemoved?: (authUsername: string, displayName: string) => void;
}) {
  const colors = useColors();
  const { getMembersForVenture, removeMember, updateMember } = useVentures();
  const { emit: emitActivity } = useActivity();
  const members = getMembersForVenture(ventureId);

  // Sheet state for editing a member's role/privilege
  const [editingMember, setEditingMember] = useState<VentureMember | null>(null);
  const [editPrivilege, setEditPrivilege] = useState<string>('');
  const [editRole, setEditRole] = useState<string>('');

  const openEdit = (m: VentureMember) => {
    setEditingMember(m);
    setEditPrivilege(m.privilege ?? 'viewer');
    setEditRole(m.role);
  };

  const saveEdit = () => {
    if (!editingMember) return;
    updateMember(ventureId, editingMember.id, {
      privilege: editPrivilege as any,
      role: editRole as any,
    });
    emitActivity(ventureId, 'member_role_changed', `${editingMember.username}'s role changed to ${editPrivilege}`);
    setEditingMember(null);
  };

  const handleRemove = (member: VentureMember) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.username} from this venture?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: () => {
            removeMember(ventureId, member.id);
            if (member.authUsername && onMemberRemoved) {
              onMemberRemoved(member.authUsername, member.username);
            }
          },
        },
      ]
    );
  };

  const handleLeave = (member: VentureMember) => {
    Alert.alert(
      'Leave Venture',
      'Are you sure you want to leave this venture? Your pledge will be refunded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave', style: 'destructive',
          onPress: () => {
            removeMember(ventureId, member.id);
            if (member.authUsername && onMemberRemoved) {
              onMemberRemoved(member.authUsername, member.username);
            }
          },
        },
      ]
    );
  };

  const memberRoleLabel = (role: string) => {
    if (role === 'contributing_volunteer') return 'Contributing Volunteer';
    if (role === 'sponsor') return 'Sponsor';
    return 'Volunteer';
  };

  const privilegeColor = (priv: string | null) => {
    if (priv === 'co-owner') return colors.primary;
    if (priv === 'admin') return '#8B5CF6';
    if (priv === 'buyer') return colors.accent ?? '#F59E0B';
    return colors.muted;
  };

  const PRIVILEGE_OPTIONS: { value: string; label: string; desc: string }[] = [
    { value: 'co-owner', label: 'Co-Owner', desc: 'Full control, second only to owner' },
    { value: 'admin', label: 'Admin', desc: 'Create & manage tasks, approve requests' },
    { value: 'buyer', label: 'Buyer', desc: 'Purchase supplies for the venture' },
    { value: 'viewer', label: 'Viewer', desc: 'Read-only access' },
  ];

  const ROLE_OPTIONS: { value: string; label: string }[] = [
    { value: 'volunteer', label: 'Volunteer' },
    { value: 'contributing_volunteer', label: 'Contributing Volunteer' },
    { value: 'sponsor', label: 'Sponsor' },
  ];

  if (members.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 }}>
        <IconSymbol name="person.2.fill" size={40} color={colors.border} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>No members yet</Text>
        <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 }}>
          Members will appear here once join requests are approved.
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
          {members.length} Member{members.length !== 1 ? 's' : ''}
        </Text>
        {members.map(member => (
          <View key={member.id} style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 14,
            borderWidth: 1,
            borderColor: member.isOwner ? colors.primary + '40' : colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}>
            <Image source={{ uri: member.avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>{member.username}</Text>
                {member.isOwner && (
                  <View style={{ backgroundColor: colors.primary + '20', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>OWNER</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 12, color: colors.muted }}>{memberRoleLabel(member.role)}</Text>
              {member.privilege && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: privilegeColor(member.privilege) }} />
                  <Text style={{ fontSize: 11, color: privilegeColor(member.privilege), fontWeight: '600' }}>
                    {member.privilege === 'co-owner' ? 'Co-Owner' : member.privilege === 'admin' ? 'Admin' : member.privilege === 'buyer' ? 'Buyer' : 'Viewer'}
                  </Text>
                </View>
              )}
            </View>
            {/* Co-owner actions: edit + remove */}
            {isCoOwner && !member.isOwner && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => openEdit(member)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <View style={{ backgroundColor: colors.primary + '15', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.primary + '30' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Edit</Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => handleRemove(member)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <View style={{ backgroundColor: colors.error + '15', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.error + '30' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.error }}>Remove</Text>
                  </View>
                </Pressable>
              </View>
            )}
            {/* Self-leave button: shown for the current user's own card (non-owner, non-co-owner) */}
            {!isCoOwner && !member.isOwner && member.authUsername === currentAuthUsername && (
              <Pressable
                onPress={() => handleLeave(member)}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <View style={{ backgroundColor: colors.error + '15', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.error + '30' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.error }}>Leave</Text>
                </View>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Edit Member Sheet */}
      <Modal
        visible={!!editingMember}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingMember(null)}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setEditingMember(null)} />
        <View style={{
          backgroundColor: colors.background,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          paddingBottom: 40,
          gap: 20,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 4 }} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }}>
            Edit {editingMember?.username}
          </Text>

          {/* Privilege picker */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Privilege</Text>
            {PRIVILEGE_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                onPress={() => setEditPrivilege(opt.value)}
                style={({ pressed }) => [{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: editPrivilege === opt.value ? colors.primary : colors.border,
                  backgroundColor: editPrivilege === opt.value ? colors.primary + '12' : colors.surface,
                  opacity: pressed ? 0.7 : 1,
                }]}
              >
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  borderWidth: 2,
                  borderColor: editPrivilege === opt.value ? colors.primary : colors.border,
                  backgroundColor: editPrivilege === opt.value ? colors.primary : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {editPrivilege === opt.value && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{opt.label}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{opt.desc}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Role picker */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Role</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ROLE_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  onPress={() => setEditRole(opt.value)}
                  style={({ pressed }) => [{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: editRole === opt.value ? colors.primary : colors.border,
                    backgroundColor: editRole === opt.value ? colors.primary + '15' : colors.surface,
                    opacity: pressed ? 0.7 : 1,
                  }]}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: editRole === opt.value ? colors.primary : colors.muted }}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Save button */}
          <Pressable
            onPress={saveEdit}
            style={({ pressed }) => [{
              backgroundColor: colors.primary,
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
            }]}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Save Changes</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function VentureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<Tab>('mission');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('volunteer');
  const [selectedPrivileges, setSelectedPrivileges] = useState<string[]>([]);
  const [pitchAmount, setPitchAmount] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [joinSubmitted, setJoinSubmitted] = useState(false);

  const { ventures, updateVentureStatus, addJoinRequest, hasRequestedJoin, addMember, getMemberForUser,
    getPledgesForVenture, recordPledge, removePledge, addVentureTx, removeMember, getMembersForVenture, getVentureTxs } = useVentures();
  const { user: authUser } = useAuth();
  const { emit: emitActivity } = useActivity();
  const { deduct: deductWallet, topup: topupWallet } = useWallet();

  // ─── Financial lifecycle helpers ─────────────────────────────────────────────

  /** Called when a join request with a pledge is approved: deduct from wallet, record pledge, add venture TX */
  const handlePledgeDeduct = (authUsername: string, displayName: string, amount: number) => {
    // Always deduct from the pledger's wallet (all users share the same device/wallet store)
    deductWallet(authUsername, amount, `Pledge to ${venture.name}`);
    recordPledge({ ventureId: venture.id, authUsername, displayName, amount });
    addVentureTx(venture.id, {
      id: `tx-pledge-${Date.now()}`,
      ventureId: venture.id,
      type: 'contribution',
      username: displayName,
      amount,
      description: `Pledge on joining`,
      timestamp: new Date().toISOString(),
    });
    emitActivity(venture.id, 'funds_contributed', `${displayName} pledged ₹${amount} on joining`);
  };

  /** Called when a member is removed or leaves: refund their pledge from venture wallet */
  const handleMemberRefund = (authUsername: string, displayName: string) => {
    const pledges = getPledgesForVenture(venture.id);
    const pledge = pledges.find(p => p.authUsername === authUsername);
    if (!pledge || pledge.amount <= 0) return;
    // Always refund to the pledger's wallet (all users share the same device/wallet store)
    topupWallet(authUsername, pledge.amount, `Refund from ${venture.name}`);
    removePledge(venture.id, authUsername);
    addVentureTx(venture.id, {
      id: `tx-refund-${Date.now()}`,
      ventureId: venture.id,
      type: 'refund',
      username: displayName,
      amount: pledge.amount,
      description: `Refund on leaving/removal`,
      timestamp: new Date().toISOString(),
    });
    emitActivity(venture.id, 'member_joined', `${displayName} left and was refunded ₹${pledge.amount}`);
  };

  /** Called when venture is marked complete: proportional payout + auto-reject pending requests */
  const handleVentureCompletion = (ventureId: string) => {
    const pledges = getPledgesForVenture(ventureId);
    const totalPledged = pledges.reduce((sum, p) => sum + p.amount, 0);
    // Get remaining balance from venture txs store
    const txs = getMembersForVenture(ventureId); // placeholder — we use addVentureTx store below
    void txs; // suppress unused warning
    const storedTxs = MOCK_TRANSACTIONS.filter(t => t.ventureId === ventureId);
    const totalContributed = storedTxs
      .filter(t => t.type === 'contribution')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalSpent = storedTxs
      .filter(t => t.type === 'purchase')
      .reduce((sum, t) => sum + t.amount, 0);
    const remaining = Math.max(0, totalContributed - totalSpent);

    if (remaining > 0 && totalPledged > 0) {
      pledges.forEach(pledge => {
        const share = pledge.amount / totalPledged;
        const refundAmount = Math.round(remaining * share);
        if (refundAmount > 0) {
          if (authUser?.username === pledge.authUsername) {
            topupWallet(pledge.authUsername, refundAmount, `Payout from completed venture ${venture.name}`);
            // Also record for currently logged-in user if they are the pledge holder
          }
          addVentureTx(ventureId, {
            id: `tx-payout-${Date.now()}-${pledge.authUsername}`,
            ventureId,
            type: 'cashout',
            username: pledge.displayName,
            amount: refundAmount,
            description: `Proportional payout (${Math.round(share * 100)}% share)`,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }
    // Clear all pledges for this venture
    pledges.forEach(p => removePledge(ventureId, p.authUsername));
    emitActivity(ventureId, 'venture_completed', `Venture completed — proportional payouts issued`);
  };
  const venture = ventures.find(v => v.id === id) || MOCK_VENTURES[0];
  // Scope to current user so other users' pending requests don't affect this user's UI
  const alreadyRequested = hasRequestedJoin(venture.id, authUser?.username);

  // Derive current user's membership from the members store (supports user switching)
  const myMembership = authUser ? getMemberForUser(venture.id, authUser.username) : null;

  // Fallback: if no member record found but the venture's ownerName matches the current user's
  // display name, treat them as the owner. This handles ventures created before the member
  // store fix (Iteration 16) where no owner member record was saved.
  const isLegacyOwner = !myMembership && authUser &&
    (venture.ownerName === authUser.displayName ||
     venture.ownerName?.toLowerCase().includes(authUser.username.toLowerCase()));

  const myRole = myMembership?.role ?? (isLegacyOwner ? 'volunteer' : undefined);
  const myPrivilege = myMembership?.privilege ?? (isLegacyOwner ? 'co-owner' : null);
  const isOwnerFlag = !!myMembership?.isOwner || !!isLegacyOwner;

  // Can only join proposed or ongoing ventures the user is not already part of
  // Members (including co-owners, admins, buyers, viewers) cannot see the join button
  const canJoin = !myMembership && !isLegacyOwner && (venture.status === 'proposed' || venture.status === 'ongoing');

  // Co-owner has all privileges same as owner
  const isCoOwner = myPrivilege === 'co-owner' || isOwnerFlag;

  // Derived permission helpers: co-owner is treated as owner for all permission checks
  const canDo = (p: Parameters<typeof can>[1]) => can(myPrivilege, p, isOwnerFlag || myPrivilege === 'co-owner');

  // Requests tab: only visible to co-owners, owners, and admins (not viewers, buyers, or pending members)
  const canSeeRequests = isOwnerFlag || isCoOwner || myPrivilege === 'admin';

  // Wallet and Supplies tabs: only visible to buyers and co-owners
  const canSeeWallet = isCoOwner || myPrivilege === 'buyer';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'mission', label: 'Mission' },
    ...(canSeeRequests ? [{ key: 'requests' as Tab, label: 'Requests' }] : []),
    { key: 'tasks', label: 'Tasks' },
    ...(canSeeWallet ? [{ key: 'wallet' as Tab, label: 'Wallet' }] : []),
    ...(canSeeWallet ? [{ key: 'products' as Tab, label: 'Supplies' }] : []),
    { key: 'members', label: 'Members' },
  ];

  const togglePrivilege = (p: string) => {
    setSelectedPrivileges(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 gap-3 border-b border-border bg-surface">
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground" numberOfLines={1}>{venture.name}</Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            <IconSymbol name="location.fill" size={10} color={colors.muted} />
            <Text className="text-xs text-muted" numberOfLines={1}>{venture.location}</Text>
          </View>
        </View>
        <View className="flex-row gap-1">
          <BadgeChip label={venture.isFree ? "Free" : "Paid"} variant={venture.isFree ? "free" : "paid"} />
          <BadgeChip
            label={venture.status.charAt(0).toUpperCase() + venture.status.slice(1)}
            variant={venture.status === 'proposed' ? 'proposed' : venture.status === 'ongoing' ? 'ongoing' : 'finished'}
          />
        </View>
      </View>

      {/* Tab bar */}
      <View className="flex-row bg-surface border-b border-border">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
          {tabs.map(tab => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <View className={`px-4 py-3 border-b-2 ${activeTab === tab.key ? 'border-primary' : 'border-transparent'}`}>
                <Text className={`text-sm font-semibold ${activeTab === tab.key ? 'text-primary' : 'text-muted'}`}>
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Tab content */}
      <View className="flex-1">
        {activeTab === 'mission' && <MissionTab
          venture={venture}
          onJoinPress={() => setShowJoinModal(true)}
          canJoin={canJoin}
          alreadyRequested={alreadyRequested}
          onStatusChange={(s) => {
            if (s === 'finished') {
              // Show confirmation dialog with payout summary before completing
              setShowCompletionConfirm(true);
            } else {
              updateVentureStatus(venture.id, s);
              emitActivity(venture.id, 'venture_activated', 'Venture was activated');
            }
          }}
          canChangeStatus={canDo('CHANGE_VENTURE_STATUS')}
          canUploadPhoto={canDo('UPLOAD_PHOTO')}
          canSetCover={canDo('SET_COVER_PHOTO')}
          canRemovePhoto={canDo('REMOVE_PHOTO')}
          myRole={myRole}
          myPrivilege={myPrivilege}
        />}
        {activeTab === 'requests' && <RequestsTab
          ventureId={venture.id}
          isOwner={isCoOwner}
          canManage={canDo('MANAGE_REQUESTS')}
          onApprove={(member) => addMember(venture.id, member)}
          onPledgeDeduct={handlePledgeDeduct}
        />}
        {activeTab === 'tasks' && <TasksTab ventureId={venture.id} canCreate={canDo('CREATE_TASK')} canComplete={canDo('COMPLETE_TASK')} canAssign={canDo('ASSIGN_TASK')} />}
        {activeTab === 'wallet' && <WalletTab ventureId={venture.id} venture={venture} canContribute={canDo('CONTRIBUTE_FUNDS')} />}
        {activeTab === 'products' && <ProductsTab ventureId={venture.id} />}
        {activeTab === 'members' && <MembersTab
          ventureId={venture.id}
          isCoOwner={canDo('REMOVE_MEMBER')}
          currentAuthUsername={authUser?.username}
          onMemberRemoved={handleMemberRefund}
        />}
      </View>

      {/* Join Request Modal */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowJoinModal(false); setJoinSubmitted(false); }}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
            onPress={() => { setShowJoinModal(false); setJoinSubmitted(false); }}
          >
            <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 }}>
              {/* Handle */}
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />

              {joinSubmitted ? (
                /* Success state */
                <View style={{ padding: 32, alignItems: 'center', gap: 16 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                    <IconSymbol name="checkmark.circle.fill" size={40} color={colors.primary} />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>Request Sent!</Text>
                  <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 }}>
                    Your request to join as a <Text style={{ color: colors.primary, fontWeight: '600' }}>{selectedRole.replace('_', ' ')}</Text> has been sent to the venture owner. You’ll be notified when they respond.
                  </Text>
                  <Pressable
                    onPress={() => { setShowJoinModal(false); setJoinSubmitted(false); }}
                    style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, width: '100%' }]}
                  >
                    <View style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center' }}>
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Done</Text>
                    </View>
                  </Pressable>
                </View>
              ) : (
                /* Form state */
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 32 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Request to Join</Text>
                    <Pressable onPress={() => setShowJoinModal(false)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                      <IconSymbol name="xmark.circle.fill" size={24} color={colors.muted} />
                    </Pressable>
                  </View>

                  <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>Select your role and optionally add a message to the venture owner.</Text>

                  {/* Role selection */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Role *</Text>
                    {[
                      { key: 'volunteer', label: 'Volunteer', desc: 'Show up and help clean — no financial commitment' },
                      { key: 'contributing_volunteer', label: 'Contributing Volunteer', desc: 'Help clean and contribute financially' },
                      { key: 'sponsor', label: 'Sponsor', desc: 'Fund the venture without participating in cleanup' },
                    ].map(role => (
                      <Pressable
                        key={role.key}
                        onPress={() => setSelectedRole(role.key)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={[
                          { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5 },
                          selectedRole === role.key
                            ? { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                            : { borderColor: colors.border, backgroundColor: colors.background },
                        ]}>
                          <View style={[
                            { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
                            { borderColor: selectedRole === role.key ? colors.primary : colors.border },
                          ]}>
                            {selectedRole === role.key && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: selectedRole === role.key ? colors.primary : colors.foreground }}>{role.label}</Text>
                            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{role.desc}</Text>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>

                  {/* Pitch amount for contributing/sponsor */}
                  {(selectedRole === 'contributing_volunteer' || selectedRole === 'sponsor') && (
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>
                        {selectedRole === 'sponsor' ? 'Sponsorship Amount (₹) *' : 'Contribution Amount (₹)'}
                      </Text>
                      {!venture.isFree && (
                        <Text style={{ fontSize: 12, color: colors.muted }}>Suggested: ₹{venture.eac} (EAC)</Text>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10 }}>
                        <Text style={{ fontSize: 16, color: colors.muted, fontWeight: '600' }}>₹</Text>
                        <TextInput
                          value={pitchAmount}
                          onChangeText={setPitchAmount}
                          placeholder="0"
                          placeholderTextColor={colors.muted}
                          keyboardType="numeric"
                          returnKeyType="done"
                          style={{ flex: 1, fontSize: 16, color: colors.foreground }}
                        />
                      </View>
                    </View>
                  )}

                  {/* Privileges */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Privileges (optional)</Text>
                    {[
                      { key: 'co-owner', label: 'Co-owner', desc: 'Full management access' },
                      { key: 'buyer', label: 'Buyer', desc: 'Can place orders from the marketplace' },
                    ].map(priv => (
                      <Pressable
                        key={priv.key}
                        onPress={() => togglePrivilege(priv.key)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={[
                          { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5 },
                          selectedPrivileges.includes(priv.key)
                            ? { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                            : { borderColor: colors.border, backgroundColor: colors.background },
                        ]}>
                          <View style={[
                            { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
                            selectedPrivileges.includes(priv.key)
                              ? { borderColor: colors.primary, backgroundColor: colors.primary }
                              : { borderColor: colors.border },
                          ]}>
                            {selectedPrivileges.includes(priv.key) && <IconSymbol name="checkmark" size={12} color="white" />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: selectedPrivileges.includes(priv.key) ? colors.primary : colors.foreground }}>{priv.label}</Text>
                            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{priv.desc}</Text>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>

                  {/* Message */}
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Message to Owner (optional)</Text>
                    <View style={{ backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10 }}>
                      <TextInput
                        value={joinMessage}
                        onChangeText={setJoinMessage}
                        placeholder="Tell the owner why you want to join..."
                        placeholderTextColor={colors.muted}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        blurOnSubmit
                        returnKeyType="done"
                        style={{ fontSize: 14, color: colors.foreground, minHeight: 72, lineHeight: 20 }}
                      />
                    </View>
                  </View>

                  {/* Send button */}
                  <Pressable
                    onPress={() => {
                      const newRequest: import('@/lib/mock-data').JoinRequest = {
                        id: `jr-${Date.now()}`,
                        ventureId: venture.id,
                        username: authUser?.displayName ?? 'Unknown',
                        authUsername: authUser?.username,
                        avatar: authUser?.avatar ?? 'https://i.pravatar.cc/150?img=1',
                        rating: 4.5,
                        role: selectedRole as import('@/lib/mock-data').UserRole,
                        privilege: (selectedPrivileges[0] ?? null) as import('@/lib/mock-data').UserPrivilege | null,
                        pitch: parseFloat(pitchAmount) || 0,
                        message: joinMessage,
                        status: 'pending',
                      };
                      addJoinRequest(venture.id, newRequest);
                      if (authUser) {
                        emitActivity(venture.id, 'member_joined', `${authUser.displayName} requested to join as ${selectedRole.replace('_', ' ')}`);
                      }
                      setJoinSubmitted(true);
                    }}
                    style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                  >
                    <View style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}>
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Send Request</Text>
                    </View>
                  </Pressable>
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Venture Completion Confirmation Modal */}
      <Modal
        visible={showCompletionConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompletionConfirm(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          onPress={() => setShowCompletionConfirm(false)}
        >
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 380, gap: 16 }}>
            {/* Header */}
            <View style={{ alignItems: 'center', gap: 8 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.success + '20', alignItems: 'center', justifyContent: 'center' }}>
                <IconSymbol name="checkmark.circle.fill" size={32} color={colors.success} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground, textAlign: 'center' }}>Mark Venture as Complete?</Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 }}>
                This will close the venture, reject all pending requests, and return remaining funds to contributors.
              </Text>
            </View>

            {/* Payout summary */}
            {(() => {
              const pledges = getPledgesForVenture(venture.id);
              const allTxs = getVentureTxs(venture.id);
              const totalContributed = allTxs.filter((t: import('@/lib/mock-data').Transaction) => t.type === 'contribution').reduce((s: number, t: import('@/lib/mock-data').Transaction) => s + t.amount, 0);
              const totalSpent = allTxs.filter((t: import('@/lib/mock-data').Transaction) => t.type === 'purchase').reduce((s: number, t: import('@/lib/mock-data').Transaction) => s + t.amount, 0);
              const remaining = Math.max(0, totalContributed - totalSpent);
              const totalPledged = pledges.reduce((s: number, p: import('@/lib/ventures-store').Pledge) => s + p.amount, 0);

              if (pledges.length === 0 && remaining === 0) {
                return (
                  <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>No pledges or remaining funds to return.</Text>
                  </View>
                );
              }

              return (
                <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Contributor</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Refund</Text>
                  </View>
                  {pledges.map((pledge: import('@/lib/ventures-store').Pledge) => {
                    const share = totalPledged > 0 ? pledge.amount / totalPledged : 0;
                    const refund = Math.round(remaining * share);
                    return (
                      <View key={pledge.authUsername} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, color: colors.foreground, flex: 1 }}>{pledge.displayName}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: refund > 0 ? colors.success : colors.muted }}>
                          {refund > 0 ? `+₹${refund}` : '—'}
                        </Text>
                      </View>
                    );
                  })}
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>Remaining balance</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>₹{remaining}</Text>
                  </View>
                </View>
              );
            })()}

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setShowCompletionConfirm(false)}
                style={({ pressed }) => [{ flex: 1, backgroundColor: colors.background, borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowCompletionConfirm(false);
                  updateVentureStatus(venture.id, 'finished');
                  handleVentureCompletion(venture.id);
                }}
                style={({ pressed }) => [{ flex: 1, backgroundColor: colors.success, borderRadius: 12, paddingVertical: 13, alignItems: 'center', opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Mark Complete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
