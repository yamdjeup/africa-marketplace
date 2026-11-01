import { expect, type Page } from "@playwright/test";

// Un clic avant l'hydratation React est écrasé : on vérifie que la sélection tient après une courte pause.
export async function chooseSize(page: Page) {
  const radio = page.locator('input[name="size"]').first();
  const add = page.getByRole("button", { name: /Ajouter au panier|Add to cart/ });
  await expect(async () => {
    await radio.locator("xpath=..").click();
    await page.waitForTimeout(400);
    await expect(radio).toBeChecked({ timeout: 1000 });
    await expect(add).toBeEnabled({ timeout: 1000 });
  }).toPass({ timeout: 20_000 });
}

