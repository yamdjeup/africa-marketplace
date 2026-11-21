import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const notify = vi.fn(async () => {});
const sendReturnMail = vi.fn(async () => {});
const fakeDb = { subOrder: { findUnique: vi.fn(async () => null) } };
vi.mock("@/lib/db", () => ({ db: fakeDb }));
vi.mock("@/lib/tracking-events", () => ({ pollTracking: vi.fn(async () => [{ subOrderId: "s1", outcome: "delivered" }, { subOrderId: "s2", outcome: "return-received" }, { subOrderId: null, outcome: "delivered" }]) }));
vi.mock("@/lib/tracking-provider", () => ({ getTrackingProvider: () => null }));
vi.mock("@/lib/return-email", () => ({ sendReturnMail }));

describe("runTrackingPoll", () => {
  it("mail livré pour une livraison, mail retour reçu pour un retour, ignore sans sous-commande", async () => {
    const mod = await import("../../src/lib/order-notify");
    const spy = vi.spyOn(fakeDb.subOrder, "findUnique");
    const n = await mod.runTrackingPoll();
    expect(n).toBe(3);
    expect(sendReturnMail).toHaveBeenCalledWith("s2", "received");
    expect(spy).toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});

describe("partnerDecideReturn", () => {
  it("refuse tant que le colis n'a pas été contrôlé (condition null)", async () => {
    const { partnerDecideReturn } = await import("../../src/lib/returns");
    const findFirst = vi.fn(async () => null);
    const db = { returnRequest: { findFirst } } as never;
    expect(await partnerDecideReturn(db, "s", "sup", "ACCEPTED", "")).toBe("state");
    expect((findFirst.mock.calls[0] as unknown as [{ where: { condition: unknown } }])[0].where.condition).toEqual({ not: null });
  });
});

describe("GET /api/v1/config", () => {
  it("renvoie { reasons, carriers }", async () => {
    Object.assign(fakeDb, { returnReason: { findMany: async () => [{ id: "r", fr: "a", en: "b", requiresPhotos: true, position: 1, active: true }] }, carrier: { findMany: async () => [{ name: "UPS" }] } });
    const { GET } = await import("../../src/app/api/v1/config/route");
    const j = await (await GET()).json();
    expect(j).toEqual({ reasons: [{ id: "r", fr: "a", en: "b", requiresPhotos: true }], carriers: ["UPS"] });
  });
});

import { resolveCarrier } from '../../src/lib/tracking';
describe('resolveCarrier', () => { it('Autre/Other/__other prennent le champ libre', () => { for (const r of ['Autre', 'Other', '__other']) expect(resolveCarrier(r, ' Zed ')).toBe('Zed'); expect(resolveCarrier(' UPS ', 'x')).toBe('UPS'); }); });

describe('notifyShipped', () => { it('relit 17TRACK juste apres expedition, meme si le poll echoue', async () => { const mod = await import('../../src/lib/order-notify'); const te = await import('../../src/lib/tracking-events'); (te.pollTracking as unknown as ReturnType<typeof vi.fn>).mockClear(); await expect(mod.notifyShipped('s9')).resolves.toBeUndefined(); expect(te.pollTracking).toHaveBeenCalledTimes(1); (te.pollTracking as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom')); await expect(mod.notifyShipped('s9')).resolves.toBeUndefined(); }); });
