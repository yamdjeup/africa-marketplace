import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfileForm } from "@/components/marketplace/profile-form";
import { db } from "@/lib/db";
import { getDict, type Locale } from "@/lib/i18n";
import { isSocialAccount } from "@/lib/social-providers";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).me.security, robots: { index: false } };
}

export default async function SecurityPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/account/security`)}`);
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect(`/${locale}/login`);
  const t = getDict(locale);
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href={`/${locale}/account`} className="text-sm text-muted-foreground hover:text-terracotta">
        ‹ {t.me.back}
      </Link>
      <h1 className="font-heading text-3xl text-primary">{t.me.security}</h1>
      <p className="text-sm text-muted-foreground">
        {t.account.memberSince} {new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "long" }).format(user.createdAt)}
      </p>
      <ProfileForm locale={locale} name={user.name} email={user.email} social={isSocialAccount(user.passwordHash)} />
    </div>
  );
}
