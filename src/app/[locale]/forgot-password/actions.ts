"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/alerts-core";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { renderEmailHtml } from "@/lib/email-layout";
import { isLocale } from "@/lib/i18n";
import { requestPasswordReset, resetEmail, resetPassword } from "@/lib/password-reset";

export type ResetState = { done?: boolean; error?: "email" | "password" | "invalid" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const field = (f: FormData, n: string) => String(f.get(n) ?? "");
const localeOf = (f: FormData) => (isLocale(field(f, "locale")) ? (field(f, "locale") as "fr" | "en") : "fr");

export async function forgotPassword(_prev: ResetState, f: FormData): Promise<ResetState> {
  const locale = localeOf(f);
  const email = field(f, "email").trim().toLowerCase().slice(0, 200);
  if (!EMAIL_RE.test(email)) return { error: "email" };
  const hdr = await headers();
  const ip = (hdr.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64);
  try {
    await requestPasswordReset(db, { email, ip, locale, baseUrl: siteUrl() }, async (m) => {
      const e = resetEmail(m);
      return sendEmail({ to: m.to, subject: e.subject, text: `${e.text}\n${m.url}`, html: renderEmailHtml({ locale: m.locale, title: e.title, paragraphs: [e.text], cta: { label: e.cta, url: m.url } }) });
    });
  } catch (err) {
    console.warn("[password-reset]", (err as Error).message);
  }
  return { done: true };
}

export async function submitNewPassword(_prev: ResetState, f: FormData): Promise<ResetState> {
  const locale = localeOf(f);
  const password = field(f, "password");
  if (password !== field(f, "confirm")) return { error: "password" };
  const r = await resetPassword(db, field(f, "token"), password);
  if (r === "ok") redirect(`/${locale}/login?reset=1`);
  return { error: r };
}
