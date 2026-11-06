import Link from "next/link";
import { Pill } from "@/components/fournisseur/parts";
import type { Locale } from "@/lib/i18n";
import { ORDERS, STATUS_LABEL, money, tr } from "@/lib/supplier-mock";

export const metadata = { title: "Commandes", robots: { index: false } };

export default async function OrdersPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const lk = locale === "en" ? "en" : "fr";
  const groups = (["new", "preparing", "shipped", "delivered"] as const).map((s) => [s, ORDERS.filter((o) => o.status === s)] as const);
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Commandes", "Orders")}</h1>
      {groups.map(([s, list]) =>
        list.length === 0 ? null : (
          <section key={s} className="space-y-2">
            <h2 className="font-heading text-xl">{STATUS_LABEL[s][lk]} <span className="text-sm text-muted-foreground">({list.length})</span></h2>
            <ul className="divide-y rounded-lg border bg-card">
              {list.map((o) => (
                <li key={o.id}>
                  <Link href={`/${locale}/fournisseur/commandes/${o.id}`} className="flex min-h-11 flex-wrap items-center justify-between gap-2 p-3 text-sm hover:bg-muted">
                    <span><strong>{o.id}</strong> · {o.item[lk]}<span className="block text-xs text-muted-foreground">{o.date} · {o.country}</span></span>
                    <span className="flex items-center gap-3"><span className="font-semibold">{money(locale, o.total, o.currency)}</span><Pill cls={STATUS_LABEL[o.status].cls}>{STATUS_LABEL[o.status][lk]}</Pill></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </>
  );
}
