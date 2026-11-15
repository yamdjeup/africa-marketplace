import { describe, expect, it } from "vitest";
import { exampleCreators, exampleProducts } from "@/data/examples";

const FORBIDDEN = /exemple|example|démo|demo|fictif|fictive|fictional|simulé|\btest\b/i;

describe("catalogue historique : aucune mention d'exemple ou de démonstration visible", () => {
  it("textes des pièces et créateurs", () => {
    const texts = [...exampleProducts, ...exampleCreators].map((x) => {
      const o = { ...(x as Record<string, unknown>) };
      delete o.slug;
      delete o.image;
      delete o.images;
      return JSON.stringify(o);
    });
    for (const t of texts) expect(t).not.toMatch(FORBIDDEN);
  });
});
