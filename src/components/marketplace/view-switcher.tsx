import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { VIEW_AS_COOKIE } from "@/lib/supplier";
import { tr } from "@/lib/tr";
import { setViewAs } from "@/app/[locale]/fournisseur/actions";

// Réservé aux admins (ADMIN_EMAILS) : Client / Fournisseur (démo) / Admin.
export async function ViewSwitcher({ locale, userId }: { locale: "fr" | "en"; userId: string }) {
  const [demos, own, jar] = await Promise.all([
    db.supplier.findMany({ where: { isDemo: true, status: "ACTIVE" }, orderBy: { createdAt: "asc" } }),
    db.supplier.findUnique({ where: { userId } }),
    cookies(),
  ]);
  const current = jar.get(VIEW_AS_COOKIE)?.value ?? "";
  const btn = "min-h-11 rounded-md border px-3 text-sm";
  return (
    <section aria-label={tr(locale, "Changer de vue", "Switch view")} className="space-y-3 rounded-lg border border-accent bg-accent/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide">{tr(locale, "Vue (admin)", "View (admin)")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${btn} inline-flex items-center bg-primary text-primary-foreground`}>{tr(locale, "Client", "Customer")}</span>
        <Link href={`/${locale}/admin`} className={`${btn} inline-flex items-center`}>Admin</Link>
        {own && <Link href={`/${locale}/fournisseur/tableau-de-bord`} className={`${btn} inline-flex items-center`}>{tr(locale, "Mon espace fournisseur", "My supplier area")}</Link>}
      </div>
      {demos.length > 0 && (
        <form action={setViewAs} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="locale" value={locale} />
          <label className="text-sm">{tr(locale, "Fournisseur de démo", "Demo supplier")}{" "}
            <select name="supplierId" defaultValue={current} className="min-h-11 rounded-md border bg-background px-2">
              {demos.map((d) => <option key={d.id} value={d.id}>{d.displayName}</option>)}
            </select>
          </label>
          <button className={btn}>{tr(locale, "Ouvrir la vue Fournisseur", "Open Supplier view")}</button>
        </form>
      )}
    </section>
  );
}
