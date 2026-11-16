import { tr } from "./region";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { authed } from "./api";
import { AddressFields, EMPTY_FORM, type AddressForm } from "./addresses";

type Order = {
  number: string;
  createdAt: string;
  totalCents: number;
  address: { fullName: string; street: string; postalCode: string; city: string; country: string; line1: string; houseNumber: string; box: string; line2: string; phone: string }; canEditAddress: boolean;
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
    Alert.alert(tr("Annuler ce colis ?", "Cancel this parcel?"), "Cette action est irréversible. Vous serez remboursé intégralement.", [
      { text: "Garder ma commande", style: "cancel" },
      { text: tr("Annuler le colis", "Cancel the parcel"), style: "destructive", onPress: async () => { setBusy(true); const r = await authed(token, "POST", "/api/v1/orders/cancel", { id: p.id }); setBusy(false); if (r.ok) reload(); else setMsg("Annulation impossible : le colis a déjà été pris en charge."); } },
    ]);
  const ask = async () => {
    setBusy(true);
    const r = await authed<{ error?: string }>(token, "POST", "/api/v1/orders/return", { id: p.id, reason });
    setBusy(false);
    if (r.ok) reload(); else setMsg(r.data?.error === "reason" ? "Merci d’indiquer le motif du retour (3 caractères minimum)." : "Retour impossible pour ce colis.");
  };
  return (
    <View style={{ marginTop: 10, gap: 3 }}>
      <Text style={s.bold}>Colis {i + 1} sur {n}</Text>
      {p.shop && <Text style={s.mut}>Vendu et expédié par {p.shop.name} ({p.shop.country})</Text>}
      <Text style={s.bold}>{p.statusLabel}</Text>
      {p.items.map((it, k) => <Text key={k}>{it.quantity} × {it.name}{it.size ? ` (${it.size})` : ""}</Text>)}
      {p.status === "PENDING" && <Text style={s.mut}>En attente de la réponse de la boutique (48 h maximum).</Text>}
      {p.shippedAt && <Text style={s.mut}>Expédiée le {date(p.shippedAt)}{p.carrier ? ` · ${p.carrier}` : ""}{p.trackingNumber ? ` · ${p.trackingNumber}` : ""}</Text>}
      {p.trackingUrl && <Pressable onPress={() => Linking.openURL(p.trackingUrl!)}><Text style={s.link}>{tr("Suivre mon colis", "Track my parcel")}</Text></Pressable>}
      {p.deliveredAt && <Text style={s.mut}>Livrée le {date(p.deliveredAt)}</Text>}
      {p.reason && <Text style={s.mut}>Motif : {p.reason}</Text>}
      {["REFUSED", "EXPIRED", "CANCELLED"].includes(p.status) && (
        <Text style={s.mut}>
          {refunded ? `Vous serez remboursé de ${eur(p.subtotalCents)} sur votre moyen de paiement sous 5 à 10 jours ouvrés.` : p.refundStatus === "FAILED" ? "Nous revenons vers vous au sujet de votre remboursement." : "Commande annulée."}
        </Text>
      )}
      {p.canCancel && <Pressable disabled={busy} onPress={cancel}><Text style={s.link}>{tr("Annuler ma commande", "Cancel my order")}</Text></Pressable>}
      {p.returnStatus && <Text style={s.bold}>{p.returnStatus}</Text>}
      {p.canReturn && (
        <View style={{ gap: 6, marginTop: 4 }}>
          <Text style={s.bold}>{tr("Motif du retour", "Return reason")}</Text>
          <TextInput value={reason} onChangeText={setReason} multiline maxLength={1000} style={s.input} placeholderTextColor="#6b5d52" selectionColor="#1c3060" />
          <Pressable disabled={busy} onPress={ask}><Text style={s.link}>{tr("Demander un retour", "Request a return")}</Text></Pressable>
        </View>
      )}
      {!!msg && <Text style={{ color: "#a33" }}>{msg}</Text>}
      <Text style={[s.mut, { fontSize: 12 }]}>E póm ta’ est l’intermédiaire ; la boutique est le vendeur.</Text>
    </View>
  );
}

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;
const STATUS: Record<string, string> = { PENDING: "En attente de confirmation", ACCEPTED: "Confirmée", SHIPPED: "Expédiée", DELIVERED: "Livrée", CANCELLED: "Annulée", REFUSED: "Annulée", EXPIRED: "Annulée" };

const ADDR_ERR: Record<string, string> = { required: "Veuillez renseigner les champs obligatoires.", postal: "Ce code postal ne semble pas valide pour ce pays.", locked: "L'adresse ne peut plus être modifiée : la commande est déjà en cours d'expédition.", not_found: "Commande introuvable." };

// Reprend order-address-form.tsx / updateOrderAddress du site : modification possible tant qu'aucun colis n'est expédié.
function EditAddress({ o, token, reload }: { o: Order; token: string; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [first, ...rest] = o.address.fullName.split(" ");
  const [form, setForm] = useState<AddressForm>({ ...EMPTY_FORM, firstName: first, lastName: rest.join(" "), country: o.address.country, line1: o.address.line1, houseNumber: o.address.houseNumber ?? "", box: o.address.box, line2: o.address.line2, postalCode: o.address.postalCode, city: o.address.city, phone: o.address.phone });
  if (!o.canEditAddress) return null;
  if (!open) return <Pressable onPress={() => setOpen(true)}><Text style={s.link}>{tr("Modifier l'adresse de livraison", "Change delivery address")}</Text></Pressable>;
  const save = async () => {
    setBusy(true); setMsg("");
    const r = await authed<{ error?: string }>(token, "POST", "/api/v1/orders/address", { number: o.number, ...form });
    setBusy(false);
    if (r.ok) { setOpen(false); reload(); } else setMsg(ADDR_ERR[r.data.error ?? ""] ?? tr("Une erreur est survenue. Réessayez.", "Something went wrong. Please try again."));
  };
  return (
    <View style={{ gap: 8, marginTop: 8 }}>
      <AddressFields form={form} setForm={setForm} />
      {msg ? <Text style={{ color: "#b00020" }}>{msg}</Text> : null}
      <Pressable disabled={busy} onPress={save} style={{ backgroundColor: "#221812", padding: 14, alignItems: "center" }}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>{tr("Enregistrer l'adresse", "Save address")}</Text>}</Pressable>
      <Pressable onPress={() => setOpen(false)}><Text style={s.link}>{tr("Annuler", "Cancel")}</Text></Pressable>
    </View>
  );
}
export function OrdersScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const load = () => authed<{ orders: Order[] }>(token, "GET", "/api/v1/orders").then((r) => setOrders(r.ok ? r.data.orders : []));
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Pressable onPress={onBack} hitSlop={8} style={{ marginBottom: 8 }}><Text style={s.link}>← Mon compte</Text></Pressable>
      <Text style={s.h2}>{tr("Mes commandes", "My orders")}</Text>
      {orders === null && <ActivityIndicator />}
      {orders?.length === 0 && <Text style={s.mut}>Vous n’avez pas encore de commande.</Text>}
      {orders?.map((o) => (
        <View key={o.number} style={s.card}>
          <Text style={s.bold}>Commande {o.number}</Text>
          <Text style={s.mut}>{new Date(o.createdAt).toLocaleDateString("fr-FR")} · {eur(o.totalCents)}</Text>
          {o.items.map((i, k) => <Text key={k}>{i.quantity} × {i.name}{i.size ? ` (${i.size})` : ""} — {eur(i.unitPriceCents)}</Text>)}
          <Text style={[s.mut, { marginTop: 6 }]}>Livraison : {o.address.fullName}, {o.address.street}, {o.address.postalCode} {o.address.city}</Text>
          <EditAddress o={o} token={token} reload={load} />
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
