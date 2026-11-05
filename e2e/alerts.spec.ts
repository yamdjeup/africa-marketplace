import { test, expect } from "@playwright/test";
import { buildAlertEmail, detectAlert, unsubToken, verifyUnsubToken } from "../src/lib/alerts-core";

test("détection : baisse de prix, dernière pièce, retour en stock, rien", () => {
  expect(detectAlert({ priceCents: 10000, stock: 3 }, { priceCents: 8000, stock: 3 })).toBe("price");
  expect(detectAlert({ priceCents: 10000, stock: 3 }, { priceCents: 10000, stock: 1 })).toBe("last");
  expect(detectAlert({ priceCents: 10000, stock: 0 }, { priceCents: 10000, stock: 2 })).toBe("restock");
  expect(detectAlert({ priceCents: 10000, stock: 3 }, { priceCents: 12000, stock: 3 })).toBeNull();
  expect(detectAlert({ priceCents: 10000, stock: 1 }, { priceCents: 10000, stock: 1 })).toBeNull();
});

test("jeton de désinscription signé, lien dans l'e-mail", () => {
  const t = unsubToken("user1");
  expect(verifyUnsubToken("user1", t)).toBe(true);
  expect(verifyUnsubToken("user2", t)).toBe(false);
  expect(verifyUnsubToken("user1", "x")).toBe(false);
  const m = buildAlertEmail({ kind: "favorites", locale: "fr", userId: "user1", items: [{ slug: "a", name: "Pièce <1>", creatorName: "KeNoF", priceCents: 5000, kind: "price" }] });
  expect(m.text).toContain(`t=${t}`);
  expect(m.text).toContain("baisse de prix");
  expect(m.html).toContain("Pièce &lt;1&gt;");
  expect(m.headers["List-Unsubscribe"]).toContain("/api/alerts/unsubscribe");
});

test("API : alertes protégées, favoris/prefs refusés aux visiteurs, désinscription invalide", async ({ request }) => {
  expect((await request.get("/api/alerts/run")).status()).toBe(401);
  expect((await request.get("/api/favorites")).status()).toBe(401);
  expect((await request.get("/api/alerts/prefs")).status()).toBe(401);
  expect((await request.post("/api/alerts/test")).status()).toBe(401);
  const r = await request.get("/api/alerts/unsubscribe?u=x&t=bad", { maxRedirects: 0 });
  expect(r.status()).toBe(303);
  expect(r.headers().location).toContain("ok=0");
});
