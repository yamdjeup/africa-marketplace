import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/order-notify", () => ({ notifySubOrder: vi.fn() }));
vi.mock("@/lib/return-email", () => ({ sendReturnMail: vi.fn() }));
vi.mock("@/lib/tracking-events", () => ({ applyTrackingUpdate: vi.fn().mockResolvedValue({ outcome: "ignored" }) }));

const req = (body: string, sign?: string) => new Request("https://x/api/webhooks/17track", { method: "POST", body, headers: sign ? { sign } : {} });

describe("route /api/webhooks/17track", () => {
  beforeEach(() => vi.stubEnv("TRACK17_API_KEY", "k"));
  afterEach(() => vi.unstubAllEnvs());
  it("404 sans clé (mode manuel)", async () => {
    vi.stubEnv("TRACK17_API_KEY", "");
    const { POST } = await import("@/app/api/webhooks/17track/route");
    expect((await POST(req("{}"))).status).toBe(404);
  });
  it("200 sur le test non signé de 17TRACK", async () => {
    const { POST } = await import("@/app/api/webhooks/17track/route");
    expect((await POST(req("{}"))).status).toBe(200);
    expect((await POST(req("ping"))).status).toBe(200);
  });
  it("200 sur une notification correctement signée", async () => {
    const { POST } = await import("@/app/api/webhooks/17track/route");
    const body = JSON.stringify({ event: "TRACKING_UPDATED", data: { number: "A1", carrier: 6051, track_info: { latest_status: { status: "InTransit" } } } });
    expect((await POST(req(body, createHash("sha256").update(`${body}/k`).digest("hex")))).status).toBe(200);
  });
  it("400 sur une notification mal signée ou non signée", async () => {
    const { POST } = await import("@/app/api/webhooks/17track/route");
    const body = JSON.stringify({ event: "TRACKING_UPDATED", data: { number: "A1" } });
    expect((await POST(req(body, "bad"))).status).toBe(400);
    expect((await POST(req(body))).status).toBe(400);
    expect((await POST(req("{}", "bad"))).status).toBe(400);
  });
});
