import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { submitPartnerApplication } from "@/lib/partner-application";

const good = { name: "Awa", country: "Cameroun", craftType: "Peinture", portfolioUrl: "https://awa.art", about: "x".repeat(30) };

function mk(o: { supplier?: unknown; open?: { id: string; status: string } | null; files?: number; recent?: number } = {}) {
  const create = vi.fn(async () => ({ id: "new" }));
  const update = vi.fn(async () => ({ id: "open" }));
  const updateMany = vi.fn(async () => ({}));
  const db = {
    supplier: { findUnique: vi.fn(async () => o.supplier ?? null) },
    user: { findUnique: vi.fn(async () => ({ email: "a@b.c" })) },
    supplierApplication: { findFirst: vi.fn(async () => o.open ?? null), count: vi.fn(async () => o.recent ?? 0), create, update },
    applicationFile: { count: vi.fn(async () => o.files ?? 0), updateMany },
  } as unknown as PrismaClient;
  const notify = vi.fn(async () => {});
  return { db, notify, create, update, updateMany, deps: { nameTaken: async () => false, notify } };
}

describe("candidature partenaire", () => {
  it("rejette champs invalides, URL incorrecte et présentation trop courte", async () => {
    const m = mk();
    expect(await submitPartnerApplication(m.db, "u", { ...good, about: "court" }, "fr", m.deps)).toMatchObject({ error: "invalid" });
    expect(await submitPartnerApplication(m.db, "u", { ...good, portfolioUrl: "pas un lien" }, "fr", m.deps)).toMatchObject({ error: "invalid" });
  });
  it("exige un lien ou un fichier", async () => {
    const m = mk();
    expect(await submitPartnerApplication(m.db, "u", { ...good, portfolioUrl: "" }, "fr", m.deps)).toMatchObject({ error: "proof" });
  });
  it("refuse partenaire existant, nom pris, candidature en cours, limite 3/24 h", async () => {
    expect(await submitPartnerApplication(mk({ supplier: {} }).db, "u", good, "fr", mk().deps)).toMatchObject({ error: "partner" });
    const m = mk();
    expect(await submitPartnerApplication(m.db, "u", good, "fr", { ...m.deps, nameTaken: async () => true })).toMatchObject({ error: "name" });
    const p = mk({ open: { id: "o", status: "PENDING" } });
    expect(await submitPartnerApplication(p.db, "u", good, "fr", p.deps)).toMatchObject({ error: "pending" });
    const r = mk({ recent: 3 });
    expect(await submitPartnerApplication(r.db, "u", good, "fr", r.deps)).toMatchObject({ error: "rate" });
  });
  it("crée, rattache les fichiers et notifie", async () => {
    const m = mk({ files: 1 });
    expect(await submitPartnerApplication(m.db, "u", { ...good, portfolioUrl: "" }, "en", m.deps)).toEqual({ ok: true });
    expect(m.create).toHaveBeenCalled();
    expect(m.updateMany).toHaveBeenCalled();
    expect(m.notify).toHaveBeenCalled();
  });
  it("NEEDS_INFO met à jour la candidature existante", async () => {
    const m = mk({ open: { id: "open", status: "NEEDS_INFO" } });
    expect(await submitPartnerApplication(m.db, "u", good, "fr", m.deps)).toEqual({ ok: true });
    expect(m.update).toHaveBeenCalled();
    expect(m.create).not.toHaveBeenCalled();
  });
});
