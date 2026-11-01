"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type AuthState } from "@/app/[locale]/account/actions";
import { Button } from "@/components/ui/button";
import { getDict, type Locale } from "@/lib/i18n";

const fieldClass = "h-11 w-full rounded-md border bg-background px-3 text-sm";

export function AuthForm({ locale, mode, next }: { locale: Locale; mode: "login" | "register"; next?: string }) {
  const t = getDict(locale).account;
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : register, {});
  const isRegister = mode === "register";
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      {isRegister && (
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            {t.name}
          </label>
          <input id="name" name="name" autoComplete="name" defaultValue={state.name} required className={fieldClass} />
        </div>
      )}
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          {t.email}
        </label>
        <input id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required className={fieldClass} />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">
          {t.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={isRegister ? 8 : undefined}
          required
          className={fieldClass}
        />
        {isRegister && <p className="text-xs text-muted-foreground">{t.passwordHint}</p>}
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t.errors[state.error]}
        </p>
      )}
      <Button type="submit" size="lg" className="h-12 w-full" disabled={pending}>
        {isRegister ? t.submitRegister : t.submitLogin}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? t.haveAccount : t.noAccount}{" "}
        <Link
          href={`/${locale}/${isRegister ? "login" : "register"}${nextQuery}`}
          className="text-primary underline underline-offset-4"
        >
          {isRegister ? t.login : t.register}
        </Link>
      </p>
    </form>
  );
}
