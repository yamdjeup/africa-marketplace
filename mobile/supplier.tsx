import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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

type Prod = { slug: string; name: string; nameEn: string; status: string; priceCents: number; stock: number; reserved: number; rejectReason: string | null; variants: { id: string; label: string; stock: number; reserved: number }[] };
const PST: Record<string, [string, string]> = { DRAFT: ["Brouillon", "Draft"], SUBMITTED: ["En modération", "Under review"], PUBLISHED: ["Publiée", "Published"], REJECTED: ["Refusée", "Rejected"] };
const PERR: Record<string, [string, string]> = {
  incomplete: ["Complétez la fiche (photo, description) sur le site avant de soumettre.", "Complete the listing (photo, description) on the website before submitting."],
  decided: ["Déjà décidée par la modération.", "Already decided by moderation."],
  undeletable: ["Suppression impossible (publiée, en modération ou déjà vendue).", "Cannot delete (published, under review or already sold)."],
  delta: ["Quantité invalide.", "Invalid quantity."],
  reason: ["Merci d'indiquer un motif.", "Please give a reason."],
  below: ["Le stock ne peut pas passer sous la quantité réservée.", "Stock cannot go below the reserved quantity."],
  variants: ["Variante invalide ou déjà existante.", "Invalid or existing variant."],
};

function ProductsPane({ token }: { token: string }) {
  const [list, setList] = useState<Prod[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [variant, setVariant] = useState("");
  const [vLabel, setVLabel] = useState("");
  const [vQty, setVQty] = useState("");
  const load = () => authed<{ products: Prod[] }>(token, "GET", "/api/v1/supplier/products").then((r) => setList(r.ok ? r.data.products : []));
  useEffect(() => { load(); }, []);
  const act = async (slug: string, body: Record<string, unknown>) => {
    setBusy(true); setMsg(null);
    const r = await authed<{ error?: string }>(token, "POST", `/api/v1/supplier/products/${slug}`, body);
    setBusy(false);
    if (r.ok) { setDelta(""); setReason(""); setVLabel(""); setVQty(""); if (body.action === "delete") setOpen(null); load(); }
    else { const e = PERR[r.data.error ?? ""]; setMsg(e ? tr(e[0], e[1]) : tr("Action impossible.", "Action failed.")); }
  };
  const btn = (label: string, onPress: () => void, ghost?: boolean) => (
    <Pressable disabled={busy} onPress={onPress} style={[st.btn, ghost && st.btnGhost, { opacity: busy ? 0.6 : 1 }]}><Text style={{ color: ghost ? "#221812" : "#fff", fontWeight: "600" }}>{label}</Text></Pressable>
  );
  if (!list) return <ActivityIndicator />;
  if (list.length === 0) return <Text style={st.mut}>{tr("Aucune création.", "No creations.")}</Text>;
  return (
    <View>
      <Text style={st.mut}>{tr("Pour créer ou modifier une fiche (photos, textes), utilisez le site.", "To create or edit a listing (photos, texts), use the website.")}</Text>
      {msg ? <Text style={{ color: "#b42318", marginTop: 8 }}>{msg}</Text> : null}
      {list.map((p) => {
        const s = PST[p.status] ?? [p.status, p.status];
        const isOpen = open === p.slug;
        return (
          <View key={p.slug} style={st.row}>
            <Pressable onPress={() => { setOpen(isOpen ? null : p.slug); setMsg(null); }}>
              <Text style={{ fontWeight: "600", color: "#221812" }}>{tr(p.name, p.nameEn)}</Text>
              <Text style={st.mut}>{tr(s[0], s[1])} · {(p.priceCents / 100).toFixed(2)} EUR · {tr("Stock", "Stock")} {p.stock} ({tr("réservé", "reserved")} {p.reserved})</Text>
            </Pressable>
            {isOpen ? (
              <View style={{ gap: 10, marginTop: 10 }}>
                {p.rejectReason && p.status === "REJECTED" ? <Text style={st.mut}>{tr("Motif : ", "Reason: ")}{p.rejectReason}</Text> : null}
                {p.variants.map((v) => <Text key={v.id} style={{ color: "#221812" }}>{v.label} : {v.stock} ({tr("réservé", "reserved")} {v.reserved})</Text>)}
                <Text style={st.h3}>{tr("Ajuster le stock", "Adjust stock")}</Text>
                {p.variants.length > 0 ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {p.variants.map((v) => <Pressable key={v.id} onPress={() => setVariant(v.label)} style={[st.chip, variant === v.label && st.chipOn]}><Text style={{ color: variant === v.label ? "#fff" : "#221812" }}>{v.label}</Text></Pressable>)}
                  </View>
                ) : null}
                <TextInput value={delta} onChangeText={(t) => setDelta(t.replace(/[^\d-]/g, ""))} keyboardType="numbers-and-punctuation" placeholder={tr("Quantité (+ entrée, − correction)", "Quantity (+ entry, − correction)")} placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={st.input} />
                <TextInput value={reason} onChangeText={setReason} placeholder={tr("Motif", "Reason")} placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={st.input} />
                {btn(tr("Enregistrer le stock", "Save stock"), () => act(p.slug, { action: "adjust", type: Number(delta) > 0 ? "ENTRY" : "ADJUST", delta, reason, variant }))}
                <Text style={st.h3}>{tr("Nouvelle variante", "New variant")}</Text>
                <TextInput value={vLabel} onChangeText={setVLabel} placeholder={tr("Libellé (taille…)", "Label (size…)")} placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={st.input} />
                <TextInput value={vQty} onChangeText={(t) => setVQty(t.replace(/\D/g, ""))} keyboardType="number-pad" placeholder={tr("Quantité", "Quantity")} placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={st.input} />
                {btn(tr("Ajouter la variante", "Add variant"), () => act(p.slug, { action: "addVariant", label: vLabel, qty: vQty }), true)}
                {p.status === "DRAFT" || p.status === "REJECTED" ? btn(tr("Soumettre à la modération", "Submit for review"), () => act(p.slug, { action: "submit" })) : null}
                {p.status === "SUBMITTED" ? btn(tr("Retirer la soumission", "Withdraw submission"), () => act(p.slug, { action: "withdraw" }), true) : null}
                {p.status === "DRAFT" || p.status === "REJECTED" ? btn(tr("Supprimer", "Delete"), () => Alert.alert(tr("Supprimer cette création ?", "Delete this creation?"), "", [{ text: tr("Annuler", "Cancel") }, { text: tr("Supprimer", "Delete"), style: "destructive", onPress: () => act(p.slug, { action: "delete" }) }]), true) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function SupplierScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [section, setSection] = useState<"orders" | "works">("orders");
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState("todo");
  const [subs, setSubs] = useState<Sub[] | null>(null);
  useEffect(() => {
    setSubs(null);
    authed<{ orders: Sub[] }>(token, "GET", `/api/v1/supplier/orders?status=${tab}`).then((r) => setSubs(r.ok ? r.data.orders : []));
  }, [token, tab]);
  if (openId) return <OrderDetail token={token} id={openId} onBack={() => setOpenId(null)} />;
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} hitSlop={12} style={{ height: 44, justifyContent: "center" }} accessibilityLabel={tr("Retour", "Back")}><Text style={{ fontSize: 28 }}>←</Text></Pressable>
      <Text style={st.h2}>{tr("Espace créateur", "Creator space")}</Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Pressable onPress={() => setSection("orders")} style={[st.chip, section === "orders" && st.chipOn]}><Text style={{ color: section === "orders" ? "#fff" : "#221812" }}>{tr("Commandes", "Orders")}</Text></Pressable>
        <Pressable onPress={() => setSection("works")} style={[st.chip, section === "works" && st.chipOn]}><Text style={{ color: section === "works" ? "#fff" : "#221812" }}>{tr("Œuvres et stocks", "Works and stock")}</Text></Pressable>
      </View>
      {section === "works" ? <ProductsPane token={token} /> : null}
      {section === "orders" ? <>
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
      </> : null}
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
