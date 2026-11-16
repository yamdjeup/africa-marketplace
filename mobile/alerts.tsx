import { tr } from "./region";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authed } from "./api";
import { disablePush, enablePush } from "./push";

// Reprend src/components/marketplace/alerts-form.tsx (textes de src/lib/i18n.ts, wishlist.*).
export function AlertsScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [email, setEmail] = useState(false);
  const [promo, setPromo] = useState(false);
  const [pushTok, setPushTok] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const sendTest = async () => {
    setTestMsg("");
    const r = await authed<{ status?: string }>(token, "POST", "/api/v1/alerts/test");
    const st = r.data.status;
    setTestMsg(st === "sent" ? "E-mail de test envoyé à votre adresse." : st === "rate_limited" ? "Patientez une minute avant un nouvel essai." : st === "unconfigured" ? "L'envoi d'e-mails n'est pas configuré sur ce site." : `L'envoi a échoué, réessayez plus tard. (HTTP ${r.status || "réseau/délai"} · ${st ?? "?"})`);
  };
  useEffect(() => {
    authed<{ email?: boolean; promo?: boolean }>(token, "GET", "/api/v1/alerts/prefs").then((r) => { setEmail(!!r.data.email); setPromo(!!r.data.promo); });
    AsyncStorage.getItem("expoPushToken").then(setPushTok);
  }, [token]);
  const save = (p: { email?: boolean; promo?: boolean }) => authed(token, "PUT", "/api/v1/alerts/prefs", p);
  const togglePush = async (v: boolean) => {
    setMsg("");
    if (v) {
      const r = await enablePush(token);
      if (r.token) { setPushTok(r.token); AsyncStorage.setItem("expoPushToken", r.token); } else setMsg(`Impossible d'activer les notifications, réessayez plus tard. (${r.error ?? "?"}${r.detail ? " · " + r.detail : ""})`);
    } else if (pushTok) {
      await disablePush(token, pushTok);
      AsyncStorage.removeItem("expoPushToken");
      setPushTok(null);
    }
  };
  const row = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={s.row}><Text style={{ flex: 1, color: "#221812" }}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ true: "#1c3060" }} /></View>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Pressable onPress={onBack} hitSlop={12} style={{ height: 44, justifyContent: "center" }} accessibilityLabel={tr("Retour", "Back")}><Text style={{ fontSize: 28 }}>←</Text></Pressable>
      <Text style={s.h2}>{tr("Recevoir des alertes", "Get alerts")}</Text>
      <Text style={s.mut}>{tr("Recevoir des alertes sur vos favoris et votre panier via", "Get alerts about your favourites and your cart via")}</Text>
      {row("Notification push", !!pushTok, togglePush)}
      {msg ? <Text style={s.mut}>{msg}</Text> : null}
      {row("E-mail", email, (v) => { setEmail(v); save({ email: v }); })}
      <Text style={[s.h3]}>{tr("Envie de plus ?", "Want more?")}</Text>
      {row("Recevoir des notifications sur les promotions, nouveautés et stocks", promo, (v) => { setPromo(v); save({ promo: v }); })}
      <Pressable onPress={sendTest} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 20, borderWidth: 1, borderColor: "#221812", alignSelf: "flex-start", marginTop: 8 }}><Text style={{ color: "#221812" }}>{tr("Envoyer un e-mail de test", "Send a test email")}</Text></Pressable>
      {testMsg ? <Text style={{ color: "#221812", marginTop: 8 }}>{testMsg}</Text> : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h2: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 24, color: "#1c3060", marginBottom: 8 },
  h3: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 18, color: "#1c3060", marginTop: 20 },
  mut: { color: "#6b5d52", fontSize: 13, marginVertical: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: 1, borderColor: "#ded6c9" },
});
