import { tr, lazy, getLang } from "./region";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { authed } from "./api";
import { API_URL } from "./config";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { AddressFields, EMPTY_FORM, type AddressForm } from "./addresses";

type Order = {
  number: string;
  createdAt: string;
  totalCents: number;
  address: { fullName: string; street: string; postalCode: string; city: string; country: string; line1: string; houseNumber: string; box: string; line2: string; phone: string }; canEditAddress: boolean;
  shippingCents: number; bucket: "active" | "history";
  items: { slug: string; name: string; size: string | null; quantity: number; unitPriceCents: number; image: string | null }[];
  parcels: Parcel[];
};
type Parcel = {
  id: string; number: string; status: string; statusLabel: string; shop: { name: string; country: string } | null;
  items: { name: string; size: string | null; quantity: number; unitPriceCents: number; image: string | null }[];
  timeline: { key: string; label: { fr: string; en: string }; at: string | null; reached: boolean }[];
  carrier: string; trackingNumber: string; trackingUrl: string | null; shippedAt: string | null; deliveredAt: string | null;
  reason: string | null; subtotalCents: number; refundStatus: string; canCancel: boolean; returnStatus: string | null; returnStatusEn?: string | null; canReturn: boolean; shippedNotice: boolean;
};

function ParcelView({ p, i, n, token, reload }: { p: Parcel; i: number; n: number; token: string; reload: () => void }) {
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const date = (d: string) => new Date(d).toLocaleDateString(getLang() === "en" ? "en-GB" : "fr-FR");
  const refunded = ["DONE", "AWAITING", "REQUESTED"].includes(p.refundStatus);
  const cancel = () =>
    Alert.alert(tr("Annuler ce colis ?", "Cancel this parcel?"), tr("Cette action est irréversible. Vous serez remboursé intégralement.", "This cannot be undone. You will be refunded in full."), [
      { text: tr("Garder ma commande", "Keep my order"), style: "cancel" },
      { text: tr("Annuler le colis", "Cancel the parcel"), style: "destructive", onPress: async () => { setBusy(true); const r = await authed(token, "POST", "/api/v1/orders/cancel", { id: p.id }); setBusy(false); if (r.ok) reload(); else setMsg(tr("Annulation impossible : le colis a déjà été pris en charge.", "Cancellation is not possible: the parcel has already been picked up.")); } },
    ]);
  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 5 - photos.length, quality: 1 });
    if (res.canceled) return;
    setBusy(true);
    const ids: string[] = [];
    for (const a of res.assets.slice(0, 5 - photos.length)) {
      const out = await ImageManipulator.manipulateAsync(a.uri, [{ resize: { width: 1600 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
      const form = new FormData();
      form.append("file", { uri: out.uri, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
      try {
        const up = await fetch(`${API_URL}/api/v1/orders/return/photo`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
        const data = (await up.json().catch(() => ({}))) as { id?: string };
        if (up.ok && data.id) ids.push(data.id);
      } catch {
        // photo ignorée
      }
    }
    setBusy(false);
    setPhotos((x) => [...x, ...ids]);
  };
  const ask = async () => {
    setBusy(true); setMsg("");
    const r = await authed<{ error?: string }>(token, "POST", "/api/v1/orders/return", { id: p.id, reason, photos });
    setBusy(false);
    if (r.ok) { setMsg(""); reload(); } else setMsg(r.data?.error === "reason" ? tr("Merci d’indiquer le motif du retour (3 caractères minimum).", "Please give the reason for the return (3 characters minimum).") : tr("Retour impossible pour ce colis.", "A return is not possible for this parcel."));
  };
  return (
    <View style={{ marginTop: 10, gap: 3 }}>
      <Text style={s.bold}>{n > 1 ? tr(`Colis ${i + 1} sur ${n} — `, `Parcel ${i + 1} of ${n} — `) : ""}{p.shop ? tr(`Colis expédié par ${p.shop.name} (${p.shop.country})`, `Parcel shipped by ${p.shop.name} (${p.shop.country})`) : tr("Colis", "Parcel")}</Text>
      <Timeline steps={p.timeline} />
      <Text style={s.bold}>{STATUS[p.status] ?? p.statusLabel}</Text>
      {p.items.map((it, k) => (
        <View key={k} style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
          {it.image ? <Image source={{ uri: it.image }} style={{ width: 72, height: 72, backgroundColor: "#f2eadd" }} /> : <View style={{ width: 72, height: 72, backgroundColor: "#f2eadd" }} />}
          <View style={{ flex: 1 }}><Text style={s.bold}>{it.name}</Text>{it.size ? <Text style={s.mut}>{tr("Taille", "Size")} {it.size}</Text> : null}<Text style={s.mut}>{tr("Qté", "Qty")} {it.quantity}</Text><Text style={s.bold}>{eur(it.unitPriceCents * it.quantity)}</Text></View>
        </View>
      ))}
      {p.status === "PENDING" && <Text style={s.mut}>{tr("En attente de la réponse de la boutique (48 h maximum).", "Waiting for the shop's reply (48 h maximum).")}</Text>}
      {p.shippedAt && <Text style={s.mut}>{tr("Expédiée le", "Shipped on")} {date(p.shippedAt)}{p.carrier ? ` · ${p.carrier}` : ""}{p.trackingNumber ? ` · ${p.trackingNumber}` : ""}</Text>}
      {p.trackingUrl && <Pressable onPress={() => Linking.openURL(p.trackingUrl!)}><Text style={s.link}>{tr("Suivre mon colis", "Track my parcel")}</Text></Pressable>}
      {p.deliveredAt && <Text style={s.mut}>{tr("Livrée le", "Delivered on")} {date(p.deliveredAt)}</Text>}
      {p.reason && <Text style={s.mut}>{tr("Motif", "Reason")} : {p.reason === "Annulée par le client depuis son compte" ? tr(p.reason, "Cancelled by the customer from their account") : p.reason}</Text>}
      {["REFUSED", "EXPIRED", "CANCELLED"].includes(p.status) && (
        <Text style={s.mut}>
          {refunded ? tr(`Vous serez remboursé de ${eur(p.subtotalCents)} sur votre moyen de paiement sous 5 à 10 jours ouvrés.`, `You will be refunded ${eur(p.subtotalCents)} to your payment method within 5 to 10 working days.`) : p.refundStatus === "FAILED" ? tr("Nous revenons vers vous au sujet de votre remboursement.", "We will get back to you about your refund.") : tr("Commande annulée.", "Order cancelled.")}
        </Text>
      )}
      {p.canCancel && <Pressable disabled={busy} onPress={cancel}><Text style={s.link}>{tr("Annuler ma commande", "Cancel my order")}</Text></Pressable>}
      {p.returnStatus && <Text style={s.bold}>{RET[p.returnStatus] ?? tr(p.returnStatus, p.returnStatusEn ?? p.returnStatus)}</Text>}
      {p.canReturn && (
        <View style={{ gap: 6, marginTop: 4 }}>
          <Text style={s.mut}>{tr("Les frais de livraison ne sont pas remboursés.", "Delivery fees are not refunded.")}</Text>
          <Text style={s.bold}>{tr("Motif du retour", "Return reason")}</Text>
          <TextInput value={reason} onChangeText={(v) => { setReason(v); setMsg(""); }} multiline maxLength={1000} style={s.input} placeholderTextColor="#6b5d52" selectionColor="#1c3060" />
          <Pressable disabled={busy || photos.length >= 5} onPress={pick}><Text style={s.link}>{tr(`Ajouter des photos (${photos.length}/5, facultatif)`, `Add photos (${photos.length}/5, optional)`)}</Text></Pressable>
          <Pressable disabled={busy} onPress={ask}><Text style={s.link}>{tr("Demander un retour", "Request a return")}</Text></Pressable>
        </View>
      )}
      {!!msg && <Text style={{ color: "#a33" }}>{msg}</Text>}
      {!p.canReturn && !p.returnStatus && p.status === "DELIVERED" && <ReturnInfo />}
      <Text style={[s.mut, { fontSize: 12 }]}>{tr("E póm ta’ est l’intermédiaire ; la boutique est le vendeur.", "E póm ta’ is the intermediary; the shop is the seller.")}</Text>
    </View>
  );
}

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;
const RET: Record<string, string> = lazy(() => ({ "Colis reçu": tr("Colis reçu", "Parcel received"), "Retour demandé": tr("Retour demandé", "Return requested"), "Retour accepté": tr("Retour accepté", "Return accepted"), "Retour refusé": tr("Retour refusé", "Return refused"), "Remboursé": tr("Remboursé", "Refunded") }));
const STATUS: Record<string, string> = lazy(() => ({ PENDING: tr("En attente de confirmation", "Awaiting confirmation"), ACCEPTED: tr("Confirmée", "Confirmed"), SHIPPED: tr("Expédiée", "Shipped"), DELIVERED: tr("Livrée", "Delivered"), CANCELLED: tr("Annulée", "Cancelled"), REFUSED: tr("Annulée", "Cancelled"), EXPIRED: tr("Annulée", "Cancelled") }));

const ADDR_ERR: Record<string, string> = lazy(() => ({ required: tr("Veuillez renseigner les champs obligatoires.", "Please fill in the required fields."), postal: tr("Ce code postal ne semble pas valide pour ce pays.", "This postcode does not seem valid for this country."), locked: tr("L'adresse ne peut plus être modifiée : la commande est déjà en cours d'expédition.", "The address can no longer be changed: the order is already being shipped."), not_found: tr("Commande introuvable.", "Order not found.") }));

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
const lang = () => (getLang() === "en" ? "en-GB" : "fr-FR");
const dt = (d: string) => new Date(d).toLocaleString(lang(), { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dShort = (d: string) => new Date(d).toLocaleDateString(lang(), { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "2-digit" });

// Barre de progression horizontale : étapes atteintes en noir avec leur horodatage (heure de Paris), les autres grisées sans date.
function Timeline({ steps }: { steps: Parcel["timeline"] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
      {steps.map((st, k) => (
        <View key={st.key} style={{ width: 104, alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
            <View style={{ flex: 1, height: 1, backgroundColor: k > 0 && st.reached ? "#221812" : "#ded6c9", opacity: k === 0 ? 0 : 1 }} />
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: st.reached ? "#221812" : "#fff", borderWidth: 1, borderColor: st.reached ? "#221812" : "#ded6c9" }} />
            <View style={{ flex: 1, height: 1, backgroundColor: steps[k + 1]?.reached ? "#221812" : "#ded6c9", opacity: k === steps.length - 1 ? 0 : 1 }} />
          </View>
          <Text style={{ marginTop: 6, fontSize: 12, fontWeight: st.reached ? "700" : "400", color: st.reached ? "#221812" : "#9a8f84", textAlign: "center" }}>{tr(st.label.fr, st.label.en)}</Text>
          {st.reached && st.at ? <Text style={{ fontSize: 11, color: "#6b5d52", textAlign: "center" }}>{dt(st.at)}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

function ReturnInfo() {
  const [open, setOpen] = useState(true);
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: "#ded6c9", marginTop: 10, paddingTop: 10 }}>
      <Pressable onPress={() => setOpen(!open)} style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={s.bold}>{tr("INFORMATIONS DE RETOUR", "RETURN INFORMATION")}</Text><Text>{open ? "⌃" : "⌄"}</Text></Pressable>
      {open && (
        <View style={{ gap: 6, marginTop: 6 }}>
          <Text style={s.mut}>{tr("Le délai de retour pour cet article est dépassé ou il n’est pas éligible à un retour.", "The return period for this item has expired or it is not eligible for a return.")}</Text>
          <Pressable onPress={() => Linking.openURL(`${API_URL}/${getLang()}/support/returns`)}><Text style={s.link}>{tr("Lire la politique de retour", "Read the returns policy")}</Text></Pressable>
        </View>
      )}
    </View>
  );
}

function OrderDetailScreen({ o, token, reload, onBack }: { o: Order; token: string; reload: () => void; onBack: () => void }) {
  const [open, setOpen] = useState(true);
  const count = o.items.reduce((n, i) => n + i.quantity, 0);
  const sub = o.totalCents - o.shippingCents;
  const row = (l: string, v: string, b?: boolean) => <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}><Text style={b ? s.bold : undefined}>{l}</Text><Text style={b ? s.bold : undefined}>{v}</Text></View>;
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} hitSlop={8} style={{ padding: 16 }}><Text style={s.link}>← {tr("Mes commandes", "My orders")}</Text></Pressable>
      <View style={{ backgroundColor: "#f2eadd", padding: 16 }}>
        {row(tr("Réf.", "Ref."), o.number)}
        {row(tr("Date", "Date"), dt(o.createdAt))}
        {row(tr("Articles", "Items"), String(count))}
        {row(tr("Total", "Total"), eur(o.totalCents), true)}
      </View>
      <View style={{ padding: 16 }}>
        {o.parcels.map((p, k) => <ParcelView key={p.id} p={p} i={k} n={o.parcels.length} token={token} reload={reload} />)}
        <Pressable onPress={() => setOpen(!open)} style={{ marginTop: 16, flexDirection: "row", justifyContent: "space-between" }}><Text style={s.bold}>{tr("RÉCAPITULATIF", "SUMMARY")}</Text><Text>{open ? "⌃" : "⌄"}</Text></Pressable>
        {open && (
          <View style={{ backgroundColor: "#f2eadd", padding: 16, marginTop: 8 }}>
            <Text style={s.bold}>{tr("Référence de commande", "Order reference")}</Text><Text>{o.number}</Text>
            <Text style={[s.bold, { marginTop: 10 }]}>{tr("Date de transaction", "Transaction date")}</Text><Text>{dt(o.createdAt)}</Text>
            <Text style={[s.bold, { marginTop: 10 }]}>{tr("Adresse de livraison", "Delivery address")}</Text><Text>{o.address.fullName}</Text><Text>{o.address.street}, {o.address.postalCode} {o.address.city}, {o.address.country}</Text>
            <EditAddress o={o} token={token} reload={reload} />
            <Text style={[s.bold, { marginTop: 10 }]}>{tr("Résumé", "Summary")}</Text>
            {row(`${tr("Sous-total", "Subtotal")} (${count})`, eur(sub))}
            {row(tr("Livraison", "Shipping"), eur(o.shippingCents))}
            {row(tr("Total", "Total"), eur(o.totalCents), true)}
          </View>
        )}
        <Text style={[s.h2, { marginTop: 24, marginBottom: 6 }]}>{tr("Nous sommes là pour vous aider", "We’re here to help")}</Text>
        <Text style={s.mut}>{tr("Contactez notre service client.", "Get in touch with our customer service team.")}</Text>
        <Pressable onPress={() => Linking.openURL(`${API_URL}/${getLang()}/support`)} style={{ borderWidth: 1, borderColor: "#221812", padding: 14, alignItems: "center", marginTop: 10 }}><Text style={s.bold}>{tr("Nous contacter", "Contact us")}</Text></Pressable>
      </View>
    </ScrollView>
  );
}

export function OrdersScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [sel, setSel] = useState<string | null>(null);
  const load = () => authed<{ orders: Order[] }>(token, "GET", "/api/v1/orders").then((r) => setOrders(r.ok ? r.data.orders : []));
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = orders?.find((o) => o.number === sel);
  if (cur) return <OrderDetailScreen o={cur} token={token} reload={load} onBack={() => setSel(null)} />;
  const list = (orders ?? []).filter((o) => o.bucket === tab);
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Pressable onPress={onBack} hitSlop={8} style={{ marginBottom: 8 }}><Text style={s.link}>← {tr("Mon compte", "My account")}</Text></Pressable>
      <Text style={s.h2}>{tr("Mes commandes", "My orders")}</Text>
      <View style={{ flexDirection: "row", gap: 20, marginBottom: 12 }}>
        {(["active", "history"] as const).map((v) => (
          <Pressable key={v} onPress={() => setTab(v)} style={{ paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: tab === v ? "#221812" : "transparent" }}>
            <Text style={{ fontWeight: tab === v ? "700" : "400", color: "#221812" }}>{v === "active" ? tr("COMMANDES ACTIVES", "ACTIVE ORDERS") : tr("HISTORIQUE", "ORDER HISTORY")}</Text>
          </Pressable>
        ))}
      </View>
      {orders === null && [0, 1, 2].map((k) => <View key={k} style={{ height: 64, backgroundColor: "#f2eadd", marginBottom: 12 }} />)}
      {orders !== null && list.length === 0 && <Text style={s.mut}>{orders.length === 0 ? tr("Vous n’avez pas encore de commande.", "You have no orders yet.") : tab === "active" ? tr("Aucune commande active.", "No active orders.") : tr("Aucune commande dans l’historique.", "No orders in your history.")}</Text>}
      {list.map((o) => (
        <Pressable key={o.number} onPress={() => setSel(o.number)} style={s.card} accessibilityRole="button">
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View><Text style={s.mut}>{tr("Date de commande", "Order date")}</Text><Text>{dShort(o.createdAt)}</Text></View>
            <View><Text style={s.mut}>{tr("Référence", "Reference")}</Text><Text>{o.number}</Text></View>
            <Text style={{ fontSize: 22 }}>›</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" }}>
            {o.items.slice(0, 4).map((i, k) => (i.image ? <Image key={k} source={{ uri: i.image }} style={{ width: 56, height: 56, backgroundColor: "#f2eadd" }} /> : <View key={k} style={{ width: 56, height: 56, backgroundColor: "#f2eadd" }} />))}
            {o.items.length > 4 && <Text style={s.mut}>+{o.items.length - 4}</Text>}
          </View>
        </Pressable>
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
