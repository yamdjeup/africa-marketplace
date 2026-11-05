export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-busy="true">
      <div className="h-8 w-1/3 rounded bg-muted" />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <li key={i} className="aspect-[4/5] rounded-lg bg-muted/60" />
        ))}
      </ul>
    </div>
  );
}
