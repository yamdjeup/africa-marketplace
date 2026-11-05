import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { auth } from "@/auth";
import { MobileTabBar } from "@/components/marketplace/mobile-tab-bar";
import { SiteHeader } from "@/components/marketplace/site-header";
import { CartProvider } from "@/lib/cart";
import { FavoritesProvider } from "@/lib/favorites";
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
  return {
    title: { default: t.siteName, template: `%s — ${t.siteName}` },
    description: t.tagline,
    icons: { apple: "/icons/apple-touch-icon.png" },
    appleWebApp: { capable: true, title: t.siteName },
  };
}

export const viewport: Viewport = { themeColor: "#1c3060" };

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
          <FavoritesProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2"
          >
            {t.skip}
          </a>
          <SiteHeader locale={locale} />
          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-10 lg:max-w-[1400px]">
            {children}
          </main>
          <SiteFooter locale={locale} />
          <MobileTabBar locale={locale} loggedIn={Boolean((await auth())?.user)} />
          </FavoritesProvider>
        </CartProvider>
      </body>
    </html>
  );
}
