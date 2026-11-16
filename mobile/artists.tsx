import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { authed } from "./api";
import { tr } from "./region";

// Reprend src/app/[locale]/boutique/artistes/page.tsx + artist-directory.tsx + shop-tabs.tsx (onglets Tout/Art/Mode, recherche, A–Z, filtre pays).
type Artist = { slug: string; name: string; countries: { key: string; label: string }[] };
type Tab = "all" | "art" | "fashion";
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function ArtistsScreen({ onClose, onOpenCreator }: { onClose: () => void; onOpenCreator: (slug: string) => void }) {
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<Artist[] | null>(null);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  useEffect(() => {
    setItems(null);
    authed<{ items: Artist[] }>(null, "GET", `/api/v1/creators?locale=fr&tab=${tab}`).then((r) => setItems(r.ok ? r.data.items : []));
  }, [tab]);
  const countries = useMemo(() => [...new Map((items ?? []).flatMap((a) => a.countries).map((c) => [c.key, c.label] as const)).entries()].sort((a, b) => a[1].localeCompare(b[1])), [items]);
  const sections = useMemo(() => {
    const shown = (items ?? []).filter((a) => (!country || a.countries.some((c) => c.key === country)) && (!q || norm(a.name).includes(norm(q))));
    const g = new Map<string, Artist[]>();
    for (const a of [...shown].sort((x, y) => x.name.localeCompare(y.name))) {
      const l = norm(a.name).charAt(0).toUpperCase();
      g.set(l, [...(g.get(l) ?? []), a]);
    }
    return [...g.entries()].map(([title, data]) => ({ title, data }));
  }, [items, q, country]);
  const tabs: [Tab, string][] = [["all", tr("Tout", "All")], ["art", "Art"], ["fashion", tr("Mode", "Fashion")]];
  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: "#faf6ee" }}>
        <View style={st.bar}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={tr("Retour", "Back")}><Text style={{ fontSize: 28, color: "#221812" }}>←</Text></Pressable>
          <Text style={st.title}>{tr("Artistes", "Artists")}</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={st.tabs}>
          {tabs.map(([k, l]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[st.tab, tab === k && st.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
              <Text style={[st.tabTx, tab === k && { color: "#221812", fontWeight: "700" }]}>{l.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput value={q} onChangeText={setQ} placeholder={tr("Rechercher un artiste", "Search for an artist")} placeholderTextColor="#8a7d70" style={st.input} accessibilityLabel={tr("Rechercher un artiste", "Search for an artist")} />
        {countries.length > 1 && (
          <View style={st.chips}>
            {[["", tr("Tous les pays", "All countries")] as const, ...countries].map(([k, l]) => (
              <Pressable key={k || "all"} onPress={() => setCountry(k)} style={[st.chip, country === k && st.chipOn]}><Text style={[st.chipTx, country === k && { color: "#fff" }]}>{l}</Text></Pressable>
            ))}
          </View>
        )}
        {!items && <ActivityIndicator style={{ marginTop: 24 }} />}
        {items && sections.length === 0 && <Text style={st.empty}>{tr("Aucun artiste ne correspond.", "No artist matches.")}</Text>}
        <SectionList
          sections={sections}
          keyExtractor={(a) => a.slug}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => <Text style={st.letter}>{section.title}</Text>}
          renderItem={({ item }) => (
            <Pressable onPress={() => onOpenCreator(item.slug)} style={st.row}>
              <Text style={st.name}>{item.name}</Text>
              <Text style={st.sub}>{item.countries.map((c) => c.label).join(", ")}</Text>
            </Pressable>
          )}
        />
      </SafeAreaView></SafeAreaProvider>
    </Modal>
  );
}

const st = StyleSheet.create({
  bar: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  title: { fontSize: 17, fontWeight: "700", color: "#221812" },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#ded6c9" },
  tab: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderColor: "transparent", marginBottom: -1 },
  tabOn: { borderColor: "#221812" },
  tabTx: { fontSize: 13, letterSpacing: 1, color: "#6b5d52" },
  input: { margin: 16, marginBottom: 8, height: 44, borderWidth: 1, borderColor: "#ded6c9", backgroundColor: "#fff", paddingHorizontal: 12, color: "#221812" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chip: { borderWidth: 1, borderColor: "#221812", paddingHorizontal: 12, height: 32, justifyContent: "center" },
  chipOn: { backgroundColor: "#221812" },
  chipTx: { fontSize: 13, color: "#221812" },
  letter: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, fontSize: 13, fontWeight: "700", color: "#6b5d52" },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: "#ded6c9" },
  name: { fontSize: 16, color: "#221812" },
  sub: { fontSize: 13, color: "#6b5d52", marginTop: 2 },
  empty: { padding: 16, color: "#6b5d52" },
});
