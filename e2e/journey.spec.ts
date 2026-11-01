import { expect, test, type Page } from "@playwright/test";
import { chooseSize } from "./helpers";

const unique = Date.now().toString(36);
const email = `qa-${unique}@example.test`;
const password = "motdepasse-qa-123";

async function addFirstProductToCart(page: Page, locale = "fr") {
  await page.goto(`/${locale}/catalogue`);
  await page.locator(`a[href^="/${locale}/produits/"]`).first().click();
  await page.waitForURL(/\/produits\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const size = page.locator('input[name="size"]');
  if ((await size.count()) > 0) await chooseSize(page);
  await page.getByRole("button", { name: /Ajouter au panier|Add to cart/ }).click();
  await expect(page.getByRole("status")).toContainText(/Ajouté au panier|Added to cart/);
}

async function login(page: Page) {
  await page.goto("/fr/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/fr\/account\/orders/);
}

test.describe.serial("Parcours client", () => {
  test("accueil et bascule FR/EN", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/fr$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("L'art et la couture");
    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("African art and tailoring");
    await page.getByRole("link", { name: "Français" }).click();
    await expect(page).toHaveURL(/\/fr$/);
  });

  test("catalogue : recherche, filtres, tri et fiche produit", async ({ page }) => {
    await page.goto("/fr/catalogue");
    const cards = page.locator('a[href^="/fr/produits/"]');
    expect(await cards.count()).toBeGreaterThan(3);

    await page.locator("#header-search").fill("wax");
    await page.locator("#header-search").press("Enter");
    await expect(page).toHaveURL(/q=wax/);
    expect(await cards.count()).toBeGreaterThan(0);

    await page.goto("/fr/catalogue?q=zzzintrouvable");
    await expect(page.getByText("Aucune pièce ne correspond")).toBeVisible();

    await page.goto("/fr/catalogue");
    const category = page.locator("select[name=category]:visible");
    await category.selectOption({ index: 1 });
    await page.getByRole("button", { name: "Appliquer" }).click();
    await expect(page).toHaveURL(/catalogue\?.+/);
    expect(await cards.count()).toBeGreaterThan(0);

    await cards.first().click();
    await expect(page).toHaveURL(/\/fr\/produits\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/fr/produits/inexistant");
    await expect(page.getByText("Page introuvable").first()).toBeVisible();
  });

  test("panier : ajout, quantité, suppression", async ({ page }) => {
    await page.goto("/fr/cart");
    await expect(page.getByText("Votre panier est vide.")).toBeVisible();
    await addFirstProductToCart(page);
    await expect(page.getByRole("link", { name: "Panier (1)" })).toBeVisible();
    await page.getByRole("link", { name: "Voir le panier" }).click();
    await expect(page).toHaveURL(/\/fr\/cart/);
    await page.getByRole("button", { name: "Augmenter la quantité" }).first().click();
    await expect(page.getByRole("link", { name: "Panier (2)" })).toBeVisible();
    await page.getByRole("button", { name: /Retirer/ }).first().click();
    await expect(page.getByText("Votre panier est vide.")).toBeVisible();
  });

  test("inscription : validation puis création de compte", async ({ page }) => {
    await page.goto("/fr/register");
    await page.getByLabel("Nom complet").fill("QA Testeuse");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("court");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page).toHaveURL(/\/register/);

    await page.getByLabel("Mot de passe").fill(password);
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page).toHaveURL(/\/fr\/account$/);
    await expect(page.getByRole("link", { name: "Mon compte" })).toBeVisible();
  });

  test("inscription : e-mail déjà utilisé", async ({ page }) => {
    await page.goto("/fr/register");
    await page.getByLabel("Nom complet").fill("QA Doublon");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Mot de passe").fill(password);
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.locator("p[role=alert]")).toContainText("Un compte existe déjà");
  });

  test("connexion : redirection, mauvais mot de passe, succès, Mes commandes vide", async ({ page }) => {
    await page.goto("/fr/account/orders");
    await expect(page).toHaveURL(/\/fr\/login/);
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.locator("p[role=alert]")).toContainText("incorrect");
    await page.getByLabel("Mot de passe").fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/fr\/account\/orders/);
    await expect(page.getByText("Vous n'avez pas encore de commande.")).toBeVisible();
  });

  test("checkout simulé connecté : commande visible dans Mes commandes (FR/EN)", async ({ page }) => {
    await login(page);
    await addFirstProductToCart(page);
    await page.goto("/fr/checkout");
    await expect(page.getByLabel("E-mail")).toHaveValue(email);
    await page.getByLabel("Adresse").fill("12 rue des Tests");
    await page.getByLabel("Code postal").fill("75001");
    await page.getByLabel("Ville").fill("Paris");
    await page.getByLabel("Pays").fill("France");
    await page.getByRole("button", { name: /Confirmer la commande/ }).click();

    await expect(page).toHaveURL(/\/fr\/checkout\/confirmation\/AM-[A-Z0-9]{8}/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Merci pour votre commande");
    const number = page.url().match(/AM-[A-Z0-9]{8}/)![0];
    await expect(page.getByRole("link", { name: "Panier (0)" })).toBeVisible();

    await page.goto("/fr/account/orders");
    await expect(page.getByText(number)).toBeVisible();
    await page.getByRole("link", { name: "Voir le détail" }).first().click();
    await expect(page.getByText("Confirmée").first()).toBeVisible();

    await page.goto("/en/account/orders");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("My orders");
    await expect(page.getByText(number)).toBeVisible();
  });

  test("checkout invité en anglais", async ({ page }) => {
    await addFirstProductToCart(page, "en");
    await page.goto("/en/checkout");
    await page.getByLabel("Email").fill("invite@example.test");
    await page.getByLabel("Full name").fill("Guest QA");
    await page.getByLabel("Address").fill("1 Test Street");
    await page.getByLabel("Postal code").fill("1000");
    await page.getByLabel("City").fill("Dakar");
    await page.getByLabel("Country").fill("Senegal");
    await page.getByRole("button", { name: /Confirm order/ }).click();
    await expect(page).toHaveURL(/\/en\/checkout\/confirmation\/AM-/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Thank you");
  });

  test("checkout avec panier vide", async ({ page }) => {
    await page.goto("/fr/checkout");
    await expect(page.getByText("Votre panier est vide")).toBeVisible();
  });
});


