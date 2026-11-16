import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../scripts/test-env";

// Auth mobile /api/v1/auth/* (base jetable TEST_DATABASE_URL, jamais la production).
const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("API mobile auth (base de test)", () => {
  let db: PrismaClient;
  let email: string;
  const base = "https://example.test/api/v1/auth";
  const call = async (action: string, body?: unknown, headers: Record<string, string> = {}) => {
    const mod = await import("@/app/api/v1/auth/[action]/route");
    const ctx = { params: Promise.resolve({ action }) };
    return body === undefined
      ? mod.GET(new Request(`${base}/${action}`, { headers }), ctx)
      : mod.POST(new Request(`${base}/${action}`, { method: "POST", body: JSON.stringify(body), headers }), ctx);
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = requireTestDatabaseUrl();
    ({ db } = await import("@/lib/db"));
    email = `mob-${Date.now().toString(36)}@test.invalid`;
  });
  afterAll(async () => {
    if (db) await db.user.deleteMany({ where: { email } });
  });

  it("inscription, doublon, connexion, /me et refresh", async () => {
    const reg = await call("register", { name: "Awa", email, password: "motdepasse1" });
    expect(reg.status).toBe(201);
    expect((await call("register", { name: "Awa", email, password: "motdepasse1" })).status).toBe(409);
    expect((await call("register", { name: "A", email: "x", password: "motdepasse1" })).status).toBe(400);
    expect((await call("login", { email, password: "faux" })).status).toBe(401);
    const login = await (await call("login", { email, password: "motdepasse1" })).json();
    const me = await call("me", undefined, { authorization: `Bearer ${login.accessToken}` });
    expect((await me.json()).user.email).toBe(email);
    expect((await call("me")).status).toBe(401);
    expect((await call("me", undefined, { authorization: `Bearer ${login.refreshToken}` })).status).toBe(401);
    expect((await call("refresh", { refreshToken: login.refreshToken })).status).toBe(200);
    await db.user.update({ where: { email }, data: { sessionVersion: { increment: 1 } } });
    expect((await call("refresh", { refreshToken: login.refreshToken })).status).toBe(401);
  });
});
