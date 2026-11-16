import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { authed } from "./api";

type Order = {
  number: string;
  createdAt: string;
  totalCents: number;
  address: { fullName: string; street: string; postalCode: string; city: string; country: string };
  items: { slug: string; name: string; size: string | null; quantity: number; unitPriceCents: number }[];
  parcels: { number: string; status: string; carrier: string; trackingNumber: string; shippedAt: string | null; deliveredAt: string | null }[];
};

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;
const STATUS: Record<string, string> = { PENDING: "En attente de confirmation", ACCEPTED: "Confirmée", SHIPPED: "Expédiée", DELIVERED: "Livrée", CANCELLED: "Annulée", REFUSED: "Annulée", EXPIRED: "Annulée" };

export function OrdersScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => {
    authed<{ orders: Order[] }>(token, "GET", "/api/v1/orders").then((r) => setOrders(r.ok ? r.data.orders : []));
  }, [token]);
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Pressable onPress={onBack} hitSlop={8} style={{ marginBottom: 8 }}><Text style={s.link}>← Mon compte</Text></Pressable>
      <Text style={s.h2}>Mes commandes</Text>
      {orders === null && <ActivityIndicator />}
      {orders?.length === 0 && <Text style={s.mut}>Vous n’avez pas encore de commande.</Text>}
      {orders?.map((o) => (
        <View key={o.number} style={s.card}>
          <Text style={s.bold}>Commande {o.number}</Text>
          <Text style={s.mut}>{new Date(o.createdAt).toLocaleDateString("fr-FR")} · {eur(o.totalCents)}</Text>
          {o.items.map((i, k) => <Text key={k}>{i.quantity} × {i.name}{i.size ? ` (${i.size})` : ""} — {eur(i.unitPriceCents)}</Text>)}
          <Text style={[s.mut, { marginTop: 6 }]}>Livraison : {o.address.fullName}, {o.address.street}, {o.address.postalCode} {o.address.city}</Text>
          {o.parcels.map((p) => (
            <Text key={p.number} style={{ marginTop: 4 }}>
              Colis {p.number} : <Text style={s.bold}>{STATUS[p.status] ?? p.status}</Text>
              {p.carrier ? ` · ${p.carrier}` : ""}{p.trackingNumber ? ` · suivi ${p.trackingNumber}` : ""}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h2: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 18, fontWeight: "700", marginBottom: 16 },
  mut: { fontSize: 14, color: "#666" },
  bold: { fontWeight: "700" },
  card: { borderTopWidth: 1, borderTopColor: "#f2eadd", paddingVertical: 12, gap: 2 },
  link: { textDecorationLine: "underline", fontSize: 15, color: "#221812" },
});
