import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";

export type PushMessage = { title: string; body: string; url: string };

export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export function isPushConfigured(): boolean {
  return !!(vapidPublicKey() && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

// Envoie une notification à tous les appareils d'un utilisateur ; purge les abonnements expirés (404/410).
export async function sendPushToUser(userId: string, build: (locale: "fr" | "en") => PushMessage): Promise<number> {
  if (!isPushConfigured()) return 0;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, vapidPublicKey(), process.env.VAPID_PRIVATE_KEY!);
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  let delivered = 0;
  for (const s of subs) {
    const msg = build(s.locale === "en" ? "en" : "fr");
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
