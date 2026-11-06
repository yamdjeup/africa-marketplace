import Link from "next/link";
import { Pill } from "@/components/fournisseur/parts";
import { db } from "@/lib/db";
import { getPortalContext } from "@/lib/supplier";
import { tr } from "@/lib/tr";
import { formatLocal, type Currency } from "@/lib/currency";
import type { Locale } from "@/lib/i18n";

export const metadata = { title: "Œuvres et stock", robots: { index: false } };

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ saved?: string; error?: string }> };

const STATUS: Record<string, [string, string, string]> = {
  DRAFT: ["Brouillon", "Draft", "bg-muted text-foreground"],
  SUBMITTED: ["En modération", "Under review", "bg-amber-100 text-amber-900"],
  PUBLISHED: ["Publiée", "Published", "bg-emerald-100 text-emerald-900"],
  REJECTED: ["Refusée", "Rejected", "bg-red-100 text-red-900"],
  HELD: ["Masquée (compte suspendu)", "Hidden (account suspended)", "bg-red-100 text-red-900"],
};

export default async function WorksPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const items = await db.product.findMany({ where: { supplierId: ctx.supplier.id }, orderBy: { name: "asc" } });
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl text-primary">{tr(locale, "Œuvres et stock", "Works and stock")}</h1>
        {!ctx.viewingAs && <Link href={`/${locale}/fournisseur/oeuvres/nouvelle`} className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">{tr(locale, "Ajouter une œuvre", "Add a work")}</Link>}
      </div>
      {sp.saved && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, "Enregistré.", "Saved.")}</p>}
      {sp.error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{tr(locale, "Action impossible.", "Action not possible.")}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tr(locale, "Aucune œuvre pour le moment.", "No works yet.")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((p) => {
            const avail = p.stock - p.reserved;
            const st = STATUS[p.status] ?? STATUS.DRAFT;
            const imgs = Array.isArray(p.images) ? (p.images as string[]) : [];
            return (
              <li key={p.slug}>
                <Link href={`/${locale}/fournisseur/oeuvres/${p.slug}`} className="flex min-h-16 items-center gap-3 p-3 hover:bg-muted/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {imgs[0] ? <img src={imgs[0]} alt="" className="size-14 rounded-md object-cover" /> : <span className="size-14 rounded-md bg-muted" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{locale === "en" ? p.nameEn : p.name}</span>
                    <span className="block text-xs text-muted-foreground">{formatLocal(p.priceLocal ?? p.priceCents, p.currency as Currency, locale)} · {tr(locale, "stock", "stock")} {avail}{p.reserved > 0 ? ` (${p.reserved} ${tr(locale, "réservé(s)", "reserved")})` : ""}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <Pill cls={st[2]}>{tr(locale, st[0], st[1])}</Pill>
                    {p.status === "PUBLISHED" && avail <= 0 && <Pill cls="bg-red-100 text-red-900">{tr(locale, "Épuisée", "Sold out")}</Pill>}
                    {p.status === "PUBLISHED" && avail > 0 && avail <= p.lowStockThreshold && <Pill cls="bg-amber-100 text-amber-900">{tr(locale, "Stock bas", "Low stock")}</Pill>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
