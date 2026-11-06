import { Pill, inputCls } from "@/components/fournisseur/parts";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";
import { decideApplication } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_CLS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  NEEDS_INFO: "bg-sky-100 text-sky-900",
  ACCEPTED: "bg-emerald-100 text-emerald-900",
  REFUSED: "bg-rose-100 text-rose-900",
};

export default async function ApplicationsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const apps = await db.supplierApplication.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const label: Record<string, string> = {
    PENDING: tr(locale, "À traiter", "Pending"),
    NEEDS_INFO: tr(locale, "Infos demandées", "Info requested"),
    ACCEPTED: tr(locale, "Acceptée", "Accepted"),
    REFUSED: tr(locale, "Refusée", "Declined"),
  };
  const btn = "min-h-11 rounded-md border px-3 text-sm";
  return (
    <>
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Candidatures fournisseurs", "Supplier applications")}</h1>
      {apps.length === 0 && <p className="text-sm text-muted-foreground">{tr(locale, "Aucune candidature pour le moment.", "No applications yet.")}</p>}
      <ul className="space-y-3">
        {apps.map((a) => (
          <li key={a.id} className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{a.name} <span className="font-normal text-muted-foreground">· {a.email}</span></p>
              <Pill cls={STATUS_CLS[a.status]}>{label[a.status]}</Pill>
            </div>
            <p className="text-sm text-muted-foreground">{a.country} · {a.craftType} · {a.createdAt.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")}</p>
            <p className="whitespace-pre-line text-sm">{a.about}</p>
            <a href={a.portfolioUrl} target="_blank" rel="noopener noreferrer" className="break-all text-sm underline">{a.portfolioUrl}</a>
            {a.adminNote && <p className="text-xs text-muted-foreground">{tr(locale, "Note : ", "Note: ")}{a.adminNote}</p>}
            {a.status !== "ACCEPTED" && (
              <form action={decideApplication} className="space-y-2">
                <input type="hidden" name="id" value={a.id} />
                <label className="block text-xs font-medium">{tr(locale, "Message au candidat (optionnel)", "Message to applicant (optional)")}
                  <input name="note" className={inputCls} maxLength={1000} /></label>
                <div className="flex flex-wrap gap-2">
                  <button name="decision" value="ACCEPTED" className={`${btn} bg-primary text-primary-foreground`}>{tr(locale, "Accepter", "Accept")}</button>
                  <button name="decision" value="NEEDS_INFO" className={btn}>{tr(locale, "Demander des infos", "Request info")}</button>
                  <button name="decision" value="REFUSED" className={btn}>{tr(locale, "Refuser", "Decline")}</button>
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
