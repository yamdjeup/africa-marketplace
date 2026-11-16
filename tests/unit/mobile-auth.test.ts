import { describe, expect, it, vi } from "vitest";
import { loginWithGoogle, signToken, verifyToken } from "@/lib/mobile-auth";

describe("connexion Google mobile", () => {
  const ok = (body: object) => (async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;
  it("indisponible sans GOOGLE_MOBILE_CLIENT_IDS ; refuse une audience inconnue ou un e-mail non vérifié", async () => {
    vi.stubEnv("GOOGLE_MOBILE_CLIENT_IDS", "");
    expect(await loginWithGoogle("t", ok({}))).toEqual({ error: "unavailable" });
    vi.stubEnv("GOOGLE_MOBILE_CLIENT_IDS", "a.apps,b.apps");
    expect(await loginWithGoogle("t", ok({ aud: "evil", email: "x@y.fr", email_verified: "true" }))).toEqual({ error: "invalid" });
    expect(await loginWithGoogle("t", ok({ aud: "a.apps", email: "x@y.fr", email_verified: "false" }))).toEqual({ error: "invalid" });
    expect(await loginWithGoogle("t", (async () => new Response("{}", { status: 400 })) as unknown as typeof fetch)).toEqual({ error: "invalid" });
    vi.unstubAllEnvs();
  });
});

describe("jetons mobile (HS256)", () => {
  it("accepte un jeton valide du bon type", () => {
    const t = signToken("u1", 2, "access");
    expect(verifyToken(t, "access")?.sub).toBe("u1");
    expect(verifyToken(t, "refresh")).toBeNull();
  });
  it("refuse un jeton expiré ou altéré", () => {
    const old = signToken("u1", 0, "access", Date.now() - 2 * 3600 * 1000);
    expect(verifyToken(old, "access")).toBeNull();
    const t = signToken("u1", 0, "access");
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "u2", sv: 0, typ: "access", exp: 9999999999 })).toString("base64url");
    expect(verifyToken(`${forged}.${sig}`, "access")).toBeNull();
    expect(verifyToken(`${body}.x`, "access")).toBeNull();
  });
});
