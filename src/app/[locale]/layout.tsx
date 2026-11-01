import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { SiteHeader } from "@/components/marketplace/site-header";
import { CartProvider } from "@/lib/cart";
import { getDict, isLocale } from "@/lib/i18n";
import "../globals.css";

// Les pages lisent la base : rendu à la demande (pas d'accès DB au build).
export const dynamic = "force-dynamic";

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDict(locale);
  return { title: { default: t.siteName, template: `%s — ${t.siteName}` }, description: t.tagline };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);

  return (
    <html lang={locale} className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CartProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2"
          >
            {t.skip}
          </a>
          <SiteHeader locale={locale} />
          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-10">
            {children}
          </main>
          <SiteFooter locale={locale} />
        </CartProvider>
      </body>
    </html>
  );
}
