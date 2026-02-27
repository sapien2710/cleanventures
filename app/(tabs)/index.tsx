import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Image, Platform, Pressable, ScrollView,
  Text, TextInput, View, ActivityIndicator, StyleSheet
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { VentureMap, type VentureMapHandle } from "@/components/venture-map";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { BadgeChip } from "@/components/ui/badge-chip";
import { HealthBar } from "@/components/ui/health-bar";
import { useColors } from "@/hooks/use-colors";
import { useVentures } from "@/lib/ventures-store";
import { useNotifications } from "@/lib/notifications-store";
import { useAuth } from "@/lib/auth-store";
import type { Venture } from "@/lib/mock-data";

// Haversine distance in km
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const RADIUS_OPTIONS = [5, 10, 25, 50];

const PIN_COLORS: Record<string, string> = {
  proposed: '#2D7D46',
  ongoing: '#F5A623',
  finished: '#9BA1A6',
};

function VentureDiscoveryCard({ venture, onPress, memberCount, walletBalance }: { venture: Venture; onPress: () => void; memberCount?: number; walletBalance?: number }) {
  const colors = useColors();
  const liveVolunteers = memberCount ?? venture.volunteersJoined;
  const liveFunding = walletBalance ?? venture.currentFunding;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.discoveryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Image
          source={{ uri: venture.images[0] }}
          style={styles.discoveryImage}
          resizeMode="cover"
        />
        <View style={styles.discoveryBody}>
          <View style={styles.discoveryBadgeRow}>
            <BadgeChip label={venture.isFree ? "Free" : `₹${venture.eac}`} variant={venture.isFree ? "free" : "paid"} />
            <BadgeChip label={venture.category} variant="custom" />
          </View>
          <Text style={[styles.discoveryTitle, { color: colors.foreground }]} numberOfLines={1}>{venture.name}</Text>
          <View style={styles.discoveryLocation}>
            <IconSymbol name="location.fill" size={10} color={colors.muted} />
            <Text style={[styles.discoveryLocationText, { color: colors.muted }]} numberOfLines={1}>{venture.location}</Text>
          </View>
          <HealthBar value={liveVolunteers} max={venture.volunteersRequired} variant="capacity" showCount />
          {!venture.isFree && (
            <HealthBar value={liveFunding} max={venture.budget} variant="funding" showCount />
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { ventures, getMembersForVenture, getVentureTxs } = useVentures();

  const getLiveMemberCount = useCallback((ventureId: string) => getMembersForVenture(ventureId).length, [getMembersForVenture]);
  const getLiveWalletBalance = useCallback((ventureId: string) => {
    return getVentureTxs(ventureId).reduce((sum, tx) => sum + tx.amount, 0);
  }, [getVentureTxs]);
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const mapRef = useRef<VentureMapHandle>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [radiusKm, setRadiusKm] = useState(25);
  const [showRadiusPicker, setShowRadiusPicker] = useState(false);
  const [search, setSearch] = useState('');

  // Request GPS on mount
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          // Web geolocation
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              pos => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLocationLoading(false);
              },
              () => {
                // Fallback to Vadodara
                setUserLocation({ lat: 22.3072, lng: 73.1812 });
                setLocationLoading(false);
                setLocationError(true);
              },
              { timeout: 5000 }
            );
          } else {
            setUserLocation({ lat: 22.3072, lng: 73.1812 });
            setLocationLoading(false);
            setLocationError(true);
          }
          return;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setUserLocation({ lat: 22.3072, lng: 73.1812 });
          setLocationLoading(false);
          setLocationError(true);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setLocationLoading(false);
      } catch {
        setUserLocation({ lat: 22.3072, lng: 73.1812 });
        setLocationLoading(false);
        setLocationError(true);
      }
    })();
  }, []);

  // Map shows ALL ventures (all statuses, no radius filter) so pins are always visible
  const mapVentures = ventures.filter(v => {
    if (search.length === 0) return true;
    return (
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.location.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Discovery list below the map is filtered by radius
  const filteredVentures = ventures.filter(v => {
    const matchSearch = search.length === 0 ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.location.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (!userLocation) return true;
    const dist = getDistanceKm(userLocation.lat, userLocation.lng, v.coordinates.lat, v.coordinates.lng);
    return dist <= radiusKm;
  });

  const proposedVentures = filteredVentures.filter(v => v.status === 'proposed');
  const ongoingVentures = filteredVentures.filter(v => v.status === 'ongoing');

  const handleVenturePress = useCallback((id: string) => {
    router.push(`/venture/${id}` as any);
  }, [router]);

  const handleMarkerPress = useCallback((venture: Venture) => {
    mapRef.current?.animateTo(venture.coordinates.lat, venture.coordinates.lng, 0.05);
  }, []);

  const centerOnUser = useCallback(() => {
    if (!userLocation) return;
    mapRef.current?.animateTo(userLocation.lat, userLocation.lng, radiusKm > 20 ? 0.8 : 0.3);
  }, [userLocation, radiusKm]);

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        nestedScrollEnabled
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>CleanVentures</Text>
            <Text style={[styles.headerSub, { color: colors.muted }]}>Clean Together. Grow Together.</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Bell icon */}
            <Pressable
              onPress={() => router.push('/notifications' as any)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={{ position: 'relative' }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <IconSymbol name="bell.fill" size={18} color={colors.foreground} />
                </View>
                {unreadCount > 0 && (
                  <View style={{ position: 'absolute', top: -2, right: -2, backgroundColor: colors.error, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
            {/* Avatar */}
            <Pressable
              onPress={() => router.push('/(tabs)/account' as any)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Image
                source={{ uri: user?.avatar ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80' }}
                style={[styles.avatar, { borderColor: colors.primary }]}
              />
            </Pressable>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search ventures near you..."
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.foreground }]}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
              </Pressable>
            )}
            {/* Radius filter */}
            <Pressable
              onPress={() => setShowRadiusPicker(p => !p)}
              style={[styles.radiusBtn, { backgroundColor: colors.primaryLight }]}
            >
              <IconSymbol name="location.fill" size={12} color={colors.primary} />
              <Text style={[styles.radiusBtnText, { color: colors.primary }]}>{radiusKm}km</Text>
            </Pressable>
          </View>
          {showRadiusPicker && (
            <View style={[styles.radiusPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.radiusPickerLabel, { color: colors.muted }]}>Filter by radius</Text>
              <View style={styles.radiusPickerRow}>
                {RADIUS_OPTIONS.map(r => (
                  <Pressable
                    key={r}
                    onPress={() => { setRadiusKm(r); setShowRadiusPicker(false); }}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={[
                      styles.radiusOption,
                      { borderColor: radiusKm === r ? colors.primary : colors.border },
                      radiusKm === r && { backgroundColor: colors.primary },
                    ]}>
                      <Text style={[styles.radiusOptionText, { color: radiusKm === r ? 'white' : colors.muted }]}>{r}km</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          {locationLoading ? (
            <View style={[styles.mapPlaceholder, { backgroundColor: colors.primaryLight }]}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.mapLoadingText, { color: colors.muted }]}>Getting your location...</Text>
            </View>
          ) : (
            <VentureMap
              ref={mapRef}
              userLat={userLocation?.lat ?? 22.3072}
              userLng={userLocation?.lng ?? 73.1812}
              radiusKm={radiusKm}
              ventures={mapVentures}
              onVenturePress={handleVenturePress}
              showUserLocation={!locationError}
            />
          )}

          {/* My location button */}
          {!locationLoading && (
            <Pressable
              onPress={centerOnUser}
              style={[styles.myLocationBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <IconSymbol name="location.fill" size={18} color={colors.primary} />
            </Pressable>
          )}

          {locationError && (
            <View style={[styles.locationErrorBadge, { backgroundColor: colors.warning + 'EE' }]}>
              <Text style={styles.locationErrorText}>Using default location</Text>
            </View>
          )}
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          {[
            { label: 'Active', value: ventures.filter(v => v.status === 'ongoing').length, icon: 'leaf.fill' as const, color: colors.primary },
            { label: 'Proposed', value: ventures.filter(v => v.status === 'proposed').length, icon: 'flag.fill' as const, color: colors.accent },
            { label: 'Completed', value: ventures.filter(v => v.status === 'finished').length, icon: 'trophy.fill' as const, color: colors.success },
          ].map(stat => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name={stat.icon} size={18} color={stat.color} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Top Ventures Around You — horizontal scroll */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Ventures Around You</Text>
            <Pressable onPress={() => router.push('/(tabs)/ventures' as any)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </Pressable>
          </View>

          {proposedVentures.length === 0 ? (
            <View style={styles.emptyHint}>
              <Text style={[styles.emptyHintText, { color: colors.muted }]}>
                No proposed ventures within {radiusKm}km. Try a larger radius.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              nestedScrollEnabled
            >
              {proposedVentures.map(venture => (
                <VentureDiscoveryCard
                  key={venture.id}
                  venture={venture}
                  onPress={() => handleVenturePress(venture.id)}
                  memberCount={getLiveMemberCount(venture.id)}
                  walletBalance={getLiveWalletBalance(venture.id)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Ongoing Near You */}
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>Ongoing Near You</Text>
          {ongoingVentures.length === 0 ? (
            <Text style={[styles.emptyHintText, { color: colors.muted }]}>
              No ongoing ventures within {radiusKm}km.
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {ongoingVentures.map(venture => (
                <Pressable
                  key={venture.id}
                  onPress={() => handleVenturePress(venture.id)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={[styles.ongoingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Image
                      source={{ uri: venture.images[0] }}
                      style={styles.ongoingImage}
                      resizeMode="cover"
                    />
                    <View style={styles.ongoingBody}>
                      <View style={styles.discoveryBadgeRow}>
                        <BadgeChip label="Ongoing" variant="ongoing" />
                        {venture.isFree && <BadgeChip label="Free" variant="free" />}
                      </View>
                      <Text style={[styles.ongoingTitle, { color: colors.foreground }]} numberOfLines={1}>{venture.name}</Text>
                      <Text style={[styles.ongoingLocation, { color: colors.muted }]} numberOfLines={1}>{venture.location}</Text>
                      <HealthBar value={getLiveMemberCount(venture.id)} max={venture.volunteersRequired} variant="capacity" showCount />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2 },
  searchContainer: { paddingHorizontal: 16, marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  radiusBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  radiusBtnText: { fontSize: 11, fontWeight: '600' },
  radiusPicker: { marginTop: 8, borderRadius: 14, padding: 12, borderWidth: 1 },
  radiusPickerLabel: { fontSize: 11, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  radiusPickerRow: { flexDirection: 'row', gap: 8 },
  radiusOption: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  radiusOptionText: { fontSize: 13, fontWeight: '600' },
  mapContainer: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', height: 260, marginBottom: 16 },
  map: { width: '100%', height: '100%' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapLoadingText: { fontSize: 13 },
  myLocationBtn: { position: 'absolute', bottom: 10, right: 10, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  locationErrorBadge: { position: 'absolute', bottom: 10, left: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  locationErrorText: { fontSize: 11, color: 'white', fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 20, gap: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  emptyHint: { paddingHorizontal: 16 },
  emptyHintText: { fontSize: 13 },
  discoveryCard: { width: 200, borderRadius: 16, overflow: 'hidden', backgroundColor: 'transparent', borderWidth: 1 },
  discoveryImage: { width: '100%', height: 96 },
  discoveryBody: { padding: 10, gap: 5 },
  discoveryBadgeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  discoveryTitle: { fontSize: 13, fontWeight: '700' },
  discoveryLocation: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  discoveryLocationText: { fontSize: 11, flex: 1 },
  ongoingCard: { flexDirection: 'row', borderRadius: 16, padding: 10, borderWidth: 1, gap: 12, alignItems: 'center' },
  ongoingImage: { width: 64, height: 64, borderRadius: 12 },
  ongoingBody: { flex: 1, gap: 4 },
  ongoingTitle: { fontSize: 13, fontWeight: '700' },
  ongoingLocation: { fontSize: 11 },
});
