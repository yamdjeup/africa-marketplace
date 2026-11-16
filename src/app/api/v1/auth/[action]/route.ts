import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/alerts-core";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { renderEmailHtml } from "@/lib/email-layout";
import { loginWithGoogle, loginWithPassword, publicUser, refreshTokens, registerWithPassword, userFromRequest } from "@/lib/mobile-auth";
import { requestPasswordReset, resetEmail } from "@/lib/password-reset";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (v: unknown, max = 200) => String(v ?? "").slice(0, max);
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function GET(req: Request, ctx: { params: Promise<{ action: string }> }) {
  if ((await ctx.params).action !== "me") return fail("not_found", 404);
  const u = await userFromRequest(req);
  return u ? NextResponse.json({ user: publicUser(u) }) : fail("unauthorized", 401);
}

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (action === "login") {
    const r = await loginWithPassword(s(b.email), s(b.password));
    return "error" in r && r.error ? fail(r.error, r.error === "invalid" ? 401 : 400) : NextResponse.json(r);
  }
  if (action === "register") {
    const r = await registerWithPassword(s(b.name), s(b.email), s(b.password));
    return "error" in r && r.error ? fail(r.error, r.error === "exists" ? 409 : 400) : NextResponse.json(r, { status: 201 });
  }
  if (action === "google") {
    const r = await loginWithGoogle(s(b.idToken, 4000));
    return "error" in r && r.error ? fail(r.error, r.error === "unavailable" ? 503 : 401) : NextResponse.json(r);
  }
  if (action === "refresh") {
    const r = await refreshTokens(s(b.refreshToken, 2000));
    return r ? NextResponse.json(r) : fail("unauthorized", 401);
  }
  if (action === "forgot") {
    const email = s(b.email).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return fail("email", 400);
    const locale = b.locale === "en" ? "en" : "fr";
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64);
    try {
      const r = await requestPasswordReset(db, { email, ip, locale, baseUrl: siteUrl() }, async (m) => {
        const e = resetEmail(m);
        return sendEmail({ to: m.to, subject: e.subject, text: `${e.text}\n${m.url}`, html: renderEmailHtml({ locale: m.locale, title: e.title, paragraphs: [e.text], cta: { label: e.cta, url: m.url } }) });
      });
      if (r.status === "limited") return fail("limited", 429);
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ ok: true });
    }
  }
  return fail("not_found", 404);
}
