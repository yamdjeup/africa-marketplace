import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";

export type PushMessage = { title: string; body: string; url: string };

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export function isPushConfigured(): boolean {
  return !!(vapidPublicKey() && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

// Appareils de l'app mobile : jeton Expo stocke dans PushSubscription.endpoint (p256dh/auth = "expo").
export const isExpoToken = (v: string) => /^Expo(nent)?PushToken\[.+\]$/.test(v);

// Retourne false si le jeton est invalide (DeviceNotRegistered) pour le purger.
async function sendExpo(to: string, m: PushMessage): Promise<boolean> {
  try {
    const r = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to, title: m.title, body: m.body, data: { url: m.url } }) });
    const j = (await r.json().catch(() => ({}))) as { data?: { status?: string; details?: { error?: string } } };
    return !(j.data?.status === "error" && j.data.details?.error === "DeviceNotRegistered");
  } catch {
    return true;
  }
}

// Envoie une notification à tous les appareils d'un utilisateur (web push + appareils de l'app via Expo) ; purge les abonnements expirés.
export async function sendPushToUser(userId: string, build: (locale: "fr" | "en") => PushMessage): Promise<number> {
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  const webOk = isPushConfigured();
  if (webOk) webpush.setVapidDetails(process.env.VAPID_SUBJECT!, vapidPublicKey(), process.env.VAPID_PRIVATE_KEY!);
  let delivered = 0;
  for (const s of subs) {
    const msg = build(s.locale === "en" ? "en" : "fr");
    if (isExpoToken(s.endpoint)) {
      if (await sendExpo(s.endpoint, msg)) delivered++;
      else await db.pushSubscription.deleteMany({ where: { endpoint: s.endpoint } });
      continue;
    }
    if (!webOk) continue;
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 60 * 60 * 24 });
      delivered++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.pushSubscription.deleteMany({ where: { endpoint: s.endpoint } });
    }
  }
  return delivered;
}
