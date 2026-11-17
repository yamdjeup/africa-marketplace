import { ApproxPrice, tr, lazy } from "./region";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";
import { authed } from "./api";
import { AddressFields, EMPTY_FORM, type AddressForm } from "./addresses";

export type CartLine = { slug: string; name: string; creatorName: string; image: string; priceCents: number; quantity: number; maxQuantity: number; size?: string | null };
type Addr = { id: string; firstName: string; lastName: string; line1: string; houseNumber: string; postalCode: string; city: string; isDefault: boolean };

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;
const ERRORS: Record<string, string> = lazy(() => ({
  stock: tr("Une pièce n’est plus disponible en quantité suffisante.", "A piece is no longer available in sufficient quantity."),
  reserved: tr("Une pièce est en cours d’achat par un autre client. Réessayez dans quelques minutes.", "A piece is being purchased by another customer. Try again in a few minutes."),
  unknown: tr("Une pièce de votre panier n’est plus disponible.", "A piece in your cart is no longer available."),
  address: tr("Veuillez remplir tous les champs obligatoires.", "Please fill in all required fields."),
  postal: tr("Code postal invalide pour ce pays.", "Invalid postcode for this country."),
  email: tr("Adresse e-mail invalide.", "Invalid email address."),
  disabled: tr("Le paiement est momentanément indisponible.", "Payment is temporarily unavailable."),
  payment: tr("Le paiement est momentanément indisponible.", "Payment is temporarily unavailable."),
}));

export function CartScreen({ lines, token, onNeedLogin, onPaid, onQty, onRemove, onClose }: { lines: CartLine[]; token: string | null; onNeedLogin: () => void; onPaid: () => void; onQty: (slug: string, size: string | null, q: number) => void; onRemove: (slug: string, size: string | null) => void; onClose: () => void }) {
  const total = lines.reduce((n, l) => n + l.priceCents * l.quantity, 0);
  const [addrs, setAddrs] = useState<Addr[]>([]);
  const [addrId, setAddrId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [step, setStep] = useState<"cart" | "form" | "review">("cart");
  const [email, setEmail] = useState("");
  const [manual, setManual] = useState<AddressForm>(EMPTY_FORM);
  const [mismatch, setMismatch] = useState(false);
  const [checking, setChecking] = useState(false);
  const [save, setSave] = useState(false);
  const useBook = !!token && addrs.length > 0;

  useEffect(() => {
    if (!token) return;
    authed<{ items: Addr[] }>(token, "GET", "/api/v1/addresses").then((r) => {
      if (!r.ok) return;
      setAddrs(r.data.items);
      setAddrId((r.data.items.find((a) => a.isDefault) ?? r.data.items[0])?.id ?? null);
    });
  }, [token]);

  const verify = async () => {
    setMsg(null);
    if (useBook) return setStep("review");
    if (!token && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setMsg(ERRORS.email);
    const m = manual;
    if (![m.firstName, m.lastName, m.line1, m.city, m.phone].every((v) => v.trim())) return setMsg(ERRORS.address);
    setChecking(true);
    let mm = false;
    try {
      const qs = new URLSearchParams({ postalCode: m.postalCode.trim(), city: m.city.trim(), country: m.country.trim(), locale: "fr" });
      const r = await authed<{ status?: string }>(null, "GET", `/api/address/check?${qs}`);
      mm = r.data.status === "mismatch";
    } catch {
      mm = false;
    }
    setChecking(false);
    setMismatch(mm);
    setStep("review");
  };

  const [snap, setSnap] = useState<{ lines: typeof lines; total: number; name: string; addr: string } | null>(null);
  const pay = async () => {
    setBusy(true);
    setMsg(null);
    const cart = lines.map((l) => ({ slug: l.slug, size: l.size ?? null, quantity: l.quantity }));
    const c = await authed<{ number?: string; clientSecret?: string; guestToken?: string; error?: string; item?: string }>(token, "POST", "/api/v1/checkout/create", useBook ? { addressId: addrId, cart } : { address: manual, email: token ? undefined : email.trim(), save: !!token && save, cart });
    if (!c.ok || !c.data.clientSecret || !c.data.number) {
      setMsg((ERRORS[c.data.error ?? ""] ?? tr("Le paiement n’a pas pu démarrer.", "Payment could not start.")) + (c.data.item ? ` (${c.data.item})` : ""));
      setBusy(false);
      return;
    }
    const number = c.data.number;
    const guestToken = c.data.guestToken;
    const init = await initPaymentSheet({ merchantDisplayName: "E póm ta’", paymentIntentClientSecret: c.data.clientSecret, returnURL: "epomta://stripe-redirect", allowsDelayedPaymentMethods: false, billingDetailsCollectionConfiguration: { name: "always" as never, email: token ? undefined : ("always" as never) }, defaultBillingDetails: { name: `${(useBook ? addrs.find((x) => x.id === addrId) ?? manual : manual).firstName} ${(useBook ? addrs.find((x) => x.id === addrId) ?? manual : manual).lastName}`.trim(), email: token ? undefined : email.trim() } });
    const shown = init.error ? init : await presentPaymentSheet();
    if (shown.error) {
      await authed(token, "POST", "/api/v1/checkout/cancel", { number, guestToken });
      if (shown.error.code !== "Canceled") setMsg(tr("Le paiement a échoué. Aucun montant n’a été débité.", "Payment failed. You have not been charged."));
      setBusy(false);
      return;
    }
    let status = "pending";
    for (let i = 0; i < 5 && status === "pending"; i++) {
      status = (await authed<{ status: string }>(token, "POST", "/api/v1/checkout/confirm", { number, guestToken })).data.status ?? "pending";
      if (status === "pending") await new Promise((r) => setTimeout(r, 1500));
    }
    setBusy(false);
    if (status === "paid") {
      const shipTo = useBook ? addrs.find((x) => x.id === addrId) : undefined;
      const dest = shipTo ?? manual;
      setSnap({ lines, total, name: ` ${dest.lastName}`.trim(), addr: ` ${dest.line1}`.trim() + `, ${dest.postalCode} ${dest.city}` });
      setDone(number);
      onPaid();
    } else if (status === "failed") setMsg(tr("Votre commande n’a pas pu être finalisée ; vous serez remboursé(e) si un montant a été débité.", "Your order could not be completed; you will be refunded if any amount was charged."));
    else Alert.alert(tr("Paiement en cours de validation", "Payment being confirmed"), tr("Votre commande apparaîtra dans « Mes commandes » dans un instant.", "Your order will appear in “My orders” in a moment."));
  };

  if (done)
    return (
      <View style={{ flex: 1, backgroundColor: "#faf6ee", padding: 24, justifyContent: "center" }}>
        <Text style={s.h2}>{tr("Merci pour votre commande", "Thank you for your order")}</Text>
        <Text style={s.mut}>Commande {done}. Vous pouvez la suivre dans Moi › Mes commandes.</Text>
        {snap && (
          <View style={{ marginTop: 16, gap: 4 }}>
            <Text style={s.bold}>{tr("Votre commande", "Your order")}</Text>
            {snap.lines.map((l, k) => <Text key={k}>{l.quantity} × {l.name}{l.size ? ` (${l.size})` : ""} — {eur(l.priceCents * l.quantity)}</Text>)}
            <Text style={[s.bold, { marginTop: 4 }]}>{tr("Total", "Total")} : {eur(snap.total)}</Text>
            <Text style={[s.bold, { marginTop: 12 }]}>{tr("Livraison à", "Delivering to")}</Text>
            <Text>{snap.name}{"\n"}{snap.addr}</Text>
            <Text style={[s.mut, { marginTop: 8 }]}>{tr("Une erreur dans l'adresse ? Vous pouvez la modifier tant que le colis n'est pas expédié, dans Moi › Mes commandes.", "A mistake in the address? You can change it until the parcel ships, in Me › My orders.")}</Text>
          </View>
        )}
        <Pressable style={[s.cta, { marginTop: 24 }]} onPress={onClose}><Text style={s.ctaText}>{tr("Continuer mes achats", "Continue shopping")}</Text></Pressable>
      </View>
    );
  const addrLine = (a: { houseNumber: string; line1: string; postalCode: string; city: string }) => `${a.houseNumber} ${a.line1}`.trim() + `\n${a.postalCode} ${a.city}`;
  if (step !== "cart") {
    const ship = useBook ? addrs.find((a) => a.id === addrId) : undefined;
    return (
      <ScrollView style={{ flex: 1, backgroundColor: "#faf6ee" }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => { setMsg(null); setStep(step === "review" ? "form" : "cart"); }} hitSlop={8} style={{ marginBottom: 8 }}><Text style={s.link}>← {step === "review" ? tr("Modifier", "Edit") : tr("Mon panier", "My cart")}</Text></Pressable>
        <Text style={s.h2}>{tr("Commande", "Order")}</Text>
        <Text style={[s.note, { fontWeight: "600" }]}>{tr("Livraison assurée, signature requise à la réception.", "Insured delivery, signature required on receipt.")}</Text>
        <Text style={[s.note, { marginTop: 8 }]}>{tr("Paiement sécurisé par carte bancaire.", "Secure payment by bank card.")}</Text>
        {msg ? <Text style={{ color: "#b00020", marginVertical: 8 }}>{msg}</Text> : null}
        {step === "form" ? (
          <>
            {!token && <Text style={[s.mut, { marginTop: 12 }]}>Vous commandez en invité. Connectez-vous pour retrouver vos commandes.{"  "}<Text style={s.link} onPress={onNeedLogin}>{tr("Se connecter", "Sign in")}</Text></Text>}
            <Text style={s.h3}>{tr("Coordonnées", "Contact details")}</Text>
            {token ? null : (
              <>
                <Text style={s.label}>{tr("E-mail *", "Email *")}</Text>
                <TextInput style={s.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholderTextColor="#6b5d52" selectionColor="#1c3060" />
              </>
            )}
            {useBook ? (
              <>
                <Text style={s.h3}>{tr("Choisir l’adresse de livraison", "Choose the delivery address")}</Text>
                {addrs.map((a) => (
                  <Pressable key={a.id} onPress={() => setAddrId(a.id)} style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                    <Text>{addrId === a.id ? "◉" : "○"}</Text>
                    <Text style={{ flex: 1 }}><Text style={s.bold}>{a.firstName} {a.lastName}</Text>{"\n"}{addrLine(a)}</Text>
                  </Pressable>
                ))}
              </>
            ) : (
              <>
                <Text style={s.h3}>{tr("Adresse de livraison", "Delivery address")}</Text>
                <AddressFields form={manual} setForm={setManual} />
                {token ? (
                  <Pressable onPress={() => setSave(!save)} style={{ flexDirection: "row", gap: 8, minHeight: 44, alignItems: "center" }}>
                    <Text>{save ? "☑" : "☐"}</Text>
                    <Text style={{ flex: 1 }}>{tr("Enregistrer cette adresse dans mon carnet", "Save this address in my address book")}</Text>
                  </Pressable>
                ) : null}
              </>
            )}
            <Pressable disabled={checking} onPress={verify} style={[s.cta, { backgroundColor: "#1c3060", marginTop: 8 }]}>
              {checking ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>{tr("Vérifier mon adresse", "Check my address")}</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={s.h3}>{tr("Vérifiez votre adresse", "Check your address")}</Text>
            <Text style={s.mut}>{tr("Une adresse exacte évite les retards et les colis perdus. Relisez-la avant de confirmer.", "An exact address avoids delays and lost parcels. Please re-read it before confirming.")}</Text>
            <View style={s.card}>
              {ship ? <Text><Text style={s.bold}>{ship.firstName} {ship.lastName}</Text>{"\n"}{addrLine(ship)}</Text> : (
                <Text><Text style={s.bold}>{manual.firstName} {manual.lastName}</Text>{"\n"}{addrLine(manual)}{"\n"}{manual.country}{"\n"}Téléphone : {manual.phone}{token ? "" : `\n${email.trim()}`}</Text>
              )}
            </View>
            <Text style={s.mut}>{tr("Nous vous contacterons par téléphone en cas de doute sur l’adresse.", "We will call you if there is any doubt about the address.")}</Text>
            {mismatch && !ship ? <Text style={{ color: "#b00020", marginTop: 8 }}>{tr("Attention : ce code postal ne semble pas correspondre à cette ville. Vérifiez-les avant de confirmer.", "Warning: this postcode does not seem to match this city. Please check them before confirming.")}</Text> : null}
            <Pressable disabled={busy} onPress={pay} style={[s.cta, { backgroundColor: "#1c3060", marginTop: 16 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Confirmer la commande · {eur(total)}</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: "#faf6ee" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Pressable onPress={onClose} hitSlop={8} style={{ marginBottom: 8 }}><Text style={s.link}>← Continuer mes achats</Text></Pressable>
        <Text style={s.h2}>{tr("Mon panier", "My cart")}</Text>
        {lines.length === 0 && <Text style={s.mut}>{tr("Votre panier est vide.", "Your cart is empty.")}</Text>}
        {lines.map((l) => (
          <View key={`${l.slug}|${l.size ?? ""}`} style={s.line}>
            <Image source={{ uri: l.image }} style={s.img} />
            <View style={{ flex: 1 }}>
              <Text style={s.bold} numberOfLines={1}>{l.creatorName}</Text>
              <Text numberOfLines={2}>{l.name}</Text>
              {l.size ? <Text style={s.bold}>Taille / variante : {l.size}</Text> : null}
              <Text style={s.bold}>{eur(l.priceCents)}</Text><ApproxPrice cents={l.priceCents} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 6 }}>
                <Pressable style={s.qty} hitSlop={6} onPress={() => onQty(l.slug, l.size ?? null, l.quantity - 1)}><Text style={s.qtyText}>−</Text></Pressable>
                <Text>{l.quantity}</Text>
                <Pressable style={s.qty} hitSlop={6} onPress={() => onQty(l.slug, l.size ?? null, Math.min(l.maxQuantity, l.quantity + 1))}><Text style={s.qtyText}>+</Text></Pressable>
                <Pressable hitSlop={8} onPress={() => onRemove(l.slug, l.size ?? null)}><Text style={s.link}>{tr("Retirer", "Remove")}</Text></Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      {lines.length > 0 && (
        <View style={s.footer}>
          <Text style={s.bold}>{tr("Récapitulatif", "Summary")}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}><Text style={s.mut}>{tr("Sous-total", "Subtotal")}</Text><Text>{eur(total)}</Text></View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={s.mut}>{tr("Livraison", "Shipping")}</Text><Text>—</Text></View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}><Text style={s.bold}>Total</Text><Text style={s.bold}>{eur(total)}</Text></View>
          <ApproxPrice cents={total} />
          <Text style={[s.mut, { marginTop: 4 }]}>{tr("Conditions détaillées à l'étape suivante. Livraison assurée, signature requise ; paiement sécurisé par carte.", "Detailed terms at the next step. Insured delivery, signature required; secure card payment.")}</Text>
          <Pressable onPress={() => { setMsg(null); setStep("form"); }} style={[s.cta, { marginTop: 8, backgroundColor: "#1c3060" }]}>
            <Text style={s.ctaText}>{tr("Passer commande", "Checkout")}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  h2: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 18, fontWeight: "700", marginBottom: 16 },
  mut: { fontSize: 14, color: "#666" },
  note: { fontSize: 14, borderWidth: 1, borderColor: "#ded6c9", backgroundColor: "#f2eadd", padding: 10 },
  h3: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 15, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  label: { fontSize: 12, color: "#666", marginBottom: 4 },
  input: { backgroundColor: "#faf6ee", color: "#221812", borderWidth: 1, borderColor: "#ded6c9", paddingHorizontal: 12, height: 48, fontSize: 16, marginBottom: 12 },
  card: { borderWidth: 1, borderColor: "#ded6c9", padding: 12, marginVertical: 12 },
  bold: { fontWeight: "700" },
  line: { flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f2eadd" },
  img: { width: 80, height: 100, backgroundColor: "#f2eadd" },
  qty: { width: 32, height: 32, borderWidth: 1, borderColor: "#ded6c9", alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: 18 },
  footer: { padding: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: "#f2eadd" },
  cta: { backgroundColor: "#1c3060", borderRadius: 8, height: 48, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff",  },
  link: { textDecorationLine: "underline", fontSize: 15, color: "#221812" },
});
