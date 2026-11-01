import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type CreatorCardProps = {
  name: string;
  country: string;
  craft: string;
  bio: string;
};

export function CreatorCard({ name, country, craft, bio }: CreatorCardProps) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 text-center">
        <div
          aria-hidden
          className="flex size-20 items-center justify-center rounded-full bg-primary font-heading text-2xl text-primary-foreground ring-4 ring-accent"
        >
          {initials}
        </div>
        <h3 className="font-heading text-lg">{name}</h3>
        <p className="text-xs uppercase tracking-wide text-terracotta">
          {craft} - {country}
        </p>
        <p className="text-sm text-muted-foreground">{bio}</p>
        <Button variant="outline" size="sm">Voir le createur</Button>
      </CardContent>
    </Card>
  );
}
