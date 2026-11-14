"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword, submitNewPassword, type ResetState } from "@/app/[locale]/forgot-password/actions";
import { Button } from "@/components/ui/button";

const fieldClass = "h-11 w-full rounded-md border bg-background px-3 text-sm";

const TXT = {
  fr: { title: "Mot de passe oublié", intro: "Saisissez l'e-mail de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe.", check: "Vérifiez vos e-mails", sentTo: "Un e-mail a été envoyé à", hour: "Le lien est valable 1 h. Pensez à vérifier vos courriers indésirables.", socialTo: "Le compte associé à", socialMsg: "utilise la connexion Google : il n'a pas de mot de passe. Un e-mail vous indique comment vous connecter.", back: "Retour à la connexion", again: "Renvoyer un e-mail", email: "E-mail", send: "Envoyer le lien", sent: "Un e-mail vient d'être envoyé (lien valable 1 h). Pensez à vérifier vos courriers indésirables.", social: "Ce compte utilise la connexion Google : il n'a pas de mot de passe. Un e-mail vous indique comment vous connecter.", unknown: "Aucun compte n'est associé à cette adresse e-mail.", create: "Créer un compte", limited: "Trop de demandes : 3 par heure au maximum. Réessayez dans 1 h.", bad: "Adresse e-mail invalide.", pwd: "Nouveau mot de passe (8 caractères minimum)", confirm: "Confirmer le mot de passe", save: "Enregistrer", errPwd: "Le mot de passe doit contenir au moins 8 caractères et être identique à la confirmation.", errInvalid: "Ce lien est invalide, expiré ou déjà utilisé. Faites une nouvelle demande." },
  en: { title: "Forgot your password?", intro: "Enter your account e-mail: we will send you a link to choose a new password.", check: "Check your e-mails", sentTo: "An e-mail has been sent to", hour: "The link is valid for 1 hour. Check your spam folder too.", socialTo: "The account for", socialMsg: "uses Google sign-in: it has no password. An e-mail explains how to sign in.", back: "Back to sign in", again: "Send another e-mail", email: "E-mail", send: "Send the link", sent: "An e-mail has just been sent (link valid for 1 hour). Check your spam folder too.", social: "This account uses Google sign-in: it has no password. An e-mail explains how to sign in.", unknown: "No account is associated with this e-mail address.", create: "Create an account", limited: "Too many requests: 3 per hour maximum. Try again in 1 hour.", bad: "Invalid e-mail address.", pwd: "New password (8 characters minimum)", confirm: "Confirm password", save: "Save", errPwd: "The password must be at least 8 characters long and match the confirmation.", errInvalid: "This link is invalid, expired or already used. Please make a new request." },
};

export function ForgotPasswordForm({ locale }: { locale: "fr" | "en" }) {
  const t = TXT[locale];
  const [state, action, pending] = useActionState<ResetState, FormData>(forgotPassword, {});
  if (state.done) {
    return (
      <div role="status" className="mx-auto max-w-md space-y-4">
        <h1 className="font-heading text-3xl text-primary">{t.check}</h1>
        {state.done === "social" ? (
          <p className="text-sm">{t.socialTo} <strong>{state.email}</strong> {t.socialMsg}</p>
        ) : (
          <>
            <p className="text-sm">{t.sentTo} <strong>{state.email}</strong>.</p>
            <p className="text-sm text-muted-foreground">{t.hour}</p>
          </>
        )}
        <p className="text-sm">
          <Link className="underline" href={`/${locale}/login`}>{t.back}</Link>
          {" · "}
          <Link className="underline" href={`/${locale}/forgot-password`} onClick={() => location.reload()}>{t.again}</Link>
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="mx-auto max-w-md space-y-4">
      <h1 className="font-heading text-3xl text-primary">{t.title}</h1>
      <p className="text-sm text-muted-foreground">{t.intro}</p>
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">{t.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required className={fieldClass} />
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
        <input id="password" name="password" type="password" autoComplete="new-password" required className={fieldClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor="confirm" className="text-sm font-medium">{t.confirm}</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={fieldClass} />
      </div>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error === "invalid" ? t.errInvalid : t.errPwd}</p>}
      <Button type="submit" size="lg" className="h-12 w-full" disabled={pending}>{t.save}</Button>
    </form>
  );
}
