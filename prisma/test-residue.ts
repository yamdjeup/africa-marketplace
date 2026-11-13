// Purge des résidus laissés par les tests sur base jetable (run interrompu ou concurrent) : sans cela le seed
// échoue sur Product_categorySlug_fkey (catégorie test-hold encore référencée). Ne touche que les données de test.
export const TEST_CATEGORY_SLUG = "test-hold";
export const TEST_ORDER_PREFIX = "AM-H";

type Delegate = { deleteMany(args: unknown): Promise<unknown> };
export type ResidueClient = {
  product: Delegate & { findMany(args: unknown): Promise<{ slug: string }[]> };
  orderItem: Delegate;
  stockMovement: Delegate;
  favorite: Delegate;
  restockWatch: Delegate;
  checkoutHold: Delegate;
  subOrder: Delegate;
  order: Delegate;
};

export async function purgeTestResidue(db: ResidueClient): Promise<number> {
  const slugs = (await db.product.findMany({ where: { categorySlug: TEST_CATEGORY_SLUG }, select: { slug: true } })).map((p) => p.slug);
  const byProduct = { where: { productSlug: { in: slugs } } };
  const byNumber = { where: { number: { startsWith: TEST_ORDER_PREFIX } } };
  await db.checkoutHold.deleteMany(byNumber);
  await db.subOrder.deleteMany(byNumber);
  await db.orderItem.deleteMany(byProduct);
  await db.order.deleteMany(byNumber);
  await db.stockMovement.deleteMany(byProduct);
  await db.favorite.deleteMany(byProduct);
  await db.restockWatch.deleteMany(byProduct);
  await db.product.deleteMany({ where: { slug: { in: slugs } } });
  return slugs.length;
}
