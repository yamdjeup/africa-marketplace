import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/marketplace/password-reset-forms";
import type { Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: Locale }> };

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  const l = locale === "en" ? "en" : "fr";
  return (
    <div>
      <ForgotPasswordForm locale={l} />
    </div>
  );
}
