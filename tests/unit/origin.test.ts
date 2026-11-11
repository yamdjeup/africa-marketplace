import { describe, expect, it } from "vitest";
import { returnOrigin } from "@/lib/origin";
const FB = "https://epomta.com";
describe("origine de retour", () => {
  it("reste sur le domaine de la requête autorisé", () => { expect(returnOrigin("epomta-demo.vercel.app", FB)).toBe("https://epomta-demo.vercel.app"); expect(returnOrigin("EPOMTA.com", "https://x.test")).toBe("https://epomta.com"); });
  it("hôte inconnu ou absent : origine configurée", () => { expect(returnOrigin("evil.test", FB + "/")).toBe(FB); expect(returnOrigin(null, FB)).toBe(FB); });
  it("x-forwarded-host multiple : premier hôte", () => { expect(returnOrigin("epomta.com, proxy.local", "https://x.test")).toBe("https://epomta.com"); });
});
