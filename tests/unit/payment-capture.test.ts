import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { settleOrderPayment } from "@/lib/payment-capture";
import { sweepSubOrders } from "@/lib/suborders";

const sub = (status: string, subtotalCents: number, extra = {}) => ({ id: `s-${status}-${subtotalCents}`, status, subtotalCents, ...extra });
function fakeDb(order: unknown) {
  const orderUpdate = vi.fn().mockResolvedValue({});
  const subUpdate = vi.fn().mockResolvedValue({});
  const db = {
    order: { findUnique: vi.fn().mockResolvedValue(order), updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: orderUpdate },
    subOrder: { update: subUpdate },
  };
  return { db: db as never, orderUpdate, subUpdate };
}
const base = { id: "o1", number: "AM-1", captureStatus: "AUTHORIZED", stripePaymentIntentId: "pi_1", totalCents: 9000 };
const ok = () => vi.fn().mockResolvedValue({ ok: true, status: 200 });

describe("capture manuelle Stripe à la confirmation du créateur", () => {
  beforeEach(() => vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x"));
  afterEach(() => vi.unstubAllEnvs());

  it("attend tant qu'un colis est en attente", async () => {
    const f = ok();
    expect(await settleOrderPayment(fakeDb({ ...base, subOrders: [sub("ACCEPTED", 5000), sub("PENDING", 4000)] }).db, "o1", f as never)).toBe("waiting");
    expect(f).not.toHaveBeenCalled();
  });
  it("encaisse uniquement les colis confirmés (le refusé n'est pas débité)", async () => {
    const f = ok();
    const { db, subUpdate } = fakeDb({ ...base, subOrders: [sub("PREPARING", 5000), sub("REFUSED", 4000)] });
    expect(await settleOrderPayment(db, "o1", f as never)).toBe("captured");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.stripe.com/v1/payment_intents/pi_1/capture");
    expect((init.body as URLSearchParams).get("amount_to_capture")).toBe("5000");
    expect(subUpdate).toHaveBeenCalledWith({ where: { id: "s-PREPARING-5000" }, data: { capturedCents: 5000 } });
  });
  it("annule l'autorisation si tout est refusé ou expiré", async () => {
    const f = ok();
    expect(await settleOrderPayment(fakeDb({ ...base, subOrders: [sub("EXPIRED", 9000)] }).db, "o1", f as never)).toBe("cancelled");
    expect(f.mock.calls[0][0]).toBe("https://api.stripe.com/v1/payment_intents/pi_1/cancel");
  });
  it("ignore l'ancien flux et marque FAILED si Stripe refuse", async () => {
    const f = ok();
    expect(await settleOrderPayment(fakeDb({ ...base, captureStatus: null, subOrders: [sub("ACCEPTED", 9000)] }).db, "o1", f as never)).toBe("skip");
    const { db, orderUpdate } = fakeDb({ ...base, subOrders: [sub("ACCEPTED", 9000)] });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await settleOrderPayment(db, "o1", vi.fn().mockResolvedValue({ ok: false, status: 400 }) as never)).toBe("failed");
    expect(orderUpdate).toHaveBeenLastCalledWith({ where: { id: "o1" }, data: { captureStatus: "FAILED" } });
  });
});

describe("relances à +2 h, +12 h, +20 h et expiration à +24 h (drapeau actif)", () => {
  beforeEach(() => vi.stubEnv("PAYMENT_CAPTURE_ON_CONFIRM", "1"));
  afterEach(() => vi.unstubAllEnvs());
  const t0 = new Date("2026-11-20T08:00:00Z");
  const at = (h: number) => new Date(t0.getTime() + h * 3_600_000);
  const run = async (hours: number, reminderCount: number) => {
    const row = { id: "p1", status: "PENDING", acceptBy: at(24), reminderCount, escalatedAt: null, reminderSentAt: null };
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = { updateMany, findUniqueOrThrow: vi.fn().mockResolvedValue({ number: "AM-1-A" }) };
    const db = { subOrder: { findMany: vi.fn().mockResolvedValue([row]), updateMany }, $transaction: (fn: (t: unknown) => unknown) => fn({ subOrder: tx, orderItem: { findMany: vi.fn().mockResolvedValue([]) } }) };
    return { r: await sweepSubOrders(db as never, at(hours)), updateMany };
  };
  it("aucune relance avant 2 h", async () => expect((await run(1, 0)).r.reminded).toHaveLength(0));
  it("une relance à 2 h, puis à 12 h, puis à 20 h (une seule à la fois)", async () => {
    expect((await run(2, 0)).r.reminded).toHaveLength(1);
    expect((await run(13, 1)).r.reminded).toHaveLength(1);
    expect((await run(21, 2)).r.reminded).toHaveLength(1);
    expect((await run(21, 3)).r.reminded).toHaveLength(0);
  });
  it("expire à 24 h", async () => expect((await run(24, 3)).r.expired).toHaveLength(1));
});
