import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/[locale]/admin/retours/page.tsx", "utf8");
const choice = readFileSync("src/components/admin/stock-choice.tsx", "utf8");

describe("admin retours : alignement zone remboursement", () => {
  it("formulaire aligné en bas, liste et boutons de même hauteur, bouton manuel cadré", () => {
    expect(page).toMatch(/refundReturnAction\} className="flex flex-wrap items-end gap-2"/);
    expect(choice).toContain("min-h-11 w-56");
    expect(page).toContain('"min-h-11 border-2 border-foreground/60"');
  });
});