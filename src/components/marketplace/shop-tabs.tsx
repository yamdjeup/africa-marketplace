import Link from "next/link";
import { getDict, type Locale } from "@/lib/i18n";
import type { ShopTab } from "@/lib/shop-groups";

export function ShopTabs({ locale, base, current }: { locale: Locale; base: string; current: ShopTab }) {
  const t = getDict(locale).f11;
  const tabs: [ShopTab, string][] = [
    ["all", t.tabAll],
    ["art", t.tabArt],
    ["fashion", t.tabFashion],
  ];
  return (
    <nav aria-label={t.tabsLabel} className="flex border-b">
      {tabs.map(([k, label]) => (
        <Link
          key={k}
          href={k === "all" ? base : `${base}?tab=${k}`}
          aria-current={current === k ? "page" : undefined}
          className="-mb-px min-h-11 flex-1 border-b-2 border-transparent px-2 py-3 text-center text-sm uppercase tracking-wide text-muted-foreground aria-[current=page]:border-black aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
