import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { CreatorView } from "@/lib/catalog";
import { getDict, type Locale } from "@/lib/i18n";

export function CreatorCard({ creator, locale }: { creator: CreatorView; locale: Locale }) {
  const t = getDict(locale);
  return (
    <Card className="relative h-full focus-within:ring-2 focus-within:ring-ring hover:shadow-md">
      <CardContent className="flex flex-col items-center gap-3 text-center">
        <Image
          src={creator.image}
          alt=""
          width={80}
          height={80}
          unoptimized
          className="size-20 rounded-full object-cover ring-4 ring-accent"
        />
        <h3 className="font-heading text-lg">
          <Link href={`/${locale}/createurs/${creator.slug}`} className="after:absolute after:inset-0">
            {creator.name}
          </Link>
        </h3>
        <p className="text-xs uppercase tracking-wide text-terracotta">
          {creator.specialty} — {creator.country}
        </p>
        <p className="line-clamp-3 text-sm text-muted-foreground">{creator.bio}</p>
        <span className="sr-only">{t.creator.visit}</span>
      </CardContent>
    </Card>
  );
}
