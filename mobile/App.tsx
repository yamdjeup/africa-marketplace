import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import { useFonts, PlayfairDisplay_600SemiBold } from "@expo-google-fonts/playfair-display";
import { Inter_400Regular } from "@expo-google-fonts/inter";
import { ActivityIndicator, Alert, FlatList, Dimensions, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar as RNStatusBar, StyleSheet, Text, View } from "react-native";
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
import { HomeBlocks, MoreBlocks, type Site } from "./home";
import { ApproxPrice, getLang, tr, useLang } from "./region";
import { SupportScreen } from "./support";
import { StripeProvider } from "@stripe/stripe-react-native";

type Product = { slug: string; name: string; description: string; story: string; creatorName: string; priceCents: number; images: string[]; material: string | null; technique: string | null; origin: string | null; dimensions: string | null; categorySlug: string; url: string; stock: number; soldOut?: boolean; isNew?: boolean; isExample?: boolean; edition?: string | null; sizes?: string[]; sizeStock?: Record<string, number> | null; sizeLabel?: string };
type Extra = { heldByOther?: boolean; categoryLabel: string; materials: string[]; dimensionsText: string | null; careInstructions: string | null; hasCertificate: boolean; roomPreview?: boolean; mirrorTryOn?: boolean; attestedAt: string | null; signatureUrl: string | null; related: Product[] };
type Home = { site?: Site; categories: { slug: string; label: string }[]; news: Product[]; latest: Product[]; creators: { slug: string; name: string; specialty: string; image: string }[]; byCategory: { slug: string; label: string; items: Product[] }[] };
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
      <Image source={{ uri: p.images[0] }} style={[s.cardImg, p.soldOut && { opacity: 0.55 }]} />
      <Badges soldOut={p.soldOut} stock={p.stock} isNew={p.isNew} isExample={p.isExample} />
      <Pressable onPress={onFav} hitSlop={6} style={s.heart} accessibilityLabel={fav ? "Retirer des favoris" : tr("Ajouter aux favoris", "Add to wish list")}><Text style={[s.heartIcon, fav && { color: "#d4183d" }]}>{fav ? "♥" : "♡"}</Text></Pressable>
      <Text style={s.brand} numberOfLines={1}>{p.creatorName}</Text>
      <Text numberOfLines={1} style={s.name}>{p.name}</Text>
      <Text style={s.price}>{eur(p.priceCents)}</Text>
      <ApproxPrice cents={p.priceCents} />
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

function Detail({ p, onClose, fav, onFav, onAdd, inCart, onOpenCart, token, onNeedLogin, onOpenRelated }: { token: string | null; onNeedLogin: () => void; p: Product; onClose: () => void; fav: boolean; onFav: () => void; onAdd: (size: string | null, qty: number) => void; inCart: (size: string | null) => boolean; onOpenCart: () => void; onOpenRelated: (q: Product) => void }) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>
        <DetailBody token={token} onNeedLogin={onNeedLogin} p={p} onClose={onClose} fav={fav} onFav={onFav} onAdd={onAdd} inCart={inCart} onOpenCart={onOpenCart} onOpenRelated={onOpenRelated} />
      </SafeAreaProvider>
    </Modal>
  );
}

function DetailBody({ p, onClose, fav, onFav, onAdd, inCart, onOpenCart, token, onNeedLogin, onOpenRelated }: { token: string | null; onNeedLogin: () => void; p: Product; onClose: () => void; fav: boolean; onFav: () => void; onAdd: (size: string | null, qty: number) => void; inCart: (size: string | null) => boolean; onOpenCart: () => void; onOpenRelated: (q: Product) => void }) {
  const insets = useSafeAreaInsets();
  const [added, setAdded] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const sizes = p.sizes ?? [];
  const [x, setX] = useState<Extra | null>(null);
  const [qty, setQty] = useState(1);
  const [recent, setRecent] = useState<Product[]>([]);
  useEffect(() => {
    AsyncStorage.getItem("recent").then((v) => {
      const list = v ? (JSON.parse(v) as Product[]) : [];
      setRecent(list.filter((x) => x.slug !== p.slug));
      AsyncStorage.setItem("recent", JSON.stringify([p, ...list.filter((x) => x.slug !== p.slug)].slice(0, 8)));
    });
  }, [p.slug]);
  useEffect(() => { get<Extra>(`/api/v1/products/${encodeURIComponent(p.slug)}`).then(setX).catch(() => {}); }, [p.slug]);
  const unique = !!p.edition && /pi[eè]ce unique/i.test(p.edition);
  const cap = size && p.sizeStock ? p.sizeStock[size] ?? p.stock : p.stock;
  const showQty = p.stock > 1 && !unique;
  const q = Math.min(qty, Math.max(1, cap));
  const buy = () => { if (sizes.length > 0 && !size) { setMissing(true); return; } onAdd(size, showQty ? q : 1); setAdded(true); };
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
      else setWatchErr(tr(`Impossible d’enregistrer l’alerte (code ${r.status}). Réessayez.`, `Unable to save the alert (code ${r.status}). Please try again.`));
    } catch (e) {
      setWatchErr(tr(`Impossible d’enregistrer l’alerte : ${(e as Error).message}`, `Unable to save the alert: ${(e as Error).message}`));
    }
    setBusy(false);
  };
  return (
      <View style={{ flex: 1, backgroundColor: "#faf6ee", paddingTop: Math.max(insets.top, Platform.OS === "android" ? RNStatusBar.currentHeight ?? 24 : 0) }}>
        <View style={s.bar}>
          <Pressable onPress={onClose} hitSlop={12} style={{ width: 44, height: 44, justifyContent: "center" }} accessibilityLabel={tr("Retour", "Back")}><Text style={{ fontSize: 28 }}>←</Text></Pressable>
          <Pressable onPress={onFav} hitSlop={12} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel={fav ? "Retirer des favoris" : tr("Ajouter aux favoris", "Add to wish list")}><Text style={{ fontSize: 28, color: fav ? "#d4183d" : "#111" }}>{fav ? "♥" : "♡"}</Text></Pressable>
        </View>
        <ScrollView>
          <View><ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {p.images.map((u) => <Image key={u} source={{ uri: u }} style={s.hero} resizeMode="cover" />)}
          </ScrollView><Badges soldOut={p.soldOut} stock={p.stock} isNew={p.isNew} isExample={p.isExample} /></View>
          <View style={{ padding: 16 }}>
            {x?.categoryLabel ? <Text style={{ alignSelf: "flex-start", backgroundColor: "#f2eadd", color: "#221812", fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden", marginBottom: 6 }}>{x.categoryLabel}</Text> : null}
            <Text style={s.brand}>{p.creatorName}</Text>
            <Text style={[s.h2, { paddingHorizontal: 0 }]}>{p.name}</Text>
            <Text style={[s.price, { fontSize: 18 }]}>{eur(p.priceCents)}</Text>
            <ApproxPrice cents={p.priceCents} />
            <Text style={[s.meta, { color: p.stock === 0 ? "#b42318" : "#1e7546" }]}>{p.stock === 0 ? tr("Épuisée", "Sold out") : p.stock <= 1 ? tr("Pièce unique", "Unique piece") : p.stock <= 3 ? tr(`Plus que ${p.stock}`, `Only ${p.stock} left`) : tr("En stock", "In stock")}</Text>
            {x?.heldByOther ? <Text style={[s.meta, { color: "#8a5a00" }]}>{tr("Réservée par un autre client : elle peut redevenir disponible si son paiement n’aboutit pas.", "Reserved by another customer: it may become available again if their payment is not completed.")}</Text> : null}
            <Text style={s.body}>{p.description}</Text>
            {[p.edition && !(p.stock > 0 && p.stock <= 1 && unique) && tr(`Édition : ${p.edition}`, `Edition: ${p.edition}`), p.material && tr(`Matière : ${p.material}`, `Material: ${p.material}`), p.technique && tr(`Technique : ${p.technique}`, `Technique: ${p.technique}`), !p.material && !p.technique && x?.materials?.length ? tr(`Matières : ${x.materials.join(", ")}`, `Materials: ${x.materials.join(", ")}`) : null, p.origin && tr(`Origine : ${p.origin}`, `Origin: ${p.origin}`), (x ? x.dimensionsText : p.dimensions) && tr(`Dimensions : ${x ? x.dimensionsText : p.dimensions}`, `Dimensions: ${x ? x.dimensionsText : p.dimensions}`)].filter(Boolean).map((l) => <Text key={l as string} style={s.meta}>{l}</Text>)}
            {x?.attestedAt ? (
              <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: "#ded6c9", borderRadius: 6, backgroundColor: "#f2eadd" }}>
                <Text style={{ fontWeight: "600", color: "#221812" }}>{tr("Authenticité", "Authenticity")}</Text>
                <Text style={{ color: "#221812" }}>{tr(`Œuvre d'art originale, certifiée par l'artiste le ${new Date(x.attestedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`, `Original artwork, certified by the artist on ${new Date(x.attestedAt).toLocaleDateString("en-GB", { timeZone: "Europe/Paris" })}`)}{p.edition ? tr(` · Édition ${p.edition}`, ` · Edition ${p.edition}`) : ""}</Text>
                {x.signatureUrl ? <Image source={{ uri: x.signatureUrl }} style={{ height: 80, width: 160, marginTop: 8 }} resizeMode="contain" accessibilityLabel={tr("Signature de l'artiste", "Artist's signature")} /> : null}
              </View>
            ) : null}
            {x?.roomPreview || x?.mirrorTryOn ? (
              <Pressable style={[s.cta, { marginTop: 12 }]} onPress={async () => { try { await WebBrowser.openBrowserAsync(`${API_URL}/${getLang()}/produits/${p.slug}/essayage`); } catch { Alert.alert(tr("Indisponible", "Unavailable"), tr("Impossible d’ouvrir cet aperçu : aucun navigateur compatible n’est disponible sur cet appareil. Vérifiez que Chrome est installé et à jour, ainsi que la réalité augmentée (Services Google Play pour la RA).", "Unable to open this preview: no compatible browser is available on this device. Check that Chrome is installed and up to date, as well as augmented reality (Google Play Services for AR).")); } }}>
                <Text style={s.ctaText}>{x?.roomPreview ? tr("Aperçu dans une pièce · réalité augmentée", "Preview in a room · augmented reality") : tr("Essayage au miroir", "Mirror try-on")}</Text>
              </Pressable>
            ) : null}
            {x?.hasCertificate ? <Text style={{ marginTop: 10, color: "#221812" }}>{tr("✓ Certificat d’authenticité fourni", "✓ Certificate of authenticity provided")}</Text> : null}
            {x?.careInstructions ? <View style={{ marginTop: 12 }}><Text style={{ fontWeight: "600", color: "#221812" }}>{tr("Entretien", "Care")}</Text><Text style={s.meta}>{x.careInstructions}</Text></View> : null}
            {p.story ? <Text style={[s.body, { marginTop: 12 }]}>{p.story}</Text> : null}
            {x?.related?.length ? (
              <View style={{ marginTop: 20 }}>
                <Text style={[s.h2, { paddingHorizontal: 0 }]}>{tr("Dans le même univers", "In the same universe")}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  {x.related.map((m) => (
                    <Pressable key={m.slug} onPress={() => onOpenRelated(m)} style={{ width: "47%" }}>
                      <View><Image source={{ uri: m.images[0] }} style={{ width: "100%", aspectRatio: 1, backgroundColor: "#f2eadd" }} /><Badges soldOut={m.soldOut} stock={m.stock} isNew={m.isNew} isExample={m.isExample} /></View>
                      <Text numberOfLines={1} style={s.brand}>{m.creatorName}</Text>
                      <Text numberOfLines={2} style={{ color: "#221812" }}>{m.name}</Text>
                      <Text style={{ color: "#221812", fontWeight: "700" }}>{eur(m.priceCents)}</Text>
                      <ApproxPrice cents={m.priceCents} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            {recent.length ? (
              <View style={{ marginTop: 20 }}>
                <Text style={[s.h2, { paddingHorizontal: 0 }]}>{tr("Récemment consultés", "Recently viewed")}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {recent.map((m) => (
                    <Pressable key={m.slug} onPress={() => onOpenRelated(m)} style={{ width: 140 }}>
                      <Image source={{ uri: m.images[0] }} style={{ width: 140, aspectRatio: 1, backgroundColor: "#f2eadd" }} />
                      <Text numberOfLines={1} style={s.brand}>{m.creatorName}</Text>
                      <Text numberOfLines={2} style={{ color: "#221812" }}>{m.name}</Text>
                      <Text style={{ color: "#221812", fontWeight: "700" }}>{eur(m.priceCents)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </ScrollView>
        <View style={[s.buyBar, { paddingBottom: 12 + Math.max(insets.bottom, Platform.OS === "android" ? 32 : 0) }]}>
          {p.stock < 1 ? (
            <>
              {watch ? <Text style={{ color: "#1e7546", marginBottom: 6 }}>{tr("Vous serez prévenu(e) dès qu’elle est disponible.", "You will be notified as soon as it is available.")}</Text> : null}
              {watchErr ? <Text style={{ color: "#b42318", marginBottom: 6 }}>{watchErr}</Text> : null}
              <Pressable onPress={toggleWatch} disabled={busy} hitSlop={8} android_ripple={{ color: "#ffffff55" }} style={({ pressed }) => [s.cta, { opacity: pressed || busy ? 0.6 : 1 }]}><Text style={s.ctaText}>{busy ? "…" : watch ? tr("Annuler l’alerte", "Cancel the alert") : tr("Me prévenir quand elle est disponible", "Notify me when it is available")}</Text></Pressable>
              {watch ? <Text style={{ color: "#6b5d52", fontSize: 12, marginTop: 6 }}>{tr("Pièce unique : premier arrivé, premier servi.", "Unique piece: first come, first served.")}</Text> : null}
            </>
          ) : (
          <>
          {showQty ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 10 }}>
              <Text style={{ color: "#221812", fontWeight: "600" }}>{tr("Quantité", "Quantity")}</Text>
              <Pressable disabled={q <= 1} hitSlop={6} onPress={() => { setAdded(false); setQty(q - 1); }} accessibilityLabel={tr("Diminuer", "Decrease")} style={{ width: 44, height: 44, borderWidth: 1, borderColor: "#ded6c9", borderRadius: 6, alignItems: "center", justifyContent: "center", opacity: q <= 1 ? 0.4 : 1 }}><Text style={{ fontSize: 20 }}>−</Text></Pressable>
              <Text>{q}</Text>
              <Pressable disabled={q >= Math.max(1, cap)} hitSlop={6} onPress={() => { setAdded(false); setQty(q + 1); }} accessibilityLabel={tr("Augmenter", "Increase")} style={{ width: 44, height: 44, borderWidth: 1, borderColor: "#ded6c9", borderRadius: 6, alignItems: "center", justifyContent: "center", opacity: q >= Math.max(1, cap) ? 0.4 : 1 }}><Text style={{ fontSize: 20 }}>+</Text></Pressable>
            </View>
          ) : null}
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
              {missing ? <Text style={{ color: "#b42318", marginTop: 6 }}>{tr("Veuillez choisir une taille.", "Please choose a size.")}</Text> : null}
            </View>
          ) : null}
          {inCart(size) ? (
            <Pressable onPress={onOpenCart} style={({ pressed }) => [s.cta, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={s.ctaText}>{tr("Dans votre panier · Voir le panier", "In your bag · View bag")}</Text>
            </Pressable>
          ) : (
          <Pressable onPress={buy} style={({ pressed }) => [s.cta, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={s.ctaText}>{tr("Ajouter au panier", "Add to cart")}</Text>
          </Pressable>
          )}
          </>
          )}
        </View>
      </View>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 64 }}><Text style={{ fontSize: 18, fontWeight: "700" }}>{tr("Une erreur est survenue", "Something went wrong")}</Text><Text selectable style={{ marginTop: 12 }}>{String(this.state.error.stack ?? this.state.error.message)}</Text></ScrollView>;
  }
}

export default function App() {
  const [fontsReady, fontError] = useFonts({ PlayfairDisplay_600SemiBold, Inter_400Regular });
  const lang = useLang();
  if (!fontsReady && !fontError) return null;
  return <ErrorBoundary><SafeAreaProvider><Main key={lang} /></SafeAreaProvider></ErrorBoundary>;
}

function Main() {
  const insets = useSafeAreaInsets();
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
  const [shopCat, setShopCat] = useState("");
  const [supportSlug, setSupportSlug] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("favs").then(async (v) => {
      if (!v) return;
      const saved = JSON.parse(v) as Product[];
      setFavItems(saved);
      const fresh = await Promise.all(saved.map((x) => get<Product>(`/api/v1/products/${x.slug}?locale=fr`).catch(() => x)));
      setFavItems(fresh);
    });
    AsyncStorage.getItem("cart").then(async (v) => {
      if (!v) return;
      const lines = JSON.parse(v) as CartLine[];
      setCart(lines);
      const fresh = await Promise.all(lines.map(async (l) => { const p = await get<Product>(`/api/v1/products/${l.slug}?locale=fr`).catch(() => null); return p ? { ...l, name: p.name, creatorName: p.creatorName } : l; }));
      setCart(fresh);
    });
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
  const addToCart = (p: Product, size: string | null = null, qty = 1) => {
    const max = Math.max(1, size && p.sizeStock ? p.sizeStock[size] ?? p.stock : p.stock);
    const same = (l: CartLine) => l.slug === p.slug && (l.size ?? null) === size;
    saveCart(cart.some(same)
      ? cart.map((l) => (same(l) ? { ...l, quantity: Math.min(max, l.quantity + qty) } : l))
      : [...cart, { slug: p.slug, size, name: p.name, creatorName: p.creatorName, image: p.images[0], priceCents: p.priceCents, quantity: Math.min(max, qty), maxQuantity: max }]);
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
      <View style={s.header}><Text style={s.logo}>E póm ta’</Text><Pressable onPress={() => setCartOpen(true)} hitSlop={10} style={s.cartBtn} accessibilityLabel={tr("Panier", "Cart")}><Text style={s.cartText}>{tr("Panier", "Cart")}{cartCount ? ` (${cartCount})` : ""}</Text></Pressable></View>
      <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {error && !home ? <Text style={s.center}>{tr("Connexion impossible. Vérifiez votre réseau.", "Unable to connect. Check your network.")}</Text> : null}
        {tab === "home" && (home ? (
          home.site ? <HomeBlocks site={home.site} renderCard={(p: Product) => <Card p={p} fav={favs.includes(p.slug)} onFav={() => toggle(p)} onOpen={() => setOpen(p)} />} onShop={(cat) => { setShopCat(cat); setTab("shop"); }} onProduct={(slug) => { get<Product>(`/api/v1/products/${slug}?locale=fr`).then(setOpen).catch(() => {}); }} onCreator={setCreator} onSupport={setSupportSlug} /> : null
        ) : !error && <ActivityIndicator style={{ marginTop: 40 }} />)}

        {tab === "shop" && <ShopScreen<Product> key={shopCat} initialCategory={shopCat} onOpenCreator={setCreator} renderItem={(item) => <Card wide p={item} fav={favs.includes(item.slug)} onFav={() => toggle(item)} onOpen={() => setOpen(item)} />} onOpenSlug={(slug) => { get<Product>(`/api/v1/products/${slug}?locale=fr`).then(setOpen).catch(() => {}); }} />}

        {tab === "favs" && (favItems.length ? grid(favItems) : <Text style={s.center}>{tr("Aucun favori pour le moment.", "No favourites yet.")}{"\n"}{tr("Touchez ♡ sur une pièce.", "Tap ♡ on a piece.")}</Text>)}

        {tab === "me" && <AccountScreen more={home?.site ? <MoreBlocks site={home.site} onSupport={setSupportSlug} /> : null} auth={auth} onOpenSite={(p) => WebBrowser.openBrowserAsync(`${API_URL}${p}`)} />}
        {false && (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={s.h2}>{tr("Mon compte", "My account")}</Text>
            <Text style={s.body}>{tr("Langue : Français", "Language: English")}</Text>
            <Text style={s.body}>{tr("Le suivi des commandes se fait par e-mail et sur le site.", "Order tracking is done by email and on the website.")}</Text>
            <Pressable style={[s.cta, { marginTop: 16 }]} onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/${getLang()}/login`)}><Text style={s.ctaText}>{tr("Mon compte sur le site", "My account on the website")}</Text></Pressable>
            <Pressable style={[s.cta, { marginTop: 12 }]} onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/${getLang()}/support`)}><Text style={s.ctaText}>{tr("Besoin d’aide ?", "Need help?")}</Text></Pressable>
          </ScrollView>
        )}
      </View>
      <View style={[s.tabs, { paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 16 : 0) }]}>
        {([["home", tr("Accueil", "Home")], ["shop", tr("Boutique", "Shop")], ["favs", tr("Favoris", "Wish list")], ["me", tr("Moi", "Me")]] as [Tab, string][]).map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={s.tab}><Text style={[s.tabText, tab === k && { color: "#221812", fontWeight: "700" }]}>{l}{k === "favs" && favs.length ? ` (${favs.length})` : ""}</Text></Pressable>
        ))}
      </View>
      </View>
      {supportSlug && <Modal animationType="slide" onRequestClose={() => setSupportSlug(null)}><SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: "#faf6ee" }}><SupportScreen initialSlug={supportSlug} onBack={() => setSupportSlug(null)} /></SafeAreaView></SafeAreaProvider></Modal>}
      {creator && <CreatorScreen slug={creator} onClose={() => setCreator(null)} onOpenSlug={(slug) => { get<Product>(`/api/v1/products/${slug}?locale=fr`).then(setOpen).catch(() => {}); }} />}
      {!open && !cartOpen && !creator && <TilaButton onOpenSlug={(slug) => { get<Product>(`/api/v1/products/${slug}?locale=fr`).then(setOpen).catch(() => {}); }} />}
      {open && <Detail key={open.slug} token={auth.accessToken} onNeedLogin={() => { setOpen(null); setTab("me"); }} p={open} onClose={() => setOpen(null)} fav={favs.includes(open.slug)} onFav={() => toggle(open)} onAdd={(size, qty) => addToCart(open, size, qty)} inCart={(size) => cart.some((l) => l.slug === open.slug && (l.size ?? null) === size)} onOpenCart={() => setCartOpen(true)} onOpenRelated={(q) => setOpen(q)} />}
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
