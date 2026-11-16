import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { API_URL } from "./config";
import { AddressesScreen } from "./addresses";

export type User = { id: string; email: string; name: string };
type Tokens = { accessToken: string; refreshToken: string };
const KEY = "epomta-session";

const ERRORS: Record<string, string> = {
  required: "Veuillez remplir tous les champs.",
  email: "Adresse e-mail invalide.",
  password: "Le mot de passe doit contenir au moins 8 caractères.",
  exists: "Un compte existe déjà avec cet e-mail.",
  invalid: "E-mail ou mot de passe incorrect.",
  limited: "Trop de demandes. Réessayez dans quelques minutes.",
  network: "Connexion impossible. Vérifiez votre réseau.",
};

async function post(action: string, body: unknown): Promise<{ ok: boolean; data: Record<string, any> }> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, data: { error: "network" } };
  }
}

/** Session persistante (jetons dans le stockage sécurisé) ; le jeton d'accès est renouvelé via le refresh. */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const apply = useCallback(async (d: Record<string, any>) => {
    await SecureStore.setItemAsync(KEY, JSON.stringify({ accessToken: d.accessToken, refreshToken: d.refreshToken } satisfies Tokens));
    setUser(d.user);
    setAccessToken(d.accessToken);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        if (raw) {
          const r = await post("refresh", { refreshToken: (JSON.parse(raw) as Tokens).refreshToken });
          if (r.ok) await apply(r.data);
          else if (r.data.error !== "network") await SecureStore.deleteItemAsync(KEY);
        }
      } finally {
        setReady(true);
      }
    })();
  }, [apply]);

  const login = async (email: string, password: string) => {
    const r = await post("login", { email, password });
    if (r.ok) await apply(r.data);
    return r.ok ? null : ERRORS[r.data.error] ?? ERRORS.network;
  };
  const register = async (name: string, email: string, password: string) => {
    const r = await post("register", { name, email, password });
    if (r.ok) await apply(r.data);
    return r.ok ? null : ERRORS[r.data.error] ?? ERRORS.network;
  };
  const forgot = async (email: string) => {
    const r = await post("forgot", { email, locale: "fr" });
    return r.ok ? null : ERRORS[r.data.error] ?? ERRORS.network;
  };
  const google = async (idToken: string) => {
    const r = await post("google", { idToken });
    if (r.ok) await apply(r.data);
    return r.ok ? null : ERRORS[r.data.error] ?? ERRORS.network;
  };
  const logout = async () => {
    await SecureStore.deleteItemAsync(KEY);
    setUser(null);
    setAccessToken(null);
  };
  return { user, ready, accessToken, login, register, forgot, google, logout };
}

type Auth = ReturnType<typeof useAuth>;

WebBrowser.maybeCompleteAuthSession();
const GOOGLE_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

function GoogleButton({ auth, onError }: { auth: Auth; onError: (m: string | null) => void }) {
  const [request, response, prompt] = Google.useIdTokenAuthRequest({ androidClientId: GOOGLE_ANDROID, webClientId: GOOGLE_WEB });
  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.params?.id_token;
    if (idToken) auth.google(idToken).then(onError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);
  return (
    <Pressable style={[s.cta, s.ghost, { marginTop: 12, opacity: request ? 1 : 0.6 }]} disabled={!request} onPress={() => prompt()}>
      <Text style={[s.ctaText, { color: "#000" }]}>CONTINUER AVEC GOOGLE</Text>
    </Pressable>
  );
}

export function AccountScreen({ auth, onOpenSite }: { auth: Auth; onOpenSite: (path: string) => void }) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addresses, setAddresses] = useState(false);

  if (!auth.ready) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (auth.user && addresses && auth.accessToken) return <AddressesScreen token={auth.accessToken} onBack={() => setAddresses(false)} />;

  if (auth.user) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={s.h2}>MON COMPTE</Text>
        <Text style={s.body}>Bonjour {auth.user.name}</Text>
        <Text style={s.mut}>{auth.user.email}</Text>
        <Text style={[s.body, { marginTop: 12 }]}>Langue : Français</Text>
        <Pressable style={[s.cta, { marginTop: 16 }]} onPress={() => setAddresses(true)}><Text style={s.ctaText}>MES ADRESSES</Text></Pressable>
        <Pressable style={[s.cta, { marginTop: 12 }]} onPress={() => onOpenSite("/fr/support")}><Text style={s.ctaText}>BESOIN D’AIDE ?</Text></Pressable>
        <Pressable style={[s.cta, s.ghost, { marginTop: 12 }]} onPress={auth.logout}><Text style={[s.ctaText, { color: "#000" }]}>SE DÉCONNECTER</Text></Pressable>
      </ScrollView>
    );
  }

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    const err = mode === "login" ? await auth.login(email, password) : mode === "register" ? await auth.register(name, email, password) : await auth.forgot(email);
    if (mode === "forgot" && !err) setMsg("Si un compte existe avec cet e-mail, un lien de réinitialisation vient d’être envoyé.");
    else setMsg(err);
    setBusy(false);
  };
  const titles = { login: "CONNEXION", register: "CRÉER UN COMPTE", forgot: "MOT DE PASSE OUBLIÉ" };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={s.h2}>{titles[mode]}</Text>
      {mode === "register" && <TextInput style={s.input} placeholder="Nom" value={name} onChangeText={setName} autoComplete="name" />}
      <TextInput style={s.input} placeholder="Adresse e-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      {mode !== "forgot" && <TextInput style={s.input} placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />}
      {msg ? <Text style={s.msg}>{msg}</Text> : null}
      <Pressable style={[s.cta, { marginTop: 12, opacity: busy ? 0.6 : 1 }]} disabled={busy} onPress={submit}>
        <Text style={s.ctaText}>{mode === "login" ? "SE CONNECTER" : mode === "register" ? "CRÉER MON COMPTE" : "ENVOYER LE LIEN"}</Text>
      </Pressable>
      {mode !== "forgot" && GOOGLE_ANDROID && GOOGLE_WEB ? <GoogleButton auth={auth} onError={setMsg} /> : null}
      <View style={{ marginTop: 16, gap: 12 }}>
        {mode !== "login" && <Pressable onPress={() => { setMode("login"); setMsg(null); }}><Text style={s.link}>J’ai déjà un compte</Text></Pressable>}
        {mode !== "register" && <Pressable onPress={() => { setMode("register"); setMsg(null); }}><Text style={s.link}>Créer un compte</Text></Pressable>}
        {mode === "login" && <Pressable onPress={() => { setMode("forgot"); setMsg(null); }}><Text style={s.link}>Mot de passe oublié ?</Text></Pressable>}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h2: { fontSize: 18, fontWeight: "700", letterSpacing: 1, marginBottom: 16 },
  body: { fontSize: 15, color: "#111", marginBottom: 4 },
  mut: { fontSize: 14, color: "#666" },
  input: { borderWidth: 1, borderColor: "#ccc", paddingHorizontal: 12, height: 48, fontSize: 16, marginBottom: 12 },
  msg: { color: "#b00020", fontSize: 14, marginBottom: 4 },
  cta: { backgroundColor: "#000", height: 48, alignItems: "center", justifyContent: "center" },
  ghost: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#000" },
  ctaText: { color: "#fff", fontWeight: "700", letterSpacing: 1 },
  link: { textDecorationLine: "underline", fontSize: 15, color: "#111" },
});
