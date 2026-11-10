import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";

const BANNED_FR = /démo|fictif|simulé|provisoire|Farfetch|Offerte/i;
const BANNED_EN = /\bdemo\b|fictional|simulated|provisional|Farfetch|Free shipping/i;

test.describe("webhook Stripe", () => {
  const payload = JSON.stringify({ type: "checkout.session.completed", data: { object: { client_reference_id: "AM-INEXISTANT", payment_status: "paid", payment_intent: "pi_test_e2e" } } });
  const sign = (t: number, key = "whsec_e2e_only") => `t=${t},v1=${createHmac("sha256", key).update(`${t}.${payload}`).digest("hex")}`;

  test("signature invalide ou absente : 400", async ({ request }) => {
    const t = Math.floor(Date.now() / 1000);
    expect((await request.post("/api/stripe/webhook", { data: payload, headers: { "stripe-signature": sign(t, "autre") } })).status()).toBe(400);
    expect((await request.post("/api/stripe/webhook", { data: payload })).status()).toBe(400);
  });
  test("signature valide : 200 (commande inconnue ignorée)", async ({ request }) => {
    const res = await request.post("/api/stripe/webhook", { data: payload, headers: { "stripe-signature": sign(Math.floor(Date.now() / 1000)) } });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });
});

test.describe("bandeau cookies et GA4", () => {
  test("aucune requête GA ni cookie _ga avant consentement ; refus sans requête", async ({ page, context }) => {
    const hits: string[] = [];
    page.on("request", (r) => {
      if (/googletagmanager\.com|google-analytics\.com/.test(r.url())) hits.push(r.url());
    });
    await page.goto("/fr");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(1500);
    expect(hits).toEqual([]);
    expect((await context.cookies()).filter((c) => c.name.startsWith("_ga"))).toEqual([]);
    await page.getByRole("button", { name: "Tout refuser" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.waitForTimeout(1000);
    expect(hits).toEqual([]);
    expect((await context.cookies()).filter((c) => c.name.startsWith("_ga"))).toEqual([]);
  });
  test("bandeau en anglais, choix mémorisé après rechargement", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Refuse all" }).click();
    await page.reload();
    await expect(page.getByRole("dialog")).toBeHidden();
  });
  test("accepter charge le script de mesure", async ({ page }) => {
    const gtm = page.waitForRequest((r) => r.url().includes("googletagmanager.com/gtag/js"), { timeout: 10_000 });
    await page.goto("/fr");
    await page.getByRole("button", { name: "Tout accepter" }).click();
    expect((await gtm).url()).toContain("G-E2ETEST123");
  });
});

test.describe("pages d'aide FR/EN", () => {
  for (const slug of ["faq", "terms", "privacy", "returns", "orders", "payment", "cookies"]) {
    for (const [locale, banned] of [["fr", BANNED_FR], ["en", BANNED_EN]] as const) {
      test(`${locale}/support/${slug} : accessible, sans mention interdite`, async ({ page }) => {
        const res = await page.goto(`/${locale}/support/${slug}`);
        expect(res?.status()).toBe(200);
        const text = await page.locator("main").innerText();
        expect(text.length).toBeGreaterThan(200);
        expect(text).not.toMatch(banned);
      });
    }
  }
});

test.describe("accès partenaire / admin", () => {
  for (const path of ["/fr/admin", "/fr/admin/retours", "/fr/fournisseur/commandes", "/fr/account/orders"]) {
    test(`visiteur redirigé : ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).not.toHaveURL(new RegExp(`${path}$`));
    });
  }
});
