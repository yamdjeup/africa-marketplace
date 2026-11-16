import bcrypt from "bcryptjs";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { sessionVersionValid } from "@/lib/session-version";
import { SOCIAL_HASH_PREFIX } from "@/lib/social-providers";

const ACCESS_S = 60 * 60;
const REFRESH_S = 60 * 60 * 24 * 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const secret = () => process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "dev-only-insecure-secret");
const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

type Kind = "access" | "refresh";
type Claims = { sub: string; sv: number; typ: Kind; exp: number };

/** Jeton HS256 signé avec AUTH_SECRET (access 1 h, refresh 30 j) ; sv = sessionVersion du site. */
export function signToken(sub: string, sv: number, typ: Kind, now = Date.now()) {
  const claims: Claims = { sub, sv, typ, exp: Math.floor(now / 1000) + (typ === "access" ? ACCESS_S : REFRESH_S) };
  const body = b64(JSON.stringify(claims));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string, typ: Kind, now = Date.now()): Claims | null {
  if (!secret()) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const c = JSON.parse(Buffer.from(body, "base64url").toString()) as Claims;
    return c.typ === typ && c.exp * 1000 > now && typeof c.sub === "string" ? c : null;
  } catch {
    return null;
  }
}

export function issueTokens(user: { id: string; sessionVersion: number }) {
  return {
    accessToken: signToken(user.id, user.sessionVersion, "access"),
    refreshToken: signToken(user.id, user.sessionVersion, "refresh"),
    expiresInS: ACCESS_S,
  };
}

const publicUser = (u: { id: string; email: string; name: string }) => ({ id: u.id, email: u.email, name: u.name });

/** Utilisateur du jeton « access » (en-tête Authorization: Bearer) ; null si invalide ou session révoquée. */
export async function userFromRequest(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const c = token ? verifyToken(token, "access") : null;
  if (!c) return null;
  const u = await db.user.findUnique({ where: { id: c.sub } });
  return u && sessionVersionValid(c.sv, u.sessionVersion) ? u : null;
}

export async function loginWithPassword(emailIn: string, password: string) {
  const email = emailIn.trim().toLowerCase();
  if (!email || !password) return { error: "required" as const };
  const u = await db.user.findUnique({ where: { email } });
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) return { error: "invalid" as const };
  return { user: publicUser(u), ...issueTokens(u) };
}

export async function registerWithPassword(nameIn: string, emailIn: string, password: string) {
  const name = nameIn.trim().slice(0, 200);
  const email = emailIn.trim().toLowerCase().slice(0, 200);
  if (!name || !email || !password) return { error: "required" as const };
  if (!EMAIL_RE.test(email)) return { error: "email" as const };
  if (password.length < 8 || password.length > 200) return { error: "password" as const };
  if (await db.user.findUnique({ where: { email } })) return { error: "exists" as const };
  const u = await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  return { user: publicUser(u), ...issueTokens(u) };
}

export async function refreshTokens(refreshToken: string) {
  const c = verifyToken(refreshToken, "refresh");
  if (!c) return null;
  const u = await db.user.findUnique({ where: { id: c.sub } });
  if (!u || !sessionVersionValid(c.sv, u.sessionVersion)) return null;
  return { user: publicUser(u), ...issueTokens(u) };
}

export { publicUser };

/** Connexion Google mobile : id_token vérifié auprès de Google, audience limitée à GOOGLE_MOBILE_CLIENT_IDS (liste séparée par des virgules). */
export async function loginWithGoogle(idToken: string, fetcher: typeof fetch = fetch) {
  const allowed = (process.env.GOOGLE_MOBILE_CLIENT_IDS ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  if (!allowed.length) return { error: "unavailable" as const };
  const res = await fetcher(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`).catch(() => null);
  if (!res || !res.ok) return { error: "invalid" as const };
  const info = (await res.json().catch(() => ({}))) as { aud?: string; email?: string; email_verified?: string | boolean; name?: string };
  const email = String(info.email ?? "").trim().toLowerCase();
  if (!info.aud || !allowed.includes(info.aud) || !email || String(info.email_verified) !== "true") return { error: "invalid" as const };
  const u =
    (await db.user.findUnique({ where: { email } })) ??
    (await db.user.create({
      data: { email, name: (info.name ?? "").trim().slice(0, 200) || email.split("@")[0], passwordHash: SOCIAL_HASH_PREFIX + randomBytes(32).toString("hex") },
    }));
  return { user: publicUser(u), ...issueTokens(u) };
}
