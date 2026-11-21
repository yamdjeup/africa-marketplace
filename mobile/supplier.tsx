import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { authed } from "./api";
import { tr, useLang } from "./region";
import * as ImagePicker from "expo-image-picker";
import { WorkForm, uploadPhoto } from "./work-form";
import { API_URL } from "./config";
import { Dropdown } from "./dropdown";
import { buildCarrierOptions, filterCarriers, OTHER_CARRIER } from "./carriers";

type Lbl = { fr: string; en: string };
type Sub = { id: string; number: string; status: string; statusLabel: Lbl; createdAt: string; customer: string; subtotalCents: number; acceptBy: string | null };

const TABS: { v: string; fr: string; en: string }[] = [
  { v: "todo", fr: tr("À traiter", "To handle"), en: "To handle" },
  { v: "PENDING", fr: tr("À accepter", "To accept"), en: "To accept" },
  { v: "ship", fr: tr("À expédier", "To ship"), en: "To ship" },
  { v: "SHIPPED", fr: tr("Expédiées", "Shipped"), en: "Shipped" },
  { v: "done", fr: tr("Clôturées", "Closed"), en: "Closed" },
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

type Detail = { id: string; number: string; status: string; statusLabel: Lbl; createdAt: string; acceptBy: string | null; subtotalCents: number; carrier: string | null; trackingNumber: string | null; reason: string | null; reasonNote?: string | null; return?: { status: string; label: Lbl; reason: string; createdAt: string; photoIds?: string[]; shipped?: boolean; condition?: string | null; conditionNote?: string | null; receivedAt?: string | null; decideBy?: string | null; decision?: string | null; decisionNote?: string | null } | null; items: { id: string; name: string; size: string | null; quantity: number; unitPriceCents: number }[]; shipTo: { fullName: string; address: string; postalCode: string; city: string; country: string; phone: string | null } };
const CARRIERS = ["UPS", "DHL", "Colissimo"];
const ERRS: Record<string, [string, string]> = {
  state: ["Cette commande a changé d'état (déjà traitée ou expirée).", "This order changed state (already handled or expired)."],
  reason: ["Merci d'indiquer un motif.", "Please give a reason."],
  tracking: ["Transporteur et numéro de suivi obligatoires.", "Carrier and tracking number are required."],
  stock: ["Stock insuffisant pour confirmer l'expédition.", "Not enough stock to confirm shipping."],
  reason2: ["Un motif est obligatoire pour refuser le retour.", "A reason is required to refuse the return."],
  note: ["Un commentaire est obligatoire si le colis est endommagé.", "A comment is required when the parcel is damaged."],
};

function Select({ value, options, onChange, label }: { value: string; options: { v: string; fr: string; en: string }[]; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const list = Array.isArray(options) ? options.filter((o) => o && typeof o.v === "string") : [];
  const cur = list.find((o) => o.v === value) ?? list[0];
  return (
    <View>
      <Text style={st.mut}>{label}</Text>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" style={[st.input, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
        <Text style={{ color: "#221812", flexShrink: 1 }}>{cur ? tr(cur.fr ?? cur.en ?? "", cur.en ?? cur.fr ?? "") : "…"}</Text><Text style={{ color: "#221812" }}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open && list.length ? <View style={{ borderWidth: 1, borderColor: "#ded6c9", backgroundColor: "#fff" }}>
        {list.map((o) => (
          <Pressable key={o.v} onPress={() => { onChange(o.v); setOpen(false); }} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 12, backgroundColor: o.v === value ? "#faf6ee" : "#fff" }}>
            <Text style={{ color: "#221812", fontWeight: o.v === value ? "700" : "400" }}>{tr(o.fr ?? o.en ?? "", o.en ?? o.fr ?? "")}</Text>
          </Pressable>
        ))}
      </View> : null}
    </View>
  );
}

const CONDITIONS = [{ v: "OK", fr: "Conforme (remise en vente)", en: "As expected (back on sale)" }, { v: "DAMAGED", fr: "Endommagé / exclure du stock", en: "Damaged / exclude from stock" }];
const DECISIONS = [{ v: "ACCEPTED", fr: "Accepter le retour", en: "Accept the return" }, { v: "REFUSED", fr: "Refuser le retour", en: "Refuse the return" }];

function OrderDetail({ token, id, onBack }: { token: string; id: string; onBack: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [orderReasons, setOrderReasons] = useState<{ v: string; fr: string; en: string }[]>([]);
  const [returnReasons, setReturnReasons] = useState<{ v: string; fr: string; en: string }[]>([]);
  const [rsnOrder, setRsnOrder] = useState("");
  const [rsnReturn, setRsnReturn] = useState("");
  const [carrier, setCarrier] = useState("UPS");
  const [other, setOther] = useState("");
  const [tracking, setTracking] = useState("");
  const [condition, setCondition] = useState("OK");
  const [decision, setDecision] = useState("ACCEPTED");
  const [dnote, setDnote] = useState("");
  const [note, setNote] = useState("");
  const [carriers, setCarriers] = useState<string[]>(CARRIERS);
  const carrierOptions = React.useMemo(() => buildCarrierOptions(carriers.map((n) => ["", n] as [string, string])), [carriers]);
  useEffect(() => { authed<{ carriers?: string[] }>(token, "GET", "/api/v1/config").then((r) => { if (r.ok && Array.isArray(r.data?.carriers) && r.data.carriers.length) setCarriers(r.data.carriers); }); }, []);
  const load = () => authed<Detail>(token, "GET", `/api/v1/supplier/orders/${id}`).then((r) => r.ok && setD(r.data));
  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    const get = (kind: string, set: (v: { v: string; fr: string; en: string }[]) => void) =>
      authed<{ reasons: { id: string; fr: string; en: string }[] }>(token, "GET", `/api/v1/supplier/reasons?kind=${kind}`).then((r) => r.ok && set((Array.isArray(r.data?.reasons) ? r.data.reasons : []).map((x) => ({ v: x.id, fr: x.fr ?? x.en ?? "", en: x.en ?? x.fr ?? "" }))));
    get("ORDER", setOrderReasons); get("RETURN", setReturnReasons);
  }, [token]);
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
      {d.return ? <View style={{ marginTop: 10, padding: 10, borderWidth: 1, borderColor: "#ded6c9", borderRadius: 6 }}><Text style={{ fontWeight: "600", color: "#221812" }}>{tr(d.return.label.fr, d.return.label.en)}</Text><Text style={st.mut}>{tr("Motif du client", "Customer reason")} : {d.return.reason}</Text><Text style={st.mut}>{tr("L’administration rembourse après votre décision et arbitre les litiges.", "The administration refunds after your decision and arbitrates disputes.")}</Text>
        {d.return.photoIds?.length ? <Text style={st.mut}>{d.return.photoIds.length} {tr("photo(s) jointe(s) — à consulter dans l’espace créateur du site.", "photo(s) attached — view them in the creator portal on the website.")}</Text> : null}
        {d.return.status === "ACCEPTED" || (d.return.status === "RECEIVED" && !d.return.condition && !d.return.decision) ? (
          <View style={{ marginTop: 8, gap: 8 }}>
            <Text style={{ fontWeight: "600", color: "#221812" }}>{tr("Colis en route vers vous", "Parcel on its way to you")}</Text>
            <Text style={st.mut}>{tr("À réception, contrôlez-le et décidez sous 6 jours calendaires.", "On arrival, check it and decide within 6 calendar days.")}</Text>
            {d.return.status === "ACCEPTED" && d.return.shipped ? (
              <>
                {btn(tr("J’ai reçu le colis", "I received the parcel"), () => Alert.alert(tr("Confirmer la réception ?", "Confirm receipt?"), tr("Le client sera prévenu que vous avez reçu son colis.", "The customer will be told you received the parcel."), [{ text: tr("Annuler", "Cancel") }, { text: tr("Confirmer", "Confirm"), onPress: () => act({ action: "return_arrived" }) }]))}
              </>
            ) : (
              <>
                <Select label={tr("État du colis reçu", "Condition of the parcel")} value={condition} options={CONDITIONS} onChange={setCondition} />
                <TextInput value={note} onChangeText={setNote} placeholder={tr("Commentaire (obligatoire si endommagé)", "Comment (required if damaged)")} placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={st.input} />
                {btn(tr("Confirmer la réception", "Confirm receipt"), () => act({ action: "return_check", condition, note }))}
              </>
            )}
          </View>
        ) : null}
        {d.return.status === "RECEIVED" && d.return.condition && !d.return.decision ? (
          <View style={{ marginTop: 8, gap: 8 }}>
            <Text style={{ fontWeight: "600", color: "#221812" }}>{tr("Votre décision sur ce retour", "Your decision on this return")}</Text>
            <Select label={tr("Décision", "Decision")} value={decision} options={DECISIONS} onChange={setDecision} />
            {decision === "REFUSED" ? <Select label={tr("Motif du refus", "Reason for refusal")} value={rsnReturn} options={returnReasons} onChange={setRsnReturn} /> : null}
            <TextInput value={dnote} onChangeText={setDnote} placeholder={tr("Précision facultative (administration uniquement)", "Optional details (administration only)")} placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={st.input} />
            {btn(tr("Valider ma décision", "Confirm my decision"), () => act({ action: "return_decide", decision, note: dnote, reasonId: rsnReturn }))}
          </View>
        ) : null}
        {d.return.decision ? <Text style={{ marginTop: 6, fontWeight: "600", color: "#221812" }}>{d.return.decision === "ACCEPTED" ? tr("Retour accepté par vous", "Return accepted by you") : tr("Retour refusé par vous", "Return refused by you")}{d.return.decisionNote ? ` : ${d.return.decisionNote}` : ""}</Text> : null}
        {d.return.receivedAt ? <Text style={st.mut}>{tr("Réception confirmée", "Receipt confirmed")} : {d.return.condition === "DAMAGED" ? tr("endommagé", "damaged") : tr("conforme", "as expected")}{d.return.conditionNote ? ` — ${d.return.conditionNote}` : ""}{d.return.decideBy && !d.return.decision ? ` · ${tr("décision avant le", "decision before")} ${new Date(d.return.decideBy).toLocaleDateString()}` : ""}</Text> : null}
        </View> : null}
      {msg ? <Text style={{ color: "#b42318", marginTop: 8 }}>{msg}</Text> : null}
      <Text style={st.h3}>{tr("Articles", "Items")}</Text>
      {d.items.map((i) => <Text key={i.id} style={{ color: "#221812", marginTop: 4 }}>{i.quantity} × {i.name}{i.size ? ` (${i.size})` : ""} — {eur(i.unitPriceCents * i.quantity)}</Text>)}
      <Text style={{ fontWeight: "600", marginTop: 8 }}>{tr("Total boutique", "Shop total")} : {eur(d.subtotalCents)}</Text>
      <Text style={st.h3}>{tr("Livrer à", "Ship to")}</Text>
      <Text style={{ color: "#221812" }}>{o.fullName}</Text>
      <Text style={{ color: "#221812" }}>{o.address}, {o.postalCode} {o.city}, {o.country}</Text>
      {o.phone ? <Text style={{ color: "#221812" }}>{o.phone}</Text> : null}
      {d.status === "PENDING" ? (
        <View style={{ marginTop: 16, gap: 10 }}>
          {d.acceptBy ? <Text style={{ color: "#92400e" }}>{tr("À accepter avant le ", "Accept before ")}{new Date(d.acceptBy).toLocaleString()}</Text> : null}
          {btn(tr("Accepter la commande", "Accept order"), () => act({ action: "accept" }))}
          <Select label={tr("Motif du refus", "Reason for declining")} value={rsnOrder} options={orderReasons} onChange={setRsnOrder} />
          <TextInput value={reason} onChangeText={setReason} placeholder={tr("Précision facultative (administration uniquement)", "Optional details (administration only)")} placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={st.input} />
          {btn(tr("Refuser", "Decline"), () => act({ action: "refuse", reasonId: rsnOrder, note: reason }), true)}
        </View>
      ) : null}
      {d.status === "ACCEPTED" || d.status === "PREPARING" ? (
        <View style={{ marginTop: 16, gap: 10 }}>
          {d.status === "ACCEPTED" ? btn(tr("Marquer en préparation", "Mark as preparing"), () => act({ action: "prepare" }), true) : null}
          <Dropdown value={carrier} options={carrierOptions} onChange={setCarrier} placeholder={tr("Sélectionnez un transporteur", "Select a carrier")} filter={(q) => filterCarriers(carrierOptions, q)} searchPlaceholder={tr("Tapez pour filtrer…", "Type to filter…")} />
          {carrier === OTHER_CARRIER ? <TextInput value={other} onChangeText={setOther} placeholder={tr("Autre transporteur", "Other carrier")} placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={st.input} /> : null}
          <TextInput value={tracking} onChangeText={setTracking} placeholder={tr("Numéro de suivi", "Tracking number")} placeholderTextColor="#6b5d52" selectionColor="#1c3060" autoCapitalize="characters" style={st.input} />
          {btn(tr("Marquer expédiée", "Mark as shipped"), () => act({ action: "ship", carrier: carrier === OTHER_CARRIER ? other : carrier, tracking }))}
        </View>
      ) : null}
      {d.status === "SHIPPED" ? (
        <View style={{ marginTop: 16, gap: 10 }}>
          <Text style={{ color: "#221812" }}>{tr("Expédiée", "Shipped")} — {d.carrier} · {d.trackingNumber}</Text>
          {btn(tr("Marquer livrée", "Mark as delivered"), () => act({ action: "deliver" }))}
        </View>
      ) : null}
      {d.reason && ["REFUSED", "EXPIRED", "CANCELLED"].includes(d.status) ? <Text style={st.mut}>{tr("Motif : ", "Reason: ")}{d.reason}</Text> : null}
      {d.reasonNote && d.status === "REFUSED" ? <Text style={st.mut}>{tr("Précision (administration uniquement) : ", "Details (administration only): ")}{d.reasonNote}</Text> : null}
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
  const [editing, setEditing] = useState<string | null>(null);
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
  if (editing !== null) return <WorkForm token={token} slug={editing || undefined} onClose={(ch) => { setEditing(null); if (ch) load(); }} />;
  if (!list) return <ActivityIndicator />;
  const newBtn = btn(tr("Nouvelle œuvre", "New work"), () => setEditing(""));
  if (list.length === 0) return <View><Text style={st.mut}>{tr("Aucune création.", "No creations.")}</Text>{newBtn}</View>;
  return (
    <View>
      {newBtn}
      {msg ? <Text style={{ color: "#b42318", marginTop: 8 }}>{msg}</Text> : null}
      {list.map((p) => {
        const s = PST[p.status] ?? [p.status, p.status];
        const isOpen = open === p.slug;
        return (
          <View key={p.slug} style={st.row}>
            <Pressable onPress={() => { setOpen(isOpen ? null : p.slug); setMsg(null); }}>
              <Text style={{ fontWeight: "600", color: "#221812" }}>{tr(p.name, p.nameEn)}</Text>
              <Text style={st.mut}>{tr(s[0], s[1])} · {eur(p.priceCents)} · {tr("Stock", "Stock")} {p.stock} ({tr("réservé", "reserved")} {p.reserved})</Text>
            </Pressable>
            {isOpen ? (
              <View style={{ gap: 10, marginTop: 10 }}>
                {btn(tr("Modifier la fiche", "Edit listing"), () => setEditing(p.slug), true)}
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

type Dash = { name: string; country: string; craftType: string; commissionPct: number; toAccept: number; toShip: number; inTransit: number; balance: { pending: number; available: number; paid: number; gross: number; commission: number }; sales: { id: string; number: string; grossCents: number; commissionCents: number; netCents: number; state: string; availableAt: string }[]; payouts: { id: string; paidAt: string; reference: string; amountCents: number }[] };
const SALE_ST: Record<string, [string, string]> = { reversed: ["Annulé", "Reversed"], paid: ["Versé", "Paid out"], available: ["Disponible", "Available"], pending: ["En attente", "Pending"] };
const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

function DashboardPane({ token }: { token: string }) {
  const [d, setD] = useState<Dash | null>(null);
  useEffect(() => { authed<Dash>(token, "GET", "/api/v1/supplier/dashboard").then((r) => r.ok && setD(r.data)); }, []);
  if (!d) return <ActivityIndicator style={{ marginTop: 16 }} />;
  const stat = (label: string, v: string) => <View style={{ width: "47%", borderWidth: 1, borderColor: "#ded6c9", padding: 12 }}><Text style={st.mut}>{label}</Text><Text style={{ fontSize: 18, fontWeight: "600", color: "#221812" }}>{v}</Text></View>;
  return (
    <View>
      <Text style={st.h3}>{tr(`Bonjour, ${d.name}`, `Hello, ${d.name}`)}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
        {stat(tr("Commandes à accepter", "Orders to accept"), String(d.toAccept))}
        {stat(tr("À préparer / expédier", "To prepare / ship"), String(d.toShip))}
        {stat(tr("En livraison", "In transit"), String(d.inTransit))}
        {stat(tr("Commission plateforme", "Platform commission"), `${d.commissionPct} %`)}
      </View>
      <Text style={st.h3}>{tr("Paiements", "Payments")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
        {stat(tr("En attente", "Pending"), eur(d.balance.pending))}
        {stat(tr("Disponible", "Available"), eur(d.balance.available))}
        {stat(tr("Versé", "Paid out"), eur(d.balance.paid))}
      </View>
      <Text style={st.mut}>{tr("Cumul ventes", "Total sales")} {eur(d.balance.gross)} · {tr("commission", "commission")} {eur(d.balance.commission)}</Text>
      <Text style={st.h3}>{tr("Ventes", "Sales")}</Text>
      {d.sales.length === 0 ? <Text style={st.mut}>{tr("Aucune vente livrée pour l'instant.", "No delivered sale yet.")}</Text> : d.sales.map((e) => (
        <View key={e.id} style={st.row}>
          <Text style={{ fontWeight: "600", color: "#221812" }}>{e.number} · {tr(SALE_ST[e.state]?.[0] ?? e.state, SALE_ST[e.state]?.[1] ?? e.state)}</Text>
          <Text style={st.mut}>{eur(e.grossCents)} − {eur(e.commissionCents)} = {eur(e.netCents)}</Text>
        </View>
      ))}
      <Text style={st.h3}>{tr("Versements", "Payouts")}</Text>
      {d.payouts.length === 0 ? <Text style={st.mut}>—</Text> : d.payouts.map((p) => <Text key={p.id} style={{ color: "#221812", marginTop: 4 }}>{new Date(p.paidAt).toLocaleDateString()} · {p.reference} · {eur(p.amountCents)}</Text>)}
    </View>
  );
}

type Prof = { displayName: string; country: string; contactEmail: string; phone: string; address: string; bio: string; bioEn: string; videoUrl: string; avatar: string; signature: string };
const PROF_ERR: Record<string, [string, string]> = { name: ["Ce nom est déjà utilisé par un partenaire.", "This name is already used by a partner."], invalid: ["Données invalides.", "Invalid data."] };

function ProfilePane({ token }: { token: string }) {
  const lang = useLang();
  const [p, setP] = useState<Prof | null>(null);
  const [bio, setBio] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { authed<Prof>(token, "GET", "/api/v1/supplier/profile").then((r) => { if (r.ok) { setP(r.data); setBio(lang === "en" ? r.data.bioEn : r.data.bio); } }); }, []);
  if (!p) return <ActivityIndicator style={{ marginTop: 16 }} />;
  const set = (k: keyof Prof) => (v: string) => setP({ ...p, [k]: v });
  const field = (label: string, k: keyof Prof, extra: object = {}) => (
    <View style={{ marginTop: 10 }}><Text style={st.mut}>{label}</Text><TextInput value={p[k]} onChangeText={set(k)} style={st.input} accessibilityLabel={label} {...extra} /></View>
  );
  const pickImg = async (k: "avatar" | "signature") => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setMsg(tr("Autorisez l'accès aux photos.", "Allow photo access.")); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (res.canceled) return;
    setMsg(tr("Envoi…", "Uploading…"));
    const r = await uploadPhoto(token, res.assets[0].uri, k === "signature" ? "signature" : "photo");
    if (r.url) { setP((o) => (o ? { ...o, [k]: r.url as string } : o)); setMsg(tr("Photo ajoutée : pensez à enregistrer.", "Photo added: remember to save.")); }
    else setMsg(tr("Envoi impossible (JPEG/PNG/WebP, 300 Ko max).", "Upload failed (JPEG/PNG/WebP, 300 KB max)."));
  };
  const save = async () => {
    setMsg("");
    const r = await authed<{ ok?: boolean; error?: string }>(token, "POST", "/api/v1/supplier/profile", { ...p, bio, lang });
    if (r.ok) setMsg(tr("Profil enregistré.", "Profile saved."));
    else { const e = PROF_ERR[(r.data as { error?: string })?.error ?? ""]; setMsg(e ? tr(e[0], e[1]) : tr("Enregistrement impossible. Vérifiez e-mail et téléphone.", "Could not save. Check email and phone.")); }
  };
  return (
    <View>
      <Text style={st.h3}>{tr("Profil", "Profile")}</Text>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center", marginTop: 8 }}>
        {p.avatar ? <Image source={{ uri: p.avatar.startsWith("http") ? p.avatar : `${API_URL}${p.avatar}` }} style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#f2eadd" }} /> : null}
        <Pressable onPress={() => pickImg("avatar")} style={st.chip}><Text style={{ color: "#1c3060" }}>{tr("Photo de profil", "Profile photo")}</Text></Pressable>
        <Pressable onPress={() => pickImg("signature")} style={st.chip}><Text style={{ color: "#1c3060" }}>{p.signature ? tr("Signature ✓", "Signature ✓") : tr("Signature", "Signature")}</Text></Pressable>
      </View>
      {field(tr("Nom d'artiste / d'atelier", "Artist / studio name"), "displayName")}
      {field(tr("Pays", "Country"), "country")}
      {field(tr("E-mail de contact", "Contact email"), "contactEmail", { keyboardType: "email-address", autoCapitalize: "none" })}
      {field(tr("Téléphone", "Phone"), "phone", { keyboardType: "phone-pad" })}
      {field(tr("Adresse", "Address"), "address", { multiline: true })}
      <View style={{ marginTop: 10 }}><Text style={st.mut}>{tr("Biographie", "Biography")}</Text><TextInput value={bio} onChangeText={setBio} multiline style={[st.input, { minHeight: 110 }]} accessibilityLabel={tr("Biographie", "Biography")} /></View>
      {field(tr("Vidéo de présentation (lien https)", "Intro video (https link)"), "videoUrl", { autoCapitalize: "none", keyboardType: "url" })}
      <Pressable onPress={save} style={[st.btn, { marginTop: 14 }]}><Text style={{ color: "#fff", fontWeight: "600" }}>{tr("Enregistrer", "Save")}</Text></Pressable>
      {msg ? <Text style={{ marginTop: 8, color: "#221812" }}>{msg}</Text> : null}
    </View>
  );
}

type RetRow = { id: string; subOrderId: string; number: string; reason: string; createdAt: string; stage: string; decideBy: string | null };
const RET_TABS = [{ v: "todo", fr: "À traiter", en: "To handle" }, { v: "accepted", fr: "Acceptés", en: "Accepted" }, { v: "refused", fr: "Refusés", en: "Refused" }, { v: "all", fr: "Tous", en: "All" }];
const PERIODS = [{ v: "all", fr: "Toutes les dates", en: "All dates" }, { v: "today", fr: "Aujourd’hui", en: "Today" }, { v: "custom", fr: "Plage personnalisée", en: "Custom range" }];
const STAGES: Record<string, [string, string]> = { incoming: ["Colis en route vers vous", "Parcel on its way to you"], decide: ["Décision à prendre", "Decision needed"], accepted: ["Accepté", "Accepted"], refused: ["Refusé", "Refused"], refunded: ["Remboursé", "Refunded"] };

function ReturnsPane({ token, onOpen }: { token: string; onOpen: (id: string) => void }) {
  const [tab, setTab] = useState("todo");
  const [period, setPeriod] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<{ items: RetRow[]; counts: Record<string, number> } | null>(null);
  useEffect(() => {
    setData(null);
    const qs = `st=${tab}&d=${period}${period === "custom" ? `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : ""}`;
    authed<{ items: RetRow[]; counts: Record<string, number> }>(token, "GET", `/api/v1/supplier/returns?${qs}`).then((r) => setData(r.ok ? r.data : { items: [], counts: {} }));
  }, [token, tab, period, from, to]);
  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 12 }}>
        {RET_TABS.map((t) => (
          <Pressable key={t.v} onPress={() => setTab(t.v)} style={[st.chip, tab === t.v && st.chipOn]}>
            <Text style={{ color: tab === t.v ? "#fff" : "#221812" }}>{tr(t.fr, t.en)}{data?.counts[t.v] ? ` (${data.counts[t.v]})` : ""}</Text>
          </Pressable>
        ))}
      </View>
      <Select label={tr("Période", "Period")} value={period} options={PERIODS} onChange={setPeriod} />
      {period === "custom" ? (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TextInput value={from} onChangeText={setFrom} placeholder={tr("Du (AAAA-MM-JJ)", "From (YYYY-MM-DD)")} placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={[st.input, { flex: 1 }]} />
          <TextInput value={to} onChangeText={setTo} placeholder={tr("Au (AAAA-MM-JJ)", "To (YYYY-MM-DD)")} placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={[st.input, { flex: 1 }]} />
        </View>
      ) : null}
      <View style={{ marginTop: 12 }}>
        {!data ? <ActivityIndicator /> : data.items.length === 0 ? <Text style={st.mut}>{tr("Aucun retour.", "No returns.")}</Text> : data.items.map((x) => (
          <Pressable key={x.id} onPress={() => onOpen(x.subOrderId)} style={st.row}>
            <Text style={{ fontWeight: "600", color: "#221812" }}>{x.number} · {tr(...(STAGES[x.stage] ?? [x.stage, x.stage]))}</Text>
            <Text style={st.mut}>{new Date(x.createdAt).toLocaleDateString()} · {x.reason}</Text>
            {x.stage === "decide" && x.decideBy ? <Text style={{ color: "#92400e", fontSize: 12 }}>{tr("Décision avant le ", "Decide before ")}{new Date(x.decideBy).toLocaleDateString()}</Text> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function SupplierScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [section, setSection] = useState<"dash" | "orders" | "returns" | "works" | "profile">("dash");
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginBottom: 16, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        <Pressable onPress={() => setSection("profile")} style={[st.chip, section === "profile" && st.chipOn]}><Text style={{ color: section === "profile" ? "#fff" : "#221812" }}>{tr("Profil", "Profile")}</Text></Pressable>
        <Pressable onPress={() => setSection("dash")} style={[st.chip, section === "dash" && st.chipOn]}><Text style={{ color: section === "dash" ? "#fff" : "#221812" }}>{tr("Tableau de bord", "Dashboard")}</Text></Pressable>
        <Pressable onPress={() => setSection("orders")} style={[st.chip, section === "orders" && st.chipOn]}><Text style={{ color: section === "orders" ? "#fff" : "#221812" }}>{tr("Commandes", "Orders")}</Text></Pressable>
        <Pressable onPress={() => setSection("returns")} style={[st.chip, section === "returns" && st.chipOn]}><Text style={{ color: section === "returns" ? "#fff" : "#221812" }}>{tr("Retours", "Returns")}</Text></Pressable>
        <Pressable onPress={() => setSection("works")} style={[st.chip, section === "works" && st.chipOn]}><Text style={{ color: section === "works" ? "#fff" : "#221812" }}>{tr("Œuvres et stocks", "Works and stock")}</Text></Pressable>
      </ScrollView>
      {section === "dash" ? <DashboardPane token={token} /> : null}
      {section === "profile" ? <ProfilePane token={token} /> : null}
      {section === "returns" ? <ReturnsPane token={token} onOpen={setOpenId} /> : null}
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
          <Text style={st.mut}>{new Date(x.createdAt).toLocaleDateString()} · {x.customer} · {eur(x.subtotalCents)}</Text>
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
