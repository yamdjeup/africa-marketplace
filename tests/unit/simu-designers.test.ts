import { readFileSync as rfs } from "node:fs";
import { setQuestionActive } from "@/lib/survey";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonCountry } from "../../src/lib/countries";
import { saveCreatorProfile } from "../../src/lib/creator-admin";
import { simuCountries } from "../../src/lib/catalog";
import { importSimuDesigners, mapSimuCategories, removeSimuDesigners, type SimuDesigner } from "../../src/lib/simu-designers";

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
        rows.set((data.slug as string | undefined) ?? where.slug, { ...cur, ...data });
      },
      async upsert({ where, update, create }: { where: { slug: string }; update: Record<string, unknown>; create: Record<string, unknown> }) {
        rows.set(where.slug, rows.has(where.slug) ? { ...rows.get(where.slug), ...update } : create);
      },
      async findMany() {
        return [...rows.values()].filter((r) => r.simuIllustration === false) as never;
      },
      async delete({ where }: { where: { slug: string } }) {
        rows.delete(where.slug);
      },
      async deleteMany() {
        let count = 0;
        for (const [k, v] of rows) if (v.simuIllustration === true) (rows.delete(k), count++);
        return { count };
      },
    },
  };
}

import { moveQuestion } from "../../src/lib/survey";
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

  it("catégories sources mappées sur Epomta", () => {
    expect(mapSimuCategories(["clothing", "bags"]).slugs).toEqual(["couture-mode", "bijoux"]);
    expect(mapSimuCategories(["bags"]).slugs).toEqual(["bijoux"]);
    expect(mapSimuCategories(["jewelry", "accessories", "shoes"]).fr).toBe("Couture et mode, Accessoires");
    expect(mapSimuCategories(["textiles"]).en).toBe("Textiles and home decor");
  });

  it("pays : une seule cle par pays quelles que soient les variantes", () => {
    const keys = ["C\u00f4te d'Ivoire", "Cote d Ivoire", "Ivory Coast", "COTE D\u2019IVOIRE"].map((n) => canonCountry(n).key);
    expect(new Set(keys)).toEqual(new Set(["cote-d-ivoire"]));
    expect(canonCountry("Cameroon").key).toBe(canonCountry("Cameroun").key);
    expect(simuCountries({ country: "Cameroun, Cameroun", countryEn: "Cameroon, Cameroon" }, "fr")).toHaveLength(1);
  });

  it("admin : creation de profil, non-admin refuse, filtre OU multi-pays", async () => {
    const rows = new Map<string, Record<string, unknown>>();
    const db = {
      creator: {
        findUnique: async ({ where }: { where: { slug: string } }) => (rows.get(where.slug) as never) ?? null,
        upsert: async ({ where, create, update }: { where: { slug: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
          rows.set(where.slug, { ...(rows.get(where.slug) ?? create), ...update });
        },
      },
    };
    const input = { name: "Ama Test", countries: ["Ivory Coast", "Cameroun"], madeIn: "", madeInEn: "", categories: ["bijoux", "x"], specialty: "", specialtyEn: "", bio: "", bioEn: "", image: "", website: "w", email: "e", instagram: "i", published: true };
    expect(await saveCreatorProfile(db, false, input)).toBe("forbidden");
    expect(rows.size).toBe(0);
    expect(await saveCreatorProfile(db, true, input)).toBe("created");
    expect(rows.get("ama-test")).toMatchObject({ categorySlugs: "bijoux", countryEn: "Ivory Coast, Cameroon", profileOnly: true });
    const sel = ["cameroun", "ghana"];
    const hit = [{ countries: [{ key: "cameroun" }] }, { countries: [{ key: "togo" }] }].filter((a) => a.countries.some((k) => sel.includes(k.key)));
    expect(hit).toHaveLength(1);
  });

  it("fusion : un profil réel (même slug ou même nom normalisé) est conservé et complété, doublon simu supprimé", async () => {
    const db = fakeDb();
    const d = list[0];
    db.rows.set("ancien", { slug: "ancien", simuIllustration: false, name: d.name.toUpperCase(), bio: "ancienne bio", image: "old.jpg", privateEmail: "" });
    db.rows.set(`simu-${d.slug}`, { slug: `simu-${d.slug}`, simuIllustration: true, name: d.name });
    await importSimuDesigners(db, list);
    const kept = db.rows.get("ancien")!;
    expect(kept).toMatchObject({ simuIllustration: false, bio: "ancienne bio", image: "old.jpg", name: d.name, madeIn: d.madeIn });
    expect(db.rows.has(`simu-${d.slug}`)).toBe(false);
    expect(db.rows.has(d.slug)).toBe(false);
    await importSimuDesigners(db, list);
    expect(await removeSimuDesigners(db)).toBe(149);
    expect(db.rows.has("ancien")).toBe(true);
  });

  it("--remove ne supprime que les profils d'illustration", async () => {
    const db = fakeDb();
    await importSimuDesigners(db, list);
    expect(await removeSimuDesigners(db)).toBe(150);
    expect([...db.rows.keys()]).toEqual(["real"]);
  });
});

describe("enquête : flèches ↑ ↓", () => {
  it("échange avec la voisine active en sautant les inactives, ordres identiques inclus", async () => {
    const rows = [
      { id: "a", position: 1, active: true, createdAt: 1 },
      { id: "b", position: 1, active: false, createdAt: 2 },
      { id: "c", position: 1, active: true, createdAt: 3 },
    ];
    const db = {
      surveyQuestion: {
        findMany: async () => [...rows].sort((x, y) => x.position - y.position || x.createdAt - y.createdAt),
        update: async ({ where, data }: { where: { id: string }; data: { position: number } }) => {
          rows.find((r) => r.id === where.id)!.position = data.position;
        },
      },
    };
    await moveQuestion(db as never, "c", "up");
    const order = () => [...rows].sort((x, y) => x.position - y.position).map((r) => r.id);
    expect(order()).toEqual(["c", "b", "a"]);
    await moveQuestion(db as never, "c", "down");
    expect(order()).toEqual(["a", "b", "c"]);
  });
});
describe("enquete : activer/desactiver", () => {
  it("setQuestionActive bascule active", async () => {
    const row = { id: "q", active: false };
    const db = { surveyQuestion: { updateMany: async ({ where, data }: { where: { id: string }; data: { active: boolean } }) => { if (where.id === row.id) row.active = data.active; } } };
    await setQuestionActive(db as never, "q", true);
    expect(row.active).toBe(true);
    await setQuestionActive(db as never, "q", false);
    expect(row.active).toBe(false);
  });
});

describe("enquete : boutons d'action", () => {
  it("aucun formAction imbrique (sinon la sauvegarde s'execute a la place)", () => {
    const src = rfs("src/app/[locale]/admin/enquete/page.tsx", "utf8");
    expect(src).not.toContain("formAction=");
  });
});

describe("avis : en-tete sobre", () => {
  it("plus d'aplat bleu, filet or et titre bilingue", () => {
    const src = rfs("src/app/[locale]/avis/[token]/page.tsx", "utf8");
    expect(src).not.toContain("bg-primary");
    expect(src).toContain("bg-accent");
    expect(src).toContain("Votre avis compte");
    expect(src).toContain("Your opinion matters");
  });
});