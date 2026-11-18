import type { ReactNode } from "react";
import { KeyboardAvoidingView } from "react-native";

// Android edge-to-edge (Expo SDK 54) no longer resizes the window for the keyboard, so every screen with inputs
// sits in this wrapper: it pads the bottom by the keyboard height (same behaviour on iOS and any Android phone).
export function KeyboardSafe({ children }: { children: ReactNode }) {
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">{children}</KeyboardAvoidingView>;
}
