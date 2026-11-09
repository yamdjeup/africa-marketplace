import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CartLink } from "@/components/marketplace/cart-link";
import { NotifyBanner } from "@/components/marketplace/favorites-list";
import { ShopPrefs } from "@/components/marketplace/shop-prefs";
import { logout } from "@/app/[locale]/account/actions";
import { RegionRows } from "@/components/marketplace/region-rows";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/supplier";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).account.myAccount, robots: { index: false } };
}

const rowClass = "flex min-h-14 items-center justify-between border-b px-1 text-sm hover:text-terracotta";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h2 className="border-b pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground max-md:text-2xl max-md:font-heading max-md:font-normal max-md:normal-case max-md:tracking-normal max-md:text-primary">{title}</h2>
      {children}
    </section>
  );
}

function Row({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={rowClass}>
      <span>{label}</span>
      <span aria-hidden="true" className="text-muted-foreground">›</span>
    </Link>
  );
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/account`)}`);
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect(`/${locale}/login`);
  const t = getDict(locale);
  const base = `/${locale}`;
  const partner = await db.supplier.findUnique({ where: { userId: user.id }, select: { id: true } });
  const spaceRows = (
    <>
      {partner && <Row href={`${base}/fournisseur/tableau-de-bord`} label={locale === "en" ? "My partner area" : "Mon espace partenaire"} />}
      {isAdminEmail(user.email) && <Row href={`${base}/admin`} label={locale === "en" ? "Administration" : "Administration"} />}
    </>
  );
  return (
    <div data-account className="mx-auto max-w-xl space-y-8">
      <div className="-mx-4 -mt-6 flex items-center justify-between border-b px-4 py-2 md:hidden">
        <p className="truncate font-heading text-xl text-primary">{user.name.split(" ")[0]}</p>
        <div className="flex items-center">
          <Link href={`${base}/catalogue`} aria-label={t.nav.search} className="inline-flex min-h-11 min-w-11 items-center justify-center">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
          </Link>
          <CartLink locale={locale} />
        </div>
      </div>
      <div className="max-md:hidden">
        <h1 className="font-heading text-3xl text-primary">{user.name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <h1 className="sr-only md:hidden">{user.name}</h1>
      <div className="space-y-8 md:hidden">
        <NotifyBanner locale={locale} title={t.f10.notifTitle} text={t.f10.notifText} />
        <Section title={t.me.sectionAccount}>
          {spaceRows}
          <Row href={`${base}/account/orders`} label={t.f10.ordersReturns} />
          <Row href={`${base}/support/credits`} label={`${t.f10.credits}`} />
          <Row href={`${base}/account/security`} label={t.me.security} />
          <Row href={`${base}/account/addresses`} label={t.me.addresses} />
        </Section>
        <Section title={t.me.sectionLang}>
          <RegionRows locale={locale} />
        </Section>
        <Section title={t.f10.prefTitle}>
          <ShopPrefs locale={locale} />
        </Section>
        <Section title={t.f10.settings}>
          <Row href={`${base}/alertes`} label={t.wishlist.commPrefs} />
        </Section>
        <Section title={t.me.sectionSupport}>
          <Row href={`${base}/support/about`} label={t.f10.about} />
          <Row href={`${base}/support/discounts`} label={`${t.f10.discounts}`} />
          <Row href={`${base}/support/terms`} label={t.me.terms} />
          <Row href={`${base}/support/privacy`} label={t.me.privacy} />
          <Row href={`${base}/support/do-not-sell`} label={`${t.f10.doNotSell}`} />
          <Row href={`${base}/support/faq`} label={t.me.faq} />
        </Section>
        <section className="space-y-3 text-center">
          <h2 className="font-heading text-2xl font-normal text-primary">{t.f10.help}</h2>
          <Link href={`${base}/support/contact`} className="flex h-12 w-full items-center justify-center rounded-md border border-black text-sm hover:bg-black hover:text-white">
            {t.me.contact}
          </Link>
          <form action={logout}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="h-12 w-full rounded-md bg-black text-sm font-medium text-white hover:bg-black/85">
              {t.account.logout}
            </button>
          </form>
        </section>
      </div>
      <div className="space-y-8 max-md:hidden">
      <Section title={t.me.sectionAccount}>
        {spaceRows}
        <Row href={`${base}/account/orders`} label={t.account.orders.title} />
        <Row href={`${base}/account/addresses`} label={t.me.addresses} />
        <Row href={`${base}/account/security`} label={t.me.security} />
      </Section>
      <Section title={t.me.sectionLang}>
        <RegionRows locale={locale} />
      </Section>
      <Section title={t.wishlist.settings}>
        <Row href={`${base}/alertes`} label={t.wishlist.commPrefs} />
      </Section>
      <Section title={t.me.sectionSupport}>
        <Row href={`${base}/support/faq`} label={t.me.faq} />
        <Row href={`${base}/support/terms`} label={t.me.terms} />
        <Row href={`${base}/support/privacy`} label={t.me.privacy} />
        <Row href={`${base}/support/contact`} label={t.me.contact} />
      </Section>
      <form action={logout}>
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className="h-12 w-full rounded-md bg-black text-sm font-medium text-white hover:bg-black/85">
          {t.account.logout}
        </button>
      </form>
      </div>
    </div>
  );
}
