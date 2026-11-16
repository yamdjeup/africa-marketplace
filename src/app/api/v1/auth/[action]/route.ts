import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { siteUrl } from "@/lib/alerts-core";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { renderEmailHtml } from "@/lib/email-layout";
import { loginWithGoogle, loginWithPassword, publicUser, refreshTokens, registerWithPassword, userFromRequest } from "@/lib/mobile-auth";
import { requestPasswordReset, resetEmail } from "@/lib/password-reset";
import { isSocialAccount } from "@/lib/social-providers";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (v: unknown, max = 200) => String(v ?? "").slice(0, max);
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function GET(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const action = (await ctx.params).action;
  if (action === "profile") {
    const p = await userFromRequest(req);
    return p ? NextResponse.json({ name: p.name, email: p.email, social: isSocialAccount(p.passwordHash), memberSince: p.createdAt.toISOString() }) : fail("unauthorized", 401);
  }
  if (action !== "me") return fail("not_found", 404);
  const u = await userFromRequest(req);
  return u ? NextResponse.json({ user: publicUser(u) }) : fail("unauthorized", 401);
}

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Détails et sécurité : mêmes règles que updateProfile du site (account/actions.ts).
  if (action === "profile") {
    const u = await userFromRequest(req);
    if (!u) return fail("unauthorized", 401);
    const name = s(b.name).trim();
    if (!name) return fail("required", 400);
    const newPassword = String(b.newPassword ?? "");
    const data: { name: string; passwordHash?: string } = { name };
    if (newPassword) {
      if (newPassword.length < 8 || newPassword.length > 200) return fail("password", 400);
      if (!(await bcrypt.compare(String(b.currentPassword ?? ""), u.passwordHash))) return fail("current", 400);
      data.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    await db.user.update({ where: { id: u.id }, data });
    return NextResponse.json({ ok: true, name });
  }  if (action === "login") {
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
      return NextResponse.json({ ok: true, status: r.status, email });
    } catch {
      return NextResponse.json({ ok: true, status: "sent", email });
    }
  }
  return fail("not_found", 404);
}
