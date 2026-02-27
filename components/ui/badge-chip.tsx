import React from "react";
import { Text, View } from "react-native";
import { cn } from "@/lib/utils";

interface BadgeChipProps {
  label: string;
  variant?: "free" | "paid" | "proposed" | "ongoing" | "finished" | "volunteer" | "contributing" | "sponsor" | "coowner" | "buyer" | "viewer" | "custom";
  customColor?: string;
  customBg?: string;
  size?: "sm" | "md";
}

export function BadgeChip({ label, variant = "custom", customColor, customBg, size = "sm" }: BadgeChipProps) {
  const variantStyles: Record<string, { bg: string; text: string }> = {
    free: { bg: "bg-success/15", text: "text-success" },
    paid: { bg: "bg-warning/15", text: "text-warning" },
    proposed: { bg: "bg-primary/15", text: "text-primary" },
    ongoing: { bg: "bg-accent/15", text: "text-accent" },
    finished: { bg: "bg-muted/15", text: "text-muted" },
    volunteer: { bg: "bg-success/15", text: "text-success" },
    contributing: { bg: "bg-accent/15", text: "text-accent" },
    sponsor: { bg: "bg-warning/15", text: "text-warning" },
    coowner: { bg: "bg-primary/15", text: "text-primary" },
    buyer: { bg: "bg-blue-500/15", text: "text-blue-600" },
    viewer: { bg: "bg-muted/15", text: "text-muted" },
    custom: { bg: "bg-muted/10", text: "text-muted" },
  };

  const styles = variantStyles[variant] || variantStyles.custom;

  return (
    <View
      className={cn(
        "rounded-full px-2",
        size === "sm" ? "py-0.5" : "py-1",
        styles.bg
      )}
      style={customBg ? { backgroundColor: customBg } : undefined}
    >
      <Text
        className={cn(
          "font-semibold",
          size === "sm" ? "text-xs" : "text-sm",
          styles.text
        )}
        style={customColor ? { color: customColor } : undefined}
      >
        {label}
      </Text>
    </View>
  );
}
