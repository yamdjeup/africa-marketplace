import Link from "next/link";
import { db } from "@/lib/db";
import { adminCounts } from "@/lib/admin-list";
import { requireAdmin } from "@/lib/supplier";
import { tr } from "@/lib/tr";
import type { Locale } from "@/lib/i18n";

export const metadata = { title: "Administration", robots: { index: false } };

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (raw === "en" ? "en" : "fr") as Locale;
  await requireAdmin(locale);
  const base = `/${locale}/admin`;
  const n = await adminCounts(db).catch(() => ({ applications: 0, creations: 0, orders: 0, returns: 0, payouts: 0 }));
  const badge: Record<string, number> = { candidatures: n.applications, oeuvres: n.creations, commandes: n.orders, versements: n.payouts, retours: n.returns };
  const items = [[`${base}/candidatures`, tr(locale, "Candidatures", "Applications")], [`${base}/fournisseurs`, tr(locale, "Partenaires", "Partners")], [`${base}/oeuvres`, tr(locale, "Créations à modérer", "Creations to review")], [`${base}/commandes`, tr(locale, "Commandes", "Orders")], [`${base}/versements`, tr(locale, "Versements", "Payouts")], [`${base}/retours`, tr(locale, "Retours", "Returns")], [`${base}/stock`, tr(locale, "Stocks", "Stock")]];
  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{tr(locale, "Administration", "Administration")}</p>
      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 md:mx-0 md:px-0" aria-label="Admin">
        {items.map(([href, label]) => (
          <Link key={href} href={href} className="flex min-h-11 shrink-0 items-center px-3 text-sm text-muted-foreground hover:text-primary">{label}{badge[href.split("/").pop()!] ? <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">{badge[href.split("/").pop()!]}</span> : null}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
