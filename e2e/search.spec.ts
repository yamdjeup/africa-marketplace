import { expect, test } from "@playwright/test";

// La recherche texte couvre pays, technique, matière, catégorie et pays de l'artiste (FR + EN, sans accents).
for (const [q, locale] of [["Cameroun", "fr"], ["Cameroon", "en"], ["cameroun", "en"]] as const) {
  test(`recherche « ${q} » (${locale}) renvoie les artistes camerounais`, async ({ request }) => {
    const html = await (await request.get(`/${locale}/catalogue?q=${q}`)).text();
    for (const name of ["KeNoF", "Morère"]) expect(html).toContain(name);
  });
}

test("recherche « sculpture » renvoie la catégorie", async ({ request }) => {
  const html = await (await request.get("/fr/catalogue?q=sculpture")).text();
  expect(html).toContain("Morère");
});
