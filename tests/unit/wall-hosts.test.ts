import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.stubEnv("SITE_ACCESS_PASSWORD", "x-test-pass");
import { proxy } from "@/proxy";
import { accessPassword } from "@/lib/site-access";
const hosts = ["epomta.com", "www.epomta.com", "epomta-demo.vercel.app"];
describe.skipIf(!accessPassword())("mur d'accès par hôte", () => {
  for (const h of hosts) {
    it(`${h} : page -> mot de passe, API -> 401, exemptions ouvertes`, async () => {
      const get = (p: string) => proxy(new NextRequest(`https://${h}${p}`));
      const page = await get("/fr");
      expect(page.status).toBe(307);
      expect(page.headers.get("location")).toContain("/acces");
      expect((await get("/api/orders")).status).toBe(401);
      expect((await get("/api/stripe/webhook")).headers.get("location")).toBeNull();
    });
  }
});
