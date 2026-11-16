import { Text, View } from "react-native";

// Même logique que src/components/marketplace/product-card.tsx
export function Badges({ stock, isNew, isExample }: { stock?: number; isNew?: boolean; isExample?: boolean }) {
  const unique = stock === 1 && !isExample;
  if (!unique && !isNew) return null;
  return (
    <View style={{ position: "absolute", left: 6, top: 6, gap: 4, alignItems: "flex-start" }} pointerEvents="none">
      {unique ? <Text style={{ backgroundColor: "#f2eadd", color: "#221812", fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden" }}>Pièce unique</Text> : null}
      {isNew ? <Text style={{ backgroundColor: "#1c3060", color: "#fff", fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden" }}>Nouveau</Text> : null}
    </View>
  );
}
