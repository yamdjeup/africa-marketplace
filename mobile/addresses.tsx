import { tr } from "./region";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { authed } from "./api";
import { COUNTRY_FR } from "./countries";
import { CountryPicker, Flag, PhoneInput, codeOfCountry } from "./flags";

type Address = { id: string; firstName: string; lastName: string; line1: string; houseNumber: string; box?: string | null; line2?: string | null; postalCode: string; city: string; country: string; phone: string; isDefault: boolean };
type Form = { firstName: string; lastName: string; country: string; houseNumber: string; box: string; line2: string; line1: string; postalCode: string; city: string; phone: string };
const EMPTY: Form = { firstName: "", lastName: "", country: "France", houseNumber: "", box: "", line2: "", line1: "", postalCode: "", city: "", phone: "" };
export type AddressForm = Form;
export const EMPTY_FORM = EMPTY;
const LABELS: [keyof Form, string][] = [["firstName", "Prénom *"], ["lastName", "Nom *"], ["country", "Pays / Région"], ["line1", "Rue *"], ["houseNumber", "Numéro"], ["box", "Boîte (facultatif)"], ["line2", "Complément (facultatif)"], ["postalCode", "Code postal *"], ["city", "Ville *"], ["phone", "Téléphone * (ex. +33612345678)"]];

type Suggestion = { label: string; placeId?: string; street: string; houseNumber: string; postalCode: string; city: string; countryCode: string };

/** Champs d'adresse du site (address-fields.tsx), libellé au-dessus de chaque champ, recherche /api/address/suggest ; réutilisé par le panier. */
export function AddressFields({ form, setForm }: { form: Form; setForm: (f: Form) => void }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const search = (q: string) => {
    setQuery(q);
    clearTimeout(timer.current);
    if (q.trim().length < 3) return setItems([]);
    timer.current = setTimeout(async () => {
      const r = await authed<{ suggestions?: Suggestion[] }>(null, "GET", `/api/address/suggest?locale=fr&country=${encodeURIComponent(form.country)}&q=${encodeURIComponent(q)}`);
      setItems(r.data.suggestions ?? []);
    }, 350);
  };
  const choose = async (sg: Suggestion) => {
    let full: Suggestion | null = sg;
    if (sg.placeId) full = (await authed<{ suggestion?: Suggestion | null }>(null, "GET", `/api/address/suggest?locale=fr&placeId=${encodeURIComponent(sg.placeId)}`)).data.suggestion ?? null;
    setItems([]);
    if (!full) return;
    setForm({ ...form, line1: full.street || form.line1, houseNumber: full.houseNumber, postalCode: full.postalCode, city: full.city, ...(COUNTRY_FR[full.countryCode] ? { country: COUNTRY_FR[full.countryCode] } : {}) });
    setQuery("");
  };
  const field = (k: keyof Form, l: string) => k === "country" ? (
    <View key={k}>
      <Text style={s.label}>{l}</Text>
      <CountryPicker value={codeOfCountry(form.country)} onSelect={(c) => setForm({ ...form, country: COUNTRY_FR[c] })}>
        <View style={[s.input, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
          {codeOfCountry(form.country) ? <Flag code={codeOfCountry(form.country)} /> : null}
          <Text style={{ flex: 1, fontSize: 16, color: "#221812" }}>{form.country}</Text><Text>▾</Text>
        </View>
      </CountryPicker>
    </View>
  ) : k === "phone" ? (
    <View key={k}>
      <Text style={s.label}>{l}</Text>
      <PhoneInput country={form.country} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} inputStyle={s.input} />
    </View>
  ) : (
    <View key={k}>
      <Text style={s.label}>{l}</Text>
      <TextInput placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={s.input} value={form[k]} onChangeText={(v) => setForm({ ...form, [k]: v })} keyboardType="default" autoCapitalize={k === "line1" || k === "city" || k === "firstName" || k === "lastName" ? "words" : "none"} />
    </View>
  );
  const [first, second, country, ...rest] = LABELS;
  return (
    <>
      {field(...first)}
      {field(...second)}
      {field(...country)}
      <Text style={s.label}>{tr("Rechercher votre adresse", "Search your address")}</Text>
      <TextInput placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={s.input} placeholder="Commencez à saisir : rue, numéro, ville…" value={query} onChangeText={search} autoCorrect={false} />
      {items.map((sg, i) => (
        <Pressable key={`${sg.label}-${i}`} onPress={() => choose(sg)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f2eadd" }}>
          <Text>{sg.label}</Text>
        </Pressable>
      ))}
      {rest.map(([k, l]) => field(k, l))}
    </>
  );
}

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
        <Text style={s.h2}>{editId ? "Modifier l’adresse" : "Nouvelle adresse"}</Text>
        <AddressFields form={form} setForm={setForm} />
        {msg ? <Text style={s.msg}>{msg}</Text> : null}
        <Pressable style={s.cta} onPress={save}><Text style={s.ctaText}>{tr("Enregistrer", "Save")}</Text></Pressable>
        <Pressable style={{ marginTop: 12 }} onPress={() => { setForm(null); setEditId(null); setMsg(null); }}><Text style={s.link}>{tr("Annuler", "Cancel")}</Text></Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Pressable onPress={onBack} style={{ marginBottom: 8 }}><Text style={s.link}>← Mon compte</Text></Pressable>
      <Text style={s.h2}>{tr("Mes adresses", "My addresses")}</Text>
      {items.length === 0 && <Text style={s.mut}>Aucune adresse enregistrée.</Text>}
      {items.map((a) => (
        <View key={a.id} style={s.card}>
          <Text style={s.bold}>{a.firstName} {a.lastName}{a.isDefault ? "  ·  PAR DÉFAUT" : ""}</Text>
          <Text>{a.houseNumber} {a.line1}</Text>
          <Text>{a.postalCode} {a.city}, {a.country}</Text>
          <Text style={s.mut}>{a.phone}</Text>
          <View style={{ flexDirection: "row", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
            <Pressable hitSlop={8} onPress={() => { setEditId(a.id); setForm({ firstName: a.firstName, lastName: a.lastName, country: a.country, houseNumber: a.houseNumber, box: a.box ?? "", line2: a.line2 ?? "", line1: a.line1, postalCode: a.postalCode, city: a.city, phone: a.phone }); }}><Text style={s.link}>{tr("Modifier", "Edit")}</Text></Pressable>
            {!a.isDefault && <Pressable hitSlop={8} onPress={() => act("PATCH", "/api/v1/addresses", { id: a.id })}><Text style={s.link}>Par défaut</Text></Pressable>}
            <Pressable hitSlop={8} onPress={() => Alert.alert("Supprimer cette adresse ?", "", [{ text: "Annuler" }, { text: "Supprimer", style: "destructive", onPress: () => act("Delete", `/api/v1/addresses?id=${encodeURIComponent(a.id)}`) }])}><Text style={s.link}>{tr("Supprimer", "Delete")}</Text></Pressable>
          </View>
        </View>
      ))}
      <Pressable style={[s.cta, { marginTop: 16 }]} onPress={() => setForm(EMPTY)}><Text style={s.ctaText}>{tr("Ajouter une adresse", "Add an address")}</Text></Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h2: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 18, fontWeight: "700", marginBottom: 16 },
  mut: { fontSize: 14, color: "#666" },
  bold: { fontWeight: "700", marginBottom: 2 },
  input: { backgroundColor: "#faf6ee", color: "#221812", borderWidth: 1, borderColor: "#ded6c9", paddingHorizontal: 12, height: 48, fontSize: 16, marginBottom: 12 },
  label: { fontSize: 12, color: "#666", marginBottom: 4 },
  msg: { color: "#b00020", fontSize: 14, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: "#ded6c9", padding: 12, marginBottom: 12 },
  cta: { borderRadius: 8, backgroundColor: "#1c3060", height: 48, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontWeight: "700", },
  link: { textDecorationLine: "underline", fontSize: 15, color: "#221812" },
});
