import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
const send = vi.fn(async () => true);
vi.mock("@/lib/supplier-email", () => ({ safeSend: (...a: unknown[]) => (send as unknown as (...x: unknown[]) => unknown)(...a) }));
vi.mock("@/lib/checkout-hold", () => ({ releaseExpiredHolds: async () => undefined }));
vi.mock("@/lib/suborders", () => ({ sweepSubOrders: async () => ({ reminded: [], escalated: [], expired: [] }) }));
vi.mock("@/lib/refund", () => ({ settleSubRefund: async () => undefined }));

let locale = "fr";
vi.mock("@/lib/db", () => ({
  db: {
    subOrder: {
      findUnique: async () => ({ id: "s1", number: "AM-X-1", orderId: "o1", supplierId: "p1", subtotalCents: 5000, carrier: null, trackingNumber: null, reason: null, refundStatus: null, order: { id: "o1", number: "AM-X", locale, email: "a@b.fr", fullName: "Awa", userId: "u1", editToken: null } }),
      findMany: async () => [{ id: "s1" }],
    },
    supplier: { findUnique: async () => ({ id: "p1", displayName: "Atelier Kora", country: "Sénégal", userId: null }) },
    user: { findUnique: async () => null },
    orderItem: { findMany: async () => [{ quantity: 1, name: "Bague", size: null, productSlug: "bague", unitPriceCents: 5000 }] },
    product: { findMany: async () => [] },
  },
}));

import { notifySubOrder } from "@/lib/order-notify";

describe("e-mail client « en préparation »", () => {
  beforeEach(() => send.mockClear());

  it("FR : envoyé au client avec boutique, article et lien « Suivre ma commande »", async () => {
    locale = "fr";
    await notifySubOrder("PREPARING", "s1");
    expect(send).toHaveBeenCalledTimes(1);
    const [to, subject, lines, html] = send.mock.calls[0] as unknown as [string, string, string[], string];
    expect(to).toBe("a@b.fr");
    expect(subject).toContain("commande en préparation");
    expect(lines.join(" ")).toContain("Atelier Kora");
    expect(lines.join(" ")).toContain("1 × Bague");
    expect(html).toContain("Votre commande est en préparation");
    expect(html).toContain("Suivre ma commande");
  });

  it("EN : version anglaise", async () => {
    locale = "en";
    await notifySubOrder("PREPARING", "s1");
    const [, subject, , html] = send.mock.calls[0] as unknown as [string, string, string[], string];
    expect(subject).toContain("order being prepared");
    expect(html).toContain("Your order is being prepared");
    expect(html).toContain("Track my order");
  });
});
