import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const row = { closedMailSentAt: null as Date | null, status: "DELIVERED", refunded: true };
const fakeDb = {
  subOrder: {
    updateMany: vi.fn(async (a: { where: { closedMailSentAt?: null; returns?: unknown }; data: { closedMailSentAt: Date | null } }) => {
      if (a.where.closedMailSentAt === null) {
        if (row.closedMailSentAt !== null || row.status !== "DELIVERED" || (a.where.returns && !row.refunded)) return { count: 0 };
      }
      row.closedMailSentAt = a.data.closedMailSentAt;
      return { count: 1 };
    }),
  },
};
vi.mock("@/lib/db", () => ({ db: fakeDb }));
vi.mock("@/lib/tracking-events", () => ({ pollTracking: vi.fn() }));
vi.mock("@/lib/tracking-provider", () => ({ getTrackingProvider: () => null }));

describe("mail de clôture", () => {
  it("envoi immédiat après remboursement, une seule fois même si rappelé (sweep concurrent)", async () => {
    row.closedMailSentAt = null;
    const { closeMailAfterRefund } = await import("../../src/lib/order-notify");
    const notify = vi.fn(async () => true);
    expect(await closeMailAfterRefund("s1", notify)).toBe(true);
    expect(await closeMailAfterRefund("s1", notify)).toBe(false);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(row.closedMailSentAt).not.toBeNull();
  });

  it("échec d'envoi : la réclamation est levée, le nouvel essai renvoie le mail", async () => {
    row.closedMailSentAt = null;
    const { closeMailAfterRefund } = await import("../../src/lib/order-notify");
    const notify = vi.fn(async () => false);
    expect(await closeMailAfterRefund("s1", notify)).toBe(false);
    expect(row.closedMailSentAt).toBeNull();
    notify.mockResolvedValueOnce(true);
    expect(await closeMailAfterRefund("s1", notify)).toBe(true);
    expect(notify).toHaveBeenCalledTimes(2);
    expect(row.closedMailSentAt).not.toBeNull();
  });
});
