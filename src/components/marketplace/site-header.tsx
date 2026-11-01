import Link from "next/link";

const nav = ["Femme", "Homme", "Art", "Deco", "Createurs"];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="kente-band h-1" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-heading text-xl font-semibold text-primary">
          Afrique Marketplace
        </Link>
        <nav aria-label="Principale" className="hidden gap-6 text-sm md:flex">
          {nav.map((n) => (
            <Link key={n} href="#" className="hover:text-terracotta">
              {n}
            </Link>
          ))}
        </nav>
        <div className="flex gap-3 text-sm">
          <Link href="#">Recherche</Link>
          <Link href="#">Panier (0)</Link>
        </div>
      </div>
    </header>
  );
}
