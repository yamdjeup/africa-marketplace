import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export type CartLine = { slug: string; name: string; creatorName: string; image: string; priceCents: number; quantity: number; maxQuantity: number };

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

export function CartScreen({ lines, onQty, onRemove, onClose }: { lines: CartLine[]; onQty: (slug: string, q: number) => void; onRemove: (slug: string) => void; onClose: () => void }) {
  const total = lines.reduce((n, l) => n + l.priceCents * l.quantity, 0);
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Pressable onPress={onClose} hitSlop={8} style={{ marginBottom: 8 }}><Text style={s.link}>← Continuer mes achats</Text></Pressable>
        <Text style={s.h2}>MON PANIER</Text>
        {lines.length === 0 && <Text style={s.mut}>Votre panier est vide.</Text>}
        {lines.map((l) => (
          <View key={l.slug} style={s.line}>
            <Image source={{ uri: l.image }} style={s.img} />
            <View style={{ flex: 1 }}>
              <Text style={s.bold} numberOfLines={1}>{l.creatorName.toUpperCase()}</Text>
              <Text numberOfLines={2}>{l.name}</Text>
              <Text style={s.bold}>{eur(l.priceCents)}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 6 }}>
                <Pressable style={s.qty} hitSlop={6} onPress={() => onQty(l.slug, l.quantity - 1)}><Text style={s.qtyText}>−</Text></Pressable>
                <Text>{l.quantity}</Text>
                <Pressable style={s.qty} hitSlop={6} onPress={() => onQty(l.slug, Math.min(l.maxQuantity, l.quantity + 1))}><Text style={s.qtyText}>+</Text></Pressable>
                <Pressable hitSlop={8} onPress={() => onRemove(l.slug)}><Text style={s.link}>Retirer</Text></Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      {lines.length > 0 && (
        <View style={s.footer}>
          <Text style={s.bold}>Sous-total : {eur(total)}</Text>
          <View style={[s.cta, { backgroundColor: "#999", marginTop: 8 }]}><Text style={s.ctaText}>PAIEMENT BIENTÔT DISPONIBLE</Text></View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  h2: { fontSize: 18, fontWeight: "700", letterSpacing: 1, marginBottom: 16 },
  mut: { fontSize: 14, color: "#666" },
  bold: { fontWeight: "700" },
  line: { flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  img: { width: 80, height: 100, backgroundColor: "#f2f2f2" },
  qty: { width: 32, height: 32, borderWidth: 1, borderColor: "#ccc", alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 18 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: "#eee" },
  cta: { height: 48, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontWeight: "700", letterSpacing: 1 },
  link: { textDecorationLine: "underline", fontSize: 15, color: "#111" },
});
