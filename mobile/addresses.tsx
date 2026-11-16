import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { authed } from "./api";

type Address = { id: string; firstName: string; lastName: string; line1: string; houseNumber: string; postalCode: string; city: string; country: string; phone: string; isDefault: boolean };
type Form = { firstName: string; lastName: string; country: string; houseNumber: string; line1: string; postalCode: string; city: string; phone: string };
const EMPTY: Form = { firstName: "", lastName: "", country: "France", houseNumber: "", line1: "", postalCode: "", city: "", phone: "" };
const LABELS: [keyof Form, string][] = [["firstName", "Prénom"], ["lastName", "Nom"], ["country", "Pays"], ["houseNumber", "Numéro"], ["line1", "Rue"], ["postalCode", "Code postal"], ["city", "Ville"], ["phone", "Téléphone (ex. +33612345678)"]];

export function AddressesScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [items, setItems] = useState<Address[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => authed<{ items: Address[] }>(token, "GET", "/api/v1/addresses").then((r) => r.ok && setItems(r.data.items));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const save = async () => {
    const r = await authed<{ items?: Address[]; error?: string }>(token, "POST", "/api/v1/addresses", { ...form, id: editId ?? undefined });
    if (!r.ok) return setMsg(r.data.error === "postal" ? "Code postal invalide pour ce pays." : "Veuillez vérifier les champs obligatoires (téléphone avec indicatif).");
    setItems(r.data.items ?? []);
    setForm(null);
    setEditId(null);
    setMsg(null);
  };
  const act = async (method: string, path: string, body?: unknown) => {
    const r = await authed<{ items?: Address[] }>(token, method, path, body);
    if (r.ok) setItems(r.data.items ?? []);
  };

  if (form) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={s.h2}>{editId ? "MODIFIER L’ADRESSE" : "NOUVELLE ADRESSE"}</Text>
        {LABELS.map(([k, l]) => <TextInput placeholderTextColor="#767676" selectionColor="#000" key={k} style={s.input} placeholder={l} value={form[k]} onChangeText={(v) => setForm({ ...form, [k]: v })} keyboardType={k === "phone" ? "phone-pad" : "default"} />)}
        {msg ? <Text style={s.msg}>{msg}</Text> : null}
        <Pressable style={s.cta} onPress={save}><Text style={s.ctaText}>ENREGISTRER</Text></Pressable>
        <Pressable style={{ marginTop: 12 }} onPress={() => { setForm(null); setEditId(null); setMsg(null); }}><Text style={s.link}>Annuler</Text></Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Pressable onPress={onBack} style={{ marginBottom: 8 }}><Text style={s.link}>← Mon compte</Text></Pressable>
      <Text style={s.h2}>MES ADRESSES</Text>
      {items.length === 0 && <Text style={s.mut}>Aucune adresse enregistrée.</Text>}
      {items.map((a) => (
        <View key={a.id} style={s.card}>
          <Text style={s.bold}>{a.firstName} {a.lastName}{a.isDefault ? "  ·  PAR DÉFAUT" : ""}</Text>
          <Text>{a.houseNumber} {a.line1}</Text>
          <Text>{a.postalCode} {a.city}, {a.country}</Text>
          <Text style={s.mut}>{a.phone}</Text>
          <View style={{ flexDirection: "row", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
            <Pressable hitSlop={8} onPress={() => { setEditId(a.id); setForm({ firstName: a.firstName, lastName: a.lastName, country: a.country, houseNumber: a.houseNumber, line1: a.line1, postalCode: a.postalCode, city: a.city, phone: a.phone }); }}><Text style={s.link}>Modifier</Text></Pressable>
            {!a.isDefault && <Pressable hitSlop={8} onPress={() => act("PATCH", "/api/v1/addresses", { id: a.id })}><Text style={s.link}>Par défaut</Text></Pressable>}
            <Pressable hitSlop={8} onPress={() => Alert.alert("Supprimer cette adresse ?", "", [{ text: "Annuler" }, { text: "Supprimer", style: "destructive", onPress: () => act("DELETE", `/api/v1/addresses?id=${encodeURIComponent(a.id)}`) }])}><Text style={s.link}>Supprimer</Text></Pressable>
          </View>
        </View>
      ))}
      <Pressable style={[s.cta, { marginTop: 16 }]} onPress={() => setForm(EMPTY)}><Text style={s.ctaText}>AJOUTER UNE ADRESSE</Text></Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h2: { fontSize: 18, fontWeight: "700", letterSpacing: 1, marginBottom: 16 },
  mut: { fontSize: 14, color: "#666" },
  bold: { fontWeight: "700", marginBottom: 2 },
  input: { backgroundColor: "#fff", color: "#111", borderWidth: 1, borderColor: "#ccc", paddingHorizontal: 12, height: 48, fontSize: 16, marginBottom: 12 },
  msg: { color: "#b00020", fontSize: 14, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: "#ddd", padding: 12, marginBottom: 12 },
  cta: { backgroundColor: "#000", height: 48, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontWeight: "700", letterSpacing: 1 },
  link: { textDecorationLine: "underline", fontSize: 15, color: "#111" },
});
