import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, type Locale } from "@/lib/i18n";
import { HELP_NAV, PAGES, keyOf, labelOf } from "@/lib/support-content";
import { HelpFeedback } from "@/components/marketplace/help-feedback";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const key = keyOf(slug);
  return { title: key ? labelOf(locale, key) : undefined, robots: { index: false } };
}

export default async function SupportPage({ params }: Props) {
  const { locale, slug } = await params;
  const key = keyOf(slug);
  if (!key) notFound();
  const t = getDict(locale).me;
  const body = key in PAGES ? PAGES[key][locale === "en" ? "en" : "fr"] : [getDict(locale).f10.pages[key as "about" | "discounts" | "doNotSell" | "credits"]];
  const en = locale === "en";
  const isHelp = (HELP_NAV as readonly string[]).includes(key);
  const content = (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl text-primary">{labelOf(locale, key)}</h1>
      {body.map((p) => (
        <p key={p} className="text-sm leading-relaxed">
          {p}
        </p>
      ))}
      {isHelp && (
        <HelpFeedback
          question={en ? "Did you find this content helpful?" : "Ce contenu vous semble-t-il pertinent ?"}
          yes={en ? "Yes" : "Oui"}
          no={en ? "Not really" : "Pas vraiment"}
          thanks={en ? "Thank you for your feedback." : "Merci pour votre retour."}
        />
      )}
    </div>
  );
  return (
    <div className={`mx-auto space-y-4 ${isHelp ? "max-w-4xl" : "max-w-xl"}`}>
      <Link href={`/${locale}/account`} className="text-sm text-muted-foreground hover:text-terracotta">
        ‹ {t.back}
      </Link>
      {isHelp ? (
        <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
          <nav aria-label={en ? "Help" : "Aide"} className="text-sm">
            <h2 className="mb-2 font-semibold uppercase tracking-wide">{en ? "Help" : "Aide"}</h2>
            <ul className="space-y-1">
              {HELP_NAV.map((k) => (
                <li key={k}>
                  <Link href={`/${locale}/support/${k}`} aria-current={k === key ? "page" : undefined} className={`block py-1 hover:underline ${k === key ? "font-semibold underline" : ""}`}>
                    {labelOf(locale, k)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {content}
        </div>
      ) : (
        content
      )}
    </div>
  );
}
