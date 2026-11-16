import { useState } from "react";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

type P = { slug: string; name: string; creatorName: string; images: string[] };
export type Site = {
  promoBar: string;
  hero: { kicker: string; title: string; text: string; cta: string; product: P | null };
  categoriesTitle: string;
  categoryTiles: { slug: string; label: string; count: number; image: string | null; countText: string }[];
  newIn: { title: string; sub: string; items: P[] };
  trending: { title: string; sub: string; items: P[] };
  banners: { slug: string; label: string; image: string; cta: string }[];
  videos: { title: string; intro: string; watch: string; items: { slug: string; name: string; poster: string }[] };
  artists: { title: string; sub: string; items: { slug: string; name: string; image: string }[] };
  newsletter: { title: string; text: string; email: string; submit: string; consent: string; ok: string; invalid: string };
  help: { title: string; items: { slug: string; title: string; text: string }[] };
  about: { title: string; text: string };
};

type Props = {
  site: Site;
  renderCard: (p: never) => React.ReactNode;
  onShop: (category: string) => void;
  onProduct: (slug: string) => void;
  onCreator: (slug: string) => void;
  onSupport: (slug: string) => void;
};

function Section({ title, sub, onAll, all, children }: { title: string; sub?: string; onAll?: () => void; all?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 32 }}>
      <View style={st.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={st.h2}>{title}</Text>
          {sub ? <Text style={st.mut}>{sub}</Text> : null}
        </View>
        {onAll ? <Pressable onPress={onAll} style={st.outline}><Text style={st.outlineText}>{all}</Text></Pressable> : null}
      </View>
      {children}
    </View>
  );
}

/** Accueil du site (src/app/[locale]/page.tsx), blocs et textes identiques, dans le même ordre. */
export function HomeBlocks({ site: x, renderCard, onShop, onProduct, onCreator, onSupport }: Props) {
  const [status, setStatus] = useState<"idle" | "ok" | "invalid">("idle");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const submit = () => {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && consent;
    setStatus(ok ? "ok" : "invalid");
    if (ok) { setEmail(""); setConsent(false); }
  };
  const banner = (i: number) => {
    const b = x.banners[i];
    if (!b) return null;
    return (
      <View key={b.slug} style={{ marginTop: 32, paddingHorizontal: 16 }}>
        <Pressable onPress={() => onShop(b.slug)}><Image source={{ uri: b.image }} style={st.banner} /></Pressable>
        <Text style={[st.h2, { paddingHorizontal: 0, marginTop: 12 }]}>{b.label}</Text>
        <Pressable onPress={() => onShop(b.slug)} style={[st.outline, { alignSelf: "flex-start", marginTop: 8 }]}><Text style={st.outlineText}>{b.cta}</Text></Pressable>
      </View>
    );
  };
  const row = (items: P[]) => (
    <FlatList horizontal showsHorizontalScrollIndicator={false} data={items} keyExtractor={(p) => p.slug} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} renderItem={({ item }) => <>{renderCard(item as never)}</>} />
  );
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <View style={st.promo}><Text style={st.promoText}>{x.promoBar}</Text></View>
      <View style={{ padding: 16, alignItems: "center" }}>
        {x.hero.product ? (
          <Pressable onPress={() => onProduct(x.hero.product!.slug)} style={{ width: "100%" }} accessibilityLabel={`${x.hero.product.name} — ${x.hero.product.creatorName}`}>
            <Image source={{ uri: x.hero.product.images[0] }} style={st.hero} resizeMode="contain" />
          </Pressable>
        ) : null}
        <Text style={st.kicker}>{x.hero.kicker.toUpperCase()}</Text>
        <Text style={st.title}>{x.hero.title}</Text>
        <Text style={st.heroText}>{x.hero.text}</Text>
        <Pressable onPress={() => onShop("")} style={st.outline}><Text style={st.outlineText}>{x.hero.cta}</Text></Pressable>
      </View>

      <Section title={x.categoriesTitle}>
        <View style={st.tiles}>
          {x.categoryTiles.map((c) => (
            <Pressable key={c.slug} disabled={c.count === 0} onPress={() => onShop(c.slug)} style={st.tile}>
              {c.image ? <Image source={{ uri: c.image }} style={StyleSheet.absoluteFill} /> : null}
              <View style={st.tileShade} />
              <Text style={st.tileLabel}>{c.label}</Text>
              <Text style={st.tileCount}>{c.countText}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title={x.newIn.title} sub={x.newIn.sub} onAll={() => onShop("")} all="Voir tout">{row(x.newIn.items)}</Section>
      {banner(0)}
      <Section title={x.trending.title} sub={x.trending.sub} onAll={() => onShop("")} all="Voir tout">{row(x.trending.items)}</Section>
      {banner(1)}

      {x.videos.items.length > 0 && (
        <Section title={x.videos.title} sub={x.videos.intro}>
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {x.videos.items.map((v) => (
              <Pressable key={v.slug} onPress={() => onCreator(v.slug)} style={st.videoCard}>
                <View>
                  <Image source={{ uri: v.poster }} style={st.poster} />
                  <View style={st.play}><Text style={{ color: "#fff", fontSize: 18 }}>▶</Text></View>
                </View>
                <View style={{ padding: 12 }}>
                  <Text style={st.videoName}>{v.name}</Text>
                  <Text style={{ color: "#bd5833", fontSize: 14 }}>{x.videos.watch}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Section>
      )}

      <Section title={x.artists.title} sub={x.artists.sub}>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={x.artists.items} keyExtractor={(c) => c.slug} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => onCreator(item.slug)} style={{ width: 150 }}>
              <Image source={{ uri: item.image }} style={{ width: 150, height: 150, backgroundColor: "#f2eadd" }} />
              <Text style={st.artistName} numberOfLines={2}>{item.name}</Text>
            </Pressable>
          )} />
      </Section>

      <View style={st.news}>
        <Text style={[st.h2, { paddingHorizontal: 0, textAlign: "center" }]}>{x.newsletter.title}</Text>
        <Text style={[st.mut, { textAlign: "center", marginVertical: 8 }]}>{x.newsletter.text}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={email} onChangeText={setEmail} placeholder={x.newsletter.email} placeholderTextColor="#6b5d52" keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={st.input} />
          <Pressable onPress={submit} style={st.submit}><Text style={{ color: "#fff", fontWeight: "600" }}>{x.newsletter.submit}</Text></Pressable>
        </View>
        <Pressable onPress={() => setConsent(!consent)} style={{ flexDirection: "row", gap: 8, marginTop: 12 }} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
          <View style={[st.box, consent && { backgroundColor: "#1c3060" }]}>{consent ? <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text> : null}</View>
          <Text style={[st.mut, { flex: 1, fontSize: 12 }]}>{x.newsletter.consent}</Text>
        </Pressable>
        {status !== "idle" ? <Text style={{ marginTop: 8, color: status === "invalid" ? "#b3261e" : "#1c3060" }}>{status === "ok" ? x.newsletter.ok : x.newsletter.invalid}</Text> : null}
      </View>

      <Section title={x.help.title}>
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {x.help.items.map((h) => (
            <Pressable key={h.slug} onPress={() => onSupport(h.slug)} style={st.helpCard}>
              <Text style={st.videoName}>{h.title}</Text>
              <Text style={st.mut}>{h.text}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <View style={{ margin: 16, marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: "#ded6c9" }}>
        <Text style={[st.h2, { paddingHorizontal: 0 }]}>{x.about.title}</Text>
        <Text style={st.mut}>{x.about.text}</Text>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  promo: { backgroundColor: "#1c3060", paddingVertical: 10, paddingHorizontal: 16 },
  promoText: { color: "#fff", textAlign: "center", fontSize: 13 },
  hero: { width: "100%", height: 340, backgroundColor: "#f2eadd" },
  kicker: { marginTop: 16, fontSize: 12, letterSpacing: 2, color: "#bd5833" },
  title: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 28, color: "#1c3060", textAlign: "center", marginTop: 8 },
  heroText: { color: "#6b5d52", textAlign: "center", marginVertical: 12 },
  outline: { minHeight: 44, borderWidth: 1, borderColor: "#000", borderRadius: 6, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  outlineText: { color: "#000", fontSize: 14 },
  sectionHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  h2: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 22, color: "#1c3060" },
  mut: { fontSize: 14, color: "#6b5d52" },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16 },
  tile: { width: "47.5%", aspectRatio: 4 / 3, borderRadius: 8, overflow: "hidden", backgroundColor: "#f2eadd", justifyContent: "flex-end", padding: 10 },
  tileShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  tileLabel: { color: "#fff", fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 16 },
  tileCount: { color: "#fff", fontSize: 12, opacity: 0.9 },
  banner: { width: "100%", aspectRatio: 4 / 3, borderRadius: 8, backgroundColor: "#f2eadd" },
  videoCard: { borderWidth: 1, borderColor: "#e9a93a", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff" },
  poster: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#f2eadd" },
  play: { position: "absolute", top: "50%", left: "50%", marginLeft: -24, marginTop: -24, width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  videoName: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 17, color: "#1c3060" },
  artistName: { textAlign: "center", fontSize: 14, fontWeight: "600", marginTop: 8, color: "#221812" },
  news: { margin: 16, marginTop: 32, padding: 20, borderRadius: 8, backgroundColor: "#f2eadd" },
  input: { flex: 1, height: 44, borderRadius: 6, borderWidth: 1, borderColor: "#ded6c9", backgroundColor: "#faf6ee", color: "#221812", paddingHorizontal: 12 },
  submit: { height: 44, borderRadius: 6, backgroundColor: "#000", paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  box: { width: 18, height: 18, borderWidth: 1, borderColor: "#1c3060", borderRadius: 3, alignItems: "center", justifyContent: "center" },
  helpCard: { borderWidth: 1, borderColor: "#ded6c9", borderRadius: 8, padding: 14 },
});
