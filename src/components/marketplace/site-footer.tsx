import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-12 bg-primary text-primary-foreground">
      <div className="kente-band h-1" />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
        <div>
          <p className="font-heading text-lg">Afrique Marketplace</p>
          <p className="mt-2 opacity-80">Art et couture africains, signes par leurs createurs.</p>
        </div>
        <ul className="space-y-1 opacity-90">
          <li><Link href="#">A propos</Link></li>
          <li><Link href="#">Createurs</Link></li>
          <li><Link href="#">Livraison et retours</Link></li>
        </ul>
        <ul className="space-y-1 opacity-90">
          <li><Link href="#">Contact</Link></li>
          <li><Link href="#">Mentions legales</Link></li>
          <li>FR | EN</li>
        </ul>
      </div>
      <p className="border-t border-primary-foreground/20 py-3 text-center text-xs opacity-70">
        POC - donnees fictives
      </p>
    </footer>
  );
}
