import Link from "next/link";

export function ShopRow({ href, label, hint }: { href: string; label: string; hint?: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-14 items-center justify-between border-b px-1 text-base hover:text-terracotta">
        <span>{label}</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {hint && <span className="text-xs">{hint}</span>}
          <span aria-hidden="true">›</span>
        </span>
      </Link>
    </li>
  );
}
