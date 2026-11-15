import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { session: null as unknown, cookie: undefined as string | undefined, own: null as unknown, found: null as unknown };
const findFirst = vi.fn(async () => state.found);

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (state.cookie ? { value: state.cookie } : undefined) }) }));
vi.mock("@/auth", () => ({ auth: async () => state.session }));
vi.mock("@/lib/db", () => ({ db: { supplier: { findUnique: async () => state.own, findFirst } } }));

const partner = { id: "s1", displayName: "Choupi", status: "ACTIVE", isDemo: false, userId: "u9" };

describe("vue admin lecture seule d'un partenaire", () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = "admin@test.tld";
    state.session = { user: { id: "a1", email: "admin@test.tld" } };
    state.cookie = "s1";
    state.own = null;
    state.found = partner;
    findFirst.mockClear();
  });

  it("l'admin ouvre n'importe quel partenaire ACTIF (pas seulement isDemo), en lecture seule", async () => {
    const { getPortalContext } = await import("@/lib/supplier");
    const ctx = await getPortalContext();
    expect(ctx).toEqual({ supplier: partner, viewingAs: true });
    expect(findFirst).toHaveBeenCalledWith({ where: { id: "s1", status: "ACTIVE" } });
  });

  it("un non-admin sans espace propre n'obtient rien", async () => {
    state.session = { user: { id: "c1", email: "client@test.tld" } };
    const { getPortalContext } = await import("@/lib/supplier");
    expect(await getPortalContext()).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("sans cookie ou partenaire non actif : rien", async () => {
    const { getPortalContext } = await import("@/lib/supplier");
    state.found = null;
    expect(await getPortalContext()).toBeNull();
    state.cookie = undefined;
    expect(await getPortalContext()).toBeNull();
  });
});
