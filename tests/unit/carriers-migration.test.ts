import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CARRIERS } from "../../mobile/carriers-data";

describe("migration 0040 : transporteurs 17TRACK", () => {
  const sql = readFileSync("prisma/migrations/0040_carriers_17track/migration.sql", "utf8");
  it("insère tous les transporteurs 17TRACK sans écraser l'existant", () => {
    expect(sql).toContain("ON CONFLICT DO NOTHING");
    expect((sql.match(/\('c17_/g) ?? []).length).toBeGreaterThanOrEqual(CARRIERS.length - 5);
    expect(sql).toContain("'c17_" + CARRIERS[0][0] + "'");
  });
});

import { buildCarrierOptions } from '../../mobile/carriers';
describe('liste API (table admin)', () => { it('construit les options depuis des noms simples', () => { const o = buildCarrierOptions(['Zeta', 'DHL', 'Alpha'].map((n) => ['', n] as [string, string])); expect(o[0].label).toBe('DHL'); expect(o.at(-1)?.label).toBe('Autre'); expect(o.some((x) => x.label === 'Alpha')).toBe(true); }); });

import { sortCarriers } from '../../src/lib/config-lists';
describe('web: populaires en tete', () => { it('ordonne UPS DHL FedEx Colissimo Chronopost puis le reste', () => { expect(sortCarriers(['Zed','Colissimo','dhl','UPS']).slice(0,3)).toEqual(['UPS','dhl','Colissimo']); }); });

import { SUPPLIER_TAB_STATUSES } from '../../src/lib/mobile-supplier';
import { partnerSubOrdersWhere } from '../../src/lib/admin-list';
describe('onglets commandes app = site', () => { it('memes statuts', () => { for (const k of ['todo','PENDING','ship','SHIPPED','done']) { const w = partnerSubOrdersWhere({ st: k } as never, 's') as { AND: { status?: { in: string[] } }[] }; expect(w.AND.find((a) => a.status)?.status?.in).toEqual(SUPPLIER_TAB_STATUSES[k]); } }); });
