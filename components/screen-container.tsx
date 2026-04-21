import { View, type ViewProps } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";

export interface ScreenContainerProps extends ViewProps {
  edges?: Edge[];
  className?: string;
  containerClassName?: string;
  safeAreaClassName?: string;
}

/**
 * A container component that properly handles SafeArea and background colors.
 * Uses inline styles (not className) for colors to ensure native compatibility.
 */
export function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  style,
  ...props
}: ScreenContainerProps) {
  const colors = useColors();

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background }}
      {...props}
    >
      <SafeAreaView
        edges={edges}
        style={[{ flex: 1 }, style]}
      >
        <View style={{ flex: 1 }}>{children}</View>
      </SafeAreaView>
    </View>
  );
}
