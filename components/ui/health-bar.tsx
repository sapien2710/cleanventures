import React from "react";
import { Text, View } from "react-native";
import { cn } from "@/lib/utils";

interface HealthBarProps {
  value: number;
  max: number;
  label?: string;
  showCount?: boolean;
  variant?: "capacity" | "funding";
  className?: string;
}

export function HealthBar({ value, max, label, showCount = true, variant = "capacity", className }: HealthBarProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isCapacity = variant === "capacity";

  const barColor = isCapacity
    ? percentage >= 80 ? "bg-success" : percentage >= 50 ? "bg-primary" : "bg-warning"
    : percentage >= 80 ? "bg-success" : percentage >= 50 ? "bg-accent" : "bg-warning";

  return (
    <View className={cn("gap-1", className)}>
      {(label || showCount) && (
        <View className="flex-row justify-between items-center">
          {label && <Text className="text-xs text-muted font-medium">{label}</Text>}
          {showCount && (
            <Text className="text-xs text-muted">
              {isCapacity
                ? `${value}/${max} volunteers`
                : `₹${value.toLocaleString()} / ₹${max.toLocaleString()}`}
            </Text>
          )}
        </View>
      )}
      <View className="h-2 bg-border rounded-full overflow-hidden">
        <View
          className={cn("h-full rounded-full", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </View>
    </View>
  );
}
