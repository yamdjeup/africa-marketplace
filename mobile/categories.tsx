import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { authed } from "./api";
import { tr } from "./region";

// Reprend src/app/[locale]/boutique/categories/** (niveaux 2 à 4 : catégories, nouveautés, explorer, découvrir, artistes) et shop-tabs.tsx.
type Cat = { slug: string; label: string; count: number; tab: "art" | "fashion" };
type Detail = { cat: Cat; techniques: { value: string; label: string }[]; materials: { value: string; label: string }[]; artists: { slug: string; name: string }[] };
type Node = { k: "root" } | { k: "new" } | { k: "newDiscover" } | { k: "cat"; slug: string } | { k: "explorer" | "discover" | "artists"; slug: string };
export type Apply = Partial<Record<"category" | "artist" | "material" | "technique" | "sort", string>>;
type Tab = "all" | "art" | "fashion";
const pieces = (n: number) => tr(`${n} pièce${n > 1 ? "s" : ""}`, `${n} piece${n > 1 ? "s" : ""}`);

function Row({ label, hint, onPress }: { label: string; hint?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={st.row} accessibilityRole="button">
      <Text style={st.label}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>{hint ? <Text style={st.hint}>{hint}</Text> : null}<Text style={st.hint}>›</Text></View>
    </Pressable>
  );
}

export function CategoriesScreen({ onClose, onApply }: { onClose: () => void; onApply: (v: Apply) => void }) {
  const [stack, setStack] = useState<Node[]>([{ k: "root" }]);
  const [tab, setTab] = useState<Tab>("all");
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const node = stack[stack.length - 1];
  const slug = "slug" in node ? node.slug : null;
  useEffect(() => { authed<{ cats: Cat[] }>(null, "GET", "/api/v1/shop/categories?locale=fr").then((r) => setCats(r.ok ? r.data.cats : [])); }, []);
  useEffect(() => {
    setDetail(null);
    if (slug && (node.k === "explorer" || node.k === "discover" || node.k === "artists")) authed<Detail>(null, "GET", `/api/v1/shop/categories?locale=fr&slug=${slug}`).then((r) => r.ok && setDetail(r.data));
  }, [slug, node.k]);
  const go = (n: Node) => setStack((s) => [...s, n]);
  const back = () => (stack.length > 1 ? setStack((s) => s.slice(0, -1)) : onClose());
  const apply = (v: Apply) => { onApply(v); onClose(); };
  const cat = cats?.find((c) => c.slug === slug);
  const newOf = (l: string) => tr(`Nouveautés : ${l}`, `New: ${l}`);
  let title = tr("Catégories", "Categories");
  let body: React.ReactNode = null;
  if (!cats) body = <ActivityIndicator style={{ marginTop: 24 }} />;
  else if (node.k === "root") {
    body = (
      <>
        <View style={st.tabs}>
          {([["all", tr("Tout", "All")], ["art", "Art"], ["fashion", tr("Mode", "Fashion")]] as [Tab, string][]).map(([k, l]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[st.tab, tab === k && st.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
              <Text style={[st.tabTx, tab === k && { color: "#221812", fontWeight: "700" }]}>{l.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        <Row label={tr("Nouveautés et tendances", "New and trending")} onPress={() => go({ k: "new" })} />
        {cats.filter((c) => tab === "all" || c.tab === tab).map((c) => <Row key={c.slug} label={c.label} hint={pieces(c.count)} onPress={() => go({ k: "cat", slug: c.slug })} />)}
      </>
    );
  } else if (node.k === "new") {
    title = tr("Nouveautés et tendances", "New and trending");
    body = (<><Row label={tr("Quoi de neuf", "What's new")} onPress={() => apply({ sort: "new" })} /><Row label={tr("Découvrir", "Discover")} onPress={() => go({ k: "newDiscover" })} /></>);
  } else if (node.k === "newDiscover") {
    title = tr("Découvrir", "Discover");
    body = (<><Row label={tr("Tout voir", "See all")} onPress={() => apply({ sort: "new" })} />{cats.map((c) => <Row key={c.slug} label={newOf(c.label)} hint={pieces(c.count)} onPress={() => apply({ category: c.slug, sort: "new" })} />)}</>);
  } else if (node.k === "cat" && cat) {
    title = cat.label;
    body = (<><Row label={cat.label} hint={pieces(cat.count)} onPress={() => go({ k: "explorer", slug: cat.slug })} /><Row label={tr("Découvrir", "Discover")} onPress={() => go({ k: "discover", slug: cat.slug })} /></>);
  } else if (cat && !detail) body = <ActivityIndicator style={{ marginTop: 24 }} />;
  else if (cat && detail && node.k === "explorer") {
    title = cat.label;
    body = (<>
      <Row label={tr(`Tout voir : ${cat.label}`, `See all: ${cat.label}`)} hint={pieces(cat.count)} onPress={() => apply({ category: cat.slug })} />
      {detail.techniques.map((o) => <Row key={`t-${o.value}`} label={o.label} onPress={() => apply({ category: cat.slug, technique: o.value })} />)}
      {detail.materials.map((o) => <Row key={`m-${o.value}`} label={o.label} onPress={() => apply({ category: cat.slug, material: o.value })} />)}
    </>);
  } else if (cat && detail && node.k === "discover") {
    title = tr("Découvrir", "Discover");
    body = (<><Row label={newOf(cat.label)} onPress={() => apply({ category: cat.slug, sort: "new" })} /><Row label={tr("Artistes", "Artists")} hint={String(detail.artists.length)} onPress={() => go({ k: "artists", slug: cat.slug })} /></>);
  } else if (cat && detail && node.k === "artists") {
    title = tr("Artistes", "Artists");
    body = <>{detail.artists.map((a) => <Row key={a.slug} label={a.name} onPress={() => apply({ category: cat.slug, artist: a.slug })} />)}</>;
  }
  return (
    <Modal animationType="slide" onRequestClose={back}>
      <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: "#faf6ee" }}>
        <View style={st.bar}>
          <Pressable onPress={back} hitSlop={12} accessibilityLabel={tr("Retour", "Back")}><Text style={{ fontSize: 28, color: "#221812" }}>←</Text></Pressable>
          <Text style={st.title}>{title}</Text>
          <View style={{ width: 28 }} />
        </View>
        <ScrollView>{body}</ScrollView>
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
  row: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, borderBottomWidth: 1, borderColor: "#ded6c9" },
  label: { fontSize: 16, color: "#221812", flexShrink: 1 },
  hint: { fontSize: 13, color: "#6b5d52" },
});
