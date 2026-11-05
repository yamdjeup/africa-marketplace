"use client";

import { useRef } from "react";

// Rangée défilante ; flèches ‹ › visibles au survol/focus sur desktop uniquement.
export function ScrollRow({ label, prev, next, children }: { label: string; prev: string; next: string; children: React.ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const by = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  const btn =
    "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-2xl opacity-0 shadow transition-opacity focus-visible:opacity-100 group-focus-within/row:opacity-100 group-hover/row:opacity-100 lg:flex";
  return (
    <div className="group/row relative">
      <ul ref={ref} tabIndex={0} aria-label={label} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 focus-visible:outline-2 focus-visible:outline-ring lg:mx-0 lg:gap-4 lg:px-0">
        {children}
      </ul>
      <button type="button" onClick={() => by(-1)} aria-label={prev} className={`${btn} left-2`}>‹</button>
      <button type="button" onClick={() => by(1)} aria-label={next} className={`${btn} right-2`}>›</button>
    </div>
  );
}
