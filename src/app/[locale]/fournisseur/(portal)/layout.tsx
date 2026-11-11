import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PortalNav } from "@/components/fournisseur/portal-nav";
import type { Locale } from "@/lib/i18n";
import { db } from "@/lib/db";
import { partnerCounts } from "@/lib/admin-list";
import { getPortalContext, isAdminEmail } from "@/lib/supplier";
import { tr } from "@/lib/tr";
import { setViewAs } from "../actions";

export const metadata = { robots: { index: false } };

export default async function PortalLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (raw === "en" ? "en" : "fr") as Locale;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/fournisseur/tableau-de-bord`)}`);
  const ctx = await getPortalContext();
  if (!ctx) redirect(isAdminEmail(session.user.email) ? `/${locale}/admin` : `/${locale}/fournisseur/candidature`);
  const pc = await partnerCounts(db, ctx.supplier.id);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{tr(locale, "Espace partenaire", "Partner area")} · {ctx.supplier.displayName}</p>
        {ctx.viewingAs && (
          <form action={setViewAs} className="flex items-center gap-2 text-xs">
            <input type="hidden" name="locale" value={locale} />
            <span className="rounded bg-accent/20 px-2 py-1">{tr(locale, "Vue admin : partenaire (lecture seule)", "Admin view: partner (read-only)")}</span>
            <button className="min-h-11 underline" type="submit">{tr(locale, "Quitter", "Exit")}</button>
          </form>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-[13rem_1fr]">
        <PortalNav locale={locale} counts={{ "/commandes": pc.orders, "/oeuvres": pc.works }} />
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </div>
  );
}
