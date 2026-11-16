import { describe, expect, it } from "vitest";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DATABASE_URL)("API v1 restock-watch (A-T59)", () => {
  it("401 sans jeton", async () => {
    const { GET, POST, DELETE } = await import("@/app/api/v1/restock-watch/route");
    expect((await GET(new Request("http://t/api/v1/restock-watch"))).status).toBe(401);
    expect((await POST(new Request("http://t/api/v1/restock-watch", { method: "POST", body: "{}" }))).status).toBe(401);
    expect((await DELETE(new Request("http://t/api/v1/restock-watch?slug=x", { method: "DELETE" }))).status).toBe(401);
  });
});
