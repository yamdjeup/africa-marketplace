import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { applyTrackingUpdate, pollTracking } from "@/lib/tracking-events";
import { carrierCodeFor, createTrack17Provider, registerTracking, type TrackingProvider } from "@/lib/tracking-provider";

const KEY = "test-key";
const sign = (body: string) => createHash("sha256").update(`${body}/${KEY}`).digest("hex");
const body = (status: string) => JSON.stringify({ event: "TRACKING_UPDATED", data: { number: "LA123", carrier: 6051, track_info: { latest_status: { status } } } });

describe("codes transporteurs 17TRACK (carriers.csv)", () => {
  it.each([["DHL Express", 100001], ["UPS", 100002], ["FedEx", 100003], ["Chronopost", 100273], ["Colissimo", 6051], ["La Poste", 6051], ["bpost", 2061], ["EMS", 100685], ["DPD", 100072], ["DPD BE", 100321], ["DPD DE", 100007]])("%s -> %i", (n, c) => expect(carrierCodeFor(n)).toBe(c));
  it("DHL Paket / DHL seul : auto-détection (pas de code forcé)", () => { expect(carrierCodeFor("DHL")).toBeNull(); expect(carrierCodeFor("DHL Paket")).toBeNull(); });
  it("inconnu : détection automatique", () => expect(carrierCodeFor("Transporteur local")).toBeNull());
});

describe("adaptateur 17TRACK", () => {
  const p = createTrack17Provider(KEY, vi.fn() as never);
  it("accepte une signature valide et lit le statut Delivered", () => {
    expect(p.parseWebhook(body("Delivered"), sign(body("Delivered")))).toEqual({ number: "LA123", carrierCode: 6051, delivered: true, status: "Delivered" });
    expect(p.parseWebhook(body("InTransit"), sign(body("InTransit")))?.delivered).toBe(false);
  });
  it("rejette une signature absente ou erronée", () => {
    expect(p.parseWebhook(body("Delivered"), null)).toBeNull();
    expect(p.parseWebhook(body("Delivered"), sign("autre"))).toBeNull();
  });
  it("enregistre le colis avec l'en-tête 17token et le code transporteur", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 0, data: { accepted: [{ number: "LA123" }] } }) });
    expect(await createTrack17Provider(KEY, f as never).register("LA123", 6051)).toBe(true);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.17track.net/track/v2.4/register");
    expect(init.headers["17token"]).toBe(KEY);
    expect(JSON.parse(init.body)).toEqual([{ number: "LA123", carrier: 6051 }]);
  });
  it("mode manuel sans fournisseur : aucun appel, jamais d'erreur", async () => {
    expect(await registerTracking("UPS", "1Z1", null)).toBe(false);
    const fake: TrackingProvider = { register: vi.fn().mockResolvedValue(true), parseWebhook: () => null, getInfo: vi.fn().mockResolvedValue([]) };
    expect(await registerTracking("UPS", "1Z1", fake)).toBe(true);
    expect(fake.register).toHaveBeenCalledWith("1Z1", 100002);
  });
});

describe("livraison / retour réceptionné automatiques", () => {
  const upd = (delivered: boolean) => ({ number: "LA123", carrierCode: 6051, delivered, status: delivered ? "Delivered" : "InTransit" });
  it("ignore tout statut autre que Delivered", async () => {
    const db = { subOrder: { findFirst: vi.fn() } };
    expect((await applyTrackingUpdate(db as never, upd(false))).outcome).toBe("ignored");
    expect(db.subOrder.findFirst).not.toHaveBeenCalled();
  });
  it("retour : passe l'accepté expédié à « reçu » (idempotent)", async () => {
    const updateMany = vi.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const db = { subOrder: { findFirst: vi.fn().mockResolvedValue(null) }, returnRequest: { findFirst: vi.fn().mockResolvedValue({ id: "r1", subOrderId: "s1" }), updateMany } };
    expect(await applyTrackingUpdate(db as never, upd(true))).toEqual({ outcome: "return-received", subOrderId: "s1" });
    expect((await applyTrackingUpdate(db as never, upd(true))).outcome).toBe("ignored");
    expect(updateMany.mock.calls[0][0].where).toEqual({ id: "r1", status: "ACCEPTED" });
  });
  it("numéro inconnu : ignoré", async () => {
    const db = { subOrder: { findFirst: vi.fn().mockResolvedValue(null) }, returnRequest: { findFirst: vi.fn().mockResolvedValue(null) } };
    expect((await applyTrackingUpdate(db as never, upd(true))).outcome).toBe("ignored");
  });
});

describe("17TRACK : refus, changement de transporteur, rattrapage", () => {
  const resp = (j: unknown) => ({ ok: true, json: async () => j });
  it("journalise le refus de register", async () => {
    const f = vi.fn().mockResolvedValue(resp({ code: 0, data: { accepted: [], rejected: [{ number: "N1", error: { code: -18010012, message: "invalid" } }] } }));
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await createTrack17Provider(KEY, f as never).register("N1", null)).toBe(false);
    expect(err).toHaveBeenCalledWith("[17track] register rejected", "N1", -18010012, "invalid");
    err.mockRestore();
  });
  it("déjà enregistré sous un autre code : changecarrier", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(resp({ code: 0, data: { accepted: [], rejected: [{ number: "N1", error: { code: -18019901 } }] } }))
      .mockResolvedValueOnce(resp({ code: 0, data: { accepted: [{ number: "N1" }] } }));
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await createTrack17Provider(KEY, f as never).register("N1", 100001)).toBe(true);
    expect(f.mock.calls[1][0]).toContain("/changecarrier");
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual([{ number: "N1", carrier_new: 100001 }]);
    err.mockRestore();
  });
  it("gettrackinfo : normalise le statut", async () => {
    const f = vi.fn().mockResolvedValue(resp({ data: { accepted: [{ number: "N1", carrier: 100002, track_info: { latest_status: { status: "Delivered" } } }, { number: "N2", track_info: { latest_status: { status: "InTransit" } } }] } }));
    const r = await createTrack17Provider(KEY, f as never).getInfo([{ number: "N1", carrierCode: 100002 }, { number: "N2", carrierCode: null }]);
    expect(r.map((x) => x.delivered)).toEqual([true, false]);
  });
  it("pollTracking : lots de 40, applique seulement les Delivered", async () => {
    const subs = Array.from({ length: 45 }, (_, i) => ({ trackingNumber: `T${i}`, carrier: "UPS" }));
    const getInfo = vi.fn().mockImplementation(async (items: { number: string }[]) => items.map((i) => ({ number: i.number, carrierCode: null, delivered: i.number === "T3", status: "" })));
    const provider = { register: vi.fn(), parseWebhook: () => null, getInfo } as TrackingProvider;
    const db = { subOrder: { findMany: vi.fn().mockResolvedValue(subs), findFirst: vi.fn().mockResolvedValue(null) }, returnRequest: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue({ id: "r1", subOrderId: "s1" }), updateMany: vi.fn().mockResolvedValue({ count: 1 }) } };
    const out = await pollTracking(db as never, provider);
    expect(getInfo.mock.calls.map((c) => c[0].length)).toEqual([40, 5]);
    expect(out).toEqual([{ outcome: "return-received", subOrderId: "s1" }]);
    expect(await pollTracking(db as never, null)).toEqual([]);
  });
});