import React from "react";
import { Text, View, ViewStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface HealthBarProps {
  value: number;
  max: number;
  label?: string;
  showCount?: boolean;
  variant?: "capacity" | "funding";
  style?: ViewStyle;
}

export function HealthBar({ value, max, label, showCount = true, variant = "capacity", style }: HealthBarProps) {
  const colors = useColors();
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isCapacity = variant === "capacity";

  const barColor = isCapacity
    ? percentage >= 80 ? colors.success : percentage >= 50 ? colors.primary : colors.warning
    : percentage >= 80 ? colors.success : percentage >= 50 ? colors.accent : colors.warning;

  return (
    <View style={[{ gap: 4 }, style]}>
      {(label || showCount) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {label && <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '500' }}>{label}</Text>}
          {showCount && (
            <Text style={{ fontSize: 11, color: colors.muted }}>
              {isCapacity
                ? `${value}/${max} volunteers`
                : `₹${value.toLocaleString()} / ₹${max.toLocaleString()}`}
            </Text>
          )}
        </View>
      )}
      <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
        <View
          style={{ height: '100%', borderRadius: 4, backgroundColor: barColor, width: `${percentage}%` }}
        />
      </View>
    </View>
  );
}
