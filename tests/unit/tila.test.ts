import { describe, expect, it } from "vitest";
import { MAX_TOOL_CALLS, parseTurns, runTila } from "@/lib/tila/agent";
import { maskPersonalData } from "@/lib/tila/privacy";
import type { ChatMessage, ChatModel, ModelReply } from "@/lib/tila/provider";
import { rechercherCreations, type TilaProduct, type ToolDeps } from "@/lib/tila/tools";

const P = (slug: string, stock = 3, extra: Partial<TilaProduct> = {}): TilaProduct => ({
  slug, name: `Pièce ${slug}`, creatorName: "Mimi", priceCents: 14500, material: "wax", sizes: ["M"], categorySlug: "robes", image: null, stock, ...extra,
});

const deps = (items: TilaProduct[], seen: unknown[] = []): ToolDeps => ({
  search: async (p) => { seen.push(p); return items; },
  get: async (slug) => items.find((i) => i.slug === slug) ?? null,
});

const call = (name: string, args: object, id = "c1") => ({ id, type: "function" as const, function: { name, arguments: JSON.stringify(args) } });
const scripted = (replies: ModelReply[], log: ChatMessage[][] = []): ChatModel => {
  let i = 0;
  return { complete: async (m) => { log.push(structuredClone(m)); return replies[Math.min(i++, replies.length - 1)]; } };
};

describe("Tílá : outils de recherche", () => {
  it("ne renvoie que des pièces en stock et au plus 6", async () => {
    const items = [P("a", 0), ...Array.from({ length: 8 }, (_, i) => P(`p${i}`))];
    const { products } = await rechercherCreations({ texte: "robe" }, deps(items));
    expect(products).toHaveLength(6);
    expect(products.every((p) => p.stock > 0)).toBe(true);
  });

  it("ignore les entrées invalides du modèle et élargit la recherche si rien ne correspond", async () => {
    const seen: { q?: string }[] = [];
    const d: ToolDeps = { search: async (p) => { seen.push(p); return p.q ? [] : [P("z")]; }, get: async () => null };
    const { products } = await rechercherCreations({ texte: "fête", matiere: "bogolan", prix_max_eur: "beaucoup", extra: "x" }, d);
    expect(products.map((p) => p.slug)).toEqual(["z"]);
    expect(seen.length).toBeGreaterThan(1);
    expect(seen.every((p) => !("extra" in p))).toBe(true);
  });
});

describe("Tílá : validation de la sortie du modèle (faux modèle)", () => {
  it("montre une pièce citée seulement si un outil l'a renvoyée ; un slug inventé est retiré", async () => {
    const model = scripted([
      { content: null, toolCalls: [call("rechercher_creations", { texte: "robe" })] },
      { content: "Voici : [[robe-1]] et [[inventee]].", toolCalls: [] },
    ]);
    const r = await runTila(model, [{ role: "user", content: "une robe" }], "fr", deps([P("robe-1")]));
    expect(r.products.map((p) => p.slug)).toEqual(["robe-1"]);
    expect(r.reply).not.toContain("[[");
  });

  it("coupe après 4 appels d'outils", async () => {
    let searches = 0;
    const d: ToolDeps = { search: async () => { searches++; return [P("a")]; }, get: async () => null };
    const loop: ModelReply = { content: null, toolCalls: [call("rechercher_creations", {})] };
    const r = await runTila(scripted([loop]), [{ role: "user", content: "x" }], "fr", d);
    expect(searches).toBe(MAX_TOOL_CALLS);
    expect(r.reply.length).toBeGreaterThan(0);
  });

  it("limite à 3 pièces et masque e-mail et téléphone avant l'envoi au modèle", async () => {
    const log: ChatMessage[][] = [];
    const model = scripted([
      { content: null, toolCalls: [call("rechercher_creations", {})] },
      { content: "[[a]] [[b]] [[c]] [[d]]", toolCalls: [] },
    ], log);
    const r = await runTila(model, [{ role: "user", content: "moi: jean@example.com ou 06 12 34 56 78" }], "fr", deps(["a", "b", "c", "d"].map((s) => P(s))));
    expect(r.products).toHaveLength(3);
    const sent = JSON.stringify(log[0]);
    expect(sent).not.toContain("jean@example.com");
    expect(sent).not.toContain("12 34 56");
  });
});

describe("Tílá : entrées de la route et données personnelles", () => {
  it("refuse rôle system, message vide, trop long, trop nombreux ou finissant par l'assistante", () => {
    const ok = [{ role: "user", content: "bonjour" }];
    expect(parseTurns({ messages: ok })).toHaveLength(1);
    expect(parseTurns({ messages: [{ role: "system", content: "x" }] })).toBeNull();
    expect(parseTurns({ messages: [{ role: "user", content: " " }] })).toBeNull();
    expect(parseTurns({ messages: [{ role: "user", content: "a".repeat(501) }] })).toBeNull();
    expect(parseTurns({ messages: Array.from({ length: 13 }, () => ok[0]) })).toBeNull();
    expect(parseTurns({ messages: [{ role: "assistant", content: "salut" }] })).toBeNull();
    expect(parseTurns(null)).toBeNull();
  });

  it("masque e-mails et numéros", () => {
    expect(maskPersonalData("a.b@x.fr, +33 6 12 34 56 78 et 22 ans")).toBe("[e-mail masqué], [numéro masqué] et 22 ans");
  });
});
