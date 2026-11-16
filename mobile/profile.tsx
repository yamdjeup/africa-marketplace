import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { authed } from "./api";
import { API_URL } from "./config";
import { tr } from "./region";

// Reprend src/app/[locale]/account/security/page.tsx + profile-form.tsx (nom, mot de passe ; compte Google : pas de mot de passe).
type Info = { name: string; email: string; social: boolean; memberSince: string };
const ERR: Record<string, [string, string]> = {
  required: ["Veuillez renseigner votre nom.", "Please enter your name."],
  password: ["Le mot de passe doit contenir au moins 8 caractères.", "The password must be at least 8 characters."],
  current: ["Le mot de passe actuel est incorrect.", "The current password is incorrect."],
};

export function ProfileScreen({ token, onBack, onSaved }: { token: string; onBack: () => void; onSaved?: (name: string) => void }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [name, setName] = useState("");
  const [cur, setCur] = useState("");
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setLoadErr("");
    authed<Info>(token, "GET", "/api/v1/auth/profile").then((r) => {
      if (r.ok && r.data.email) { setInfo(r.data); setName(r.data.name); }
      else setLoadErr(`${API_URL}/api/v1/auth/profile · HTTP ${r.status || "réseau/délai"}`);
    });
  }, [token, tick]);
  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await authed<{ error?: string; name?: string }>(token, "POST", "/api/v1/auth/profile", { name, currentPassword: cur, newPassword: pwd });
    setBusy(false);
    if (r.ok) { setCur(""); setPwd(""); setMsg({ ok: true, text: tr("Modifications enregistrées.", "Changes saved.") }); onSaved?.(name.trim()); }
    else { const e = ERR[r.data.error ?? ""]; setMsg({ ok: false, text: e ? tr(e[0], e[1]) : tr("Une erreur est survenue. Réessayez.", "Something went wrong. Please try again.") }); }
  };
  if (!info) return loadErr ? (
    <View style={{ padding: 16 }}>
      <Pressable onPress={onBack} hitSlop={8}><Text style={s.link}>← {tr("Mon compte", "My account")}</Text></Pressable>
      <Text style={[s.mut, { marginTop: 16 }]}>{tr("Chargement impossible.", "Could not load.")} {loadErr}</Text>
      <Pressable onPress={() => setTick((n) => n + 1)} style={s.cta}><Text style={s.ctaText}>{tr("Réessayer", "Retry")}</Text></Pressable>
    </View>
  ) : <ActivityIndicator style={{ marginTop: 40 }} />;
  const since = new Intl.DateTimeFormat(tr("fr-FR", "en-GB"), { dateStyle: "long" }).format(new Date(info.memberSince));
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} hitSlop={8} style={{ marginBottom: 8 }}><Text style={s.link}>← {tr("Mon compte", "My account")}</Text></Pressable>
      <Text style={s.h2}>{tr("Détails et sécurité", "Details and security")}</Text>
      <Text style={s.mut}>{tr("Membre depuis le", "Member since")} {since}</Text>
      <Text style={s.label}>{tr("E-mail", "Email")}</Text>
      <TextInput style={[s.input, { opacity: 0.6 }]} value={info.email} editable={false} />
      <Text style={s.label}>{tr("Nom", "Name")}</Text>
      <TextInput style={s.input} value={name} onChangeText={setName} autoComplete="name" />
      {info.social ? <Text style={s.mut}>{tr("Compte connecté via Google : pas de mot de passe à gérer ici.", "Signed in with Google: no password to manage here.")}</Text> : (
        <>
          <Text style={s.label}>{tr("Mot de passe actuel", "Current password")}</Text>
          <TextInput style={s.input} value={cur} onChangeText={setCur} secureTextEntry autoComplete="current-password" />
          <Text style={s.label}>{tr("Nouveau mot de passe", "New password")}</Text>
          <TextInput style={s.input} value={pwd} onChangeText={setPwd} secureTextEntry autoComplete="new-password" />
        </>
      )}
      {msg ? <Text style={{ color: msg.ok ? "#1e7546" : "#b00020", marginBottom: 8 }}>{msg.text}</Text> : null}
      <Pressable disabled={busy} onPress={save} style={s.cta}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>{tr("Enregistrer", "Save")}</Text>}</Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h2: { fontSize: 18, fontWeight: "700", marginBottom: 8, color: "#221812" },
  mut: { fontSize: 14, color: "#6b5d52", marginBottom: 12 },
  label: { fontSize: 12, color: "#6b5d52", marginBottom: 4 },
  link: { color: "#1c3060", textDecorationLine: "underline" },
  input: { backgroundColor: "#faf6ee", color: "#221812", borderWidth: 1, borderColor: "#ded6c9", paddingHorizontal: 12, height: 48, fontSize: 16, marginBottom: 12 },
  cta: { backgroundColor: "#221812", paddingVertical: 14, alignItems: "center" },
  ctaText: { color: "#fff", fontWeight: "700" },
});
