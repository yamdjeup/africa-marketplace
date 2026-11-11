import { describe, expect, it } from "vitest";
import { TODO_WHERE, partnerSubOrdersWhere, parseList } from "@/lib/admin-list";
describe("règle à traiter", () => {
  it("exclut les commandes expirées", () => { expect(TODO_WHERE.status).toEqual({ not: "EXPIRED" }); });
  it("espace partenaire : jamais EXPIRED dans à traiter", () => { const q = parseList({ st: "todo" }, ["todo"], "todo", ["createdAt"], "createdAt"); expect(JSON.stringify(partnerSubOrdersWhere(q, "s1"))).not.toContain("EXPIRED"); });
});
