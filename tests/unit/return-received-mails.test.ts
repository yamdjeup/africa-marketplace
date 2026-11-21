import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const safeSend = vi.fn(async () => {});
const sub = { id: "s1", number: "AM-1-1", supplierId: "sup", subtotalCents: 1000, order: { email: "client@example.test", number: "AM-1", locale: "fr", fullName: "Cli Ent" } };
vi.mock("@/lib/db", () => ({
  db: {
    subOrder: { findUnique: vi.fn(async () => sub) },
    supplier: { findUnique: vi.fn(async () => ({ id: "sup", displayName: "Mimi", address: "", userId: "u1", email: "mimi@example.test" })) },
    user: { findUnique: vi.fn(async () => ({ email: "mimi@example.test" })) },
    supplierApplication: { findFirst: vi.fn(async () => null) },
    returnRequest: { findFirst: vi.fn(async () => ({ reason: "x", returnCarrier: "DHL", returnTracking: "T1", partnerReasonId: null })) },
    orderItem: { findMany: vi.fn(async () => []) },
    product: { findMany: vi.fn(async () => []) },
  },
}));
vi.mock("@/lib/supplier-email", () => ({ safeSend }));
vi.mock("@/lib/partner-recipient", () => ({ partnerRecipient: () => "mimi@example.test" }));

describe("notifyReturnReceived", () => {
  it("prévient le client ET le créateur, une fois chacun", async () => {
    const { notifyReturnReceived } = await import("../../src/lib/return-email");
    await notifyReturnReceived("s1");
    const to = safeSend.mock.calls.map((c) => (c as unknown[])[0]);
    expect(to).toEqual(["client@example.test", "mimi@example.test"]);
    expect(JSON.stringify(safeSend.mock.calls[1])).toContain("contrôle de conformité");
  });
});
