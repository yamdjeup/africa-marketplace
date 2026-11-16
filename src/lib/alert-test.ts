import { db } from "@/lib/db";
import { buildAlertEmail } from "@/lib/alerts-core";
import { getEmailProvider, sendEmail } from "@/lib/email";

const MIN_INTERVAL_MS = 60_000;

export type AlertTestStatus = "sent" | "failed" | "unconfigured" | "rate_limited" | "unauthenticated";

// E-mail de test des alertes (1 par minute) ; partagé par /api/alerts/test (site) et /api/v1/alerts/test (app).
export async function sendAlertTest(userId: string, locale: "fr" | "en"): Promise<{ status: AlertTestStatus; http: number }> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { status: "unauthenticated", http: 401 };
  if (!getEmailProvider()) return { status: "unconfigured", http: 503 };
  if (user.lastTestEmailAt && Date.now() - user.lastTestEmailAt.getTime() < MIN_INTERVAL_MS) return { status: "rate_limited", http: 429 };
  await db.user.update({ where: { id: user.id }, data: { lastTestEmailAt: new Date() } });
  const sample = await db.product.findFirst({ where: { stock: { gt: 0 } }, include: { creator: true } });
  const items = sample ? [{ slug: sample.slug, name: sample.name, creatorName: sample.creator.name, priceCents: sample.priceCents }] : [];
  const ok = await sendEmail({ to: user.email, ...buildAlertEmail({ kind: "test", locale, userId: user.id, items }) });
  return ok ? { status: "sent", http: 200 } : { status: "failed", http: 502 };
}
