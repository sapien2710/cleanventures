import React, { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { VentureBannerCard } from "@/components/venture-banner-card";
import { useColors } from "@/hooks/use-colors";
import { type VentureStatus } from "@/lib/mock-data";
import { useVentures } from "@/lib/ventures-store";
import { useAuth } from "@/lib/auth-store";
import { useCallback } from "react";

type FilterStatus = 'all' | VentureStatus;
type MainTab = 'mine' | 'discover';

// ─── My Ventures Tab ──────────────────────────────────────────────────────────
function MyVenturesTab() {
  const colors = useColors();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const { ventures, getMembersForVenture, getVentureTxs } = useVentures();

  const getLiveMemberCount = useCallback((ventureId: string) => getMembersForVenture(ventureId).length, [getMembersForVenture]);
  const getLiveWalletBalance = useCallback((ventureId: string) => {
    return getVentureTxs(ventureId).reduce((sum, tx) => sum + tx.amount, 0);
  }, [getVentureTxs]);

  const myVentures = ventures.filter(v => v.myRole !== undefined);
  const filtered = myVentures.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.location.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || v.status === filter;
    return matchesSearch && matchesFilter;
  });

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'proposed', label: 'Proposed' },
    { key: 'ongoing', label: 'Ongoing' },
    { key: 'finished', label: 'Finished' },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border }}>
          <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search your ventures..."
            placeholderTextColor={colors.muted}
            style={{ marginLeft: 8, flex: 1, fontSize: 14, color: colors.foreground }}
            returnKeyType="done"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
        {filters.map(f => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={{ borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, backgroundColor: filter === f.key ? colors.primary : colors.surface, borderColor: filter === f.key ? colors.primary : colors.border }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: filter === f.key ? 'white' : colors.muted }}>
                {f.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Ventures list */}
      {filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 }}>
          <View style={{ width: 64, height: 64, backgroundColor: colors.primaryLight, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}>
            <IconSymbol name="leaf.fill" size={32} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground, textAlign: 'center' }}>No ventures found</Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>
            {search ? `No results for "${search}"` : "You haven't joined any ventures yet. Start or join one!"}
          </Text>
          <Pressable
            onPress={() => router.push('/create-venture' as any)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={{ backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 }}>
              <Text style={{ color: 'white', fontWeight: '600' }}>Start a Venture</Text>
            </View>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <VentureBannerCard
              venture={item}
              onPress={() => router.push(`/venture/${item.id}` as any)}
              memberCount={getLiveMemberCount(item.id)}
              walletBalance={getLiveWalletBalance(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

// ─── Discover Tab ─────────────────────────────────────────────────────────────
function DiscoverTab() {
  const colors = useColors();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'proposed' | 'ongoing'>('all');
  const { ventures, hasRequestedJoin, getMemberForUser, getMembersForVenture, getVentureTxs } = useVentures();
  const { user: authUser } = useAuth();

  const getLiveMemberCount = useCallback((ventureId: string) => getMembersForVenture(ventureId).length, [getMembersForVenture]);
  const getLiveWalletBalance = useCallback((ventureId: string) => {
    return getVentureTxs(ventureId).reduce((sum, tx) => sum + tx.amount, 0);
  }, [getVentureTxs]);

  const joinableVentures = ventures.filter(v => {
    const isMember = authUser ? getMemberForUser(v.id, authUser.username) !== null : false;
    return !isMember && (v.status === 'proposed' || v.status === 'ongoing');
  });

  const filtered = joinableVentures.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.location.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || v.status === filter;
    return matchesSearch && matchesFilter;
  });

  const filters: { key: 'all' | 'proposed' | 'ongoing'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'proposed', label: 'Proposed' },
    { key: 'ongoing', label: 'Active' },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border }}>
          <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search ventures to join..."
            placeholderTextColor={colors.muted}
            style={{ marginLeft: 8, flex: 1, fontSize: 14, color: colors.foreground }}
            returnKeyType="done"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
        {filters.map(f => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={{ borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, backgroundColor: filter === f.key ? colors.primary : colors.surface, borderColor: filter === f.key ? colors.primary : colors.border }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: filter === f.key ? 'white' : colors.muted }}>
                {f.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 }}>
          <View style={{ width: 64, height: 64, backgroundColor: colors.primaryLight, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}>
            <IconSymbol name="magnifyingglass" size={32} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground, textAlign: 'center' }}>No ventures found</Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>Try adjusting your search or filter.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isPending = hasRequestedJoin(item.id, authUser?.username);
            return (
              <View>
                <VentureBannerCard
                  venture={item}
                  onPress={() => router.push(`/venture/${item.id}` as any)}
                  memberCount={getLiveMemberCount(item.id)}
                  walletBalance={getLiveWalletBalance(item.id)}
                />
                {isPending && (
                  <View style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    backgroundColor: colors.warning,
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    elevation: 3,
                  }}>
                    <IconSymbol name="clock.fill" size={11} color="white" />
                    <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>Request Pending</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function VenturesScreen() {
  const colors = useColors();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MainTab>('mine');
  const { ventures, hasRequestedJoin, getMemberForUser } = useVentures();
  const { user: authUser } = useAuth();

  const pendingCount = ventures.filter(v => {
    const isMember = authUser ? getMemberForUser(v.id, authUser.username) !== null : false;
    return !isMember && hasRequestedJoin(v.id, authUser?.username);
  }).length;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.foreground }}>Ventures</Text>
        <Pressable
          onPress={() => router.push('/create-venture' as any)}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 }}>
            <IconSymbol name="plus" size={16} color="white" />
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>New Venture</Text>
          </View>
        </Pressable>
      </View>

      {/* Tab switcher */}
      <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.surface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: colors.border }}>
        {([
          { key: 'mine' as MainTab, label: 'My Ventures' },
          { key: 'discover' as MainTab, label: 'Discover' },
        ] as const).map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[
              { borderRadius: 10, paddingVertical: 9, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
              activeTab === tab.key ? { backgroundColor: colors.primary } : {},
            ]}>
              <Text style={{
                fontSize: 13,
                fontWeight: '700',
                color: activeTab === tab.key ? 'white' : colors.muted,
              }}>
                {tab.label}
              </Text>
              {tab.key === 'discover' && pendingCount > 0 && (
                <View style={{ backgroundColor: activeTab === 'discover' ? 'rgba(255,255,255,0.3)' : colors.warning, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>{pendingCount}</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === 'mine' ? <MyVenturesTab /> : <DiscoverTab />}
    </ScreenContainer>
  );
}
