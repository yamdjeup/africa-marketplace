import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/supplier-email", () => ({ safeSend: vi.fn() }));

import { adminCounts, applicationsWhere, dateRange, has, ledgerWhere, pageArgs, pageCount, parseList, partnerCounts, partnerLedgerWhere, partnerSubOrdersWhere, returnsWhere, subOrdersWhere } from "@/lib/admin-list";
import { buildReturnEmail } from "@/lib/return-email";

const ST = ["todo", "open", "all"] as const;
const parse = (sp: Record<string, string>) => parseList(sp, ST, "todo", ["createdAt"], "createdAt");

describe("listes admin : paramètres d'URL", () => {
  it("statut inconnu → défaut « à traiter » ; page invalide → 1", () => {
    expect(parse({ st: "hack" }).st).toBe("todo");
    expect(parse({ st: "all" }).st).toBe("all");
    expect(parse({ p: "-4" }).page).toBe(1);
    expect(parse({ p: "abc" }).page).toBe(1);
    expect(parse({ p: "3" }).page).toBe(3);
  });
  it("dates invalides ignorées, plage inversée corrigée", () => {
    expect(parse({ from: "2026-13-99" }).from).toBeNull();
    const q = parse({ from: "2026-11-10", to: "2026-11-01" });
    expect(q.from!.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(dateRange(q)!.lt!.toISOString()).toBe("2026-11-11T00:00:00.000Z");
  });
  it("recherche tronquée à 80 caractères, tri asc/desc", () => {
    expect(parse({ q: "x".repeat(200) }).q).toHaveLength(80);
    expect(parse({ dir: "asc" }).asc).toBe(true);
    expect(parse({}).asc).toBe(false);
  });
});

describe("listes admin : pagination 25 par page", () => {
  it("skip/take et nombre de pages", () => {
    expect(pageArgs(1)).toEqual({ skip: 0, take: 25 });
    expect(pageArgs(3)).toEqual({ skip: 50, take: 25 });
    expect(pageCount(0)).toBe(1);
    expect(pageCount(25)).toBe(1);
    expect(pageCount(26)).toBe(2);
    expect(pageCount(1000)).toBe(40);
  });
});

describe("listes admin : filtres", () => {
  it("commandes « à traiter » = colis en cours ou remboursement à reprendre", () => {
    const w = JSON.stringify(subOrdersWhere(parse({})));
    expect(w).toContain("PREPARING");
    expect(w).toContain("MANUAL");
    expect(subOrdersWhere(parse({ st: "all" }))).toEqual({});
  });
  it("recherche : n° de commande, client et partenaire", () => {
    const w = JSON.stringify(subOrdersWhere(parse({ st: "all", q: "AM-1" }), ["s1"]));
    expect(w).toContain("number");
    expect(w).toContain("fullName");
    expect(w).toContain("s1");
  });
  it("retours et candidatures : statut + période", () => {
    const q = parseList({ st: "REQUESTED", from: "2026-11-01" }, ["REQUESTED", "all"], "REQUESTED", ["createdAt"], "createdAt");
    expect(JSON.stringify(returnsWhere(q))).toContain("REQUESTED");
    expect(JSON.stringify(returnsWhere(q))).toContain("gte");
    expect(applicationsWhere({ ...q, st: "all", q: "", from: null })).toEqual({});
  });
  it("versements : à payer / en attente selon availableAt", () => {
    const now = new Date("2026-11-10T00:00:00Z");
    expect((ledgerWhere("topay", now) as { availableAt?: unknown }).availableAt).toEqual({ lte: now });
    expect((ledgerWhere("pending", now) as { availableAt?: unknown }).availableAt).toEqual({ gt: now });
    expect(ledgerWhere("all", now)).toEqual({ payoutId: null, reversedAt: null });
  });
  it("espace partenaire : toujours limité au partenaire connecté", () => {
    expect(JSON.stringify(partnerSubOrdersWhere(parse({ st: "all" }), "sup1"))).toContain("sup1");
    expect(JSON.stringify(partnerSubOrdersWhere(parseList({ st: "todo" }, ["todo"], "todo", ["createdAt"], "createdAt"), "sup1"))).toContain("PREPARING");
    expect(JSON.stringify(partnerLedgerWhere(parse({}), "sup1", new Date(), ["a"]))).toContain("sup1");
  });
  it("insensible à la casse seulement sous Postgres", () => {
    const prev = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://x";
    expect(has("a")).toEqual({ contains: "a", mode: "insensitive" });
    process.env.DATABASE_URL = "file:dev.db";
    expect(has("a")).toEqual({ contains: "a" });
    process.env.DATABASE_URL = prev;
  });
});

describe("pastilles de compteur", () => {
  it("admin : 5 comptages sans lecture de lignes", async () => {
    const db = {
      supplierApplication: { count: vi.fn().mockResolvedValue(2) },
      product: { count: vi.fn().mockResolvedValue(3) },
      subOrder: { count: vi.fn().mockResolvedValue(1) },
      returnRequest: { count: vi.fn().mockResolvedValue(4) },
      ledgerEntry: { groupBy: vi.fn().mockResolvedValue([{ supplierId: "a" }, { supplierId: "b" }]) },
    };
    expect(await adminCounts(db as never)).toEqual({ applications: 2, creations: 3, orders: 1, returns: 4, payouts: 2 });
    expect(db.product.count).toHaveBeenCalledWith({ where: { status: "SUBMITTED" } });
  });
  it("partenaire : colis à accepter/expédier et créations refusées", async () => {
    const db = { subOrder: { count: vi.fn().mockResolvedValue(5) }, product: { count: vi.fn().mockResolvedValue(1) } };
    expect(await partnerCounts(db as never, "s1")).toEqual({ orders: 5, works: 1 });
  });
});

describe("e-mails de retour : gabarit commun", () => {
  const base = { subNumber: "AM-1-1", orderNumber: "AM-1", amountCents: 200000, items: [{ name: "Portrait", quantity: 1, unitPriceCents: 200000, image: "/images/artworks/a.jpg" }] };
  for (const kind of ["requested", "accepted", "refused", "refunded"] as const) {
    for (const locale of ["fr", "en"] as const) {
      it(`${kind} ${locale} : HTML, image absolue, aucune mention interdite`, () => {
        const m = buildReturnEmail({ ...base, kind, locale, note: "Motif test" });
        expect(m.html).toContain("E PÓM TA");
        expect(m.html).toContain("text-transform:uppercase");
        expect(m.html).toMatch(/src="https?:\/\/[^"]+\/images\/artworks\/a\.jpg"/);
        expect(`${m.subject} ${m.lines.join(" ")} ${m.html}`).not.toMatch(/démo|fictif|simulé|provisoire|Farfetch|Offerte|Free shipping|\bdemo\b/i);
      });
    }
  }
  it("refusé : le motif est affiché ; remboursé : montant en €", () => {
    expect(buildReturnEmail({ ...base, kind: "refused", locale: "fr", note: "Hors délai" }).html).toContain("Hors délai");
    expect(buildReturnEmail({ ...base, kind: "refunded", locale: "fr" }).html).toMatch(/2\D000,00\D€/);
  });
});
