import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { authed } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** Demande l'autorisation et enregistre le jeton Expo (même table que le Web Push du site). Retourne le jeton ou une raison. */
export async function enablePush(accessToken: string): Promise<{ token?: string; error?: "denied" | "unavailable"; detail?: string }> {
  try {
    if (!Device.isDevice) return { error: "unavailable", detail: "appareil non physique" };
    if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("default", { name: "Alertes", importance: Notifications.AndroidImportance.DEFAULT });
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return { error: "denied" };
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const r = await authed(accessToken, "POST", "/api/v1/push/token", { token: data, locale: "fr" });
    return r.ok ? { token: data } : { error: "unavailable", detail: `API /api/v1/push/token HTTP ${r.status || "réseau/délai"}` };
  } catch (e) {
    return { error: "unavailable", detail: String((e as Error)?.message ?? e) };
  }
}

export async function disablePush(accessToken: string, token: string) {
  await authed(accessToken, "DELETE", "/api/v1/push/token", { token });
}
