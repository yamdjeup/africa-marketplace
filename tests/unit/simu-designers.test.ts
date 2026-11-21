import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { importSimuDesigners, removeSimuDesigners, type SimuDesigner } from "../../src/lib/simu-designers";

function fakeDb() {
  const rows = new Map<string, Record<string, unknown>>();
  rows.set("real", { slug: "real", simuIllustration: false });
  rows.set("simu-mina", { slug: "simu-mina", simuIllustration: true });
  return {
    rows,
    creator: {
      async findUnique({ where }: { where: { slug: string } }) {
        return (rows.get(where.slug) as { simuIllustration: boolean } | undefined) ?? null;
      },
      async update({ where, data }: { where: { slug: string }; data: Record<string, unknown> }) {
        const cur = rows.get(where.slug)!;
        rows.delete(where.slug);
        rows.set(data.slug as string, { ...cur, ...data });
      },
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

  it("jeu de données : 150 profils, slugs uniques sans préfixe, bios FR/EN courtes", () => {
    expect(list).toHaveLength(150);
    expect(new Set(list.map((d) => d.slug)).size).toBe(150);
    expect(list.every((d) => !d.slug.startsWith("simu-") && d.bio.length > 20 && d.bioEn.length > 20 && d.bio.length < 400)).toBe(true);
    expect(JSON.stringify(list.map((d) => d.bio))).not.toContain("?");
  });

  it("pays et Made in FR/EN, multi-pays conservés", () => {
    const y = list.find((d) => d.name.startsWith("Yoshita"))!;
    expect(y.country).toBe("Kenya, France");
    expect(y.madeIn).toBe("Nairobi, Kenya");
    expect(list.some((d) => d.madeIn.includes("Royaume-Uni") && d.madeInEn.includes("United Kingdom"))).toBe(true);
  });

  it("API/app : madeIn et pays exposés, jamais e-mail/site/Instagram", () => {
    const api = readFileSync("src/lib/api-v1.ts", "utf8");
    expect(api).toContain("madeIn: c.madeIn");
    expect(api).toContain("c.countries.map");
    expect(/privateEmail|privateWebsite|privateInstagram/.test(api + readFileSync("src/lib/catalog.ts", "utf8"))).toBe(false);
    expect(readFileSync("mobile/creator.tsx", "utf8")).toContain("c.madeIn");
  });

  it("pays simu : clés/labels FR+EN, multi-pays", async () => {
    const { simuCountries } = await import("../../src/lib/catalog");
    const c = { country: "Kenya, France", countryEn: "Kenya, France" };
    expect(simuCountries(c, "fr").map((k) => k.key)).toEqual(["kenya", "france"]);
    expect(simuCountries({ country: "Bénin", countryEn: "Benin" }, "fr")[0].label).toBe("Bénin");
    expect(readFileSync("src/lib/catalog.ts", "utf8")).toContain("simuIllustration: true");
  });

  it("idempotent : deux imports = aucun doublon, tous marqués simuIllustration", async () => {
    const db = fakeDb();
    await importSimuDesigners(db, list);
    await importSimuDesigners(db, list);
    expect(db.rows.size).toBe(151);
    expect(db.rows.has("simu-mina")).toBe(false);
    expect(db.rows.has("mina")).toBe(true);
    expect([...db.rows.values()].filter((r) => r.simuIllustration === true)).toHaveLength(150);
  });

  it("collision : un créateur réel au même slug n'est jamais écrasé", async () => {
    const db = fakeDb();
    db.rows.set("mina", { slug: "mina", simuIllustration: false, name: "réel" });
    await importSimuDesigners(db, list);
    expect(db.rows.get("mina")!.name).toBe("réel");
  });

  it("--remove ne supprime que les profils d'illustration", async () => {
    const db = fakeDb();
    await importSimuDesigners(db, list);
    expect(await removeSimuDesigners(db)).toBe(150);
    expect([...db.rows.keys()]).toEqual(["real"]);
  });
});
