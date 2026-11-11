import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { eur } from "@/lib/order-notify";
const n = (s: string) => s.replace(/\u00a0|\u202f/g, " ");
describe("montants e-mails", () => {
  it("EN : €55.00", () => { expect(eur(5500, false)).toBe("€55.00"); });
  it("FR : 55,00 €", () => { expect(n(eur(5500, true))).toBe("55,00 €"); });
});
