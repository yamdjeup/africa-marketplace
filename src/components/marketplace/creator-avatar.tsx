import Image from "next/image";

export function initials(name: string) {
  const parts = name.replace(/[^\p{L}\p{N}\s'-]/gu, " ").split(/[\s'-]+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts.slice(0, 1);
  return letters.map((p) => p[0]!.toUpperCase()).join("") || "?";
}

type Props = { name: string; image?: string | null; className?: string; size?: number; fill?: boolean; priority?: boolean };

// Photo du créateur ; à défaut, médaillon aux initiales sur fond doré de la charte.
export function CreatorAvatar({ name, image, className = "", size = 80, fill = false, priority }: Props) {
  if (image) {
    return fill ? (
      <Image src={image} alt="" fill unoptimized sizes="192px" className={className} />
    ) : (
      <Image src={image} alt="" width={size} height={size} unoptimized priority={priority} className={className} />
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={`flex items-center justify-center bg-accent font-heading text-primary ${fill ? "absolute inset-0 text-4xl" : "shrink-0"} ${className}`.replace(/\bobject-cover\b/, "")}
      style={fill ? undefined : { width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}
