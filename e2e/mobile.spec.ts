import { expect, test } from "@playwright/test";
import { chooseSize } from "./helpers";

const pages = ["/fr", "/fr/catalogue", "/fr/cart", "/fr/login", "/fr/register", "/fr/checkout"];

test.describe("Viewport mobile", () => {
  for (const path of pages) {
    test(`pas de défilement horizontal : ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("parcours d'achat mobile : fiche, ajout panier, formulaire checkout", async ({ page }) => {
    await page.goto("/fr/catalogue");
    await page.locator('a[href^="/fr/produits/"]').first().click();
  await page.waitForURL(/\/produits\//);
    const size = page.locator('input[name="size"]');
    if ((await size.count()) > 0) await chooseSize(page);
    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(page.getByRole("status")).toContainText("Ajouté au panier");
    await page.goto("/fr/checkout");
    const submit = page.getByRole("button", { name: /Confirmer la commande/ });
    await expect(submit).toBeVisible();
    const box = await submit.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test("bascule de langue en mobile", async ({ page }) => {
    await page.goto("/fr");
    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en$/);
  });
});

