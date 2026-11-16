import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "./config";

type Product = { slug: string; name: string; description: string; story: string; creatorName: string; priceCents: number; images: string[]; material: string | null; technique: string | null; origin: string | null; dimensions: string | null; categorySlug: string; url: string; stock: number };
type Home = { categories: { slug: string; label: string }[]; news: Product[]; latest: Product[]; creators: { slug: string; name: string; specialty: string; image: string }[]; byCategory: { slug: string; label: string; items: Product[] }[] };
type List = { items: Product[]; total: number; page: number; pages: number };
type Tab = "home" | "shop" | "favs" | "me";

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;
const get = async <T,>(path: string): Promise<T> => {
  const r = await fetch(`${API_URL}${path}`);
  if (!r.ok) throw new Error(String(r.status));
  return r.json() as Promise<T>;
};

function Card({ p, fav, onFav, onOpen, wide }: { p: Product; fav: boolean; onFav: () => void; onOpen: () => void; wide?: boolean }) {
  return (
    <Pressable onPress={onOpen} style={[s.card, wide && { width: "48%" }]}>
      <Image source={{ uri: p.images[0] }} style={s.cardImg} />
      <Pressable onPress={onFav} hitSlop={10} style={s.heart}><Text style={{ fontSize: 20 }}>{fav ? "♥" : "♡"}</Text></Pressable>
      <Text style={s.brand} numberOfLines={1}>{p.creatorName.toUpperCase()}</Text>
      <Text numberOfLines={1} style={s.name}>{p.name}</Text>
      <Text style={s.price}>{eur(p.priceCents)}</Text>
    </Pressable>
  );
}

function Row({ title, items, favs, toggle, open }: { title: string; items: Product[]; favs: string[]; toggle: (p: Product) => void; open: (p: Product) => void }) {
  if (!items.length) return null;
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={s.h2}>{title}</Text>
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={items} keyExtractor={(p) => p.slug} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        renderItem={({ item }) => <Card p={item} fav={favs.includes(item.slug)} onFav={() => toggle(item)} onOpen={() => open(item)} />} />
    </View>
  );
}

function Detail({ p, onClose, fav, onFav }: { p: Product; onClose: () => void; fav: boolean; onFav: () => void }) {
  const buy = () => WebBrowser.openBrowserAsync(p.url);
  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={s.bar}>
          <Pressable onPress={onClose} hitSlop={12}><Text style={{ fontSize: 24 }}>←</Text></Pressable>
          <Pressable onPress={onFav} hitSlop={12}><Text style={{ fontSize: 24 }}>{fav ? "♥" : "♡"}</Text></Pressable>
        </View>
        <ScrollView>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {p.images.map((u) => <Image key={u} source={{ uri: u }} style={s.hero} resizeMode="cover" />)}
          </ScrollView>
          <View style={{ padding: 16 }}>
            <Text style={s.brand}>{p.creatorName.toUpperCase()}</Text>
            <Text style={[s.h2, { paddingHorizontal: 0 }]}>{p.name}</Text>
            <Text style={[s.price, { fontSize: 18 }]}>{eur(p.priceCents)}</Text>
            <Text style={s.body}>{p.description}</Text>
            {[p.material && `Matière : ${p.material}`, p.technique && `Technique : ${p.technique}`, p.origin && `Origine : ${p.origin}`, p.dimensions && `Dimensions : ${p.dimensions}`].filter(Boolean).map((l) => <Text key={l as string} style={s.meta}>{l}</Text>)}
            {p.story ? <Text style={[s.body, { marginTop: 12 }]}>{p.story}</Text> : null}
          </View>
        </ScrollView>
        <View style={s.buyBar}>
          <Pressable onPress={buy} disabled={p.stock < 1} style={[s.cta, p.stock < 1 && { backgroundColor: "#999" }]}>
            <Text style={s.ctaText}>{p.stock < 1 ? "ÉPUISÉ" : "ACHETER"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

export default function App() {
  return <SafeAreaProvider><Main /></SafeAreaProvider>;
}

function Main() {
  const [tab, setTab] = useState<Tab>("home");
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState(false);
  const [list, setList] = useState<List | null>(null);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("new");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [favItems, setFavItems] = useState<Product[]>([]);
  const [open, setOpen] = useState<Product | null>(null);
  const favs = favItems.map((p) => p.slug);

  useEffect(() => {
    AsyncStorage.getItem("favs").then((v) => v && setFavItems(JSON.parse(v) as Product[]));
    get<Home>("/api/v1/home?locale=fr").then(setHome).catch(() => setError(true));
  }, []);
  useEffect(() => {
    const q = new URLSearchParams({ locale: "fr", sort });
    if (category) q.set("category", category);
    get<List>(`/api/v1/products?${q}`).then(setList).catch(() => setError(true));
  }, [category, sort]);

  const toggle = useCallback((p: Product) => {
    setFavItems((cur) => {
      const next = cur.some((x) => x.slug === p.slug) ? cur.filter((x) => x.slug !== p.slug) : [...cur, p];
      AsyncStorage.setItem("favs", JSON.stringify(next));
      return next;
    });
  }, []);

  const grid = (items: Product[]) => (
    <FlatList numColumns={2} data={items} keyExtractor={(p) => p.slug} columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 16 }}
      renderItem={({ item }) => <Card wide p={item} fav={favs.includes(item.slug)} onFav={() => toggle(item)} onOpen={() => setOpen(item)} />} />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar style="dark" />
      <View style={s.header}><Text style={s.logo}>E PÓM TA’</Text></View>
      <View style={{ flex: 1 }}>
        {error && !home ? <Text style={s.center}>Connexion impossible. Vérifiez votre réseau.</Text> : null}
        {tab === "home" && (home ? (
          <ScrollView>
            <Row title="NOUVEAUTÉS" items={home.news.length ? home.news : home.latest} favs={favs} toggle={toggle} open={setOpen} />
            <View style={{ marginTop: 24 }}>
              <Text style={s.h2}>CRÉATEURS DU MOMENT</Text>
              <FlatList horizontal showsHorizontalScrollIndicator={false} data={home.creators} keyExtractor={(c) => c.slug} contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
                renderItem={({ item }) => (
                  <Pressable onPress={() => { setCategory(""); setTab("shop"); }} style={{ alignItems: "center", width: 90 }}>
                    <Image source={{ uri: item.image }} style={s.avatar} />
                    <Text numberOfLines={2} style={s.creator}>{item.name}</Text>
                  </Pressable>
                )} />
            </View>
            {home.byCategory.map((c) => <Row key={c.slug} title={c.label.toUpperCase()} items={c.items} favs={favs} toggle={toggle} open={setOpen} />)}
            <View style={{ height: 24 }} />
          </ScrollView>
        ) : !error && <ActivityIndicator style={{ marginTop: 40 }} />)}

        {tab === "shop" && (
          <View style={{ flex: 1 }}>
            <Pressable onPress={() => setFiltersOpen(true)} style={s.filterBtn}><Text style={s.filterText}>FILTRER ET TRIER{category ? " ·1" : ""}</Text></Pressable>
            {list ? grid(list.items) : <ActivityIndicator style={{ marginTop: 40 }} />}
            {filtersOpen && (
              <View style={s.sheet}>
                <ScrollView>
                  <Text style={s.h2}>CATÉGORIE</Text>
                  {[{ slug: "", label: "Toutes" }, ...(home?.categories ?? [])].map((c) => (
                    <Pressable key={c.slug} onPress={() => setCategory(c.slug)} style={s.opt}><Text style={category === c.slug ? s.optOn : s.optOff}>{c.label}</Text></Pressable>
                  ))}
                  <Text style={[s.h2, { marginTop: 16 }]}>TRI</Text>
                  {[["new", "Nouveautés"], ["price-asc", "Prix croissant (€)"], ["price-desc", "Prix décroissant (€)"]].map(([k, l]) => (
                    <Pressable key={k} onPress={() => setSort(k)} style={s.opt}><Text style={sort === k ? s.optOn : s.optOff}>{l}</Text></Pressable>
                  ))}
                </ScrollView>
                <Pressable onPress={() => setFiltersOpen(false)} style={s.cta}><Text style={s.ctaText}>VOIR {list?.total ?? 0} RÉSULTATS</Text></Pressable>
              </View>
            )}
          </View>
        )}

        {tab === "favs" && (favItems.length ? grid(favItems) : <Text style={s.center}>Aucun favori pour le moment.{"\n"}Touchez ♡ sur une pièce.</Text>)}

        {tab === "me" && (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={s.h2}>MON COMPTE</Text>
            <Text style={s.body}>Langue : Français</Text>
            <Text style={s.body}>Le suivi des commandes se fait par e-mail et sur le site.</Text>
            <Pressable style={[s.cta, { marginTop: 16 }]} onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/fr/login`)}><Text style={s.ctaText}>MON COMPTE SUR LE SITE</Text></Pressable>
            <Pressable style={[s.cta, { marginTop: 12 }]} onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/fr/support`)}><Text style={s.ctaText}>BESOIN D’AIDE ?</Text></Pressable>
          </ScrollView>
        )}
      </View>
      <View style={s.tabs}>
        {([["home", "ACCUEIL"], ["shop", "BOUTIQUE"], ["favs", "FAVORIS"], ["me", "MOI"]] as [Tab, string][]).map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={s.tab}><Text style={[s.tabText, tab === k && { color: "#000", fontWeight: "700" }]}>{l}{k === "favs" && favs.length ? ` (${favs.length})` : ""}</Text></Pressable>
        ))}
      </View>
      {open && <Detail p={open} onClose={() => setOpen(null)} fav={favs.includes(open.slug)} onFav={() => toggle(open)} />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#ddd" },
  logo: { fontSize: 20, fontWeight: "800", letterSpacing: 4 },
  h2: { fontSize: 14, fontWeight: "800", letterSpacing: 1, paddingHorizontal: 16, marginBottom: 10 },
  card: { width: 160, marginBottom: 16 },
  cardImg: { width: "100%", aspectRatio: 0.8, backgroundColor: "#f2f2f2" },
  heart: { position: "absolute", top: 6, right: 8 },
  brand: { fontSize: 11, fontWeight: "800", marginTop: 6, letterSpacing: 0.5 },
  name: { fontSize: 13, color: "#333" },
  price: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#eee" },
  creator: { fontSize: 11, textAlign: "center", marginTop: 6 },
  tabs: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#ddd" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 14 },
  tabText: { fontSize: 11, letterSpacing: 1, color: "#777" },
  center: { textAlign: "center", marginTop: 60, color: "#555", paddingHorizontal: 24 },
  filterBtn: { margin: 16, borderWidth: 1, paddingVertical: 12, alignItems: "center" },
  filterText: { fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  sheet: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "#fff", padding: 16, paddingTop: 24 },
  opt: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#eee" },
  optOn: { fontWeight: "800" },
  optOff: { color: "#444" },
  bar: { flexDirection: "row", justifyContent: "space-between", padding: 16 },
  hero: { width: Dimensions.get("window").width, aspectRatio: 0.8, backgroundColor: "#f2f2f2" },
  body: { fontSize: 14, lineHeight: 21, color: "#333", marginTop: 8 },
  meta: { fontSize: 13, color: "#555", marginTop: 4 },
  buyBar: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#ddd", backgroundColor: "#fff" },
  cta: { backgroundColor: "#111", paddingVertical: 15, alignItems: "center" },
  ctaText: { color: "#fff", fontWeight: "800", letterSpacing: 1.5, fontSize: 13 },
});
