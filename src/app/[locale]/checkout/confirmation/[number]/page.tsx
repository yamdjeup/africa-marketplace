import type { Metadata } from "next";
import { formatPhone } from "@/lib/phone";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ClearCartOnMount } from "@/components/marketplace/clear-cart-on-mount";
import { SubOrderTracking } from "@/components/marketplace/sub-order-tracking";
import { buttonVariants } from "@/components/ui/button";
import { formatStreet } from "@/lib/address";
import { db } from "@/lib/db";
import { formatEur, getDict, type Locale } from "@/lib/i18n";
import { hasLockedSubOrder, isAddressEditable, isOrderOwner } from "@/lib/order-edit";

type Props = { params: Promise<{ locale: Locale; number: string }>; searchParams: Promise<{ t?: string; updated?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).confirmation.title, robots: { index: false } };
}

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const { locale, number } = await params;
  const { t: token, updated } = await searchParams;
  const order = await db.order.findUnique({ where: { number }, include: { items: true } });
  if (!order) {
    // Paiement réussi mais commande pas encore créée (délai du webhook) : état d'attente, la page se rafraîchit seule.
    const hold = await db.checkoutHold.findUnique({ where: { number }, select: { status: true, payload: true } });
    const fr = locale !== "en";
    if (!hold || (hold.payload as { editToken?: string }).editToken !== token) notFound();
    const msg =
      hold.status === "REFUNDED"
        ? fr ? "Un article n'est plus disponible : votre paiement est remboursé et aucune commande n'a été créée." : "An item is no longer available: your payment is refunded and no order was created."
        : hold.status === "RELEASED"
          ? fr ? "Le paiement n'a pas été finalisé : aucune commande n'a été créée." : "The payment was not completed: no order was created."
          : fr ? "Votre paiement est en cours de confirmation. Cette page se met à jour automatiquement." : "Your payment is being confirmed. This page updates automatically.";
    return (
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        {hold.status === "HELD" || hold.status === "CONSUMED" ? <meta httpEquiv="refresh" content="4" /> : null}
        <h1 className="font-heading text-3xl text-primary">{fr ? "Commande" : "Order"} {number}</h1>
        <p role="status" className="text-muted-foreground">{msg}</p>
      </div>
    );
  }
  const session = await auth();
  const t = getDict(locale).confirmation;
  const owner = isOrderOwner(order, token, session?.user?.id);
  const editable = isAddressEditable(order.createdAt) && !(await hasLockedSubOrder(order.id));
  const street = order.street ? formatStreet({ line1: order.street, houseNumber: order.houseNumber, box: order.box, line2: order.complement, country: order.country }, locale) : order.address;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ClearCartOnMount />
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-3xl text-primary">{t.title}</h1>
        <p className="text-muted-foreground">{t.text}</p>
        <p>
          {t.reference} : <strong>{order.number}</strong>
        </p>
      </div>
      <section aria-labelledby="items" className="space-y-3 rounded-lg border p-4">
        <h2 id="items" className="font-heading text-xl">
          {t.items}
        </h2>
        <ul className="space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>
                {i.quantity} × {i.name}
                {i.size ? ` (${i.size})` : ""}
              </span>
              <span>{formatEur(i.unitPriceCents * i.quantity, locale)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t pt-3 font-semibold">
          <span>{t.total}</span>
          <span>{formatEur(order.totalCents, locale)}</span>
        </p>
      </section>
      {owner && <SubOrderTracking orderId={order.id} locale={locale} />}
      <section aria-labelledby="ship" className="space-y-2 rounded-lg border p-4 text-sm">
        <h2 id="ship" className="font-heading text-xl">
          {t.to}
        </h2>
        {updated && (
          <p role="status" className="text-primary">
            {t.updated}
          </p>
        )}
        <address className="not-italic leading-relaxed">
          <strong>{order.fullName}</strong>
          <br />
          {street}
          <br />
          {order.postalCode} {order.city}
          <br />
          {order.country}
          {order.phone && (
            <>
              <br />
              {t.phone} : {formatPhone(order.phone)}
            </>
          )}
        </address>
        <p className="text-muted-foreground">{t.mistake}</p>
        {owner && editable && (
          <Link
            href={`/${locale}/checkout/confirmation/${order.number}/address${token ? `?t=${encodeURIComponent(token)}` : ""}`}
            className={buttonVariants({ variant: "outline" })}
          >
            {t.editAddress}
          </Link>
        )}
        {!editable && <p className="text-muted-foreground">{t.locked}</p>}
      </section>
      <div className="text-center">
        <Link href={`/${locale}`} className={buttonVariants({ variant: "outline" })}>
          {t.home}
        </Link>
      </div>
    </div>
  );
}
