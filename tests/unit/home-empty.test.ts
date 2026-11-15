import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/catalog", () => ({
  getFeaturedProducts: async () => [],
  getCategoryShowcase: async () => [],
  getCreators: async () => [],
  getHeroProduct: async () => null,
}));

describe("accueil avec catalogue vide", () => {
  it.each(["fr", "en"] as const)("se rend sans erreur (%s)", async (locale) => {
    const { default: HomePage } = await import("@/app/[locale]/page");
    const el = await HomePage({ params: Promise.resolve({ locale }) });
    const html = renderToStaticMarkup(el);
    expect(html).toContain("<h1");
    expect(html).not.toContain("/produits/undefined");
  });
});
