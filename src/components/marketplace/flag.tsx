/* eslint-disable @next/next/no-img-element */
// Drapeau en image : l'emoji drapeau s'affiche en lettres sous Windows.
export function Flag({ code, className = "h-4 w-6" }: { code: string; className?: string }) {
  const c = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w40/${c}.png`}
      srcSet={`https://flagcdn.com/w80/${c}.png 2x`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={`inline-block rounded-[2px] border border-black/10 object-cover ${className}`}
    />
  );
}
