import { tr } from "./region";
import { Text, View } from "react-native";

// Même logique que src/components/marketplace/product-card.tsx
export function Badges({ stock, isNew, isExample, soldOut }: { stock?: number; isNew?: boolean; isExample?: boolean; soldOut?: boolean }) {
  const out = soldOut ?? stock === 0;
  const unique = stock === 1 && !isExample && !out;
  if (!unique && !isNew && !out) return null;
  return (
    <View style={{ position: "absolute", left: 6, top: 6, gap: 4, alignItems: "flex-start" }} pointerEvents="none">
      {out ? <Text style={{ backgroundColor: "#b42318", color: "#fff", fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden" }}>{tr("?puis?", "Sold out")}</Text> : null}
      {unique ? <Text style={{ backgroundColor: "#f2eadd", color: "#221812", fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden" }}>{tr("Pièce unique", "Unique piece")}</Text> : null}
      {isNew ? <Text style={{ backgroundColor: "#1c3060", color: "#fff", fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden" }}>{tr("Nouveau", "New")}</Text> : null}
    </View>
  );
}
