import Link from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumb({ items, label }: { items: Crumb[]; label: string }) {
  return (
    <nav aria-label={label} className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">›</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-primary hover:underline">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
