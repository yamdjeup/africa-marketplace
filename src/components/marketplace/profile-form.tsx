"use client";

import { useActionState } from "react";
import { updateProfile, type AuthState } from "@/app/[locale]/account/actions";
import { Button } from "@/components/ui/button";
import { getDict, type Locale } from "@/lib/i18n";

const fieldClass = "h-11 w-full rounded-md border bg-background px-3 text-sm";

export function ProfileForm({ locale, name, email }: { locale: Locale; name: string; email: string }) {
  const t = getDict(locale).account;
  const [state, action, pending] = useActionState<AuthState, FormData>(updateProfile, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          {t.email}
        </label>
        <input id="email" value={email} readOnly disabled className={fieldClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          {t.name}
        </label>
        <input id="name" name="name" defaultValue={name} autoComplete="name" required className={fieldClass} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="currentPassword" className="text-sm font-medium">
            {t.currentPassword}
          </label>
          <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" className={fieldClass} />
        </div>
        <div className="space-y-1">
          <label htmlFor="newPassword" className="text-sm font-medium">
            {t.newPassword}
          </label>
          <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} className={fieldClass} />
        </div>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t.errors[state.error]}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-sm text-primary">
          {t.saved}
        </p>
      )}
      <Button type="submit" size="lg" className="h-12" disabled={pending}>
        {t.submitProfile}
      </Button>
    </form>
  );
}
