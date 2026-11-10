import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyStripeSignature } from "@/lib/stripe-checkout";

const secret = "whsec_test_secret";
const payload = JSON.stringify({ type: "checkout.session.completed" });
const now = 1_800_000_000_000;
const sign = (t: number, body = payload, key = secret) => createHmac("sha256", key).update(`${t}.${body}`).digest("hex");

describe("verifyStripeSignature", () => {
  const t = Math.floor(now / 1000);
  it("accepte une signature valide", () => {
    expect(verifyStripeSignature(payload, `t=${t},v1=${sign(t)}`, secret, now)).toBe(true);
  });
  it("accepte si une des signatures v1 est valide", () => {
    expect(verifyStripeSignature(payload, `t=${t},v1=${"0".repeat(64)},v1=${sign(t)}`, secret, now)).toBe(true);
  });
  it("refuse une signature invalide, un corps modifié ou un mauvais secret", () => {
    expect(verifyStripeSignature(payload, `t=${t},v1=${"0".repeat(64)}`, secret, now)).toBe(false);
    expect(verifyStripeSignature(payload + " ", `t=${t},v1=${sign(t)}`, secret, now)).toBe(false);
    expect(verifyStripeSignature(payload, `t=${t},v1=${sign(t, payload, "autre")}`, secret, now)).toBe(false);
  });
  it("refuse un en-tête absent ou sans signature", () => {
    expect(verifyStripeSignature(payload, null, secret, now)).toBe(false);
    expect(verifyStripeSignature(payload, `t=${t}`, secret, now)).toBe(false);
  });
  it("refuse un horodatage hors tolérance de 5 minutes", () => {
    const old = t - 301;
    expect(verifyStripeSignature(payload, `t=${old},v1=${sign(old)}`, secret, now)).toBe(false);
  });
});
