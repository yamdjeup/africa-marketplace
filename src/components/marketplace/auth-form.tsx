"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, register, socialLogin, type AuthState } from "@/app/[locale]/account/actions";
import { Button } from "@/components/ui/button";
import { getDict, type Locale } from "@/lib/i18n";
import type { SocialProvider } from "@/lib/social-providers";

const fieldClass = "h-11 w-full rounded-md border bg-background px-3 text-sm";

const SOCIAL: { id: SocialProvider; label: string; icon: React.ReactNode }[] = [
  {
    id: "google",
    label: "Google",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Apple",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M16.4 12.6c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.300-.9-1.700 0-3.300 1-4.200 2.500-1.800 3.100-.5 7.700 1.300 10.200.9 1.200 1.900 2.600 3.200 2.500 1.300-.1 1.800-.8 3.300-.8s2 .8 3.300.8c1.400 0 2.300-1.200 3.100-2.500 1-1.400 1.400-2.800 1.400-2.900-.1 0-2.800-1.100-2.800-4zM13.900 5.200c.7-.8 1.200-2 1-3.200-1 0-2.300.7-3 1.500-.7.700-1.200 1.900-1.100 3.100 1.200.1 2.400-.6 3.100-1.400z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
      </svg>
    ),
  },
];

export function AuthForm({
  locale,
  mode,
  next,
  social,
}: {
  locale: Locale;
  mode: "login" | "register";
  next?: string;
  social: Record<SocialProvider, boolean>;
}) {
  const t = getDict(locale).account;
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : register, {});
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === "register";
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";
  const tabClass = (active: boolean) =>
    `flex-1 border-b-2 py-3 text-center text-sm font-medium ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="space-y-5">
      <div className="flex border-b" role="tablist">
        <Link href={`/${locale}/login${nextQuery}`} role="tab" aria-selected={!isRegister} className={tabClass(!isRegister)}>
          {t.tabLogin}
        </Link>
        <Link href={`/${locale}/register${nextQuery}`} role="tab" aria-selected={isRegister} className={tabClass(isRegister)}>
          {t.tabRegister}
        </Link>
      </div>
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
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 8 : undefined}
              required
              className={`${fieldClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t.hidePassword : t.showPassword}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
                {showPassword && <path d="M3 3l18 18" />}
              </svg>
            </button>
          </div>
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
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground" role="separator">
        <span className="h-px flex-1 bg-border" />
        {t.or}
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-2">
        {SOCIAL.map((p) => (
          <form key={p.id} action={socialLogin}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="provider" value={p.id} />
            {next && <input type="hidden" name="next" value={next} />}
            <button
              type="submit"
              disabled={!social[p.id]}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-md border bg-background text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-background"
            >
              {p.icon}
              <span>
                {t.continueWith} {p.label}
              </span>
              {!social[p.id] && <span className="rounded-full bg-accent/30 px-2 py-0.5 text-xs">{t.soon}</span>}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
