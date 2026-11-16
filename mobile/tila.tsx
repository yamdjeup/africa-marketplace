import { tr } from "./region";
import { useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { authed } from "./api";
import { API_URL } from "./config";

// Reprend src/components/tila/tila-chat.tsx (textes FR, 10 derniers messages, 500 caractères, fiches produit) via POST /api/tila.
type Card = { slug: string; name: string; creatorName: string; priceCents: number; image: string | null };
type Msg = { role: "user" | "assistant"; content: string; products?: Card[] };

const T = {
  name: "Tílá",
  badge: "Assistant IA",
  open: "Ouvrir Tílá, l'assistant IA d'achat",
  hello: "Bonjour, je suis Tílá, votre assistant IA. Dites-moi ce que vous cherchez (occasion, tissu, budget) et je vous montre des pièces en stock.",
  placeholder: "Votre message…",
  send: "Envoyer",
  notice: "Réponses générées par une IA, qui peut se tromper. Ne saisissez pas de données personnelles.",
  thinking: "Tílá réfléchit…",
  errors: { rate: "Vous avez posé beaucoup de questions : réessayez dans un moment.", unavailable: "Tílá est momentanément indisponible. Réessayez plus tard.", invalid: "Message trop long ou invalide." } as Record<string, string>,
};
const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;
const abs = (u: string) => (u.startsWith("/") ? `${API_URL}${u}` : u);
const AVATAR = `${API_URL}/tila-avatar.jpeg`;

export function TilaButton({ onOpenSlug }: { onOpenSlug: (slug: string) => void }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scroller = useRef<ScrollView>(null);

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setText("");
    setError("");
    setBusy(true);
    const r = await authed<{ reply?: string; products?: Card[]; error?: string }>(null, "POST", "/api/tila", { locale: "fr", messages: next.slice(-10).map(({ role, content }) => ({ role, content })) });
    setBusy(false);
    if (!r.ok || !r.data.reply) setError(T.errors[r.data.error ?? "unavailable"] ?? T.errors.unavailable);
    else setMsgs([...next, { role: "assistant", content: r.data.reply, products: r.data.products ?? [] }]);
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityLabel={T.open} style={[st.fab, { bottom: 64 + Math.max(insets.bottom, Platform.OS === "android" ? 16 : 0) }]}>
        <Image source={{ uri: AVATAR }} style={st.fabImg} />
        <View><Text style={st.fabName}>{T.name}</Text><Text style={st.fabBadge}>{T.badge}</Text></View>
      </Pressable>
      {open && (
        <Modal animationType="slide" onRequestClose={() => setOpen(false)}>
          <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: "#faf6ee" }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "padding"}>
              <View style={st.head}>
                <Image source={{ uri: AVATAR }} style={st.headImg} />
                <View style={{ flex: 1 }}><Text style={st.name}>{T.name}</Text><Text style={st.badge}>{T.badge}</Text></View>
                <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel={tr("Fermer", "Close")}><Text style={{ fontSize: 28, color: "#221812" }}>×</Text></Pressable>
              </View>
              <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd()} contentContainerStyle={{ padding: 12, gap: 10 }} keyboardShouldPersistTaps="handled">
                <Text style={[st.bubble, { backgroundColor: "#f2eadd" }]}>{T.hello}</Text>
                {msgs.map((m, i) => (
                  <View key={i} style={{ alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 6 }}>
                    <Text style={[st.bubble, m.role === "user" ? { backgroundColor: "#1c3060", color: "#fff" } : { backgroundColor: "#f2eadd" }]}>{m.content}</Text>
                    {m.products?.map((p) => (
                      <Pressable key={p.slug} onPress={() => { setOpen(false); onOpenSlug(p.slug); }} style={st.card}>
                        {p.image ? <Image source={{ uri: abs(p.image) }} style={st.thumb} /> : null}
                        <View style={{ flex: 1 }}><Text style={{ fontWeight: "700", color: "#221812" }}>{p.name}</Text><Text style={{ fontSize: 12, color: "#6b5d52" }}>{p.creatorName}</Text></View>
                        <Text style={{ fontWeight: "700", color: "#221812" }}>{eur(p.priceCents)}</Text>
                      </Pressable>
                    ))}
                  </View>
                ))}
                {busy && <View style={{ flexDirection: "row", gap: 8 }}><ActivityIndicator /><Text style={{ color: "#6b5d52" }}>{T.thinking}</Text></View>}
                {!!error && <Text style={{ color: "#a33" }}>{error}</Text>}
              </ScrollView>
              <View style={st.form}>
                <TextInput value={text} onChangeText={setText} maxLength={500} placeholder={T.placeholder} placeholderTextColor="#6b5d52" selectionColor="#1c3060" onSubmitEditing={send} returnKeyType="send" style={st.input} />
                <Pressable onPress={send} disabled={busy || !text.trim()} style={[st.send, (busy || !text.trim()) && { opacity: 0.5 }]}><Text style={{ color: "#fff", fontWeight: "700" }}>{T.send}</Text></Pressable>
              </View>
              <Text style={st.notice}>{T.notice}</Text>
            </KeyboardAvoidingView>
          </SafeAreaView></SafeAreaProvider>
        </Modal>
      )}
    </>
  );
}

const st = StyleSheet.create({
  fab: { position: "absolute", right: 12, bottom: 72, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#1c3060", borderRadius: 40, paddingVertical: 4, paddingLeft: 4, paddingRight: 14, elevation: 6 },
  fabImg: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: "#f59e0b" },
  fabName: { color: "#fff", fontWeight: "600", fontSize: 14 },
  fabBadge: { color: "#fff", opacity: 0.8, fontSize: 11 },
  head: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1, borderColor: "#ded6c9" },
  headImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: "#f59e0b" },
  name: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 18, color: "#221812" },
  badge: { fontSize: 12, color: "#6b5d52" },
  bubble: { padding: 10, borderRadius: 10, maxWidth: "90%", color: "#221812", overflow: "hidden" },
  card: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#ded6c9", borderRadius: 8, padding: 8, backgroundColor: "#fff", alignSelf: "stretch" },
  thumb: { width: 56, height: 56, borderRadius: 4 },
  form: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderColor: "#ded6c9" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ded6c9", backgroundColor: "#fff", color: "#221812", paddingHorizontal: 12, paddingVertical: 8, fontSize: 16 },
  send: { backgroundColor: "#1c3060", paddingHorizontal: 16, justifyContent: "center", borderRadius: 4 },
  notice: { fontSize: 11, color: "#6b5d52", paddingHorizontal: 12, paddingBottom: 8 },
});
