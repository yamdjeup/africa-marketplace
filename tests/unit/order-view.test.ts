import { describe, expect, it } from "vitest";
import { orderBucket, parcelIsActive, parcelTimeline } from "@/lib/order-view";

const d = (s: string) => new Date(`2026-11-${s}:00Z`);
const base = { createdAt: d("01T09:00"), decidedAt: d("01T10:00"), shippedAt: null, deliveredAt: null };

describe("Mes commandes : actives / historique", () => {
  it("classe les colis", () => {
    expect(parcelIsActive("SHIPPED", null)).toBe(true);
    expect(parcelIsActive("DELIVERED", null)).toBe(false);
    expect(parcelIsActive("DELIVERED", "ACCEPTED")).toBe(true);
    expect(parcelIsActive("DELIVERED", "REFUNDED")).toBe(false);
    expect(parcelIsActive("CANCELLED", null)).toBe(false);
    expect(orderBucket([])).toBe("active");
    expect(orderBucket([{ status: "DELIVERED", returnStatus: null }, { status: "PENDING", returnStatus: null }])).toBe("active");
    expect(orderBucket([{ status: "DELIVERED", returnStatus: "REFUSED" }])).toBe("history");
  });
  it("horodate seulement les étapes atteintes ; rien d'inventé", () => {
    const t = parcelTimeline({ ...base, status: "SHIPPED", shippedAt: d("02T08:30") }, null);
    expect(t.find((s) => s.key === "ordered")).toMatchObject({ reached: true, at: base.createdAt.toISOString() });
    expect(t.find((s) => s.key === "preparing")).toMatchObject({ reached: true, at: null });
    expect(t.find((s) => s.key === "shipped")).toMatchObject({ reached: true, at: d("02T08:30").toISOString() });
    expect(t.find((s) => s.key === "delivered")).toMatchObject({ reached: false });
  });
  it("étapes de retour et clôture", () => {
    const ret = { status: "REFUNDED", createdAt: d("10T08:00"), decidedAt: d("11T08:00"), partnerReceivedAt: null, refundedAt: d("14T08:00") };
    const t = parcelTimeline({ ...base, status: "DELIVERED", shippedAt: d("02T08:00"), deliveredAt: d("05T08:00") }, ret);
    expect(t.find((s) => s.key === "closed")?.reached).toBe(true);
    expect(t.find((s) => s.key === "ret-received")).toMatchObject({ reached: true, at: null });
    expect(t.find((s) => s.key === "ret-refunded")?.at).toBe(d("14T08:00").toISOString());
  });
});
