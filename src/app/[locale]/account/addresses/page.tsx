import type { Metadata } from "next";
import { formatPhone } from "@/lib/phone";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { setDefaultAddress, deleteAddress } from "@/app/[locale]/account/actions";
import { formatStreet } from "@/lib/address";
import { db } from "@/lib/db";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).me.addresses, robots: { index: false } };
}

const linkBtn = "min-h-11 px-2 underline underline-offset-4 hover:text-terracotta";

export default async function AddressesPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/addresses`)}`);
  const addresses = await db.address.findMany({ where: { userId: session.user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  const t = getDict(locale).me;
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href={`/${locale}/account`} className="text-sm text-muted-foreground hover:text-terracotta">
        ‹ {t.back}
      </Link>
      <h1 className="font-heading text-3xl text-primary">{t.addresses}</h1>
      <Link
        href={`/${locale}/account/addresses/new`}
        className="flex min-h-12 items-center gap-3 border-y px-1 text-sm font-medium hover:text-terracotta"
      >
        <span aria-hidden="true" className="text-xl leading-none">+</span>
        {t.addAddress}
      </Link>
      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noAddress}</p>
      ) : (
        <ul className="divide-y border-b">
          {addresses.map((a) => (
            <li key={a.id} className="space-y-2 py-4 text-sm">
              <address className="not-italic leading-relaxed">
                <strong>{a.fullName}</strong>
                {a.isDefault && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{t.defaultTag}</span>}
                <br />
                {formatStreet(a, locale)}
                <br />
                {a.postalCode} {a.city}, {a.country}
                {a.phone && (
                  <>
                    <br />
                    {formatPhone(a.phone)}
                  </>
                )}
              </address>
              <div className="flex flex-wrap items-center">
                <Link href={`/${locale}/account/addresses/${a.id}`} className={linkBtn}>
                  {t.edit}
                </Link>
                {!a.isDefault && (
                  <form action={setDefaultAddress}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className={linkBtn}>
                      {t.setDefault}
                    </button>
                  </form>
                )}
                <form action={deleteAddress}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className={linkBtn}>
                    {t.delete}
                    <span className="sr-only"> {a.line1}</span>
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
