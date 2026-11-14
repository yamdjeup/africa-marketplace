import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/marketplace/password-reset-forms";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { tokenIsValid } from "@/lib/password-reset";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ token?: string }> };

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { token = "" } = await searchParams;
  const l = locale === "en" ? "en" : "fr";
  const valid = await tokenIsValid(db, token);
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-heading text-3xl text-primary">{l === "fr" ? "Nouveau mot de passe" : "New password"}</h1>
      {valid ? (
        <ResetPasswordForm locale={l} token={token} />
      ) : (
        <div className="space-y-3 text-sm">
          <p role="alert">{l === "fr" ? "Ce lien est invalide, expiré ou déjà utilisé." : "This link is invalid, expired or already used."}</p>
          <Link className="underline" href={`/${l}/forgot-password`}>{l === "fr" ? "Faire une nouvelle demande" : "Make a new request"}</Link>
        </div>
      )}
    </div>
  );
}
