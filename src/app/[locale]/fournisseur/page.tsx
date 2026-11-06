import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export const metadata = { title: "Devenir partenaire", robots: { index: false } };

export default async function SupplierLanding({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const steps = [
    [tr(locale, "Candidature", "Apply"), tr(locale, "Présentez-vous et votre portfolio.", "Introduce yourself and your portfolio.")],
    [tr(locale, "Validation", "Review"), tr(locale, "L'équipe examine votre dossier.", "Our team reviews your file.")],
    [tr(locale, "Publication", "Publish"), tr(locale, "Déposez vos œuvres avec leur histoire.", "Upload your works with their story.")],
    [tr(locale, "Ventes", "Sell"), tr(locale, "Expédiez, suivez vos ventes et vos versements.", "Ship, and track your sales and payouts.")],
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="kente-band h-1" />
      <header className="space-y-3 text-center">
        <h1 className="font-heading text-3xl text-primary md:text-4xl">{tr(locale, "Devenir partenaire", "Become a partner")}</h1>
        <p className="text-muted-foreground">
          {tr(locale, "Artistes plasticiens et couturiers afrodescendants : présentez vos créations à E póm ta’, gardez votre voix et votre crédit.", "Afrodescendant artists and fashion makers: showcase your creations on E póm ta’, keeping your voice and credit.")}
        </p>
      </header>
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map(([h, p], i) => (
          <li key={h} className="rounded-lg border bg-card p-4">
            <p className="font-heading text-lg text-primary"><span className="mr-2 text-accent">{i + 1}.</span>{h}</p>
            <p className="mt-1 text-sm text-muted-foreground">{p}</p>
          </li>
        ))}
      </ol>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Link href={`/${locale}/fournisseur/candidature`} className={buttonVariants({ size: "lg", className: "min-h-11" })}>
          {tr(locale, "Déposer ma candidature", "Apply now")}
        </Link>
        <Link href={`/${locale}/fournisseur/tableau-de-bord`} className={buttonVariants({ size: "lg", variant: "outline", className: "min-h-11" })}>
          {tr(locale, "Accéder à mon espace", "Open my area")}
        </Link>
      </div>
    </div>
  );
}
