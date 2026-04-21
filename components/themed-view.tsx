import { View, type ViewProps } from "react-native";
import { useColors } from "@/hooks/use-colors";

export interface ThemedViewProps extends ViewProps {
  className?: string;
}

/**
 * A View component with automatic theme-aware background.
 * Uses inline styles for native compatibility.
 */
export function ThemedView({ style, ...otherProps }: ThemedViewProps) {
  const colors = useColors();
  return <View style={[{ backgroundColor: colors.background }, style]} {...otherProps} />;
}
