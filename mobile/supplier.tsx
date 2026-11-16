import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { authed } from "./api";
import { tr } from "./region";

type Sub = { id: string; number: string; status: string; createdAt: string; customer: string; subtotalCents: number; acceptBy: string | null };

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

export function SupplierScreen({ token, onBack }: { token: string; onBack: () => void }) {
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
        <View key={x.id} style={st.row}>
          <Text style={{ fontWeight: "600", color: "#221812" }}>{x.number} · {x.status}</Text>
          <Text style={st.mut}>{new Date(x.createdAt).toLocaleDateString()} · {x.customer} · {(x.subtotalCents / 100).toFixed(2)} EUR</Text>
          {x.status === "PENDING" && x.acceptBy ? <Text style={{ color: "#92400e", fontSize: 12 }}>{tr("À accepter avant le ", "Accept before ")}{new Date(x.acceptBy).toLocaleString()}</Text> : null}
        </View>
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
  row: { borderTopWidth: 1, borderColor: "#ded6c9", paddingVertical: 12 },
});
