import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/marketplace/password-reset-forms";
import type { Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }> };

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  const l = locale === "en" ? "en" : "fr";
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-heading text-3xl text-primary">{l === "fr" ? "Mot de passe oublié" : "Forgot your password?"}</h1>
      <p className="text-sm text-muted-foreground">{l === "fr" ? "Saisissez l'e-mail de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe." : "Enter your account e-mail: we will send you a link to choose a new password."}</p>
      <ForgotPasswordForm locale={l} />
    </div>
  );
}
