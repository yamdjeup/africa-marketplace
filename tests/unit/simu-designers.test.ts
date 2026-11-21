import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { importSimuDesigners, removeSimuDesigners, type SimuDesigner } from "../../src/lib/simu-designers";

function fakeDb() {
  const rows = new Map<string, Record<string, unknown>>();
  rows.set("real", { slug: "real", simuIllustration: false });
  return {
    rows,
    creator: {
      async upsert({ where, update, create }: { where: { slug: string }; update: Record<string, unknown>; create: Record<string, unknown> }) {
        rows.set(where.slug, rows.has(where.slug) ? { ...rows.get(where.slug), ...update } : create);
      },
      async deleteMany() {
        let count = 0;
        for (const [k, v] of rows) if (v.simuIllustration === true) (rows.delete(k), count++);
        return { count };
      },
    },
  };
}

describe("import créateurs d'illustration simu", () => {
  const list = JSON.parse(readFileSync("prisma/simu-designers.json", "utf8")) as SimuDesigner[];

  it("jeu de données : 150 profils, slugs uniques préfixés simu-, bios FR/EN courtes", () => {
    expect(list).toHaveLength(150);
    expect(new Set(list.map((d) => d.slug)).size).toBe(150);
    expect(list.every((d) => d.slug.startsWith("simu-") && d.bio.length > 20 && d.bioEn.length > 20 && d.bio.length < 400)).toBe(true);
    expect(JSON.stringify(list.map((d) => d.bio))).not.toContain("?");
  });

  it("idempotent : deux imports = aucun doublon, tous marqués simuIllustration", async () => {
    const db = fakeDb();
    await importSimuDesigners(db, list);
    await importSimuDesigners(db, list);
    expect(db.rows.size).toBe(151);
    expect([...db.rows.values()].filter((r) => r.simuIllustration === true)).toHaveLength(150);
  });

  it("--remove ne supprime que les profils d'illustration", async () => {
    const db = fakeDb();
    await importSimuDesigners(db, list);
    expect(await removeSimuDesigners(db)).toBe(150);
    expect([...db.rows.keys()]).toEqual(["real"]);
  });
});
