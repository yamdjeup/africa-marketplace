import type { Metadata } from "next";
import { CreatorCard } from "@/components/marketplace/creator-card";
import { ProductCard } from "@/components/marketplace/product-card";
import { SiteFooter } from "@/components/marketplace/site-footer";
import { SiteHeader } from "@/components/marketplace/site-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Design system - Afrique Marketplace" };

const swatches = [
  ["primary (indigo)", "bg-primary"],
  ["accent (or / ocre)", "bg-accent"],
  ["terracotta", "bg-terracotta"],
  ["kente (vert)", "bg-kente"],
  ["background (ecru)", "bg-background border"],
  ["foreground (brun encre)", "bg-foreground"],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-heading text-2xl text-primary">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-12 px-4 py-8">
        <h1 className="font-heading text-4xl">Design system</h1>

        <Section title="Couleurs">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {swatches.map(([label, cls]) => (
              <div key={label} className="space-y-1 text-xs">
                <div className={`${cls} h-16 rounded-md`} />
                {label}
              </div>
            ))}
          </div>
          <div className="kente-band h-3 rounded" />
        </Section>

        <Section title="Typographie">
          <p className="font-heading text-3xl">Playfair Display - titres editoriaux</p>
          <p>Inter - texte courant, interface et prix.</p>
        </Section>

        <Section title="Boutons">
          <div className="flex flex-wrap gap-3">
            <Button>Principal</Button>
            <Button variant="secondary">Secondaire</Button>
            <Button variant="outline">Contour</Button>
            <Button variant="ghost">Discret</Button>
            <Button variant="destructive">Supprimer</Button>
            <Button size="lg">Grand</Button>
          </div>
        </Section>

        <Section title="Cartes produit">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <ProductCard name="Robe wax Abidjan" creator="Atelier Kofi" country="Cote d'Ivoire" priceEur={185} />
            <ProductCard name="Boubou bogolan" creator="Mali Textiles" country="Mali" priceEur={240} tone="bg-primary" />
            <ProductCard name="Sculpture en ebene" creator="Nia Studio" country="Cameroun" priceEur={320} tone="bg-kente" />
            <ProductCard name="Echarpe kente" creator="Akosua W." country="Ghana" priceEur={95} tone="bg-accent" />
          </div>
        </Section>

        <Section title="Cartes createur">
          <div className="grid gap-4 md:grid-cols-3">
            <CreatorCard name="Atelier Kofi" country="Cote d'Ivoire" craft="Couture" bio="Coupes contemporaines en wax, ateliers a Abidjan." />
            <CreatorCard name="Nia Studio" country="Cameroun" craft="Sculpture" bio="Pieces uniques en bois travaillees a la main." />
            <CreatorCard name="Akosua Wilson" country="Ghana" craft="Tissage" bio="Tissage kente traditionnel revisite." />
          </div>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
