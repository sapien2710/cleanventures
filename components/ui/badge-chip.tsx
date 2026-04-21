import React from "react";
import { Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface BadgeChipProps {
  label: string;
  variant?: "free" | "paid" | "proposed" | "ongoing" | "finished" | "volunteer" | "contributing" | "sponsor" | "coowner" | "buyer" | "viewer" | "custom";
  customColor?: string;
  customBg?: string;
  size?: "sm" | "md";
}

export function BadgeChip({ label, variant = "custom", customColor, customBg, size = "sm" }: BadgeChipProps) {
  const colors = useColors();

  const variantStyles: Record<string, { bg: string; text: string }> = {
    free:         { bg: colors.success + '26', text: colors.success },
    paid:         { bg: colors.warning + '26', text: colors.warning },
    proposed:     { bg: colors.primary + '26', text: colors.primary },
    ongoing:      { bg: colors.accent  + '26', text: colors.accent  },
    finished:     { bg: colors.muted   + '26', text: colors.muted   },
    volunteer:    { bg: colors.success + '26', text: colors.success },
    contributing: { bg: colors.accent  + '26', text: colors.accent  },
    sponsor:      { bg: colors.warning + '26', text: colors.warning },
    coowner:      { bg: colors.primary + '26', text: colors.primary },
    buyer:        { bg: '#3B82F626',            text: '#3B82F6'      },
    viewer:       { bg: colors.muted   + '26', text: colors.muted   },
    custom:       { bg: colors.muted   + '1A', text: colors.muted   },
  };

  const s = variantStyles[variant] || variantStyles.custom;
  const paddingVertical = size === "sm" ? 2 : 4;
  const fontSize = size === "sm" ? 11 : 13;

  return (
    <View
      style={{
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical,
        backgroundColor: customBg || s.bg,
      }}
    >
      <Text
        style={{
          fontSize,
          fontWeight: '600',
          color: customColor || s.text,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
