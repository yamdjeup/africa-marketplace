import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logout } from "@/app/[locale]/account/actions";
import { ProfileForm } from "@/components/marketplace/profile-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).account.profile, robots: { index: false } };
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/account`)}`);
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect(`/${locale}/login`);
  const t = getDict(locale).account;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-heading text-3xl text-primary">{t.profile}</h1>
      <p className="text-sm text-muted-foreground">
        {t.memberSince} {new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "long" }).format(user.createdAt)}
      </p>
      <ProfileForm locale={locale} name={user.name} email={user.email} />
      <div className="flex flex-wrap gap-3 border-t pt-4">
        <Link href={`/${locale}/account/orders`} className={buttonVariants({ variant: "outline" })}>
          {t.orders.title}
        </Link>
        <form action={logout}>
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="ghost">
            {t.logout}
          </Button>
        </form>
      </div>
    </div>
  );
}
