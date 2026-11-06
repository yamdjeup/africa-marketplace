import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MockBanner } from "@/components/fournisseur/parts";
import { PortalNav } from "@/components/fournisseur/portal-nav";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/supplier-mock";

export const metadata = { robots: { index: false } };

export default async function PortalLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (raw === "en" ? "en" : "fr") as Locale;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/fournisseur/tableau-de-bord`)}`);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{tr(locale, "Espace fournisseur", "Supplier area")}</p>
        <MockBanner locale={locale} />
      </div>
      <div className="grid gap-6 md:grid-cols-[13rem_1fr]">
        <PortalNav locale={locale} />
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </div>
  );
}
