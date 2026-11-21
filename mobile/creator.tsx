import { tr } from "./region";
import { useEffect, useState } from "react";
import { Badges } from "./badges";
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import { authed } from "./api";

// Reprend src/app/[locale]/partenaires/[slug]/page.tsx (bio, vidéo « Rencontre avec », citation, « Ses créations ») ; textes de i18n.creator.
type Product = { slug: string; name: string; creatorName: string; priceCents: number; images: string[]; stock?: number; soldOut?: boolean; isNew?: boolean; isExample?: boolean };
type Creator = { slug: string; name: string; specialty: string; madeIn?: string; countries?: string[]; image: string; bio: string; sourceUrl: string | null; video: { src: string; poster: string; orientation: "portrait" | "landscape"; excerpt: string } | null; products: Product[] };
const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

function Meet({ c }: { c: Creator }) {
  const v = c.video!;
  const player = useVideoPlayer(v.src);
  return (
    <View style={st.meet}>
      <VideoView player={player} nativeControls contentFit="contain" style={[st.video, v.orientation === "portrait" ? { aspectRatio: 9 / 16, width: 240 } : { aspectRatio: 16 / 9, width: "100%" }]} />
      <Text style={st.h2}>Rencontre avec {c.name}</Text>
      <Text style={st.p}>{tr("Découvrez l'artiste en quelques mots, lors de l'exposition G3A.", "Meet the artist in a few words, at the G3A exhibition.")}</Text>
      <Text style={st.quote}>“{v.excerpt}”</Text>
    </View>
  );
}

export function CreatorScreen({ slug, onClose, onOpenSlug }: { slug: string; onClose: () => void; onOpenSlug: (slug: string) => void }) {
  const [c, setC] = useState<Creator | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    authed<Creator>(null, "GET", `/api/v1/creators/${slug}?locale=fr`).then((r) => (r.ok ? setC(r.data) : setMissing(true)));
  }, [slug]);
  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: "#faf6ee" }}>
        <Pressable onPress={onClose} hitSlop={12} style={{ height: 44, justifyContent: "center", paddingHorizontal: 16 }} accessibilityLabel={tr("Retour", "Back")}><Text style={{ fontSize: 28, color: "#221812" }}>←</Text></Pressable>
        {!c && !missing && <ActivityIndicator />}
        {missing && <Text style={[st.p, { padding: 16 }]}>{tr("Artiste introuvable", "Artist not found")}</Text>}
        {c && (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
            <View style={{ alignItems: "center", gap: 8 }}>
              <Image source={{ uri: c.image }} style={st.avatar} />
              <Text style={st.h1}>{c.name}</Text>
              <Text style={st.spec}>{c.specialty}</Text>
              {!!c.countries?.length && <Text style={st.p}>{c.countries.join(", ")}</Text>}
              {!!c.madeIn && <Text style={st.p}>{tr("Fabriqué en", "Made in")} : {c.madeIn}</Text>}
              <Text style={st.p}>{c.bio}</Text>
              {c.sourceUrl && <Pressable onPress={() => Linking.openURL(c.sourceUrl!)}><Text style={st.link}>Lire l'article source sur g3a.org</Text></Pressable>}
            </View>
            {c.video && <Meet c={c} />}
            <Text style={st.h2}>{tr("Ses créations", "Their pieces")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {c.products.map((p) => (
                <Pressable key={p.slug} onPress={() => { onClose(); onOpenSlug(p.slug); }} style={{ width: "47%" }}>
                  <View><Image source={{ uri: p.images[0] }} style={{ width: "100%", aspectRatio: 1, backgroundColor: "#f2eadd" }} /><Badges soldOut={p.soldOut} stock={p.stock} isNew={p.isNew} isExample={p.isExample} /></View>
                  <Text numberOfLines={2} style={{ color: "#221812", marginTop: 4 }}>{p.name}</Text>
                  <Text style={{ color: "#221812", fontWeight: "700" }}>{eur(p.priceCents)}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
      </SafeAreaView></SafeAreaProvider>
    </Modal>
  );
}

const st = StyleSheet.create({
  avatar: { width: 128, height: 128, borderRadius: 64, borderWidth: 4, borderColor: "#ded6c9" },
  h1: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 28, color: "#1c3060" },
  h2: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 22, color: "#1c3060" },
  spec: { fontSize: 12, textTransform: "uppercase", color: "#b4532a" },
  p: { color: "#221812", fontSize: 15, lineHeight: 22 },
  link: { color: "#6b5d52", fontSize: 12, textDecorationLine: "underline" },
  meet: { borderWidth: 1, borderColor: "#ded6c9", backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 10, alignItems: "center" },
  video: { backgroundColor: "#000", borderRadius: 12 },
  quote: { fontFamily: "PlayfairDisplay_600SemiBold", fontStyle: "italic", fontSize: 17, color: "#1c3060", textAlign: "center" },
});
