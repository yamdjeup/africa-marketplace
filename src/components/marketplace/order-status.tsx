import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import type { Dict } from "@/lib/i18n";

export function OrderStatusBadge({ status, t }: { status: OrderStatus; t: Dict["account"]["orders"] }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      {t.status[status]}
    </span>
  );
}

export function OrderTimeline({ status, t }: { status: OrderStatus; t: Dict["account"]["orders"] }) {
  const current = ORDER_STATUSES.indexOf(status);
  return (
    <ol aria-label={t.timeline} className="grid gap-2 sm:grid-cols-4">
      {ORDER_STATUSES.map((s, i) => (
        <li
          key={s}
          aria-current={i === current ? "step" : undefined}
          className={`rounded-md border px-3 py-2 text-sm ${i <= current ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground"}`}
        >
          {t.status[s]}
        </li>
      ))}
    </ol>
  );
}
