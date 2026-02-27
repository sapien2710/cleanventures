// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for CleanVentures
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "list.bullet": "format-list-bulleted",
  "cart.fill": "shopping-cart",
  "bubble.left.fill": "chat",
  "person.fill": "person",
  // Actions
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "chevron.left": "chevron-left",
  "chevron.right": "chevron-right",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  "chart.bar.fill": "bar-chart",
  "bubble.left.and.bubble.right.fill": "forum",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "paperplane.fill": "send",
  "arrow.left": "arrow-back",
  // Content
  "map.fill": "map",
  "location.fill": "location-on",
  "magnifyingglass": "search",
  "slider.horizontal.3": "tune",
  "bell.fill": "notifications",
  "star.fill": "star",
  "heart.fill": "favorite",
  "trash.fill": "delete",
  "pencil": "edit",
  "info.circle": "info",
  "exclamationmark.triangle.fill": "warning",
  "clock.fill": "access-time",
  "calendar": "calendar-today",
  "camera.fill": "camera-alt",
  "photo.fill": "photo",
  "wallet.pass.fill": "account-balance-wallet",
  "person.2.fill": "group",
  "tag.fill": "local-offer",
  "leaf.fill": "eco",
  "trophy.fill": "emoji-events",
  "shield.fill": "shield",
  "gear": "settings",
  "questionmark.circle": "help",
  "doc.text.fill": "description",
  "arrow.clockwise": "refresh",
  "arrow.right.circle.fill": "arrow-circle-right",
  "chevron.left.forwardslash.chevron.right": "code",
  "paperplane": "send",
  "ellipsis": "more-horiz",
  "ellipsis.circle": "more-horiz",
  "flag.fill": "flag",
  "hand.thumbsup.fill": "thumb-up",
  "hand.thumbsdown.fill": "thumb-down",
  "cube.box.fill": "inventory",
  "wrench.fill": "build",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
