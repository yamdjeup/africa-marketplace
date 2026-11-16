import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";
import { authed } from "./api";

export type CartLine = { slug: string; name: string; creatorName: string; image: string; priceCents: number; quantity: number; maxQuantity: number };
type Addr = { id: string; firstName: string; lastName: string; line1: string; houseNumber: string; postalCode: string; city: string; isDefault: boolean };

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;
const ERRORS: Record<string, string> = {
  stock: "Une pièce n’est plus disponible en quantité suffisante.",
  reserved: "Une pièce est en cours d’achat par un autre client. Réessayez dans quelques minutes.",
  unknown: "Une pièce de votre panier n’est plus disponible.",
  address: "Adresse de livraison invalide.",
  disabled: "Le paiement est momentanément indisponible.",
  payment: "Le paiement est momentanément indisponible.",
};

export function CartScreen({ lines, token, onNeedLogin, onPaid, onQty, onRemove, onClose }: { lines: CartLine[]; token: string | null; onNeedLogin: () => void; onPaid: () => void; onQty: (slug: string, q: number) => void; onRemove: (slug: string) => void; onClose: () => void }) {
  const total = lines.reduce((n, l) => n + l.priceCents * l.quantity, 0);
  const [addrs, setAddrs] = useState<Addr[]>([]);
  const [addrId, setAddrId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    authed<{ items: Addr[] }>(token, "GET", "/api/v1/addresses").then((r) => {
      if (!r.ok) return;
      setAddrs(r.data.items);
      setAddrId((r.data.items.find((a) => a.isDefault) ?? r.data.items[0])?.id ?? null);
    });
  }, [token]);

  const pay = async () => {
    if (!token || !addrId) return;
    setBusy(true);
    setMsg(null);
    const cart = lines.map((l) => ({ slug: l.slug, size: null, quantity: l.quantity }));
    const c = await authed<{ number?: string; clientSecret?: string; error?: string; item?: string }>(token, "POST", "/api/v1/checkout/create", { addressId: addrId, cart });
    if (!c.ok || !c.data.clientSecret || !c.data.number) {
      setMsg((ERRORS[c.data.error ?? ""] ?? "Le paiement n’a pas pu démarrer.") + (c.data.item ? ` (${c.data.item})` : ""));
      setBusy(false);
      return;
    }
    const number = c.data.number;
    const init = await initPaymentSheet({ merchantDisplayName: "E póm ta’", paymentIntentClientSecret: c.data.clientSecret, returnURL: "epomta://stripe-redirect", allowsDelayedPaymentMethods: false });
    const shown = init.error ? init : await presentPaymentSheet();
    if (shown.error) {
      await authed(token, "POST", "/api/v1/checkout/cancel", { number });
      if (shown.error.code !== "Canceled") setMsg("Le paiement a échoué. Aucun montant n’a été débité.");
      setBusy(false);
      return;
    }
    let status = "pending";
    for (let i = 0; i < 5 && status === "pending"; i++) {
      status = (await authed<{ status: string }>(token, "POST", "/api/v1/checkout/confirm", { number })).data.status ?? "pending";
      if (status === "pending") await new Promise((r) => setTimeout(r, 1500));
    }
    setBusy(false);
    if (status === "paid") {
      setDone(number);
      onPaid();
    } else if (status === "failed") setMsg("Votre commande n’a pas pu être finalisée ; vous serez remboursé(e) si un montant a été débité.");
    else Alert.alert("Paiement en cours de validation", "Votre commande apparaîtra dans « Mes commandes » dans un instant.");
  };

  if (done)
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", padding: 24, justifyContent: "center" }}>
        <Text style={s.h2}>MERCI POUR VOTRE COMMANDE</Text>
        <Text style={s.mut}>Commande {done}. Vous pouvez la suivre dans Moi › Mes commandes.</Text>
        <Pressable style={[s.cta, { marginTop: 24 }]} onPress={onClose}><Text style={s.ctaText}>CONTINUER MES ACHATS</Text></Pressable>
      </View>
    );
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
          {token && addrs.length > 0 && addrs.map((a) => (
            <Pressable key={a.id} onPress={() => setAddrId(a.id)} style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Text>{addrId === a.id ? "◉" : "○"}</Text>
              <Text style={{ flex: 1 }}>{a.firstName} {a.lastName}, {a.houseNumber} {a.line1}, {a.postalCode} {a.city}</Text>
            </Pressable>
          ))}
          {token && addrs.length === 0 && <Text style={[s.mut, { marginTop: 8 }]}>Ajoutez une adresse de livraison dans Moi › Mes adresses pour payer.</Text>}
          {msg ? <Text style={{ color: "#b00020", marginTop: 8 }}>{msg}</Text> : null}
          <Pressable
            disabled={busy || (!!token && !addrId)}
            onPress={token ? pay : onNeedLogin}
            style={[s.cta, { marginTop: 8, backgroundColor: token && !addrId ? "#999" : "#000" }]}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>{token ? `PAYER ${eur(total)}` : "SE CONNECTER POUR PAYER"}</Text>}
          </Pressable>
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
