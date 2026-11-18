import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { findActiveReason, isKind, reasonLabel } from "@/lib/refusal-reasons";

const row = { id: "r1", kind: "ORDER", fr: "La pièce n'est plus disponible", en: "The piece is no longer available", position: 0, active: true };

describe("motifs de refus", () => {
  it("valide le type", () => {
    expect(isKind("ORDER")).toBe(true);
    expect(isKind("x")).toBe(false);
  });
  it("refuse un motif inconnu ou d'un autre type", async () => {
    const db = { refusalReason: { findFirst: vi.fn().mockResolvedValue(null) } } as unknown as PrismaClient;
    expect(await findActiveReason(db, "ORDER", "zzz")).toBeNull();
    expect(await findActiveReason(db, "ORDER", undefined)).toBeNull();
  });
  it("libellé client selon la langue, rien sans motif", async () => {
    const db = { refusalReason: { findUnique: vi.fn().mockResolvedValue(row) } } as unknown as PrismaClient;
    expect(await reasonLabel(db, "r1", "en")).toBe(row.en);
    expect(await reasonLabel(db, null, "fr")).toBeNull();
  });
});
