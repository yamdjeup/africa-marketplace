import { useCallback, useEffect, useState } from "react";
import { useFonts, PlayfairDisplay_600SemiBold } from "@expo-google-fonts/playfair-display";
import { Inter_400Regular } from "@expo-google-fonts/inter";
import { ActivityIndicator, FlatList, Dimensions, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar as RNStatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Badges } from "./badges";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "./config";
import { AccountScreen, useAuth } from "./auth";
import { authed } from "./api";
import { CartScreen, type CartLine } from "./cart";
import { ShopScreen } from "./shop";
import { TilaButton } from "./tila";
import { CreatorScreen } from "./creator";
import { StripeProvider } from "@stripe/stripe-react-native";

type Product = { slug: string; name: string; description: string; story: string; creatorName: string; priceCents: number; images: string[]; material: string | null; technique: string | null; origin: string | null; dimensions: string | null; categorySlug: string; url: string; stock: number; isNew?: boolean; isExample?: boolean; edition?: string | null; sizes?: string[]; sizeStock?: Record<string, number> | null; sizeLabel?: string };
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
      <Badges stock={p.stock} isNew={p.isNew} isExample={p.isExample} />
      <Pressable onPress={onFav} hitSlop={6} style={s.heart} accessibilityLabel={fav ? "Retirer des favoris" : "Ajouter aux favoris"}><Text style={[s.heartIcon, fav && { color: "#d4183d" }]}>{fav ? "♥" : "♡"}</Text></Pressable>
      <Text style={s.brand} numberOfLines={1}>{p.creatorName}</Text>
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

function Detail({ p, onClose, fav, onFav, onAdd, token, onNeedLogin }: { token: string | null; onNeedLogin: () => void; p: Product; onClose: () => void; fav: boolean; onFav: () => void; onAdd: (size: string | null) => void }) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>
        <DetailBody token={token} onNeedLogin={onNeedLogin} p={p} onClose={onClose} fav={fav} onFav={onFav} onAdd={onAdd} />
      </SafeAreaProvider>
    </Modal>
  );
}

function DetailBody({ p, onClose, fav, onFav, onAdd, token, onNeedLogin }: { token: string | null; onNeedLogin: () => void; p: Product; onClose: () => void; fav: boolean; onFav: () => void; onAdd: (size: string | null) => void }) {
  const insets = useSafeAreaInsets();
  const [added, setAdded] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const sizes = p.sizes ?? [];
  const buy = () => { if (sizes.length > 0 && !size) { setMissing(true); return; } onAdd(size); setAdded(true); };
  const [watch, setWatch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [watchErr, setWatchErr] = useState("");
  useEffect(() => {
    if (token && p.stock < 1) authed<{ slugs?: string[] }>(token, "GET", "/api/v1/restock-watch").then((r) => setWatch((r.data.slugs ?? []).includes(p.slug)));
  }, [token, p.slug, p.stock]);
  const toggleWatch = async () => {
    if (!token) return onNeedLogin();
    setBusy(true); setWatchErr("");
    try {
      const r = watch ? await authed(token, "DELETE", `/api/v1/restock-watch?slug=${encodeURIComponent(p.slug)}`) : await authed(token, "POST", "/api/v1/restock-watch", { slug: p.slug, locale: "fr" });
      if (r.status < 300) setWatch(!watch);
      else setWatchErr(`Impossible d’enregistrer l’alerte (code ${r.status}). Réessayez.`);
    } catch (e) {
      setWatchErr(`Impossible d’enregistrer l’alerte : ${(e as Error).message}`);
    }
    setBusy(false);
  };
  return (
      <View style={{ flex: 1, backgroundColor: "#faf6ee", paddingTop: Math.max(insets.top, Platform.OS === "android" ? RNStatusBar.currentHeight ?? 24 : 0) }}>
        <View style={s.bar}>
          <Pressable onPress={onClose} hitSlop={12} style={{ width: 44, height: 44, justifyContent: "center" }} accessibilityLabel="Retour"><Text style={{ fontSize: 28 }}>←</Text></Pressable>
          <Pressable onPress={onFav} hitSlop={12} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel={fav ? "Retirer des favoris" : "Ajouter aux favoris"}><Text style={{ fontSize: 28, color: fav ? "#d4183d" : "#111" }}>{fav ? "♥" : "♡"}</Text></Pressable>
        </View>
        <ScrollView>
          <View><ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {p.images.map((u) => <Image key={u} source={{ uri: u }} style={s.hero} resizeMode="cover" />)}
          </ScrollView><Badges stock={p.stock} isNew={p.isNew} isExample={p.isExample} /></View>
          <View style={{ padding: 16 }}>
            <Text style={s.brand}>{p.creatorName}</Text>
            <Text style={[s.h2, { paddingHorizontal: 0 }]}>{p.name}</Text>
            <Text style={[s.price, { fontSize: 18 }]}>{eur(p.priceCents)}</Text>
            <Text style={s.body}>{p.description}</Text>
            {[p.edition && `Édition : ${p.edition}`, p.material && `Matière : ${p.material}`, p.technique && `Technique : ${p.technique}`, p.origin && `Origine : ${p.origin}`, p.dimensions && `Dimensions : ${p.dimensions}`].filter(Boolean).map((l) => <Text key={l as string} style={s.meta}>{l}</Text>)}
            {p.story ? <Text style={[s.body, { marginTop: 12 }]}>{p.story}</Text> : null}
          </View>
        </ScrollView>
        <View style={[s.buyBar, { paddingBottom: 12 + Math.max(insets.bottom, Platform.OS === "android" ? 32 : 0) }]}>
          {p.stock < 1 ? (
            <>
              {watch ? <Text style={{ color: "#1e7546", marginBottom: 6 }}>Vous serez prévenu(e) dès qu’elle est disponible.</Text> : null}
              {watchErr ? <Text style={{ color: "#b42318", marginBottom: 6 }}>{watchErr}</Text> : null}
              <Pressable onPress={toggleWatch} disabled={busy} hitSlop={8} android_ripple={{ color: "#ffffff55" }} style={({ pressed }) => [s.cta, { opacity: pressed || busy ? 0.6 : 1 }]}><Text style={s.ctaText}>{busy ? "…" : watch ? "Annuler l’alerte" : "Me prévenir quand elle est disponible"}</Text></Pressable>
              {watch ? <Text style={{ color: "#6b5d52", fontSize: 12, marginTop: 6 }}>Pièce unique : premier arrivé, premier servi.</Text> : null}
            </>
          ) : (
          <>
          {sizes.length > 0 ? (
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: "600", color: "#221812", marginBottom: 6 }}>{p.sizeLabel ?? "Taille"}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {sizes.map((sz) => {
                  const out = p.sizeStock ? (p.sizeStock[sz] ?? 0) <= 0 : false;
                  const on = size === sz;
                  return (
                    <Pressable key={sz} disabled={out} onPress={() => { setSize(sz); setAdded(false); setMissing(false); }} style={{ minWidth: 44, height: 44, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: on ? "#1c3060" : "#ded6c9", backgroundColor: on ? "#1c3060" : "#faf6ee", alignItems: "center", justifyContent: "center", opacity: out ? 0.5 : 1 }}>
                      <Text style={{ color: on ? "#fff" : "#221812", textDecorationLine: out ? "line-through" : "none" }}>{sz}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {missing ? <Text style={{ color: "#b42318", marginTop: 6 }}>Veuillez choisir une taille.</Text> : null}
            </View>
          ) : null}
          <Pressable onPress={buy} style={({ pressed }) => [s.cta, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={s.ctaText}>{added ? "Ajouté au panier ✓" : "Ajouter au panier"}</Text>
          </Pressable>
          </>
          )}
        </View>
      </View>
  );
}

export default function App() {
  const [fontsReady] = useFonts({ PlayfairDisplay_600SemiBold, Inter_400Regular });
  if (!fontsReady) return null;
  return <SafeAreaProvider><Main /></SafeAreaProvider>;
}

function Main() {
  const [tab, setTab] = useState<Tab>("home");
  const auth = useAuth();
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState(false);
  const [favItems, setFavItems] = useState<Product[]>([]);
  const [open, setOpen] = useState<Product | null>(null);
  const favs = favItems.map((p) => p.slug);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [creator, setCreator] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("favs").then((v) => v && setFavItems(JSON.parse(v) as Product[]));
    AsyncStorage.getItem("cart").then((v) => v && setCart(JSON.parse(v) as CartLine[]));
    get<Home>("/api/v1/home?locale=fr").then(setHome).catch(() => setError(true));
  }, []);

  const token = auth.accessToken;
  const toggle = useCallback((p: Product) => {
    const next = favItems.some((x) => x.slug === p.slug) ? favItems.filter((x) => x.slug !== p.slug) : [...favItems, p];
    setFavItems(next);
    AsyncStorage.setItem("favs", JSON.stringify(next));
    if (token) authed(token, "PUT", "/api/v1/favorites", { slugs: next.map((x) => x.slug) });
  }, [favItems, token]);

  // À la connexion : fusion des favoris locaux et de ceux du compte, puis enregistrement sur le compte.
  useEffect(() => {
    if (!token) return;
    (async () => {
      const r = await authed<{ slugs?: string[] }>(token, "GET", "/api/v1/favorites");
      if (!r.ok) return;
      const local = JSON.parse((await AsyncStorage.getItem("favs")) ?? "[]") as Product[];
      const have = new Set(local.map((x) => x.slug));
      const extra = (await Promise.all((r.data.slugs ?? []).filter((s) => !have.has(s)).map((s) => get<Product>(`/api/v1/products/${s}?locale=fr`).catch(() => null)))).filter((x): x is Product => !!x);
      const merged = [...local, ...extra];
      setFavItems(merged);
      AsyncStorage.setItem("favs", JSON.stringify(merged));
      authed(token, "PUT", "/api/v1/favorites", { slugs: merged.map((x) => x.slug) });
    })();
  }, [token]);

  const saveCart = (next: CartLine[]) => { setCart(next); AsyncStorage.setItem("cart", JSON.stringify(next)); };
  const addToCart = (p: Product, size: string | null = null) => {
    const max = Math.max(1, size && p.sizeStock ? p.sizeStock[size] ?? p.stock : p.stock);
    const same = (l: CartLine) => l.slug === p.slug && (l.size ?? null) === size;
    saveCart(cart.some(same)
      ? cart.map((l) => (same(l) ? { ...l, quantity: Math.min(max, l.quantity + 1) } : l))
      : [...cart, { slug: p.slug, size, name: p.name, creatorName: p.creatorName, image: p.images[0], priceCents: p.priceCents, quantity: 1, maxQuantity: max }]);
  };
  const cartCount = cart.reduce((n, l) => n + l.quantity, 0);

  const grid = (items: Product[]) => (
    <FlatList numColumns={2} data={items} keyExtractor={(p) => p.slug} columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 16 }}
      renderItem={({ item }) => <Card wide p={item} fav={favs.includes(item.slug)} onFav={() => toggle(item)} onOpen={() => setOpen(item)} />} />
  );

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""} urlScheme="epomta">
    <SafeAreaView style={{ flex: 1, backgroundColor: "#faf6ee" }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", height: 4 }}>{["#e9a93a", "#1c3060", "#1e7546", "#bd5833"].map((c) => <View key={c} style={{ flex: 1, backgroundColor: c }} />)}</View>
      <View style={s.header}><Text style={s.logo}>E póm ta’</Text><Pressable onPress={() => setCartOpen(true)} hitSlop={10} style={s.cartBtn} accessibilityLabel="Panier"><Text style={s.cartText}>Panier{cartCount ? ` (${cartCount})` : ""}</Text></Pressable></View>
      <View style={{ flex: 1 }}>
        {error && !home ? <Text style={s.center}>Connexion impossible. Vérifiez votre réseau.</Text> : null}
        {tab === "home" && (home ? (
          <ScrollView>
            <Row title="Nouveautés" items={home.news.length ? home.news : home.latest} favs={favs} toggle={toggle} open={setOpen} />
            <View style={{ marginTop: 24 }}>
              <Text style={s.h2}>Créateurs du moment</Text>
              <FlatList horizontal showsHorizontalScrollIndicator={false} data={home.creators} keyExtractor={(c) => c.slug} contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
                renderItem={({ item }) => (
                  <Pressable onPress={() => setCreator(item.slug)} style={{ alignItems: "center", width: 90 }}>
                    <Image source={{ uri: item.image }} style={s.avatar} />
                    <Text numberOfLines={2} style={s.creator}>{item.name}</Text>
                  </Pressable>
                )} />
            </View>
            {home.byCategory.map((c) => <Row key={c.slug} title={c.label} items={c.items} favs={favs} toggle={toggle} open={setOpen} />)}
            <View style={{ height: 24 }} />
          </ScrollView>
        ) : !error && <ActivityIndicator style={{ marginTop: 40 }} />)}

        {tab === "shop" && <ShopScreen<Product> initialCategory="" onOpenCreator={setCreator} renderItem={(item) => <Card wide p={item} fav={favs.includes(item.slug)} onFav={() => toggle(item)} onOpen={() => setOpen(item)} />} onOpenSlug={(slug) => { get<Product>(`/api/v1/products/${slug}?locale=fr`).then(setOpen).catch(() => {}); }} />}

        {tab === "favs" && (favItems.length ? grid(favItems) : <Text style={s.center}>Aucun favori pour le moment.{"\n"}Touchez ♡ sur une pièce.</Text>)}

        {tab === "me" && <AccountScreen auth={auth} onOpenSite={(p) => WebBrowser.openBrowserAsync(`${API_URL}${p}`)} />}
        {false && (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={s.h2}>Mon compte</Text>
            <Text style={s.body}>Langue : Français</Text>
            <Text style={s.body}>Le suivi des commandes se fait par e-mail et sur le site.</Text>
            <Pressable style={[s.cta, { marginTop: 16 }]} onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/fr/login`)}><Text style={s.ctaText}>Mon compte sur le site</Text></Pressable>
            <Pressable style={[s.cta, { marginTop: 12 }]} onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/fr/support`)}><Text style={s.ctaText}>Besoin d’aide ?</Text></Pressable>
          </ScrollView>
        )}
      </View>
      <View style={s.tabs}>
        {([["home", "Accueil"], ["shop", "Boutique"], ["favs", "Favoris"], ["me", "Moi"]] as [Tab, string][]).map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={s.tab}><Text style={[s.tabText, tab === k && { color: "#221812", fontWeight: "700" }]}>{l}{k === "favs" && favs.length ? ` (${favs.length})` : ""}</Text></Pressable>
        ))}
      </View>
      {creator && <CreatorScreen slug={creator} onClose={() => setCreator(null)} onOpenSlug={(slug) => { get<Product>(`/api/v1/products/${slug}?locale=fr`).then(setOpen).catch(() => {}); }} />}
      {!open && !cartOpen && !creator && <TilaButton onOpenSlug={(slug) => { get<Product>(`/api/v1/products/${slug}?locale=fr`).then(setOpen).catch(() => {}); }} />}
      {open && <Detail token={auth.accessToken} onNeedLogin={() => { setOpen(null); setTab("me"); }} p={open} onClose={() => setOpen(null)} fav={favs.includes(open.slug)} onFav={() => toggle(open)} onAdd={(size) => addToCart(open, size)} />}
      {cartOpen && (
        <Modal animationType="slide" onRequestClose={() => setCartOpen(false)}>
          <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: "#faf6ee" }}><KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            <CartScreen lines={cart} token={auth.accessToken} onNeedLogin={() => { setCartOpen(false); setTab("me"); }} onPaid={() => saveCart([])} onClose={() => setCartOpen(false)} onQty={(slug, size, q) => saveCart(q < 1 ? cart.filter((l) => !(l.slug === slug && (l.size ?? null) === size)) : cart.map((l) => (l.slug === slug && (l.size ?? null) === size ? { ...l, quantity: q } : l)))} onRemove={(slug, size) => saveCart(cart.filter((l) => !(l.slug === slug && (l.size ?? null) === size)))} />
          </KeyboardAvoidingView></SafeAreaView></SafeAreaProvider>
        </Modal>
      )}
    </SafeAreaView>
    </StripeProvider>
  );
}

const s = StyleSheet.create({
  header: { alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#ded6c9" },
  logo: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 20,  },
  cartBtn: { position: "absolute", right: 16, top: 0, bottom: 0, justifyContent: "center" },
  cartText: { fontSize: 12,  },
  h2: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 14, fontWeight: "700", paddingHorizontal: 16, marginBottom: 10 },
  card: { width: 160, marginBottom: 16 },
  cardImg: { width: "100%", aspectRatio: 0.8, backgroundColor: "#f2eadd" },
  heart: { position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" },
  heartIcon: { fontSize: 18, color: "#221812", lineHeight: 22 },
  brand: { fontSize: 11, fontWeight: "700", marginTop: 6, },
  name: { fontSize: 13, color: "#333" },
  price: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#f2eadd" },
  creator: { fontSize: 11, textAlign: "center", marginTop: 6 },
  tabs: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#ded6c9" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 14 },
  tabText: { fontSize: 11, color: "#6b5d52" },
  center: { textAlign: "center", marginTop: 60, color: "#555", paddingHorizontal: 24 },
  filterBtn: { margin: 16, borderWidth: 1, paddingVertical: 12, alignItems: "center" },
  filterText: { fontSize: 12,  },
  sheet: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "#faf6ee", padding: 16, paddingTop: 24 },
  opt: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#f2eadd" },
  optOn: { fontWeight: "700" },
  optOff: { color: "#444" },
  bar: { flexDirection: "row", justifyContent: "space-between", padding: 16 },
  hero: { width: Dimensions.get("window").width, aspectRatio: 0.8, backgroundColor: "#f2eadd" },
  body: { fontSize: 14, lineHeight: 21, color: "#333", marginTop: 8 },
  meta: { fontSize: 13, color: "#555", marginTop: 4 },
  buyBar: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#ded6c9", backgroundColor: "#faf6ee" },
  cta: { borderRadius: 8, backgroundColor: "#1c3060", paddingVertical: 15, alignItems: "center" },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
