import { expect, test } from "@playwright/test";

// Serveur de test avec SITE_ACCESS_PASSWORD défini (voir playwright.config.ts).
const password = "mur-test-jetable";

test.describe("Mur de mot de passe", () => {
  test("redirige vers la page d'accès, noindex, robots.txt public", async ({ page, request }) => {
    await page.goto("/fr/catalogue");
    await expect(page).toHaveURL(/\/acces\?next=%2Ffr%2Fcatalogue/);
    await expect(page.getByRole("heading", { name: "Accès réservé" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toMatch(/Disallow: \//);
  });

  test("bloque images hors exemptions et API sans cookie", async ({ request }) => {
    const image = await request.get("/images/private/inexistante.jpg", { maxRedirects: 0 });
    expect(image.status()).toBe(401);
    expect((await request.get("/images/artworks/inexistante.jpg", { maxRedirects: 0 })).status()).not.toBe(401);
    const api = await request.get("/api/auth/session", { maxRedirects: 0 });
    expect(api.status()).toBe(401);
  });

  test("manifeste PWA et icônes accessibles derrière le mur, images toujours bloquées", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    const m = await res.json();
    expect(m.name).toBe("E póm ta’");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/fr");
    for (const icon of m.icons) {
      const r = await request.get(icon.src, { maxRedirects: 0 });
      expect(r.status()).toBe(200);
      expect(r.headers()["content-type"]).toContain("image/png");
    }
    const apple = await request.get("/icons/apple-touch-icon.png", { maxRedirects: 0 });
    expect(apple.status()).toBe(200);
    expect((await request.get("/images/private/celanie-1.jpg", { maxRedirects: 0 })).status()).toBe(401);
  });

  test("mauvais mot de passe refusé, bon mot de passe accepté", async ({ page, context }) => {
    await page.goto("/acces?lang=en&next=%2Fen%2Fcatalogue");
    await expect(page.getByRole("heading", { name: "Private access" })).toBeVisible();

    await page.getByLabel("Password").fill("mauvais");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page.getByRole("alert")).toHaveText("Incorrect password.");

    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page).toHaveURL(/\/en\/catalogue$/);

    const cookie = (await context.cookies()).find((c) => c.name === "site_access");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.value).not.toContain(password);

    const res = await page.request.get("/fr");
    expect(res.status()).toBe(200);
    expect(res.headers()["x-robots-tag"]).toMatch(/noindex/);
  });

  test("cookie falsifié refusé ; redirection externe neutralisée", async ({ page, context }) => {
    await context.addCookies([{ name: "site_access", value: "v1.9999999999999.deadbeef", url: "http://localhost:3101" }]);
    await page.goto("/fr");
    await expect(page).toHaveURL(/\/acces/);

    await page.goto("/acces");
    await page.locator('input[name="next"]').evaluate((el: HTMLInputElement) => (el.value = "//evil.example"));
    await page.getByLabel("Mot de passe").fill(password);
    await page.getByRole("button", { name: "Entrer" }).click();
    await expect(page).toHaveURL(/localhost:3101\/fr$/);
  });
});
