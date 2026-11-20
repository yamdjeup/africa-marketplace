import React from "react";
import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";

// Shared button: primary = filled, outline = secondary; small = compact for inline row actions.
export function Btn({ children, onPress, disabled, variant = "outline", small, style, hitSlop }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean; variant?: "primary" | "outline"; small?: boolean; style?: StyleProp<ViewStyle>; hitSlop?: number }) {
  const filled = variant === "primary";
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} hitSlop={hitSlop} style={[{ borderRadius: 8, borderWidth: 1, borderColor: "#1c3060", backgroundColor: filled ? "#1c3060" : "#fff", minHeight: small ? 36 : 48, paddingHorizontal: small ? 12 : 16, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.5 : 1 }, style]}>
      <Text style={{ color: filled ? "#fff" : "#1c3060", fontWeight: "700", fontSize: small ? 13 : 15 }}>{children}</Text>
    </Pressable>
  );
}
