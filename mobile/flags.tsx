import { useState } from "react";
import { FlatList, Image, Modal, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { COUNTRY_FR } from "./countries";

// Mêmes indicatifs que src/lib/phone.ts (DIAL) ; drapeaux en images flagcdn comme le site (flag.tsx / phone-field.tsx).
export const DIAL: Record<string, string> = {
  FR: "33", BE: "32", CH: "41", LU: "352", DE: "49", ES: "34", IT: "39", NL: "31", GB: "44", US: "1", CA: "1",
  SN: "221", CI: "225", CM: "237", CD: "243", CG: "242", GA: "241", ML: "223", BF: "226", BJ: "229", TG: "228",
  NE: "227", GN: "224", MG: "261", MA: "212", DZ: "213", TN: "216", NG: "234", GH: "233", KE: "254", ET: "251",
  ZA: "27", AO: "244", HT: "509", GP: "590", MQ: "596", RE: "262", GF: "594", PT: "351", BR: "55",
};
const FIRST = ["FR", "CM", "BE", "CI"];
const fold = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function Flag({ code, w = 28, h = 20 }: { code: string; w?: number; h?: number }) {
  return <Image source={{ uri: `https://flagcdn.com/w80/${code.toLowerCase()}.png` }} style={{ width: w, height: h, borderRadius: 2 }} resizeMode="cover" />;
}

export function codeOfCountry(name: string): string {
  return Object.entries(COUNTRY_FR).find(([, n]) => n === name)?.[0] ?? "";
}

// Validation E.164 identique à src/lib/phone.ts.
const LEN: Record<string, [number, number]> = { FR: [9, 9], BE: [8, 9], CH: [9, 9], LU: [8, 9], DE: [10, 11], ES: [9, 9], IT: [9, 10], NL: [9, 9], GB: [10, 10], US: [10, 10], CA: [10, 10] };
export const isE164 = (v: string) => /^\+\d{7,15}$/.test(v);
export function toE164(code: string, raw: string): string | null {
  const dial = DIAL[code];
  if (!dial) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) { d = d.slice(1); if (!d.startsWith(dial)) return null; d = d.slice(dial.length); }
  else if (d.startsWith("00" + dial)) d = d.slice(2 + dial.length);
  d = d.replace(/^0+/, "");
  const [min, max] = LEN[code] ?? [6, 12];
  return /^\d+$/.test(d) && d.length >= min && d.length <= max ? `+${dial}${d}` : null;
}
export function formatNational(code: string, n: string): string {
  const d = n.replace(/\D/g, "").replace(/^0+/, "");
  if (code === "FR" || code === "BE") return d.replace(/^(\d)(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2}).*$/, (_m, a, b, c, e, f) => [a, b, c, e, f].filter(Boolean).join(" "));
  return d.replace(/(\d{2,3})(?=\d)/g, "$1 ").trim();
}
export function splitE164(v: string, fallback: string): { code: string; national: string } {
  if (!isE164(v)) return { code: fallback, national: v };
  const digits = v.slice(1);
  const hit = Object.entries(DIAL).filter(([, d]) => digits.startsWith(d)).sort((a, b) => b[1].length - a[1].length)[0];
  return hit ? { code: hit[0], national: digits.slice(hit[1].length) } : { code: fallback, national: v };
}

/** Champ téléphone du site (PhoneField) : indicatif + drapeau, numéro national, valeur envoyée en E.164. */
export function PhoneInput({ country, value, onChange, inputStyle }: { country: string; value: string; onChange: (v: string) => void; inputStyle: object }) {
  const countryCode = codeOfCountry(country);
  const init = splitE164(value, DIAL[countryCode] ? countryCode : "FR");
  const [code, setCode] = useState(init.code);
  const [nat, setNat] = useState(formatNational(init.code, init.national));
  const e164 = toE164(code, nat);
  const err = nat && !e164 ? "Numéro de téléphone invalide pour ce pays." : "";
  const emit = (c: string, n: string) => onChange(toE164(c, n) ?? n);
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <CountryPicker value={code} onlyDial onSelect={(c) => { setCode(c); const v = formatNational(c, nat); setNat(v); emit(c, v); }}>
          <View style={[inputStyle, { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 0 }]}>
            <Flag code={code} w={24} h={17} /><Text style={{ color: "#221812", fontSize: 16 }}>+{DIAL[code]} ▾</Text>
          </View>
        </CountryPicker>
        <TextInput style={[inputStyle, { flex: 1, marginBottom: 0 }]} value={nat} keyboardType="phone-pad" autoComplete="tel-national" placeholder={code === "FR" ? "6 12 34 56 78" : ""} placeholderTextColor="#6b5d52" selectionColor="#1c3060" onChangeText={(t) => { const v = formatNational(code, t); setNat(v); emit(code, v); }} />
      </View>
      {err ? <Text style={{ color: "#b3261e", fontSize: 13, marginTop: 4 }}>{err}</Text> : null}
    </View>
  );
}

/** Liste de pays recherchable avec drapeaux (FR/CM/BE/CI en tête), comme CountryPicker du site. */
export function CountryPicker({ value, onSelect, onlyDial, children }: { value: string; onSelect: (code: string) => void; onlyDial?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const all = Object.entries(COUNTRY_FR).filter(([c]) => !onlyDial || DIAL[c]).map(([code, name]) => ({ code, name }));
  const rest = all.filter((c) => !FIRST.includes(c.code)).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const first = FIRST.map((k) => all.find((c) => c.code === k)).filter((c): c is { code: string; name: string } => !!c);
  const n = fold(q.trim());
  const list = [...first, ...rest].filter((c) => !n || fold(c.name).includes(n) || (DIAL[c.code] ?? "").startsWith(n.replace("+", "")));
  return (
    <>
      <Pressable onPress={() => { setQ(""); setOpen(true); }} accessibilityRole="button">{children}</Pressable>
      {open && (
        <Modal animationType="slide" onRequestClose={() => setOpen(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: "#faf6ee" }}>
            <View style={{ flexDirection: "row", alignItems: "center", padding: 12, gap: 8 }}>
              <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Rechercher un pays…" placeholderTextColor="#6b5d52" style={st.search} />
              <Pressable onPress={() => setOpen(false)} hitSlop={10}><Text style={{ color: "#1c3060", fontWeight: "700" }}>Fermer</Text></Pressable>
            </View>
            <FlatList data={list} keyExtractor={(c) => c.code} keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={{ padding: 16, color: "#6b5d52" }}>Aucun pays</Text>}
              renderItem={({ item }) => (
                <Pressable onPress={() => { onSelect(item.code); setOpen(false); }} style={[st.row, item.code === value && { backgroundColor: "#f2eadd" }]}>
                  <Flag code={item.code} />
                  <Text style={{ flex: 1, color: "#221812" }}>{item.name}</Text>
                  {DIAL[item.code] ? <Text style={{ color: "#6b5d52" }}>+{DIAL[item.code]}</Text> : null}
                </Pressable>
              )} />
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}

const st = StyleSheet.create({
  search: { flex: 1, height: 44, backgroundColor: "#f2eadd", color: "#221812", paddingHorizontal: 12, fontSize: 16, borderRadius: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingHorizontal: 16 },
});
