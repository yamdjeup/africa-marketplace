import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
const send = vi.fn(async () => true);
vi.mock("@/lib/supplier-email", () => ({ safeSend: (...a: unknown[]) => (send as unknown as (...x: unknown[]) => unknown)(...a) }));
vi.mock("@/lib/checkout-hold", () => ({ releaseExpiredHolds: async () => undefined }));
vi.mock("@/lib/suborders", () => ({ sweepSubOrders: async () => ({ reminded: [], escalated: [], expired: [] }) }));
vi.mock("@/lib/refund", () => ({ settleSubRefund: async () => undefined }));

let locale = "fr";
let reasonId: string | null = null;
let fullName = "Awa";
vi.mock("@/lib/db", () => ({
  db: {
    subOrder: {
      findUnique: async () => ({ id: "s1", number: "AM-X-1", orderId: "o1", supplierId: "p1", subtotalCents: 5000, carrier: null, trackingNumber: null, reason: null, reasonId, refundStatus: null, order: { id: "o1", number: "AM-X", locale, email: "a@b.fr", get fullName() { return fullName; }, userId: "u1", editToken: null } }),
      findMany: async () => [{ id: "s1" }],
    },
    supplier: { findUnique: async () => ({ id: "p1", displayName: "Atelier Kora", country: "Sénégal", userId: null }) },
    user: { findUnique: async () => null },
    orderItem: { findMany: async () => [{ quantity: 1, name: "Bague", size: null, productSlug: "bague", unitPriceCents: 5000 }] },
    product: { findMany: async () => [] },
    refusalReason: { findUnique: async () => ({ fr: "x", en: "y", mailFr: "L'article n'est plus disponible à la vente.", mailEn: "The item is no longer available for sale." }) },
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
    expect(subject).toMatch(/^Votre commande \S+ est en préparation$/);
    expect(lines.join(" ")).toContain("Atelier Kora");
    expect(lines.join(" ")).toContain("1 × Bague");
    expect(html).toContain("en préparation");
    expect(html).toContain("Suivre ma commande");
  });

  it("EN : version anglaise", async () => {
    locale = "en";
    await notifySubOrder("PREPARING", "s1");
    const [, subject, , html] = send.mock.calls[0] as unknown as [string, string, string[], string];
    expect(subject).toContain("being prepared");
    expect(html).toContain("prepared");
    expect(html).toContain("Track my order");
  });
});

describe("e-mail client « commande refusée » : structure en paragraphes", () => {
  beforeEach(() => { send.mockClear(); reasonId = "r1"; vi.stubEnv("PAYMENT_CAPTURE_ON_CONFIRM", "1"); });
  for (const [loc, intro, motif, last] of [
    ["fr", "ne peut pas être honorée.", "Motif : L'article n'est plus disponible à la vente.", "Aucun montant"],
    ["en", "cannot be fulfilled.", "Reason: The item is no longer available for sale.", "No amount"],
  ] as const) {
    it(`${loc} : bonjour / refus / motif / prélèvement, un paragraphe chacun`, async () => {
      locale = loc;
      await notifySubOrder("REFUSED", "s1");
      const [, , lines, html] = send.mock.calls[0] as unknown as [string, string, string[], string];
      expect(lines.slice(0, 4)).toEqual([expect.stringMatching(/^(Bonjour|Hello) Awa,$/), expect.stringContaining(intro), motif, expect.stringContaining(last)]);
      expect(lines[1]).not.toContain(motif);
      expect(lines.slice(0, 4).join(" ")).not.toContain("Atelier Kora");
      for (const p of [intro, motif, last]) expect(html).toContain(p);
    });
  }
});

describe("e-mail client « commande expirée » et salutation sans prénom", () => {
  beforeEach(() => { send.mockClear(); reasonId = null; fullName = "Awa"; vi.stubEnv("PAYMENT_CAPTURE_ON_CONFIRM", "1"); });
  it("fr : paragraphes séparés, délai dynamique, sans nom du créateur", async () => {
    locale = "fr";
    await notifySubOrder("EXPIRED", "s1");
    const [, , lines, html] = send.mock.calls[0] as unknown as [string, string, string[], string];
    expect(lines[1]).toMatch(/^Nous sommes désolés de vous informer que votre commande a été automatiquement annulée, car le créateur ne l'a pas confirmée dans le délai imparti de \d+ heures\.$/);
    expect(lines[2]).toMatch(/^Aucun montant/);
    expect(lines.slice(0, 3).join(" ")).not.toContain("Atelier Kora");
    expect(html).toContain("automatiquement annulée");
  });
  it("en : version anglaise", async () => {
    locale = "en";
    await notifySubOrder("EXPIRED", "s1");
    const [, , lines] = send.mock.calls[0] as unknown as [string, string, string[], string];
    expect(lines[1]).toMatch(/^We are sorry to inform you that your order has been automatically cancelled, because the creator did not confirm it within the allotted \d+ hours\.$/);
    expect(lines[2]).toMatch(/^No amount/);
  });
  it("salutation sans prénom : « Bonjour, » / « Hello, »", async () => {
    fullName = "";
    locale = "fr";
    await notifySubOrder("REFUSED", "s1");
    expect((send.mock.calls[0] as unknown as [string, string, string[]])[2][0]).toBe("Bonjour,");
    send.mockClear();
    locale = "en";
    await notifySubOrder("REFUSED", "s1");
    expect((send.mock.calls[0] as unknown as [string, string, string[]])[2][0]).toBe("Hello,");
  });
});
