import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("mot de passe oublié (base de test)", () => {
  let db: PrismaClient;
  let tag: string;
  let uid: string;
  let socialId: string;
  const mails: { to: string; url: string; social: boolean }[] = [];
  const send = async (m: { to: string; url: string; social: boolean }) => void mails.push(m);
  const tokenOf = (url: string) => new URL(url).searchParams.get("token") ?? "";
  const req = async (email: string, ip: string, now = new Date()) => {
    const { requestPasswordReset } = await import("@/lib/password-reset");
    return requestPasswordReset(db, { email, ip, locale: "fr", baseUrl: "https://example.test" }, send, now);
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    ({ db } = await import("@/lib/db"));
    tag = Date.now().toString(36);
    uid = (await db.user.create({ data: { email: `pw-${tag}@test.example`, name: "Pw", passwordHash: await bcrypt.hash("ancien-mdp-1", 4) } })).id;
    socialId = (await db.user.create({ data: { email: `soc-${tag}@test.example`, name: "Soc", passwordHash: "social:" + "x".repeat(10) } })).id;
  });
  afterAll(async () => {
    if (!db) return;
    await db.passwordResetToken.deleteMany({ where: { userId: { in: [uid, socialId] } } });
    await db.passwordResetAttempt.deleteMany({ where: { key: { contains: tag } } });
    await db.user.deleteMany({ where: { id: { in: [uid, socialId] } } });
  });

  it("e-mail inconnu : statut explicite « unknown », aucun e-mail ni jeton ; compte social : e-mail sans lien de réinitialisation", async () => {
    const n = mails.length;
    expect(await req(`inconnu-${tag}@test.example`, `ip-a-${tag}`)).toEqual({ limited: false, status: "unknown" });
    expect(mails.length).toBe(n);
    await req(`soc-${tag}@test.example`, `ip-b-${tag}`);
    expect(mails.at(-1)?.social).toBe(true);
    expect((await req(`soc-${tag}@test.example`, `ip-b2-${tag}`)).status).toBe("social");
    expect(mails.at(-1)?.url).not.toContain("token=");
  });

  it("réinitialisation : jeton valide 1 h, usage unique, sessionVersion + 1, nouveau mot de passe actif", async () => {
    const { resetPassword, hashToken } = await import("@/lib/password-reset");
    await req(`pw-${tag}@test.example`, `ip-c-${tag}`);
    const token = tokenOf(mails.at(-1)!.url);
    const row = await db.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: hashToken(token) } });
    expect(Math.round((row.expiresAt.getTime() - row.createdAt.getTime()) / 60_000)).toBe(60);
    expect(await resetPassword(db, token, "court")).toBe("password");
    expect(await resetPassword(db, token, "nouveau-mdp-1")).toBe("ok");
    expect(await resetPassword(db, token, "autre-mdp-123")).toBe("invalid");
    const u = await db.user.findUniqueOrThrow({ where: { id: uid } });
    expect(u.sessionVersion).toBe(1);
    expect(await bcrypt.compare("nouveau-mdp-1", u.passwordHash)).toBe(true);
  });

  it("jeton expiré ou inconnu refusé", async () => {
    const { resetPassword } = await import("@/lib/password-reset");
    await req(`pw-${tag}@test.example`, `ip-d-${tag}`);
    const token = tokenOf(mails.at(-1)!.url);
    await db.passwordResetToken.updateMany({ where: { userId: uid, usedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await resetPassword(db, token, "nouveau-mdp-2")).toBe("invalid");
    expect(await resetPassword(db, "inconnu", "nouveau-mdp-2")).toBe("invalid");
  });

  it("limitation : 4e demande en 1 h refusée par e-mail et par IP, reprise après 1 h", async () => {
    const email = `lim-${tag}@test.example`;
    for (let i = 0; i < 3; i++) expect((await req(email, `ip-e${i}-${tag}`)).limited).toBe(false);
    const blocked = await req(email, `ip-f-${tag}`);
    expect(blocked.limited).toBe(true);
    expect(blocked.status).toBe("limited");
    const ip = `ip-g-${tag}`;
    for (let i = 0; i < 3; i++) expect((await req(`x${i}-${tag}@test.example`, ip)).limited).toBe(false);
    expect((await req(`y-${tag}@test.example`, ip)).limited).toBe(true);
    expect((await req(email, `ip-h-${tag}`, new Date(Date.now() + 61 * 60_000))).limited).toBe(false);
  });
});
