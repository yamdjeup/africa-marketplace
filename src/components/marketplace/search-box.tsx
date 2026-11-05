"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = { href: string; label: string; hint: string };
type Result = {
  artists: { slug: string; name: string; label: string }[];
  categories: { slug: string; label: string }[];
  products: { slug: string; name: string; creator: string }[];
};

export function SearchBox({ id, locale, placeholder, className, labels }: { id: string; locale: string; placeholder: string; className: string; labels: { artist: string; category: string; work: string } }) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim().length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(value)}&locale=${locale}`, { signal: ctrl.signal });
        if (!r.ok) return;
        const d = (await r.json()) as Result;
        setItems([
          ...d.artists.map((a) => ({ href: `/${locale}/createurs/${a.slug}`, label: a.name, hint: labels.artist })),
          ...d.categories.map((c) => ({ href: `/${locale}/catalogue?category=${c.slug}`, label: c.label, hint: labels.category })),
          ...d.products.map((p) => ({ href: `/${locale}/produits/${p.slug}`, label: p.name, hint: `${labels.work} · ${p.creator}` })),
        ]);
        setActive(-1);
        setOpen(true);
      } catch {
        /* requête annulée ou réseau indisponible : pas de suggestions */
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [value, locale, labels]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const shown = open && value.trim().length >= 2 && items.length > 0;

  return (
    <div ref={box} className="relative w-full md:w-auto">
      <input
        id={id}
        name="q"
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          else if (shown && e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % items.length);
          } else if (shown && e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          } else if (shown && e.key === "Enter" && active >= 0) {
            e.preventDefault();
            setOpen(false);
            router.push(items[active].href);
          }
        }}
        className={className}
      />
      {shown && (
        <ul id={listId} role="listbox" className="absolute left-0 top-full z-30 mt-1 w-72 max-w-[90vw] overflow-hidden rounded-md border bg-background text-sm shadow-lg">
          {items.map((s, i) => (
            <li key={s.href} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <a
                href={s.href}
                onMouseEnter={() => setActive(i)}
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  router.push(s.href);
                }}
                className={`flex min-h-11 flex-col justify-center px-3 py-1.5 ${i === active ? "bg-muted" : ""}`}
              >
                <span>{s.label}</span>
                <span className="text-xs text-muted-foreground">{s.hint}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
