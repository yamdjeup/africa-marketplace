import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logout } from "@/app/[locale]/account/actions";
import { RegionRows } from "@/components/marketplace/region-rows";
import { db } from "@/lib/db";
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
      <h2 className="border-b pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
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

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl text-primary">{user.name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <Section title={t.me.sectionAccount}>
        <Row href={`${base}/account/orders`} label={t.account.orders.title} />
        <Row href={`${base}/account/addresses`} label={t.me.addresses} />
        <Row href={`${base}/account/security`} label={t.me.security} />
      </Section>
      <Section title={t.me.sectionLang}>
        <RegionRows locale={locale} />
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
  );
}
