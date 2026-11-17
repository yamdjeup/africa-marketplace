import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { authed } from "./api";
import { API_URL } from "./config";
import { tr, useLang } from "./region";

type Last = { status: string; adminNote: string | null; createdAt: string; name: string; country: string; craftType: string; portfolioUrl: string; about: string };
type Info = { isPartner: boolean; last: Last | null; prefillName: string; files: { id: string; name: string }[]; countries: string[]; crafts: string[] };

const ERR: Record<string, [string, string]> = {
  invalid: ["Vérifiez les champs : lien du portfolio valide (s'il est renseigné) et présentation d'au moins 20 caractères.", "Please check the fields: valid portfolio link (if provided) and at least 20 characters of description."],
  proof: ["Indiquez un lien (portfolio, réseau social) OU joignez au moins une photo de vos créations.", "Provide a link (portfolio, social profile) OR attach at least one photo of your creations."],
  pending: ["Votre candidature est déjà en cours d'examen.", "Your application is already under review."],
  rate: ["Trop de candidatures aujourd'hui, réessayez demain.", "Too many applications today, please try again tomorrow."],
  name: ["Ce nom est déjà utilisé par un partenaire.", "This name is already used by a partner."],
  partner: ["Votre espace partenaire est déjà ouvert.", "Your partner area is already open."],
  count: ["5 fichiers maximum.", "5 files maximum."],
  size: ["Fichier trop volumineux.", "File too large."],
  type: ["Format non accepté (JPEG, PNG, WebP).", "Unsupported format (JPEG, PNG, WebP)."],
};
const errText = (c?: string) => { const e = ERR[c ?? ""]; return e ? tr(e[0], e[1]) : tr("Une erreur est survenue, réessayez.", "Something went wrong, please try again."); };

export function PartnerApplyScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const lang = useLang();
  const [info, setInfo] = useState<Info | null>(null);
  const [f, setF] = useState({ name: "", country: "Cameroun", craftType: "", portfolioUrl: "", about: "" });
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  const load = () => authed<Info>(token, "GET", "/api/v1/partner/application").then((r) => {
    if (!r.ok) return setMsg(`${tr("Chargement impossible", "Could not load")} (HTTP ${r.status})`);
    const d = r.data;
    setInfo(d);
    setFiles(d.files);
    setF({ name: d.last?.name ?? d.prefillName ?? "", country: d.last?.country ?? "Cameroun", craftType: d.last?.craftType ?? d.crafts[0], portfolioUrl: d.last?.portfolioUrl ?? "", about: d.last?.about ?? "" });
  });
  useEffect(() => { load(); }, []);

  const addPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (res.canceled || !res.assets[0]) return;
    setBusy(true);
    setMsg("");
    const out = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 1600 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
    const form = new FormData();
    form.append("file", { uri: out.uri, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
    try {
      const r = await fetch(`${API_URL}/api/v1/partner/files`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
      const d = (await r.json().catch(() => ({}))) as { id?: string; name?: string; error?: string };
      if (r.ok && d.id) setFiles((x) => [...x, { id: d.id!, name: d.name ?? "photo.jpg" }]);
      else setMsg(errText(d.error));
    } catch {
      setMsg(tr("Réseau indisponible.", "Network unavailable."));
    }
    setBusy(false);
  };
  const removePhoto = async (id: string) => {
    await authed(token, "DELETE", `/api/v1/partner/files?id=${encodeURIComponent(id)}`);
    setFiles((x) => x.filter((y) => y.id !== id));
  };
  const submit = async () => {
    setBusy(true);
    setMsg("");
    const r = await authed<{ error?: string }>(token, "POST", "/api/v1/partner/application", { ...f, locale: lang });
    setBusy(false);
    if (r.ok) { setSent(true); load(); } else setMsg(errText(r.data?.error));
  };

  const status: Record<string, [string, string]> = { PENDING: ["en cours d'examen", "under review"], NEEDS_INFO: ["informations demandées", "more information requested"], ACCEPTED: ["acceptée", "accepted"], REFUSED: ["refusée", "declined"] };
  const last = info?.last;
  const canForm = info && !info.isPartner && last?.status !== "PENDING";

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack}><Text style={s.link}>{tr("‹ Retour", "‹ Back")}</Text></Pressable>
      <Text style={s.h2}>{tr("Devenir partenaire", "Become a partner")}</Text>
      {!info && !msg ? <ActivityIndicator /> : null}
      {info?.isPartner ? <Text style={s.body}>{tr("Votre espace partenaire est ouvert : retrouvez-le dans l'onglet Moi.", "Your partner area is open: find it in the Me tab.")}</Text> : null}
      {sent ? <Text style={s.ok}>{tr("Candidature envoyée. Un e-mail de confirmation vous a été adressé ; nous vous répondrons rapidement.", "Application sent. A confirmation email was sent; we will reply shortly.")}</Text> : null}
      {last && !info?.isPartner ? (
        <Text style={s.card}>
          {tr("Dernière candidature : ", "Latest application: ")}<Text style={{ fontWeight: "700" }}>{tr(...(status[last.status] ?? [last.status, last.status]))}</Text>
          {last.adminNote && last.status !== "ACCEPTED" ? ` — ${last.adminNote}` : ""}
        </Text>
      ) : null}
      {canForm ? (
        <View>
          <Text style={s.label}>{tr("Nom ou nom d'artiste", "Name or artist name")}</Text>
          <TextInput style={s.input} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} maxLength={120} placeholderTextColor="#6b5d52" selectionColor="#1c3060" />
          <Text style={s.label}>{tr("Pays", "Country")}</Text>
          <View style={s.chips}>{info!.countries.map((c) => <Pressable key={c} onPress={() => setF({ ...f, country: c })} style={[s.chip, f.country === c && s.chipOn]}><Text style={[s.chipT, f.country === c && { color: "#fff" }]}>{c}</Text></Pressable>)}</View>
          <Text style={s.label}>{tr("Type de créations", "Type of creations")}</Text>
          <View style={s.chips}>{info!.crafts.map((c) => <Pressable key={c} onPress={() => setF({ ...f, craftType: c })} style={[s.chip, f.craftType === c && s.chipOn]}><Text style={[s.chipT, f.craftType === c && { color: "#fff" }]}>{c}</Text></Pressable>)}</View>
          <Text style={s.label}>{tr("Lien vers votre portfolio ou réseau social (facultatif si vous joignez des photos)", "Link to your portfolio or social profile (optional if you attach photos)")}</Text>
          <TextInput style={s.input} value={f.portfolioUrl} onChangeText={(v) => setF({ ...f, portfolioUrl: v })} autoCapitalize="none" keyboardType="url" placeholder="https://" maxLength={300} placeholderTextColor="#6b5d52" selectionColor="#1c3060" />
          <Text style={s.label}>{tr("Photos de vos créations (5 maximum)", "Photos of your creations (5 maximum)")}</Text>
          {files.map((x) => <View key={x.id} style={s.fileRow}><Text style={{ flex: 1, color: "#221812" }} numberOfLines={1}>{x.name}</Text><Pressable onPress={() => removePhoto(x.id)}><Text style={s.link}>{tr("Retirer", "Remove")}</Text></Pressable></View>)}
          {files.length < 5 ? <Pressable disabled={busy} onPress={addPhoto}><Text style={[s.link, { marginVertical: 8 }]}>{tr("+ Ajouter une photo", "+ Add a photo")}</Text></Pressable> : null}
          <Text style={s.label}>{tr("Présentez-vous et votre travail", "Tell us about you and your work")}</Text>
          <TextInput style={[s.input, { height: 120, textAlignVertical: "top", paddingTop: 10 }]} multiline value={f.about} onChangeText={(v) => setF({ ...f, about: v })} maxLength={3000} placeholderTextColor="#6b5d52" selectionColor="#1c3060" />
          {msg ? <Text style={s.err}>{msg}</Text> : null}
          <Pressable style={[s.cta, { opacity: busy ? 0.6 : 1 }]} disabled={busy} onPress={submit}><Text style={s.ctaT}>{tr("Envoyer ma candidature", "Submit application")}</Text></Pressable>
        </View>
      ) : msg ? <Text style={s.err}>{msg}</Text> : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h2: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 18, fontWeight: "700", marginVertical: 16 },
  body: { fontSize: 15, color: "#221812" },
  label: { fontSize: 14, fontWeight: "600", color: "#221812", marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: "#faf6ee", color: "#221812", borderWidth: 1, borderColor: "#ded6c9", paddingHorizontal: 12, height: 48, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#ded6c9", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: "#1c3060", borderColor: "#1c3060" },
  chipT: { color: "#221812", fontSize: 14 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  card: { borderWidth: 1, borderColor: "#ded6c9", padding: 10, marginBottom: 8, color: "#221812" },
  ok: { color: "#1c3060", marginBottom: 8 },
  err: { color: "#b00020", fontSize: 14, marginVertical: 8 },
  cta: { borderRadius: 8, backgroundColor: "#1c3060", height: 48, alignItems: "center", justifyContent: "center", marginTop: 12 },
  ctaT: { color: "#fff" },
  link: { textDecorationLine: "underline", fontSize: 15, color: "#221812" },
});
