import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type ProductCardProps = {
  name: string;
  creator: string;
  country: string;
  priceEur: number;
  tone?: string;
};

export function ProductCard({ name, creator, country, priceEur, tone = "bg-terracotta" }: ProductCardProps) {
  return (
    <Card className="overflow-hidden pt-0">
      <div className={`${tone} kente-band aspect-[4/5] w-full opacity-90`} role="img" aria-label={`Visuel ${name}`} />
      <CardContent className="space-y-2">
        <Badge variant="secondary">{country}</Badge>
        <h3 className="font-heading text-lg leading-tight">{name}</h3>
        <p className="text-sm text-muted-foreground">par {creator}</p>
        <div className="flex items-center justify-between">
          <span className="font-semibold">{priceEur} EUR</span>
          <Button size="sm">Ajouter</Button>
        </div>
      </CardContent>
    </Card>
  );
}
