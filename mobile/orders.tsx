import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { authed } from "./api";

type Order = {
  number: string;
  createdAt: string;
  totalCents: number;
  address: { fullName: string; street: string; postalCode: string; city: string; country: string };
  items: { slug: string; name: string; size: string | null; quantity: number; unitPriceCents: number }[];
  parcels: Parcel[];
};
type Parcel = {
  id: string; number: string; status: string; statusLabel: string; shop: { name: string; country: string } | null;
  items: { name: string; size: string | null; quantity: number }[];
  carrier: string; trackingNumber: string; trackingUrl: string | null; shippedAt: string | null; deliveredAt: string | null;
  reason: string | null; subtotalCents: number; refundStatus: string; canCancel: boolean; returnStatus: string | null; canReturn: boolean; shippedNotice: boolean;
};

function ParcelView({ p, i, n, token, reload }: { p: Parcel; i: number; n: number; token: string; reload: () => void }) {
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const date = (d: string) => new Date(d).toLocaleDateString("fr-FR");
  const refunded = ["DONE", "AWAITING", "REQUESTED"].includes(p.refundStatus);
  const cancel = () =>
    Alert.alert("Annuler ce colis ?", "Cette action est irrÃ©versible. Vous serez remboursÃ© intÃ©gralement.", [
      { text: "Garder ma commande", style: "cancel" },
      { text: "Annuler le colis", style: "destructive", onPress: async () => { setBusy(true); const r = await authed(token, "POST", "/api/v1/orders/cancel", { id: p.id }); setBusy(false); if (r.ok) reload(); else setMsg("Annulation impossible : le colis a dÃ©jÃ  Ã©tÃ© pris en charge."); } },
    ]);
  const ask = async () => {
    setBusy(true);
    const r = await authed<{ error?: string }>(token, "POST", "/api/v1/orders/return", { id: p.id, reason });
    setBusy(false);
    if (r.ok) reload(); else setMsg(r.data?.error === "reason" ? "Merci dâ€™indiquer le motif du retour (3 caractÃ¨res minimum)." : "Retour impossible pour ce colis.");
  };
  return (
    <View style={{ marginTop: 10, gap: 3 }}>
      <Text style={s.bold}>Colis {i + 1} sur {n}</Text>
      {p.shop && <Text style={s.mut}>Vendu et expÃ©diÃ© par {p.shop.name} ({p.shop.country})</Text>}
      <Text style={s.bold}>{p.statusLabel}</Text>
      {p.items.map((it, k) => <Text key={k}>{it.quantity} Ã— {it.name}{it.size ? ` (${it.size})` : ""}</Text>)}
      {p.status === "PENDING" && <Text style={s.mut}>En attente de la rÃ©ponse de la boutique (48 h maximum).</Text>}
      {p.shippedAt && <Text style={s.mut}>ExpÃ©diÃ©e le {date(p.shippedAt)}{p.carrier ? ` Â· ${p.carrier}` : ""}{p.trackingNumber ? ` Â· ${p.trackingNumber}` : ""}</Text>}
      {p.trackingUrl && <Pressable onPress={() => Linking.openURL(p.trackingUrl!)}><Text style={s.link}>Suivre mon colis</Text></Pressable>}
      {p.deliveredAt && <Text style={s.mut}>LivrÃ©e le {date(p.deliveredAt)}</Text>}
      {p.reason && <Text style={s.mut}>Motif : {p.reason}</Text>}
      {["REFUSED", "EXPIRED", "CANCELLED"].includes(p.status) && (
        <Text style={s.mut}>
          {refunded ? `Vous serez remboursÃ© de ${eur(p.subtotalCents)} sur votre moyen de paiement sous 5 Ã  10 jours ouvrÃ©s.` : p.refundStatus === "FAILED" ? "Nous revenons vers vous au sujet de votre remboursement." : "Commande annulÃ©e."}
        </Text>
      )}
      {p.canCancel && <Pressable disabled={busy} onPress={cancel}><Text style={s.link}>Annuler ma commande</Text></Pressable>}
      {p.returnStatus && <Text style={s.bold}>{p.returnStatus}</Text>}
      {p.canReturn && (
        <View style={{ gap: 6, marginTop: 4 }}>
          <Text style={s.bold}>Motif du retour</Text>
          <TextInput value={reason} onChangeText={setReason} multiline maxLength={1000} style={s.input} placeholderTextColor="#6b5d52" selectionColor="#1c3060" />
          <Pressable disabled={busy} onPress={ask}><Text style={s.link}>Demander un retour</Text></Pressable>
        </View>
      )}
      {!!msg && <Text style={{ color: "#a33" }}>{msg}</Text>}
      <Text style={[s.mut, { fontSize: 12 }]}>E pÃ³m taâ€™ est lâ€™intermÃ©diaire ; la boutique est le vendeur.</Text>
    </View>
  );
}

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} â‚¬`;
const STATUS: Record<string, string> = { PENDING: "En attente de confirmation", ACCEPTED: "ConfirmÃ©e", SHIPPED: "ExpÃ©diÃ©e", DELIVERED: "LivrÃ©e", CANCELLED: "AnnulÃ©e", REFUSED: "AnnulÃ©e", EXPIRED: "AnnulÃ©e" };

export function OrdersScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const load = () => authed<{ orders: Order[] }>(token, "GET", "/api/v1/orders").then((r) => setOrders(r.ok ? r.data.orders : []));
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Pressable onPress={onBack} hitSlop={8} style={{ marginBottom: 8 }}><Text style={s.link}>â† Mon compte</Text></Pressable>
      <Text style={s.h2}>Mes commandes</Text>
      {orders === null && <ActivityIndicator />}
      {orders?.length === 0 && <Text style={s.mut}>Vous nâ€™avez pas encore de commande.</Text>}
      {orders?.map((o) => (
        <View key={o.number} style={s.card}>
          <Text style={s.bold}>Commande {o.number}</Text>
          <Text style={s.mut}>{new Date(o.createdAt).toLocaleDateString("fr-FR")} Â· {eur(o.totalCents)}</Text>
          {o.items.map((i, k) => <Text key={k}>{i.quantity} Ã— {i.name}{i.size ? ` (${i.size})` : ""} â€” {eur(i.unitPriceCents)}</Text>)}
          <Text style={[s.mut, { marginTop: 6 }]}>Livraison : {o.address.fullName}, {o.address.street}, {o.address.postalCode} {o.address.city}</Text>
          {o.parcels.map((p, k) => <ParcelView key={p.id} p={p} i={k} n={o.parcels.length} token={token} reload={load} />)}
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
  input: { borderWidth: 1, borderColor: "#ded6c9", backgroundColor: "#fff", color: "#221812", padding: 8, minHeight: 60, textAlignVertical: "top" },
  link: { textDecorationLine: "underline", fontSize: 15, color: "#221812" },
});
