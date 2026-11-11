import { describe, expect, it, afterEach } from "vitest";
import { CONTACT_EMAIL, contactPhones } from "@/lib/contact";
describe("contact", () => {
  afterEach(() => { delete process.env.CONTACT_PHONE_LOCAL; });
  it("email unique, sans placeholder", () => { expect(CONTACT_EMAIL).toBe("contact@epomta.com"); });
  it("aucun téléphone sans configuration", () => { expect(contactPhones().local).toBeUndefined(); process.env.CONTACT_PHONE_LOCAL = "+33 1 23"; expect(contactPhones().local).toBe("+33 1 23"); });
});
