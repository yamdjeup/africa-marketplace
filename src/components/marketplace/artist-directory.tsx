"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getDict, type Locale } from "@/lib/i18n";

type Artist = { slug: string; name: string; countries: { key: string; label: string }[] };

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function ArtistDirectory({ locale, artists }: { locale: Locale; artists: Artist[] }) {
  const t = getDict(locale).f11;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [draft, setDraft] = useState<string[]>([]);

  const countries = useMemo(
    () => [...new Map(artists.flatMap((a) => a.countries).map((c) => [c.key, c.label] as const)).entries()].sort((a, b) => a[1].localeCompare(b[1], locale)),
    [artists, locale],
  );
  const match = (a: Artist, sel: string[]) => (sel.length === 0 || a.countries.some((c) => sel.includes(c.key))) && (!q || norm(a.name).includes(norm(q)));
  const shown = artists.filter((a) => match(a, picked));
  const draftCount = artists.filter((a) => match(a, draft)).length;

  const groups = new Map<string, Artist[]>();
  for (const a of [...shown].sort((x, y) => x.name.localeCompare(y.name, locale))) {
    const letter = norm(a.name).charAt(0).toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), a]);
  }
  const toggle = (k: string) => setDraft((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setDraft(picked);
          setOpen(true);
        }}
        className="h-11 w-full rounded-md border border-black text-sm hover:bg-black hover:text-white"
      >
        {t.refine}
        {picked.length > 0 ? ` (${picked.length})` : ""}
      </button>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.searchArtist}
        aria-label={t.searchArtist}
        className="h-11 w-full rounded-md bg-muted px-3 text-sm"
      />
      <p className="sr-only" aria-live="polite">{getDict(locale).creator.results(shown.length)}</p>
      {shown.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t.noArtist}</p>}
      {[...groups].map(([letter, list]) => (
        <section key={letter} aria-label={letter}>
          <h2 className="border-b pb-1 font-heading text-xl text-primary">{letter}</h2>
          <ul>
            {list.map((a) => (
              <li key={a.slug}>
                <Link href={`/${locale}/createurs/${a.slug}`} className="flex min-h-12 items-center justify-between border-b px-1 text-sm hover:text-terracotta">
                  <span>{a.name}</span>
                  <span aria-hidden="true" className="text-muted-foreground">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {open && (
        <div role="dialog" aria-modal="true" aria-label={t.refine} className="fixed inset-0 z-40 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b px-2">
            <button type="button" onClick={() => setOpen(false)} aria-label={t.close} className="inline-flex min-h-12 min-w-12 items-center justify-center text-2xl">
              ✕
            </button>
            <button type="button" onClick={() => setDraft([])} className="min-h-12 px-3 text-sm underline">
              {t.clearAll}
            </button>
          </div>
          <fieldset className="flex-1 overflow-y-auto px-4 py-2">
            <legend className="py-3 font-heading text-2xl text-primary">{t.country}</legend>
            {countries.map(([k, l]) => (
              <label key={k} className="flex min-h-14 cursor-pointer items-center justify-between border-b text-sm">
                {l}
                <input type="checkbox" checked={draft.includes(k)} onChange={() => toggle(k)} className="size-5 accent-black" />
              </label>
            ))}
          </fieldset>
          <div className="border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => {
                setPicked(draft);
                setOpen(false);
              }}
              className="h-12 w-full rounded-md bg-black text-sm font-medium text-white"
            >
              {t.showArtists(draftCount)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
