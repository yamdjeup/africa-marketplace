import Link from "next/link";
import { InstallApp } from "@/components/marketplace/install-app";
import { getDict, type Locale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const f = t.f4;
  const l = (path: string) => `/${locale}${path}`;
  const col = "space-y-1 opacity-90 [&_a]:inline-flex [&_a]:min-h-8 [&_a]:items-center [&_a:hover]:underline";
  const head = "mb-2 font-heading text-base";
  const ft = f.ft;
  const dHead = "mb-3 font-heading text-base";
  const dCol = "space-y-1 [&_a]:inline-flex [&_a]:min-h-8 [&_a]:items-center [&_a:hover]:underline";
  return (
    <>
    <footer className="mt-12 bg-primary pb-16 text-primary-foreground md:pb-0 lg:hidden">
      <div className="kente-band h-1" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 text-sm sm:grid-cols-2 lg:max-w-[1400px] lg:grid-cols-4">
        <nav aria-label={f.footerService}>
          <h2 className={head}>{f.footerService}</h2>
          <ul className={col}>
            <li><Link href={l("/support/faq")}>FAQ</Link></li>
            <li><Link href={l("/support/contact")}>{t.footer.contact}</Link></li>
            <li><Link href={l("/support/terms")}>{f.terms}</Link></li>
            <li><Link href={l("/support/privacy")}>{f.privacy}</Link></li>
          </ul>
        </nav>
        <nav aria-label={f.footerAbout}>
          <h2 className={head}><Link href={l("/support/about")} className="hover:underline">{f.footerAbout}</Link></h2>
          <ul className={col}>
            <li><Link href={l("/catalogue")}>{t.nav.catalog}</Link></li>
            <li><Link href={l("/partenaires")}>{t.nav.creators}</Link></li>
            <li><Link href={l("/fournisseur")}>{locale === "en" ? "Become a partner" : "Devenir partenaire"}</Link></li>
          </ul>
        </nav>
        <nav aria-label={f.footerAccount}>
          <h2 className={head}><Link href={l("/account")} className="hover:underline">{f.footerAccount}</Link></h2>
          <ul className={col}>
            <li><Link href={l("/account/orders")}>{f.orders}</Link></li>
            <li><Link href={l("/account/addresses")}>{f.addresses}</Link></li>
            <li><Link href={l("/favoris")}>{f.tabs.favorites}</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className={head}>{f.footerFollow}</h2>
          <ul className="flex gap-3">
            {["Instagram", "Facebook", "YouTube"].map((n) => (
              <li key={n}>
                <span title={`${n} — ${f.social}`} aria-label={n} role="img" className="inline-flex size-10 items-center justify-center rounded-full border border-primary-foreground/40 text-xs">
                  {n[0]}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs opacity-70">{f.social}</p>
        </div>
      </div>
      <p className="border-t border-primary-foreground/20 py-3 text-center text-xs opacity-80">{t.footer.poc}</p>
    </footer>
    <footer className="mt-12 hidden bg-muted text-foreground lg:block">
      <div className="kente-band h-1" />
      <section aria-labelledby="contact-us" className="mx-auto max-w-[1400px] border-b border-foreground/15 px-4 py-8">
        <h2 id="contact-us" className="mb-4 text-center font-heading text-2xl font-normal">{t.f9.contactTitle}</h2>
        <ul className="grid grid-cols-3 gap-6 text-center text-sm">
          {[
            [t.f9.contactEmail, "contact@epomta.example"],
            [t.f9.contactLocal, "+237 000 00 00 00"],
            [t.f9.contactIntl, "+33 0 00 00 00 00"],
          ].map(([h, v]) => (
            <li key={h} className="border border-foreground/25 bg-background p-5">
              <p className="font-heading text-base">{h}</p>
              <p className="mt-1">{v}</p>
            </li>
          ))}
        </ul>
        <div className="text-center"><InstallApp label={t.f9.install} /></div>
      </section>
      <div className="mx-auto grid max-w-[1400px] grid-cols-4 gap-8 px-4 py-10 text-sm">
        <nav aria-label={f.footerService}>
          <h2 className={dHead}>{f.footerService}</h2>
          <ul className={dCol}>
            <li><Link href={l("/support/contact")}>{t.footer.contact}</Link></li>
            <li><Link href={l("/support/faq")}>FAQ</Link></li>
            <li><Link href={l("/support/orders")}>{ft.orders}</Link></li>
            <li><Link href={l("/support/returns")}>{ft.returns}</Link></li>
            <li><Link href={l("/support/payment")}>{ft.payment}</Link></li>
            <li><Link href={l("/support/terms")}>{f.terms}</Link></li>
            <li><Link href={l("/support/privacy")}>{f.privacy}</Link></li>
          </ul>
        </nav>
        <nav aria-label={ft.aboutTitle}>
          <h2 className={dHead}>{ft.aboutTitle}</h2>
          <ul className={dCol}>
            <li><Link href={l("/support/about")}>{ft.aboutLink}</Link></li>
            <li><span className="opacity-60">{ft.press} ({ft.soon})</span></li>
            <li><Link href={l("/partenaires")}>{ft.partners}</Link></li>
            <li><Link href={l("/fournisseur")}>{locale === "en" ? "Become a partner" : "Devenir partenaire"}</Link></li>
            <li><span className="opacity-60">{ft.careers} ({ft.soon})</span></li>
          </ul>
        </nav>
        <nav aria-label={ft.perksTitle}>
          <h2 className={dHead}>{ft.perksTitle}</h2>
          <ul className={dCol}>
            <li><Link href={l("/support/discounts")}>{ft.referral}</Link></li>
            <li><Link href={l("/support/discounts")}>{ft.student}</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className={dHead}>{f.footerFollow}</h2>
          <ul className="flex gap-3">
            {["Instagram", "TikTok", "Facebook", "YouTube"].map((n) => (
              <li key={n}>
                <span title={`${n} — ${f.social}`} aria-label={n} role="img" className="inline-flex size-10 items-center justify-center rounded-full border border-foreground/40 text-xs">
                  {n[0]}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs opacity-70">{f.social}</p>
        </div>
      </div>
      <div className="border-t border-foreground/15 py-3 text-center text-xs">
        <p className="opacity-80">{t.footer.poc}</p>
        <p className="mt-1 flex justify-center gap-4 [&_a:hover]:underline">
          <Link href={l("/support/privacy")}>{f.privacy}</Link>
          <span aria-hidden="true">·</span>
          <Link href={l("/support/terms")}>{f.terms}</Link>
          <span aria-hidden="true">·</span>
          <Link href={l("/support/cookies")}>{locale === "en" ? "Cookie management" : "Gestion des cookies"}</Link>
          <span aria-hidden="true">·</span>
          <span className="opacity-60">{ft.accessibility} ({ft.soon})</span>
        </p>
      </div>
    </footer>
    </>
  );
}
