import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { API_URL } from "./config";

type Row = { slug: string; title: string };
type Index = { support: Row[]; help: Row[]; helpTitle: string; contactLabel: string };
type Doc = { slug: string; title: string; body: string[]; isHelp: boolean };

// Reprend src/app/[locale]/support/[slug]/page.tsx (contenu, rubriques d'aide, Â« Ce contenu vous semble-t-il pertinent ? ")
// et la rubrique Support de src/app/[locale]/account/page.tsx.
export function SupportScreen({ onBack }: { onBack: () => void }) {
  const [index, setIndex] = useState<Index | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/support?locale=fr`).then((r) => r.json()).then(setIndex).catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    setDoc(null);
    setAnswer(null);
    if (!slug) return;
    fetch(`${API_URL}/api/v1/support/${slug}?locale=fr`).then((r) => r.json()).then(setDoc).catch(() => setFailed(true));
  }, [slug]);

  if (slug) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Pressable onPress={() => setSlug(null)} hitSlop={10}><Text style={st.back}>â€¹ Retour</Text></Pressable>
        {!doc ? <ActivityIndicator style={{ marginTop: 30 }} /> : (
          <View>
            <Text style={st.title}>{doc.title}</Text>
            {doc.body.map((p) => <Text key={p} style={st.p}>{p}</Text>)}
            {doc.isHelp && (
              <View style={st.feedback}>
                {answer === null ? (
                  <>
                    <Text style={{ fontWeight: "600", color: "#221812" }}>Ce contenu vous semble-t-il pertinent ?</Text>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                      <Pressable onPress={() => setAnswer(true)} style={st.btn}><Text style={st.btnText}>Oui</Text></Pressable>
                      <Pressable onPress={() => setAnswer(false)} style={st.btn}><Text style={st.btnText}>Pas vraiment</Text></Pressable>
                    </View>
                  </>
                ) : <Text style={{ color: "#221812" }}>Merci pour votre retour.</Text>}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    );
  }

  const section = (title: string, rows: Row[]) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={st.section}>{title}</Text>
      {rows.map((r) => (
        <Pressable key={r.slug} onPress={() => setSlug(r.slug)} style={st.row}>
          <Text style={{ color: "#221812" }}>{r.title}</Text>
          <Text style={{ color: "#6b5d52" }}>â€º</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Pressable onPress={onBack} hitSlop={10}><Text style={st.back}>â€¹ Retour</Text></Pressable>
      <Text style={st.title}>Besoin dâ€™aide ?</Text>
      {failed && !index ? <Text style={st.p}>Connexion impossible. VÃ©rifiez votre rÃ©seau.</Text> : !index ? <ActivityIndicator style={{ marginTop: 30 }} /> : (
        <View>
          {section("Aide", index.help)}
          {section("Support", index.support)}
          <Pressable onPress={() => Linking.openURL("mailto:contact@epomta.com")} style={[st.btn, { alignSelf: "stretch", alignItems: "center", backgroundColor: "#1c3060" }]}>
            <Text style={[st.btnText, { color: "#fff" }]}>{index.contactLabel} : contact@epomta.com</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  back: { color: "#1c3060", fontSize: 14, marginBottom: 12 },
  title: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 24, color: "#1c3060", marginBottom: 12 },
  section: { fontWeight: "700", color: "#221812", marginBottom: 4 },
  row: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#ded6c9" },
  p: { fontSize: 14, lineHeight: 21, color: "#221812", marginBottom: 12 },
  feedback: { marginTop: 24, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#ded6c9", paddingTop: 16 },
  btn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: "#1c3060" },
  btnText: { color: "#1c3060", fontWeight: "600" },
});
