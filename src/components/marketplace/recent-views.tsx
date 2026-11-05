"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatEur, type Locale } from "@/lib/i18n";

type Seen = { slug: string; name: string; creatorName: string; image: string; priceCents: number };
const KEY = "epomta-recent";

function read(): Seen[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Seen[];
  } catch {
    return [];
  }
}

export function RecentTracker({ item }: { item: Seen }) {
  useEffect(() => {
    const list = [item, ...read().filter((s) => s.slug !== item.slug)].slice(0, 8);
    localStorage.setItem(KEY, JSON.stringify(list));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.slug]);
  return null;
}

export function RecentlyViewed({ locale, title }: { locale: Locale; title: string }) {
  const [items, setItems] = useState<Seen[]>([]);
  useEffect(() => {
    const id = setTimeout(() => setItems(read()), 0);
    return () => clearTimeout(id);
  }, []);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="recent" className="space-y-4">
      <h2 id="recent" className="font-heading text-2xl font-normal text-primary">{title}</h2>
      <ul className="flex gap-4 overflow-x-auto pb-2">
        {items.map((p) => (
          <li key={p.slug} className="w-48 shrink-0">
            <Link href={`/${locale}/produits/${p.slug}`} className="block space-y-1 text-sm">
              <span className="relative block aspect-[4/5] overflow-hidden bg-muted">
                <Image src={p.image} alt="" fill unoptimized sizes="192px" className="object-contain p-2" />
              </span>
              <span className="block font-semibold">{p.creatorName}</span>
              <span className="block text-muted-foreground">{p.name}</span>
              <span className="block">{formatEur(p.priceCents, locale)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
