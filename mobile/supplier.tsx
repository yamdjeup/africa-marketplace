import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { authed } from "./api";
import { tr } from "./region";

type Lbl = { fr: string; en: string };
type Sub = { id: string; number: string; status: string; statusLabel: Lbl; createdAt: string; customer: string; subtotalCents: number; acceptBy: string | null };

const TABS: { v: string; fr: string; en: string }[] = [
  { v: "todo", fr: "À traiter", en: "To handle" },
  { v: "PENDING", fr: "À accepter", en: "To accept" },
  { v: "SHIPPED", fr: "Expédiées", en: "Shipped" },
  { v: "all", fr: "Toutes", en: "All" },
];

/** Vrai si le compte est un fournisseur actif (contrôle serveur sur /api/v1/supplier/me). */
export function useIsSupplier(token: string | null) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!token) return setOk(false);
    authed<{ supplier: { id: string } | null }>(token, "GET", "/api/v1/supplier/me").then((r) => setOk(r.ok && !!r.data.supplier));
  }, [token]);
  return ok;
}

type Detail = { id: string; number: string; status: string; statusLabel: Lbl; createdAt: string; acceptBy: string | null; subtotalCents: number; carrier: string | null; trackingNumber: string | null; reason: string | null; items: { id: string; name: string; size: string | null; quantity: number; unitPriceCents: number }[]; shipTo: { fullName: string; address: string; postalCode: string; city: string; country: string; phone: string | null } };
const CARRIERS = ["UPS", "DHL", "Colissimo"];
const ERRS: Record<string, [string, string]> = {
  state: ["Cette commande a changé d'état (déjà traitée ou expirée).", "This order changed state (already handled or expired)."],
  reason: ["Merci d'indiquer un motif.", "Please give a reason."],
  tracking: ["Transporteur et numéro de suivi obligatoires.", "Carrier and tracking number are required."],
  stock: ["Stock insuffisant pour confirmer l'expédition.", "Not enough stock to confirm shipping."],
};

function OrderDetail({ token, id, onBack }: { token: string; id: string; onBack: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [carrier, setCarrier] = useState("UPS");
  const [other, setOther] = useState("");
  const [tracking, setTracking] = useState("");
  const load = () => authed<Detail>(token, "GET", `/api/v1/supplier/orders/${id}`).then((r) => r.ok && setD(r.data));
  useEffect(() => { load(); }, [id]);
  const act = async (body: Record<string, string>) => {
    setBusy(true); setMsg(null);
    const r = await authed<{ error?: string }>(token, "POST", `/api/v1/supplier/orders/${id}`, body);
    setBusy(false);
    if (r.ok) load();
    else { const e = ERRS[r.data.error ?? ""]; setMsg(e ? tr(e[0], e[1]) : tr("Action impossible.", "Action failed.")); }
  };
  if (!d) return <ActivityIndicator style={{ marginTop: 40 }} />;
  const o = d.shipTo;
  const btn = (label: string, onPress: () => void, ghost?: boolean) => (
    <Pressable disabled={busy} onPress={onPress} style={[st.btn, ghost && st.btnGhost, { opacity: busy ? 0.6 : 1 }]}><Text style={{ color: ghost ? "#221812" : "#fff", fontWeight: "600" }}>{label}</Text></Pressable>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} hitSlop={12} style={{ height: 44, justifyContent: "center" }} accessibilityLabel={tr("Retour", "Back")}><Text style={{ fontSize: 28 }}>←</Text></Pressable>
      <Text style={st.h2}>{tr("Commande", "Order")} {d.number}</Text>
      <Text style={st.mut}>{tr(d.statusLabel.fr, d.statusLabel.en)}</Text>
      {msg ? <Text style={{ color: "#b42318", marginTop: 8 }}>{msg}</Text> : null}
      <Text style={st.h3}>{tr("Articles", "Items")}</Text>
      {d.items.map((i) => <Text key={i.id} style={{ color: "#221812", marginTop: 4 }}>{i.quantity} × {i.name}{i.size ? ` (${i.size})` : ""} — {(i.unitPriceCents * i.quantity / 100).toFixed(2)} EUR</Text>)}
      <Text style={{ fontWeight: "600", marginTop: 8 }}>{tr("Total boutique", "Shop total")} : {(d.subtotalCents / 100).toFixed(2)} EUR</Text>
      <Text style={st.h3}>{tr("Livrer à", "Ship to")}</Text>
      <Text style={{ color: "#221812" }}>{o.fullName}</Text>
      <Text style={{ color: "#221812" }}>{o.address}, {o.postalCode} {o.city}, {o.country}</Text>
      {o.phone ? <Text style={{ color: "#221812" }}>{o.phone}</Text> : null}
      {d.status === "PENDING" ? (
        <View style={{ marginTop: 16, gap: 10 }}>
          {d.acceptBy ? <Text style={{ color: "#92400e" }}>{tr("À accepter avant le ", "Accept before ")}{new Date(d.acceptBy).toLocaleString()}</Text> : null}
          {btn(tr("Accepter la commande", "Accept order"), () => act({ action: "accept" }))}
          <TextInput value={reason} onChangeText={setReason} placeholder={tr("Motif du refus", "Reason for declining")} placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={st.input} />
          {btn(tr("Refuser", "Decline"), () => act({ action: "refuse", reason }), true)}
        </View>
      ) : null}
      {d.status === "ACCEPTED" || d.status === "PREPARING" ? (
        <View style={{ marginTop: 16, gap: 10 }}>
          {d.status === "ACCEPTED" ? btn(tr("Marquer en préparation", "Mark as preparing"), () => act({ action: "prepare" }), true) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[...CARRIERS, "__other"].map((c) => (
              <Pressable key={c} onPress={() => setCarrier(c)} style={[st.chip, carrier === c && st.chipOn]}><Text style={{ color: carrier === c ? "#fff" : "#221812" }}>{c === "__other" ? tr("Autre", "Other") : c}</Text></Pressable>
            ))}
          </View>
          {carrier === "__other" ? <TextInput value={other} onChangeText={setOther} placeholder={tr("Autre transporteur", "Other carrier")} placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={st.input} /> : null}
          <TextInput value={tracking} onChangeText={setTracking} placeholder={tr("Numéro de suivi", "Tracking number")} placeholderTextColor="#6b5d52" selectionColor="#1c3060" autoCapitalize="characters" style={st.input} />
          {btn(tr("Marquer expédiée", "Mark as shipped"), () => act({ action: "ship", carrier: carrier === "__other" ? other : carrier, tracking }))}
        </View>
      ) : null}
      {d.status === "SHIPPED" ? (
        <View style={{ marginTop: 16, gap: 10 }}>
          <Text style={{ color: "#221812" }}>{tr("Expédiée", "Shipped")} — {d.carrier} · {d.trackingNumber}</Text>
          {btn(tr("Marquer livrée", "Mark as delivered"), () => act({ action: "deliver" }))}
        </View>
      ) : null}
      {d.reason && ["REFUSED", "EXPIRED", "CANCELLED"].includes(d.status) ? <Text style={st.mut}>{tr("Motif : ", "Reason: ")}{d.reason}</Text> : null}
    </ScrollView>
  );
}

export function SupplierScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState("todo");
  const [subs, setSubs] = useState<Sub[] | null>(null);
  useEffect(() => {
    setSubs(null);
    authed<{ orders: Sub[] }>(token, "GET", `/api/v1/supplier/orders?status=${tab}`).then((r) => setSubs(r.ok ? r.data.orders : []));
  }, [token, tab]);
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Pressable onPress={onBack} hitSlop={12} style={{ height: 44, justifyContent: "center" }} accessibilityLabel={tr("Retour", "Back")}><Text style={{ fontSize: 28 }}>←</Text></Pressable>
      <Text style={st.h2}>{tr("Espace créateur", "Creator space")}</Text>
      <Text style={st.h3}>{tr("Commandes", "Orders")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 12 }}>
        {TABS.map((t) => (
          <Pressable key={t.v} onPress={() => setTab(t.v)} style={[st.chip, tab === t.v && st.chipOn]}><Text style={{ color: tab === t.v ? "#fff" : "#221812" }}>{tr(t.fr, t.en)}</Text></Pressable>
        ))}
      </View>
      {!subs ? <ActivityIndicator /> : subs.length === 0 ? <Text style={st.mut}>{tr("Aucune commande.", "No orders.")}</Text> : subs.map((x) => (
        <Pressable key={x.id} onPress={() => setOpenId(x.id)} style={st.row}>
          <Text style={{ fontWeight: "600", color: "#221812" }}>{x.number} · {tr(x.statusLabel.fr, x.statusLabel.en)}</Text>
          <Text style={st.mut}>{new Date(x.createdAt).toLocaleDateString()} · {x.customer} · {(x.subtotalCents / 100).toFixed(2)} EUR</Text>
          {x.status === "PENDING" && x.acceptBy ? <Text style={{ color: "#92400e", fontSize: 12 }}>{tr("À accepter avant le ", "Accept before ")}{new Date(x.acceptBy).toLocaleString()}</Text> : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  h2: { fontFamily: undefined, fontSize: 22, fontWeight: "600", color: "#221812" },
  h3: { fontSize: 16, fontWeight: "600", color: "#221812", marginTop: 12 },
  mut: { color: "#6b5d52", marginTop: 2 },
  chip: { borderWidth: 1, borderColor: "#ded6c9", paddingHorizontal: 12, minHeight: 40, justifyContent: "center", borderRadius: 20 },
  chipOn: { backgroundColor: "#221812", borderColor: "#221812" },
  btn: { backgroundColor: "#221812", minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 4 },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#221812" },
  input: { borderWidth: 1, borderColor: "#ded6c9", minHeight: 48, paddingHorizontal: 12, color: "#221812", backgroundColor: "#fff" },
  row: { borderTopWidth: 1, borderColor: "#ded6c9", paddingVertical: 12 },
});
