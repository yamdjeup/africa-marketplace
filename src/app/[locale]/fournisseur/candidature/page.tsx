import Link from "next/link";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { inputCls } from "@/components/fournisseur/parts";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { COUNTRIES, CRAFTS, tr } from "@/lib/tr";
import { submitApplication } from "../actions";

export const metadata = { title: "Candidature partenaire", robots: { index: false } };

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ sent?: string; error?: string }> };

export default async function ApplyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const session = await auth();
  const base = `/${locale}/fournisseur/candidature`;
  const uid = session?.user?.id;
  const [supplier, last, user] = uid
    ? await Promise.all([
        db.supplier.findUnique({ where: { userId: uid } }),
        db.supplierApplication.findFirst({ where: { userId: uid }, orderBy: { createdAt: "desc" } }),
        db.user.findUnique({ where: { id: uid } }),
      ])
    : [null, null, null];
  const errors: Record<string, string> = {
    invalid: tr(locale, "Vérifiez les champs : lien du portfolio valide et présentation d'au moins 20 caractères.", "Please check the fields: valid portfolio link and at least 20 characters of description."),
    pending: tr(locale, "Votre candidature est déjà en cours d'examen.", "Your application is already under review."),
    rate: tr(locale, "Trop de candidatures aujourd'hui, réessayez demain.", "Too many applications today, please try again tomorrow."),
  };
  const statusLabel: Record<string, string> = {
    PENDING: tr(locale, "en cours d'examen", "under review"),
    NEEDS_INFO: tr(locale, "informations demandées", "more information requested"),
    ACCEPTED: tr(locale, "acceptée", "accepted"),
    REFUSED: tr(locale, "refusée", "declined"),
  };
  const field = "block text-sm font-medium";
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Candidature partenaire", "Partner application")}</h1>
      {supplier ? (
        <p className="rounded-md border bg-card p-4 text-sm">
          {tr(locale, "Votre espace partenaire est ouvert.", "Your partner area is open.")}{" "}
          <Link className="underline" href={`/${locale}/fournisseur/tableau-de-bord`}>{tr(locale, "Y accéder", "Go to it")}</Link>
        </p>
      ) : (
        <>
          {sp.sent && <p role="status" className="rounded-md border border-accent bg-accent/15 p-3 text-sm">{tr(locale, "Candidature envoyée. Un e-mail de confirmation vous a été adressé ; nous vous répondrons rapidement.", "Application sent. A confirmation email was sent; we will reply shortly.")}</p>}
          {sp.error && errors[sp.error] && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">{errors[sp.error]}</p>}
          {last && !sp.sent && (
            <p role="status" className="rounded-md border bg-card p-3 text-sm">
              {tr(locale, "Dernière candidature : ", "Latest application: ")}
              <strong>{statusLabel[last.status]}</strong>
              {last.adminNote && last.status !== "ACCEPTED" ? ` — ${last.adminNote}` : ""}
            </p>
          )}
          {!session?.user && (
            <p className="rounded-md border bg-card p-3 text-sm">
              {tr(locale, "Connectez-vous (ou créez un compte) pour candidater.", "Sign in (or create an account) to apply.")}{" "}
              <Link className="underline" href={`/${locale}/login?next=${encodeURIComponent(base)}`}>{tr(locale, "Connexion", "Sign in")}</Link>
            </p>
          )}
          {session?.user && last?.status !== "PENDING" && (
            <form action={submitApplication} className="space-y-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              <label className={field}>{tr(locale, "Nom ou nom d'artiste", "Name or artist name")}
                <input required name="name" defaultValue={last?.name ?? user?.name ?? ""} maxLength={120} className={inputCls} /></label>
              <label className={field}>{tr(locale, "Pays", "Country")}
                <select required name="country" defaultValue={last?.country ?? "Cameroun"} className={inputCls}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className={field}>{tr(locale, "Type d'œuvres", "Type of work")}
                <select required name="craftType" defaultValue={last?.craftType ?? CRAFTS[0]} className={inputCls}>{CRAFTS.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className={field}>{tr(locale, "Lien vers votre portfolio ou réseau social", "Link to your portfolio or social profile")}
                <input required type="url" name="portfolioUrl" defaultValue={last?.portfolioUrl ?? ""} placeholder="https://" className={inputCls} /></label>
              <label className={field}>{tr(locale, "Présentez-vous et votre travail", "Tell us about you and your work")}
                <textarea required name="about" rows={5} minLength={20} maxLength={3000} defaultValue={last?.about ?? ""} className={inputCls} /></label>
              <button type="submit" className={buttonVariants({ size: "lg", className: "min-h-11" })}>{tr(locale, "Envoyer ma candidature", "Submit application")}</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
