import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { proxy } from "../../src/proxy";

const call = (path: string) => proxy(new NextRequest(`https://simu.epomta.com${path}`, { method: "POST" }));

describe("mur mot de passe : routes machine", () => {
  beforeEach(() => {
    process.env.SITE_ACCESS_PASSWORD = "test-pass";
  });
  afterEach(() => {
    delete process.env.SITE_ACCESS_PASSWORD;
  });

  const crons: { path: string }[] = JSON.parse(readFileSync("vercel.json", "utf8")).crons;
  const machine = [...crons.map((c) => c.path), "/api/orders/sweep", "/api/stripe/webhook", "/api/webhooks/17track"];

  it.each([...new Set(machine)])("%s passe sans cookie", async (p) => {
    const r = await call(p);
    expect(r.status).not.toBe(401);
  });

  it("une route non publique reste bloquée", async () => {
    expect((await call("/api/favorites")).status).toBe(401);
  });
});
