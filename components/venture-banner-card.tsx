import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { BadgeChip } from "@/components/ui/badge-chip";
import { HealthBar } from "@/components/ui/health-bar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import type { Venture } from "@/lib/mock-data";

interface VentureBannerCardProps {
  venture: Venture;
  onPress: () => void;
  compact?: boolean;
  /** Live member count from members store (overrides venture.volunteersJoined) */
  memberCount?: number;
  /** Live wallet balance from venture txs (overrides venture.currentFunding) */
  walletBalance?: number;
}

export function VentureBannerCard({ venture, onPress, compact = false, memberCount, walletBalance }: VentureBannerCardProps) {
  const liveVolunteers = memberCount ?? venture.volunteersJoined;
  const liveFunding = walletBalance ?? venture.currentFunding;
  const colors = useColors();

  const statusVariant = venture.status === 'proposed' ? 'proposed' : venture.status === 'ongoing' ? 'ongoing' : 'finished';
  const statusLabel = venture.status === 'proposed' ? 'Proposed' : venture.status === 'ongoing' ? 'Ongoing' : 'Finished';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
        {/* Image */}
        {!compact && (
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: venture.images[0] }}
              style={{ width: '100%', height: 144 }}
              resizeMode="cover"
            />
            {/* Badges overlay — always white text on dark pill */}
            <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 6 }}>
              <View style={{ backgroundColor: 'rgba(0,0,0,0.68)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                  {venture.isFree ? 'Free' : `₹${venture.eac}`}
                </Text>
              </View>
              <View style={{ backgroundColor: 'rgba(0,0,0,0.68)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ padding: 12, gap: 8 }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>
                {venture.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <IconSymbol name="location.fill" size={12} color={colors.muted} />
                <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>{venture.location}</Text>
              </View>
            </View>
            {compact && (
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <BadgeChip label={venture.isFree ? "Free" : `₹${venture.eac}`} variant={venture.isFree ? "free" : "paid"} />
                <BadgeChip label={statusLabel} variant={statusVariant} />
              </View>
            )}
          </View>

          {/* Capacity bar */}
          <HealthBar
            value={liveVolunteers}
            max={venture.volunteersRequired}
            variant="capacity"
            showCount
          />

          {/* Funding bar (paid only) */}
          {!venture.isFree && (
            <HealthBar
              value={liveFunding}
              max={venture.budget}
              variant="funding"
              showCount
            />
          )}

          {/* Role badges (if user is part of it) */}
          {venture.myRole && (
            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
              <BadgeChip
                label={venture.myRole === 'contributing_volunteer' ? 'Contributing' : venture.myRole.charAt(0).toUpperCase() + venture.myRole.slice(1)}
                variant={venture.myRole === 'volunteer' ? 'volunteer' : venture.myRole === 'contributing_volunteer' ? 'contributing' : 'sponsor'}
              />
              {venture.myPrivilege && (
                <BadgeChip
                  label={venture.myPrivilege === 'co-owner' ? 'Co-owner' : venture.myPrivilege.charAt(0).toUpperCase() + venture.myPrivilege.slice(1)}
                  variant={venture.myPrivilege === 'co-owner' ? 'coowner' : venture.myPrivilege === 'buyer' ? 'buyer' : 'viewer'}
                />
              )}
            </View>
          )}

          {/* Tags */}
          <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
            {venture.scope.map(s => (
              <View key={s} style={{ backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '500', textTransform: 'capitalize' }}>{s}</Text>
              </View>
            ))}
            <View style={{ backgroundColor: colors.border, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '500' }}>{venture.category}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
