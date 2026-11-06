import { ApplicationForm } from "@/components/fournisseur/forms";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/supplier-mock";

export const metadata = { title: "Candidature fournisseur", robots: { index: false } };

export default async function ApplyPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-heading text-3xl text-primary">{tr(locale, "Candidature fournisseur", "Supplier application")}</h1>
      <p role="note" className="rounded-md border border-accent bg-accent/15 px-3 py-2 text-xs">
        <strong className="uppercase">{tr(locale, "Maquette", "Mockup")}</strong> {tr(locale, "— le formulaire n'envoie rien.", "— the form sends nothing.")}
      </p>
      <ApplicationForm locale={locale} />
    </div>
  );
}
