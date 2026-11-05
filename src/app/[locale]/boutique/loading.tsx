export default function Loading() {
  return (
    <div className="mx-auto max-w-xl animate-pulse space-y-3" role="status" aria-busy="true">
      <div className="h-8 w-1/2 rounded bg-muted" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-14 rounded bg-muted/60" />
      ))}
    </div>
  );
}
