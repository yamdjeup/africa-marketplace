import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const base = { subOrderId: "s", subOrder: { number: "AM-1-1" }, reason: "x", createdAt: new Date(), conditionNote: null, partnerDecisionNote: null, partnerReceivedAt: null, returnShippedAt: null, condition: null, partnerDecision: null };
const mk = (o: object) => ({ ...base, id: "r", ...o });

async function stageOf(row: object) {
  const { partnerReturnList } = await import("../../src/lib/partner-returns");
  const db = { returnRequest: { count: vi.fn(async () => 1), findMany: vi.fn(async () => [mk(row)]) } };
  const res = await partnerReturnList(db as never, "sup", {});
  return res.items[0].stage;
}

describe("partnerReturnList stage", () => {
  it("ACCEPTED = en route ; RECEIVED non contrôlé = à contrôler (plus « en route »)", async () => {
    expect(await stageOf({ status: "ACCEPTED" })).toBe("incoming");
    expect(await stageOf({ status: "RECEIVED" })).toBe("check");
    expect(await stageOf({ status: "RECEIVED", condition: "CONFORM" })).toBe("decide");
  });
});