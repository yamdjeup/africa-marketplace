import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/marketplace/auth-form";
import { getDict, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDict(locale).account.login, robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { next } = await searchParams;
  if ((await auth())?.user) redirect(`/${locale}/account`);
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-heading text-3xl text-primary">{getDict(locale).account.login}</h1>
      <AuthForm locale={locale} mode="login" next={next} />
    </div>
  );
}
