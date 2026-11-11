import { describe, expect, it } from "vitest";
import { resetHref } from "@/components/admin/list-controls";
describe("réinitialiser", () => {
  it("garde l'onglet non défaut, efface le reste", () => { expect(resetHref("/fr/admin/retours", "DONE", "REQUESTED")).toBe("/fr/admin/retours?st=DONE"); });
  it("statut par défaut : URL nue", () => { expect(resetHref("/fr/admin/retours", "REQUESTED", "REQUESTED")).toBe("/fr/admin/retours"); });
});
