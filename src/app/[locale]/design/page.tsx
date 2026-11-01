import type { Metadata } from "next";
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
      </main>
  );
}
