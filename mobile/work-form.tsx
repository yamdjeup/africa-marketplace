import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { authed } from "./api";
import { API_URL } from "./config";
import { tr, useLang } from "./region";

type Cat = { slug: string; name: string; nameEn: string };
type Loaded = { categories: Cat[]; product: null | { slug: string; status: string; sourceLang: string; name: string; nameEn: string; description: string; descriptionEn: string; categorySlug: string; price: number; currency: string; material: string; widthCm: number | null; heightCm: number | null; depthCm: number | null; weightG: number | null; edition: string; images: string[]; attested: boolean } };

const ERR: Record<string, [string, string]> = {
  invalid: ["Titre et catégorie obligatoires.", "Title and category are required."],
  price: ["Prix invalide (minimum 1 EUR).", "Invalid price (minimum 1 EUR)."],
  photo: ["Ajoutez au moins une photo pour soumettre.", "Add at least one photo to submit."],
  desc: ["Description trop courte (20 caractères minimum).", "Description too short (20 characters minimum)."],
  stock: ["Stock invalide.", "Invalid stock."],
  size: ["Photo trop lourde (300 Ko maximum).", "Photo too large (300 KB max)."],
  type: ["Format de photo non accepté (JPEG, PNG ou WebP).", "Unsupported photo format (JPEG, PNG or WebP)."],
  rate: ["Trop d'envois, réessayez plus tard.", "Too many uploads, try again later."],
};
const ART = ["peinture", "sculpture", "photographie"];
const CURRENCIES = ["EUR", "USD", "GBP", "XOF", "XAF", "MAD", "NGN", "GHS"];
const MAX_BYTES = 300 * 1024;

// Réduit la photo jusqu'à passer sous 300 Ko (limite du site), puis l'envoie au compte du créateur.
async function uploadPhoto(token: string, uri: string, kind: "photo" | "signature"): Promise<{ url?: string; error?: string }> {
  for (const [width, quality] of [[1400, 0.7], [1200, 0.55], [1000, 0.45], [800, 0.35], [640, 0.3]] as const) {
    const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width } }], { compress: quality, format: ImageManipulator.SaveFormat.JPEG });
    const blob = await (await fetch(out.uri)).blob();
    if (blob.size > MAX_BYTES) continue;
    const form = new FormData();
    form.append("file", { uri: out.uri, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
    form.append("kind", kind);
    try {
      const res = await fetch(`${API_URL}/api/v1/supplier/media`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      return res.ok ? { url: data.url } : { error: data.error ?? "invalid" };
    } catch {
      return { error: "network" };
    }
  }
  return { error: "size" };
}

export function WorkForm({ token, slug, onClose }: { token: string; slug?: string; onClose: (changed: boolean) => void }) {
  const lang = useLang();
  const [cats, setCats] = useState<Cat[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ sourceLang: lang as string, title: "", description: "", category: "", price: "", currency: "EUR", material: "", widthCm: "", heightCm: "", depthCm: "", weightG: "", edition: "", stock: "1", unique: false, attest: false });
  const [photos, setPhotos] = useState<string[]>([]);
  const set = (k: keyof typeof f, v: string | boolean) => setF((o) => ({ ...o, [k]: v }));

  useEffect(() => {
    authed<Loaded>(token, "GET", `/api/v1/supplier/products/save${slug ? `?slug=${encodeURIComponent(slug)}` : ""}`).then((r) => {
      if (r.ok) {
        setCats(r.data.categories);
        const p = r.data.product;
        if (p) {
          const fr = p.sourceLang !== "en";
          setF((o) => ({ ...o, sourceLang: p.sourceLang, title: fr ? p.name : p.nameEn, description: fr ? p.description : p.descriptionEn, category: p.categorySlug, price: String(p.price), currency: p.currency, material: p.material, widthCm: p.widthCm == null ? "" : String(p.widthCm), heightCm: p.heightCm == null ? "" : String(p.heightCm), depthCm: p.depthCm == null ? "" : String(p.depthCm), weightG: p.weightG == null ? "" : String(p.weightG), edition: p.edition, attest: p.attested }));
          setPhotos(p.images);
        }
      }
      setReady(true);
    });
  }, []);

  const pick = async () => {
    if (photos.length >= 6) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setMsg(tr("Autorisez l'accès aux photos pour ajouter une image.", "Allow photo access to add an image.")); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 6 - photos.length, quality: 1 });
    if (res.canceled) return;
    setBusy(true); setMsg("");
    const added: string[] = [];
    for (const a of res.assets.slice(0, 6 - photos.length)) {
      const r = await uploadPhoto(token, a.uri, "photo");
      if (r.url) added.push(r.url);
      else { const e = ERR[r.error ?? ""]; setMsg(e ? tr(e[0], e[1]) : tr("Envoi impossible.", "Upload failed.")); }
    }
    setPhotos((p) => [...p, ...added]);
    setBusy(false);
  };

  const save = async (intent: "draft" | "submit") => {
    setBusy(true); setMsg("");
    const r = await authed<{ error?: string; status?: string }>(token, "POST", "/api/v1/supplier/products/save", { ...f, slug, intent, photos });
    setBusy(false);
    if (r.ok) { Alert.alert(intent === "submit" ? tr("Soumise à la modération.", "Submitted for review.") : tr("Brouillon enregistré.", "Draft saved.")); onClose(true); }
    else { const e = ERR[r.data.error ?? ""]; setMsg(e ? tr(e[0], e[1]) : tr("Enregistrement impossible.", "Could not save.")); }
  };

  if (!ready) return <ActivityIndicator style={{ marginTop: 16 }} />;
  const isArt = ART.includes(f.category);
  const inp = (label: string, k: keyof typeof f, extra: object = {}) => (
    <View style={{ marginTop: 10 }}><Text style={s.mut}>{label}</Text><TextInput value={String(f[k])} onChangeText={(v) => set(k, v)} accessibilityLabel={label} placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={s.input} {...extra} /></View>
  );
  const chip = (label: string, on: boolean, onPress: () => void) => <Pressable key={label} onPress={onPress} style={[s.chip, on && s.chipOn]}><Text style={{ color: on ? "#fff" : "#221812" }}>{label}</Text></Pressable>;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => onClose(false)}><Text style={{ color: "#1c3060" }}>← {tr("Retour", "Back")}</Text></Pressable>
      <Text style={s.h}>{slug ? tr("Modifier la fiche", "Edit listing") : tr("Nouvelle œuvre", "New work")}</Text>
      <Text style={s.mut}>{tr("Langue de saisie", "Writing language")}</Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>{chip("Français", f.sourceLang === "fr", () => set("sourceLang", "fr"))}{chip("English", f.sourceLang === "en", () => set("sourceLang", "en"))}</View>
      <Text style={[s.mut, { marginTop: 6 }]}>{tr("L'autre langue est traduite automatiquement.", "The other language is translated automatically.")}</Text>
      {inp(tr("Titre", "Title"), "title", { maxLength: 140 })}
      {inp(tr("Description (20 caractères minimum pour soumettre)", "Description (20 characters minimum to submit)"), "description", { multiline: true, style: [s.input, { minHeight: 110 }] })}
      <Text style={[s.mut, { marginTop: 10 }]}>{tr("Catégorie", "Category")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>{cats.map((c) => chip(tr(c.name, c.nameEn), f.category === c.slug, () => set("category", c.slug)))}</View>
      {inp(tr("Prix", "Price"), "price", { keyboardType: "decimal-pad" })}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>{CURRENCIES.map((c) => chip(c, f.currency === c, () => set("currency", c)))}</View>
      {inp(tr("Matière", "Material"), "material", { maxLength: 80 })}
      {inp(tr("Largeur (cm)", "Width (cm)"), "widthCm", { keyboardType: "decimal-pad" })}
      {inp(tr("Hauteur (cm)", "Height (cm)"), "heightCm", { keyboardType: "decimal-pad" })}
      {inp(tr("Profondeur (cm)", "Depth (cm)"), "depthCm", { keyboardType: "decimal-pad" })}
      {inp(tr("Poids (g)", "Weight (g)"), "weightG", { keyboardType: "number-pad" })}
      {isArt ? inp(tr("Édition (ex. 1/10)", "Edition (e.g. 1/10)"), "edition", { maxLength: 40 }) : null}
      {!slug ? (
        <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>{chip(tr("Pièce unique", "Unique piece"), f.unique, () => set("unique", !f.unique))}</View>
          {!f.unique ? inp(tr("Stock initial", "Initial stock"), "stock", { keyboardType: "number-pad" }) : null}
          <Text style={[s.mut, { marginTop: 4 }]}>{tr("Les variantes (tailles…) s'ajoutent ensuite dans Œuvres et stocks.", "Variants (sizes…) can then be added in Works and stock.")}</Text>
        </View>
      ) : null}
      <Text style={[s.mut, { marginTop: 14 }]}>{tr("Photos (6 maximum, réduites automatiquement)", "Photos (6 max, resized automatically)")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {photos.map((u) => (
          <Pressable key={u} onPress={() => setPhotos((p) => p.filter((x) => x !== u))} accessibilityLabel={tr("Retirer la photo", "Remove photo")}>
            <Image source={{ uri: u.startsWith("http") ? u : `${API_URL}${u}` }} style={{ width: 84, height: 84, backgroundColor: "#f2eadd" }} />
            <Text style={[s.mut, { textAlign: "center" }]}>{tr("Retirer", "Remove")}</Text>
          </Pressable>
        ))}
        {photos.length < 6 ? <Pressable disabled={busy} onPress={pick} style={{ width: 84, height: 84, borderWidth: 1, borderColor: "#ded6c9", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#1c3060" }}>+ {tr("Photo", "Photo")}</Text></Pressable> : null}
      </View>
      {isArt ? (
        <Pressable onPress={() => set("attest", !f.attest)} style={{ flexDirection: "row", gap: 10, marginTop: 14, alignItems: "flex-start" }} accessibilityRole="checkbox" accessibilityState={{ checked: f.attest }}>
          <View style={{ width: 22, height: 22, borderWidth: 1, borderColor: "#221812", backgroundColor: f.attest ? "#221812" : "transparent" }} />
          <Text style={{ flex: 1, color: "#221812" }}>{tr("J'atteste être l'auteur de cette œuvre.", "I certify that I am the author of this work.")}</Text>
        </Pressable>
      ) : null}
      {msg ? <Text style={{ color: "#b42318", marginTop: 12 }}>{msg}</Text> : null}
      <Pressable disabled={busy} onPress={() => save("draft")} style={[s.btn, s.ghost, { opacity: busy ? 0.6 : 1 }]}><Text style={{ color: "#221812", fontWeight: "600" }}>{tr("Enregistrer le brouillon", "Save draft")}</Text></Pressable>
      <Pressable disabled={busy} onPress={() => save("submit")} style={[s.btn, { opacity: busy ? 0.6 : 1 }]}><Text style={{ color: "#fff", fontWeight: "600" }}>{slug ? tr("Enregistrer et soumettre", "Save and submit") : tr("Soumettre à la modération", "Submit for review")}</Text></Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h: { fontSize: 22, color: "#221812", marginVertical: 10, fontWeight: "600" },
  mut: { color: "#6b5d52", fontSize: 13 },
  input: { borderWidth: 1, borderColor: "#ded6c9", padding: 10, color: "#221812", marginTop: 4, backgroundColor: "#fff" },
  chip: { borderWidth: 1, borderColor: "#ded6c9", paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: "#221812", borderColor: "#221812" },
  btn: { backgroundColor: "#221812", padding: 14, alignItems: "center", marginTop: 12 },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#221812" },
});
