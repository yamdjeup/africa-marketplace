import { describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://epomta.com");

import { buildOrderEmail } from "@/lib/order-email";
import { absoluteImageUrl, renderEmailHtml } from "@/lib/email-layout";

const BANNED = /démo|fictif|simulé|provisoire|Farfetch|Offerte|Free shipping|\bdemo\b/i;

describe("e-mails transactionnels", () => {
  it("absoluteImageUrl : URL absolue https sans mur d'accès", () => {
    expect(absoluteImageUrl("/api/media/abc")).toBe("https://epomta.com/api/media/abc");
    expect(absoluteImageUrl(["/api/media/abc"])).toBe("https://epomta.com/api/media/abc");
    expect(absoluteImageUrl("https://cdn.example/x.jpg")).toBe("https://cdn.example/x.jpg");
    expect(absoluteImageUrl(undefined)).toBe("");
  });
  for (const locale of ["fr", "en"] as const) {
    it(`confirmation ${locale} : aucune mention interdite, images absolues`, () => {
      const m = buildOrderEmail({
        to: "c@test.example", locale, number: "AM-T1", fullName: "Ada Test",
        items: [{ name: "Robe", quantity: 1, unitPriceCents: 120000, image: absoluteImageUrl("/api/media/abc") }],
        totalCents: 120000,
        shipping: { lines: ["1 rue Test", "75001 Paris"], phone: "" },
      });
      expect(`${m.subject} ${m.text} ${m.html}`).not.toMatch(BANNED);
      const imgs = [...m.html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((x) => x[1]);
      expect(imgs.length).toBeGreaterThan(0);
      for (const src of imgs) expect(src).toMatch(/^https:\/\//);
    });
    it(`mise en page ${locale} : pas de mention interdite`, () => {
      const html = renderEmailHtml({
        locale, title: locale === "fr" ? "Votre commande est en route" : "Your order is on its way", orderNumber: "AM-T1",
        paragraphs: ["Bonjour **Ada**"], cta: { label: "Suivre", url: "https://epomta.com/x" },
        summary: { items: [{ name: "Robe", priceLabel: "1 200,00 €", image: "https://epomta.com/api/media/abc" }], rows: [{ label: "Total", value: "1 200,00 €", bold: true }] },
      });
      expect(html).not.toMatch(BANNED);
    });
  }
});
