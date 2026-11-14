import { describe, expect, it, vi } from "vitest";
import { encode } from "next-auth/jwt";

const versions: Record<string, number> = { u1: 2 };
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: async ({ where }: { where: { id: string } }) => (where.id in versions ? { sessionVersion: versions[where.id] } : null) } },
}));

vi.mock("next/server", async () => await import("next/server.js"));
let cookieHeader = "";
vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: cookieHeader, host: "localhost", "x-forwarded-proto": "http" }) }));
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret";

async function rscSessionFor(token: Record<string, unknown>) {
  const { auth } = await import("@/auth");
  const salt = "authjs.session-token";
  const jwt = await encode({ token: { sub: "u1", email: "a@test.example", ...token }, secret: process.env.AUTH_SECRET!, salt });
  cookieHeader = `${salt}=${jwt}`;
  return auth();
}

async function sessionFor(token: Record<string, unknown>) {
  const { handlers } = await import("@/auth");
  const salt = "authjs.session-token";
  const jwt = await encode({ token: { sub: "u1", email: "a@test.example", ...token }, secret: process.env.AUTH_SECRET!, salt });
  const req = new Request("http://localhost/api/auth/session", { headers: { cookie: `${salt}=${jwt}` } });
  const res = await handlers.GET(req as never);
  return res.json();
}

describe("session Auth.js réelle (db simulée)", () => {
  it("refuse un jeton dont sv est périmé ou absent", async () => {
    expect(await sessionFor({ sv: 1 })).toBeNull();
    expect(await sessionFor({})).toBeNull();
  });
  it("auth() côté serveur (pages) : jeton périmé ou sans sv = pas de session", async () => {
    expect((await rscSessionFor({ sv: 1 }))?.user?.id).toBeUndefined();
    expect((await rscSessionFor({}))?.user?.id).toBeUndefined();
    expect((await rscSessionFor({ sv: 2 }))?.user?.id).toBe("u1");
  });
  it("accepte un jeton à jour", async () => {
    expect((await sessionFor({ sv: 2 }))?.user?.id).toBe("u1");
  });
});
