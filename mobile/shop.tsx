import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { API_URL } from "./config";

type Opt = { value: string; label: string };
type Options = { categories: Opt[]; artists: Opt[]; materials: Opt[]; techniques: Opt[]; countries: Opt[] };
type Sizes = { kind: "clothing" | "ring" | null; options: string[] };
type Values = Record<"q" | "category" | "artist" | "material" | "technique" | "country" | "size" | "min" | "max" | "sort", string>;
type Artist = { slug: string; name: string; image: string; label: string };
type Extras = { artists: Artist[]; didYouMean: { kind: "artist" | "category"; slug: string; label: string } | null; suggested: Artist[] };
type Suggest = { artists: { slug: string; name: string; label: string }[]; categories: { slug: string; label: string }[]; products: { slug: string; name: string; creator: string }[] };
type Item = { slug: string };

const EMPTY: Values = { q: "", category: "", artist: "", material: "", technique: "", country: "", size: "", min: "", max: "", sort: "new" };
const NO_OPTIONS: Options = { categories: [], artists: [], materials: [], techniques: [], countries: [] };

const qs = (v: Values, extra: Record<string, string> = {}) => {
  const p = new URLSearchParams({ locale: "fr", ...extra });
  for (const [k, val] of Object.entries(v)) if (val && !(k === "sort" && val === "new")) p.set(k, val);
  return p.toString();
};

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${API_URL}${path}`);
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

// Reprend /catalogue (page.tsx), refine-sheet.tsx et search-box.tsx du site ; textes de i18n.ts (catalog, f11).
export function ShopScreen<P extends Item>({ initialCategory, renderItem, onOpenSlug, onOpenCreator }: { initialCategory: string; renderItem: (p: P) => ReactNode; onOpenSlug: (slug: string) => void; onOpenCreator: (slug: string) => void }) {
  const [v, setV] = useState<Values>({ ...EMPTY, category: initialCategory });
  const [items, setItems] = useState<P[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [options, setOptions] = useState<Options>(NO_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [extras, setExtras] = useState<Extras | null>(null);
  const [text, setText] = useState("");
  const [sugg, setSugg] = useState<{ key: string; label: string; hint: string; act: () => void }[]>([]);
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const loadingMore = useRef(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    getJson<{ items: P[]; total: number; pages: number; options: Options }>(`/api/v1/products?${qs(v)}`).then((d) => {
      if (!live) return;
      setLoading(false);
      if (!d) return;
      setItems(d.items);
      setTotal(d.total);
      setPage(1);
      setPages(d.pages);
      setOptions(d.options);
      // Un artiste sans œuvre dans la catégorie choisie est réinitialisé, comme sur le site.
      if (v.artist && !d.options.artists.some((a) => a.value === v.artist)) setV((s) => ({ ...s, artist: "" }));
    });
    return () => { live = false; };
  }, [v]);

  useEffect(() => {
    if (!v.q) { setExtras(null); return; }
    getJson<Extras>(`/api/v1/search/extras?locale=fr&q=${encodeURIComponent(v.q)}`).then(setExtras);
  }, [v.q]);

  useEffect(() => {
    if (text.trim().length < 2) { setSugg([]); return; }
    const id = setTimeout(async () => {
      const d = await getJson<Suggest>(`/api/v1/search/suggest?locale=fr&q=${encodeURIComponent(text)}`);
      if (!d) return;
      setSugg([
        ...d.artists.map((a) => ({ key: `a-${a.slug}`, label: a.name, hint: "Artiste", act: () => onOpenCreator(a.slug) })),
        ...d.categories.map((c) => ({ key: `c-${c.slug}`, label: c.label, hint: "Catégorie", act: () => setV({ ...EMPTY, category: c.slug }) })),
        ...d.products.map((p) => ({ key: `p-${p.slug}`, label: p.name, hint: `Création · ${p.creator}`, act: () => onOpenSlug(p.slug) })),
      ]);
      setOpen(true);
    }, 180);
    return () => clearTimeout(id);
  }, [text, onOpenSlug, onOpenCreator]);

  const more = useCallback(async () => {
    if (loadingMore.current || page >= pages) return;
    loadingMore.current = true;
    const d = await getJson<{ items: P[] }>(`/api/v1/products?${qs(v, { page: String(page + 1) })}`);
    if (d) { setItems((a) => [...a, ...d.items]); setPage(page + 1); }
    loadingMore.current = false;
  }, [v, page, pages]);

  const label = (list: Opt[], val: string) => list.find((o) => o.value === val)?.label ?? val;
  const chips: { key: string; label: string; clear: Partial<Values> }[] = [];
  if (v.category) chips.push({ key: "category", label: label(options.categories, v.category), clear: { category: "" } });
  if (v.artist) chips.push({ key: "artist", label: label(options.artists, v.artist), clear: { artist: "" } });
  if (v.material) chips.push({ key: "material", label: label(options.materials, v.material), clear: { material: "" } });
  if (v.technique) chips.push({ key: "technique", label: label(options.techniques, v.technique), clear: { technique: "" } });
  if (v.country) chips.push({ key: "country", label: label(options.countries, v.country), clear: { country: "" } });
  if (v.size) chips.push({ key: "size", label: v.size, clear: { size: "" } });
  if (v.q) chips.push({ key: "q", label: `« ${v.q} »`, clear: { q: "" } });
  if (v.min || v.max) chips.push({ key: "price", label: `${v.min || 0}–${v.max || "∞"} EUR`, clear: { min: "", max: "" } });
  const activeCount = Object.entries(v).filter(([k, val]) => val && !(k === "sort" && val === "new")).length;
  const onlyCategory = !!v.category && chips.length === 1;

  const artistRow = (list: Artist[]) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingBottom: 8 }}>
      {list.map((a) => (
        <Pressable key={a.slug} onPress={() => onOpenCreator(a.slug)} style={{ width: 90, alignItems: "center" }}>
          <Image source={{ uri: a.image }} style={st.avatar} />
          <Text numberOfLines={2} style={st.artistName}>{a.name}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const header = (
    <View>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <TextInput value={text} onChangeText={setText} onFocus={() => setOpen(true)} placeholder="Un titre, un artiste, une technique…" placeholderTextColor="#8a7d70" accessibilityLabel="Recherche" returnKeyType="search" autoCorrect={false}
          onSubmitEditing={() => { setOpen(false); setV({ ...EMPTY, q: text.trim() }); }} style={st.input} />
        {open && text.trim().length >= 2 && sugg.length > 0 && (
          <View style={st.suggBox}>
            {sugg.map((x) => (
              <Pressable key={x.key} onPress={() => { setOpen(false); x.act(); }} style={st.suggRow}>
                <Text style={{ color: "#221812" }}>{x.label}</Text>
                <Text style={st.hint}>{x.hint}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      {chips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
          {chips.map((c) => (
            <Pressable key={c.key} onPress={() => { if (c.key === "q") setText(""); setV((s) => ({ ...s, ...c.clear })); }} accessibilityLabel={`Retirer le filtre : ${c.label}`} style={st.chip}>
              <Text style={{ fontSize: 12, color: "#221812" }}>{c.label}  ✕</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {activeCount === 0 && options.categories.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          {options.categories.map((c) => (
            <Pressable key={c.value} onPress={() => setV({ ...EMPTY, category: c.value })} style={st.catRow} accessibilityRole="button">
              <Text style={{ color: "#221812", fontSize: 15 }}>{c.label}</Text>
              <Text style={{ color: "#221812", fontSize: 18 }}>›</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={st.bar}>
        <Text style={{ color: "#6b5d52", fontSize: 13 }}>{total} pièce{total > 1 ? "s" : ""}</Text>
        <Pressable onPress={() => setSheet(true)} style={st.refine}><Text style={{ color: "#1c3060", fontWeight: "600" }}>Affiner{activeCount > 0 ? ` (${activeCount})` : ""}</Text></Pressable>
      </View>
      {extras && extras.artists.length > 0 && (
        <View>
          <Text style={st.h2}>Artistes</Text>
          {artistRow(extras.artists)}
          {items.length > 0 && <Text style={st.h2}>Créations</Text>}
        </View>
      )}
    </View>
  );

  const empty = loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
    <View style={st.empty}>
      <Text style={st.emptyTitle}>{onlyCategory ? "Cette catégorie accueillera bientôt de nouvelles pièces." : "Aucune création ne correspond à votre recherche."}</Text>
      {!onlyCategory && <Text style={{ color: "#6b5d52", marginTop: 4 }}>Essayez d'élargir vos filtres.</Text>}
      {extras?.didYouMean && (
        <Pressable onPress={() => setV({ ...EMPTY, ...(extras.didYouMean!.kind === "artist" ? { artist: extras.didYouMean!.slug } : { category: extras.didYouMean!.slug }) })}>
          <Text style={{ marginTop: 12 }}>Vouliez-vous dire : <Text style={{ fontWeight: "700", textDecorationLine: "underline" }}>{extras.didYouMean.label} ?</Text></Text>
        </Pressable>
      )}
      <Pressable onPress={() => { setText(""); setV(EMPTY); }} style={st.reset}><Text style={{ color: "#1c3060", fontWeight: "600" }}>Réinitialiser</Text></Pressable>
      {extras && extras.artists.length === 0 && (
        <View style={{ marginTop: 20, alignSelf: "stretch" }}>
          <Text style={st.h2}>Quelques artistes à découvrir</Text>
          {artistRow(extras.suggested)}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList numColumns={2} data={items} keyExtractor={(p) => p.slug} keyboardShouldPersistTaps="handled" ListHeaderComponent={header} ListEmptyComponent={empty}
        columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 16 }} renderItem={({ item }) => <>{renderItem(item)}</>} onEndReached={more} onEndReachedThreshold={0.6} />
      {sheet && <RefineSheet initial={v} baseOptions={options} total={total} onClose={() => setSheet(false)} onApply={(nv) => { setText(nv.q); setV(nv); setSheet(false); }} />}
    </View>
  );
}

function RefineSheet({ initial, baseOptions, total, onClose, onApply }: { initial: Values; baseOptions: Options; total: number; onClose: () => void; onApply: (v: Values) => void }) {
  const [v, setV] = useState<Values>(initial);
  const [opts, setOpts] = useState<Options>(baseOptions);
  const [sizes, setSizes] = useState<Sizes>({ kind: null, options: [] });
  const [count, setCount] = useState<number | null>(total);
  const [openKey, setOpenKey] = useState("");

  useEffect(() => {
    let live = true;
    const id = setTimeout(() => {
      getJson<{ total: number; options: Options; sizes: Sizes }>(`/api/v1/catalog/count?${qs(v)}`).then((d) => {
        if (!live || !d) return;
        setCount(d.total);
        setOpts(d.options);
        setSizes(d.sizes);
        // Une sélection devenue absente des options de la catégorie est retirée.
        setV((s) => {
          const keep = (k: "artist" | "material" | "technique" | "country", list: Opt[]) => (s[k] && !list.some((o) => o.value === s[k]) ? "" : s[k]);
          const n = { ...s, artist: keep("artist", d.options.artists), material: keep("material", d.options.materials), technique: keep("technique", d.options.techniques), country: keep("country", d.options.countries), size: d.sizes.options.includes(s.size) ? s.size : "" };
          return JSON.stringify(n) === JSON.stringify(s) ? s : n;
        });
      });
    }, 200);
    return () => { live = false; clearTimeout(id); };
  }, [v]);

  const set = (k: keyof Values, val: string) => { setCount(null); setV((s) => ({ ...s, [k]: val })); };
  const group = (k: keyof Values, title: string, list: Opt[], all: string) =>
    list.length > 0 && (
      <View style={st.group}>
        <Pressable onPress={() => setOpenKey(openKey === k ? "" : k)} style={st.groupHead}>
          <Text style={{ color: "#221812" }}>{title}</Text>
          <Text style={st.hint}>{list.find((o) => o.value === v[k])?.label ?? all}</Text>
        </Pressable>
        {(openKey === k || !!v[k]) && [{ value: "", label: all }, ...list].map((o) => (
          <Pressable key={o.value} onPress={() => set(k, o.value)} style={st.radioRow}>
            <Text style={{ color: "#221812" }}>{o.label}</Text>
            <View style={[st.radio, v[k] === o.value && st.radioOn]} />
          </Pressable>
        ))}
      </View>
    );

  return (
    <View style={st.sheet}>
      <View style={st.sheetTop}>
        <Pressable onPress={onClose} accessibilityLabel="Fermer" hitSlop={10}><Text style={{ fontSize: 24, color: "#221812" }}>✕</Text></Pressable>
        <Pressable onPress={() => { setCount(null); setV(EMPTY); }}><Text style={{ textDecorationLine: "underline", color: "#221812" }}>Tout effacer</Text></Pressable>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <TextInput value={v.q} onChangeText={(t) => set("q", t)} placeholder="Rechercher une création" placeholderTextColor="#8a7d70" style={st.input} />
        <Text style={st.sheetH}>Trier par</Text>
        {([["pick", "Notre sélection"], ["new", "Nouveautés"], ["price-desc", "Prix décroissant"], ["price-asc", "Prix croissant"]] as const).map(([k, l]) => (
          <Pressable key={k} onPress={() => set("sort", k)} style={st.radioRow}>
            <Text style={{ color: "#221812" }}>{l}</Text>
            <View style={[st.radio, v.sort === k && st.radioOn]} />
          </Pressable>
        ))}
        <Text style={st.sheetH}>Filtrer par</Text>
        {group("category", "Catégorie", opts.categories, "Toutes")}
        {group("artist", "Artistes", opts.artists, "Tous")}
        {group("material", "Matière", opts.materials, "Toutes")}
        {group("technique", "Techniques", opts.techniques, "Toutes")}
        {group("country", "Pays / région", opts.countries, "Tous")}
        {sizes.options.length > 0 && group("size", sizes.kind === "ring" ? "Tour de doigt" : "Tailles", sizes.options.map((o) => ({ value: o, label: o })), "Tous")}
        <Text style={[st.groupHead, { marginTop: 8 }]}>Fourchette de prix (EUR)</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={v.min} onChangeText={(t) => set("min", t.replace(/[^\d]/g, ""))} keyboardType="number-pad" placeholder="Min" placeholderTextColor="#8a7d70" accessibilityLabel="Prix Min" style={[st.input, { flex: 1 }]} />
          <TextInput value={v.max} onChangeText={(t) => set("max", t.replace(/[^\d]/g, ""))} keyboardType="number-pad" placeholder="Max" placeholderTextColor="#8a7d70" accessibilityLabel="Prix Max" style={[st.input, { flex: 1 }]} />
        </View>
      </ScrollView>
      <View style={{ padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#ded6c9" }}>
        <Pressable onPress={() => onApply(v)} style={st.cta}><Text style={st.ctaText}>{count === null ? "Calcul…" : `Afficher ${count} résultat${count > 1 ? "s" : ""}`}</Text></Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  catRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#ded6c9" },
  input: { height: 44, borderRadius: 8, backgroundColor: "#f2eadd", paddingHorizontal: 12, color: "#221812", fontSize: 14 },
  suggBox: { marginTop: 4, borderRadius: 8, borderWidth: 1, borderColor: "#ded6c9", backgroundColor: "#fefbf6" },
  suggRow: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 6 },
  hint: { fontSize: 12, color: "#6b5d52" },
  chip: { minHeight: 36, justifyContent: "center", borderRadius: 18, backgroundColor: "#f2eadd", paddingHorizontal: 12 },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  refine: { height: 40, justifyContent: "center", borderRadius: 8, borderWidth: 1, borderColor: "#1c3060", paddingHorizontal: 16 },
  h2: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 18, color: "#1c3060", paddingHorizontal: 16, marginBottom: 8, marginTop: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#f2eadd" },
  artistName: { fontSize: 12, textAlign: "center", marginTop: 4, color: "#221812" },
  empty: { margin: 16, padding: 24, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: "#ded6c9", alignItems: "center" },
  emptyTitle: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 18, textAlign: "center", color: "#221812" },
  reset: { marginTop: 16, height: 40, justifyContent: "center", borderRadius: 8, borderWidth: 1, borderColor: "#1c3060", paddingHorizontal: 16 },
  sheet: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "#faf6ee" },
  sheetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#ded6c9" },
  sheetH: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 22, color: "#1c3060", marginTop: 20, marginBottom: 6 },
  group: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#ded6c9" },
  groupHead: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", color: "#221812" },
  radioRow: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#1c3060" },
  radioOn: { backgroundColor: "#1c3060" },
  cta: { borderRadius: 8, backgroundColor: "#1c3060", paddingVertical: 15, alignItems: "center" },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
