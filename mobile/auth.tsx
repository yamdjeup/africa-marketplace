import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { API_URL } from "./config";
import { AlertsScreen } from "./alerts";
import { SupportScreen } from "./support";
import { AddressesScreen } from "./addresses";
import { OrdersScreen } from "./orders";
import { SupplierScreen, useIsSupplier } from "./supplier";

export type User = { id: string; email: string; name: string };
type Tokens = { accessToken: string; refreshToken: string };
const KEY = "epomta-session";

const ERRORS: Record<string, string> = {
  required: "Veuillez remplir tous les champs.",
  email: "Adresse e-mail invalide.",
  password: "Le mot de passe doit contenir au moins 8 caractères.",
  exists: "Un compte existe déjà avec cet e-mail.",
  invalid: "E-mail ou mot de passe incorrect.",
  limited: "Trop de demandes : 3 par heure au maximum. Réessayez dans 1 h.",
  network: "Connexion impossible. Vérifiez votre réseau.",
};

async function post(action: string, body: unknown): Promise<{ ok: boolean; data: Record<string, any> }> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({ error: "bad_response" }));
    return { ok: res.ok, data: { ...data, http: res.status } };
  } catch (e) {
    return { ok: false, data: { error: "network", detail: String((e as Error)?.message ?? e) } };
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
    if (!r.ok) return ERRORS[r.data.error] ?? ERRORS.network;
    return r.data.status === "unknown" ? "Aucun compte n’est associé à cette adresse e-mail." : r.data.status === "social" ? "Ce compte utilise la connexion Google : il n’a pas de mot de passe. Un e-mail vous indique comment vous connecter." : null;
  };
  const google = async (idToken: string) => {
    const r = await post("google", { idToken });
    if (r.ok) await apply(r.data);
    return r.ok ? null : `${ERRORS[r.data.error] ?? "Connexion Google impossible."} (${API_URL} · HTTP ${r.data.http ?? "-"} · ${r.data.error ?? "?"}${r.data.detail ? " · " + r.data.detail : ""})`;
  };
  const logout = async () => {
    await SecureStore.deleteItemAsync(KEY);
    setUser(null);
    setAccessToken(null);
  };
  return { user, ready, accessToken, login, register, forgot, google, logout };
}

type Auth = ReturnType<typeof useAuth>;

const GOOGLE_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
GoogleSignin.configure({ webClientId: GOOGLE_WEB });

function GoogleButton({ auth, onError }: { auth: Auth; onError: (m: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    setBusy(true);
    onError(null);
    try {
      await GoogleSignin.hasPlayServices();
      const r = await GoogleSignin.signIn();
      const idToken = r.type === "success" ? r.data.idToken : null;
      if (idToken) onError(await auth.google(idToken));
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== statusCodes.SIGN_IN_CANCELLED) onError(`Connexion Google impossible. Réessayez. (code : ${code ?? "?"} — ${(e as Error).message ?? ""})`);
    }
    setBusy(false);
  };
  return (
    <Pressable style={[s.cta, s.ghost, { marginTop: 12, opacity: busy ? 0.6 : 1 }]} disabled={busy} onPress={signIn}>
      <Text style={[s.ctaText, { color: "#221812" }]}>{tr("Continuer avec google", "Continue with Google")}</Text>
    </Pressable>
  );
}

import { RegionRow, tr } from "./region";
import { ProfileScreen } from "./profile";

export function AccountScreen({ auth, onOpenSite, more }: { auth: Auth; onOpenSite: (path: string) => void; more?: React.ReactNode }) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addresses, setAddresses] = useState(false);
  const [orders, setOrders] = useState(false);
  const [alerts, setAlerts] = useState(false);
  const [profile, setProfile] = useState(false);
  const [support, setSupport] = useState(false);
  const [space, setSpace] = useState(false);
  const isSupplier = useIsSupplier(auth.accessToken ?? null);

  if (!auth.ready) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (support) return <SupportScreen onBack={() => setSupport(false)} />;
  if (auth.user && addresses && auth.accessToken) return <AddressesScreen token={auth.accessToken} onBack={() => setAddresses(false)} />;
  if (auth.user && profile && auth.accessToken) return <ProfileScreen token={auth.accessToken} onBack={() => setProfile(false)} />;
  if (auth.user && alerts && auth.accessToken) return <AlertsScreen token={auth.accessToken} onBack={() => setAlerts(false)} />;
  if (auth.user && space && isSupplier && auth.accessToken) return <SupplierScreen token={auth.accessToken} onBack={() => setSpace(false)} />;
  if (auth.user && orders && auth.accessToken) return <OrdersScreen token={auth.accessToken} onBack={() => setOrders(false)} />;

  if (auth.user) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={s.h2}>{tr("Mon compte", "My account")}</Text>
        <Text style={s.body}>Bonjour {auth.user.name}</Text>
        <Text style={s.mut}>{auth.user.email}</Text>
        <Text style={[s.h2, { marginTop: 16 }]}>Langue et région</Text>
                <View style={{ marginTop: 16 }}><RegionRow /></View>
        {isSupplier ? <Pressable style={[s.cta, { marginTop: 16 }]} onPress={() => setSpace(true)}><Text style={s.ctaText}>{tr("Espace créateur", "Creator space")}</Text></Pressable> : null}
        <Pressable style={[s.cta, { marginTop: 16 }]} onPress={() => setProfile(true)}><Text style={s.ctaText}>{tr("Détails et sécurité", "Details and security")}</Text></Pressable>
        <Pressable style={[s.cta, { marginTop: 12 }]} onPress={() => setOrders(true)}><Text style={s.ctaText}>{tr("Mes commandes", "My orders")}</Text></Pressable>
        <Pressable style={[s.cta, { marginTop: 12 }]} onPress={() => setAddresses(true)}><Text style={s.ctaText}>{tr("Mes adresses", "My addresses")}</Text></Pressable>
        <Pressable style={[s.cta, { marginTop: 12 }]} onPress={() => setAlerts(true)}><Text style={s.ctaText}>{tr("Recevoir des alertes", "Get alerts")}</Text></Pressable>
        <Pressable style={[s.cta, { marginTop: 12 }]} onPress={() => setSupport(true)}><Text style={s.ctaText}>Besoin d’aide ?</Text></Pressable>
        <Pressable style={[s.cta, s.ghost, { marginTop: 12 }]} onPress={auth.logout}><Text style={[s.ctaText, { color: "#221812" }]}>Se déconnecter</Text></Pressable>
                {more}
      </ScrollView>
    );
  }

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    const err = mode === "login" ? await auth.login(email, password) : mode === "register" ? await auth.register(name, email, password) : await auth.forgot(email);
    if (mode === "forgot" && !err) setMsg("Un e-mail vient d’être envoyé (lien valable 1 h). Pensez à vérifier vos courriers indésirables.");
    else setMsg(err);
    setBusy(false);
  };
  const titles = { login: "Connexion", register: "Créer un compte", forgot: "Mot de passe oublié" };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={s.h2}>{titles[mode]}</Text>
      <View style={{ marginBottom: 16 }}><RegionRow /></View>
      {mode === "register" && <TextInput placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={s.input} placeholder="Nom" value={name} onChangeText={setName} autoComplete="name" />}
      <TextInput placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={s.input} placeholder={tr("Adresse e-mail", "Email address")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      {mode !== "forgot" && <TextInput placeholderTextColor="#6b5d52" selectionColor="#1c3060" style={s.input} placeholder={tr("Mot de passe", "Password")} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />}
      {msg ? <Text style={s.msg}>{msg}</Text> : null}
      <Pressable style={[s.cta, { marginTop: 12, opacity: busy ? 0.6 : 1 }]} disabled={busy} onPress={submit}>
        <Text style={s.ctaText}>{mode === "login" ? "Se connecter" : mode === "register" ? "Créer mon compte" : "Envoyer le lien"}</Text>
      </Pressable>
      {mode !== "forgot" && GOOGLE_ANDROID && GOOGLE_WEB ? <GoogleButton auth={auth} onError={setMsg} /> : null}
      <View style={{ marginTop: 16, gap: 12 }}>
        {mode !== "login" && <Pressable onPress={() => { setMode("login"); setMsg(null); }}><Text style={s.link}>J’ai déjà un compte</Text></Pressable>}
        {mode !== "register" && <Pressable onPress={() => { setMode("register"); setMsg(null); }}><Text style={s.link}>Créer un compte</Text></Pressable>}
        {mode === "login" && <Pressable onPress={() => { setMode("forgot"); setMsg(null); }}><Text style={s.link}>Mot de passe oublié ?</Text></Pressable>}
        <Pressable onPress={() => setSupport(true)}><Text style={s.link}>Besoin d’aide ?</Text></Pressable>
      </View>
      {more}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h2: { fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 18, fontWeight: "700", marginBottom: 16 },
  body: { fontSize: 15, color: "#221812", marginBottom: 4 },
  mut: { fontSize: 14, color: "#666" },
  input: { backgroundColor: "#faf6ee", color: "#221812", borderWidth: 1, borderColor: "#ded6c9", paddingHorizontal: 12, height: 48, fontSize: 16, marginBottom: 12 },
  msg: { color: "#b00020", fontSize: 14, marginBottom: 4 },
  cta: { borderRadius: 8, backgroundColor: "#1c3060", height: 48, alignItems: "center", justifyContent: "center" },
  ghost: { backgroundColor: "#faf6ee", borderWidth: 1, borderColor: "#1c3060" },
  ctaText: { color: "#fff",  },
  link: { textDecorationLine: "underline", fontSize: 15, color: "#221812" },
});
