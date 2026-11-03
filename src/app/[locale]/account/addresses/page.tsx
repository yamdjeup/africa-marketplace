import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { addAddress, deleteAddress } from "@/app/[locale]/account/actions";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).me.addresses, robots: { index: false } };
}

const fieldClass = "h-11 w-full rounded-md border bg-background px-3 text-sm";

export default async function AddressesPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/addresses`)}`);
  const addresses = await db.address.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } });
  const t = getDict(locale).me;
  const fields: [string, string, string, boolean][] = [
    ["fullName", t.fullName, "name", true],
    ["line1", t.line1, "address-line1", true],
    ["line2", t.line2, "address-line2", false],
    ["postalCode", t.postalCode, "postal-code", true],
    ["city", t.city, "address-level2", true],
    ["country", t.country, "country-name", true],
  ];
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href={`/${locale}/account`} className="text-sm text-muted-foreground hover:text-terracotta">
        ‹ {t.back}
      </Link>
      <h1 className="font-heading text-3xl text-primary">{t.addresses}</h1>
      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noAddress}</p>
      ) : (
        <ul className="divide-y border-y">
          {addresses.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <address className="not-italic">
                <strong>{a.fullName}</strong>
                <br />
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.postalCode} {a.city}, {a.country}
              </address>
              <form action={deleteAddress}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="min-h-11 px-2 underline underline-offset-4 hover:text-terracotta">
                  {t.delete}
                  <span className="sr-only"> {a.line1}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={addAddress} className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t.addAddress}</h2>
        <input type="hidden" name="locale" value={locale} />
        {fields.map(([name, label, ac, req]) => (
          <div key={name} className="space-y-1">
            <label htmlFor={name} className="text-sm font-medium">
              {label}
            </label>
            <input id={name} name={name} autoComplete={ac} required={req} className={fieldClass} />
          </div>
        ))}
        <Button type="submit" size="lg" className="h-12">
          {t.save}
        </Button>
      </form>
    </div>
  );
}
