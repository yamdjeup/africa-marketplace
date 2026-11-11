import { describe, expect, it } from "vitest";
import { TODO_WHERE, partnerSubOrdersWhere, parseList } from "@/lib/admin-list";
type Row = { status: string; refundStatus: string; pi: string | null };
// Évalue TODO_WHERE sur une ligne simulée.
const isTodo = (r: Row) => { const [a, b] = TODO_WHERE.OR as [{ status: { in: string[] } }, { refundStatus: { in: string[] } }]; return a.status.in.includes(r.status) || (b.refundStatus.in.includes(r.refundStatus) && r.pi !== null); };
describe("règle à traiter", () => {
  it("expirée sans paiement : pas à traiter", () => { expect(isTodo({ status: "EXPIRED", refundStatus: "MANUAL", pi: null })).toBe(false); });
  it("expirée + remboursement FAILED avec paiement : à traiter", () => { expect(isTodo({ status: "EXPIRED", refundStatus: "FAILED", pi: "pi_1" })).toBe(true); });
  it("colis en attente : à traiter ; livré : non", () => { expect(isTodo({ status: "PENDING", refundStatus: "NONE", pi: null })).toBe(true); expect(isTodo({ status: "DELIVERED", refundStatus: "NONE", pi: "pi_1" })).toBe(false); });
  it("espace partenaire : jamais EXPIRED dans à traiter", () => { const q = parseList({ st: "todo" }, ["todo"], "todo", ["createdAt"], "createdAt"); expect(JSON.stringify(partnerSubOrdersWhere(q, "s1"))).not.toContain("EXPIRED"); });
});
