import Link from "next/link";
import { getDict, type Locale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  return (
    <footer className="mt-12 bg-primary text-primary-foreground">
      <div className="kente-band h-1" />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
        <div>
          <p className="font-heading text-lg">{t.siteName}</p>
          <p className="mt-2 opacity-80">{t.tagline}</p>
        </div>
        <ul className="space-y-1 opacity-90">
          <li><Link href={`/${locale}/catalogue`}>{t.nav.catalog}</Link></li>
          <li><Link href={`/${locale}/createurs`}>{t.nav.creators}</Link></li>
          <li>{t.footer.delivery}</li>
        </ul>
        <ul className="space-y-1 opacity-90">
          <li>{t.footer.contact}</li>
          <li>{t.footer.legal}</li>
        </ul>
      </div>
      <p className="border-t border-primary-foreground/20 py-3 text-center text-xs opacity-80">{t.footer.poc}</p>
    </footer>
  );
}
