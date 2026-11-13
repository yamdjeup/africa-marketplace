import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sub = { id: "s1", status: "REFUSED", refundStatus: "", subtotalCents: 200000, order: { stripePaymentIntentId: "pi_test_1", paymentPending: false } };
const update = vi.fn();
vi.mock("@/lib/db", () => ({ db: { subOrder: { findUnique: vi.fn(async () => sub), update: (a: unknown) => update(a) } } }));

import { refundSubOrder, settleSubRefund } from "@/lib/refund";

const ok = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;

beforeEach(() => {
  update.mockReset();
  sub.status = "REFUSED";
  sub.refundStatus = "";
  sub.order = { stripePaymentIntentId: "pi_test_1", paymentPending: false };
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("refundSubOrder", () => {
  it("DONE : appelle Stripe avec montant et clé d'idempotence", async () => {
    const f = vi.fn(async () => ok({ id: "re_1" }));
    vi.stubGlobal("fetch", f);
    const r = await refundSubOrder({ paymentIntentId: "pi_test_1", amountCents: 200000, subOrderId: "s1" });
    expect(r).toEqual({ status: "DONE", refundId: "re_1" });
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("refund-s1");
    expect(String(init.body)).toContain("amount=200000");
  });
  it("FAILED : refus Stripe avec note exploitable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok({ error: { message: "charge_already_refunded" } }, 400)));
    const r = await refundSubOrder({ paymentIntentId: "pi_test_1", amountCents: 100, subOrderId: "s1" });
    expect(r.status).toBe("FAILED");
    expect(r.note).toBe("charge_already_refunded");
  });
  it("FAILED : erreur réseau", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("down"))));
    expect((await refundSubOrder({ paymentIntentId: "pi_test_1", amountCents: 100, subOrderId: "s1" })).status).toBe("FAILED");
  });
  it("MANUAL : sans clé Stripe ou sans paiement, aucun appel", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect((await refundSubOrder({ paymentIntentId: "pi_test_1", amountCents: 100, subOrderId: "s1" })).status).toBe("MANUAL");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    expect((await refundSubOrder({ paymentIntentId: null, amountCents: 100, subOrderId: "s1" })).status).toBe("MANUAL");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("settleSubRefund", () => {
  it("AWAITING : paiement non confirmé, aucun appel Stripe", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    sub.order = { stripePaymentIntentId: null as unknown as string, paymentPending: true };
    await settleSubRefund("s1");
    expect(f).not.toHaveBeenCalled();
    expect(update.mock.calls[0][0].data.refundStatus).toBe("AWAITING");
  });
  it("DONE : enregistre l'identifiant du remboursement", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok({ id: "re_9" })));
    await settleSubRefund("s1");
    expect(update.mock.calls[0][0].data).toMatchObject({ refundStatus: "DONE", refundId: "re_9" });
  });
  it("FAILED : enregistre la note", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok({ error: { message: "boom" } }, 402)));
    await settleSubRefund("s1");
    expect(update.mock.calls[0][0].data).toMatchObject({ refundStatus: "FAILED", refundNote: "boom" });
  });
  it("A-T36 MANUAL : sans clé Stripe, le colis est enregistré « MANUAL » et aucun appel n'est fait (T-SUIVI 5)", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    await settleSubRefund("s1");
    expect(f).not.toHaveBeenCalled();
    expect(update.mock.calls[0][0].data).toMatchObject({ refundStatus: "MANUAL", refundId: null });
  });
  it("A-T36 AWAITING puis paiement confirmé : le rattrapage crée le remboursement (T-REMB 6)", async () => {
    const f = vi.fn(async () => ok({ id: "re_late" }));
    vi.stubGlobal("fetch", f);
    sub.order = { stripePaymentIntentId: null as unknown as string, paymentPending: true };
    await settleSubRefund("s1");
    expect(f).not.toHaveBeenCalled();
    sub.refundStatus = "AWAITING";
    sub.order = { stripePaymentIntentId: "pi_test_1", paymentPending: false };
    await settleSubRefund("s1");
    expect(f).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[1][0].data).toMatchObject({ refundStatus: "DONE", refundId: "re_late" });
  });
  it("A-T36 deux annulations simultanées : même clé d'idempotence Stripe, et plus aucun appel une fois DONE (T-SUIVI 7)", async () => {
    const f = vi.fn(async () => ok({ id: "re_1" }));
    vi.stubGlobal("fetch", f);
    await Promise.all([settleSubRefund("s1"), settleSubRefund("s1")]);
    const keys = f.mock.calls.map((c) => ((c as unknown as [string, RequestInit])[1].headers as Record<string, string>)["Idempotency-Key"]);
    expect(new Set(keys)).toEqual(new Set(["refund-s1"]));
    f.mockClear();
    sub.refundStatus = "DONE";
    await settleSubRefund("s1");
    expect(f).not.toHaveBeenCalled();
  });
  it("ignore un colis non fermé ou déjà remboursé", async () => {
    sub.status = "PENDING";
    await settleSubRefund("s1");
    sub.status = "REFUSED";
    sub.refundStatus = "DONE";
    await settleSubRefund("s1");
    expect(update).not.toHaveBeenCalled();
  });
});
