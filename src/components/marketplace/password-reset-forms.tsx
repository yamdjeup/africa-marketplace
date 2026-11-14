"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword, submitNewPassword, type ResetState } from "@/app/[locale]/forgot-password/actions";
import { Button } from "@/components/ui/button";

const fieldClass = "h-11 w-full rounded-md border bg-background px-3 text-sm";

const TXT = {
  fr: { email: "E-mail", send: "Envoyer le lien", sent: "Un e-mail vient d'être envoyé (lien valable 1 h). Pensez à vérifier vos courriers indésirables.", social: "Ce compte utilise la connexion Google : il n'a pas de mot de passe. Un e-mail vous indique comment vous connecter.", unknown: "Aucun compte n'est associé à cette adresse e-mail.", create: "Créer un compte", limited: "Trop de demandes : 3 par heure au maximum. Réessayez dans 1 h.", bad: "Adresse e-mail invalide.", pwd: "Nouveau mot de passe (8 caractères minimum)", confirm: "Confirmer le mot de passe", save: "Enregistrer", errPwd: "Mot de passe invalide (8 caractères minimum) ou différent de la confirmation.", errInvalid: "Ce lien est invalide, expiré ou déjà utilisé. Faites une nouvelle demande." },
  en: { email: "E-mail", send: "Send the link", sent: "An e-mail has just been sent (link valid for 1 hour). Check your spam folder too.", social: "This account uses Google sign-in: it has no password. An e-mail explains how to sign in.", unknown: "No account is associated with this e-mail address.", create: "Create an account", limited: "Too many requests: 3 per hour maximum. Try again in 1 hour.", bad: "Invalid e-mail address.", pwd: "New password (8 characters minimum)", confirm: "Confirm password", save: "Save", errPwd: "Invalid password (8 characters minimum) or different from the confirmation.", errInvalid: "This link is invalid, expired or already used. Please make a new request." },
};

export function ForgotPasswordForm({ locale }: { locale: "fr" | "en" }) {
  const t = TXT[locale];
  const [state, action, pending] = useActionState<ResetState, FormData>(forgotPassword, {});
  if (state.done) return <p role="status" className="text-sm">{state.done === "social" ? t.social : t.sent}</p>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">{t.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required className={fieldClass} />
      </div>
      {state.error === "unknown" && (
        <p role="alert" className="text-sm text-destructive">
          {t.unknown} <Link className="underline" href={`/${locale}/register`}>{t.create}</Link>
        </p>
      )}
      {state.error === "limited" && <p role="alert" className="text-sm text-destructive">{t.limited}</p>}
      {state.error === "email" && <p role="alert" className="text-sm text-destructive">{t.bad}</p>}
      <Button type="submit" size="lg" className="h-12 w-full" disabled={pending}>{t.send}</Button>
    </form>
  );
}

export function ResetPasswordForm({ locale, token }: { locale: "fr" | "en"; token: string }) {
  const t = TXT[locale];
  const [state, action, pending] = useActionState<ResetState, FormData>(submitNewPassword, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">{t.pwd}</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={fieldClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor="confirm" className="text-sm font-medium">{t.confirm}</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className={fieldClass} />
      </div>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error === "invalid" ? t.errInvalid : t.errPwd}</p>}
      <Button type="submit" size="lg" className="h-12 w-full" disabled={pending}>{t.save}</Button>
    </form>
  );
}
