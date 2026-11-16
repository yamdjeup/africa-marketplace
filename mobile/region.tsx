import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Flag } from "./flags";

// Reprend src/data/regions.ts, src/lib/region.ts, approx-price.tsx et region-panel.tsx du site (textes de i18n.ts, region).
type Region = { code: string; fr: string; currency: string; rate: number };
export const REGIONS: Region[] = [
  { code: "FR", fr: "France", currency: "EUR", rate: 1 },
  { code: "DZ", fr: "Algérie", currency: "DZD", rate: 150 },
  { code: "BJ", fr: "Bénin", currency: "XOF", rate: 655.957 },
  { code: "CM", fr: "Cameroun", currency: "XAF", rate: 655.957 },
  { code: "CI", fr: "Côte d'Ivoire", currency: "XOF", rate: 655.957 },
  { code: "EG", fr: "Égypte", currency: "EGP", rate: 55 },
  { code: "ET", fr: "Éthiopie", currency: "ETB", rate: 140 },
  { code: "GH", fr: "Ghana", currency: "GHS", rate: 13 },
  { code: "KE", fr: "Kenya", currency: "KES", rate: 140 },
  { code: "MG", fr: "Madagascar", currency: "MGA", rate: 4900 },
  { code: "MA", fr: "Maroc", currency: "MAD", rate: 10.8 },
  { code: "MU", fr: "Maurice", currency: "MUR", rate: 50 },
  { code: "NG", fr: "Nigeria", currency: "NGN", rate: 1700 },
  { code: "CD", fr: "RD Congo", currency: "CDF", rate: 3100 },
  { code: "RW", fr: "Rwanda", currency: "RWF", rate: 1500 },
  { code: "SN", fr: "Sénégal", currency: "XOF", rate: 655.957 },
  { code: "TN", fr: "Tunisie", currency: "TND", rate: 3.4 },
  { code: "ZA", fr: "Afrique du Sud", currency: "ZAR", rate: 20 },
];

const KEY = "epomta-region";
let current = "FR";
const listeners = new Set<() => void>();
AsyncStorage.getItem(KEY).then((v) => { if (v) { current = v; listeners.forEach((l) => l()); } });

export function setRegion(code: string) {
  current = code;
  AsyncStorage.setItem(KEY, code);
  listeners.forEach((l) => l());
}

export type Lang = "fr" | "en";
let lang: Lang = "fr";
const langListeners = new Set<() => void>();
AsyncStorage.getItem("epomta-lang").then((v) => { if (v === "en" || v === "fr") { lang = v; langListeners.forEach((l) => l()); } });
export const getLang = () => lang;
export function setLang(l: Lang) { lang = l; AsyncStorage.setItem("epomta-lang", l); langListeners.forEach((f) => f()); }
export function useLang(): Lang {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    langListeners.add(l);
    return () => { langListeners.delete(l); };
  }, []);
  return lang;
}
// Les écrans appellent l'API avec « locale=fr » : on le remplace par la langue choisie.
const baseFetch = globalThis.fetch;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
  baseFetch(typeof input === "string" ? input.replace("locale=fr", `locale=${lang}`) : input, init)) as typeof fetch;
/** Texte FR/EN (textes du site, lib/i18n). */
export const tr = (fr: string, en: string) => (lang === "en" ? en : fr);

export function useRegion(): Region {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return REGIONS.find((r) => r.code === current) ?? REGIONS[0];
}

/** Conversion indicative sous le prix en EUR ; rien pour la région par défaut (EUR). */
export function ApproxPrice({ cents, style }: { cents: number; style?: object }) {
  const region = useRegion();
  if (region.currency === "EUR") return null;
  const n = Math.round((cents / 100) * region.rate).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return <Text style={[st.approx, style]} accessibilityLabel={`environ ${n} ${region.currency}, indicatif, paiement en EUR`}>≈ {n} {region.currency}</Text>;
}

export function RegionRow() {
  const region = useRegion();
  const curLang = useLang();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const list = REGIONS.filter((r) => !q || r.fr.toLowerCase().includes(q) || r.currency.toLowerCase().includes(q));
  return (
    <View>
      <Pressable onPress={() => setOpen(true)} style={st.row} accessibilityRole="button" accessibilityLabel="Langue et région">
        <Flag code={region.code} />
        <Text style={st.rowText}>{curLang === "en" ? "English" : "Français"} · {region.fr} · {region.currency}</Text>
        <Text style={st.chev}>›</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={st.modal}>
          <View style={st.top}>
            <Text style={st.title}>Langue et région</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Fermer"><Text style={{ fontSize: 24, color: "#221812" }}>✕</Text></Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            {(["fr", "en"] as Lang[]).map((l) => (
              <Pressable key={l} onPress={() => setLang(l)} accessibilityState={{ selected: l === curLang }} style={[st.langBtn, l === curLang && { backgroundColor: "#1c3060" }]}>
                <Text style={{ color: l === curLang ? "#fff" : "#221812" }}>{l === "fr" ? "Français" : "English"}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher un pays" placeholderTextColor="#8a7d70" style={st.input} />
          <FlatList data={list} keyExtractor={(r) => r.code} keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={{ color: "#6b5d52", padding: 12 }}>Aucun pays trouvé.</Text>}
            renderItem={({ item }) => (
              <Pressable onPress={() => { setRegion(item.code); setOpen(false); }} style={st.item} accessibilityState={{ selected: item.code === region.code }}>
                <Flag code={item.code} />
                <Text style={[st.itemText, item.code === region.code && { fontWeight: "700", color: "#1c3060" }]}>{item.fr}</Text>
                <Text style={{ color: "#6b5d52", fontSize: 12 }}>{item.currency}</Text>
              </Pressable>
            )} />
          <Text style={st.note}>Conversion indicative : le paiement se fait toujours en EUR.</Text>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  approx: { fontSize: 12, color: "#6b5d52" },
  row: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#ded6c9" },
  rowText: { flex: 1, color: "#221812", fontSize: 15 },
  chev: { color: "#221812", fontSize: 18 },
  modal: { flex: 1, backgroundColor: "#faf6ee", padding: 16, paddingTop: 40 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 20, color: "#1c3060" },
  langBtn: { height: 40, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: "#1c3060", justifyContent: "center" },
  input: { height: 44, borderRadius: 8, backgroundColor: "#f2eadd", paddingHorizontal: 12, color: "#221812", marginBottom: 8 },
  item: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 },
  itemText: { flex: 1, color: "#221812", fontSize: 15 },
  note: { color: "#6b5d52", fontSize: 12, paddingTop: 8 },
});
