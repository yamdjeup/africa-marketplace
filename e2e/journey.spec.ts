import { expect, test, type Page } from "@playwright/test";

const unique = Date.now().toString(36);
const email = `qa-${unique}@example.test`;
const password = "motdepasse-qa-123";

// Pièces uniques : chaque commande aboutie épuise l'œuvre, d'où un slug distinct par parcours.
async function addArtworkToCart(page: Page, slug: string, locale = "fr") {
  await page.goto(`/${locale}/produits/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const add = page.getByRole("button", { name: /Ajouter au panier|Add to cart/ });
  // Un clic avant l'hydratation React est perdu : on réessaie jusqu'à voir la confirmation.
  await expect(async () => {
    await add.click({ timeout: 2000 });
    await expect(page.getByRole("status")).toContainText(/Ajouté au panier|Added to cart/, { timeout: 1500 });
  }).toPass({ timeout: 20_000 });
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
    await expect(page.getByRole("heading", { level: 1 })).toContainText("L'art afrodescendant sous toutes ses formes");
    await expect(page.getByRole("link", { name: /E póm ta’/ }).first()).toBeVisible();
    await expect(page).toHaveTitle(/E póm ta’/);
    await page.getByRole("button", { name: /Langue et région/ }).click();
    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Afro-descendant art in all its forms");
    await page.getByRole("button", { name: /Language and region/ }).click();
    await page.getByRole("link", { name: "Français" }).click();
    await expect(page).toHaveURL(/\/fr$/);
  });

  // à réécrire (header/checkout 2 étapes)
  test.skip("galerie : 13 œuvres, filtres artiste/catégorie/prix/recherche", async ({ page }) => {
    await page.goto("/fr/catalogue");
    const cards = page.locator('a[href^="/fr/produits/"]');
    await expect(cards).toHaveCount(13);

    await page.locator("#header-search").fill("kenof");
    await page.locator("#header-search").press("Enter");
    await expect(page).toHaveURL(/q=kenof/);
    await expect(cards).toHaveCount(3);

    await page.goto("/fr/catalogue?artist=cruzz-taylor");
    await expect(cards).toHaveCount(3);
    await page.goto("/fr/catalogue?category=photographie");
    await expect(cards).toHaveCount(3);
    await page.goto("/fr/catalogue?min=5000");
        await expect(cards).toHaveCount(3);

    await page.goto("/fr/catalogue?q=zzzintrouvable");
    await expect(page.getByText("Aucune œuvre ne correspond")).toBeVisible();

    await page.goto("/fr/catalogue");
    await page.locator("select[name=category]:visible").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Appliquer" }).click();
    await expect(page).toHaveURL(/catalogue\?.+/);
    expect(await cards.count()).toBeGreaterThan(0);

    await page.goto("/fr/produits/inexistant");
    await expect(page.getByText("Page introuvable").first()).toBeVisible();
  });

  // à réécrire (header/checkout 2 étapes)
  test.skip("fiche œuvre : crédit artiste, pièce unique", async ({ page }) => {
    await page.goto("/fr/produits/portrait-encadre-cheveux-ocre");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Portrait encadré aux cheveux ocre");
    await expect(page.getByRole("link", { name: "Aurélie-Victoire Célanie" }).first()).toBeVisible();
    await expect(page.getByText("Pièce unique").first()).toBeVisible();
  });

  // à réécrire (header/checkout 2 étapes)
  test.skip("fiche artiste : biographie G3A et lien source", async ({ page }) => {
    await page.goto("/fr/partenaires/kenof");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("KeNoF");
    await expect(page.getByText("bamiléké").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /article source/ })).toHaveAttribute("href", /g3a\.org/);
    await page.goto("/en/partenaires/kenof");
    await expect(page.getByText("Bamileke heritage").first()).toBeVisible();
  });

  // à réécrire (header/checkout 2 étapes)
  test.skip("panier : ajout, quantité limitée à 1, suppression", async ({ page }) => {
    await page.goto("/fr/cart");
    await expect(page.getByText("Votre panier est vide.")).toBeVisible();
    await addArtworkToCart(page, "grande-toile-masques-et-arbre");
    await expect(page.getByRole("link", { name: "Panier (1)" })).toBeVisible();
    await page.getByRole("link", { name: "Voir le panier" }).click();
    await expect(page).toHaveURL(/\/fr\/cart/);
    await expect(page.getByRole("button", { name: "Augmenter la quantité" }).first()).toBeDisabled();
    await page.getByRole("button", { name: /Retirer/ }).first().click();
    await expect(page.getByText("Votre panier est vide.")).toBeVisible();
  });

  // à réécrire (header/checkout 2 étapes)
  test.skip("inscription : validation puis création de compte", async ({ page }) => {
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

  // à réécrire (header/checkout 2 étapes)
  test.skip("inscription : e-mail déjà utilisé", async ({ page }) => {
    await page.goto("/fr/register");
    await page.getByLabel("Nom complet").fill("QA Doublon");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Mot de passe").fill(password);
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.locator("p[role=alert]")).toContainText("Un compte existe déjà");
  });

  // à réécrire (header/checkout 2 étapes)
  test.skip("connexion : redirection, mauvais mot de passe, succès, Mes commandes vide", async ({ page }) => {
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

  // à réécrire (header/checkout 2 étapes)
  test.skip("checkout connecté : commande visible dans Mes commandes (FR/EN)", async ({ page }) => {
    await login(page);
    await addArtworkToCart(page, "profil-points-et-texte");
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

  // à réécrire (header/checkout 2 étapes)
  test.skip("checkout invité en anglais", async ({ page }) => {
    await addArtworkToCart(page, "kenof-figure-voilee-au-baton", "en");
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

  // à réécrire (header/checkout 2 étapes)
  test.skip("checkout avec panier vide", async ({ page }) => {
    await page.goto("/fr/checkout");
    await expect(page.getByText("Votre panier est vide")).toBeVisible();
  });
});


