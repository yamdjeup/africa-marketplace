// Vérification des sous-commandes (SQLite dev ou DATABASE_URL). Usage : npm run db:check-orders
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { reserveStock } from "../src/lib/stock";
import { acceptSub, cancelSub, createSubOrders, deliverSub, prepareSub, refuseSub, shipSub, sweepSubOrders } from "../src/lib/suborders";

if (!process.env.DATABASE_URL) process.env.DATABASE_URL = `file:${join(process.cwd(), "prisma", ".dev", "dev.db").replace(/\\/g, "/")}`;
const db = new PrismaClient();
const actor = { id: null, label: "check-orders" };
let failed = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "OK  " : "FAIL"} ${name} ${extra}`);
  if (!cond) failed++;
};
const st = async (slug: string) => {
  const p = await db.product.findUniqueOrThrow({ where: { slug } });
  return `${p.stock}/${p.reserved}`;
};
const H = 3_600_000;

async function main() {
  const cat = await db.category.findFirstOrThrow();
  const creator = await db.creator.findFirstOrThrow();
  const t = Date.now();
  const mkSupplier = (n: string) => db.supplier.create({ data: { displayName: `Check ${n}`, country: "SN", craftType: "test", isDemo: true } });
  const [sa, sb] = [await mkSupplier("A"), await mkSupplier("B")];
  const mkProduct = (slug: string, supplierId: string) =>
    db.product.create({ data: { slug, name: slug, nameEn: slug, description: "x", descriptionEn: "x", story: "", storyEn: "", categorySlug: cat.slug, creatorSlug: creator.slug, priceCents: 5000, materials: [], images: [], sizes: [], stock: 3, country: "-", countryEn: "-", hasCertificate: false, status: "PUBLISHED", supplierId } });
  const pa = await mkProduct(`co-a-${t}`, sa.id);
  const pb = await mkProduct(`co-b-${t}`, sb.id);
  const created: string[] = [];
  const mkOrder = async (tag: string, lines: { p: typeof pa; q: number }[]) => {
    const number = `CO-${t}-${tag}`;
    const order = await db.order.create({
      data: { number, locale: "fr", email: "c@example.com", fullName: "C", address: "a", postalCode: "1", city: "c", country: "FR", totalCents: 0, items: { create: lines.map((l) => ({ productSlug: l.p.slug, name: l.p.name, quantity: l.q, unitPriceCents: 5000 })) } },
    });
    created.push(order.id);
    const subs = await db.$transaction(async (tx) => {
      const s = await createSubOrders(tx, order, lines.map((l) => ({ slug: l.p.slug, supplierId: l.p.supplierId, quantity: l.q, unitPriceCents: 5000 })));
      for (const l of lines) await reserveStock(tx, { slug: l.p.slug, label: null }, l.q, actor, number);
      return s;
    });
    return { order, subs };
  };

  try {
    const { subs } = await mkOrder("1", [{ p: pa, q: 1 }, { p: pb, q: 2 }]);
    ok("commande scindée en 2 sous-commandes", subs.length === 2);
    ok("échéance 48 h", Math.abs(subs[0].acceptBy.getTime() - Date.now() - 48 * H) < 60_000);
    ok("stock réservé (A 3/1, B 3/2)", (await st(pa.slug)) === "3/1" && (await st(pb.slug)) === "3/2");
    const subA = subs.find((s) => s.supplierId === sa.id)!;
    const subB = subs.find((s) => s.supplierId === sb.id)!;

    ok("autorisation : B ne peut pas accepter la sous-commande de A", (await acceptSub(db, subA.id, sb.id)) === null);
    ok("refus par A libère le stock", !!(await refuseSub(db, subA.id, sa.id, "rupture", actor)) && (await st(pa.slug)) === "3/0");
    ok("refus double impossible", (await refuseSub(db, subA.id, sa.id, "x", actor)) === null);

    ok("B accepte", !!(await acceptSub(db, subB.id, sb.id)));
    ok("B prépare", await prepareSub(db, subB.id, sb.id));
    ok("expédition par un autre partenaire refusée", (await shipSub(db, subB.id, sa.id, "DHL", "X1", actor)) === null);
    ok("B expédie : stock confirmé 1/0", !!(await shipSub(db, subB.id, sb.id, "DHL", "TRK1", actor)) && (await st(pb.slug)) === "1/0");
    ok("B livre", !!(await deliverSub(db, subB.id, sb.id)));
    const mv = await db.stockMovement.count({ where: { productSlug: pb.slug, type: "SALE" } });
    ok("mouvement SALE journalisé", mv === 1);

    // Relance 24 h, escalade 36 h, expiration 48 h
    const o2 = await mkOrder("2", [{ p: pa, q: 2 }]);
    const s2 = o2.subs[0];
    const now = Date.now();
    let r = await sweepSubOrders(db, new Date(now + 1 * H));
    ok("pas de relance avant 24 h", !r.reminded.some((s) => s.id === s2.id));
    r = await sweepSubOrders(db, new Date(now + 25 * H));
    ok("relance à 24 h", r.reminded.some((s) => s.id === s2.id));
    r = await sweepSubOrders(db, new Date(now + 25 * H));
    ok("relance non répétée", !r.reminded.some((s) => s.id === s2.id));
    r = await sweepSubOrders(db, new Date(now + 37 * H));
    ok("escalade à 36 h", r.escalated.some((s) => s.id === s2.id));
    ok("acceptation impossible après échéance", (await db.subOrder.update({ where: { id: s2.id }, data: { acceptBy: new Date(Date.now() - 1000) } })) && (await acceptSub(db, s2.id, sa.id)) === null);
    await db.subOrder.update({ where: { id: s2.id }, data: { acceptBy: new Date(now + 48 * H) } });
    r = await sweepSubOrders(db, new Date(now + 49 * H));
    ok("expiration à 48 h + stock libéré", r.expired.some((s) => s.id === s2.id) && (await st(pa.slug)) === "3/0");

    // Annulation admin d'une commande acceptée : stock libéré
    const o3 = await mkOrder("3", [{ p: pa, q: 1 }]);
    await acceptSub(db, o3.subs[0].id, sa.id);
    ok("annulation admin libère le stock", !!(await cancelSub(db, o3.subs[0].id, "litige", actor)) && (await st(pa.slug)) === "3/0");
  } finally {
    await db.orderItem.deleteMany({ where: { orderId: { in: created } } });
    await db.subOrder.deleteMany({ where: { orderId: { in: created } } });
    await db.order.deleteMany({ where: { id: { in: created } } });
    await db.stockMovement.deleteMany({ where: { productSlug: { in: [pa.slug, pb.slug] } } });
    await db.product.deleteMany({ where: { slug: { in: [pa.slug, pb.slug] } } });
    await db.supplier.deleteMany({ where: { id: { in: [sa.id, sb.id] } } });
  }
}

main()
  .catch((e) => {
    console.error(e);
    failed++;
  })
  .finally(async () => {
    await db.$disconnect();
    console.log(failed ? `\n${failed} échec(s)` : "\nTout est OK");
    process.exit(failed ? 1 : 0);
  });
